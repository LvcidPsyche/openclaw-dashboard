"""Session management endpoints using gateway RPC."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.gateway_rpc import gateway_call
from app.services.job_service import get_sessions_detailed

router = APIRouter(tags=["sessions_mgmt"])


@router.get("/api/sessions/list")
async def list_sessions():
    """List all sessions — tries RPC, falls back to file."""
    try:
        result = await gateway_call("sessions.list")
        if result.get("ok"):
            return {"sessions": result.get("result", {}).get("sessions", [])}
    except Exception:
        pass
    return {"sessions": get_sessions_detailed()}


@router.get("/api/sessions/{session_id}/usage")
async def session_usage(session_id: str):
    """Get session usage/cost via RPC."""
    try:
        result = await gateway_call("sessions.usage", {"sessionId": session_id})
        if result.get("ok"):
            return result.get("result", {})
    except Exception:
        pass
    return {"error": "Usage data unavailable"}


@router.patch("/api/sessions/{session_id}")
async def update_session(session_id: str, data: dict):
    """Update session settings (model, thinking, reasoning) via RPC."""
    params = {"sessionId": session_id}
    if "model" in data:
        params["model"] = data["model"]
    if "thinking" in data:
        params["thinking"] = data["thinking"]
    if "reasoningLevel" in data:
        params["reasoningLevel"] = data["reasoningLevel"]
    if "budgetTokens" in data:
        params["budgetTokens"] = data["budgetTokens"]
    if "temperature" in data:
        params["temperature"] = data["temperature"]
    if "maxTokens" in data:
        params["maxTokens"] = data["maxTokens"]

    try:
        result = await gateway_call("sessions.patch", params)
        if result.get("ok"):
            return {"status": "updated", "session_id": session_id}
        return JSONResponse({"error": result.get("error", "Failed to update session")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.delete("/api/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a session via RPC."""
    try:
        result = await gateway_call("sessions.delete", {"sessionId": session_id})
        if result.get("ok"):
            return {"status": "deleted", "session_id": session_id}
        return JSONResponse({"error": result.get("error", "Failed to delete session")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/sessions/{session_id}/history")
async def session_history(session_id: str):
    """Get chat history for a session via RPC."""
    try:
        result = await gateway_call("chat.history", {"sessionId": session_id})
        if result.get("ok"):
            return {"messages": result.get("result", {}).get("messages", [])}
    except Exception:
        pass
    return {"messages": []}


@router.get("/api/sessions/usage/timeseries")
async def usage_timeseries():
    """Get usage timeseries via RPC."""
    try:
        result = await gateway_call("sessions.usage.timeseries")
        if result.get("ok"):
            return result.get("result", {})
    except Exception:
        pass
    return {"data": []}
