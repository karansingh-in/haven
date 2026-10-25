# Haven home-screen widget (Scriptable)

A read-only home-screen widget for iPad/iPhone. It shows today's study time, the
8-hour goal bar, streak, backlog and days to NEET.

The Haven app writes a tiny summary document to Firestore; Scriptable reads it
over HTTPS. Nothing is installed on the device beyond a free App Store app.

## 1. Install Scriptable

[Scriptable](https://apps.apple.com/app/scriptable/id1405459188) — free, no
account, no subscription.

## 2. Create the script

1. Open Scriptable → **+** (top right).
2. Paste the whole of [`haven-widget.js`](./haven-widget.js).
3. Scroll to the top and set `COUPLE_ID`:

```js
const COUPLE_ID = "";
```

To find it: Firebase console → **Firestore Database** → `users` → your own
document → copy the `coupleId` field exactly.

`PROJECT_ID` and `API_KEY` are already filled in. They are the app's public web
config — the same values ship in the web bundle at
<https://karansingh-in.github.io/haven/>, so they are not a secret. The
Firestore rules are what protect the data, not the key.

4. Name the script `Haven`, then tap **▶︎** to preview it. You should see a
medium widget with real numbers.

## 3. Add it to the home screen

1. Long-press an empty spot on the home screen → **Edit** → **Add Widget**.
2. Choose **Scriptable**, pick **Medium** (or Small).
3. Long-press the new widget → **Edit Widget** → set **Script** to `Haven`.
4. Leave "When Interacting" as *Run Script* so tapping opens Haven.

## How fresh is it?

Haven writes the document a couple of seconds after any change — a finished
session, a new gold day, a new streak. But **iOS decides when the widget
reloads**; the script only asks for 15 minutes. In practice updates usually land
within 15–60 minutes, and iOS refreshes more often when it sees the app being
used. A widget that lags behind is the OS scheduler, not a bug.

## What leaves the device

Exactly six fields, and nothing else:

| Field            | Meaning                          |
| ---------------- | -------------------------------- |
| `todayMinutes`   | minutes studied since 03:00      |
| `streak`         | consecutive gold days            |
| `backlogMinutes` | minutes behind the 8h/day line   |
| `daysLeft`       | days until NEET                  |
| `goldDays`       | last 30 gold-day keys            |
| `updatedAt`      | write time, ms since epoch       |

The document lives at `widgets/{coupleId}` and is world-readable **by design** so
the widget needs no login. Writes require an authenticated Haven user:

```
match /widgets/{id} {
  allow read: if true;
  allow write: if request.auth != null;
}
```

Anyone who knew your `coupleId` could read those six numbers — no sessions, no
subjects, no scores, no personal details. If that ever matters, delete the
`widgets` document and remove the widget.

## Troubleshooting

**"Open Haven to sync."** — The widget could not read the document. Open Haven
once; it publishes within a few seconds. If it still fails, check that the
Firestore rules above are published and that `COUPLE_ID` is exact.

**"Add your couple ID to the script."** — `COUPLE_ID` is still empty.

**Numbers look frozen.** — Pull down on the home screen, or re-run the script
from Scriptable. Still stuck for hours? Open Haven, which rewrites the document.
