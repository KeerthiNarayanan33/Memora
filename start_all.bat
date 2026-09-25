@echo off
setlocal enabledelayedexpansion
title Memora AI - Orchestrator

echo ========================================================
echo           MEMORA AI - FULL STACK LAUNCHER
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/3] Starting Backend - FastAPI on port 8000...
start "Memora Backend [Port 8000]" cmd /k "cd /d "%~dp0backend" && python -m uvicorn app.main:app --port 8000 --reload"

echo [2/3] Starting Frontend - Vite on port 5173...
start "Memora Frontend [Port 5173]" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo.
echo [3/3] Waiting for services to become responsive (up to 15s)...

set BACKEND_OK=0
set FRONTEND_OK=0
set OLLAMA_OK=0

for /l %%k in (1, 1, 15) do (
    if "!BACKEND_OK!"=="0" (
        for /f %%i in ('curl.exe -s -o nul -w "%%{http_code}" http://localhost:8000/api/v1/health 2^>nul') do (
            if "%%i"=="200" set BACKEND_OK=1
        )
    )
    if "!FRONTEND_OK!"=="0" (
        for /f %%i in ('curl.exe -s -o nul -w "%%{http_code}" http://localhost:5173/ 2^>nul') do (
            if "%%i"=="200" set FRONTEND_OK=1
        )
    )
    if "!BACKEND_OK!"=="1" if "!FRONTEND_OK!"=="1" goto :services_ready
    timeout /t 1 /nobreak >nul
)

:services_ready
:: Check Ollama
for /f %%i in ('curl.exe -s -o nul -w "%%{http_code}" http://localhost:11434/api/tags 2^>nul') do (
    if "%%i"=="200" set OLLAMA_OK=1
)

echo.
echo ========================================================
echo            PERFORMING LIVE SYSTEM VERIFICATION
echo ========================================================
echo.

if "!BACKEND_OK!"=="1" (
    echo  [PASS] Backend API:       ONLINE - http://localhost:8000
) else (
    echo  [FAIL] Backend API:       OFFLINE
)

if "!FRONTEND_OK!"=="1" (
    echo  [PASS] Frontend UI:       ONLINE - http://localhost:5173
) else (
    echo  [FAIL] Frontend UI:       OFFLINE
)

if "!OLLAMA_OK!"=="1" (
    echo  [PASS] Local Ollama AI:   ONLINE - http://localhost:11434
) else (
    echo  [WARN] Local Ollama AI:   OFFLINE - start Ollama if using local Llama
)

echo.
if "!BACKEND_OK!"=="1" if "!FRONTEND_OK!"=="1" (
    echo ========================================================
    echo  MEMORA AI IS FULLY OPERATIONAL!
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
) else (
    echo [WARN] One or more services did not respond yet.
    echo Check the opened backend and frontend command windows for details.
)

echo.
echo Press any key to close this launcher window (services keep running).
pause >nul
