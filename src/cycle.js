// Cycle predictions for the calendar. Pure maths over the period entries the
// app already stores, so nothing here needs a network, a clock, or a React
// render — `cycleSummary` is given `todayKey` and answers for that day.

import { addDaysToKey, getDaysBetween, parseDateKey } from "./dates";

export const DEFAULT_PERIOD_DAYS = 5;
// The five days before the next expected start.
export const PMS_DAYS = 5;
// A spread wider than this and a single predicted date is a lie; show a range.
export const IRREGULAR_SPREAD_DAYS = 9;

const cleanPeriods = (periods) =>
  (Array.isArray(periods) ? periods : [])
    .filter(
      (period) =>
        period &&
        typeof period.startDate === "string" &&
        parseDateKey(period.startDate) !== null,
    )
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

const periodLength = (period) => {
  if (!period?.endDate || parseDateKey(period.endDate) === null) {
    return DEFAULT_PERIOD_DAYS;
  }
  const length = getDaysBetween(parseDateKey(period.startDate), parseDateKey(period.endDate)) + 1;
  return length > 0 && length <= 15 ? length : DEFAULT_PERIOD_DAYS;
};

const lengthsBetween = (starts) => {
  const lengths = [];
  for (let i = 1; i < starts.length; i += 1) {
    const gap = getDaysBetween(parseDateKey(starts[i - 1]), parseDateKey(starts[i]));
    if (gap > 0 && gap < 100) lengths.push(gap);
  }
  return lengths;
};

const phaseFor = (cycleDay, average, periodDays) => {
  if (periodDays && cycleDay <= periodDays) return "menstrual";
  if (!average) return "unknown";
  const pmsStart = average - PMS_DAYS + 1;
  if (cycleDay > average) return "late";
  if (cycleDay >= pmsStart) return "pms";
  const ovulation = Math.max(periodDays + 1, average - 14);
  if (Math.abs(cycleDay - ovulation) <= 1) return "ovulation";
  return cycleDay < ovulation ? "follicular" : "luteal";
};

export function cycleSummary(periods, todayKey) {
  const clean = cleanPeriods(periods);
  const starts = clean.map((period) => period.startDate);
  const last = clean[clean.length - 1] || null;
  const lengths = lengthsBetween(starts);
  const average = lengths.length
    ? Math.round(lengths.reduce((sum, value) => sum + value, 0) / lengths.length)
    : null;
  const shortest = lengths.length ? Math.min(...lengths) : null;
  const longest = lengths.length ? Math.max(...lengths) : null;
  const spread = lengths.length ? longest - shortest : null;
  const periodDays = last ? periodLength(last) : null;

  const empty = {
    status: "none",
    entries: 0,
    average: null,
    shortest: null,
    longest: null,
    spread: null,
    confidence: "none",
    lastStart: null,
    periodDays: null,
    cycleDay: null,
    phase: null,
    nextStart: null,
    predictedStart: null,
    predictedEnd: null,
    daysUntil: null,
    lateDays: 0,
    pmsStart: null,
    pmsEnd: null,
  };
  if (!last) return empty;
  if (!todayKey || parseDateKey(todayKey) === null) {
    return { ...empty, entries: clean.length, lastStart: last.startDate };
  }

  const rawDay = getDaysBetween(parseDateKey(last.startDate), parseDateKey(todayKey)) + 1;
  const cycleDay = rawDay >= 1 ? rawDay : null;
  const nextStart = average ? addDaysToKey(last.startDate, average) : null;
  const daysUntil = nextStart ? getDaysBetween(parseDateKey(todayKey), parseDateKey(nextStart)) : null;
  const confidence = !lengths.length ? "learning" : spread > IRREGULAR_SPREAD_DAYS ? "low" : "high";

  return {
    ...empty,
    status: lengths.length ? "steady" : "learning",
    entries: clean.length,
    average,
    shortest,
    longest,
    spread,
    confidence,
    lastStart: last.startDate,
    periodDays,
    cycleDay,
    phase: cycleDay ? phaseFor(cycleDay, average, periodDays) : null,
    nextStart,
    predictedStart: average && confidence === "low" ? addDaysToKey(last.startDate, shortest) : nextStart,
    predictedEnd: average && confidence === "low" ? addDaysToKey(last.startDate, longest) : nextStart,
    daysUntil,
    lateDays: daysUntil !== null && daysUntil < 0 ? Math.abs(daysUntil) : 0,
    pmsStart: nextStart ? addDaysToKey(nextStart, -PMS_DAYS) : null,
    pmsEnd: nextStart ? addDaysToKey(nextStart, -1) : null,
  };
}

// Days 2 and 3 of each logged period. Only logged starts count: a predicted
// period should never quietly move the goal before it has actually begun.
export function easedDayKeys(periods) {
  const keys = new Set();
  cleanPeriods(periods).forEach((period) => {
    keys.add(addDaysToKey(period.startDate, 1));
    keys.add(addDaysToKey(period.startDate, 2));
  });
  return keys;
}

// 8h -> 6h30, 13h -> 9h, linear in between (390 + (hours - 8) * 30 minutes).
export function softenedGoalMinutes(goalMinutes) {
  const raw = Number(goalMinutes);
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  const eased = 6.5 + (raw / 60 - 8) * 0.5;
  return Math.max(0, Math.round((eased * 60) / 30) * 30);
}
