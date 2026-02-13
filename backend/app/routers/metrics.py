"""Token usage and metrics endpoints."""

from fastapi import APIRouter, Query
from app.services.cache_trace import analyze_token_usage, get_timeseries, get_breakdown

router = APIRouter(tags=["metrics"])


@router.get("/api/metrics/tokens")
async def token_metrics(days: int = Query(7, le=30)):
    metrics = analyze_token_usage(days=days)
    return {
        "period_days": days,
        "models": list(metrics.values()),
        "total_tokens": sum(m["input_tokens"] + m["output_tokens"] for m in metrics.values()),
        "total_cost": round(sum(m["cost"] for m in metrics.values()), 2),
    }


@router.get("/api/metrics/timeseries")
async def timeseries(metric: str = "tokens", hours: int = Query(24, le=168)):
    data = get_timeseries(metric=metric, hours=hours)
    return {"metric": metric, "data": data}


@router.get("/api/metrics/breakdown")
async def breakdown():
    return get_breakdown()
