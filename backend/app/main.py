"""OpenClaw Dashboard — Unified FastAPI application.

Mounts all routers, serves the frontend build, and runs background tasks.
"""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import settings
from app.discovery.engine import run_discovery, needs_refresh, get_cached_result
from app.websocket.manager import manager

# Routers
from app.routers import overview, jobs, metrics, system, sessions, chat, logs, discovery


# ---------------------------------------------------------------------------
# Lifespan — startup / shutdown
# ---------------------------------------------------------------------------

async def _discovery_loop():
    """Background task: refresh discovery every N seconds."""
    while True:
        await asyncio.sleep(settings.discovery_interval_seconds)
        try:
            if needs_refresh():
                run_discovery()
        except Exception:
            pass


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"OpenClaw Dashboard starting on port {settings.port}")
    run_discovery()  # initial scan
    task = asyncio.create_task(_discovery_loop())
    yield
    # Shutdown
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


# ---------------------------------------------------------------------------
# App factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="OpenClaw Dashboard",
    description="Universal monitoring dashboard for OpenClaw AI agent workflows",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routers
app.include_router(overview.router)
app.include_router(jobs.router)
app.include_router(metrics.router)
app.include_router(system.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(logs.router)
app.include_router(discovery.router)

# --- Backward-compatible v1 aliases ---
# So old frontend code using /api/v1/... still works
from app.routers.overview import get_overview
from app.routers.jobs import list_jobs, job_history
from app.routers.metrics import token_metrics
from app.routers.system import list_devices, system_health, health_check

app.get("/api/v1/overview")(get_overview)
app.get("/api/v1/jobs")(list_jobs)
app.get("/api/v1/jobs/{job_id}/history")(job_history)
app.get("/api/v1/metrics/tokens")(token_metrics)
app.get("/api/v1/devices")(list_devices)
app.get("/api/v1/health")(system_health)

# v2 aliases
from app.routers.system import system_resources
from app.routers.metrics import timeseries as ts_endpoint, breakdown as bd_endpoint
from app.routers.jobs import job_control

app.get("/api/v2/system/resources")(system_resources)
app.get("/api/v2/metrics/timeseries")(ts_endpoint)
app.get("/api/v2/metrics/breakdown")(bd_endpoint)
app.post("/api/v2/jobs/control")(job_control)
app.get("/api/v2/sessions")(sessions.list_sessions)

# --- WebSocket for real-time updates ---
@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket, "realtime")
    try:
        while True:
            await websocket.receive_text()
            ov = await get_overview()
            await websocket.send_json({"type": "overview", "data": ov.dict()})
    except WebSocketDisconnect:
        manager.disconnect(websocket, "realtime")


# ---------------------------------------------------------------------------
# Frontend static files — SPA with fallback
# ---------------------------------------------------------------------------

frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"

if frontend_dist.exists():
    # Mount /assets directly
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(frontend_dist / "index.html")

    # SPA fallback — must NOT match /api, /ws, /health, /docs, /openapi.json, /redoc
    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith(("api/", "ws/", "health", "docs", "openapi.json", "redoc")):
            from fastapi.responses import JSONResponse
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        file_path = frontend_dist / full_path
        if file_path.exists() and file_path.is_file():
            return FileResponse(file_path)
        return FileResponse(frontend_dist / "index.html")


# ---------------------------------------------------------------------------
# Run with uvicorn
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import uvicorn
    print("\n" + "=" * 60)
    print("OpenClaw Dashboard — All on Port 8765")
    print("=" * 60)
    print(f"\n  Dashboard:  http://localhost:{settings.port}")
    print(f"  API Docs:   http://localhost:{settings.port}/docs")
    print(f"  Chat:       Routes to Gateway ({settings.gateway_url})")
    print(f"\nPress Ctrl+C to stop\n")
    uvicorn.run(app, host=settings.host, port=settings.port, log_level=settings.log_level)
