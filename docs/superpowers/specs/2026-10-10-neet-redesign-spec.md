# Haven — NEET-Centered iOS 26 Redesign Spec

**Date:** 2026-10-10
**Status:** Approved for implementation

---

## 1. Scope

Complete visual and UX redesign of the Haven Expo React Native app around **NEET UG preparation**. All existing functionality (timer, study logs, backlog, streaks, test scores, notifications, fingerprint lock, widget) preserved. New: NEET tab with countdown, competition scale, mock predictor, syllabus checklist, Reddit feed. Visual language: iOS 26 Liquid Glass + whitespace-first layout. No pink branding.

---

## 2. Design System (`theme.js`)

### Colors — iOS Semantic (Light + Dark)

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `bg` | `#FFFFFF` | `#000000` | Screen background |
| `surface` | `#F2F2F7` | `#1C1C1E` | Grouped content background |
| `elevated` | `#FFFFFF` | `#2C2C2E` | Cards, sheets |
| `label.primary` | `#000000` | `#FFFFFF` | Highest contrast text |
| `label.secondary` | `#3C3C4399` | `#EBEBF599` | Subtitles, secondary |
| `label.tertiary` | `#3C3C434D` | `#EBEBF54D` | Disabled, placeholder |
| `label.quaternary` | `#3C3C432E` | `#EBEBF52E` | Separators, structural |
| `separator` | `#3C3C434A` | `#54545880` | 0.5px hairlines |
| `accent` | **Dynamic** (see below) | **Dynamic** | Primary actions only |
| `fill.quaternary` | `accent @ 15%` | `accent @ 15%` | Tinted backgrounds |

**Accent palette (user-pickable, default Blue):**
- Blue `#007AFF` (default)
- Green `#34C759`
- Indigo `#5856D6`
- Orange `#FF9500`

*Old rose/champagne/mint/sapphire removed.*

### Space — 8pt Scale (enforced)

`xs 4 · sm 8 · md 12 · lg 16 · xl 24 · 2xl 32 · 3xl 48 · 4xl 64`

- Screen margin: `lg 16`
- Section gap: `xl 24` or `2xl 32`
- Major section break: `3xl 48` or `4xl 64`

### Radius

| Element | Value |
|---|---|
| Card / container | 12 |
| Control (button, input) | 10 |
| Sheet / modal | 20 |
| Pill (tab bar, chips) | height/2 |

### Typography — Inter (bundled)

Weights: 400 / 500 / 600 / 700. `fontVariant: ['tabular-nums']` on all numbers.

| Style | Size / Weight | Use |
|---|---|---|
| largeTitle | 34 / 700 | Screen titles |
| title1 | 28 / 700 | Section headers |
| title2 | 22 / 600 | Card titles |
| headline | 17 / 600 | Emphasized body |
| body | 17 / 400 | Primary text |
| subhead | 15 / 400 | Secondary text |
| footnote | 13 / 400 | Section headers, metadata |
| caption | 11 / 500 | Badges, timestamps |

### Springs

| Name | Config | Use |
|---|---|---|
| `gentle` | damping 22, stiffness 120 | Entrances, sheet open |
| `snappy` | damping 18, stiffness 180 | Toggles, segmented |
| `bouncy` | damping 15, stiffness 200 | Celebration, confetti |

### Haptics

| Event | Type |
|---|---|
| Tab change, segmented control | `selection` |
| Row press, toggle, mock log | `light` |
| Timer start/stop | `medium` |
| 8h reached, backlog cleared, streak | `success` |
| Accent change | `selection` |

---

## 3. Primitives (`ui.js`)

| Primitive | Description |
|---|---|
| `Screen` | Safe-area, bg, 16pt margin, scroll-edge fade |
| `GlassTabBar` | Floating capsule, BlurView intensity=60, hairline border, top specular line. 5 tabs. Shrinks on scroll, expands on scroll-up (Reanimated). Active pill: accent fill + spring. |
| `Section` | 24pt gap + footnote header. Whitespace grouping, no boxes. |
| `Card` | Opaque elevated surface, radius 12. **No glass** (Apple rule: glass = navigation layer only). Used sparingly. |
| `Row` | 44pt min, hairline separator inset 16pt, press-scale 0.97 + light haptic. |
| `Button` | Filled (accent, primary only), tinted (accent @15%), plain. 48pt tall. |
| `Sheet` | Spring-in modal, radius 20, dimming layer (never glass-on-glass). |
| `PressableScale` | 0.97 press wrapper for all tappables. |

**Key rule:** Tint **only primary actions**. Secondary controls neutral.

---

## 4. Screen Redesigns

### Today (Home)
- **Top:** NEET countdown glass hero (days/h:m:s, aspirants/seats ratio, cutoff gap from latest mock)
- **Center:** Today's hours (large, tabular nums) + "Xh behind topper pace" (topper pace = 8h/day × days elapsed)
- **Recent sessions:** Plain Row list, swipe delete. Empty → "Start a timer on Study"
- **Affirmation:** Footnote tertiary: "Don't waste your potential, I know you can do it!"
- **Greeting:** Single "Good {time}, Chaaru"

