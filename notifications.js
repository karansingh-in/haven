import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// Scheduled local notifications are native-only. Registering the handler at
// module scope would touch the native module on web (where there is no
// notification scheduler), so the registration is guarded.
if (Platform.OS !== "web") {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

const SCHEDULED_KEY = "haven-notif-scheduled-v1";

// The nudge for a day with nothing logged. Her own words, so it stays hers.
export const ZERO_DAY_LINE = "Shram aati hai?";

const summaryLine = ({ todayText, backlogText, streak, daysLeft }) => {
  const parts = [`${todayText} today`, backlogText];
  if (streak) parts.push(`${streak}-day streak`);
  if (daysLeft !== undefined && daysLeft !== null) parts.push(`${daysLeft} days to NEET`);
  return parts.join(" · ");
};

// Both bodies are pure so they can be tested without a notification scheduler.
export function windDownBody({ todayText, todayMinutes, backlogText, streak, daysLeft }) {
  const summary = summaryLine({ todayText, backlogText, streak, daysLeft });
  if (Number(todayMinutes) > 0) return `${summary}. Goodnight.`;
  return `${ZERO_DAY_LINE} ${summary}. Goodnight.`;
}

export function weeklyBody({ todayText, todayMinutes, backlogText, streak, daysLeft }) {
  const summary = summaryLine({ todayText, backlogText, streak, daysLeft });
  if (Number(todayMinutes) > 0) return `${summary}. Open Haven for the full breakdown.`;
  return `${ZERO_DAY_LINE} ${summary}. Open Haven for the full breakdown.`;
}

export async function ensureNotificationSetup() {
  if (Platform.OS === "web") return;
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("haven-reminders", {
        name: "Haven reminders",
        importance: Notifications.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 250, 250, 250],
      });
    }
  } catch {}
}

export async function requestNotificationPermission() {
  // No permission prompt exists for the browser build; callers must treat
  // this as a refusal rather than a silent success.
  if (Platform.OS === "web") return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.ios?.status === 3) return true;
    const next = await Notifications.requestPermissionsAsync();
    return Boolean(next.granted || next.ios?.status === 3);
  } catch {
    return false;
  }
}

export async function cancelAllHavenNotifications() {
  if (Platform.OS === "web") return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await AsyncStorage.removeItem(SCHEDULED_KEY);
  } catch {}
}

// Daily wind-down at fixed hour/minute (repeating calendar trigger).
export async function scheduleWindDown({ hour, minute, enabled }) {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n?.identifier?.startsWith("haven-winddown")) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    if (!enabled) return;
    await Notifications.scheduleNotificationAsync({
      identifier: `haven-winddown-${hour}-${minute}`,
      content: {
        title: "Wind down, Chaaru",
        body: "A gentle check-in on today's hours and backlog is waiting in Haven.",
        data: { kind: "winddown" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute,
        channelId: Platform.OS === "android" ? "haven-reminders" : undefined,
      },
    });
  } catch (e) {
    console.warn("winddown schedule failed", e);
  }
}

// Weekly report — once a week on weekday (1=Sunday..7=Saturday in expo) at hour/minute.
export async function scheduleWeeklyReport({ weekday, hour, minute, enabled }) {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of scheduled) {
      if (n?.identifier?.startsWith("haven-weekly")) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    if (!enabled) return;
    await Notifications.scheduleNotificationAsync({
      identifier: `haven-weekly-${weekday}-${hour}-${minute}`,
      content: {
        title: "Your weekly Haven report",
        body: "Week total, goal progress and backlog change — ready when you are.",
        data: { kind: "weekly" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
        channelId: Platform.OS === "android" ? "haven-reminders" : undefined,
      },
    });
  } catch (e) {
    console.warn("weekly schedule failed", e);
  }
}

// Dynamic content: reschedule wind-down/weekly with today's computed numbers in body.
export async function refreshNotificationBodies({
  todayText,
  todayMinutes,
  backlogText,
  streak,
  daysLeft,
}) {
  if (Platform.OS === "web") return;
  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const wind = scheduled.find((n) => n?.identifier?.startsWith("haven-winddown"));
    const weekly = scheduled.find((n) => n?.identifier?.startsWith("haven-weekly"));
    if (wind?.trigger) {
      await Notifications.cancelScheduledNotificationAsync(wind.identifier);
      await Notifications.scheduleNotificationAsync({
        identifier: wind.identifier,
        content: {
          title: "Wind down, Chaaru",
          body: windDownBody({ todayText, todayMinutes, backlogText, streak, daysLeft }),
          data: { kind: "winddown" },
        },
        trigger: wind.trigger,
      });
    }
    if (weekly?.trigger) {
      await Notifications.cancelScheduledNotificationAsync(weekly.identifier);
      await Notifications.scheduleNotificationAsync({
        identifier: weekly.identifier,
        content: {
          title: "Your weekly Haven report",
          body: weeklyBody({ todayText, todayMinutes, backlogText, streak, daysLeft }),
          data: { kind: "weekly" },
        },
        trigger: weekly.trigger,
      });
    }
  } catch {}
}

// Break nudges: two one-shot notifications, fired relative to the moment the
// timer starts. `seconds` is what the timer has been running, not wall clock,
// so pausing and resuming simply cancels and re-arms them.
export const BREAK_NUDGES = [
  {
    identifier: "haven-break-50",
    seconds: 50 * 60,
    body: "50 minutes in. Stand up, drink some water.",
  },
  {
    identifier: "haven-break-90",
    seconds: 90 * 60,
    body: "90 minutes straight. Take ten — the streak will still be here.",
  },
];

export async function scheduleFocusBreaks({ enabled = true } = {}) {
  if (Platform.OS === "web") return;
  try {
    await cancelFocusBreaks();
    if (!enabled) return;
    for (const nudge of BREAK_NUDGES) {
      await Notifications.scheduleNotificationAsync({
        identifier: nudge.identifier,
        content: {
          title: "Break, Chaaru",
          body: nudge.body,
          data: { kind: "break" },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: nudge.seconds,
          repeats: false,
          channelId: Platform.OS === "android" ? "haven-reminders" : undefined,
        },
      });
    }
  } catch (e) {
    console.warn("break nudge schedule failed", e);
  }
}

export async function cancelFocusBreaks() {
  if (Platform.OS === "web") return;
  try {
    for (const nudge of BREAK_NUDGES) {
      await Notifications.cancelScheduledNotificationAsync(nudge.identifier);
    }
  } catch {}
}
