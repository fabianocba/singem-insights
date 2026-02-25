# stop-dev.ps1 (auto-root version)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"

$Branch = "dev"
$Remote = "origin"

Write-Host "==> Stopping SINGEM session..." -ForegroundColor Cyan
Write-Host "Project root detected: $ProjectRoot" -ForegroundColor Yellow

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
if ($serverPid) {
  try { taskkill /PID $serverPid /T /F | Out-Null; Write-Host "Server stopped." -ForegroundColor Green }
  catch {}
}

# Stop tunnel
if ($sshPid) {
  try { taskkill /PID $sshPid /T /F | Out-Null; Write-Host "Tunnel stopped." -ForegroundColor Green }
  catch {}
}

# Git push
Set-Location $ProjectRoot
git checkout $Branch | Out-Null

$status = git status --porcelain
if ($status) {
  git add .
  $msg = Read-Host "Commit message"
  if (-not [string]::IsNullOrWhiteSpace($msg)) {
    git commit -m "$msg"
    git push $Remote $Branch
  }
}

if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

Write-Host "DONE." -ForegroundColor Green
