# NEET Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete visual and UX redesign of Haven around NEET UG preparation with iOS 26 Liquid Glass design language, preserving all existing functionality and adding NEET tab with countdown, mock predictor, syllabus checklist, and Reddit feed.

**Architecture:** Token-driven design system (`theme.js`) + primitive components (`ui.js`) consumed by screens in `App.js`. New NEET logic in `neet.js`. All existing state/logic (timer, backlog, streaks, Firebase, notifications, lock) untouched. Single-file app architecture preserved.

**Tech Stack:** Expo SDK 57, React Native 0.87, Reanimated 3, expo-blur, expo-haptics, react-native-svg, Inter font (bundled), AsyncStorage, Firebase.

**Spec:** `docs/superpowers/specs/2026-10-10-neet-redesign-spec.md`

---

## Global Constraints

- Spacing values ONLY from 8pt scale: `4, 8, 12, 16, 24, 32, 48, 64` — audit via grep
- No pink gradients, no Fraunces/Outfit, Inter + tabular nums everywhere
- Glass = navigation layer ONLY (tab bar, segmented control); content surfaces are opaque
- Tint ONLY primary actions (filled buttons); secondary = neutral
- Springs only (gentle/snappy/bouncy configs from theme)
- Haptics on every meaningful interaction per spec table
- Release APK < 120 MB, installs on friend's device
- All 5 tabs: Today / Calendar / Study / Insights / NEET
- Accent picker: 4 swatches (blue/green/indigo/orange), default blue

---

## Review Focus

| Input / Condition | Expected Behavior | Test Location |
|---|---|---|
| Scroll on any screen | GlassTabBar shrinks/expands smoothly, no layout shift | Task 5 |
| Timer running + app backgrounded | Lock screen never prompts; timer continues | Task 13 |
| Mock score logged | Percentile/AIR/cutoff gap computed correctly from static tables | Task 10 |
| Reddit feed loaded | 3 sources merged, sorted by hot, cached 5min, text-only rows | Task 11 |
| Accent changed | Whole app re-renders with new accent in <200ms | Task 4 |
| Syllabus checkbox toggled | Persists in AsyncStorage, survives app restart | Task 11 |

---

## File Structure

```
New files:
  src/theme.js              # Design tokens (colors, space, radius, type, springs, haptics)
  src/ui.js                 # Primitives (Screen, GlassTabBar, Section, Card, Row, Button, Sheet, PressableScale)
  src/neet.js               # NEET logic (constants, mock predictor, Reddit fetch, syllabus data)
  assets/fonts/Inter-*.ttf  # Bundled Inter weights 400/500/600/700

Modified:
  App.js                    # Complete restyle using primitives; add NEET tab
  firebase.js               # Remove old water/cheer exports (already done), keep test scores
  backlog.js                # No logic changes; rename exports for clarity (topperPace)
  notifications.js          # No changes
  app.json                  # Add expo-blur plugin, font assets
  package.json              # Add expo-blur, remove google-fonts packages
```

---

## Task 1: Add Dependencies & Font Assets

**Files:**
- Modify: `package.json`
- Modify: `app.json`
- Create: `assets/fonts/Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf`, `Inter-Bold.ttf`

**Interfaces:**
- Produces: Installed packages, font assets registered in app.json

- [ ] **Step 1: Add `expo-blur` to package.json dependencies**
```bash
npx expo install expo-blur
```

- [ ] **Step 2: Remove google-fonts packages**
```bash
npm uninstall @expo-google-fonts/fraunces @expo-google-fonts/outfit
```

- [ ] **Step 3: Download Inter font files** (weights 400, 500, 600, 700) to `assets/fonts/`

- [ ] **Step 4: Update app.json plugins + fonts array**
```json
{
  "expo": {
    "plugins": [
      "expo-blur",
      "expo-local-authentication",
      ["expo-notifications", { "icon": "./assets/images/icon.png", "color": "#007AFF" }]
    ],
    "fonts": [
      "./assets/fonts/Inter-Regular.ttf",
      "./assets/fonts/Inter-Medium.ttf",
      "./assets/fonts/Inter-SemiBold.ttf",
      "./assets/fonts/Inter-Bold.ttf"
    ]
  }
}
```

