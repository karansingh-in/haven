// The report card is copied into a chat, so the exact wording is the contract.

import { formatMinutes, weeklyReportText } from "../src/report";

test("formats minutes the way the app does", () => {
  expect(formatMinutes(0)).toBe("0m");
  expect(formatMinutes(45)).toBe("45m");
  expect(formatMinutes(60)).toBe("1h");
  expect(formatMinutes(90)).toBe("1h 30m");
  expect(formatMinutes(480)).toBe("8h");
  expect(formatMinutes(-30)).toBe("0m");
  expect(formatMinutes("nope")).toBe("0m");
});

test("writes a full week", () => {
  const text = weeklyReportText({
    weekStart: "2026-11-09",
    weekMinutes: 2300,
    goalMinutes: 480,
    daysHit: 4,
    streak: 3,
    backlogDelta: -45,
    syllabusPct: 62,
    daysLeft: 168,
  });
  expect(text).toBe(
    [
      "Haven — week of 9 Nov",
      "38h 20m studied · goal 8h/day · 4 of 7 days hit",
      "3-day streak · backlog −45m",
      "Syllabus 62% · 168 days to NEET",
    ].join("\n"),
  );
});

test("a positive backlog change reads with a plus", () => {
  const text = weeklyReportText({ weekStart: "2026-11-09", weekMinutes: 60, backlogDelta: 80 });
  expect(text).toContain("backlog +1h 20m");
});

test("an unchanged backlog says so instead of showing 0m", () => {
  expect(weeklyReportText({ weekStart: "2026-11-09", backlogDelta: 0 })).toContain(
    "backlog unchanged",
  );
});

test("omits the syllabus line when it is unknown", () => {
  const text = weeklyReportText({ weekStart: "2026-11-09", weekMinutes: 120 });
  expect(text).not.toContain("Syllabus");
  expect(text.split("\n")).toHaveLength(3);
});

test("a goal with minutes keeps its precision", () => {
  expect(weeklyReportText({ weekStart: "2026-11-09", goalMinutes: 390 })).toContain("goal 6h30/day");
});

test("a streak of zero is described, not printed as 0-day", () => {
  expect(weeklyReportText({ weekStart: "2026-11-09", streak: 0 })).toContain("no streak yet");
});

test("survives an empty call", () => {
  expect(weeklyReportText()).toContain("0m studied");
});
