#!/bin/bash
# OpenClaw Dashboard - Development Start Script
# Runs backend + frontend dev server side by side.

set -e

if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "Error: Must run from openclaw-dashboard directory"
    exit 1
fi

echo "Starting OpenClaw Dashboard (development mode)"
echo ""

# Backend
cd backend
PYTHONPATH=. python3 -m app.main &
BACKEND_PID=$!
cd ..

sleep 2

# Frontend dev server (hot reload)
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Dashboard is running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8765"
echo "  API Docs: http://localhost:8765/docs"
echo ""
echo "Press Ctrl+C to stop"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait
