@echo off
setlocal enabledelayedexpansion
title Memora AI - Live Status Verifier

echo ========================================================
echo           MEMORA AI - LIVE SYSTEM STATUS
echo ========================================================
echo.

set BACKEND_OK=0
set FRONTEND_OK=0
set OLLAMA_OK=0

:: Check Backend
for /f %%i in ('curl.exe -s -o nul -w "%%{http_code}" http://localhost:8000/api/v1/health 2^>nul') do (
    if "%%i"=="200" set BACKEND_OK=1
)

:: Check Frontend
for /f %%i in ('curl.exe -s -o nul -w "%%{http_code}" http://localhost:5173/ 2^>nul') do (
    if "%%i"=="200" set FRONTEND_OK=1
)

:: Check Ollama
for /f %%i in ('curl.exe -s -o nul -w "%%{http_code}" http://localhost:11434/api/tags 2^>nul') do (
    if "%%i"=="200" set OLLAMA_OK=1
)

echo SERVICE STATUS:
if "!BACKEND_OK!"=="1" (
    echo   [PASS] Backend API:       ONLINE - http://localhost:8000
) else (
    echo   [FAIL] Backend API:       OFFLINE
)

if "!FRONTEND_OK!"=="1" (
    echo   [PASS] Frontend UI:       ONLINE - http://localhost:5173
) else (
    echo   [FAIL] Frontend UI:       OFFLINE
)

if "!OLLAMA_OK!"=="1" (
    echo   [PASS] Local Ollama AI:   ONLINE - http://localhost:11434
) else (
    echo   [WARN] Local Ollama AI:   OFFLINE
)

echo.
if "!BACKEND_OK!"=="1" if "!FRONTEND_OK!"=="1" (
    echo ========================================================
    echo  ALL CORE SERVICES ARE ONLINE AND READY!
    echo ========================================================
    echo  Web UI:     http://localhost:5173
    echo  API Docs:   http://localhost:8000/docs
) else (
    echo ========================================================
    echo  ONE OR MORE SERVICES ARE OFFLINE.
    echo  Run start_all.bat to launch them.
    echo ========================================================
)

echo.
pause
