"""Security middleware — headers, request size limiting, and token auth."""

import secrets
from urllib.parse import parse_qs

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response, JSONResponse


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Add security headers to all responses."""

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "img-src 'self' data:; "
            "connect-src 'self' ws: wss:; "
            "font-src 'self' data:; "
            "frame-ancestors 'self'"
        )
        return response


class RequestSizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject request bodies larger than max_size bytes."""

    def __init__(self, app, max_size: int = 1_048_576):  # 1MB default
        super().__init__(app)
        self.max_size = max_size

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > self.max_size:
            return JSONResponse(
                {"detail": "Request body too large"},
                status_code=413,
            )
        return await call_next(request)


class DashboardAuthMiddleware:
    """Pure-ASGI token gate for /api and /ws.

    When a token is configured, every HTTP request under /api and every websocket
    handshake under /ws must present it (X-Dashboard-Token header, Authorization:
    Bearer, or ?token= for websockets). This runs at the ASGI layer rather than as a
    BaseHTTPMiddleware because BaseHTTPMiddleware never sees websocket connections —
    the file explorer's data also flows over /ws, so it must be covered too. When no
    token is configured this is a no-op and the loopback host bind is the protection.
    """

    PROTECTED_PREFIXES = ("/api", "/ws")

    def __init__(self, app, token: str):
        self.app = app
        self.token = token

    async def __call__(self, scope, receive, send):
        if self._should_guard(scope) and not self._authorized(scope):
            await self._reject(scope, send)
            return
        await self.app(scope, receive, send)

    def _should_guard(self, scope) -> bool:
        if not self.token:
            return False
        stype = scope.get("type")
        if stype not in ("http", "websocket"):
            return False
        if stype == "http" and scope.get("method") == "OPTIONS":
            return False  # let CORS preflight through unauthenticated
        return scope.get("path", "").startswith(self.PROTECTED_PREFIXES)

    def _authorized(self, scope) -> bool:
        headers = {k.decode("latin-1").lower(): v.decode("latin-1") for k, v in scope.get("headers", [])}
        supplied = headers.get("x-dashboard-token")
        if not supplied:
            auth = headers.get("authorization", "")
            if auth[:7].lower() == "bearer ":
                supplied = auth[7:]
        if not supplied:
            supplied = parse_qs(scope.get("query_string", b"").decode("latin-1")).get("token", [""])[0]
        return bool(supplied) and secrets.compare_digest(supplied, self.token)

    async def _reject(self, scope, send) -> None:
        if scope["type"] == "websocket":
            await send({"type": "websocket.close", "code": 1008})
            return
        await send(
            {
                "type": "http.response.start",
                "status": 401,
                "headers": [(b"content-type", b"application/json")],
            }
        )
        await send({"type": "http.response.body", "body": b'{"detail":"Unauthorized"}'})
