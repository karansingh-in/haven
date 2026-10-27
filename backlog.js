import AsyncStorage from "@react-native-async-storage/async-storage";

export const DAILY_GOAL_MINUTES = 480; // 8 hours
export const GOAL_HOURS_MIN = 8;
export const GOAL_HOURS_MAX = 13;
export const STREAK_MIN_MINUTES = 60;
export const ROLLOVER_HOUR = 3; // the logical day starts at 3am

// Local-time key "YYYY-MM-DD". Before the rollover hour the key is still
// yesterday's date, so a 2am session counts toward the night before.
// Calendar arithmetic (setDate), not ms subtraction, so DST is handled.
export function dayKeyFor(date = new Date(), rolloverHour = ROLLOVER_HOUR) {
  const d = new Date(date);
  if (d.getHours() < rolloverHour) d.setDate(d.getDate() - 1);
  const p = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Stepping a day on the key alone: no time-of-day component exists, so a DST
// spring-forward day cannot normalise the cursor onto the day it came from.
export function previousDayKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - 1);
  const p = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const backlogKeyFor = (coupleId) => `haven-backlog-${coupleId}`;
export const achievedKeyFor = (coupleId) => `haven-achieved-${coupleId}`;
export const goldDaysKeyFor = (coupleId) => `haven-golddays-${coupleId}`;
export const prefsKey = "haven-prefs-v1";

// Goal changes are dated. Days before the first entry are measured against the
// 8h default, so raising the goal today cannot invent backlog for last month.
export function goalForDay(dayKey, history = [], fallback = DAILY_GOAL_MINUTES) {
  const entries = (Array.isArray(history) ? history : [])
    .filter(
      (entry) =>
        entry &&
        typeof entry.from === "string" &&
        Number.isFinite(Number(entry.minutes)) &&
        Number(entry.minutes) > 0,
    )
    .sort((a, b) => a.from.localeCompare(b.from));
  let minutes = fallback;
  for (const entry of entries) {
    if (entry.from > dayKey) break;
    minutes = Math.round(Number(entry.minutes));
  }
  return minutes;
}

// Replaces today's entry instead of stacking one per tap.
export function withGoalForDay(history, dayKey, minutes) {
  const rest = (Array.isArray(history) ? history : []).filter(
    (entry) => entry?.from !== dayKey,
  );
  return [...rest, { from: dayKey, minutes: Math.round(Number(minutes) || 0) }].sort(
    (a, b) => a.from.localeCompare(b.from),
  );
}

// True only on the render that crosses the goal, so a celebration cannot fire
// twice for the same 8h mark (479 -> 480 yes, 480 -> 520 no).
export function goalReached(prevMinutes, nextMinutes, goal = DAILY_GOAL_MINUTES) {
  return (Number(prevMinutes) || 0) < goal && (Number(nextMinutes) || 0) >= goal;
}

// Pure: returns a new sorted, de-duplicated array so callers can set state
// directly without worrying about mutation.
export function addGoldDay(days = [], key) {
  const list = (Array.isArray(days) ? days : []).filter(Boolean);
  if (!key) return [...new Set(list)].sort();
  return [...new Set([...list, key])].sort();
}

// Chronological running backlog across ALL logged days, floor at 0.
// balance = max(0, balance + (GOAL - dayMinutes))
// `goalMinutes` may be a number or a (dayKey) => minutes resolver, so a day is
// always measured against the goal that was in force on that day.
export function computeBacklog(studyLogs = [], goalMinutes = DAILY_GOAL_MINUTES, rolloverHour = ROLLOVER_HOUR, now = new Date()) {
  const goalFor =
    typeof goalMinutes === "function"
      ? goalMinutes
      : () => Math.max(0, Number(goalMinutes) || 0);
  const byDay = {};
  (Array.isArray(studyLogs) ? studyLogs : []).forEach((log) => {
    if (!log?.date) return;
    byDay[log.date] = (byDay[log.date] || 0) + (Number(log.duration) || 0);
  });
  const days = Object.keys(byDay).sort();
  let balance = 0;
  const perDay = days.map((date) => {
    const minutes = byDay[date];
    balance = Math.max(0, balance + (goalFor(date) - minutes));
    return { date, minutes, balanceAfter: balance };
  });
  const todayKey = dayKeyFor(now, rolloverHour);
  const todayMinutes = byDay[todayKey] || 0;
  return { balanceMinutes: balance, perDay, todayMinutes, todayKey, byDay };
}

export function formatBacklog(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (total === 0) return "All clear";
  if (!h) return `${m}m backlog`;
  if (!m) return `${h}h backlog`;
  return `${h}h ${m}m backlog`;
}

