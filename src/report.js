// The weekly card, as plain text. Formatting only — every number is computed by
// the Insights screen, so this stays testable and dependency-free.

const MINUTES_PER_DAY = 24 * 60;

// 0 -> "0m", 45 -> "45m", 90 -> "1h 30m", 480 -> "8h".
export function formatMinutes(minutes) {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

// A goal reads as a round number: "8h", "6h30".
const formatGoal = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
};

const formatDelta = (minutes) => {
  const value = Math.round(Number(minutes) || 0);
  if (value === 0) return "backlog unchanged";
  return value > 0 ? `backlog +${formatMinutes(value)}` : `backlog −${formatMinutes(-value)}`;
};

const weekLabel = (weekStart) => {
  const date =
    weekStart instanceof Date ? weekStart : new Date(`${String(weekStart).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

export function weeklyReportText({
  weekStart,
  weekMinutes = 0,
  goalMinutes = 0,
  daysHit = 0,
  daysTotal = 7,
  streak = 0,
  backlogDelta = 0,
  syllabusPct = null,
  daysLeft = null,
} = {}) {
  const studied = Math.min(Math.round(Number(weekMinutes) || 0), daysTotal * MINUTES_PER_DAY);
  const label = weekLabel(weekStart);
  const lines = [`Haven — week of ${label}`];

  lines.push(
    [
      `${formatMinutes(studied)} studied`,
      goalMinutes ? `goal ${formatGoal(goalMinutes)}/day` : null,
      `${daysHit} of ${daysTotal} days hit`,
    ]
      .filter(Boolean)
      .join(" · "),
  );

  lines.push([streak ? `${streak}-day streak` : "no streak yet", formatDelta(backlogDelta)].join(" · "));

  const last = [
    syllabusPct === null ? null : `Syllabus ${Math.round(syllabusPct)}%`,
    daysLeft === null ? null : `${Math.round(daysLeft)} days to NEET`,
  ].filter(Boolean);
  if (last.length) lines.push(last.join(" · "));

  return lines.join("\n");
}
