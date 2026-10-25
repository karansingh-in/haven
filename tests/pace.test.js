// backlog.js imports AsyncStorage for prefs; these tests only use the pure
// helpers, so a stub is enough.
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

import {
  DAILY_GOAL_MINUTES,
  formatDuration,
  formatSignedDelta,
  formatThousands,
  paceStatus,
  paceTarget,
  remainingCapacity,
  weekOverWeek,
} from "../backlog";

// Local-time dates on purpose: pace is a wall-clock idea, so the test must not
// depend on the machine's time zone.
const at = (hour, minute = 0, second = 0) => new Date(2026, 9, 24, hour, minute, second);

test("paceTarget is zero at the 03:00 rollover", () => {
  expect(paceTarget(at(3, 0))).toBe(0);
});

test("paceTarget is a quarter of the goal six hours in", () => {
  expect(paceTarget(at(9, 0))).toBe(120);
});

test("paceTarget is half the goal at 15:00", () => {
  expect(paceTarget(at(15, 0))).toBe(240);
});

test("paceTarget reaches the full goal just before the next rollover", () => {
  expect(paceTarget(at(2, 59))).toBe(480);
  expect(paceTarget(at(2, 0))).toBe(460);
});

test("paceTarget snaps to ten minutes at half past", () => {
  expect(paceTarget(at(3, 30))).toBe(10);
});

test("paceTarget never leaves the day's range", () => {
  for (let hour = 0; hour < 24; hour += 1) {
    const target = paceTarget(at(hour, 30));
    expect(target).toBeGreaterThanOrEqual(0);
    expect(target).toBeLessThanOrEqual(DAILY_GOAL_MINUTES);
  }
});

test("paceTarget honours a custom goal", () => {
  expect(paceTarget(at(15, 0), 240)).toBe(120);
  expect(paceTarget(at(15, 0), 0)).toBe(0);
});

test("paceTarget honours a custom rollover hour", () => {
  expect(paceTarget(at(12, 0), DAILY_GOAL_MINUTES, 0)).toBe(240);
});

test("paceTarget accepts a timestamp as well as a Date", () => {
  expect(paceTarget(at(15, 0).getTime())).toBe(240);
});

test("paceStatus calls a small gap on pace", () => {
  const status = paceStatus(245, at(15, 0));
  expect(status.tone).toBe("on");
  expect(status.text).toBe("On pace");
});

test("paceStatus reports time ahead", () => {
  const status = paceStatus(300, at(15, 0));
  expect(status).toMatchObject({ delta: 60, tone: "ahead", text: "1h ahead of pace" });
});

test("paceStatus reports time behind", () => {
  const status = paceStatus(200, at(15, 0));
  expect(status).toMatchObject({ delta: -40, tone: "behind", text: "40m behind pace" });
});

test("weekOverWeek is zero with no history", () => {
  expect(weekOverWeek({}, "2026-10-14")).toEqual({ thisWeek: 0, lastWeek: 0, delta: 0 });
  expect(weekOverWeek(undefined, "2026-10-14")).toEqual({ thisWeek: 0, lastWeek: 0, delta: 0 });
});

test("weekOverWeek compares equal weeks as zero", () => {
  expect(weekOverWeek({ "2026-10-14": 60, "2026-10-07": 60 }, "2026-10-14")).toEqual({
    thisWeek: 60,
    lastWeek: 60,
    delta: 0,
  });
});

test("weekOverWeek reports a gain", () => {
  const result = weekOverWeek({ "2026-10-14": 120, "2026-10-07": 60 }, "2026-10-14");
  expect(result).toMatchObject({ thisWeek: 120, lastWeek: 60, delta: 60 });
});

test("weekOverWeek puts the seventh day back in last week", () => {
  // The window is inclusive: 08..14 is this week, 01..07 is last week.
  expect(weekOverWeek({ "2026-10-14": 30, "2026-10-08": 90 }, "2026-10-14")).toMatchObject({
    thisWeek: 120,
    lastWeek: 0,
  });
  expect(weekOverWeek({ "2026-10-14": 30, "2026-10-07": 90 }, "2026-10-14")).toMatchObject({
    thisWeek: 30,
    lastWeek: 90,
    delta: -60,
  });
});

test("weekOverWeek ignores anything older than two weeks", () => {
  expect(weekOverWeek({ "2026-09-30": 500 }, "2026-10-14")).toEqual({
    thisWeek: 0,
    lastWeek: 0,
    delta: 0,
  });
});

test("weekOverWeek sums a whole week", () => {
  const byDay = {
    "2026-10-14": 60,
    "2026-10-13": 60,
    "2026-10-12": 60,
    "2026-10-11": 60,
    "2026-10-10": 60,
    "2026-10-09": 60,
    "2026-10-08": 60,
  };
  expect(weekOverWeek(byDay, "2026-10-14")).toMatchObject({ thisWeek: 420, lastWeek: 0 });
});

test("formatSignedDelta renders hours and minutes", () => {
  expect(formatSignedDelta(80)).toBe("+1h 20m");
  expect(formatSignedDelta(-45)).toBe("−45m");
  expect(formatSignedDelta(120)).toBe("+2h");
  expect(formatSignedDelta(0)).toBeNull();
  expect(formatSignedDelta(undefined)).toBeNull();
});

test("formatDuration keeps the short forms", () => {
  expect(formatDuration(0)).toBe("0m");
  expect(formatDuration(42)).toBe("42m");
  expect(formatDuration(60)).toBe("1h");
  expect(formatDuration(125)).toBe("2h 5m");
  expect(formatDuration(-5)).toBe("0m");
});

test("remainingCapacity counts the goal for every day left", () => {
  expect(remainingCapacity(214)).toBe(214 * 480);
  expect(remainingCapacity(0)).toBe(0);
  expect(remainingCapacity(10, 60)).toBe(600);
  expect(remainingCapacity(-3)).toBe(0);
});

test("formatThousands groups the digits", () => {
  expect(formatThousands(1712)).toBe("1,712");
  expect(formatThousands(8)).toBe("8");
  expect(formatThousands(0)).toBe("0");
  expect(formatThousands(1234567)).toBe("1,234,567");
  expect(formatThousands(undefined)).toBe("0");
});
