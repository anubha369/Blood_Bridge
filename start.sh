#!/bin/bash
# BloodBridge Vision-X — Local Runner
# Starts both Backend (Port 5001) and Frontend (Port 5173) simultaneously

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "=========================================================="
echo "   🩸 Starting BloodBridge Vision-X (Localhost)"
echo "=========================================================="

# Cleanup any existing processes on ports 5001 and 5173
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "Starting Backend on http://localhost:5001 ..."
(cd backend && npm run dev) &
BACKEND_PID=$!

sleep 1

echo "Starting Frontend on http://localhost:5173 ..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "✅ Both servers are running!"
echo "   ➜ Frontend: http://localhost:5173"
echo "   ➜ Backend:  http://localhost:5001"
echo ""
echo "Press [Ctrl + C] to stop both servers."
echo "=========================================================="

# Trap Ctrl+C (SIGINT) and kill both child processes cleanly
trap "echo ''; echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM

wait