- [ ] **Step 5: Verify install**
```bash
npx expo install --check
```
Expected: All dependencies compatible with SDK 57

- [ ] **Step 6: Commit**
```bash
git add package.json app.json assets/fonts/
git commit -m "chore: add expo-blur, Inter fonts; remove google-fonts"
```

---

## Task 2: Create `theme.js` — Design Tokens

**Files:**
- Create: `src/theme.js`

**Interfaces:**
- Produces: `theme` object with `colors`, `space`, `radius`, `typography`, `springs`, `haptics`, `accentColors`

- [ ] **Step 1: Write failing test** — `tests/theme.test.js`
```js
import { theme } from '../src/theme';

test('space scale contains only 8pt multiples', () => {
  const allowed = [4,8,12,16,24,32,48,64];
  Object.values(theme.space).forEach(v => expect(allowed).toContain(v));
});

test('colors have light and dark variants', () => {
  expect(theme.colors.light.bg).toBe('#FFFFFF');
  expect(theme.colors.dark.bg).toBe('#000000');
  expect(theme.colors.light.accent).toBeDefined();
  expect(theme.colors.dark.accent).toBeDefined();
});

test('typography has tabular-nums on all number styles', () => {
  ['timer', 'countdown', 'score', 'hours'].forEach(key => {
    expect(theme.typography[key].fontVariant).toEqual(['tabular-nums']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**
```bash
npx jest tests/theme.test.js
```
Expected: FAIL — module not found

- [ ] **Step 3: Implement `src/theme.js`** per spec Section 2
- Colors: light/dark semantic tokens, accent dynamic getter
- Space: 8pt scale object
- Radius: card/control/sheet/pill
- Typography: Inter styles with tabular-nums on timer/countdown/score/hours
- Springs: gentle/snappy/bouncy configs
- Haptics: mapping table
- Accent colors: 4 swatches + default

- [ ] **Step 4: Run test to verify it passes**
```bash
npx jest tests/theme.test.js
```
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/theme.js tests/theme.test.js
git commit -m "feat: add theme.js design tokens"
```

---

## Task 3: Create `ui.js` — Primitives

**Files:**
- Create: `src/ui.js`
- Test: `tests/ui.test.js` (snapshot tests for primitive rendering)

**Interfaces:**
- Consumes: `theme` from `src/theme.js`
- Produces: `Screen`, `GlassTabBar`, `Section`, `Card`, `Row`, `Button`, `Sheet`, `PressableScale`, `Separator`, `Badge`

- [ ] **Step 1: Write failing snapshot tests**
```js
import renderer from 'react-test-renderer';
import { Screen, Card, Row, Button, PressableScale } from '../src/ui';

test('Screen renders with safe area and margin', () => {
  const tree = renderer.create(<Screen><Text>Hi</Text></Screen>).toJSON();
  expect(tree).toMatchSnapshot();
});

test('Card uses opaque elevated surface, no glass', () => {
  const tree = renderer.create(<Card><Text>Content</Text></Card>).toJSON();
  expect(tree.props.style.backgroundColor).not.toContain('blur');
});

test('Button filled uses accent, tinted uses 15% accent', () => {
  const filled = renderer.create(<Button variant="filled">Go</Button>).toJSON();
  const tinted = renderer.create(<Button variant="tinted">Go</Button>).toJSON();
  expect(filled.props.style.backgroundColor).toBeDefined();
  expect(tinted.props.style.backgroundColor).toBeDefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**
```bash
npx jest tests/ui.test.js
```
Expected: FAIL

- [ ] **Step 3: Implement `src/ui.js`** per spec Section 3
- `Screen`: SafeAreaView + bg + 16pt margin + ScrollView with edge fade
- `GlassTabBar`: BlurView intensity=60, hairline border, top specular gradient, 5 tabs, Reanimated scroll listener for shrink/expand
- `Section`: 24pt gap + optional footnote header
- `Card`: elevated surface, radius 12, no glass
- `Row`: 44pt min, separator inset 16pt, PressableScale wrapper
- `Button`: filled/tinted/plain, 48pt, PressableScale + haptic
- `Sheet`: Modal + spring animation + dimming layer
- `PressableScale`: 0.97 scale with spring + haptic
- `Separator`: 0.5px hairline from theme.separator
- `Badge`: tinted background, caption text, pill radius

- [ ] **Step 4: Run tests to verify they pass**
```bash
npx jest tests/ui.test.js
```
Expected: PASS

- [ ] **Step 5: Commit**
```bash
git add src/ui.js tests/ui.test.js
git commit -m "feat: add ui.js primitives"
```

---

## Task 4: Accent System & Persistence

**Files:**
- Modify: `src/theme.js` (add accent getter/setter)
- Modify: `App.js` (accent context + persistence)
- Test: `tests/accent.test.js`

**Interfaces:**
- Consumes: `theme`, AsyncStorage
- Produces: `useAccent()` hook, `AccentPicker` component

- [ ] **Step 1: Write failing tests**
```js
import { useAccent } from '../src/theme';

