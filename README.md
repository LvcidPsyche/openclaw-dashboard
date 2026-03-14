# OpenClaw Dashboard

A free, open-source monitoring and management dashboard for [OpenClaw](https://openclaw.ai) AI agent workflows.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Python 3.10+](https://img.shields.io/badge/Python-3.10+-3776AB.svg)
![React 19](https://img.shields.io/badge/React-19-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6.svg)

![Dashboard Overview](docs/screenshots/dashboard-overview.png)

## Demo

https://github.com/user-attachments/assets/demo.webm

> [Download demo video](docs/demo.webm) (2.9 MB, 78 seconds — earlier broader surface demo; the current shipped shell is the lean 5-view dashboard below)

## What It Does

OpenClaw Dashboard currently ships a lean operator shell around the highest-signal OpenClaw workflows:

- **Chat** — AI chat proxy to the OpenClaw gateway
- **Overview** — High-level workload, token, and cost summary
- **System** — CPU, memory, disk, and health status
- **Debug** — Gateway diagnostics, session inspection, filesystem checks, and log tail
- **Files** — Lightweight file explorer/search/reader for workspace inspection

The backend still retains broader API modules for future expansion, but the routed frontend surface is intentionally narrowed to these five views right now.

## Screenshots

| Chat | Overview |
|------|----------|
| ![Chat](docs/screenshots/dashboard-chat.png) | ![Overview](docs/screenshots/dashboard-overview.png) |

| System | Debug |
|--------|-------|
| ![System](docs/screenshots/dashboard-system.png) | ![Debug](docs/screenshots/dashboard-debug.png) |

| Files |
|-------|
| Workspace file explorer is included in the shipped shell (`/files`), even though there is not yet a dedicated screenshot checked into `docs/screenshots/`. |

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 20.19+ or 22.12+ (frontend uses Vite 7)
- An OpenClaw installation (the dashboard reads from `~/.openclaw/`)

### 1. Clone and install

```bash
git clone https://github.com/LvcidPsyche/openclaw-dashboard.git
cd openclaw-dashboard

# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure (optional)

```bash
cp backend/.env.example backend/.env
# Edit backend/.env with your paths
```

The defaults work if OpenClaw is installed at `~/.openclaw/`.

### 3. Run

**Development** (hot reload on both ends):

```bash
# Terminal 1 — Backend
cd backend
PYTHONPATH=. python -m app.main

# Terminal 2 — Frontend dev server
cd frontend
npm run dev
```

**Production** (single process, single port):

```bash
# Build the frontend
cd frontend && npm run build && cd ..

# Run everything on port 8765
cd backend
PYTHONPATH=. python -m app.main
```

The backend serves the built frontend automatically — no separate web server needed.

## Features

### Lean operator shell
The current frontend intentionally keeps only the fastest operator loops in the sidebar: Chat, Overview, System, Debug, and Files.

### Backend still covers broader OpenClaw data
The FastAPI layer still exposes jobs, discovery, metrics, config, nodes, logs, and session-management endpoints so the dashboard can expand again without redoing the data plane.

### Debug & Diagnostics
Gateway connection testing, health checks, filesystem status verification, active session inspector, and live log tail.

### Customer-Quality UX
- Toast notifications on all mutations
- Keyboard shortcuts (`g+c` Chat, `g+o` Overview, `g+s` System, `g+d` Debug, `g+f` Files, `/` focus search, `Esc` blur active input)
- Sidebar prefetch for routed pages
- File search + read flow
- Loading skeletons and empty states on the routed shell

### Security
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- CORS restricted to localhost and configured origins
- Request size limiting (2MB max)
- Secret redaction in config API responses
- Server-side cron expression validation

## Project Structure

```
backend/
  app/
    main.py              # FastAPI entry point + middleware
    config.py            # Environment-based settings (Pydantic)
    routers/             # API modules
      overview.py        #   GET  /api/overview
      jobs.py            #   CRUD /api/jobs + run/history
      metrics.py         #   GET  /api/metrics/*
      system.py          #   GET  /api/system/*
      sessions.py        #   GET  /api/sessions
      chat.py            #   POST /api/chat, WS /ws/chat
      logs.py            #   GET  /api/logs/*
      discovery.py       #   GET  /api/discovery
      config.py          #   GET/PUT /api/config
      nodes.py           #   GET /api/nodes + device actions
      debug.py           #   GET /api/debug/*
      sessions_mgmt.py   #   CRUD /api/sessions/*
    services/
      gateway_rpc.py     # Shared gateway WebSocket RPC client
      job_service.py     # Cron job data + control
      cache_trace.py     # Token/cost analytics
    middleware/
      security.py        # Security headers + request size limiting
    discovery/
      engine.py          # Auto-discovery engine
      patterns.py        # Pipeline/agent/skill detection
    models/
      schemas.py         # Pydantic response models
    websocket/
      manager.py         # Multi-channel WebSocket manager
  requirements.txt
  .env.example

frontend/
  src/
    pages/               # current routed shell + retained expansion pages
    components/
      layout/            # Sidebar, Header, Layout
      common/            # StatCard, StatusBadge, EmptyState, LoadingState, Toast, ConfirmDialog
      features/          # JobFormModal
    api/                 # Typed fetch client + endpoints
    store/               # Zustand global state
    hooks/               # usePolling, useToast, useKeyboardShortcuts
    utils/               # Formatters
```

## Discovery Engine

The dashboard includes an auto-discovery engine that scans your OpenClaw workspace and detects:

| What | How |
|------|-----|
| **Pipelines** | Matches directory names against known patterns and checks file modification times for active/idle status |
| **Agents** | Scans agent config directories for JSON files with agent definitions, classifies by type |
| **Skills** | Enumerates `workspace/skills/`, auto-categorizes by name, reads README.md for descriptions |
| **Modules** | Checks for known custom module directories |

Discovery runs automatically every 5 minutes. Trigger a manual re-scan from Settings or via `POST /api/discovery/refresh`.

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/overview` | Dashboard summary stats |
| `GET` | `/api/jobs` | All cron jobs with status |
| `POST` | `/api/jobs` | Create a new cron job |
| `PUT` | `/api/jobs/{id}` | Update a cron job |
| `DELETE` | `/api/jobs/{id}` | Delete a cron job |
| `POST` | `/api/jobs/{id}/run` | Trigger immediate job run |
| `GET` | `/api/jobs/{id}/runs` | Job run history |
| `POST` | `/api/jobs/control` | Control a job (enable/disable) |
| `GET` | `/api/config` | Current config (secrets redacted) |
| `PUT` | `/api/config` | Update configuration |
| `POST` | `/api/config/apply` | Apply config changes |
| `GET` | `/api/config/schema` | Config schema |
| `GET` | `/api/config/models` | Available AI models |
| `GET` | `/api/models` | Available models list |
| `GET` | `/api/nodes` | Connected nodes |
| `GET` | `/api/nodes/devices` | Paired devices |
| `POST` | `/api/nodes/devices/{id}/approve` | Approve device pairing |
| `POST` | `/api/nodes/devices/{id}/reject` | Reject device pairing |
| `POST` | `/api/nodes/devices/{id}/revoke` | Revoke device token |
| `POST` | `/api/nodes/devices/{id}/rotate` | Rotate device token |
| `GET` | `/api/metrics/tokens` | Token usage by model |
| `GET` | `/api/metrics/timeseries` | Time-series usage data |
| `GET` | `/api/metrics/breakdown` | Cost/token breakdown |
| `GET` | `/api/system/resources` | CPU, memory, disk stats |
| `GET` | `/api/system/health` | Service health checks |
| `GET` | `/api/system/devices` | Paired devices |
| `GET` | `/api/sessions` | Active sessions |
| `GET` | `/api/sessions/list` | All sessions with details |
| `PATCH` | `/api/sessions/{id}` | Update session settings |
| `DELETE` | `/api/sessions/{id}` | Delete a session |
| `GET` | `/api/sessions/{id}/usage` | Session token usage |
| `GET` | `/api/sessions/{id}/history` | Session chat history |
| `GET` | `/api/sessions/usage/timeseries` | Usage over time |
| `GET` | `/api/debug/health` | Detailed health check |
| `GET` | `/api/debug/status` | Full system status |
| `GET` | `/api/debug/presence` | System presence |
| `GET` | `/api/debug/gateway` | Gateway connection test |
| `GET` | `/api/debug/sessions` | Sessions with usage |
| `GET` | `/api/debug/logs` | Recent log tail |
| `GET` | `/api/debug/filesystem` | Filesystem checks |
| `GET` | `/api/pipelines` | Discovered pipelines |
| `GET` | `/api/agents` | Discovered agents |
| `GET` | `/api/skills` | Skills (search, filter, paginate) |
| `GET` | `/api/skills/categories` | Skill category counts |
| `GET` | `/api/skills/{name}` | Skill detail + README |
| `GET` | `/api/discovery` | Full discovery result |
| `POST` | `/api/discovery/refresh` | Trigger re-scan |
| `GET` | `/api/logs/files` | Available log files |
| `GET` | `/api/logs/tail` | Tail a log file |
| `POST` | `/api/chat` | Send message to gateway |
| `GET` | `/api/chat/status` | Gateway availability |
| `WS` | `/ws/chat` | WebSocket chat |
| `WS` | `/ws/realtime` | Real-time overview updates |

Interactive API docs available at `/docs` when the server is running.

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

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `g` then `o` | Go to Overview |
| `g` then `j` | Go to Jobs |
| `g` then `p` | Go to Pipelines |
| `g` then `a` | Go to Agents |
| `g` then `s` | Go to Skills |
| `g` then `m` | Go to Metrics |
| `g` then `l` | Go to Logs |
| `g` then `c` | Go to Chat |
| `/` | Focus search |
| `Esc` | Close modals |

## Environment Variables

All variables are prefixed with `OPENCLAW_DASH_`. See [`backend/.env.example`](backend/.env.example) for the full list.

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_DIR` | `~/.openclaw` | OpenClaw installation path |
| `GATEWAY_URL` | `http://localhost:18789` | Gateway HTTP URL |
| `GATEWAY_WS_URL` | `ws://127.0.0.1:18789` | Gateway WebSocket URL |
| `PORT` | `8765` | Server port |
| `DISCOVERY_INTERVAL_SECONDS` | `300` | Auto-discovery refresh interval |

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

## License

[MIT](LICENSE)
