"""Log tailing endpoint."""

from fastapi import APIRouter, HTTPException, Query
from app.config import settings

router = APIRouter(tags=["logs"])


@router.get("/api/logs/tail")
async def tail_logs(file: str = "openclaw.log", lines: int = Query(100, le=1000)):
    log_file = settings.openclaw_dir / "logs" / file
    if not log_file.exists():
        # List available log files
        logs_dir = settings.openclaw_dir / "logs"
        available = [f.name for f in logs_dir.glob("*") if f.is_file()] if logs_dir.exists() else []
        raise HTTPException(status_code=404, detail=f"Log file not found. Available: {available}")

    try:
        with open(log_file) as f:
            all_lines = f.readlines()
            recent = all_lines[-lines:]
        return {"file": file, "lines": recent, "total": len(all_lines)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/logs/files")
async def list_log_files():
    logs_dir = settings.openclaw_dir / "logs"
    if not logs_dir.exists():
        return {"files": []}
    files = []
    for f in sorted(logs_dir.iterdir()):
        if f.is_file():
            stat = f.stat()
            files.append({
                "name": f.name,
                "size_bytes": stat.st_size,
                "size_mb": round(stat.st_size / (1024 * 1024), 2),
                "modified": stat.st_mtime,
            })
    return {"files": files}
