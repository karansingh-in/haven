// The widget document is public-read in Firestore, so this payload is the only
// data a stranger can see. Pin its exact shape: seven fields, nothing else.

import { buildWidgetPayload } from '../src/widget';

const input = {
  todayMinutes: 185,
  goalMinutes: 480,
  streak: 12,
  balanceMinutes: 340,
  daysLeft: 176,
  goldDays: ['2026-10-20', '2026-10-22'],
};

test('maps the seven summary fields', () => {
  const out = buildWidgetPayload(input, 1700000000000);
  expect(out).toEqual({
    todayMinutes: 185,
    goalMinutes: 480,
    streak: 12,
    backlogMinutes: 340,
    daysLeft: 176,
    goldDays: ['2026-10-20', '2026-10-22'],
    updatedAt: 1700000000000,
  });
});

test('publishes exactly seven fields', () => {
  expect(Object.keys(buildWidgetPayload(input, 0)).sort()).toEqual([
    'backlogMinutes',
    'daysLeft',
    'goalMinutes',
    'goldDays',
    'streak',
    'todayMinutes',
    'updatedAt',
  ]);
});

test('drops anything not on the allow-list', () => {
  const out = buildWidgetPayload({ ...input, email: 'me@example.com', logs: [1, 2, 3] }, 0);
  expect(out).not.toHaveProperty('email');
  expect(out).not.toHaveProperty('logs');
});

test('rounds fractional minutes', () => {
  const out = buildWidgetPayload({ todayMinutes: 90.4, balanceMinutes: 90.6 }, 0);
  expect(out.todayMinutes).toBe(90);
  expect(out.backlogMinutes).toBe(91);
});

test('clamps negatives to zero', () => {
  const out = buildWidgetPayload(
    { todayMinutes: -30, streak: -1, balanceMinutes: -5, daysLeft: -12 },
    0,
  );
  expect(out.todayMinutes).toBe(0);
  expect(out.streak).toBe(0);
  expect(out.backlogMinutes).toBe(0);
  expect(out.daysLeft).toBe(0);
});

test('treats missing or non-numeric counts as zero', () => {
  const out = buildWidgetPayload(
    { todayMinutes: undefined, streak: 'abc', balanceMinutes: null, daysLeft: NaN },
    0,
  );
  expect(out).toMatchObject({ todayMinutes: 0, streak: 0, backlogMinutes: 0, daysLeft: 0 });
});

test('treats a non-finite timestamp as zero', () => {
  expect(buildWidgetPayload(input, Infinity).updatedAt).toBe(0);
  expect(buildWidgetPayload(input, 'nope').updatedAt).toBe(0);
});

test('defaults goldDays to an empty list', () => {
  expect(buildWidgetPayload({ todayMinutes: 1 }, 0).goldDays).toEqual([]);
  expect(buildWidgetPayload({ todayMinutes: 1, goldDays: 'nope' }, 0).goldDays).toEqual([]);
});

test('drops empty and non-string gold day keys', () => {
  const out = buildWidgetPayload({ goldDays: ['2026-10-22', '', null, 7, '  '] }, 0);
  expect(out.goldDays).toEqual(['2026-10-22']);
});

test('caps goldDays to the thirty most recent keys', () => {
  const keys = Array.from({ length: 45 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
  const out = buildWidgetPayload({ goldDays: keys }, 0);
  expect(out.goldDays).toHaveLength(30);
  expect(out.goldDays[0]).toBe(keys[15]);
  expect(out.goldDays[29]).toBe(keys[44]);
});

test('does not mutate the goldDays it was handed', () => {
  const keys = Array.from({ length: 40 }, (_, i) => `2026-02-${String(i + 1).padStart(2, '0')}`);
  const copy = [...keys];
  buildWidgetPayload({ goldDays: keys }, 0);
  expect(keys).toEqual(copy);
});

test('tolerates a missing argument', () => {
  const out = buildWidgetPayload(undefined, 42);
  expect(out).toEqual({
    todayMinutes: 0,
    goalMinutes: 0,
    streak: 0,
    backlogMinutes: 0,
    daysLeft: 0,
    goldDays: [],
    updatedAt: 42,
  });
});

test('timestamps with the wall clock when no time is injected', () => {
  const before = Date.now();
  const { updatedAt } = buildWidgetPayload(input);
  expect(updatedAt).toBeGreaterThanOrEqual(before);
  expect(updatedAt).toBeLessThanOrEqual(Date.now());
});
