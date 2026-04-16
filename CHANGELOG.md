# Changelog

All notable changes to OpenClaw Dashboard are documented here.

## [0.1.0] — 2026-04-16

First stable release. Complete redesign from a 5-view prototype into a full-featured 17-view control panel.

### Added

**Flight Deck (new home view)**
- Multi-panel cockpit layout replacing the old `/` Chat redirect
- Animated SVG arc gauges (CPU / MEM / DISK) using `pathLength="100"` normalization
- Live log stream with error / warn / info color tiers and scan-line overlay
- Job control panel with inline enable / disable toggles
- Cost meter with daily spend, budget progress bar, and user-adjustable budget slider (persisted to `localStorage`)
- Token flow sparkline with gradient area fill pulled from Zustand store
- Gateway status panel with latency, protocol version, and uptime
- Active sessions panel with model tags
- Amber HUD corner accents and `fd-panel` hover glow on all panels

**Navigation**
- 17 fully-routed views (up from 5), all lazy-loaded with Suspense
- Sidebar redesigned: 5 grouped sections (Monitor / Agents / Automate / Observe / Configure)
- Amber accent theme replacing blue throughout
- Live badges: active session count on Sessions, failing job count on Jobs
- Hover prefetch for all 17 routes
- Full keyboard shortcut set: `g+h`, `g+o`, `g+c`, `g+a`, `g+e`, `g+n`, `g+j`, `g+p`, `g+k`, `g+m`, `g+l`, `g+f`, `g+x`, `g+t`, `g+s`, `g+d`, `g+r`

**Chat**
- Exponential-backoff auto-reconnect (base 2 s × 1.5^attempt, max 5 attempts)
- Live status pill showing reconnect progress
- WebSocket cleanup on unmount (no timer leaks)

**StatusBadge**
- Expanded from 7 to 20 status mappings: `running`, `ok`, `completed`, `failed`, `connected`, `offline`, `disabled`, `stopped`, `approved`, `starting`, `degraded`, and more

### Fixed

- `OverviewPage`: `<a href="/jobs">` replaced with `<Link to="/jobs">` — was causing full page reloads
- `SkillsPage`: replaced raw `fetch()` call with `api.fetchSkillDetail()`, added loading state
- `NerveCenterPage` grid: replaced `auto-rows-fr` + `h-full` (unreliable in scroll containers) with explicit `h-48 / h-52 / h-72` row heights
- Token timeseries now reads from Zustand store instead of a duplicate direct API call
- All `text-blue-*` / `bg-blue-*` interactive elements swapped to amber for visual consistency

### Changed

- Header reduced to a slim HUD strip (CPU / MEM / DISK with color thresholds, active session badge)
- `MetricsPage`: primary chart color → amber, tooltip → dark background for readability
- `EmptyState` action button → amber
- `ConfirmDialog` confirm button → amber
- `JobFormModal` submit button → amber

---

## [0.0.1] — 2026-04-15 _(pre-release)_

Initial commit. 5-view prototype: Chat, Overview, System, Debug, Files.
