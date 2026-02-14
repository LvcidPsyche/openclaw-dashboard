"""Chat proxy to OpenClaw Gateway via WebSocket RPC protocol.

Uses the shared gateway_rpc service for handshake. Keeps WebSocket proxy logic here.
"""

import asyncio
import json
import uuid

import httpx
import websockets
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse

from app.config import settings
from app.services.gateway_rpc import _handshake, CLIENT_ID, PROTOCOL_VERSION

router = APIRouter(tags=["chat"])


@router.get("/api/chat/status")
async def chat_status():
    """Check if the gateway is reachable."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{settings.gateway_url}/health", timeout=1.0)
            return {"available": resp.status_code == 200, "gateway": settings.gateway_url}
    except Exception:
        return {"available": False, "gateway": settings.gateway_url}


@router.post("/api/chat")
async def chat_proxy(request_data: dict):
    """Send a chat message via gateway WebSocket and return the final response."""
    message = request_data.get("message", "").strip()
    if not message:
        return JSONResponse({"error": "Message is required"}, status_code=400)

    session_key = request_data.get("sessionKey", "main")

    try:
        uri = settings.gateway_ws_url
        headers = {"Origin": "http://localhost:8765"}
        async with websockets.connect(uri, open_timeout=3, additional_headers=headers) as gw:
            if not await _handshake(gw):
                return JSONResponse({"error": "Gateway authentication failed"}, status_code=502)

            idem_key = str(uuid.uuid4())
            await gw.send(json.dumps({
                "type": "req",
                "id": "chat1",
                "method": "chat.send",
                "params": {
                    "sessionKey": session_key,
                    "message": message,
                    "deliver": False,
                    "idempotencyKey": idem_key,
                },
            }))

            full_text = ""
            for _ in range(200):
                try:
                    raw = await asyncio.wait_for(gw.recv(), timeout=60)
                    msg = json.loads(raw)
                    ev = msg.get("event", "")
                    payload = msg.get("payload", {})

                    if ev == "health":
                        continue

                    if ev == "agent" and isinstance(payload, dict):
                        data = payload.get("data", {})
                        if payload.get("stream") == "assistant" and "delta" in data:
                            full_text += data["delta"]
                        if payload.get("stream") == "lifecycle" and data.get("phase") == "end":
                            break

                    if ev == "chat" and isinstance(payload, dict):
                        if payload.get("state") == "final":
                            content = payload.get("message", {}).get("content", [])
                            for block in content:
                                if isinstance(block, dict) and block.get("type") == "text":
                                    full_text = block["text"]
                            break

                except asyncio.TimeoutError:
                    break

            if full_text:
                return {"response": full_text}
            else:
                return JSONResponse({"error": "No response from model"}, status_code=504)

    except (websockets.exceptions.ConnectionClosed, ConnectionRefusedError, OSError):
        return JSONResponse(
            {"error": "OpenClaw gateway is not running. Start it with: openclaw gateway start"},
            status_code=503,
        )
    except Exception as e:
        return JSONResponse({"error": f"Chat error: {str(e)}"}, status_code=500)


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket chat proxy — bridges the dashboard client to the gateway."""
    await websocket.accept()

    try:
        uri = settings.gateway_ws_url
        headers = {"Origin": "http://localhost:8765"}
        async with websockets.connect(uri, open_timeout=3, additional_headers=headers) as gw:
            if not await _handshake(gw):
                await websocket.send_json({
                    "type": "connection_error",
                    "error": "Gateway authentication failed",
                })
                return

            await websocket.send_json({
                "type": "system",
                "content": "Connected to OpenClaw gateway",
            })

            async def gateway_to_client():
                try:
                    async for raw in gw:
                        msg = json.loads(raw)
                        ev = msg.get("event", "")
                        payload = msg.get("payload", {})

                        if ev == "health":
                            continue

                        if ev == "agent" and isinstance(payload, dict):
                            data = payload.get("data", {})
                            if payload.get("stream") == "assistant" and "delta" in data:
                                await websocket.send_json({
                                    "type": "delta",
                                    "content": data["delta"],
                                    "runId": payload.get("runId"),
                                })
                            elif payload.get("stream") == "lifecycle" and data.get("phase") == "end":
                                await websocket.send_json({
                                    "type": "done",
                                    "runId": payload.get("runId"),
                                })

                        if ev == "chat" and isinstance(payload, dict) and payload.get("state") == "final":
                            content_blocks = payload.get("message", {}).get("content", [])
                            text = ""
                            for block in content_blocks:
                                if isinstance(block, dict) and block.get("type") == "text":
                                    text += block["text"]
                            if text:
                                await websocket.send_json({
                                    "type": "message",
                                    "content": text,
                                    "role": "assistant",
                                })
                except websockets.exceptions.ConnectionClosed:
                    pass

            async def client_to_gateway():
                try:
                    while True:
                        raw = await websocket.receive_text()
                        data = json.loads(raw)
                        message = data.get("content", data.get("message", ""))
                        session_key = data.get("sessionKey", "main")

                        if message:
                            await gw.send(json.dumps({
                                "type": "req",
                                "id": str(uuid.uuid4())[:8],
                                "method": "chat.send",
                                "params": {
                                    "sessionKey": session_key,
                                    "message": message,
                                    "deliver": False,
                                    "idempotencyKey": str(uuid.uuid4()),
                                },
                            }))
                except (WebSocketDisconnect, Exception):
                    pass

            await asyncio.gather(
                gateway_to_client(),
                client_to_gateway(),
                return_exceptions=True,
            )
    except (websockets.exceptions.ConnectionClosed, ConnectionRefusedError, OSError):
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