### Calendar
- Month grid (FlatList 7 columns). Days with sessions: accent dot (4pt) under number.
- Tap day → Sheet with that day's sessions (editable Rows).

### Study
- **TimerCard:** Large monospace timer (Inter 72 + tabular), subject segmented control (Physics/Chem/Botany/Zoology/Other) — glass material on segmented bar only.
- **Start/Stop:** Filled button (accent).
- **Quick logs:** 30m/1h/2h tinted chips.
- **History:** Collapsible by date, Row entries.

### Insights
Three sections, 32pt macro gaps, **no boxes**:
1. Streak — large number + label, fire icon only if active
2. Weekly hours — 7-bar SVG chart (accent = today), no axes/grid
3. Backlog/Topper pace — "Topper: 56h · You: 42h · Behind: 14h"
4. Mock scores — Row list: "Name · 580/720 · 99.2%ile · +42 above cutoff". Tap → edit/delete.

### Settings
Plain Row list, 24pt section gaps:
- Account (name, email, sign out)
- Accent (4 swatches, instant re-render)
- Notifications (wind-down 2 AM, weekly Sun 8 PM, test)
- Security (fingerprint toggle)
- Data (export/import, delete account)
- About (version, privacy link)

### Auth / Lock
- Centered, max-width 320pt. App icon top, 32pt gap. Plain inputs. Tinted provider buttons.
- Lock: same + fingerprint prompt. Timer-running exemption unchanged.

---

## 5. NEET Tab (5th Tab)

### 1. Countdown + Competition (Glass Hero)
- Glass card (BlurView regular + hairline): live countdown to `NEET_EXAM_DATE` (config)
- "24.2L aspirants · 1.1L MBBS seats · 1 in 22"
- "Last year Gen cutoff: 715/720"
- Gap: "You're **38 marks** from cutoff" (from latest mock)

### 2. Mock Predictor
- Form: Mock name + Score (0–720) + Category (Gen/EWS/OBC/SC/ST)
- "Log Mock" → computes percentile (static table), AIR range, **marks above/below cutoff**
- Result: "Projected: 99.1%ile · AIR ~2,400 · **+42 above cutoff**"
- Past mocks list (Rows, swipe delete)

### 3. Syllabus Checklist (Local Only)
- Physics / Chemistry / Botany / Zoology expandable sections
- Each chapter: Row with checkmark + weightage badge (High/Med/Low)
- Toggle → AsyncStorage only, no sync
- Header: "Syllabus covered: 67%"

### 4. Reddit Feed
- Sources: `r/Neet_india` + `r/JEENEETards` + `r/NEETard`
- Fetch: `https://www.reddit.com/r/{sub}/hot.json?limit=10&t=day` (public, no key)
- Cache: 5 min in-memory
- Row: title (2-line clamp), sub badge (tertiary), score/comments, relative time
- Tap → `Linking.openURL`
- Pull-to-refresh, error + retry
- **Text only** — no images/video

---

## 6. Data (No Schema Migrations)

| Key | Storage | Content |
|---|---|---|
| `NEET_EXAM_DATE` | `neet.js` constant | e.g. `2027-05-04` |
| `PERCENTILE_TABLE` | `neet.js` static | Score → percentile (2024–26) |
| `CUTOFFS` | `neet.js` config | Per-category cutoff scores |
| `SYLLABUS` | `neet.js` static | `{subject, chapter, weightage}` array |
| `haven-mocks-${coupleId}` | AsyncStorage | Mock log array |
| `haven-syllabus-${coupleId}` | AsyncStorage | `{chapterId: boolean}` checks |

---

## 7. Motion & Micro-interactions (Reanimated)

| Trigger | Animation | Haptic |
|---|---|---|
| Tab change | Spring pill translate/scale | selection |
| Timer start/stop | Button scale 0.95→1 | medium |
| 8h / backlog clear | Confetti + streak pulse | success |
| Mock logged | Result slide-up spring | light |
| Pull-refresh | Spinner + cross-fade | light |
| Sheet open/close | Spring height + fade | selection |
| Segmented change | Indicator spring | selection |
| Row press | 0.97 scale | light |
| Accent change | `withTiming` 200ms whole-app | selection |

**Only springs.** No GSAP, WebGL, particles.

---

## 8. Dependency Delta

**Add:**
- `expo-blur` (glass material)
- `expo-haptics` (already present)

**Remove:**
- `@expo-google-fonts/fraunces`
- `@expo-google-fonts/outfit`
- Gradient/blob/ambient code

**Fonts:** Bundled Inter (weights 400/500/600/700) via `expo-font` + local assets.

---

## 9. Acceptance Criteria

- [ ] App builds and runs on device (debug + release APK)
- [ ] All 5 tabs navigate, state preserved
- [ ] Timer, backlog, streaks, test scores, notifications, fingerprint lock, widget — all functional
- [ ] NEET tab: countdown live, mock predictor computes correctly, syllabus checks persist, Reddit feed loads
- [ ] GlassTabBar shrinks/expands on scroll
- [ ] No pink gradients, no Fraunces/Outfit, Inter + tabular nums everywhere
- [ ] Accent picker works (4 swatches, instant)
- [ ] Spacing values only from 8pt scale (audit via grep)
- [ ] Release APK < 120 MB, installs on friend's device