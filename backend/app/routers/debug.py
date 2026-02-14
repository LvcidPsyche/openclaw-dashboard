"""Debug and diagnostics endpoints using gateway RPC."""

import time
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.gateway_rpc import gateway_call, gateway_health_check

router = APIRouter(tags=["debug"])


@router.get("/api/debug/health")
async def debug_health():
    """Detailed health check via gateway RPC."""
    try:
        result = await gateway_call("health")
        if result.get("ok"):
            return result.get("result", {})
    except Exception:
        pass
    return {"status": "gateway_unreachable", "timestamp": time.time()}


@router.get("/api/debug/status")
async def debug_status():
    """Full system status via gateway RPC."""
    try:
        result = await gateway_call("status")
        if result.get("ok"):
            return result.get("result", {})
    except Exception:
        pass
    return {"status": "unavailable"}


@router.get("/api/debug/presence")
async def debug_presence():
    """System presence via gateway RPC."""
    try:
        result = await gateway_call("system-presence")
        if result.get("ok"):
            return result.get("result", {})
    except Exception:
        pass
    return {"presence": "unknown"}


@router.get("/api/debug/gateway")
async def debug_gateway():
    """Test gateway connection — connect and disconnect."""
    start = time.time()
    try:
        ok = await gateway_health_check()
        latency_ms = round((time.time() - start) * 1000)
        return {
            "connected": ok,
            "latency_ms": latency_ms,
            "gateway_url": settings.gateway_ws_url,
            "protocol_version": 3,
        }
    except Exception as e:
        latency_ms = round((time.time() - start) * 1000)
        return {
            "connected": False,
            "latency_ms": latency_ms,
            "gateway_url": settings.gateway_ws_url,
            "error": str(e),
        }


@router.get("/api/debug/sessions")
async def debug_sessions():
    """Sessions with usage via gateway RPC."""
    sessions = []
    try:
        result = await gateway_call("sessions.list")
        if result.get("ok"):
            sessions = result.get("result", {}).get("sessions", [])
    except Exception:
        pass

    # Try to get usage for each session
    enriched = []
    for s in sessions[:20]:
        session_data = dict(s) if isinstance(s, dict) else {"id": str(s)}
        try:
            sid = session_data.get("id", "")
            if sid:
                usage = await gateway_call("sessions.usage", {"sessionId": sid})
                if usage.get("ok"):
                    session_data["usage"] = usage.get("result", {})
        except Exception:
            pass
        enriched.append(session_data)

    return {"sessions": enriched}


@router.get("/api/debug/logs")
async def debug_logs():
    """Recent logs via gateway RPC."""
    try:
        result = await gateway_call("logs.tail", {"lines": 100})
        if result.get("ok"):
            return result.get("result", {})
    except Exception:
        pass

    # Fallback: read from log files directly
    logs_dir = settings.openclaw_dir / "logs"
    lines = []
    if logs_dir.exists():
        for log_file in sorted(logs_dir.glob("*.log"), key=lambda p: p.stat().st_mtime, reverse=True)[:1]:
            try:
                content = log_file.read_text()
                lines = content.strip().split("\n")[-100:]
            except Exception:
                pass
    return {"lines": lines, "source": "file"}


@router.get("/api/debug/filesystem")
async def debug_filesystem():
    """Check critical file system paths."""
    checks = {}
    paths = {
        "cron_dir": settings.openclaw_dir / "cron",
        "logs_dir": settings.openclaw_dir / "logs",
        "workspace": settings.openclaw_dir / "workspace",
        "sessions_dir": settings.openclaw_dir / "agents" / "main" / "sessions",
        "devices_dir": settings.openclaw_dir / "devices",
        "config_file": settings.openclaw_dir / "openclaw.json",
    }
    for name, path in paths.items():
        checks[name] = {
            "path": str(path),
            "exists": path.exists(),
            "readable": path.exists() and (path.is_file() or path.is_dir()),
        }
    return {"checks": checks}
