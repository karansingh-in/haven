import AsyncStorage from "@react-native-async-storage/async-storage";

export const DAILY_GOAL_MINUTES = 480; // 8 hours
export const STREAK_MIN_MINUTES = 60;
export const ROLLOVER_HOUR = 3; // the logical day starts at 3am

// Local-time key "YYYY-MM-DD". Before the rollover hour the key is still
// yesterday's date, so a 2am session counts toward the night before.
// Calendar arithmetic (setDate), not ms subtraction, so DST is handled.
export function dayKeyFor(date = new Date(), rolloverHour = ROLLOVER_HOUR) {
  const d = new Date(date);
  if (d.getHours() < rolloverHour) d.setDate(d.getDate() - 1);
  const p = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Stepping a day on the key alone: no time-of-day component exists, so a DST
// spring-forward day cannot normalise the cursor onto the day it came from.
export function previousDayKey(key) {
  const [year, month, day] = String(key).split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() - 1);
  const p = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export const backlogKeyFor = (coupleId) => `haven-backlog-${coupleId}`;
export const achievedKeyFor = (coupleId) => `haven-achieved-${coupleId}`;
export const prefsKey = "haven-prefs-v1";

// Chronological running backlog across ALL logged days, floor at 0.
// balance = max(0, balance + (GOAL - dayMinutes))
export function computeBacklog(studyLogs = [], goalMinutes = DAILY_GOAL_MINUTES, rolloverHour = ROLLOVER_HOUR, now = new Date()) {
  const byDay = {};
  (Array.isArray(studyLogs) ? studyLogs : []).forEach((log) => {
    if (!log?.date) return;
    byDay[log.date] = (byDay[log.date] || 0) + (Number(log.duration) || 0);
  });
  const days = Object.keys(byDay).sort();
  let balance = 0;
  const perDay = days.map((date) => {
    const minutes = byDay[date];
    balance = Math.max(0, balance + (goalMinutes - minutes));
    return { date, minutes, balanceAfter: balance };
  });
  const todayKey = dayKeyFor(now, rolloverHour);
  const todayMinutes = byDay[todayKey] || 0;
  return { balanceMinutes: balance, perDay, todayMinutes, todayKey, byDay };
}

export function formatBacklog(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (total === 0) return "All clear";
  if (!h) return `${m}m backlog`;
  if (!m) return `${h}h backlog`;
  return `${h}h ${m}m backlog`;
}

export function formatHoursShort(minutes) {
  const hours = Math.max(0, Number(minutes) || 0) / 60;
  if (hours === 0) return "0";
  return hours % 1 === 0 ? String(hours) : hours.toFixed(1);
}

// Streak: consecutive days ending today (or yesterday if today empty) with >= streakMin minutes.
export function computeStreak(studyLogs = [], streakMin = STREAK_MIN_MINUTES, rolloverHour = ROLLOVER_HOUR, now = new Date()) {
  const byDay = {};
  (Array.isArray(studyLogs) ? studyLogs : []).forEach((log) => {
    if (!log?.date) return;
    byDay[log.date] = (byDay[log.date] || 0) + (Number(log.duration) || 0);
  });
  let key = dayKeyFor(now, rolloverHour);
  // If the logical today has nothing yet, streak may still be alive via yesterday.
  if ((byDay[key] || 0) < streakMin) key = previousDayKey(key);
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    if ((byDay[key] || 0) >= streakMin) {
      streak += 1;
      key = previousDayKey(key);
    } else break;
  }
  return streak;
}

export function gradeFor(pct) {
  if (pct >= 85) return { label: "Excellent", color: "#57B894" };
  if (pct >= 70) return { label: "Good", color: "#D9A441" };
  return { label: "Needs work", color: "#E0483F" };
}

export const DEFAULT_PREFS = {
  displayName: "Chaaru",
  affirmation: "Don't waste your potential, I know you can do it!",
  accent: "blue",
  lockEnabled: false,
  lockDelaySec: 0,
  windDownEnabled: true,
  windDownHour: 2,
  windDownMinute: 0,
  weeklyReportEnabled: true,
  weeklyWeekday: 1, // Sunday (0=Sun per JS? we store expo weekday 1=Sunday)
  weeklyHour: 20,
  weeklyMinute: 0,
};

export async function loadPrefs() {
  try {
    const raw = await AsyncStorage.getItem(prefsKey);
    if (!raw) return { ...DEFAULT_PREFS };
    const stored = JSON.parse(raw);
    // migrate old accent keys to the iOS system palette
    const LEGACY_ACCENTS = { champagne: "blue", rose: "blue", mint: "green", sapphire: "indigo" };
    if (LEGACY_ACCENTS[stored.accent]) stored.accent = LEGACY_ACCENTS[stored.accent];
    return { ...DEFAULT_PREFS, ...stored };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function savePrefs(next) {
  try {
    await AsyncStorage.setItem(prefsKey, JSON.stringify(next));
  } catch {}
}
