#!/bin/bash
# OpenClaw Dashboard - One-Command Installer & Runner

set -e  # Exit on any error

echo "🚀 OpenClaw Dashboard - One-Command Setup"
echo "=========================================="
echo ""

# Check if running from correct directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check for OpenClaw installation
if [ ! -d "/home/botuser/.openclaw" ]; then
    echo "❌ Error: OpenClaw not found at /home/botuser/.openclaw"
    echo "Please install OpenClaw first"
    exit 1
fi

echo "✅ OpenClaw installation found"
echo ""

# Install python3-venv if needed
echo "📦 Setting up Python environment..."
if ! dpkg -l | grep -q python3-venv; then
    echo "Installing python3-venv..."
    sudo apt-get update -qq
    sudo apt-get install -y python3-venv
fi

# Create Python virtual environment
if [ ! -d "venv" ] || [ ! -f "venv/bin/activate" ]; then
    echo "Creating virtual environment..."
    rm -rf venv  # Clean up any partial venv
    python3 -m venv venv
fi

# Activate venv and install dependencies
echo "Installing Python dependencies in virtual environment..."
source venv/bin/activate
pip install -q --upgrade pip
pip install -q fastapi uvicorn[standard] websockets python-multipart pydantic pydantic-settings aiofiles watchfiles httpx
echo "✅ Python environment ready"
echo ""

# Install frontend dependencies (if not already)
echo "📦 Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
echo "✅ Frontend dependencies installed"
echo ""

# Build frontend for production
echo "🏗️  Building frontend..."
npm run build --silent
echo "✅ Frontend built"
cd ..
echo ""

# Create combined server (serves both frontend and API)
echo "🔧 Creating unified server..."
cat > backend/serve_all.py << 'PYEOF'
"""
OpenClaw Dashboard - Unified Server
Everything on port 8765, chat routes to 18789
"""
from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import sys

sys.path.insert(0, str(Path(__file__).parent))
from main import (
    get_overview, get_jobs, get_job_execution_history,
    get_token_metrics, get_paired_devices, get_system_health,
    websocket_endpoint, health_check, chat_proxy, chat_stream_proxy,
)

app = FastAPI(title="OpenClaw Dashboard")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.get("/api/v1/overview")(get_overview)
app.get("/api/v1/jobs")(get_jobs)
app.get("/api/v1/jobs/{job_id}/history")(get_job_execution_history)
app.get("/api/v1/metrics/tokens")(get_token_metrics)
app.get("/api/v1/devices")(get_paired_devices)
app.get("/api/v1/health")(get_system_health)
app.websocket("/ws/realtime")(websocket_endpoint)
app.get("/health")(health_check)
app.post("/api/chat")(chat_proxy)
app.post("/api/chat/stream")(chat_stream_proxy)

# Frontend - Define routes first, then mount static files
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    @app.get("/")
    async def root():
        return FileResponse(frontend_dist / "index.html")

    # Catch-all for SPA client-side routing (serves index.html for unknown routes)
    # This won't match /assets/* because mounts are checked first
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        return FileResponse(frontend_dist / "index.html")

    # Mount static files LAST - mounts take precedence over path parameters
    app.mount("/assets", StaticFiles(directory=frontend_dist / "assets"), name="assets")

if __name__ == "__main__":
    import uvicorn
    print("\n" + "="*60)
    print("🎉 OpenClaw Dashboard - All on Port 8765!")
    print("="*60)
    print(f"\n📊 Dashboard:  http://localhost:8765")
    print(f"💬 Chat:       Routes to Gateway (18789)")
    print(f"\nPress Ctrl+C to stop\n")
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="error")
PYEOF

echo "✅ Server configured"
echo ""

# Start the dashboard
echo "🚀 Starting OpenClaw Dashboard..."
echo ""
echo "=========================================="
echo "🎉 Dashboard running at: http://localhost:8765"
echo "=========================================="
echo ""
echo "If accessing remotely, run on your LOCAL machine:"
echo "  ssh -N -L 8765:localhost:8765 botuser@76.13.114.80"
echo ""
echo "Then visit: http://localhost:8765"
echo ""
echo "Press Ctrl+C to stop"
echo ""

# Activate venv and run
source venv/bin/activate
cd backend
python3 serve_all.py
