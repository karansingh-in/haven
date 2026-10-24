// AsyncStorage has no native module under jest; backlog.js only uses it in
// loadPrefs/savePrefs, which these tests do not touch.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

import { DAILY_GOAL_MINUTES, addGoldDay, goalReached, goldDaysKeyFor } from '../backlog';

// The celebration must fire only on the crossing render, not every render at
// or above the goal — otherwise two triggers can stack two overlays.

test('goalReached is true when the session crosses 8h', () => {
  expect(goalReached(479, 480)).toBe(true);
});

test('goalReached is false when the goal was already met', () => {
  expect(goalReached(480, 520)).toBe(false);
});

test('goalReached is false below the goal', () => {
  expect(goalReached(0, 60)).toBe(false);
});

test('goalReached is true for a single jump past the goal', () => {
  expect(goalReached(0, 480)).toBe(true);
});

test('goalReached honours an explicit goal', () => {
  expect(goalReached(479, 480, 480)).toBe(true);
  expect(goalReached(480, 500, 480)).toBe(false);
});

test('goalReached defaults to the daily goal', () => {
  expect(goalReached(DAILY_GOAL_MINUTES - 1, DAILY_GOAL_MINUTES)).toBe(true);
});

test('goldDaysKeyFor scopes the key per couple', () => {
  expect(goldDaysKeyFor('abc')).toBe('haven-golddays-abc');
});

test('addGoldDay appends a new day', () => {
  expect(addGoldDay(['2026-10-22'], '2026-10-24')).toEqual(['2026-10-22', '2026-10-24']);
});

test('addGoldDay does not duplicate a day already recorded', () => {
  expect(addGoldDay(['2026-10-24'], '2026-10-24')).toEqual(['2026-10-24']);
});

test('addGoldDay ignores a falsy key', () => {
  expect(addGoldDay([], '')).toEqual([]);
  expect(addGoldDay(['2026-10-22'], undefined)).toEqual(['2026-10-22']);
});

test('addGoldDay keeps the result sorted ascending', () => {
  expect(addGoldDay(['2026-10-24', '2026-10-22'], '2026-10-23')).toEqual([
    '2026-10-22',
    '2026-10-23',
    '2026-10-24',
  ]);
});

test('addGoldDay does not mutate its input', () => {
  const input = ['2026-10-22'];
  const out = addGoldDay(input, '2026-10-24');
  expect(input).toEqual(['2026-10-22']);
  expect(out).not.toBe(input);
});

test('addGoldDay tolerates a missing first argument', () => {
  expect(addGoldDay(undefined, '2026-10-24')).toEqual(['2026-10-24']);
});
