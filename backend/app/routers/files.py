"""VPS File Explorer — browse, read, and manage files on the server."""

import os
import stat
import mimetypes
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel

router = APIRouter(tags=["files"])

# Paths to never expose
BLOCKED = {"/proc", "/sys", "/dev", "/run/secrets"}

MAX_READ_BYTES = 1024 * 512  # 512KB max file read


def _safe(path: str) -> Path:
    p = Path(path).resolve()
    for blocked in BLOCKED:
        if str(p).startswith(blocked):
            raise HTTPException(status_code=403, detail="Access denied")
    return p


def _entry(p: Path) -> dict:
    try:
        s = p.stat()
        return {
            "name": p.name,
            "path": str(p),
            "is_dir": p.is_dir(),
            "size": s.st_size,
            "modified": s.st_mtime,
            "mode": oct(stat.S_IMODE(s.st_mode)),
        }
    except PermissionError:
        return {"name": p.name, "path": str(p), "is_dir": p.is_dir(), "size": 0, "modified": 0, "mode": "?", "error": "permission denied"}


@router.get("/api/files/list")
async def list_dir(path: str = Query(default="/")):
    p = _safe(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="Path not found")
    if not p.is_dir():
        raise HTTPException(status_code=400, detail="Not a directory")

    entries = []
    try:
        for child in sorted(p.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower())):
            entries.append(_entry(child))
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")

    # Build breadcrumb
    parts = []
    cur = p
    while True:
        parts.append({"name": cur.name or "/", "path": str(cur)})
        if cur == cur.parent:
            break
        cur = cur.parent
    parts.reverse()

    return {"path": str(p), "entries": entries, "breadcrumb": parts}


@router.get("/api/files/read")
async def read_file(path: str = Query(...)):
    p = _safe(path)
    if not p.exists():
        raise HTTPException(status_code=404, detail="File not found")
    if p.is_dir():
        raise HTTPException(status_code=400, detail="Path is a directory")

    size = p.stat().st_size
    mime, _ = mimetypes.guess_type(str(p))
    is_text = (mime and mime.startswith("text")) or p.suffix in {
        ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".yaml", ".yml",
        ".toml", ".cfg", ".ini", ".conf", ".sh", ".md", ".txt", ".env",
        ".log", ".sql", ".html", ".css", ".xml", ".csv", ".rs", ".go",
    }

    if not is_text:
        return {"path": str(p), "content": None, "binary": True, "size": size, "mime": mime}

    if size > MAX_READ_BYTES:
        # Read last 512KB of large files
        try:
            with open(p, "rb") as f:
                f.seek(-MAX_READ_BYTES, 2)
                content = f.read().decode("utf-8", errors="replace")
            return {"path": str(p), "content": content, "truncated": True, "size": size, "mime": mime}
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    try:
        content = p.read_text(errors="replace")
        return {"path": str(p), "content": content, "truncated": False, "size": size, "mime": mime}
    except PermissionError:
        raise HTTPException(status_code=403, detail="Permission denied")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SearchRequest(BaseModel):
    path: str = "/"
    query: str
    max_results: int = 100


@router.get("/api/files/search")
async def search_files(path: str = Query(default="/"), q: str = Query(...), max_results: int = Query(default=100)):
    root = _safe(path)
    if not root.is_dir():
        raise HTTPException(status_code=400, detail="Not a directory")

    results = []
    q_lower = q.lower()

    def walk(p: Path, depth: int = 0):
        if depth > 8 or len(results) >= max_results:
            return
        try:
            for child in p.iterdir():
                if child.name.startswith(".") and depth > 0:
                    continue
                if q_lower in child.name.lower():
                    results.append(_entry(child))
                if child.is_dir() and len(results) < max_results:
                    try:
                        walk(child, depth + 1)
                    except PermissionError:
                        pass
        except PermissionError:
            pass

    walk(root)
    return {"results": results[:max_results], "query": q, "path": str(root)}
