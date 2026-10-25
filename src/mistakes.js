import AsyncStorage from "@react-native-async-storage/async-storage";

// A mistake is a wrong question you want to see again. It climbs a fixed
// ladder — 1, 3, 7 then 21 days — and resolves after the fourth review. The
// schedule lives here, storage stays dumb, so the timing is testable without
// AsyncStorage.

export const MISTAKE_REASONS = ["concept", "silly", "time", "guess"];
export const REVIEW_DAYS = [1, 3, 7, 21];

const DAY_MS = 86400000;

export const mistakesKeyFor = (coupleId) => `haven-mistakes-${coupleId}`;

export function createMistake({ subject, chapter, reason, note } = {}, now = Date.now()) {
  return {
    id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
    subject: String(subject ?? ""),
    chapter: String(chapter ?? ""),
    reason: MISTAKE_REASONS.includes(reason) ? reason : "concept",
    note: String(note ?? "").trim(),
    createdAt: now,
    reviewAt: now + REVIEW_DAYS[0] * DAY_MS,
    reviewCount: 0,
    resolvedAt: null,
  };
}

// Advances one rung. The fourth review retires the mistake instead of
// scheduling another; a resolved mistake is returned untouched so a stale tap
// cannot resurrect it.
export function applyReview(mistake, now = Date.now()) {
  if (!mistake || mistake.resolvedAt) return mistake;

  const count = Math.max(0, Math.floor(Number(mistake.reviewCount) || 0));
  const nextCount = Math.min(count + 1, REVIEW_DAYS.length);

  if (nextCount >= REVIEW_DAYS.length) {
    return { ...mistake, reviewCount: nextCount, reviewAt: null, resolvedAt: now };
  }

  return {
    ...mistake,
    reviewCount: nextCount,
    reviewAt: now + REVIEW_DAYS[nextCount] * DAY_MS,
  };
}

export function dueMistakes(list, now = Date.now()) {
  if (!Array.isArray(list)) return [];

  return list
    .filter(
      (mistake) =>
        mistake &&
        !mistake.resolvedAt &&
        Number.isFinite(Number(mistake.reviewAt)) &&
        Number(mistake.reviewAt) <= now,
    )
    .sort((a, b) => Number(a.reviewAt) - Number(b.reviewAt));
}

const readAll = async (coupleId) => {
  if (!coupleId) return [];
  try {
    const raw = await AsyncStorage.getItem(mistakesKeyFor(coupleId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((m) => m && typeof m === "object") : [];
  } catch {
    // Corrupt JSON reads as an empty log rather than throwing into the screen.
    return [];
  }
};

const writeAll = async (coupleId, list) => {
  await AsyncStorage.setItem(mistakesKeyFor(coupleId), JSON.stringify(list));
  return list;
};

export const getMistakes = async (coupleId) => readAll(coupleId);

export async function addMistake(coupleId, fields) {
  if (!coupleId) return null;

  const list = await readAll(coupleId);
  const mistake = createMistake(fields);
  await writeAll(coupleId, [mistake, ...list]);
  return mistake;
}

export async function reviewMistake(coupleId, id, now = Date.now()) {
  const list = await readAll(coupleId);
  const next = list.map((mistake) => (mistake.id === id ? applyReview(mistake, now) : mistake));
  return writeAll(coupleId, next);
}

export async function deleteMistake(coupleId, id) {
  const list = await readAll(coupleId);
  return writeAll(
    coupleId,
    list.filter((mistake) => mistake.id !== id),
  );
}
