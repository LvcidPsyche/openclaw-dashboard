"""OpenClaw Dashboard — Unified FastAPI application."""

import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from app.config import settings
from app.discovery.engine import run_discovery, needs_refresh
from app.websocket.manager import manager
from app.middleware.security import SecurityHeadersMiddleware, RequestSizeLimitMiddleware
from app.routers import (
    overview, jobs, metrics, system, sessions, chat, logs, discovery,
)
from app.routers import config as config_router
from app.routers import nodes, debug, sessions_mgmt


async def _discovery_loop():
    while True:
        await asyncio.sleep(settings.discovery_interval_seconds)
        try:
            if needs_refresh():
                run_discovery()
        except Exception:
            pass


@asynccontextmanager
async def lifespan(_app: FastAPI):
    run_discovery()
    task = asyncio.create_task(_discovery_loop())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(
    title="OpenClaw Dashboard",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url=None,
)

# Security middleware (outermost = processes first)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestSizeLimitMiddleware, max_size=2_097_152)  # 2MB
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8765",
        "http://127.0.0.1:8765",
        f"http://{settings.host}:8765" if settings.host != "0.0.0.0" else "http://localhost:8765",
        "http://76.13.114.80:8765",
    ],
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
app.include_router(config_router.router)
app.include_router(nodes.router)
app.include_router(debug.router)
app.include_router(sessions_mgmt.router)


# WebSocket for real-time overview updates
@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket, "realtime")
    try:
        while True:
            await websocket.receive_text()
            ov = await overview.get_overview()
            await websocket.send_json({"type": "overview", "data": ov.dict()})
    except WebSocketDisconnect:
        manager.disconnect(websocket, "realtime")


# Frontend static files + SPA fallback
frontend_dist = Path(__file__).parent.parent.parent / "frontend" / "dist"

if frontend_dist.exists():
    assets_dir = frontend_dist / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    async def serve_root():
        return FileResponse(frontend_dist / "index.html")

    @app.get("/{full_path:path}")
    async def spa_fallback(full_path: str):
        if full_path.startswith(("api/", "ws/", "health", "docs", "openapi")):
            return JSONResponse({"detail": "Not Found"}, status_code=404)
        fp = frontend_dist / full_path
        if fp.exists() and fp.is_file():
            return FileResponse(fp)
        return FileResponse(frontend_dist / "index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port, log_level=settings.log_level)
