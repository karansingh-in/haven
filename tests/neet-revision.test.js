// In-memory AsyncStorage so the syllabus storage path is exercised for real.
// The factory initialises the store because module requires run before the
// test body's const declarations.
var mockStore;
jest.mock('@react-native-async-storage/async-storage', () => {
  mockStore = new Map();
  return {
    getItem: async (key) => (mockStore.has(key) ? mockStore.get(key) : null),
    setItem: async (key, value) => {
      mockStore.set(key, value);
    },
  };
});

import {
  REVISION_DAYS,
  SYLLABUS,
  dueChapters,
  getSyllabusProgress,
  normalizeChecks,
  toggleSyllabusChapter,
} from '../src/neet';

const DAY = 86400000;
const NOW = new Date('2026-10-24T12:00:00Z').getTime();
const isoDaysAgo = (days) => new Date(NOW - days * DAY).toISOString();

beforeEach(() => {
  mockStore.clear();
});

test('revision intervals follow weightage', () => {
  expect(REVISION_DAYS).toEqual({ High: 7, Medium: 14, Low: 30 });
});

test('normalizeChecks upgrades legacy booleans to a dated object', () => {
  expect(normalizeChecks({ phy2: true })).toEqual({ phy2: { done: true, at: null } });
});

test('normalizeChecks keeps a valid date', () => {
  const at = '2026-10-20T09:00:00.000Z';
  expect(normalizeChecks({ phy2: { done: true, at } })).toEqual({ phy2: { done: true, at } });
});

test('normalizeChecks drops unchecked and malformed entries', () => {
  expect(normalizeChecks({ phy2: false, phy3: { done: false }, phy4: null, phy5: 'yes' })).toEqual({});
});

test('normalizeChecks treats a missing date as unknown, not now', () => {
  expect(normalizeChecks({ phy2: { done: true } })).toEqual({ phy2: { done: true, at: null } });
});

test('normalizeChecks tolerates junk', () => {
  expect(normalizeChecks(null)).toEqual({});
  expect(normalizeChecks('nope')).toEqual({});
  expect(normalizeChecks([1, 2])).toEqual({});
});

test('a High chapter eight days past is due', () => {
  const due = dueChapters({ phy2: { done: true, at: isoDaysAgo(8) } }, NOW);
  expect(due.map((entry) => entry.id)).toEqual(['phy2']);
});

test('a Low chapter eight days past is not due yet', () => {
  expect(dueChapters({ phy1: { done: true, at: isoDaysAgo(8) } }, NOW)).toEqual([]);
});

test('a Medium chapter is due after fourteen days', () => {
  expect(dueChapters({ phy4: { done: true, at: isoDaysAgo(14) } }, NOW).map((e) => e.id)).toEqual(['phy4']);
  expect(dueChapters({ phy4: { done: true, at: isoDaysAgo(13) } }, NOW)).toEqual([]);
});

test('a chapter exactly on its interval is due', () => {
  expect(dueChapters({ phy2: { done: true, at: isoDaysAgo(7) } }, NOW).map((e) => e.id)).toEqual(['phy2']);
});

test('legacy true entries never come due', () => {
  expect(dueChapters({ phy2: true }, NOW)).toEqual([]);
});

test('unchecked and undated chapters are never due', () => {
  expect(dueChapters({}, NOW)).toEqual([]);
  expect(dueChapters({ phy2: { done: true, at: null } }, NOW)).toEqual([]);
  expect(dueChapters(undefined, NOW)).toEqual([]);
});

test('an unparseable date is not due', () => {
  expect(dueChapters({ phy2: { done: true, at: 'yesterday' } }, NOW)).toEqual([]);
});

test('due chapters come back in syllabus order', () => {
  const due = dueChapters(
    { phy8: { done: true, at: isoDaysAgo(30) }, phy2: { done: true, at: isoDaysAgo(30) } },
    NOW,
  );
  expect(due.map((entry) => entry.id)).toEqual(['phy2', 'phy8']);
});

test('every chapter in the syllabus has a valid weightage', () => {
  const bad = SYLLABUS.filter((entry) => !REVISION_DAYS[entry.weightage]);
  expect(bad).toEqual([]);
});

test('checking a chapter stores the completion date', async () => {
  await toggleSyllabusChapter('c1', 'phy2');
  const stored = JSON.parse(mockStore.get('haven-syllabus-c1'));
  expect(stored.phy2.done).toBe(true);
  expect(Number.isFinite(Date.parse(stored.phy2.at))).toBe(true);
});

test('unchecking deletes the entry instead of storing false', async () => {
  await toggleSyllabusChapter('c1', 'phy2');
  await toggleSyllabusChapter('c1', 'phy2');
  expect(JSON.parse(mockStore.get('haven-syllabus-c1'))).toEqual({});
});

test('re-checking a due chapter resets its date', async () => {
  mockStore.set('haven-syllabus-c1', JSON.stringify({ phy2: { done: true, at: isoDaysAgo(30) } }));
  await toggleSyllabusChapter('c1', 'phy2'); // uncheck
  await toggleSyllabusChapter('c1', 'phy2'); // recheck now
  const stored = JSON.parse(mockStore.get('haven-syllabus-c1'));
  expect(NOW - Date.parse(stored.phy2.at)).toBeLessThan(60000);
  expect(dueChapters(stored, Date.now())).toEqual([]);
});

test('progress counts legacy and dated checks alike', async () => {
  mockStore.set('haven-syllabus-c1', JSON.stringify({ phy2: true, phy3: { done: true, at: isoDaysAgo(1) } }));
  const progress = await getSyllabusProgress('c1');
  expect(progress.checked).toBe(2);
  expect(progress.total).toBe(SYLLABUS.length);
  expect(progress.checks.phy2).toEqual({ done: true, at: null });
});

test('progress ignores junk in storage', async () => {
  mockStore.set('haven-syllabus-c1', '{not json');
  const progress = await getSyllabusProgress('c1');
  expect(progress).toMatchObject({ checked: 0, percent: 0, checks: {} });
});
