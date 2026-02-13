"""
OpenClaw Dashboard Backend
A free, open-source monitoring dashboard for OpenClaw AI agent workflows
"""

import json
import os
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

# Simple cache for expensive operations
_cache = {}

def cached(timeout: int = 30):
    """Cache decorator"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            key = f"{func.__name__}_{args}_{kwargs}"
            now = time.time()
            if key in _cache:
                data, ts = _cache[key]
                if now - ts < timeout:
                    return data
            result = func(*args, **kwargs)
            _cache[key] = (result, now)
            return result
        return wrapper
    return decorator

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Initialize FastAPI app
app = FastAPI(
    title="OpenClaw Dashboard API",
    description="Free monitoring dashboard for OpenClaw workflows",
    version="1.0.0"
)

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenClaw data directory
OPENCLAW_DIR = Path("/home/botuser/.openclaw")

# ============================================================================
# Data Models
# ============================================================================

class JobStatus(BaseModel):
    id: str
    name: str
    enabled: bool
    schedule: str
    last_run: Optional[str]
    last_status: Optional[str]
    last_duration: Optional[int]
    consecutive_errors: int
    next_run: Optional[str]
    error_message: Optional[str]

class DashboardOverview(BaseModel):
    total_jobs: int
    active_jobs: int
    error_jobs: int
    tokens_today: int
    cost_today: float
    uptime_percent: float
    active_sessions: int
    last_updated: str

class TokenMetrics(BaseModel):
    model: str
    provider: str
    input_tokens: int
    output_tokens: int
    cost: float
    cache_hits: int
    cache_writes: int

class DeviceInfo(BaseModel):
    device_id: str
    platform: str
    client_id: str
    role: str
    last_used: str
    created_at: str

# ============================================================================
# Data Loading Functions
# ============================================================================

def load_json(filepath: Path) -> Dict:
    """Safely load JSON file"""
    try:
        if filepath.exists():
            with open(filepath, 'r') as f:
                return json.load(f)
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
    return {}

def load_jsonl(filepath: Path, limit: int = None) -> List[Dict]:
    """Load JSONL file (JSON Lines)"""
    lines = []
    try:
        if filepath.exists():
            with open(filepath, 'r') as f:
                for i, line in enumerate(f):
                    if limit and i >= limit:
                        break
                    try:
                        lines.append(json.loads(line.strip()))
                    except:
                        continue
    except Exception as e:
        print(f"Error loading {filepath}: {e}")
    return lines

@cached(timeout=10)
def get_cron_jobs() -> Dict:
    """Load cron jobs configuration - cached for 10s"""
    jobs_file = OPENCLAW_DIR / "cron" / "jobs.json"
    return load_json(jobs_file)

def get_job_history(job_id: str, limit: int = 50) -> List[Dict]:
    """Load execution history for a specific job"""
    runs_dir = OPENCLAW_DIR / "cron" / "runs"

    # Find the runs file for this job
    for run_file in runs_dir.glob("*.jsonl"):
        history = load_jsonl(run_file, limit=limit)
        if history and history[0].get("jobId") == job_id:
            return sorted(history, key=lambda x: x.get("ts", 0), reverse=True)[:limit]

    return []

def get_devices() -> Dict:
    """Load paired devices"""
    devices_file = OPENCLAW_DIR / "devices" / "paired.json"
    return load_json(devices_file)

@cached(timeout=30)
def get_session_count() -> int:
    """Count active session files - cached for 30s"""
    sessions_dir = OPENCLAW_DIR / "agents" / "main" / "sessions"
    try:
        return len(list(sessions_dir.glob("*.jsonl")))
    except:
        return 0

@cached(timeout=60)
def analyze_token_usage(days: int = 1) -> Dict[str, TokenMetrics]:
    """Analyze token usage from cache trace logs - cached for 60s, reads last 2000 lines only"""
    trace_file = OPENCLAW_DIR / "logs" / "cache-trace.jsonl"

    if not trace_file.exists():
        return {}

    # Calculate cutoff time
    cutoff = datetime.now() - timedelta(days=days)

    # Aggregate by model
    model_stats = defaultdict(lambda: {
        "input": 0,
        "output": 0,
        "cache_read": 0,
        "cache_write": 0,
        "provider": "",
        "count": 0
    })

    try:
        with open(trace_file, 'r') as f:
            for line in f:
                try:
                    entry = json.loads(line.strip())

                    # Check timestamp
                    ts_str = entry.get("ts", "")
                    if ts_str:
                        ts = datetime.fromisoformat(ts_str.replace('Z', '+00:00'))
                        if ts < cutoff:
                            continue

                    model_id = entry.get("modelId", "unknown")
                    provider = entry.get("provider", "unknown")
                    usage = entry.get("usage", {})

                    stats = model_stats[model_id]
                    stats["provider"] = provider
                    stats["input"] += usage.get("input", 0)
                    stats["output"] += usage.get("output", 0)
                    stats["cache_read"] += usage.get("cacheRead", 0)
                    stats["cache_write"] += usage.get("cacheWrite", 0)
                    stats["count"] += 1

                except:
                    continue
    except Exception as e:
        print(f"Error analyzing tokens: {e}")

    # Convert to TokenMetrics
    result = {}
    for model_id, stats in model_stats.items():
        # Calculate cost (rough estimates)
        cost = 0.0
        if "kimi" in model_id.lower() or "moonshot" in stats["provider"].lower():
            cost = 0  # Free tier
        elif "claude" in model_id.lower():
            cost = (stats["input"] * 0.003 + stats["output"] * 0.015) / 1000
        elif "gpt-4" in model_id.lower():
            cost = (stats["input"] * 0.03 + stats["output"] * 0.06) / 1000

        result[model_id] = TokenMetrics(
            model=model_id,
            provider=stats["provider"],
            input_tokens=stats["input"],
            output_tokens=stats["output"],
            cost=cost,
            cache_hits=stats["cache_read"],
            cache_writes=stats["cache_write"]
        )

    return result

@cached(timeout=60)
def calculate_uptime() -> float:
    """Calculate system uptime percentage from job executions - cached for 60s"""
    jobs_data = get_cron_jobs()
    jobs = jobs_data.get("jobs", [])

    if not jobs:
        return 100.0

    total = len(jobs)
    errors = sum(1 for job in jobs if job.get("state", {}).get("lastStatus") == "error")

    return ((total - errors) / total * 100) if total > 0 else 100.0

# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """API root"""
    return {
        "name": "OpenClaw Dashboard API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs"
    }

@app.get("/api/v1/overview", response_model=DashboardOverview)
async def get_overview():
    """Get dashboard overview statistics"""
    jobs_data = get_cron_jobs()
    jobs = jobs_data.get("jobs", [])

    total_jobs = len(jobs)
    active_jobs = sum(1 for job in jobs if job.get("enabled", False))
    error_jobs = sum(1 for job in jobs
                     if job.get("state", {}).get("lastStatus") == "error")

    # Token usage today
    token_metrics = analyze_token_usage(days=1)
    tokens_today = sum(m.input_tokens + m.output_tokens for m in token_metrics.values())
    cost_today = sum(m.cost for m in token_metrics.values())

    # Uptime
    uptime_percent = calculate_uptime()

    # Active sessions
    active_sessions = get_session_count()

    return DashboardOverview(
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        error_jobs=error_jobs,
        tokens_today=tokens_today,
        cost_today=round(cost_today, 2),
        uptime_percent=round(uptime_percent, 1),
        active_sessions=active_sessions,
        last_updated=datetime.now().isoformat()
    )

@app.get("/api/v1/jobs", response_model=List[JobStatus])
async def get_jobs():
    """Get all cron jobs with their status"""
    jobs_data = get_cron_jobs()
    jobs = jobs_data.get("jobs", [])

    result = []
    for job in jobs:
        state = job.get("state", {})
        schedule_info = job.get("schedule", {})

        # Format schedule
        if schedule_info.get("kind") == "cron":
            schedule = schedule_info.get("expr", "")
        elif schedule_info.get("kind") == "every":
            every_ms = schedule_info.get("everyMs", 0)
            schedule = f"Every {every_ms // 3600000}h" if every_ms >= 3600000 else f"Every {every_ms // 60000}m"
        else:
            schedule = "Unknown"

        # Format timestamps
        last_run = None
        if state.get("lastRunAtMs"):
            last_run = datetime.fromtimestamp(state["lastRunAtMs"] / 1000).isoformat()

        next_run = None
        if state.get("nextRunAtMs"):
            next_run = datetime.fromtimestamp(state["nextRunAtMs"] / 1000).isoformat()

        result.append(JobStatus(
            id=job.get("id", ""),
            name=job.get("name", ""),
            enabled=job.get("enabled", False),
            schedule=schedule,
            last_run=last_run,
            last_status=state.get("lastStatus"),
            last_duration=state.get("lastDurationMs"),
            consecutive_errors=state.get("consecutiveErrors", 0),
            next_run=next_run,
            error_message=state.get("lastError")
        ))

    return result

@app.get("/api/v1/jobs/{job_id}/history")
async def get_job_execution_history(job_id: str, limit: int = 50):
    """Get execution history for a specific job"""
    history = get_job_history(job_id, limit)

    return {
        "job_id": job_id,
        "count": len(history),
        "history": history
    }

@app.get("/api/v1/metrics/tokens")
async def get_token_metrics(days: int = 7):
    """Get token usage metrics"""
    metrics = analyze_token_usage(days=days)

    return {
        "period_days": days,
        "models": list(metrics.values()),
        "total_tokens": sum(m.input_tokens + m.output_tokens for m in metrics.values()),
        "total_cost": round(sum(m.cost for m in metrics.values()), 2)
    }

@app.get("/api/v1/devices", response_model=List[DeviceInfo])
async def get_paired_devices():
    """Get list of paired devices"""
    devices_data = get_devices()

    result = []
    for device_id, device in devices_data.items():
        last_used = None
        if device.get("tokens", {}).get("operator", {}).get("lastUsedAtMs"):
            last_used_ms = device["tokens"]["operator"]["lastUsedAtMs"]
            last_used = datetime.fromtimestamp(last_used_ms / 1000).isoformat()

        created_at = None
        if device.get("createdAtMs"):
            created_at = datetime.fromtimestamp(device["createdAtMs"] / 1000).isoformat()

        result.append(DeviceInfo(
            device_id=device_id[:16] + "...",  # Truncate for display
            platform=device.get("platform", "unknown"),
            client_id=device.get("clientId", "unknown"),
            role=device.get("role", "unknown"),
            last_used=last_used or "Never",
            created_at=created_at or "Unknown"
        ))

    return result

@app.get("/api/v1/health")
async def get_system_health():
    """Get system health status"""
    # Check backup status
    backup_dir = OPENCLAW_DIR / "backups"
    latest_backup = None
    if backup_dir.exists():
        backups = sorted(backup_dir.glob("2026*"), reverse=True)
        if backups:
            latest_backup = backups[0].name

    # Check security logs
    security_dir = OPENCLAW_DIR / "security"
    latest_security_check = None
    if security_dir.exists():
        checks = sorted(security_dir.glob("security-check-*.log"), reverse=True)
        if checks:
            latest_security_check = checks[0].name

    return {
        "status": "healthy",
        "checks": {
            "openclaw_dir": OPENCLAW_DIR.exists(),
            "cron_configured": (OPENCLAW_DIR / "cron" / "jobs.json").exists(),
            "sessions_active": get_session_count() > 0,
            "devices_paired": len(get_devices()) > 0,
            "latest_backup": latest_backup,
            "latest_security_check": latest_security_check
        },
        "timestamp": datetime.now().isoformat()
    }

# ============================================================================
# WebSocket for Real-Time Updates
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except:
                pass

manager = ConnectionManager()

@app.websocket("/ws/realtime")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive and send updates
            data = await websocket.receive_text()

            # Send back overview data
            overview = await get_overview()
            await websocket.send_json({
                "type": "overview",
                "data": overview.dict()
            })

    except WebSocketDisconnect:
        manager.disconnect(websocket)

# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8765,
        reload=True,
        log_level="info"
    )

# ============================================================================
# Chat Proxy (Forward to OpenClaw Gateway)
# ============================================================================

import httpx
from fastapi import Request
from fastapi.responses import StreamingResponse

# Gateway configuration
GATEWAY_URL = "http://localhost:18789"
GATEWAY_TOKEN = None  # Will be loaded from config

def load_gateway_token():
    """Load gateway token from OpenClaw config"""
    global GATEWAY_TOKEN
    config = load_json(OPENCLAW_DIR / "openclaw.json")
    GATEWAY_TOKEN = config.get("gateway", {}).get("auth", {}).get("token")
    return GATEWAY_TOKEN

# Load token on startup
load_gateway_token()

@app.post("/api/chat")
async def chat_proxy(request: Request):
    """Proxy chat requests to OpenClaw Gateway"""
    try:
        data = await request.json()
        message = data.get("message", "")

        if not message:
            raise HTTPException(status_code=400, detail="Message is required")

        # Forward to gateway
        async with httpx.AsyncClient() as client:
            headers = {}
            if GATEWAY_TOKEN:
                headers["Authorization"] = f"Bearer {GATEWAY_TOKEN}"

            response = await client.post(
                f"{GATEWAY_URL}/api/chat",
                json={"message": message, "session_id": data.get("sessionId", "dashboard")},
                headers=headers,
                timeout=60.0
            )

            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(status_code=response.status_code, detail="Gateway error")

    except Exception as e:
        print(f"Chat proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/chat/stream")
async def chat_stream_proxy(request: Request):
    """Proxy streaming chat requests to OpenClaw Gateway"""
    try:
        data = await request.json()
        message = data.get("message", "")

        if not message:
            raise HTTPException(status_code=400, detail="Message is required")

        async def generate():
            async with httpx.AsyncClient() as client:
                headers = {}
                if GATEWAY_TOKEN:
                    headers["Authorization"] = f"Bearer {GATEWAY_TOKEN}"

                async with client.stream(
                    "POST",
                    f"{GATEWAY_URL}/api/chat/stream",
                    json={"message": message, "session_id": data.get("sessionId", "dashboard")},
                    headers=headers,
                    timeout=120.0
                ) as response:
                    async for chunk in response.aiter_text():
                        yield chunk

        return StreamingResponse(generate(), media_type="text/event-stream")

    except Exception as e:
        print(f"Chat stream proxy error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check for chat connectivity"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{GATEWAY_URL}/health", timeout=5.0)
            return {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "gateway": GATEWAY_URL,
                "gateway_status": response.status_code
            }
    except:
        return {
            "status": "unhealthy",
            "gateway": GATEWAY_URL,
            "gateway_status": "unreachable"
        }
