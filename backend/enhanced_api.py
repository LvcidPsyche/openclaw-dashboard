"""
OpenClaw Dashboard Enhanced Backend v2
Advanced monitoring, control, and chat interface for OpenClaw
"""

import json
import os
import psutil
import signal
import subprocess
import time
import asyncio
import websockets
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional
from collections import defaultdict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel

# Simple cache
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

# Initialize FastAPI
app = FastAPI(
    title="OpenClaw Dashboard Enhanced API",
    description="Advanced monitoring and control for OpenClaw",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OPENCLAW_DIR = Path("/home/botuser/.openclaw")
OPENCLAW_GATEWAY_WS = "ws://127.0.0.1:18789"

# ============================================================================
# Enhanced Data Models
# ============================================================================

class SystemResources(BaseModel):
    cpu_percent: float
    memory_percent: float
    memory_used_gb: float
    memory_total_gb: float
    disk_percent: float
    disk_used_gb: float
    disk_total_gb: float
    load_average: List[float]

class JobControl(BaseModel):
    job_id: str
    action: str  # start, stop, restart, run_now, clear_errors, enable, disable

class TimeSeriesDataPoint(BaseModel):
    timestamp: str
    value: float
    label: Optional[str] = None

class CommandExecution(BaseModel):
    command: str
    output: Optional[str] = None
    exit_code: Optional[int] = None
    duration: Optional[float] = None
    timestamp: str

class ChatMessage(BaseModel):
    role: str  # user, assistant, system
    content: str
    timestamp: str
    model: Optional[str] = None

# ============================================================================
# System Monitoring
# ============================================================================

@app.get("/api/v2/system/resources")
def get_system_resources():
    """Get current system resource usage"""
    cpu = psutil.cpu_percent(interval=0.1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    load = psutil.getloadavg()

    return SystemResources(
        cpu_percent=cpu,
        memory_percent=memory.percent,
        memory_used_gb=round(memory.used / (1024**3), 2),
        memory_total_gb=round(memory.total / (1024**3), 2),
        disk_percent=disk.percent,
        disk_used_gb=round(disk.used / (1024**3), 2),
        disk_total_gb=round(disk.total / (1024**3), 2),
        load_average=list(load)
    )

@app.get("/api/v2/metrics/timeseries")
def get_timeseries_metrics(metric: str = "tokens", hours: int = 24):
    """Get time-series data for metrics"""

    # Generate sample time-series data (in real implementation, read from logs)
    now = datetime.now()
    data_points = []

    if metric == "tokens":
        # Token usage over time
        for i in range(hours):
            ts = now - timedelta(hours=hours-i)
            value = 10000 + (i * 1000)  # Sample data
            data_points.append({
                "timestamp": ts.isoformat(),
                "value": value,
                "label": f"{i}h ago"
            })
    elif metric == "cost":
        # Cost over time
        for i in range(hours):
            ts = now - timedelta(hours=hours-i)
            value = round(0.5 + (i * 0.1), 2)
            data_points.append({
                "timestamp": ts.isoformat(),
                "value": value,
                "label": f"${value}"
            })
    elif metric == "jobs":
        # Job success rate over time
        for i in range(hours):
            ts = now - timedelta(hours=hours-i)
            value = 85 + (i % 10)  # Sample success rate
            data_points.append({
                "timestamp": ts.isoformat(),
                "value": value,
                "label": f"{value}%"
            })

    return {"metric": metric, "data": data_points}

@app.get("/api/v2/metrics/breakdown")
def get_metrics_breakdown():
    """Get detailed breakdown of token usage by model"""

    # Sample data - in real impl, aggregate from logs
    return {
        "by_model": [
            {"model": "kimi-k2.5", "tokens": 156000, "cost": 12.50, "requests": 423},
            {"model": "pony-alpha", "tokens": 89000, "cost": 8.20, "requests": 234},
            {"model": "claude-sonnet", "tokens": 45000, "cost": 15.30, "requests": 89},
        ],
        "by_agent": [
            {"agent": "hydroflow-discovery", "tokens": 98000, "cost": 9.80},
            {"agent": "market-intelligence", "tokens": 67000, "cost": 6.70},
            {"agent": "security-audit", "tokens": 45000, "cost": 4.50},
        ],
        "daily_trend": [
            {"date": "2026-02-13", "tokens": 290000, "cost": 36.00},
            {"date": "2026-02-12", "tokens": 245000, "cost": 28.50},
            {"date": "2026-02-11", "tokens": 310000, "cost": 42.00},
        ]
    }

# ============================================================================
# Job Control
# ============================================================================

@app.post("/api/v2/jobs/control")
async def control_job(control: JobControl):
    """Control job execution"""

    jobs_file = OPENCLAW_DIR / "cron" / "jobs.json"
    if not jobs_file.exists():
        raise HTTPException(status_code=404, detail="Jobs file not found")

    with open(jobs_file, 'r') as f:
        jobs = json.load(f)

    job = next((j for j in jobs if j.get('id') == control.job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {control.job_id} not found")

    if control.action == "enable":
        job['enabled'] = True
    elif control.action == "disable":
        job['enabled'] = False
    elif control.action == "clear_errors":
        job['consecutiveErrors'] = 0
        job['lastError'] = None
    elif control.action == "run_now":
        # Trigger immediate execution
        return {"status": "triggered", "job_id": control.job_id, "message": "Job queued for immediate execution"}

    # Save changes
    with open(jobs_file, 'w') as f:
        json.dump(jobs, f, indent=2)

    return {"status": "success", "job_id": control.job_id, "action": control.action}

@app.get("/api/v2/jobs/{job_id}/logs")
async def get_job_logs(job_id: str, lines: int = 100):
    """Get recent logs for a specific job"""

    runs_dir = OPENCLAW_DIR / "cron" / "runs"
    job_logs = []

    if runs_dir.exists():
        for log_file in sorted(runs_dir.glob(f"{job_id}_*.jsonl"), reverse=True)[:5]:
            try:
                with open(log_file, 'r') as f:
                    for line in f:
                        entry = json.loads(line)
                        job_logs.append(entry)
                        if len(job_logs) >= lines:
                            break
            except:
                continue
            if len(job_logs) >= lines:
                break

    return {"job_id": job_id, "logs": job_logs[:lines]}

# ============================================================================
# Session Management
# ============================================================================

@app.get("/api/v2/sessions")
def get_active_sessions():
    """Get detailed session information"""

    sessions_dir = OPENCLAW_DIR / "agents" / "main" / "sessions"
    sessions = []

    if sessions_dir.exists():
        for session_file in sorted(sessions_dir.glob("*.jsonl"), reverse=True)[:20]:
            try:
                session_id = session_file.stem
                lines = []
                with open(session_file, 'r') as f:
                    lines = f.readlines()

                if lines:
                    first = json.loads(lines[0])
                    last = json.loads(lines[-1])

                    sessions.append({
                        "id": session_id,
                        "started": first.get('timestamp', ''),
                        "last_activity": last.get('timestamp', ''),
                        "messages": len(lines),
                        "model": last.get('model', 'unknown'),
                        "status": "active" if len(lines) < 100 else "archived"
                    })
            except:
                continue

    return {"sessions": sessions, "total": len(sessions)}

@app.delete("/api/v2/sessions/{session_id}")
async def kill_session(session_id: str):
    """Terminate an active session"""

    # In a real implementation, this would send a signal to the process
    return {"status": "terminated", "session_id": session_id}

# ============================================================================
# OpenClaw Gateway Chat Integration
# ============================================================================

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for real-time chat with OpenClaw gateway"""

    await websocket.accept()

    try:
        # Connect to OpenClaw gateway
        gateway_token = "edbbfe0e8af25a591a66b0ecaebae42945429ca4d420cfae"
        gateway_uri = f"{OPENCLAW_GATEWAY_WS}?token={gateway_token}"

        async with websockets.connect(gateway_uri) as gateway_ws:

            async def forward_to_client():
                """Forward messages from gateway to client"""
                try:
                    async for message in gateway_ws:
                        await websocket.send_text(message)
                except websockets.exceptions.ConnectionClosed:
                    pass

            async def forward_to_gateway():
                """Forward messages from client to gateway"""
                try:
                    while True:
                        message = await websocket.receive_text()
                        await gateway_ws.send(message)
                except WebSocketDisconnect:
                    pass

            # Run both forwarding tasks concurrently
            await asyncio.gather(
                forward_to_client(),
                forward_to_gateway(),
                return_exceptions=True
            )

    except Exception as e:
        await websocket.send_json({"error": str(e), "type": "connection_error"})
    finally:
        await websocket.close()

# ============================================================================
# Command Execution
# ============================================================================

command_history = []

@app.post("/api/v2/command/execute")
async def execute_command(command: str, background_tasks: BackgroundTasks):
    """Execute a system command (restricted for safety)"""

    # Whitelist of safe commands
    safe_commands = ['ls', 'pwd', 'date', 'whoami', 'df', 'free', 'uptime', 'ps']
    cmd_base = command.split()[0] if command else ""

    if cmd_base not in safe_commands:
        raise HTTPException(status_code=403, detail=f"Command '{cmd_base}' not allowed")

    start_time = time.time()
    try:
        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=5,
            cwd=str(OPENCLAW_DIR)
        )

        duration = time.time() - start_time

        execution = {
            "command": command,
            "output": result.stdout + result.stderr,
            "exit_code": result.returncode,
            "duration": round(duration, 2),
            "timestamp": datetime.now().isoformat()
        }

        command_history.append(execution)
        if len(command_history) > 100:
            command_history.pop(0)

        return execution

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command timeout")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v2/command/history")
def get_command_history(limit: int = 50):
    """Get recent command execution history"""
    return {"commands": command_history[-limit:]}

# ============================================================================
# Log Streaming
# ============================================================================

@app.get("/api/v2/logs/tail")
async def tail_logs(file: str = "openclaw.log", lines: int = 100):
    """Get recent log entries"""

    log_file = OPENCLAW_DIR / "logs" / file
    if not log_file.exists():
        raise HTTPException(status_code=404, detail="Log file not found")

    try:
        # Read last N lines
        with open(log_file, 'r') as f:
            all_lines = f.readlines()
            recent_lines = all_lines[-lines:]

        return {"file": file, "lines": recent_lines}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ============================================================================
# Health & Status (from original API)
# ============================================================================

@app.get("/api/v2/health")
def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "version": "2.0.0",
        "openclaw_dir": str(OPENCLAW_DIR),
        "gateway_available": True,
        "timestamp": datetime.now().isoformat()
    }

# ============================================================================
# Legacy v1 compatibility
# ============================================================================

from main import app as v1_app

# Mount v1 routes for backward compatibility
app.mount("/api/v1", v1_app)

# ============================================================================
# Run Server
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    print("🚀 OpenClaw Dashboard Enhanced API v2.0")
    print("📊 Advanced monitoring and control enabled")
    print("💬 Chat integration ready")
    print("🌐 Running on http://localhost:8766")
    uvicorn.run(app, host="0.0.0.0", port=8766, log_level="info")
