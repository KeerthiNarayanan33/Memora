# Memora AI - PowerShell Launcher
$ErrorActionPreference = "Continue"

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "           MEMORA AI - FULL STACK LAUNCHER" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$root = $PSScriptRoot

Write-Host "[1/3] Starting Backend (FastAPI on port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend'; python -m uvicorn app.main:app --port 8000 --reload"

Write-Host "[2/3] Starting Frontend (Vite on port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\frontend'; npm run dev"

Write-Host ""
Write-Host "[3/3] Waiting for services to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 4

Write-Host ""
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "            PERFORMING LIVE SYSTEM VERIFICATION" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$bOk = $false
$fOk = $false

try {
    $res = curl.exe -s -o nul -w "%{http_code}" http://localhost:8000/api/v1/health
    if ($res -eq "200") { $bOk = $true }
} catch {}

try {
    $res = curl.exe -s -o nul -w "%{http_code}" http://localhost:5173/
    if ($res -eq "200") { $fOk = $true }
} catch {}

if ($bOk) {
    Write-Host " [PASS] Backend API:       ONLINE - http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Backend API:       OFFLINE" -ForegroundColor Red
}

if ($fOk) {
    Write-Host " [PASS] Frontend UI:       ONLINE - http://localhost:5173" -ForegroundColor Green
} else {
    Write-Host " [FAIL] Frontend UI:       OFFLINE" -ForegroundColor Red
}

Write-Host ""
if ($bOk -and $fOk) {
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host "  MEMORA AI IS FULLY OPERATIONAL!" -ForegroundColor Green
    Write-Host "========================================================" -ForegroundColor Green
    Write-Host " Web UI:     http://localhost:5173" -ForegroundColor Yellow
    Write-Host " API Docs:   http://localhost:8000/docs" -ForegroundColor Yellow
    Write-Host ""
    Write-Host " Demo Credentials:" -ForegroundColor White
    Write-Host "   Admin:    admin@techcorp.example / admin123" -ForegroundColor Gray
    Write-Host "   Manager:  arun@techcorp.example  / arun123" -ForegroundColor Gray
    Write-Host "   Member:   rahul@techcorp.example / rahul123" -ForegroundColor Gray
    Write-Host "========================================================" -ForegroundColor Green
    Start-Process "http://localhost:5173"
} else {
    Write-Host "One or more services did not respond yet. Check the opened terminal windows." -ForegroundColor Yellow
}
