@echo off
REM Start the backend server in a new command prompt
start "Backend Server" cmd /k "cd /d %~dp0backend && npm run dev"

REM Start the frontend server in a new command prompt
start "Frontend Server" cmd /k "cd /d %~dp0frontend && npm run dev"

echo Starting Praxis application...
echo Backend will be available at: http://localhost:5001
echo Frontend will be available at: http://localhost:3000
echo.
echo Please wait for both servers to start...
pause
