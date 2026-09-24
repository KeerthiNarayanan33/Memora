@echo off
echo Starting MeetGuard AI...
echo.

echo [1/2] Starting backend (FastAPI on port 8000)...
start cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --reload --port 8000"

timeout /t 3 >nul

echo [2/2] Starting frontend (Vite on port 5173)...
start cmd /k "cd /d "%~dp0frontend" && node "C:\Program Files\nodejs\node_modules\npm\bin\npm-cli.js" run dev"

timeout /t 5 >nul
echo.
echo ========================================================
echo  MeetGuard AI is running!
echo ========================================================
echo  Frontend:   http://localhost:5173
echo  Backend:    http://localhost:8000
echo  API Docs:   http://localhost:8000/docs
echo.
echo  Demo Credentials:
echo    Admin:    admin@techcorp.example / admin123
echo    Manager:  arun@techcorp.example  / arun123
echo    Member:   rahul@techcorp.example / rahul123
echo ========================================================
echo.
start "" "http://localhost:5173"
pause
