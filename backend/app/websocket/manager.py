"""Multi-channel WebSocket connection manager."""

import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.channels: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, channel: str = "default"):
        await websocket.accept()
        if channel not in self.channels:
            self.channels[channel] = set()
        self.channels[channel].add(websocket)

    def disconnect(self, websocket: WebSocket, channel: str = "default"):
        if channel in self.channels:
            self.channels[channel].discard(websocket)

    async def broadcast(self, message: dict, channel: str = "default"):
        if channel not in self.channels:
            return
        dead = []
        for ws in self.channels[channel]:
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.channels[channel].discard(ws)


manager = ConnectionManager()
