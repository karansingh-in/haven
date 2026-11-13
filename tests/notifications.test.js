// The wind-down body is the one notification she reads every night, so its
// wording is pinned — including the nudge for a day with nothing logged.

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
  removeItem: jest.fn(async () => {}),
}));

const scheduled = [];
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({ granted: true })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  scheduleNotificationAsync: jest.fn(async (request) => {
    scheduled.push(request);
    return request.identifier;
  }),
  cancelScheduledNotificationAsync: jest.fn(async () => {}),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  setNotificationChannelAsync: jest.fn(async () => {}),
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: "daily", WEEKLY: "weekly", TIME_INTERVAL: "timeInterval" },
}));

import {
  BREAK_NUDGES,
  ZERO_DAY_LINE,
  cancelFocusBreaks,
  scheduleFocusBreaks,
  weeklyBody,
  windDownBody,
} from "../notifications";

const summary = {
  todayText: "2h 30m studied",
  backlogText: "1h 20m backlog",
  streak: 4,
  daysLeft: 172,
};

beforeEach(() => {
  scheduled.length = 0;
});

test("a normal day reads as a summary and a goodnight", () => {
  expect(windDownBody({ ...summary, todayMinutes: 150 })).toBe(
    "2h 30m studied today · 1h 20m backlog · 4-day streak · 172 days to NEET. Goodnight.",
  );
});

test("a zero-minute day gets the nudge, with the whole summary intact", () => {
  const body = windDownBody({ ...summary, todayText: "0m studied", todayMinutes: 0 });
  expect(body.startsWith(ZERO_DAY_LINE)).toBe(true);
  expect(body).toContain("0m studied today");
  expect(body).toContain("4-day streak");
  expect(body).toContain("172 days to NEET");
  expect(body.endsWith("Goodnight.")).toBe(true);
});

test("the weekly body gets the same nudge on a zero-minute day", () => {
  expect(weeklyBody({ ...summary, todayMinutes: 0 })).toContain(ZERO_DAY_LINE);
  expect(weeklyBody({ ...summary, todayMinutes: 150 })).not.toContain(ZERO_DAY_LINE);
});

test("a missing streak is left out rather than printed as 0-day", () => {
  const body = windDownBody({ ...summary, streak: 0, todayMinutes: 10 });
  expect(body).not.toContain("0-day");
  expect(body).toContain("172 days to NEET");
});

test("schedules both break nudges with their identifiers", async () => {
  await scheduleFocusBreaks();
  expect(scheduled.map((n) => n.identifier)).toEqual(BREAK_NUDGES.map((n) => n.identifier));
  expect(scheduled[0].content.body).toContain("50 minutes");
  expect(scheduled[1].content.body).toContain("90 minutes");
  expect(scheduled[0].trigger).toMatchObject({ type: "timeInterval", seconds: 3000, repeats: false });
});

test("a disabled setting schedules nothing", async () => {
  await scheduleFocusBreaks({ enabled: false });
  expect(scheduled).toHaveLength(0);
});

test("cancelling asks for both identifiers", async () => {
  const Notifications = require("expo-notifications");
  Notifications.cancelScheduledNotificationAsync.mockClear();
  await cancelFocusBreaks();
  expect(Notifications.cancelScheduledNotificationAsync.mock.calls.map(([id]) => id)).toEqual(
    BREAK_NUDGES.map((n) => n.identifier),
  );
});