test('useAccent returns default blue when nothing stored', () => {
  const { accent, setAccent } = useAccent();
  expect(accent).toBe('#007AFF');
});

test('setAccent updates theme.accent and persists', async () => {
  const { setAccent } = useAccent();
  await setAccent('#34C759');
  expect(theme.colors.light.accent).toBe('#34C759');
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement**
- Add `accentColors` array + `getAccent()`/`setAccent()` to `theme.js` (AsyncStorage key `haven-accent`)
- Create `useAccent()` hook in `theme.js` (or separate `src/accent.js`)
- Add `AccentPicker` component in `ui.js` — 4 swatches, selection haptic, instant re-render
- Wire into Settings screen

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**
```bash
git add src/theme.js src/ui.js App.js tests/accent.test.js
git commit -m "feat: accent system with persistence"
```

---

## Task 5: GlassTabBar with Scroll Behavior

**Files:**
- Modify: `src/ui.js` (GlassTabBar implementation)
- Modify: `App.js` (wire GlassTabBar + scroll listeners)
- Test: `tests/GlassTabBar.test.js`

**Interfaces:**
- Consumes: `theme`, `useAccent`, Reanimated `useSharedValue`, `useAnimatedScrollHandler`
- Produces: `GlassTabBar` component with shrink/expand

- [ ] **Step 1: Write failing test**
```js
test('GlassTabBar has 5 tabs and renders BlurView', () => {
  const tree = renderer.create(
    <GlassTabBar tabs={['Today','Calendar','Study','Insights','NEET']} active="Today" onPress={jest.fn()} />
  ).toJSON();
  expect(tree.children.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

- [ ] **Step 3: Implement GlassTabBar**
- Floating capsule: `View` with `BlurView` (intensity=60) + hairline border + top specular gradient (linear 0.3→0 opacity)
- 5 tabs, active pill: `withSpring` translateX + scale + accent background
- `useAnimatedScrollHandler` on content scroll: `translateY` shared value → tab bar height interpolate (full → compact)
- `useAnimatedReaction` to expand on scroll-up
- `selection` haptic on tab change

- [ ] **Step 4: Wire into App.js**
- Each screen's ScrollView passes `onScroll` to shared handler
- Tab bar reads shared value for height/opacity

- [ ] **Step 5: Manual verify** — run app, scroll on each tab, confirm shrink/expand

- [ ] **Step 6: Commit**
```bash
git add src/ui.js App.js tests/GlassTabBar.test.js
git commit -m "feat: GlassTabBar with iOS 26 scroll behavior"
```

---

## Task 6: Restyle Today Screen

**Files:**
- Modify: `App.js` (TodayScreen component)

**Interfaces:**
- Consumes: `Screen`, `Section`, `Card`, `Row`, `Button`, `GlassTabBar`, `theme`, `useAccent`, existing timer/backlog hooks

- [ ] **Step 1: Replace TodayScreen with new layout**
- Wrap in `Screen`
- Top: Countdown glass hero (Card with BlurView overlay — the ONE glass-on-content exception)
- Center: Large hours number (typography.timer) + "Xh behind topper pace" (subhead, tertiary)
- Recent sessions: FlatList of `Row` items, swipe delete
- Empty state: centered footnote tertiary
- Affirmation: footnote tertiary, centered
- Greeting: title2, single line

- [ ] **Step 2: Verify manually** — run app, check Today tab
- Timer still works, sessions log, backlog math unchanged

- [ ] **Step 3: Commit**
```bash
git add App.js
git commit -m "feat: restyle Today screen"
```

---

## Task 7: Restyle Calendar Screen

**Files:**
- Modify: `App.js` (CalendarScreen)

**Interfaces:**
- Consumes: `Screen`, `Section`, `Row`, `Sheet`, existing calendar logic

- [ ] **Step 1: Replace CalendarScreen**
- Month grid: FlatList numColumns=7, each day = 44pt touch target
- Days with sessions: 4pt accent dot under number (View absolute bottom)
- Tap day → Sheet with that day's sessions (Rows, editable)
- Month header: title1 + chevron (plain)

- [ ] **Step 2: Verify manually**

- [ ] **Step 3: Commit**
```bash
git add App.js
git commit -m "feat: restyle Calendar screen"
```

---

## Task 8: Restyle Study Screen

**Files:**
- Modify: `App.js` (StudyScreen, TimerCard)

**Interfaces:**
- Consumes: `Screen`, `Section`, `Row`, `Button`, `Card`, `theme`, timer logic

- [ ] **Step 1: Replace StudyScreen**
- TimerCard: large monospace timer (typography.timer + tabular-nums)
- Subject segmented control (Physics/Chem/Botany/Zoology/Other) — glass BlurView on bar only
- Start/Stop: filled Button (accent)
- Quick logs: 30m/1h/2h tinted Buttons
- History: collapsible Sections by date, Row entries

- [ ] **Step 2: Verify manually** — timer runs, logs, quick logs work

- [ ] **Step 3: Commit**
```bash
git add App.js
git commit -m "feat: restyle Study screen"
```

---

## Task 9: Restyle Insights Screen

**Files:**
- Modify: `App.js` (InsightsScreen)

**Interfaces:**
- Consumes: `Screen`, `Section`, `Row`, `theme`, existing streak/backlog/mock data

- [ ] **Step 1: Replace InsightsScreen**
- 4 sections, 32pt gaps, no boxes
- Streak: large number (typography.largeTitle) + label, fire icon if active
- Weekly hours: 7-bar SVG chart (react-native-svg), accent=today, secondary=others, no axes
- Backlog/Topper pace: single line, headline
- Mock scores: FlatList Rows — "Name · 580/720 · 99.2%ile · +42 above cutoff", swipe delete

- [ ] **Step 2: Verify manually**

- [ ] **Step 3: Commit**
```bash
git add App.js
git commit -m "feat: restyle Insights screen"
```

---

## Task 10: Restyle Settings + Auth + Lock Screens

**Files:**
- Modify: `App.js` (SettingsScreen, AuthScreen, LockScreen)

**Interfaces:**
- Consumes: `Screen`, `Section`, `Row`, `Button`, `Sheet`, `AccentPicker`, `theme`, existing auth/lock logic

- [ ] **Step 1: Replace SettingsScreen**
- Plain Row list, 24pt section gaps
- Groups: Account, Accent (AccentPicker), Notifications, Security, Data, About
- Each toggle = Row with Switch (PressableScale + haptic)

- [ ] **Step 2: Replace AuthScreen**
- Centered, max-width 320pt
- App icon (32pt top margin)
- Plain inputs (no cards)
- Provider buttons: tinted variant

- [ ] **Step 3: Replace LockScreen**
- Same layout as Auth + fingerprint prompt
- Timer exemption unchanged (logic in MainAppLayout)

- [ ] **Step 4: Verify manually** — sign in/out, accent picker, fingerprint, notifications

- [ ] **Step 5: Commit**
```bash
git add App.js
git commit -m "feat: restyle Settings, Auth, Lock screens"
```

---

## Task 11: Create `neet.js` — NEET Logic Module

**Files:**
- Create: `src/neet.js`
- Test: `tests/neet.test.js`

**Interfaces:**
- Produces: `NEET_EXAM_DATE`, `PERCENTILE_TABLE`, `CUTOFFS`, `SYLLABUS`, `computeMockResult(score, category)`, `fetchRedditFeed()`, `getSyllabusProgress()`

- [ ] **Step 1: Write failing tests**
```js
import { computeMockResult, PERCENTILE_TABLE, CUTOFFS, SYLLABUS } from '../src/neet';

test('computeMockResult returns percentile, air, cutoffGap', () => {
  const result = computeMockResult(580, 'Gen');
  expect(result.percentile).toBeGreaterThan(99);
  expect(result.air).toBeLessThan(5000);
  expect(result.cutoffGap).toBeGreaterThan(0); // above cutoff
});

test('computeMockResult below cutoff returns negative gap', () => {
  const result = computeMockResult(600, 'Gen'); // below 715
  expect(result.cutoffGap).toBeLessThan(0);
});

test('SYLLABUS has 4 subjects with chapters', () => {
  expect(SYLLABUS.filter(c => c.subject === 'Physics').length).toBeGreaterThan(10);
  expect(SYLLABUS.filter(c => c.subject === 'Chemistry').length).toBeGreaterThan(10);
  expect(SYLLABUS.filter(c => c.subject === 'Botany').length).toBeGreaterThan(5);
  expect(SYLLABUS.filter(c => c.subject === 'Zoology').length).toBeGreaterThan(5);
});
```

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement `src/neet.js`**
- Constants: `NEET_EXAM_DATE = '2027-05-04'` (adjustable)
- `PERCENTILE_TABLE`: static array from 2024-26 data (score → percentile)
- `CUTOFFS`: `{Gen: 715, EWS: 710, OBC: 705, SC: 650, ST: 600}` (approx)
- `SYLLABUS`: array of ~97 chapters across 4 subjects with weightage (High/Med/Low)
- `computeMockResult(score, category)`: binary search percentile table → interpolate → AIR estimate → cutoff gap
- `fetchRedditFeed()`: fetch 3 subs in parallel, merge by hot score, cache 5min, return `{title, subreddit, score, comments, timeAgo, url}[]`
- `getSyllabusProgress()`: reads AsyncStorage `haven-syllabus-${coupleId}`, returns % checked

- [ ] **Step 4: Run tests to verify they pass**

- [ ] **Step 5: Commit**
```bash
git add src/neet.js tests/neet.test.js
git commit -m "feat: add neet.js logic module"
```

---

## Task 12: Build NEET Tab Screen

**Files:**
- Modify: `App.js` (add NEETScreen component)
- Consumes: `Screen`, `Section`, `Card`, `Row`, `Button`, `Sheet`, `theme`, `useAccent`, `neet.js`

- [ ] **Step 1: Implement NEETScreen**
- Section 1: Countdown glass hero (BlurView regular + hairline) — live countdown via `useEffect` interval
- Section 2: Mock Predictor — form (name + score input + category segmented) + "Log Mock" filled button → result card (spring slide-up) + past mocks list (Rows, swipe delete)
- Section 3: Syllabus Checklist — 4 expandable Sections, each chapter Row with checkmark + weightage badge, header shows % covered
- Section 4: Reddit Feed — FlatList with pull-to-refresh, Row items (title clamp 2 lines, sub badge, meta), tap → Linking.openURL

- [ ] **Step 2: Wire NEET tab into GlassTabBar** (5th tab, NEET icon)

- [ ] **Step 3: Verify manually** — countdown ticks, mock log computes, syllabus persists, feed loads

- [ ] **Step 4: Commit**
```bash
git add App.js
git commit -m "feat: add NEET tab with countdown, mock predictor, syllabus, feed"
```

---

## Task 13: Verify All Existing Functionality Intact

**Files:**
- No new files — verification only

**Interfaces:**
- Consumes: All existing logic (timer, backlog, streaks, test scores, notifications, fingerprint, widget)

- [ ] **Step 1: Timer** — start/stop/pause, subject logging, quick logs, history
- [ ] **Step 2: Backlog** — 8h/day math, floor at 0, celebration on 8h reached and backlog reduction
- [ ] **Step 3: Streaks** — daily streak, gap detection, fire icon only when active
- [ ] **Step 4: Test Scores** — log/delete, grade bands, percent display
- [ ] **Step 5: Notifications** — wind-down 2 AM, weekly Sun 8 PM, test button
- [ ] **Step 6: Fingerprint Lock** — enables/disables, never prompts while timer running
- [ ] **Step 7: Widget** — Android home screen widget shows today's hours/streak
- [ ] **Step 8: Accent Picker** — 4 swatches, instant re-render, persists

- [ ] **Step 9: Commit** (if any fixes needed)
```bash
git add -A
git commit -m "fix: verify and restore any regressions"
```

---

## Task 14: Cleanup & Style Audit

**Files:**
- Modify: `App.js` (remove old gradient/blob/ambient code, Fraunces/Outfit imports)
- Modify: `firebase.js` (confirm water/cheer exports removed)
- Modify: `backlog.js` (rename `backlog` export → `topperPace` for clarity, keep function same)

**Interfaces:** N/A

- [ ] **Step 1: Remove dead code from App.js**
- Delete gradient background, ambient blobs, Fraunces/Outfit font loading
- Delete any "send cheer" / "add water" UI
- Delete double-greeting logic

- [ ] **Step 2: Verify firebase.js** — grep for `waterIntake`, `lastCheer`, `sendCheer`, `updateWaterIntake` → zero results

- [ ] **Step 3: Rename backlog export** (optional clarity)
```js
// backlog.js
export const topperPace = backlog; // alias
```

- [ ] **Step 4: Spacing audit**
```bash
grep -rE '(margin|padding|gap|space).*[0-9]+' App.js src/ | grep -vE '(4|8|12|16|24|32|48|64)'
```
Expected: zero results (only 8pt scale values)

- [ ] **Step 5: Commit**
```bash
git add App.js firebase.js backlog.js
git commit -m "chore: cleanup dead code, spacing audit"
```

---

## Task 15: Build Release APK

**Files:**
- Modify: `android/app/build.gradle` (ensure debug keystore signing for release)

**Interfaces:** N/A

- [ ] **Step 1: Clean build**
```bash
cd android && ./gradlew.bat clean
```

- [ ] **Step 2: Assemble release**
```bash
./gradlew.bat assembleRelease
```

- [ ] **Step 3: Verify APK**
```bash
ls -la app/build/outputs/apk/release/app-release.apk
# Check size < 120 MB
```

- [ ] **Step 4: Install test on device**
```bash
adb install -r app/build/outputs/apk/release/app-release.apk
```

- [ ] **Step 5: Smoke test on device** — all 5 tabs, timer, NEET tab, mock log, feed, settings, lock

- [ ] **Step 6: Commit** (gradle files if changed)
```bash
git add android/app/build.gradle
git commit -m "build: release APK ready"
```

---

## Task 16: Final Verification & Handoff

**Files:** N/A

- [ ] **Step 1: Run all tests**
```bash
npx jest --testPathPattern=tests/
```
Expected: All PASS

- [ ] **Step 2: Visual audit** — run app, verify:
  - No pink gradients anywhere
  - Inter font + tabular nums on all numbers
  - GlassTabBar shrink/expand works
  - Only primary actions tinted (filled buttons)
  - Whitespace groupings (no unnecessary cards/boxes)
  - NEET tab: countdown, mock predictor, syllabus, feed all work

- [ ] **Step 3: APK ready for friend** — `android/app/build/outputs/apk/release/app-release.apk`

- [ ] **Step 4: Final commit**
```bash
git add -A
git commit -m "release: NEET redesign complete — ready for sharing"
```

---

## Execution Order

Tasks 1–5 are foundational (tokens, primitives, accent, tab bar) — must complete before screen restyles.
Tasks 6–10 can run in parallel (each screen independent).
Task 11 (neet.js) can run parallel with 6–10.
Task 12 depends on 11 + 5.
Task 13 depends on 6–12.
Tasks 14–16 are sequential cleanup → build → verify.

Total: 16 tasks, ~8–12 hours implementation.