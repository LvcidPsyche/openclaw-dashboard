"""Node and device management endpoints using gateway RPC."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.services.gateway_rpc import gateway_call
from app.services.job_service import get_devices

router = APIRouter(tags=["nodes"])


@router.get("/api/nodes")
async def list_nodes():
    """List connected nodes via gateway RPC."""
    try:
        result = await gateway_call("node.list")
        if result.get("ok"):
            return {"nodes": result.get("result", {}).get("nodes", [])}
    except Exception:
        pass
    return {"nodes": []}


@router.get("/api/nodes/devices")
async def list_devices():
    """List paired devices — tries RPC, falls back to file."""
    try:
        result = await gateway_call("device.pair.list")
        if result.get("ok"):
            return {"devices": result.get("result", {}).get("devices", [])}
    except Exception:
        pass
    # Fallback to file-based device list
    return {"devices": get_devices()}


@router.post("/api/nodes/devices/{device_id}/approve")
async def approve_device(device_id: str):
    """Approve a pending device pairing."""
    try:
        result = await gateway_call("device.pair.approve", {"deviceId": device_id})
        if result.get("ok"):
            return {"status": "approved", "device_id": device_id}
        return JSONResponse({"error": result.get("error", "Failed to approve")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/nodes/devices/{device_id}/reject")
async def reject_device(device_id: str):
    """Reject a pending device pairing."""
    try:
        result = await gateway_call("device.pair.reject", {"deviceId": device_id})
        if result.get("ok"):
            return {"status": "rejected", "device_id": device_id}
        return JSONResponse({"error": result.get("error", "Failed to reject")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/nodes/devices/{device_id}/revoke")
async def revoke_device(device_id: str):
    """Revoke a device token."""
    try:
        result = await gateway_call("device.token.revoke", {"deviceId": device_id})
        if result.get("ok"):
            return {"status": "revoked", "device_id": device_id}
        return JSONResponse({"error": result.get("error", "Failed to revoke")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)


@router.post("/api/nodes/devices/{device_id}/rotate")
async def rotate_device_token(device_id: str):
    """Rotate a device token."""
    try:
        result = await gateway_call("device.token.rotate", {"deviceId": device_id})
        if result.get("ok"):
            return {"status": "rotated", "device_id": device_id}
        return JSONResponse({"error": result.get("error", "Failed to rotate")}, status_code=500)
    except ConnectionError:
        return JSONResponse({"error": "Gateway unavailable"}, status_code=503)
    except Exception as e:
        return JSONResponse({"error": str(e)}, status_code=500)
