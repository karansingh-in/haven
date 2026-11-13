// "You spent 41% of your hours on Biology; it is 22% of the paper." These pin
// the denominator (the syllabus weightage table) and the free-text handling.

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

import { subjectBalance, subjectExamShares, SYLLABUS } from "../src/neet";

const log = (subject, duration, date = "2026-11-12") => ({ subject, duration, date });

test("exam shares cover the four paper subjects and sum to one", () => {
  const shares = subjectExamShares();
  expect(shares.map((s) => s.subject).sort()).toEqual(["Botany", "Chemistry", "Physics", "Zoology"]);
  const total = shares.reduce((sum, s) => sum + s.examShare, 0);
  expect(total).toBeCloseTo(1, 10);
});

test("a high-yield chapter counts for more than a low-yield one", () => {
  const shares = subjectExamShares([
    { subject: "Physics", weightage: "High" },
    { subject: "Chemistry", weightage: "Low" },
  ]);
  expect(shares[0].subject).toBe("Physics");
  expect(shares[0].examShare).toBeCloseTo(0.75, 10);
});

test("time shares are measured against the logged total", () => {
  const { subjects, totalMinutes } = subjectBalance([
    log("Physics", 60),
    log("Chemistry", 180),
    log("Botany", 60),
  ]);
  expect(totalMinutes).toBe(300);
  const bySubject = Object.fromEntries(subjects.map((s) => [s.subject, s]));
  expect(bySubject.Physics.timeShare).toBeCloseTo(0.2, 10);
  expect(bySubject.Chemistry.timeShare).toBeCloseTo(0.6, 10);
  expect(bySubject.Zoology.timeShare).toBe(0);
});

test("Biology is split evenly across Botany and Zoology", () => {
  const { subjects } = subjectBalance([log("Biology", 120)]);
  const bySubject = Object.fromEntries(subjects.map((s) => [s.subject, s]));
  expect(bySubject.Botany.minutes).toBe(60);
  expect(bySubject.Zoology.minutes).toBe(60);
});

test("subject matching ignores case, spacing and punctuation", () => {
  const { subjects } = subjectBalance([log("  PHYSICS ", 60), log("Chem.", 60)]);
  const bySubject = Object.fromEntries(subjects.map((s) => [s.subject, s]));
  expect(bySubject.Physics.minutes).toBe(60);
  expect(bySubject.Chemistry.minutes).toBe(60);
});

test("time outside the syllabus is reported, not silently folded in", () => {
  const result = subjectBalance([log("Physics", 60), log("Current affairs", 60)]);
  expect(result.totalMinutes).toBe(120);
  expect(result.unmatchedMinutes).toBe(60);
  expect(result.subjects.find((s) => s.subject === "Physics").timeShare).toBeCloseTo(0.5, 10);
});

test("the range filter is inclusive on both ends", () => {
  const logs = [log("Physics", 60, "2026-11-09"), log("Physics", 60, "2026-11-16"), log("Physics", 60, "2026-11-17")];
  const result = subjectBalance(logs, { from: "2026-11-09", to: "2026-11-16" });
  expect(result.totalMinutes).toBe(120);
});

test("delta is positive when a subject gets more time than its paper share", () => {
  const { subjects } = subjectBalance([log("Physics", 300), log("Chemistry", 300)]);
  const physics = subjects.find((s) => s.subject === "Physics");
  expect(physics.delta).toBeCloseTo(0.5 - physics.examShare, 10);
});

test("empty logs give zeroed shares instead of dividing by zero", () => {
  const result = subjectBalance([]);
  expect(result.totalMinutes).toBe(0);
  for (const subject of result.subjects) {
    expect(subject.timeShare).toBe(0);
    expect(Number.isFinite(subject.delta)).toBe(true);
  }
});

test("ignores junk durations", () => {
  const result = subjectBalance([
    log("Physics", 0),
    log("Physics", -20),
    log("Physics", "abc"),
    log("Physics", null),
  ]);
  expect(result.totalMinutes).toBe(0);
});

test("the syllabus table still tags every chapter", () => {
  expect(SYLLABUS.length).toBeGreaterThan(50);
  for (const chapter of SYLLABUS) {
    expect(["High", "Medium", "Low"]).toContain(chapter.weightage);
  }
});

test("a session tagged with two subjects splits its time between them", () => {
  const { subjects, totalMinutes } = subjectBalance([log("Physics, Chemistry", 120)]);
  expect(totalMinutes).toBe(120);
  const bySubject = Object.fromEntries(subjects.map((s) => [s.subject, s]));
  expect(bySubject.Physics.minutes).toBe(60);
  expect(bySubject.Chemistry.minutes).toBe(60);
});

test("a tag that mixes a paper subject with something else keeps the total", () => {
  const result = subjectBalance([log("Physics, English", 60)]);
  expect(result.totalMinutes).toBe(60);
  expect(result.unmatchedMinutes).toBe(30);
  expect(result.subjects.find((s) => s.subject === "Physics").minutes).toBe(30);
});

test("a subject typed in a phrase still lands in the balance", () => {
  const { subjects } = subjectBalance([log("Organic chemistry", 90)]);
  const bySubject = Object.fromEntries(subjects.map((s) => [s.subject, s]));
  expect(bySubject.Chemistry.minutes).toBe(90);
});
