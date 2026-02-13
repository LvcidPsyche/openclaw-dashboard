"""Chat proxy to OpenClaw Gateway — HTTP and WebSocket."""

import asyncio
import httpx
from fastapi import APIRouter, Request, WebSocket, HTTPException
from fastapi.responses import StreamingResponse

from app.config import settings

router = APIRouter(tags=["chat"])


def _headers():
    h = {}
    if settings.gateway_token:
        h["Authorization"] = f"Bearer {settings.gateway_token}"
    return h


@router.post("/api/chat")
async def chat_proxy(request: Request):
    data = await request.json()
    message = data.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{settings.gateway_url}/api/chat",
            json={"message": message, "session_id": data.get("sessionId", "dashboard")},
            headers=_headers(),
            timeout=60.0,
        )
        if resp.status_code == 200:
            return resp.json()
        raise HTTPException(status_code=resp.status_code, detail="Gateway error")


@router.post("/api/chat/stream")
async def chat_stream(request: Request):
    data = await request.json()
    message = data.get("message", "")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    async def generate():
        async with httpx.AsyncClient() as client:
            async with client.stream(
                "POST",
                f"{settings.gateway_url}/api/chat/stream",
                json={"message": message, "session_id": data.get("sessionId", "dashboard")},
                headers=_headers(),
                timeout=120.0,
            ) as resp:
                async for chunk in resp.aiter_text():
                    yield chunk

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    try:
        import websockets
        uri = f"{settings.gateway_ws_url}?token={settings.gateway_token}"
        async with websockets.connect(uri) as gw:
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
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e), "type": "connection_error"})
        except Exception:
            pass
    finally:
        try:
            await websocket.close()
        except Exception:
            pass
