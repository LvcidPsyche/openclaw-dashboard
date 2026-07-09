"""Tests for the dashboard token-gate middleware (DashboardAuthMiddleware).

Exercises the ASGI middleware directly (no full app / discovery needed) so the
security contract is pinned: /api and /ws require the token when one is configured,
static assets and CORS preflight stay open, and it is a no-op when unconfigured.
"""

import asyncio

from app.middleware.security import DashboardAuthMiddleware


async def _dummy(scope, receive, send):
    if scope["type"] == "websocket":
        await send({"type": "websocket.accept"})
    else:
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"ok"})


async def _run(mw, scope):
    sent = []

    async def send(message):
        sent.append(message)

    async def receive():
        return {"type": "http.request"}

    await mw(scope, receive, send)
    return sent


def _http(path, method="GET", headers=None, qs=b""):
    return {"type": "http", "path": path, "method": method, "headers": headers or [], "query_string": qs}


def _ws(path, headers=None, qs=b""):
    return {"type": "websocket", "path": path, "headers": headers or [], "query_string": qs}


def _status(sent):
    return sent[0].get("status")


def test_api_requires_token_when_configured():
    mw = DashboardAuthMiddleware(_dummy, token="s3cret")
    assert _status(asyncio.run(_run(mw, _http("/api/files/read")))) == 401


def test_api_allows_correct_header():
    mw = DashboardAuthMiddleware(_dummy, token="s3cret")
    sent = asyncio.run(_run(mw, _http("/api/x", headers=[(b"x-dashboard-token", b"s3cret")])))
    assert _status(sent) == 200


def test_api_allows_bearer_token():
    mw = DashboardAuthMiddleware(_dummy, token="s3cret")
    sent = asyncio.run(_run(mw, _http("/api/x", headers=[(b"authorization", b"Bearer s3cret")])))
    assert _status(sent) == 200


def test_api_rejects_wrong_token():
    mw = DashboardAuthMiddleware(_dummy, token="s3cret")
    sent = asyncio.run(_run(mw, _http("/api/x", headers=[(b"x-dashboard-token", b"nope")])))
    assert _status(sent) == 401


def test_static_and_preflight_stay_open():
    mw = DashboardAuthMiddleware(_dummy, token="s3cret")
    assert _status(asyncio.run(_run(mw, _http("/assets/app.js")))) == 200
    assert _status(asyncio.run(_run(mw, _http("/api/x", method="OPTIONS")))) == 200


def test_websocket_requires_token():
    mw = DashboardAuthMiddleware(_dummy, token="s3cret")
    blocked = asyncio.run(_run(mw, _ws("/ws/chat")))
    assert blocked[0]["type"] == "websocket.close" and blocked[0]["code"] == 1008
    accepted = asyncio.run(_run(mw, _ws("/ws/chat", qs=b"token=s3cret")))
    assert accepted[0]["type"] == "websocket.accept"


def test_no_token_is_noop():
    mw = DashboardAuthMiddleware(_dummy, token="")
    assert _status(asyncio.run(_run(mw, _http("/api/files/read")))) == 200
