#!/bin/bash
# OpenClaw Dashboard - Start Script

echo "🚀 Starting OpenClaw Dashboard..."

# Check if running from correct directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Must run from openclaw-dashboard directory"
    exit 1
fi

# Start backend in background
echo "📦 Starting backend API on port 8765..."
cd backend
python3 main.py &
BACKEND_PID=$!
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to start..."
sleep 3

# Start frontend
echo "🎨 Starting frontend dev server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Dashboard is running!"
echo ""
echo "📊 Frontend: http://localhost:5173"
echo "🔌 Backend API: http://localhost:8765"
echo "📚 API Docs: http://localhost:8765/docs"
echo ""
echo "Press Ctrl+C to stop both services"
echo ""

# Wait for user interrupt
trap "echo ''; echo '🛑 Stopping dashboard...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT

wait
