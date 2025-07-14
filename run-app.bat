@echo off
REM Start backend (Node.js CSV version)
start cmd /k "cd backend-node && npm run dev"
REM Start frontend (React)
start cmd /k "cd frontend && npm run dev" 