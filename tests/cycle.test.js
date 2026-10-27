import { cycleSummary, easedDayKeys, softenedGoalMinutes } from "../src/cycle";

const period = (startDate, endDate = null) => ({ startDate, endDate });

// 28-day cycle, three periods, period length 5.
const steady = [period("2026-08-01", "2026-08-05"), period("2026-08-29", "2026-09-02"), period("2026-09-26", "2026-09-30")];

describe("cycleSummary with no data", () => {
  test("reports nothing rather than guessing", () => {
    const summary = cycleSummary([], "2026-10-01");
    expect(summary.status).toBe("none");
    expect(summary.phase).toBe(null);
    expect(summary.nextStart).toBe(null);
    expect(summary.cycleDay).toBe(null);
  });

  test("ignores junk entries", () => {
    const summary = cycleSummary([null, {}, { startDate: "not-a-date" }, period("2026-09-26")], "2026-10-01");
    expect(summary.entries).toBe(1);
  });
});

describe("one period", () => {
  test("is learning and refuses to predict", () => {
    const summary = cycleSummary([period("2026-09-26")], "2026-10-01");
    expect(summary.status).toBe("learning");
    expect(summary.confidence).toBe("learning");
    expect(summary.average).toBe(null);
    expect(summary.nextStart).toBe(null);
    expect(summary.daysUntil).toBe(null);
    expect(summary.cycleDay).toBe(6);
  });

  test("still names the bleed days", () => {
    expect(cycleSummary([period("2026-09-26")], "2026-09-27").phase).toBe("menstrual");
    expect(cycleSummary([period("2026-09-26")], "2026-10-05").phase).toBe("unknown");
  });
});

describe("a steady 28-day cycle", () => {
  const summary = (today) => cycleSummary(steady, today);

  test("averages the two gaps", () => {
    const s = summary("2026-10-01");
    expect(s.average).toBe(28);
    expect(s.shortest).toBe(28);
    expect(s.confidence).toBe("high");
  });

  test("predicts the next start", () => {
    const s = summary("2026-10-01");
    expect(s.nextStart).toBe("2026-10-24");
    expect(s.daysUntil).toBe(23);
  });

  test("walks the phases", () => {
    expect(summary("2026-09-27").phase).toBe("menstrual"); // day 2
    expect(summary("2026-09-30").phase).toBe("menstrual"); // day 5
    expect(summary("2026-10-05").phase).toBe("follicular"); // day 10
    expect(summary("2026-10-10").phase).toBe("ovulation"); // day 15
    expect(summary("2026-10-15").phase).toBe("luteal"); // day 20
    expect(summary("2026-10-21").phase).toBe("pms"); // day 26
  });

  test("marks the five days before the next start as PMS", () => {
    const s = summary("2026-10-01");
    expect(s.pmsStart).toBe("2026-10-19");
    expect(s.pmsEnd).toBe("2026-10-23");
  });

  test("says late instead of showing a stale date", () => {
    const s = summary("2026-10-29");
    expect(s.phase).toBe("late");
    expect(s.lateDays).toBe(5);
    expect(s.daysUntil).toBe(-5);
  });

  test("no cycle day before the last period", () => {
    expect(summary("2026-09-01").cycleDay).toBe(null);
  });
});

describe("irregular cycles", () => {
  test("gives a range instead of a single date", () => {
    const irregular = [period("2026-06-01"), period("2026-06-25"), period("2026-07-30")];
    const s = cycleSummary(irregular, "2026-08-05");
    expect(s.spread).toBe(11);
    expect(s.confidence).toBe("low");
    expect(s.predictedStart).toBe("2026-08-23"); // +24
    expect(s.predictedEnd).toBe("2026-09-03"); // +35
  });
});

describe("easedDayKeys", () => {
  test("returns the second and third day of each period", () => {
    const keys = easedDayKeys([period("2026-09-26")]);
    expect([...keys].sort()).toEqual(["2026-09-27", "2026-09-28"]);
  });

  test("never eases the first day", () => {
    expect(easedDayKeys([period("2026-09-26")]).has("2026-09-26")).toBe(false);
  });

  test("handles a month boundary", () => {
    expect([...easedDayKeys([period("2026-09-30")])].sort()).toEqual([
      "2026-10-01",
      "2026-10-02",
    ]);
  });
});

describe("softenedGoalMinutes", () => {
  test("maps the two anchors the user picked", () => {
    expect(softenedGoalMinutes(480)).toBe(390); // 8h -> 6h30
    expect(softenedGoalMinutes(780)).toBe(540); // 13h -> 9h
  });

  test("interpolates in between", () => {
    expect(softenedGoalMinutes(540)).toBe(420); // 9h -> 7h
    expect(softenedGoalMinutes(720)).toBe(510); // 12h -> 8h30
  });

  test("treats junk as no goal", () => {
    expect(softenedGoalMinutes(null)).toBe(0);
    expect(softenedGoalMinutes("abc")).toBe(0);
  });
});
