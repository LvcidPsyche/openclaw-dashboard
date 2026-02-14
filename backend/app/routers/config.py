"""Configuration management endpoints using gateway RPC."""

import json
from pathlib import Path
from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.gateway_rpc import gateway_call

router = APIRouter(tags=["config"])

# Keys that must never be exposed in API responses
_SECRET_PATHS = {"gateway.auth.token", "auth.profiles"}


def _redact_secrets(data: dict, prefix: str = "") -> dict:
    """Recursively redact secret values from config."""
    result = {}
    for k, v in data.items():
        path = f"{prefix}.{k}" if prefix else k
        if any(path.startswith(s) for s in _SECRET_PATHS):
            if isinstance(v, str):
                result[k] = "***REDACTED***"
            elif isinstance(v, dict):
                result[k] = {kk: "***REDACTED***" if isinstance(vv, str) else vv for kk, vv in v.items()}
            else:
                result[k] = "***REDACTED***"
        elif isinstance(v, dict):
            result[k] = _redact_secrets(v, path)
        else:
            result[k] = v
    return result


@router.get("/api/config")
async def get_config():
    """Get current config — tries RPC first, falls back to file."""
    try:
        result = await gateway_call("config.get")
        if result.get("ok") and result.get("result"):
            return _redact_secrets(result["result"])
    except Exception:
        pass
    # Fallback: read from file
    config_file = settings.openclaw_dir / "openclaw.json"
    try:
        if config_file.exists():
            data = json.loads(config_file.read_text())
            return _redact_secrets(data)
    except Exception:
        pass
    return {}


@router.get("/api/config/schema")
async def get_config_schema():
    """Get config schema via RPC."""
    try:
        result = await gateway_call("config.schema")
        if result.get("ok"):
            return result.get("result", {})
    except Exception:
        pass
    return {"error": "Schema not available"}


@router.put("/api/config")
async def update_config(data: dict):
    """Update config via gateway RPC."""
    # Never allow setting secret fields through the API
    flat = json.dumps(data)
    if "gateway_token" in flat or "auth_token" in flat:
        return JSONResponse({"error": "Cannot set auth tokens via API"}, status_code=400)

    try:
        result = await gateway_call("config.set", data)
        if result.get("ok"):
            return {"status": "updated"}
        return JSONResponse({"error": result.get("error", "Failed to update config")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/config/apply")
async def apply_config():
    """Apply config changes via gateway RPC."""
    try:
        result = await gateway_call("config.apply")
        if result.get("ok"):
            return {"status": "applied"}
        return JSONResponse({"error": result.get("error", "Failed to apply config")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.get("/api/config/models")
async def list_models():
    """Get available models via gateway RPC."""
    try:
        result = await gateway_call("models.list")
        if result.get("ok"):
            return {"models": result.get("result", {}).get("models", [])}
    except Exception:
        pass
    return {"models": []}


@router.get("/api/models")
async def list_models_alt():
    """Alias for /api/config/models — available models."""
    try:
        result = await gateway_call("models.list")
        if result.get("ok"):
            return {"models": result.get("result", {}).get("models", [])}
    except Exception:
        pass
    return {"models": []}
