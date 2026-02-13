#!/bin/bash
# OpenClaw Dashboard - One-Command Installer & Runner

set -e

echo "OpenClaw Dashboard - Setup"
echo "=========================="
echo ""

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# Check for OpenClaw installation
OPENCLAW_DIR="${OPENCLAW_DASH_OPENCLAW_DIR:-$HOME/.openclaw}"
if [ ! -d "$OPENCLAW_DIR" ]; then
    echo "Error: OpenClaw not found at $OPENCLAW_DIR"
    echo "Set OPENCLAW_DASH_OPENCLAW_DIR to your OpenClaw path"
    exit 1
fi
echo "OpenClaw installation found at $OPENCLAW_DIR"
echo ""

# Python dependencies
echo "Installing Python dependencies..."
cd backend
pip install -q -r requirements.txt
cd ..
echo "Python dependencies installed"
echo ""

# Frontend
echo "Installing frontend dependencies..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install --silent
fi
echo "Building frontend..."
npm run build --silent
cd ..
echo "Frontend built"
echo ""

# Start
echo "=========================="
echo "Starting OpenClaw Dashboard on port ${OPENCLAW_DASH_PORT:-8765}"
echo "=========================="
echo ""
echo "Press Ctrl+C to stop"
echo ""

cd backend
PYTHONPATH=. python3 -m app.main
