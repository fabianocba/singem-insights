# stop-dev.ps1 (PID-safe)
$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\SINGEM"
$Branch      = "dev"
$Remote      = "origin"
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"

Write-Host "==> Stopping SINGEM session..." -ForegroundColor Cyan

# Read session
$sshPid = $null
$serverPid = $null
if (Test-Path $PidFile) {
  try {
    $sess = Get-Content $PidFile -Raw | ConvertFrom-Json
    $sshPid = $sess.sshPid
    $serverPid = $sess.serverPid
  } catch {}
}

# Stop server
Write-Host "==> Stopping server..." -ForegroundColor Cyan
if ($serverPid) {
  try { taskkill /PID $serverPid /T /F | Out-Null; Write-Host "OK: server stopped (PID $serverPid)" -ForegroundColor Green }
  catch { Write-Host "WARN: could not stop server PID $serverPid" -ForegroundColor Yellow }
} else {
  Write-Host "INFO: server PID not found. Trying to free port 3000..." -ForegroundColor Yellow
  $lines = (netstat -ano | findstr ":3000" | findstr "LISTENING")
  foreach ($l in $lines) {
    $procId = (($l -split "\s+") | Where-Object { $_ })[-1]
    if ($procId -match "^\d+$") { try { taskkill /PID $procId /F | Out-Null } catch {} }
  }
}

# Stop tunnel
Write-Host "==> Stopping SSH tunnel..." -ForegroundColor Cyan
if ($sshPid) {
  try { taskkill /PID $sshPid /T /F | Out-Null; Write-Host "OK: tunnel stopped (PID $sshPid)" -ForegroundColor Green }
  catch { Write-Host "WARN: could not stop tunnel PID $sshPid" -ForegroundColor Yellow }
} else {
  Write-Host "INFO: tunnel PID not found. Trying to stop ssh.exe..." -ForegroundColor Yellow
  Get-Process ssh -ErrorAction SilentlyContinue | ForEach-Object { try { Stop-Process -Id $_.Id -Force } catch {} }
}

# Git add/commit/push
Write-Host ""
Write-Host "==> Preparing GitHub push..." -ForegroundColor Cyan
Set-Location $ProjectRoot
git checkout $Branch | Out-Null

$status = git status --porcelain
if (-not $status) {
  Write-Host "OK: nothing to commit (clean)." -ForegroundColor Green
} else {
  git add .

  # never commit .env or .dev-session.json
  $stagedFiles = (git diff --name-only --cached) -split "`r?`n" | Where-Object { $_ -and $_.Trim() -ne "" }
  $blocked = $stagedFiles | Where-Object { $_ -match "(^|/)\.env($|\.)" -or $_ -ieq ".dev-session.json" }
  if ($blocked) {
    Write-Host "WARN: removing blocked files from stage..." -ForegroundColor Yellow
    foreach ($f in $blocked) { try { git restore --staged -- "$f" 2>$null } catch {} }
  }

  $msg = Read-Host "Commit message"
  if ([string]::IsNullOrWhiteSpace($msg)) { Write-Host "ERROR: empty message. Aborting." -ForegroundColor Red; exit 1 }

  git commit -m "$msg"

  try { git push $Remote $Branch }
  catch {
    Write-Host "WARN: push failed. Trying pull --rebase then push..." -ForegroundColor Yellow
    git pull --rebase $Remote $Branch
    git push $Remote $Branch
  }
}

# Cleanup session file locally (even if ignored)
if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

Write-Host ""
Write-Host "DONE." -ForegroundColor Green
