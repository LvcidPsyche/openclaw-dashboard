"""Job listing, CRUD, and control endpoints using gateway RPC."""

import re
from typing import List
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse

from app.models.schemas import JobStatus, JobControl
from app.services.job_service import get_jobs_list, get_job_history, control_job
from app.services.gateway_rpc import gateway_call

router = APIRouter(tags=["jobs"])


def _validate_cron_expr(expr: str) -> bool:
    """Basic cron expression validation (5 or 6 fields)."""
    parts = expr.strip().split()
    if len(parts) not in (5, 6):
        return False
    # Each field should contain valid cron characters
    pattern = re.compile(r'^[\d\*,\-/]+$')
    return all(pattern.match(p) for p in parts)


@router.get("/api/jobs", response_model=List[JobStatus])
async def list_jobs():
    # Try RPC first, fall back to file
    try:
        result = await gateway_call("cron.list")
        if result.get("ok") and result.get("result"):
            return result["result"].get("jobs", [])
    except Exception:
        pass
    return get_jobs_list()


@router.get("/api/jobs/{job_id}/history")
async def job_history(job_id: str, limit: int = Query(50, le=500)):
    # Try RPC first
    try:
        result = await gateway_call("cron.runs", {"jobId": job_id, "limit": limit})
        if result.get("ok") and result.get("result"):
            runs = result["result"].get("runs", [])
            return {"job_id": job_id, "count": len(runs), "history": runs}
    except Exception:
        pass
    history = get_job_history(job_id, limit)
    return {"job_id": job_id, "count": len(history), "history": history}


@router.post("/api/jobs")
async def create_job(data: dict):
    """Create a new cron job via gateway RPC."""
    name = (data.get("name") or "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Job name is required")
    if len(name) > 200:
        raise HTTPException(status_code=400, detail="Job name too long")

    schedule_type = data.get("scheduleType", "cron")
    if schedule_type == "cron":
        expr = data.get("cronExpression", "").strip()
        if not expr or not _validate_cron_expr(expr):
            raise HTTPException(status_code=400, detail="Invalid cron expression")
        schedule = {"kind": "cron", "expr": expr}
    else:
        interval = data.get("intervalMs", 0)
        if not isinstance(interval, int) or interval < 60000:
            raise HTTPException(status_code=400, detail="Interval must be at least 60000ms")
        schedule = {"kind": "every", "everyMs": interval}

    params = {
        "name": name,
        "schedule": schedule,
        "enabled": data.get("enabled", True),
        "message": data.get("message", ""),
        "agent": data.get("agent", "main"),
        "model": data.get("model", ""),
        "timeout": data.get("timeout", 300000),
    }

    try:
        result = await gateway_call("cron.add", params)
        if result.get("ok"):
            return {"status": "created", "job": result.get("result", {})}
        return JSONResponse({"error": result.get("error", "Failed to create job")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.put("/api/jobs/{job_id}")
async def update_job(job_id: str, data: dict):
    """Update an existing cron job via gateway RPC."""
    params = {"id": job_id}

    if "name" in data:
        name = data["name"].strip()
        if not name:
            raise HTTPException(status_code=400, detail="Job name cannot be empty")
        params["name"] = name

    if "scheduleType" in data:
        if data["scheduleType"] == "cron":
            expr = data.get("cronExpression", "").strip()
            if not expr or not _validate_cron_expr(expr):
                raise HTTPException(status_code=400, detail="Invalid cron expression")
            params["schedule"] = {"kind": "cron", "expr": expr}
        else:
            interval = data.get("intervalMs", 0)
            if not isinstance(interval, int) or interval < 60000:
                raise HTTPException(status_code=400, detail="Interval must be at least 60000ms")
            params["schedule"] = {"kind": "every", "everyMs": interval}

    if "enabled" in data:
        params["enabled"] = bool(data["enabled"])
    if "message" in data:
        params["message"] = data["message"]
    if "agent" in data:
        params["agent"] = data["agent"]
    if "model" in data:
        params["model"] = data["model"]
    if "timeout" in data:
        params["timeout"] = data["timeout"]

    try:
        result = await gateway_call("cron.update", params)
        if result.get("ok"):
            return {"status": "updated", "job": result.get("result", {})}
        return JSONResponse({"error": result.get("error", "Failed to update job")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/api/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a cron job via gateway RPC."""
    try:
        result = await gateway_call("cron.remove", {"id": job_id})
        if result.get("ok"):
            return {"status": "deleted", "job_id": job_id}
        return JSONResponse({"error": result.get("error", "Failed to delete job")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/jobs/{job_id}/run")
async def run_job(job_id: str):
    """Trigger immediate job run via gateway RPC."""
    try:
        result = await gateway_call("cron.run", {"id": job_id})
        if result.get("ok"):
            return {"status": "triggered", "job_id": job_id}
        return JSONResponse({"error": result.get("error", "Failed to trigger job")}, status_code=500)
    except ConnectionError:
        # Fallback to file-based control
        return control_job(job_id, "run_now")
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/jobs/control")
async def job_control(ctrl: JobControl):
    result = control_job(ctrl.job_id, ctrl.action)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
