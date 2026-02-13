"""Chat proxy to OpenClaw Gateway — HTTP and WebSocket.
Handles gateway-down gracefully with clear error messages.
"""

import asyncio
import httpx
from fastapi import APIRouter, Request, WebSocket, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse

from app.config import settings

router = APIRouter(tags=["chat"])


def _headers():
    h = {}
    if settings.gateway_token:
        h["Authorization"] = f"Bearer {settings.gateway_token}"
    return h


@router.get("/api/chat/status")
async def chat_status():
    """Check if the gateway is reachable before attempting chat."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.gateway_url}/health", timeout=1.0)
            return {"available": resp.status_code == 200, "gateway": settings.gateway_url}
    except Exception:
        return {"available": False, "gateway": settings.gateway_url}


@router.post("/api/chat")
async def chat_proxy(request: Request):
    data = await request.json()
    message = data.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"{settings.gateway_url}/api/chat",
                json={"message": message, "session_id": data.get("sessionId", "dashboard")},
                headers=_headers(),
                timeout=30.0,
            )
            if resp.status_code == 200:
                return resp.json()
            raise HTTPException(status_code=resp.status_code, detail="Gateway error")
    except httpx.ConnectError:
        return JSONResponse(
            {"error": "OpenClaw gateway is not running. Start it with: openclaw gateway start"},
            status_code=503,
        )
    except httpx.TimeoutException:
        return JSONResponse({"error": "Gateway timeout"}, status_code=504)


@router.post("/api/chat/stream")
async def chat_stream(request: Request):
    data = await request.json()
    message = data.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    async def generate():
        try:
            async with httpx.AsyncClient() as client:
                async with client.stream(
                    "POST",
                    f"{settings.gateway_url}/api/chat/stream",
                    json={"message": message, "session_id": data.get("sessionId", "dashboard")},
                    headers=_headers(),
                    timeout=60.0,
                ) as resp:
                    async for chunk in resp.aiter_text():
                        yield chunk
        except (httpx.ConnectError, httpx.TimeoutException):
            yield '{"error":"Gateway unavailable"}'

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        import websockets
        uri = f"{settings.gateway_ws_url}?token={settings.gateway_token}"
        async with websockets.connect(uri, open_timeout=3) as gw:
            async def to_client():
                try:
                    async for msg in gw:
                        await websocket.send_text(msg)
                except Exception:
                    pass

            async def to_gateway():
                try:
                    while True:
                        msg = await websocket.receive_text()
                        await gw.send(msg)
                except Exception:
                    pass

            await asyncio.gather(to_client(), to_gateway(), return_exceptions=True)
    except Exception:
        try:
            await websocket.send_json({
                "type": "connection_error",
                "error": "Gateway unavailable. Start with: openclaw gateway start",
            })
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
