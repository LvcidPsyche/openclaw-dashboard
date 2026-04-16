# OpenClaw Dashboard

A free, open-source monitoring and control panel for [OpenClaw](https://openclaw.ai) AI agent workflows — built as a **pilot control panel**, not a CRUD app.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-0.1.0-amber)](https://github.com/LvcidPsyche/openclaw-dashboard/releases/tag/v0.1.0)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg)](https://python.org)
[![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)](https://typescriptlang.org)
[![CI](https://github.com/LvcidPsyche/openclaw-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/LvcidPsyche/openclaw-dashboard/actions)

---

## Flight Deck

The home view is a live **Flight Deck** — a multi-panel cockpit that surfaces the highest-signal state at a glance without clicking into any sub-page.

| Panel | What it shows |
|-------|--------------|
| **Sys Status** | Animated arc gauges for CPU / MEM / DISK with color thresholds |
| **Gateway** | WebSocket connection status, latency, protocol version |
| **Active Sessions** | Live session list with model tags |
| **Job Control** | All cron jobs with inline enable / disable toggles |
| **Cost Meter** | Daily spend, budget progress bar, adjustable budget slider (persisted) |
| **Log Stream** | Live-scrolling log tail with error / warn / info coloring |
| **Token Flow** | 24 h sparkline, token counts, key metrics, quick-nav links |

Everything updates automatically. No page refresh needed.

---

## Full Navigation (17 views)

| Section | Views |
|---------|-------|
| **Monitor** | Flight Deck (`/`), Overview (`/overview`) |
| **Agents** | Agents (`/agents`), Sessions (`/sessions`), Nodes (`/nodes`) |
| **Automate** | Jobs (`/jobs`), Pipelines (`/pipelines`), Skills (`/skills`) |
| **Observe** | Metrics (`/metrics`), Logs (`/logs`), Files (`/files`) |
| **Configure** | Chat (`/chat`), Config (`/config`), Settings (`/settings`), System (`/system`), Debug (`/debug`), Docs (`/docs`) |

---

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20.19+ or 22.12+
- An OpenClaw installation (reads from `~/.openclaw/` by default)

### One-command install & run

```bash
git clone https://github.com/LvcidPsyche/openclaw-dashboard.git
cd openclaw-dashboard
./install-and-run.sh
```

Opens on **http://localhost:8765**

### Manual setup

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
npm run build

# Run (serves built frontend on the same port)
cd ../backend
PYTHONPATH=. python3 -m app.main
```

### Development (hot reload)

```bash
./start.sh
# Frontend: http://localhost:5173
# Backend:  http://localhost:8765
# API docs: http://localhost:8765/docs
```

---

## Configuration

```bash
cp backend/.env.example backend/.env
# Edit .env as needed — defaults work with a standard ~/.openclaw install
```

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_DASH_OPENCLAW_DIR` | `~/.openclaw` | OpenClaw installation path |
| `OPENCLAW_DASH_GATEWAY_URL` | `http://localhost:18789` | Gateway HTTP URL |
| `OPENCLAW_DASH_GATEWAY_WS_URL` | `ws://127.0.0.1:18789` | Gateway WebSocket URL |
| `OPENCLAW_DASH_GATEWAY_TOKEN` | _(empty)_ | Gateway auth token (if required) |
| `OPENCLAW_DASH_PORT` | `8765` | Server port |
| `OPENCLAW_DASH_HOST` | `0.0.0.0` | Bind address |
| `OPENCLAW_DASH_DISCOVERY_INTERVAL_SECONDS` | `300` | Auto-discovery refresh cadence |

---

## Features

### Flight Deck
Cockpit-style home panel with live arc gauges, log stream, job control, and cost tracking — all on one screen. Budget slider is user-adjustable and persists across sessions via `localStorage`.

### AI Chat
WebSocket-backed chat proxy to the OpenClaw gateway. Supports streaming responses, extended thinking toggle, model selection, and exponential-backoff auto-reconnect.

### Jobs
Full CRUD for cron jobs: create, edit, enable/disable, run on demand, view history, export CSV. Inline run/pause toggles on the Flight Deck.

### Metrics
Token usage and cost over configurable time windows (6 h – 7 d). Line chart, donut by model, bar chart of daily trend. CSV export.

### Sessions
Session browser with expandable detail: usage stats, message history, model override, extended thinking toggle.

### Nodes & Devices
Connected node list and paired device management (approve / reject / revoke / rotate token).

### Discovery Engine
Auto-scans your OpenClaw workspace every 5 minutes and surfaces:
- **Pipelines** — matched by directory patterns and file modification times
- **Agents** — agent config JSON files, classified by type
- **Skills** — enumerated from `workspace/skills/`, categorized, README loaded on click

Manual refresh: Settings → Refresh Discovery, or `POST /api/discovery/refresh`.

### Logs
Full log browser with file selector, search/filter, auto-scroll, and 5-second live polling. Download any log file.

### Files
Workspace file explorer with breadcrumb navigation, full-text search, content reader, and clipboard copy.

### Debug
Gateway connection test, health checks, filesystem status, session inspector, log tail.

### Security
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options, HSTS)
- CORS restricted to configured origins
- Request size limiting (2 MB max)
- Secrets redacted in config API responses
- Server-side cron expression validation

---

## Keyboard Shortcuts

Press `g` then a letter to navigate. All shortcuts fire within 500 ms of `g`.

| Shortcut | Destination |
|----------|-------------|
| `g` `h` | Flight Deck (home) |
| `g` `o` | Overview |
| `g` `c` | Chat |
| `g` `a` | Agents |
| `g` `e` | Sessions |
| `g` `n` | Nodes |
| `g` `j` | Jobs |
| `g` `p` | Pipelines |
| `g` `k` | Skills |
| `g` `m` | Metrics |
| `g` `l` | Logs |
| `g` `f` | Files |
| `g` `x` | Config |
| `g` `t` | Settings |
| `g` `s` | System |
| `g` `d` | Debug |
| `g` `r` | Docs |
| `/` | Focus search |
| `Esc` | Blur active input |

---

## API Reference

Interactive docs at `/docs` when the server is running.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/overview` | Dashboard summary stats |
| `GET` | `/api/jobs` | All cron jobs with status |
| `POST` | `/api/jobs` | Create cron job |
| `PUT` | `/api/jobs/{id}` | Update cron job |
| `DELETE` | `/api/jobs/{id}` | Delete cron job |
| `POST` | `/api/jobs/{id}/run` | Trigger immediate run |
| `GET` | `/api/jobs/{id}/history` | Job run history |
| `POST` | `/api/jobs/control` | Enable / disable job |
| `GET` | `/api/metrics/tokens` | Token usage by model |
| `GET` | `/api/metrics/timeseries` | Time-series data |
| `GET` | `/api/metrics/breakdown` | Cost / token breakdown |
| `GET` | `/api/system/resources` | CPU, memory, disk |
| `GET` | `/api/system/health` | Service health |
| `GET` | `/api/sessions/list` | All sessions |
| `PATCH` | `/api/sessions/{id}` | Update session |
| `DELETE` | `/api/sessions/{id}` | Delete session |
| `GET` | `/api/sessions/{id}/usage` | Session token usage |
| `GET` | `/api/sessions/{id}/history` | Session chat history |
| `GET` | `/api/debug/gateway` | Gateway connection test |
| `GET` | `/api/debug/health` | Detailed health check |
| `GET` | `/api/debug/filesystem` | Filesystem checks |
| `GET` | `/api/pipelines` | Discovered pipelines |
| `GET` | `/api/agents` | Discovered agents |
| `GET` | `/api/skills` | Skills (search, paginate) |
| `GET` | `/api/skills/{name}` | Skill detail + README |
| `GET` | `/api/discovery` | Full discovery result |
| `POST` | `/api/discovery/refresh` | Trigger re-scan |
| `GET` | `/api/logs/files` | Available log files |
| `GET` | `/api/logs/tail` | Tail a log file |
| `GET` | `/api/nodes` | Connected nodes |
| `GET` | `/api/nodes/devices` | Paired devices |
| `POST` | `/api/nodes/devices/{id}/approve` | Approve pairing |
| `POST` | `/api/nodes/devices/{id}/revoke` | Revoke token |
| `POST` | `/api/nodes/devices/{id}/rotate` | Rotate token |
| `GET` | `/api/config` | Config (secrets redacted) |
| `PUT` | `/api/config` | Update config |
| `GET` | `/api/models` | Available AI models |
| `POST` | `/api/chat` | Send chat message |
| `GET` | `/api/chat/status` | Gateway availability |
| `WS` | `/ws/chat` | Streaming chat |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI, Uvicorn, Pydantic, httpx, psutil |
| Frontend | React 19, TypeScript 5.9, Vite 7 |
| Styling | Tailwind CSS 4 |
| Charts | Recharts 3 |
| State | Zustand 5 |
| Icons | Lucide React |
| Routing | React Router 7 |

---

## Project Structure

```
backend/
  app/
    main.py              # FastAPI entry point + middleware
    config.py            # Pydantic settings
    routers/             # One file per API domain
    services/            # Gateway RPC, job service, analytics
    middleware/          # Security headers, request limits
    discovery/           # Auto-discovery engine + pattern matchers
    models/              # Pydantic schemas
    websocket/           # WebSocket manager

frontend/
  src/
    pages/               # 17 routed views
    components/
      layout/            # Sidebar, Header, Layout
      common/            # StatCard, StatusBadge, EmptyState, Toast, ConfirmDialog
      features/          # JobFormModal
    api/                 # Typed fetch client + endpoint wrappers
    store/               # Zustand global state
    hooks/               # usePolling, useToast, useKeyboardShortcuts
    utils/               # Formatters
```

---

## Contributing

Issues and pull requests are welcome. Please open an issue first for anything non-trivial.

## License

[MIT](LICENSE)
