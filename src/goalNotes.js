import AsyncStorage from "@react-native-async-storage/async-storage";

// Why a day fell short, in her own words. Stored per couple and per day, next
// to the other local-only records (gold days, mocks, syllabus checks) rather
// than in Firestore: this is a private note, not shared state.

const storageKey = (coupleId) => `haven-goal-notes-v1-${coupleId}`;

// The prompt belongs to the end of the day, not to the middle of it. Asking at
// 4pm why an 8-hour goal is unmet would be noise; asking at 9pm is a question
// with an answer.
export const GOAL_NOTE_HOUR = 21;

// Pure, so the trigger is pinned by tests rather than by whichever screen
// happens to call it.
export function shouldAskGoalNote({
  dayKey,
  minutes,
  goalMinutes,
  notes = {},
  now = new Date(),
}) {
  if (!dayKey) return false;
  const goal = Number(goalMinutes);
  if (!(goal > 0)) return false;
  if (Number(minutes) >= goal) return false;
  if (now.getHours() < GOAL_NOTE_HOUR) return false;
  // One ask per day, whether it was answered or waved away.
  return !notes?.[dayKey];
}

export async function loadGoalNotes(coupleId) {
  if (!coupleId) return {};
  try {
    const raw = await AsyncStorage.getItem(storageKey(coupleId));
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
}

// A skip is recorded too, so the same evening cannot ask twice. An empty note
// and a skip are the same thing to the reader below.
export async function saveGoalNote(coupleId, dayKey, { text = "", skipped = false } = {}) {
  if (!coupleId || !dayKey) return {};
  const notes = await loadGoalNotes(coupleId);
  const next = {
    ...notes,
    [dayKey]: {
      text: String(text).trim(),
      skipped: Boolean(skipped) && !String(text).trim(),
      at: Date.now(),
    },
  };
  try {
    await AsyncStorage.setItem(storageKey(coupleId), JSON.stringify(next));
  } catch {}
  return next;
}

// Newest first, and only the ones she actually wrote something for.
export function recentNotes(notes = {}, limit = 5) {
  if (!notes || typeof notes !== "object") return [];
  return Object.entries(notes)
    .filter(([, entry]) => entry && typeof entry === "object" && String(entry.text ?? "").trim())
    .map(([dayKey, entry]) => ({ dayKey, text: String(entry.text).trim() }))
    .sort((a, b) => b.dayKey.localeCompare(a.dayKey))
    .slice(0, limit);
}
