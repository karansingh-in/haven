# Haven

A private, single-user study app for NEET UG — one person, one iPad, no accounts to manage beyond your own.

**Live:** https://karansingh-in.github.io/haven/ — open in Safari, then Share → Add to Home Screen.

## What it does

- **8-hour focus goal** that resets at 03:00 local time, so a 1am session still counts for the day you are living.
- **Wall-clock timer** that survives backgrounding and app restarts, study logs, backlog and streaks.
- **Gold days** — the full-screen moment when the eight hours land, recorded so you can see the chain later.
- **Calendar** with cycle tracking, and **Insights** for weekly and monthly totals.
- **NEET tab** — countdown, syllabus coverage with chapter weightage, and a mock-score predictor.
- **Where your hours go** — each subject's share of the week next to its share of the paper, and the worst mismatch named.
- **Offline outbox** — a session logged without a connection is queued locally, counted immediately, and replayed when the network returns.
- **Break nudges** at 50 and 90 minutes of a running timer, and a wind-down notification that says so when the day is still at zero.
- **A question when a day falls short** — log a session after 9pm while under the goal and the app asks what got in the way, once. The answers collect in Insights, on this device only.
- **Home-screen widget** on Android, fed by a JSON summary the app writes to its own storage — no network, no permissions.

Single user by design: data lives in your own Firestore project, and nothing is shared with anyone.

## Running it

```bash
npm install
npm run web        # browser, at http://localhost:8081
npm run android    # native Android build
npm run apk        # sideloadable arm64 release APK
npx jest           # 197 tests
npm run lint
```

## Fonts

The app ships one face: **Inter**, in four weights. They are subset to the glyphs the UI actually draws, which takes them from 1.37 MB to 170 KB:

```bash
npm run fonts      # scripts/subset-fonts.py -> assets/fonts/*.ttf
```

The outputs are committed, so a clean clone builds without Python. Add any new character to `UNICODE` in the script before using it in a string — anything outside that set falls back to the system font.

## Widget

`modules/haven-widget/` is a local Expo module (autolinked from `modules/` via `expo.autolinking.nativeModulesDir`). The app writes a nine-field JSON summary to its own `filesDir`; an `AppWidgetProvider` renders it. Long-press the home screen → Widgets → Haven. It lives outside `android/` so `expo prebuild` cannot wipe it.

## Icons

The Focus Ring icon is generated, not hand-drawn one size at a time:

```bash
npm run icons      # assets/icons/*.svg -> assets/images/*, assets/icon.png, public/*
```

Everything Expo, Android and the PWA consume comes out of that one command. `scripts/build-icons.mjs` asserts every output's dimensions and which files may keep alpha.

## Deploying

Pushing to `main` triggers `.github/workflows/pages.yml`, which runs `npm run build:web` and publishes `dist/` to GitHub Pages.

The site is served from a subpath (`/haven/`), so `app.json` sets `experiments.baseUrl` to `/haven` and the manifest and apple-touch-icon links in `public/index.html` stay relative. Local previews of the exported build therefore need to be served under that prefix; `npm run web` (the dev server) is unaffected.

## Layout

One `App.js` holds the shell (responsive rail above 1000pt), the screens and the design-system styles. `backlog.js` holds the day-boundary maths, kept pure and unit-tested because everything else depends on it.
