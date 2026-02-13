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
from app.routers import overview, jobs, metrics, system, sessions, chat, logs, discovery


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
    redoc_url=None,  # disable redoc to save a route
)

app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(overview.router)
app.include_router(jobs.router)
app.include_router(metrics.router)
app.include_router(system.router)
app.include_router(sessions.router)
app.include_router(chat.router)
app.include_router(logs.router)
app.include_router(discovery.router)


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
