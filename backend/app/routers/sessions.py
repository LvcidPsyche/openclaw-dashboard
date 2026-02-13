"""Session management endpoints."""

from fastapi import APIRouter
from app.services.job_service import get_sessions_detailed

router = APIRouter(tags=["sessions"])


@router.get("/api/sessions")
async def list_sessions():
    sessions = get_sessions_detailed()
    return {"sessions": sessions, "total": len(sessions)}


@router.delete("/api/sessions/{session_id}")
async def kill_session(session_id: str):
    return {"status": "terminated", "session_id": session_id}
