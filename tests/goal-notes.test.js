// The missed-goal prompt is the one place the app asks a question instead of
// answering one. Its trigger is what keeps it from becoming noise: late in the
// day, short of the goal, and never twice for the same day.

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

import { GOAL_NOTE_HOUR, recentNotes, shouldAskGoalNote } from "../src/goalNotes";

const EVENING = new Date(2026, 10, 13, 21, 30);
const AFTERNOON = new Date(2026, 10, 13, 16, 0);
const DAY = "2026-11-13";

const base = { dayKey: DAY, minutes: 380, goalMinutes: 480, notes: {}, now: EVENING };

test("asks in the evening when the goal is out of reach", () => {
  expect(shouldAskGoalNote(base)).toBe(true);
});

test("stays quiet in the afternoon", () => {
  expect(shouldAskGoalNote({ ...base, now: AFTERNOON })).toBe(false);
});

test("stays quiet the moment the goal is met", () => {
  expect(shouldAskGoalNote({ ...base, minutes: 480 })).toBe(false);
  expect(shouldAskGoalNote({ ...base, minutes: 900 })).toBe(false);
});

test("asks only once per day", () => {
  expect(shouldAskGoalNote({ ...base, notes: { [DAY]: { text: "Fever." } } })).toBe(false);
  expect(shouldAskGoalNote({ ...base, notes: { [DAY]: { skipped: true } } })).toBe(false);
});

test("a note from another day does not silence today", () => {
  expect(shouldAskGoalNote({ ...base, notes: { "2026-11-12": { text: "Fever." } } })).toBe(true);
});

test("no goal, no question", () => {
  expect(shouldAskGoalNote({ ...base, goalMinutes: 0 })).toBe(false);
  expect(shouldAskGoalNote({ ...base, goalMinutes: undefined })).toBe(false);
});

test("junk minutes do not trigger it", () => {
  expect(shouldAskGoalNote({ ...base, minutes: undefined })).toBe(true);
  expect(shouldAskGoalNote({ ...base, minutes: NaN })).toBe(true);
});

test("the hour boundary is inclusive", () => {
  const at = (h) => new Date(2026, 10, 13, h, 0);
  expect(shouldAskGoalNote({ ...base, now: at(GOAL_NOTE_HOUR - 1) })).toBe(false);
  expect(shouldAskGoalNote({ ...base, now: at(GOAL_NOTE_HOUR) })).toBe(true);
});

test("recent notes are newest first and skip blank or skipped days", () => {
  const notes = {
    "2026-11-10": { text: "Too tired after school." },
    "2026-11-12": { text: "" , skipped: true },
    "2026-11-11": { text: "Family function." },
    "2026-11-09": { text: "   " },
  };
  expect(recentNotes(notes)).toEqual([
    { dayKey: "2026-11-11", text: "Family function." },
    { dayKey: "2026-11-10", text: "Too tired after school." },
  ]);
});

test("recent notes cap at the limit and survive junk", () => {
  const notes = {};
  for (let i = 1; i <= 9; i += 1) notes[`2026-11-0${i}`] = { text: `Day ${i}` };
  expect(recentNotes(notes, 3).map((n) => n.dayKey)).toEqual([
    "2026-11-09",
    "2026-11-08",
    "2026-11-07",
  ]);
  expect(recentNotes(null)).toEqual([]);
  expect(recentNotes("nope")).toEqual([]);
});
