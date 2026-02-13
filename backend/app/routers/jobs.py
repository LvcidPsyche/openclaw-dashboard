"""Job listing and control endpoints."""

from typing import List
from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import JobStatus, JobControl
from app.services.job_service import get_jobs_list, get_job_history, control_job

router = APIRouter(tags=["jobs"])


@router.get("/api/jobs", response_model=List[JobStatus])
async def list_jobs():
    return get_jobs_list()


@router.get("/api/jobs/{job_id}/history")
async def job_history(job_id: str, limit: int = Query(50, le=500)):
    history = get_job_history(job_id, limit)
    return {"job_id": job_id, "count": len(history), "history": history}


@router.post("/api/jobs/control")
async def job_control(ctrl: JobControl):
    result = control_job(ctrl.job_id, ctrl.action)
    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])
    return result
