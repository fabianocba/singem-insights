# start-dev.ps1 (PID-safe + Chrome)
$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\SINGEM"
$ServerDir   = "C:\SINGEM\server"
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"

$SshUserHost = "root@72.61.55.250"
$LocalPort   = 5433
$RemoteHost  = "127.0.0.1"
$RemotePort  = 5432

$FrontUrl  = "http://localhost:8000"
$HealthUrl = "http://localhost:3000/health"

Write-Host "==> Starting SINGEM session..." -ForegroundColor Cyan

# 0) prevent duplicates: if tunnel already open, warn but continue
$portOpen = (Test-NetConnection 127.0.0.1 -Port $LocalPort -WarningAction SilentlyContinue).TcpTestSucceeded
if ($portOpen) {
  Write-Host "WARN: Port $LocalPort is already open. Tunnel may already be running." -ForegroundColor Yellow
}

# 1) Start SSH tunnel as a real process (captures PID)
Write-Host "==> Starting SSH tunnel..." -ForegroundColor Cyan
$sshArgs = @("-N", "-L", "$LocalPort`:$RemoteHost`:$RemotePort", $SshUserHost)
$sshProc = Start-Process -FilePath "ssh.exe" -ArgumentList $sshArgs -PassThru

# 2) Wait tunnel port
Write-Host "==> Waiting tunnel port $LocalPort..." -ForegroundColor Cyan
$tunnelOk = $false
for ($i=1; $i -le 20; $i++) {
  $tunnelOk = (Test-NetConnection 127.0.0.1 -Port $LocalPort -WarningAction SilentlyContinue).TcpTestSucceeded
  if ($tunnelOk) { break }
  Start-Sleep 1
}
if (-not $tunnelOk) {
  Write-Host "ERROR: tunnel did not open. Stopping ssh PID $($sshProc.Id)..." -ForegroundColor Red
  try { Stop-Process -Id $sshProc.Id -Force } catch {}
  exit 1
}
Write-Host "OK: tunnel up (PID $($sshProc.Id))" -ForegroundColor Green

# 3) Start server in its own process and capture PID
Write-Host "==> Starting server (npm run dev)..." -ForegroundColor Cyan
$cmd = "cd /d `"$ServerDir`" && npm run dev"
$serverProc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $cmd -PassThru
Write-Host "OK: server process started (PID $($serverProc.Id))" -ForegroundColor Green

# 4) Try health quickly (do not block)
Write-Host "==> Checking backend health..." -ForegroundColor Cyan
$backendOk = $false
for ($i=1; $i -le 10; $i++) {
  try {
    Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
    $backendOk = $true
    break
  } catch { Start-Sleep 1 }
}
if ($backendOk) { Write-Host "OK: /health responded." -ForegroundColor Green }
else { Write-Host "WARN: /health not responding yet (opening browser anyway)." -ForegroundColor Yellow }

# 5) Open Chrome tabs (guaranteed)
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "start", "chrome", $FrontUrl, $HealthUrl | Out-Null

# 6) Save session info
$session = @{
  startedAt  = (Get-Date).ToString("s")
  projectRoot= $ProjectRoot
  serverDir  = $ServerDir
  localPort  = $LocalPort
  sshPid     = $sshProc.Id
  serverPid  = $serverProc.Id
  frontUrl   = $FrontUrl
  healthUrl  = $HealthUrl
}
$session | ConvertTo-Json | Set-Content -Encoding UTF8 $PidFile

Write-Host ""
Write-Host "DONE. Tunnel PID=$($sshProc.Id), Server PID=$($serverProc.Id)" -ForegroundColor Green