// AsyncStorage has no native module under jest; backlog.js only uses it in
// loadPrefs/savePrefs, which these tests do not touch.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

import {
  ROLLOVER_HOUR,
  dayKeyFor,
  previousDayKey,
  computeBacklog,
  computeStreak,
  DAILY_GOAL_MINUTES,
  STREAK_MIN_MINUTES,
} from '../backlog';

// A fixed clock: 2:30am on 24 Oct 2026 is still the logical day 2026-10-23.
const NIGHT = new Date(2026, 9, 24, 2, 30);
// Sessions logged around midnight: the 2:30am one stock under yesterday.
const NIGHT_LOGS = [
  { date: '2026-10-23', duration: 25 },
  { date: '2026-10-24', duration: 10 },
];

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

test('previousDayKey steps back one day', () => {
  expect(previousDayKey('2027-03-14')).toBe('2027-03-13');
});

test('previousDayKey crosses the year boundary', () => {
  expect(previousDayKey('2027-01-01')).toBe('2026-12-31');
});

test('previousDayKey handles a non-leap February', () => {
  expect(previousDayKey('2026-03-01')).toBe('2026-02-28');
});

test('previousDayKey handles a leap February', () => {
  expect(previousDayKey('2024-03-01')).toBe('2024-02-29');
});

test('computeBacklog uses the logical day before the rollover hour', () => {
  const result = computeBacklog(NIGHT_LOGS, DAILY_GOAL_MINUTES, 3, NIGHT);

  expect(result.todayKey).toBe('2026-10-23');
  expect(result.todayMinutes).toBe(25);
});

test('computeBacklog resets at midnight when rolloverHour is 0', () => {
  const result = computeBacklog(NIGHT_LOGS, DAILY_GOAL_MINUTES, 0, NIGHT);

  expect(result.todayKey).toBe('2026-10-24');
  expect(result.todayMinutes).toBe(10);
});

test('computeBacklog defaults to the 3am rollover', () => {
  expect(computeBacklog(NIGHT_LOGS, DAILY_GOAL_MINUTES, undefined, NIGHT)).toEqual(
    computeBacklog(NIGHT_LOGS, DAILY_GOAL_MINUTES, ROLLOVER_HOUR, NIGHT)
  );
  expect(computeBacklog(NIGHT_LOGS, DAILY_GOAL_MINUTES, undefined, NIGHT).todayKey).toBe('2026-10-23');
});

test('computeBacklog keeps its existing return shape', () => {
  const result = computeBacklog([{ date: '2026-10-23', duration: 30 }]);
  expect(Object.keys(result).sort()).toEqual(
    ['balanceMinutes', 'perDay', 'todayMinutes', 'todayKey', 'byDay'].sort()
  );
});

test('computeStreak counts a 2:30am session toward yesterday', () => {
  const logs = [{ date: '2026-10-23', duration: STREAK_MIN_MINUTES }];
  expect(computeStreak(logs, STREAK_MIN_MINUTES, ROLLOVER_HOUR, NIGHT)).toBe(1);
});

test('computeStreak walks consecutive logical days across the rollover boundary', () => {
  const logs = [
    { date: '2026-10-23', duration: STREAK_MIN_MINUTES },
    { date: '2026-10-22', duration: STREAK_MIN_MINUTES },
    { date: '2026-10-20', duration: STREAK_MIN_MINUTES },
  ];
  expect(computeStreak(logs, STREAK_MIN_MINUTES, ROLLOVER_HOUR, NIGHT)).toBe(2);
});

// In America/New_York 2027-03-14 02:30 does not exist (spring forward), so a
// time-of-day cursor would normalise to 03:30 and count 2027-03-14 twice.
test('computeStreak does not double-count the DST spring-forward day', () => {
  const now = new Date(2027, 2, 15, 2, 30);
  const logs = [
    { date: '2027-03-14', duration: STREAK_MIN_MINUTES },
    { date: '2027-03-13', duration: STREAK_MIN_MINUTES },
    { date: '2027-03-12', duration: STREAK_MIN_MINUTES },
  ];
  expect(computeStreak(logs, STREAK_MIN_MINUTES, ROLLOVER_HOUR, now)).toBe(3);
});

test('computeStreak defaults to the 3am rollover', () => {
  const logs = [{ date: '2026-10-24', duration: STREAK_MIN_MINUTES }];
  expect(computeStreak(logs, STREAK_MIN_MINUTES, undefined, NIGHT)).toBe(0);
  expect(computeStreak(logs, STREAK_MIN_MINUTES, 0, NIGHT)).toBe(1);
});

test('computeStreak keeps streakMin as the second parameter', () => {
  const logs = [{ date: '2026-10-23', duration: 30 }];
  expect(computeStreak(logs, 60, ROLLOVER_HOUR, NIGHT)).toBe(0);
  expect(computeStreak(logs, 30, ROLLOVER_HOUR, NIGHT)).toBe(1);
});
