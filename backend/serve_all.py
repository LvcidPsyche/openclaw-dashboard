"""
OpenClaw Dashboard - Unified Server
Everything on port 8765, chat routes to 18789
"""
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import sys

sys.path.insert(0, str(Path(__file__).parent))
from main import (
    get_overview, get_jobs, get_job_execution_history,
    get_token_metrics, get_paired_devices, get_system_health,
    websocket_endpoint, health_check, chat_proxy, chat_stream_proxy,
)

app = FastAPI(title="OpenClaw Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.get("/api/v1/overview")(get_overview)
app.get("/api/v1/jobs")(get_jobs)
app.get("/api/v1/jobs/{job_id}/history")(get_job_execution_history)
app.get("/api/v1/metrics/tokens")(get_token_metrics)
app.get("/api/v1/devices")(get_paired_devices)
app.get("/api/v1/health")(get_system_health)
app.websocket("/ws/realtime")(websocket_endpoint)
app.get("/health")(health_check)
app.post("/api/chat")(chat_proxy)
app.post("/api/chat/stream")(chat_stream_proxy)

# Frontend - Mount static files first, then define routes
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    # Mount static files FIRST so they take precedence
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

    @app.get("/")
    async def root():
        return FileResponse(frontend_dist / "index.html")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🎉 OpenClaw Dashboard - All on Port 8765!")
    print("="*60)
    print(f"\n📊 Dashboard:  http://localhost:8765")
    print(f"💬 Chat:       Routes to Gateway (18789)")
    print(f"\nPress Ctrl+C to stop\n")
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="error")