export function formatHoursShort(minutes) {
  const hours = Math.max(0, Number(minutes) || 0) / 60;
  if (hours === 0) return "0";
  return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

export function formatDuration(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}

// A gap under a quarter hour is noise, not a verdict.
export const PACE_DEADBAND_MINUTES = 15;

// Minutes that *should* be logged by now, if the 8 hours were spread evenly
// across the logical day. At 03:00 that is zero; at 02:59 it is the whole goal.
export function paceTarget(now = new Date(), goal = DAILY_GOAL_MINUTES, rolloverHour = ROLLOVER_HOUR) {
  const date = now instanceof Date ? now : new Date(now);
  const goalMinutes = Math.max(0, Number(goal) || 0);
  const elapsed =
    (date.getHours() - rolloverHour) * 60 + date.getMinutes() + date.getSeconds() / 60;
  const dayMinutes = Math.min(1440, Math.max(0, elapsed < 0 ? elapsed + 1440 : elapsed));
  return Math.round((dayMinutes / 1440) * goalMinutes);
}

export function paceStatus(todayMinutes, now = new Date(), goal = DAILY_GOAL_MINUTES, rolloverHour = ROLLOVER_HOUR) {
  const target = paceTarget(now, goal, rolloverHour);
  const delta = Math.round((Number(todayMinutes) || 0) - target);

  if (Math.abs(delta) < PACE_DEADBAND_MINUTES) {
    return { target, delta, tone: "on", text: "On pace" };
  }

  return {
    target,
    delta,
    tone: delta > 0 ? "ahead" : "behind",
    text: `${formatDuration(Math.abs(delta))} ${delta > 0 ? "ahead of" : "behind"} pace`,
  };
}

// Two seven-day windows ending on today, inclusive.
export function weekOverWeek(byDay, todayKey) {
  const map = byDay && typeof byDay === "object" ? byDay : {};
  let thisWeek = 0;
  let lastWeek = 0;
  let key = todayKey;

  for (let i = 0; i < 14 && key; i += 1) {
    const minutes = Number(map[key]) || 0;
    if (i < 7) thisWeek += minutes;
    else lastWeek += minutes;
    key = previousDayKey(key);
  }

  return { thisWeek, lastWeek, delta: thisWeek - lastWeek };
}

// "+1h 20m" / "−45m"; null when the weeks are level, so callers can say
// "same as last week" instead of "+0m".
export function formatSignedDelta(minutes) {
  const delta = Math.round(Number(minutes) || 0);
  if (!delta) return null;
  const abs = Math.abs(delta);
  return `${delta > 0 ? "+" : "−"}${formatDuration(abs)}`;
}

// Minutes the remaining days can still absorb at the daily goal.
export function remainingCapacity(daysLeft, goal = DAILY_GOAL_MINUTES) {
  return Math.max(0, Math.round(Number(daysLeft) || 0)) * Math.max(0, Number(goal) || 0);
}

export function formatThousands(value) {
  return String(Math.round(Number(value) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Streak: consecutive days ending today (or yesterday if today empty) with >= streakMin minutes.
export function computeStreak(studyLogs = [], streakMin = STREAK_MIN_MINUTES, rolloverHour = ROLLOVER_HOUR, now = new Date()) {
  const byDay = {};
  (Array.isArray(studyLogs) ? studyLogs : []).forEach((log) => {
    if (!log?.date) return;
    byDay[log.date] = (byDay[log.date] || 0) + (Number(log.duration) || 0);
  });
  let key = dayKeyFor(now, rolloverHour);
  // If the logical today has nothing yet, streak may still be alive via yesterday.
  if ((byDay[key] || 0) < streakMin) key = previousDayKey(key);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if ((byDay[key] || 0) >= streakMin) {
      streak += 1;
      key = previousDayKey(key);
    } else break;
  }
  return streak;
}

export function gradeFor(pct) {
  if (pct >= 85) return { label: "Excellent", color: "#57B894" };
  if (pct >= 70) return { label: "Good", color: "#D9A441" };
  return { label: "Needs work", color: "#E0483F" };
}

export const DEFAULT_PREFS = {
  displayName: "Chaaru",
  affirmation: "Don't waste your potential, I know you can do it!",
  accent: "blue",
  lockEnabled: false,
  lockDelaySec: 0,
  windDownEnabled: true,
  windDownHour: 2,
  windDownMinute: 0,
  weeklyReportEnabled: true,
  weeklyWeekday: 1, // Sunday (0=Sun per JS? we store expo weekday 1=Sunday)
  weeklyHour: 20,
  weeklyMinute: 0,
  goalHistory: [],
  goalSettingUnlocked: false,
};

export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(prefsKey);
    if (!raw) return { ...DEFAULT_PREFS };
    const stored = JSON.parse(raw);
    // migrate old accent keys to the iOS system palette
    const LEGACY_ACCENTS = { champagne: "blue", rose: "blue", mint: "green", sapphire: "indigo" };
    if (LEGACY_ACCENTS[stored.accent]) stored.accent = LEGACY_ACCENTS[stored.accent];
    return { ...DEFAULT_PREFS, ...stored };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(next) {
  try {
    await AsyncStorage.setItem(prefsKey, JSON.stringify(next));
  } catch {}
}
