jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));

import {
  computeBacklog,
  goalForDay,
  goalReached,
  paceStatus,
  withGoalForDay,
} from "../backlog";

const log = (date, duration) => ({ date, duration });

describe("goalForDay", () => {
  const history = [
    { from: "2026-10-20", minutes: 780 },
    { from: "2026-10-01", minutes: 600 },
  ];

  test("falls back to 8h before any recorded change", () => {
    expect(goalForDay("2026-09-01", history)).toBe(480);
    expect(goalForDay("2026-09-01", [])).toBe(480);
  });

  test("uses the entry in force on that day", () => {
    expect(goalForDay("2026-10-05", history)).toBe(600);
    expect(goalForDay("2026-10-20", history)).toBe(780);
    expect(goalForDay("2026-11-30", history)).toBe(780);
  });

  test("ignores junk entries", () => {
    const messy = [{ from: 5 }, { minutes: 600 }, { from: "2026-10-02", minutes: "abc" }, { from: "2026-10-03", minutes: 720 }];
    expect(goalForDay("2026-10-10", messy)).toBe(720);
  });
});

describe("withGoalForDay", () => {
  test("replaces today's entry instead of stacking", () => {
    let history = withGoalForDay([], "2026-10-27", 600);
    history = withGoalForDay(history, "2026-10-27", 660);
    expect(history).toEqual([{ from: "2026-10-27", minutes: 660 }]);
  });

  test("keeps earlier changes", () => {
    const history = withGoalForDay([{ from: "2026-10-01", minutes: 600 }], "2026-10-27", 780);
    expect(history.map((entry) => entry.from)).toEqual(["2026-10-01", "2026-10-27"]);
  });
});

describe("computeBacklog with a per-day goal", () => {
  const history = [{ from: "2026-10-20", minutes: 780 }];
  const goalFor = (dayKey) => goalForDay(dayKey, history);
  const logs = [log("2026-10-19", 480), log("2026-10-20", 480)];
  const now = new Date(2026, 9, 20, 23, 0);

  test("raising the goal does not retroactively create debt", () => {
    const backlog = computeBacklog(logs, goalFor, 3, now);
    expect(backlog.perDay[0].balanceAfter).toBe(0);
    expect(backlog.balanceMinutes).toBe(300);
  });

  test("a plain number still means one flat goal", () => {
    const backlog = computeBacklog(logs, 480, 3, now);
    expect(backlog.balanceMinutes).toBe(0);
  });
});

describe("goalReached with a custom goal", () => {
  test("fires only on the crossing", () => {
    expect(goalReached(770, 780, 780)).toBe(true);
    expect(goalReached(780, 800, 780)).toBe(false);
    expect(goalReached(500, 660, 780)).toBe(false);
  });
});

describe("paceStatus with a 13h goal", () => {
  test("scales the target to the goal", () => {
    const status = paceStatus(0, new Date(2026, 9, 24, 15, 0), 780);
    expect(status.target).toBe(390);
  });
});
