# OpenClaw Dashboard

Universal monitoring dashboard for OpenClaw AI agent workflows. Free and open-source.

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-green.svg)

## Features

- **Overview** — Real-time stats: jobs, CPU/memory/disk, tokens, costs, pipelines, agents, skills
- **Jobs** — View, search, sort, and control all cron jobs with enable/disable/run now
- **Pipelines** — Auto-discovered pipelines (HYDROFLOW, YouTube Empire, Content Factory, etc.)
- **Agents** — Detected agents with type classification and capabilities
- **Skills** — Browse 178+ installed skills with categories, search, and README viewer
- **Metrics** — Token usage charts, cost breakdown by model, daily trends with time range selector
- **System** — CPU/memory/disk gauges, health checks, paired devices, active sessions
- **Logs** — Real-time log file viewer with search and auto-scroll
- **Chat** — AI chat via WebSocket or HTTP streaming to OpenClaw gateway
- **Settings** — Discovery engine status, refresh, system info

## Architecture

**Backend:** FastAPI (Python) with modular router architecture
**Frontend:** React 19 + TypeScript + Vite + Tailwind CSS
**Discovery:** Auto-detection engine that scans workspace for pipelines, agents, skills

```
backend/
  app/
    main.py          # FastAPI app with all routers
    config.py        # Environment-based settings
    routers/         # API endpoint modules (overview, jobs, metrics, system, chat, logs, discovery)
    services/        # Business logic (job_service, cache_trace)
    discovery/       # Auto-discovery engine (ported from agent-console/discover.js)
    models/          # Pydantic schemas
    websocket/       # Multi-channel WebSocket manager

frontend/
  src/
    api/             # Typed API client + endpoints
    store/           # Zustand state management
    pages/           # 10 page components (Overview, Jobs, Pipelines, Agents, Skills, Metrics, System, Logs, Chat, Settings)
    components/      # Layout (Sidebar, Header), common (StatCard, StatusBadge, EmptyState)
    hooks/           # usePolling
    utils/           # Formatters
```

## Quick Start

```bash
# Backend
cd backend
pip install -r requirements.txt
PYTHONPATH=. python -m app.main

# Frontend (development)
cd frontend
npm install
npm run dev

# Frontend (production build)
npm run build
# Backend automatically serves the built frontend from frontend/dist/
```

The dashboard runs on a single port (8765) — backend serves both API and frontend static files.

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/overview` | Dashboard summary |
| `GET /api/jobs` | All cron jobs with status |
| `POST /api/jobs/control` | Enable/disable/run jobs |
| `GET /api/metrics/tokens` | Token usage by model |
| `GET /api/metrics/timeseries` | Time-series data |
| `GET /api/metrics/breakdown` | Usage breakdown |
| `GET /api/system/resources` | CPU/memory/disk |
| `GET /api/system/health` | Health checks |
| `GET /api/pipelines` | Discovered pipelines |
| `GET /api/agents` | Discovered agents |
| `GET /api/skills` | Skills with search/filter/pagination |
| `GET /api/skills/categories` | Skill categories |
| `GET /api/discovery` | Full discovery result |
| `POST /api/discovery/refresh` | Re-scan workspace |
| `GET /api/logs/files` | Available log files |
| `GET /api/logs/tail` | Tail log file |
| `POST /api/chat` | Chat proxy to gateway |
| `WS /ws/chat` | WebSocket chat |
| `WS /ws/realtime` | Real-time updates |

Backward-compatible v1/v2 aliases are available at `/api/v1/*` and `/api/v2/*`.

## Stack

- FastAPI + Uvicorn + Pydantic
- React 19 + TypeScript 5.9
- Tailwind CSS 4
- Recharts (charts)
- Zustand (state management)
- Lucide React (icons)
- React Router 7 (client-side routing)

## License

MIT — Free to use, modify, and distribute.

**Built with OpenClaw**
