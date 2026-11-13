import AsyncStorage from "@react-native-async-storage/async-storage";

// A session the server never received. `logStudySession` writes the queue when
// the network is down, and the app merges it back into the day so the minutes
// still count. `arrayUnion` on the server side compares by value, so replaying
// a queued session is a no-op rather than a duplicate.

const CAP = 50;
const storageKey = (coupleId) => `haven-outbox-v1-${coupleId}`;

// Screens subscribe instead of prop-drilling the queue through four layers.
const listeners = new Map();

export function subscribeOutbox(coupleId, listener) {
  if (!coupleId) return () => {};
  if (!listeners.has(coupleId)) listeners.set(coupleId, new Set());
  listeners.get(coupleId).add(listener);
  return () => {
    listeners.get(coupleId)?.delete(listener);
  };
}

const emit = (coupleId, sessions) => {
  for (const listener of listeners.get(coupleId) ?? []) {
    try {
      listener(sessions);
    } catch {}
  }
};

export async function pendingSessions(coupleId) {
  if (!coupleId) return [];
  try {
    const raw = await AsyncStorage.getItem(storageKey(coupleId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
  } catch {
    return [];
  }
}

const persist = async (coupleId, sessions) => {
  try {
    await AsyncStorage.setItem(storageKey(coupleId), JSON.stringify(sessions));
  } catch {}
  emit(coupleId, sessions);
  return sessions;
};

export async function queueSession(coupleId, session) {
  if (!coupleId || !session) return [];
  const current = await pendingSessions(coupleId);
  // The same session retried is not a second session.
  if (current.some((item) => item.timestamp === session.timestamp)) return current;
  // Oldest first, so a very long outage cannot grow the queue without bound.
  return persist(coupleId, [...current, session].slice(-CAP));
}

export async function dropSession(coupleId, timestamp) {
  const current = await pendingSessions(coupleId);
  return persist(
    coupleId,
    current.filter((item) => item.timestamp !== timestamp),
  );
}

export async function clearOutbox(coupleId) {
  return persist(coupleId, []);
}

// Queued sessions shadow the server copy until the write lands, so today's
// minutes never dip while a session is in flight.
export function mergeSessions(logs = [], pending = []) {
  const byTimestamp = new Map();
  const add = (log, extra) => {
    if (!log || log.timestamp === undefined) return;
    byTimestamp.set(log.timestamp, extra ? { ...log, ...extra } : log);
  };
  for (const log of Array.isArray(logs) ? logs : []) add(log);
  for (const log of Array.isArray(pending) ? pending : []) add(log, { pending: true });
  return [...byTimestamp.values()].sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}
