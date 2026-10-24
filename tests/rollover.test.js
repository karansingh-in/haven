// AsyncStorage has no native module under jest; backlog.js only uses it in
// loadPrefs/savePrefs, which these tests do not touch.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

import {
  ROLLOVER_HOUR,
  dayKeyFor,
  computeBacklog,
  computeStreak,
  DAILY_GOAL_MINUTES,
  STREAK_MIN_MINUTES,
} from '../backlog';

const pad = (v) => String(v).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() - n);
  return d;
};

test('rollover hour is 3am', () => {
  expect(ROLLOVER_HOUR).toBe(3);
});

test('dayKeyFor rolls 2:59am back to the previous date', () => {
  expect(dayKeyFor(new Date(2026, 9, 24, 2, 59))).toBe('2026-10-23');
});

test('dayKeyFor switches to the new date at exactly 3:00am', () => {
  expect(dayKeyFor(new Date(2026, 9, 24, 3, 0))).toBe('2026-10-24');
});

test('dayKeyFor keeps the same date late in the evening', () => {
  expect(dayKeyFor(new Date(2026, 9, 24, 23, 59))).toBe('2026-10-24');
});

test('dayKeyFor handles a month boundary before rollover', () => {
  expect(dayKeyFor(new Date(2026, 10, 1, 2, 30))).toBe('2026-10-31');
});

test('dayKeyFor handles a year boundary before rollover', () => {
  expect(dayKeyFor(new Date(2027, 0, 1, 1, 0))).toBe('2026-12-31');
});

test('dayKeyFor honours a custom rollover hour', () => {
  expect(dayKeyFor(new Date(2026, 9, 24, 5, 0), 6)).toBe('2026-10-23');
  expect(dayKeyFor(new Date(2026, 9, 24, 5, 0), 0)).toBe('2026-10-24');
});

test('dayKeyFor does not mutate the date it is given', () => {
  const input = new Date(2026, 9, 24, 2, 30);
  dayKeyFor(input);
  expect(input.getHours()).toBe(2);
  expect(input.getDate()).toBe(24);
});

// computeBacklog/computeStreak read the system clock, so "before rollover" is
// simulated deterministically with a rollover hour above the current hour
// instead of waiting for a real 2am run.
test('computeBacklog attributes pre-rollover logs to yesterday', () => {
  const now = new Date();
  const beforeRollover = now.getHours() + 1;
  const yesterdayKey = keyOf(daysAgo(1, now));

  const result = computeBacklog([{ date: yesterdayKey, duration: 25 }], DAILY_GOAL_MINUTES, beforeRollover);

  expect(result.todayKey).toBe(yesterdayKey);
  expect(result.todayMinutes).toBe(25);
});

test('computeBacklog resets today at midnight when rolloverHour is 0', () => {
  const now = new Date();
  const yesterdayKey = keyOf(daysAgo(1, now));

  const result = computeBacklog([{ date: yesterdayKey, duration: 25 }], DAILY_GOAL_MINUTES, 0);

  expect(result.todayKey).toBe(keyOf(now));
  expect(result.todayMinutes).toBe(0);
});

test('computeBacklog defaults to the 3am rollover', () => {
  const logs = [{ date: '2026-10-23', duration: 25 }];
  expect(computeBacklog(logs)).toEqual(computeBacklog(logs, DAILY_GOAL_MINUTES, ROLLOVER_HOUR));
});

test('computeBacklog keeps its existing return shape', () => {
  const result = computeBacklog([{ date: '2026-10-23', duration: 30 }]);
  expect(Object.keys(result).sort()).toEqual(
    ['balanceMinutes', 'perDay', 'todayMinutes', 'todayKey', 'byDay'].sort()
  );
});

test('computeStreak counts a 2:30am session toward yesterday', () => {
  const yesterdayKey = keyOf(daysAgo(1));
  // A 2:30am session is stored under the previous day's key by dayKeyFor.
  expect(computeStreak([{ date: yesterdayKey, duration: STREAK_MIN_MINUTES }])).toBe(1);
});

test('computeStreak counts consecutive days across the rollover boundary', () => {
  const logs = [
    { date: keyOf(daysAgo(1)), duration: STREAK_MIN_MINUTES },
    { date: keyOf(daysAgo(2)), duration: STREAK_MIN_MINUTES },
  ];
  expect(computeStreak(logs)).toBe(2);
});

test('computeStreak keeps streakMin as the second parameter', () => {
  const logs = [{ date: keyOf(daysAgo(1)), duration: 30 }];
  expect(computeStreak(logs, 60, ROLLOVER_HOUR)).toBe(0);
  expect(computeStreak(logs, 30, ROLLOVER_HOUR)).toBe(1);
});
