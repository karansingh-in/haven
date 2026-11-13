// The subject string is free text. This module is the one place that decides
// what it means, so both the chips and the balance card read from it.

import {
  PAPER_SUBJECTS,
  attributeMinutes,
  formatSubjects,
  parseSubjects,
  splitTokens,
  toggleSubject,
} from "../src/subjects";

test("the four paper subjects are the only chips", () => {
  expect(PAPER_SUBJECTS).toEqual(["Physics", "Chemistry", "Botany", "Zoology"]);
});

test("a comma separated string names every subject in it", () => {
  expect(parseSubjects("Physics, Chemistry")).toEqual(["Physics", "Chemistry"]);
  expect(parseSubjects("  physics ,  CHEMISTRY  ")).toEqual(["Physics", "Chemistry"]);
});

test("a subject named inside a longer phrase still counts", () => {
  expect(parseSubjects("Organic chemistry")).toEqual(["Chemistry"]);
});

test("a word that merely contains a subject does not count", () => {
  expect(parseSubjects("physicswallah")).toEqual([]);
});

test("Biology is the two biology subjects", () => {
  expect(parseSubjects("Biology")).toEqual(["Botany", "Zoology"]);
  expect(parseSubjects("bio")).toEqual(["Botany", "Zoology"]);
});

test("the same subject twice is one subject", () => {
  expect(parseSubjects("Physics, Physics")).toEqual(["Physics"]);
});

test("tokens split on commas and nothing else", () => {
  expect(splitTokens("Physics, , Chemistry,")).toEqual(["Physics", "Chemistry"]);
  expect(splitTokens("")).toEqual([]);
});

test("subjects format back into a comma separated string", () => {
  expect(formatSubjects(["Physics", "Zoology"])).toBe("Physics, Zoology");
  expect(formatSubjects([])).toBe("");
});

test("a chip adds its subject to the text", () => {
  expect(toggleSubject("", "Physics")).toBe("Physics");
  expect(toggleSubject("Physics", "Chemistry")).toBe("Physics, Chemistry");
});

test("a chip removes its subject when tapped again", () => {
  expect(toggleSubject("Physics, Chemistry", "Physics")).toBe("Chemistry");
  expect(toggleSubject("Physics", "Physics")).toBe("");
});

test("removing one half of Biology leaves the other half", () => {
  expect(toggleSubject("Biology", "Botany")).toBe("Zoology");
});

test("removing a subject from a phrase drops the whole phrase", () => {
  expect(toggleSubject("Organic chemistry", "Chemistry")).toBe("");
});

test("free text is left alone when an unrelated chip is tapped", () => {
  expect(toggleSubject("Current affairs", "Physics")).toBe("Current affairs, Physics");
});

test("minutes split evenly between the parts of a tag", () => {
  const { bySubject, unmatched } = attributeMinutes("Physics, Chemistry", 120);
  expect(bySubject.Physics).toBeCloseTo(60, 10);
  expect(bySubject.Chemistry).toBeCloseTo(60, 10);
  expect(unmatched).toBe(0);
});

test("a part that names two subjects splits its own share", () => {
  const { bySubject } = attributeMinutes("Physics, Biology", 90);
  expect(bySubject.Physics).toBeCloseTo(45, 10);
  expect(bySubject.Botany).toBeCloseTo(22.5, 10);
  expect(bySubject.Zoology).toBeCloseTo(22.5, 10);
});

test("a subject named twice is counted once", () => {
  const { bySubject } = attributeMinutes("Physics, Physics", 60);
  expect(bySubject.Physics).toBeCloseTo(60, 10);
});

test("an unknown part is unmatched, and the total still adds up", () => {
  const { bySubject, unmatched } = attributeMinutes("Physics, English", 60);
  expect(bySubject.Physics).toBeCloseTo(30, 10);
  expect(unmatched).toBeCloseTo(30, 10);
});

test("an empty subject is unmatched, not a crash", () => {
  const { bySubject, unmatched } = attributeMinutes("", 45);
  expect(bySubject).toEqual({});
  expect(unmatched).toBe(45);
});

test("junk durations attribute nothing", () => {
  expect(attributeMinutes("Physics", 0).unmatched).toBe(0);
  expect(attributeMinutes("Physics", "abc").unmatched).toBe(0);
});
