# Calisthenics Companion

**Show up. Get stronger.**

A calm, responsive web app for a 12-week beginner calisthenics plan. You need no equipment, about 20 minutes, and three strength sessions a week. The app focuses on consistency over intensity: it has a "minimum workout" for hard days, mobility routines, a shared timer, and honest progress tracking.

There's no account and no backend. Your data stays in your browser.

## Requirements

- [Node.js](https://nodejs.org/) 20 or newer (built and tested with Node 24 LTS)

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:5173).

## Scripts

| Command             | What it does                                               |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Starts the development server with hot reload             |
| `npm run build`     | Type-checks and builds the production app into `dist/`    |
| `npm run preview`   | Serves the production build locally (run `build` first)   |
| `npm run lint`      | Runs ESLint                                               |
| `npm run typecheck` | Runs the TypeScript compiler without emitting             |
| `npm test`          | Runs the Vitest + React Testing Library suite once        |

`dist/` is a static site. You can host it on any static file host.

## Deployment (GitHub Pages)

Every push to `main` triggers `.github/workflows/deploy.yml`. It runs lint, the tests, and the build, then publishes `dist/` to GitHub Pages at `https://<username>.github.io/<repo>/`. The build uses relative asset paths (`base: './'` in `vite.config.ts`), so it works under any repository name.

You only need to do this once: in the repository on GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.

Each address the app is opened from keeps its own separate data. Data saved on the live site is separate from data saved on `localhost`. Use Export and Import to move it.

## Features

- **Overview**: shows the current plan week and phase, today's focus, a start button for today's workout, and three statistics: total strength sessions, the weekly target (x / 3), and your active streak. It also has twelve clickable week indicators, this week's rhythm, and the minimum-workout card.
- **Workouts**: Workout A and B, each with instructions, easier variations, editable sets and reps (or hold seconds), a completion checkbox per exercise, rest and hold timer shortcuts, phase guidance, and session notes. A session is logged only when you press **Complete workout** and confirm. The app warns you when you might be logging a duplicate.
- **Minimum workout**: 5 wall push-ups and 8 squats. It counts toward your habit and streak, but it is never counted as a full strength session.
- **Timer**: one shared countdown for exercise intervals, rest, mobility holds, a 20-minute workout, or a custom length (5 s–60 min). It has presets (30, 45, 60, 90 s), Start, Pause, Resume, Reset, and +15 s. It keeps running when you switch screens and survives a page refresh.
- **Mobility**: a guided warm-up and a recovery routine, with a countdown for each movement and Next, Skip, and Previous controls. Mobility history and statistics are kept separate from strength.
- **Progress**: strength, mobility, and minimum session counts, training time, this week's consistency, your streak, a chart of the last six plan weeks with the target line, personal records, push-up check-ins, and filterable history (with deletion for accidental entries).
- **Settings**: plan start date, preferred workout time, theme (system, light, or dark), timer sound, reduced motion, JSON export and import, and reset.

### How the numbers are calculated

- **Plan week**: `floor(daysBetween(planStartDate, today) / 7) + 1`, clamped to 1–12, using local calendar dates. The week advances with the calendar. It never advances because you completed workouts, and it never applies penalties.
- **Weekly target**: completed Workout A or B sessions in the current plan week, out of 3. Minimum sessions are not included.
- **Week status**: "Target met" requires 3 recorded strength sessions. A past week is never marked complete just because its dates have passed.
- **Active streak**: the number of consecutive local calendar days with at least one logged activity (a strength, minimum, or mobility session). The count ends today if you have logged something today; otherwise it ends yesterday, so a day you haven't logged yet doesn't reset it early. Missing a day resets the count, and nothing else is lost.

## Your data

### Local persistence

All data is stored in your browser's `localStorage` under the key `calisthenics-companion:data`, in a versioned format (`version: 1`). A running timer is stored separately under `calisthenics-companion:timer`.

- Every change is saved right away, including in-progress workouts. You can refresh the page or switch screens without losing entries.
- Data is validated whenever it is loaded. Invalid records are skipped and reported. If storage is unreadable, a copy is kept under `calisthenics-companion:data:corrupt-<timestamp>` and the app starts fresh instead of crashing.
- If a save fails (for example, because storage is full), the app shows a warning and asks before you leave the page.
- Nothing is sent to a server. The app makes no network requests after it loads.

> **Browser storage is device-specific.** Your data lives only in the browser and device where you use the app. Other browsers, private windows, and other devices won't see it. Clearing site data for this site deletes it. Export a backup regularly.

### Export and import backups

- **Export**: go to **Settings → Export backup**. The app downloads `calisthenics-companion-backup-YYYY-MM-DD.json`.
- **Import**: go to **Settings → Import backup** and choose a backup file. The file is fully validated first. If anything is invalid, the import is rejected and your current data is left untouched. If the file is valid, the app shows a summary and asks you to confirm before it replaces your data.
- **Reset**: go to **Settings → Reset all data**. The app asks for confirmation first, and the dialog offers to export a backup.

## Project structure

```
src/
  main.tsx, App.tsx          App shell, providers, routing, theme
  index.css                  Design tokens + all styles (light/dark, responsive)
  types.ts                   Data model
  data/                      Workouts, mobility routines, phases & schedule
  hooks/
    usePersistentState.ts    State mirrored to localStorage (with error reporting)
    useTimer.ts              Timestamp-based countdown + pure transition functions
    useHashRoute.ts          Tiny hash router (#/workouts/B)
    usePlan.ts               Current week / phase / today
  state/                     AppData, Timer, and Toast React contexts
  utils/                     Dates, validation & migration, storage, export/import, stats
  components/                Navigation, ProgressCard, WeekProgress, Timer, WorkoutExercise, dialogs
  pages/                     Overview, Workouts, TimerPage, Mobility, Progress, Settings
  test/                      Vitest + Testing Library tests
```

## Timer notes

The countdown is calculated from an absolute end time (`endAt - Date.now()`). Delayed or throttled callbacks, such as in a background tab, never make it drift. When time is up, the app shows a visible completion state, plays an optional chime, vibrates where the device supports it, and makes a screen-reader announcement. Browsers can't reliably notify you once the tab or app is closed. If a countdown ended while the app was closed, it shows as complete when you return, without a late chime.

## Safety

This app provides general beginner fitness guidance, not individualized medical care. Use controlled technique, leave 2–3 good reps in reserve, and stop any exercise that causes pain. The floor pulling exercises (reverse snow angels, Y-T-W raises) do not fully replace progressive pulling exercises. A resistance band or a secure, purpose-built pull-up setup is a good optional addition. Never use unstable furniture or improvised overhead supports.
