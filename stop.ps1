# Memora AI - PowerShell Shutdown Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "           MEMORA AI - SHUTDOWN SCRIPT" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$ports = @(8000, 5173)
foreach ($p in $ports) {
    $lines = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    if ($lines) {
        foreach ($conn in $lines) {
            $procId = $conn.OwningProcess
            if ($procId -gt 0) {
                try {
                    $pName = (Get-Process -Id $procId -ErrorAction SilentlyContinue).ProcessName
                    Write-Host (" Stopping process tree for {0} (PID {1}) on port {2}..." -f $pName, $procId, $p) -ForegroundColor Yellow
                    taskkill.exe /F /T /PID $procId | Out-Null
                } catch {}
            }
        }
    } else {
        Write-Host (" No active listening process found on port {0}." -f $p) -ForegroundColor Gray
    }
}

Start-Sleep -Seconds 1
Write-Host ""

$p8000 = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
$p5173 = Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue

if (-not $p8000) { Write-Host " [PASS] Port 8000 (Backend) is FREE." -ForegroundColor Green } else { Write-Host " [WARN] Port 8000 still occupied." -ForegroundColor Red }
if (-not $p5173) { Write-Host " [PASS] Port 5173 (Frontend) is FREE." -ForegroundColor Green } else { Write-Host " [WARN] Port 5173 still occupied." -ForegroundColor Red }

Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host " MeetGuard AI services stopped." -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
