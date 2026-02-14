"""Shared Gateway RPC service — WebSocket challenge-response + RPC calls.

Extracted from chat.py for reuse by cron, config, node, session, and debug routers.
"""

import asyncio
import json
import logging
import uuid
from typing import Any, AsyncGenerator, Dict, Optional

import websockets

from app.config import settings

logger = logging.getLogger("gateway_rpc")

# Gateway WebSocket protocol constants
CLIENT_ID = "cli"
CLIENT_MODE = "cli"
ROLE = "operator"
SCOPES = ["operator.admin"]
PROTOCOL_VERSION = 3

# Timeouts
HANDSHAKE_TIMEOUT = 5
RPC_TIMEOUT = 30


def _req_id() -> str:
    return str(uuid.uuid4())[:8]


async def _handshake(ws_conn) -> bool:
    """Perform the gateway challenge-response handshake. Returns True on success."""
    raw = await asyncio.wait_for(ws_conn.recv(), timeout=HANDSHAKE_TIMEOUT)
    msg = json.loads(raw)
    if msg.get("event") != "connect.challenge":
        return False

    connect_msg = {
        "type": "req",
        "id": _req_id(),
        "method": "connect",
        "params": {
            "minProtocol": PROTOCOL_VERSION,
            "maxProtocol": PROTOCOL_VERSION,
            "client": {
                "id": CLIENT_ID,
                "version": "2.0.0",
                "platform": "linux",
                "mode": CLIENT_MODE,
                "instanceId": str(uuid.uuid4()),
            },
            "role": ROLE,
            "scopes": SCOPES,
            "auth": {"token": settings.gateway_token},
            "caps": [],
        },
    }
    await ws_conn.send(json.dumps(connect_msg))

    raw = await asyncio.wait_for(ws_conn.recv(), timeout=HANDSHAKE_TIMEOUT)
    msg = json.loads(raw)
    return msg.get("ok", False)


async def gateway_call(
    method: str,
    params: Optional[Dict[str, Any]] = None,
    timeout: float = RPC_TIMEOUT,
) -> Dict[str, Any]:
    """Open WebSocket, perform handshake, send RPC request, return response, close.

    Returns the full response dict. Raises on connection or timeout errors.
    """
    uri = settings.gateway_ws_url
    headers = {"Origin": "http://localhost:8765"}

    async with websockets.connect(uri, open_timeout=3, additional_headers=headers) as gw:
        if not await _handshake(gw):
            raise ConnectionError("Gateway authentication failed")

        req_id = _req_id()
        await gw.send(json.dumps({
            "type": "req",
            "id": req_id,
            "method": method,
            "params": params or {},
        }))

        logger.info("RPC call: method=%s id=%s", method, req_id)

        # Wait for the response matching our request id
        for _ in range(100):
            raw = await asyncio.wait_for(gw.recv(), timeout=timeout)
            msg = json.loads(raw)

            # Skip health pings
            if msg.get("event") == "health":
                continue

            # Direct response to our request
            if msg.get("id") == req_id:
                logger.info("RPC response: method=%s ok=%s", method, msg.get("ok"))
                return msg

            # Some RPC methods return results via events instead
            if msg.get("type") == "res":
                logger.info("RPC response: method=%s ok=%s", method, msg.get("ok"))
                return msg

        raise TimeoutError(f"No response for RPC method {method}")


async def gateway_call_streaming(
    method: str,
    params: Optional[Dict[str, Any]] = None,
    timeout: float = RPC_TIMEOUT,
) -> AsyncGenerator[Dict[str, Any], None]:
    """Open WebSocket, perform handshake, send RPC request, yield events."""
    uri = settings.gateway_ws_url
    headers = {"Origin": "http://localhost:8765"}

    async with websockets.connect(uri, open_timeout=3, additional_headers=headers) as gw:
        if not await _handshake(gw):
            raise ConnectionError("Gateway authentication failed")

        req_id = _req_id()
        await gw.send(json.dumps({
            "type": "req",
            "id": req_id,
            "method": method,
            "params": params or {},
        }))

        logger.info("RPC streaming call: method=%s id=%s", method, req_id)

        for _ in range(500):
            try:
                raw = await asyncio.wait_for(gw.recv(), timeout=timeout)
                msg = json.loads(raw)

                if msg.get("event") == "health":
                    continue

                yield msg

                # End on lifecycle end or final response
                ev = msg.get("event", "")
                payload = msg.get("payload", {})
                if isinstance(payload, dict):
                    data = payload.get("data", {})
                    if (
                        ev == "agent"
                        and payload.get("stream") == "lifecycle"
                        and data.get("phase") == "end"
                    ):
                        break
                    if ev == "chat" and payload.get("state") == "final":
                        break

                # Direct response means we're done
                if msg.get("id") == req_id and msg.get("type") == "res":
                    break

            except asyncio.TimeoutError:
                break


async def gateway_health_check() -> bool:
    """Quick check if gateway WebSocket is reachable and auth works."""
    try:
        uri = settings.gateway_ws_url
        headers = {"Origin": "http://localhost:8765"}
        async with websockets.connect(uri, open_timeout=2, additional_headers=headers) as gw:
            return await _handshake(gw)
    except Exception:
        return False
