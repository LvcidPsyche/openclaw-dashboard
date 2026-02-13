"""Discovery API — pipelines, agents, skills."""

from typing import Optional
from fastapi import APIRouter, Query

from app.discovery.engine import run_discovery, get_cached_result

router = APIRouter(tags=["discovery"])


@router.get("/api/discovery")
async def full_discovery():
    result = get_cached_result()
    if not result:
        result = run_discovery()
    return result


@router.post("/api/discovery/refresh")
async def refresh_discovery():
    result = run_discovery()
    return {"status": "refreshed", "metrics": result.get("metrics", {})}


@router.get("/api/pipelines")
async def list_pipelines():
    result = get_cached_result()
    if not result:
        result = run_discovery()
    return {"pipelines": result.get("pipelines", []), "total": len(result.get("pipelines", []))}


@router.get("/api/pipelines/{pipeline_id}")
async def get_pipeline(pipeline_id: str):
    result = get_cached_result()
    if not result:
        result = run_discovery()
    for p in result.get("pipelines", []):
        if p["id"] == pipeline_id:
            return p
    return {"error": "Pipeline not found"}


@router.get("/api/agents")
async def list_agents():
    result = get_cached_result()
    if not result:
        result = run_discovery()
    return {"agents": result.get("agents", []), "total": len(result.get("agents", []))}


@router.get("/api/skills")
async def list_skills(
    category: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
):
    result = get_cached_result()
    if not result:
        result = run_discovery()
    skills = result.get("skills", [])

    if category:
        skills = [s for s in skills if s["category"] == category]
    if search:
        q = search.lower()
        skills = [s for s in skills if q in s["name"].lower() or q in s.get("description", "").lower()]

    total = len(skills)
    start = (page - 1) * limit
    page_skills = skills[start : start + limit]

    return {"skills": page_skills, "total": total, "page": page, "limit": limit}


@router.get("/api/skills/categories")
async def skill_categories():
    result = get_cached_result()
    if not result:
        result = run_discovery()
    skills = result.get("skills", [])
    cats: dict = {}
    for s in skills:
        c = s.get("category", "general")
        cats[c] = cats.get(c, 0) + 1
    return {"categories": [{"name": k, "count": v} for k, v in sorted(cats.items(), key=lambda x: -x[1])]}


@router.get("/api/skills/{skill_name}")
async def get_skill_detail(skill_name: str):
    result = get_cached_result()
    if not result:
        result = run_discovery()
    for s in result.get("skills", []):
        if s["name"] == skill_name:
            detail = dict(s)
            # Try to read README
            from pathlib import Path
            readme = Path(s["path"]) / "README.md"
            if readme.exists():
                try:
                    detail["readme"] = readme.read_text()[:5000]
                except Exception:
                    pass
            return detail
    return {"error": "Skill not found"}
