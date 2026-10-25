// Firestore's `widgets/{coupleId}` document is world-readable so the Scriptable
// widget can fetch it without credentials. This module is that document's
// allow-list: six fields, numbers clamped and rounded, and at most the last
// thirty gold-day keys. Nothing else may reach the network.

const GOLD_DAY_CAP = 30;

// Round to a whole count and clamp junk (NaN, Infinity, negatives, strings)
// to 0 so a bad render can never publish a nonsense number.
const count = (value) => {
  const rounded = Math.round(Number(value));
  return Number.isFinite(rounded) && rounded > 0 ? rounded : 0;
};

const goldDayKeys = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((key) => typeof key === 'string')
    .map((key) => key.trim())
    .filter(Boolean)
    .slice(-GOLD_DAY_CAP);
};

export function buildWidgetPayload(
  { todayMinutes, streak, balanceMinutes, daysLeft, goldDays } = {},
  now = Date.now(),
) {
  return {
    todayMinutes: count(todayMinutes),
    streak: count(streak),
    backlogMinutes: count(balanceMinutes),
    daysLeft: count(daysLeft),
    goldDays: goldDayKeys(goldDays),
    updatedAt: count(now),
  };
}
