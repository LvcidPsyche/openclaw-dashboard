"""Dashboard overview endpoint."""

from datetime import datetime
from fastapi import APIRouter
from app.models.schemas import DashboardOverview
from app.services.job_service import get_cron_jobs_raw, get_session_count
from app.services.cache_trace import analyze_token_usage

router = APIRouter(tags=["overview"])


@router.get("/api/overview", response_model=DashboardOverview)
async def get_overview():
    jobs_data = get_cron_jobs_raw()
    jobs = jobs_data.get("jobs", [])

    total_jobs = len(jobs)
    active_jobs = sum(1 for j in jobs if j.get("enabled", False))
    error_jobs = sum(1 for j in jobs if j.get("state", {}).get("lastStatus") == "error")

    token_metrics = analyze_token_usage(days=1)
    tokens_today = sum(m["input_tokens"] + m["output_tokens"] for m in token_metrics.values())
    cost_today = sum(m["cost"] for m in token_metrics.values())

    uptime = ((total_jobs - error_jobs) / total_jobs * 100) if total_jobs > 0 else 100.0

    # Discovery counts (lazy import to avoid circular)
    from app.discovery.engine import get_cached_result
    disc = get_cached_result()

    return DashboardOverview(
        total_jobs=total_jobs,
        active_jobs=active_jobs,
        error_jobs=error_jobs,
        tokens_today=tokens_today,
        cost_today=round(cost_today, 2),
        uptime_percent=round(uptime, 1),
        active_sessions=get_session_count(),
        last_updated=datetime.now().isoformat(),
        pipelines_count=len(disc.get("pipelines", [])),
        agents_count=len(disc.get("agents", [])),
        skills_count=len(disc.get("skills", [])),
    )
