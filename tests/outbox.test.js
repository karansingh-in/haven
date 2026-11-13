// The outbox is what stands between a dropped connection and a lost session.
// These pin the three properties that make it safe: no duplicates, a bounded
// queue, and a merge that never double-counts a replayed session.

jest.mock("@react-native-async-storage/async-storage", () => {
  globalThis.__outboxStore = new Map();
  return {
    getItem: jest.fn(async (key) =>
      globalThis.__outboxStore.has(key) ? globalThis.__outboxStore.get(key) : null,
    ),
    setItem: jest.fn(async (key, value) => {
      globalThis.__outboxStore.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      globalThis.__outboxStore.delete(key);
    }),
  };
});

import {
  clearOutbox,
  dropSession,
  mergeSessions,
  pendingSessions,
  queueSession,
  subscribeOutbox,
} from "../src/outbox";

const COUPLE = "couple-1";
const session = (timestamp, duration = 60, subject = "Physics") => ({
  subject,
  duration,
  date: "2026-11-12",
  timestamp,
});

beforeEach(() => globalThis.__outboxStore.clear());

test("queues a session and reads it back", async () => {
  await queueSession(COUPLE, session(1000));
  expect(await pendingSessions(COUPLE)).toEqual([session(1000)]);
});

test("queueing the same session twice keeps one copy", async () => {
  await queueSession(COUPLE, session(1000));
  await queueSession(COUPLE, session(1000));
  expect(await pendingSessions(COUPLE)).toHaveLength(1);
});

test("keeps sessions in the order they were queued", async () => {
  await queueSession(COUPLE, session(1000));
  await queueSession(COUPLE, session(2000));
  expect((await pendingSessions(COUPLE)).map((s) => s.timestamp)).toEqual([1000, 2000]);
});

test("caps the queue at fifty and drops the oldest", async () => {
  for (let i = 0; i < 55; i += 1) await queueSession(COUPLE, session(i));
  const pending = await pendingSessions(COUPLE);
  expect(pending).toHaveLength(50);
  expect(pending[0].timestamp).toBe(5);
});

test("dropping one leaves the rest", async () => {
  await queueSession(COUPLE, session(1000));
  await queueSession(COUPLE, session(2000));
  await dropSession(COUPLE, 1000);
  expect((await pendingSessions(COUPLE)).map((s) => s.timestamp)).toEqual([2000]);
});

test("clearing empties the queue", async () => {
  await queueSession(COUPLE, session(1000));
  await clearOutbox(COUPLE);
  expect(await pendingSessions(COUPLE)).toEqual([]);
});

test("a missing queue reads as empty, not a crash", async () => {
  expect(await pendingSessions("nobody")).toEqual([]);
  expect(await pendingSessions(undefined)).toEqual([]);
});

test("survives corrupt storage", async () => {
  globalThis.__outboxStore.set(`haven-outbox-v1-${COUPLE}`, "{not json");
  expect(await pendingSessions(COUPLE)).toEqual([]);
});

test("listeners see every change", async () => {
  const seen = [];
  const unsubscribe = subscribeOutbox(COUPLE, (sessions) => seen.push(sessions.length));
  await queueSession(COUPLE, session(1000));
  await queueSession(COUPLE, session(2000));
  await dropSession(COUPLE, 1000);
  unsubscribe();
  await queueSession(COUPLE, session(3000));
  expect(seen).toEqual([1, 2, 1]);
});

test("merges queued sessions into the day and marks them", () => {
  const logs = [session(1000, 60), session(2000, 30)];
  const merged = mergeSessions(logs, [session(3000, 45)]);
  expect(merged).toHaveLength(3);
  expect(merged[2]).toMatchObject({ timestamp: 3000, pending: true });
  expect(merged[0].pending).toBeUndefined();
});

test("a session that also arrived from the server is not counted twice", () => {
  const merged = mergeSessions([session(1000, 60)], [session(1000, 60)]);
  expect(merged).toHaveLength(1);
  expect(merged[0].pending).toBe(true);
});

test("merging orders by timestamp so the list does not jump", () => {
  const merged = mergeSessions([session(3000), session(1000)], [session(2000)]);
  expect(merged.map((s) => s.timestamp)).toEqual([1000, 2000, 3000]);
});

test("tolerates missing or junk input", () => {
  expect(mergeSessions()).toEqual([]);
  expect(mergeSessions(null, null)).toEqual([]);
  expect(mergeSessions([{ subject: "Physics" }], [])).toEqual([]);
});
