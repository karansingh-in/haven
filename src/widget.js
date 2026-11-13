// The `widgets/{coupleId}` document is world-readable so a widget can read it
// without credentials. This module is that document's allow-list: numbers
// clamped and rounded, at most the last thirty gold-day keys, a 14-dot strip,
// and the accent colour. Nothing else may reach the network.

const GOLD_DAY_CAP = 30;
const DOT_DAYS = 14;
const DEFAULT_ACCENT = "#0A84FF";

// Round to a whole count and clamp junk (NaN, Infinity, negatives, strings)
// to 0 so a bad render can never publish a nonsense number.
const count = (value) => {
  const rounded = Math.round(Number(value));
  return Number.isFinite(rounded) && rounded > 0 ? rounded : 0;
};

const goldDayKeys = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((key) => typeof key === "string")
    .map((key) => key.trim())
    .filter(Boolean)
    .slice(-GOLD_DAY_CAP);
};

// An allow-list on the colour too: a malformed value must not reach a widget.
const accentHex = (value) =>
  typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim())
    ? value.trim().toUpperCase()
    : DEFAULT_ACCENT;

const localDayKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

// Oldest first, so the strip reads left to right like a calendar. Filled means
// the day reached its goal. The Android widget renders this verbatim, which
// keeps date maths out of Kotlin.
export function goldDayDots(goldDays, now = Date.now(), days = DOT_DAYS) {
  const gold = new Set(goldDayKeys(goldDays));
  const anchor = new Date(Number(now) || Date.now());
  const marks = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const day = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - offset);
    marks.push(gold.has(localDayKey(day)) ? "●" : "○");
  }
  return marks.join("");
}

export function buildWidgetPayload(
  { todayMinutes, goalMinutes, streak, balanceMinutes, daysLeft, goldDays, accent } = {},
  now = Date.now(),
) {
  const days = goldDayKeys(goldDays);
  return {
    todayMinutes: count(todayMinutes),
    goalMinutes: count(goalMinutes),
    streak: count(streak),
    backlogMinutes: count(balanceMinutes),
    daysLeft: count(daysLeft),
    goldDays: days,
    dots: goldDayDots(days, now),
    accent: accentHex(accent),
    updatedAt: count(now),
  };
}
