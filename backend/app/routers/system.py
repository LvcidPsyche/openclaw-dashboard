"""System resources, health, and device endpoints."""

import psutil
import time
from datetime import datetime
from typing import List
from fastapi import APIRouter

from app.config import settings
from app.models.schemas import SystemResources, DeviceInfo
from app.services.job_service import get_session_count, get_devices

router = APIRouter(tags=["system"])

# Cache psutil results for 2 seconds — avoid blocking interval calls
_sys_cache: dict = {}
_sys_cache_time = 0.0


@router.get("/api/system/resources", response_model=SystemResources)
async def system_resources():
    global _sys_cache, _sys_cache_time
    now = time.time()
    if _sys_cache and now - _sys_cache_time < 2:
        return SystemResources(**_sys_cache)

    # interval=None is non-blocking (returns since last call)
    cpu = psutil.cpu_percent(interval=None)
    mem = psutil.virtual_memory()
    disk = psutil.disk_usage("/")
    load = psutil.getloadavg()
    data = {
        "cpu_percent": cpu,
        "memory_percent": mem.percent,
        "memory_used_gb": round(mem.used / (1024**3), 2),
        "memory_total_gb": round(mem.total / (1024**3), 2),
        "disk_percent": disk.percent,
        "disk_used_gb": round(disk.used / (1024**3), 2),
        "disk_total_gb": round(disk.total / (1024**3), 2),
        "load_average": list(load),
    }
    _sys_cache = data
    _sys_cache_time = now
    return SystemResources(**data)


@router.get("/api/system/health")
async def system_health():
    od = settings.openclaw_dir
    backup_dir = od / "backups"
    latest_backup = None
    if backup_dir.exists():
        backups = sorted(backup_dir.glob("2026*"), reverse=True)
        if backups:
            latest_backup = backups[0].name

    security_dir = od / "security"
    latest_security = None
    if security_dir.exists():
        checks = sorted(security_dir.glob("security-check-*.log"), reverse=True)
        if checks:
            latest_security = checks[0].name

    return {
        "status": "healthy",
        "checks": {
            "openclaw_dir": od.exists(),
            "cron_configured": (od / "cron" / "jobs.json").exists(),
            "sessions_active": get_session_count() > 0,
            "devices_paired": len(get_devices()) > 0,
            "latest_backup": latest_backup,
            "latest_security_check": latest_security,
        },
        "timestamp": datetime.now().isoformat(),
    }


@router.get("/api/devices", response_model=List[DeviceInfo])
async def list_devices():
    return get_devices()


@router.get("/health")
async def health_check():
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.gateway_url}/health", timeout=1.0)
            return {
                "status": "healthy" if resp.status_code == 200 else "unhealthy",
                "gateway": settings.gateway_url,
                "gateway_status": resp.status_code,
            }
    except Exception:
        return {
            "status": "degraded",
            "gateway": settings.gateway_url,
            "gateway_status": "unreachable",
        }
