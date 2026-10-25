// AsyncStorage is mocked because src/mistakes.js imports it; these tests only
// exercise the pure scheduling helpers, which never touch storage.
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

import {
  MISTAKE_REASONS,
  REVIEW_DAYS,
  applyReview,
  createMistake,
  dueMistakes,
  mistakesKeyFor,
} from '../src/mistakes';

const DAY = 86400000;
const NOW = new Date('2026-10-24T12:00:00Z').getTime();

test('the four reasons are fixed', () => {
  expect(MISTAKE_REASONS).toEqual(['concept', 'silly', 'time', 'guess']);
});

test('the review ladder is 1, 3, 7, 21 days', () => {
  expect(REVIEW_DAYS).toEqual([1, 3, 7, 21]);
});

test('mistakesKeyFor scopes the key per couple', () => {
  expect(mistakesKeyFor('abc')).toBe('haven-mistakes-abc');
});

test('createMistake schedules the first review one day out', () => {
  const mistake = createMistake(
    { subject: 'Physics', chapter: 'Kinematics', reason: 'silly', note: '  sign error  ' },
    NOW,
  );
  expect(mistake).toMatchObject({
    subject: 'Physics',
    chapter: 'Kinematics',
    reason: 'silly',
    note: 'sign error',
    createdAt: NOW,
    reviewAt: NOW + DAY,
    reviewCount: 0,
    resolvedAt: null,
  });
  expect(mistake.id.startsWith(`${NOW}-`)).toBe(true);
});

test('createMistake falls back to the concept reason', () => {
  expect(createMistake({ reason: 'nonsense' }, NOW).reason).toBe('concept');
  expect(createMistake({}, NOW).note).toBe('');
});

test('ids differ for mistakes created in the same millisecond', () => {
  const a = createMistake({ subject: 'Physics', chapter: 'Optics' }, NOW);
  const b = createMistake({ subject: 'Physics', chapter: 'Optics' }, NOW);
  expect(a.id).not.toBe(b.id);
});

test('the first review moves the next one to three days out', () => {
  const mistake = createMistake({ subject: 'Botany' }, NOW);
  const reviewed = applyReview(mistake, NOW + DAY);
  expect(reviewed.reviewCount).toBe(1);
  expect(reviewed.reviewAt).toBe(NOW + DAY + 3 * DAY);
  expect(reviewed.resolvedAt).toBeNull();
});

test('the ladder is 1 -> 3 -> 7 -> 21 days', () => {
  let mistake = createMistake({ subject: 'Zoology' }, NOW);
  const gaps = [];
  for (let step = 0; step < REVIEW_DAYS.length - 1; step += 1) {
    const reviewed = applyReview(mistake, NOW);
    gaps.push((reviewed.reviewAt - NOW) / DAY);
    mistake = reviewed;
  }
  expect(gaps).toEqual([3, 7, 21]);
});

test('the fourth review resolves the mistake', () => {
  let mistake = createMistake({ subject: 'Chemistry' }, NOW);
  for (let step = 0; step < REVIEW_DAYS.length; step += 1) {
    mistake = applyReview(mistake, NOW + step * DAY);
  }
  expect(mistake.reviewCount).toBe(4);
  expect(mistake.reviewAt).toBeNull();
  expect(mistake.resolvedAt).toBe(NOW + 3 * DAY);
});

test('reviewing a resolved mistake changes nothing', () => {
  const resolved = { ...createMistake({ subject: 'Physics' }, NOW), resolvedAt: NOW };
  expect(applyReview(resolved, NOW + DAY)).toEqual(resolved);
});

test('applyReview does not mutate its input', () => {
  const mistake = createMistake({ subject: 'Physics' }, NOW);
  const copy = { ...mistake };
  applyReview(mistake, NOW);
  expect(mistake).toEqual(copy);
});

test('dueMistakes is empty for an empty or missing list', () => {
  expect(dueMistakes([], NOW)).toEqual([]);
  expect(dueMistakes(undefined, NOW)).toEqual([]);
});

test('dueMistakes includes a review due exactly now', () => {
  const mistake = { ...createMistake({ subject: 'Physics' }, NOW - DAY) };
  expect(dueMistakes([mistake], NOW).map((m) => m.id)).toEqual([mistake.id]);
});

test('dueMistakes excludes reviews still in the future', () => {
  const mistake = createMistake({ subject: 'Physics' }, NOW);
  expect(dueMistakes([mistake], NOW)).toEqual([]);
});

test('dueMistakes skips resolved mistakes', () => {
  const resolved = { ...createMistake({ subject: 'Physics' }, NOW - 5 * DAY), resolvedAt: NOW };
  expect(dueMistakes([resolved], NOW)).toEqual([]);
});

test('dueMistakes sorts the oldest review first', () => {
  const older = createMistake({ subject: 'Physics' }, NOW - 9 * DAY);
  const newer = createMistake({ subject: 'Botany' }, NOW - 2 * DAY);
  expect(dueMistakes([newer, older], NOW).map((m) => m.id)).toEqual([older.id, newer.id]);
});
