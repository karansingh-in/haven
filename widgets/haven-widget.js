// Haven — home-screen widget for Scriptable (iOS/iPadOS, free on the App Store).
//
// Reads the world-readable `widgets/{COUPLE_ID}` document that the Haven app
// writes, so the widget needs no login. Setup lives in widgets/README.md.
//
// Fill these three in:
const PROJECT_ID = "haven-3cf56";
const API_KEY = "AIzaSyBbuYKVg4uzaBs-DdVUmMgMKa9IjrwQUh0";
const COUPLE_ID = ""; // Firestore -> users -> your doc -> coupleId

const APP_URL = "https://karansingh-in.github.io/haven/";
const DEFAULT_GOAL = 480; // 8 hours, until the app publishes the real goal

// 480 -> "8h", 390 -> "6h30", 780 -> "13h".
const formatGoal = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours}h${String(rest).padStart(2, "0")}` : `${hours}h`;
};

const BG = new Color("#0B1220");
const WHITE = new Color("#FFFFFF");
const DIM = new Color("#8FA3BF");
const FAINT = new Color("#5C6E85");
const TRACK = new Color("#1C2839");
const GOLD = new Color("#F2C14E");
const BLUE = [10, 132, 255];
const MINT = [90, 200, 168];

// --------------------------------------------------
// FORMATTING
// --------------------------------------------------

const formatHM = (total) => {
  const minutes = Math.max(0, Math.round(total || 0));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
};

const formatBacklog = (minutes) => {
  const value = Math.max(0, Math.round(minutes || 0));
  return value === 0 ? "clear" : formatHM(value);
};

const timeAgo = (ms) => {
  if (!ms) return "not synced yet";
  const minutes = Math.floor(Math.max(0, Date.now() - ms) / 60000);
  if (minutes < 1) return "updated just now";
  if (minutes < 60) return `updated ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `updated ${hours}h ago`;
  return `updated ${Math.floor(hours / 24)}d ago`;
};

const toHex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

const blend = (from, to, t) =>
  toHex(from.map((value, i) => Math.round(value + (to[i] - value) * t)));

// --------------------------------------------------
// DATA
// --------------------------------------------------

const toNumber = (field) => {
  if (!field) return 0;
  const raw = field.integerValue ?? field.doubleValue ?? 0;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
};

async function loadSummary() {
  const url =
    `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}` +
    `/databases/(default)/documents/widgets/${encodeURIComponent(COUPLE_ID)}` +
    `?key=${encodeURIComponent(API_KEY)}`;

  const request = new Request(url);
  request.timeoutInterval = 10;
  const body = await request.loadJSON();

  if (request.response.statusCode !== 200) {
    throw new Error(`HTTP ${request.response.statusCode}`);
  }

  const fields = body.fields || {};
  const goldValues = fields.goldDays?.arrayValue?.values || [];

  return {
    todayMinutes: toNumber(fields.todayMinutes),
    streak: toNumber(fields.streak),
    backlogMinutes: toNumber(fields.backlogMinutes),
    daysLeft: toNumber(fields.daysLeft),
    goldDays: goldValues.map((value) => value.stringValue).filter(Boolean),
    updatedAt: toNumber(fields.updatedAt),
  };
}

// --------------------------------------------------
// DRAWING
// --------------------------------------------------

// Scriptable has no gradient support inside widgets, so the bar is painted as
// one-point columns that step from blue to mint across the filled span.
function drawBar(progress, width, height = 5) {
  const context = new DrawContext();
  context.size = new Size(width, height);
  context.opaque = false;
  context.respectScreenScale = true;

  const track = new Path();
  track.addRoundedRect(new Rect(0, 0, width, height), height / 2, height / 2);
  context.addPath(track);
  context.setFillColor(TRACK);
  context.fillPath();

  const ratio = Math.min(1, Math.max(0, progress));
  const filled = Math.round(width * ratio);
  for (let x = 0; x < filled; x += 1) {
    context.setFillColor(new Color(blend(BLUE, MINT, filled <= 1 ? 1 : x / (filled - 1))));
    context.fillRect(new Rect(x, 0, 1, height));
  }

  return context.getImage();
}

// --------------------------------------------------
// WIDGET
// --------------------------------------------------

function baseWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = BG;
  widget.setPadding(16, 18, 14, 18);
  widget.url = APP_URL;
  // iOS decides the real refresh time; asking for 15 minutes is a floor, not a
  // promise. The app writes on every change, so the data is never stale on our
  // side.
  widget.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);
  return widget;
}

function failureWidget(message) {
  const widget = baseWidget();
  widget.addSpacer();
  const title = widget.addText("Haven");
  title.font = Font.boldRoundedSystemFont(20);
  title.textColor = WHITE;
  const body = widget.addText(message);
  body.font = Font.mediumRoundedSystemFont(12);
  body.textColor = DIM;
  body.limitLines(2);
  widget.addSpacer();
  const hint = widget.addText("Tap to open");
  hint.font = Font.mediumRoundedSystemFont(10);
  hint.textColor = FAINT;
  return widget;
}

function statRow(parent, label, value, color) {
  const row = parent.addStack();
  row.layoutHorizontally();
  const name = row.addText(label);
  name.font = Font.mediumRoundedSystemFont(10);
  name.textColor = DIM;
  row.addSpacer(null);
  const amount = row.addText(value);
  amount.font = Font.semiboldRoundedSystemFont(12);
  amount.textColor = color || WHITE;
  return row;
}

function buildWidget(summary, family) {
  const widget = baseWidget();
  const medium = family === "systemMedium";

  const header = widget.addStack();
  header.layoutHorizontally();
  const today = header.addText("TODAY");
  today.font = Font.boldRoundedSystemFont(10);
  today.textColor = DIM;
  header.addSpacer(null);
  const wordmark = header.addText("Haven");
  wordmark.font = Font.semiboldRoundedSystemFont(10);
  wordmark.textColor = FAINT;

  const body = widget.addStack();
  body.layoutHorizontally();
  body.spacing = 12;
  body.topAlignContent();

  const left = body.addStack();
  left.layoutVertically();
  left.spacing = 2;

  const big = left.addText(formatHM(summary.todayMinutes));
  big.font = Font.boldRoundedSystemFont(medium ? 34 : 30);
  big.textColor = WHITE;
  big.minimumScaleFactor = 0.6;
  big.lineLimit = 1;

  const goalMinutes = summary.goalMinutes > 0 ? summary.goalMinutes : DEFAULT_GOAL;
  const remaining = goalMinutes - summary.todayMinutes;
  const goalText =
    remaining > 0
      ? `${formatGoal(goalMinutes)} goal · ${formatHM(remaining)} to go`
      : `${formatGoal(goalMinutes)} goal · met`;
  const goal = left.addText(goalText);
  goal.font = Font.mediumRoundedSystemFont(11);
  goal.textColor = remaining > 0 ? DIM : new Color("#5AC8A8");

  // Flexible spacer pushes the bar to the bottom of the column, level with the
  // footer, on both sizes.
  left.addSpacer(null);

  const barWidth = medium ? 186 : 104;
  const bar = left.addImage(
    drawBar(summary.todayMinutes / goalMinutes, barWidth),
  );
  bar.imageSize = new Size(barWidth, 5);

  if (medium) {
    // A fixed width keeps the values in a clean right-aligned column.
    const right = body.addStack();
    right.layoutVertically();
    right.spacing = 7;
    right.size = new Size(104, 0);
    statRow(right, "Streak", `${summary.streak}d`, GOLD);
    statRow(right, "Backlog", formatBacklog(summary.backlogMinutes), WHITE);
    statRow(right, "NEET", `${summary.daysLeft}d`, WHITE);
  }

  widget.addSpacer(null);

  const footer = widget.addStack();
  footer.layoutHorizontally();
  const stamp = footer.addText(timeAgo(summary.updatedAt));
  stamp.font = Font.regularRoundedSystemFont(9);
  stamp.textColor = FAINT;

  return widget;
}

// --------------------------------------------------
// ENTRY POINT
// --------------------------------------------------

async function main() {
  const family = config.widgetFamily || "systemMedium";

  if (!COUPLE_ID) {
    return failureWidget("Add your couple ID to the script.");
  }

  let summary;
  try {
    summary = await loadSummary();
  } catch {
    // Never show an error code on the home screen — the fix is always in the
    // app, so the widget only points there.
    return failureWidget("Open Haven to sync.");
  }

  return buildWidget(summary, family);
}

const widget = await main();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  await widget.presentMedium();
}

Script.complete();
