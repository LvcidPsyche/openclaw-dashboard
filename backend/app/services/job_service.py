"""Job data loading, formatting, and control."""

import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from app.config import settings


_cache: Dict = {}


def _cached(key: str, timeout: int, fn):
    now = time.time()
    if key in _cache:
        data, ts = _cache[key]
        if now - ts < timeout:
            return data
    result = fn()
    _cache[key] = (result, now)
    return result


def load_json(filepath: Path) -> Dict:
    try:
        if filepath.exists():
            return json.loads(filepath.read_text())
    except Exception:
        pass
    return {}


def load_jsonl(filepath: Path, limit: int = None) -> List[Dict]:
    lines = []
    try:
        if filepath.exists():
            with open(filepath) as f:
                for i, line in enumerate(f):
                    if limit and i >= limit:
                        break
                    try:
                        lines.append(json.loads(line.strip()))
                    except Exception:
                        continue
    except Exception:
        pass
    return lines


def get_cron_jobs_raw() -> Dict:
    return _cached("cron_jobs", 10, lambda: load_json(settings.openclaw_dir / "cron" / "jobs.json"))


def get_jobs_list() -> List[Dict]:
    jobs_data = get_cron_jobs_raw()
    jobs = jobs_data.get("jobs", [])
    result = []
    for job in jobs:
        state = job.get("state", {})
        schedule_info = job.get("schedule", {})

        if schedule_info.get("kind") == "cron":
            schedule = schedule_info.get("expr", "")
        elif schedule_info.get("kind") == "every":
            every_ms = schedule_info.get("everyMs", 0)
            schedule = f"Every {every_ms // 3600000}h" if every_ms >= 3600000 else f"Every {every_ms // 60000}m"
        else:
            schedule = "Unknown"

        last_run = None
        if state.get("lastRunAtMs"):
            last_run = datetime.fromtimestamp(state["lastRunAtMs"] / 1000).isoformat()

        next_run = None
        if state.get("nextRunAtMs"):
            next_run = datetime.fromtimestamp(state["nextRunAtMs"] / 1000).isoformat()

        result.append({
            "id": job.get("id", ""),
            "name": job.get("name", ""),
            "enabled": job.get("enabled", False),
            "schedule": schedule,
            "last_run": last_run,
            "last_status": state.get("lastStatus"),
            "last_duration": state.get("lastDurationMs"),
            "consecutive_errors": state.get("consecutiveErrors", 0),
            "next_run": next_run,
            "error_message": state.get("lastError"),
        })
    return result


def get_job_history(job_id: str, limit: int = 50) -> List[Dict]:
    runs_dir = settings.openclaw_dir / "cron" / "runs"
    if not runs_dir.exists():
        return []
    for run_file in runs_dir.glob("*.jsonl"):
        history = load_jsonl(run_file, limit=limit)
        if history and history[0].get("jobId") == job_id:
            return sorted(history, key=lambda x: x.get("ts", 0), reverse=True)[:limit]
    return []


def control_job(job_id: str, action: str) -> Dict:
    jobs_file = settings.openclaw_dir / "cron" / "jobs.json"
    if not jobs_file.exists():
        return {"error": "Jobs file not found"}

    data = json.loads(jobs_file.read_text())
    jobs = data.get("jobs", [])
    job = next((j for j in jobs if j.get("id") == job_id), None)
    if not job:
        return {"error": f"Job {job_id} not found"}

    if action == "enable":
        job["enabled"] = True
    elif action == "disable":
        job["enabled"] = False
    elif action == "clear_errors":
        state = job.get("state", {})
        state["consecutiveErrors"] = 0
        state["lastError"] = None
        job["state"] = state
    elif action == "run_now":
        return {"status": "triggered", "job_id": job_id}

    jobs_file.write_text(json.dumps(data, indent=2))
    # Invalidate cache
    _cache.pop("cron_jobs", None)
    return {"status": "success", "job_id": job_id, "action": action}


def get_session_count() -> int:
    return _cached("session_count", 30, lambda: _count_sessions())


def _count_sessions() -> int:
    sessions_dir = settings.openclaw_dir / "agents" / "main" / "sessions"
    try:
        return len(list(sessions_dir.glob("*.jsonl")))
    except Exception:
        return 0


def get_sessions_detailed() -> List[Dict]:
    sessions_dir = settings.openclaw_dir / "agents" / "main" / "sessions"
    sessions = []
    if not sessions_dir.exists():
        return sessions
    for sf in sorted(sessions_dir.glob("*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True)[:20]:
        try:
            lines = sf.read_text().strip().split("\n")
            if lines:
                first = json.loads(lines[0])
                last = json.loads(lines[-1])
                sessions.append({
                    "id": sf.stem,
                    "started": first.get("timestamp", ""),
                    "last_activity": last.get("timestamp", ""),
                    "messages": len(lines),
                    "model": last.get("model", "unknown"),
                    "status": "active" if len(lines) < 100 else "archived",
                })
        except Exception:
            continue
    return sessions


def get_devices() -> List[Dict]:
    devices_data = load_json(settings.openclaw_dir / "devices" / "paired.json")
    result = []
    for device_id, device in devices_data.items():
        last_used = "Never"
        lu_ms = device.get("tokens", {}).get("operator", {}).get("lastUsedAtMs")
        if lu_ms:
            last_used = datetime.fromtimestamp(lu_ms / 1000).isoformat()
        created_at = "Unknown"
        if device.get("createdAtMs"):
            created_at = datetime.fromtimestamp(device["createdAtMs"] / 1000).isoformat()
        result.append({
            "device_id": device_id[:16] + "...",
            "platform": device.get("platform", "unknown"),
            "client_id": device.get("clientId", "unknown"),
            "role": device.get("role", "unknown"),
            "last_used": last_used,
            "created_at": created_at,
        })
    return result
