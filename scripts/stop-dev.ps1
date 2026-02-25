# stop-dev.ps1
# Stop server + SSH tunnel and push changes to GitHub (dev)

$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\SINGEM"
$Branch      = "dev"
$Remote      = "origin"
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"

Write-Host "==> Stopping SINGEM session..." -ForegroundColor Cyan

# 1) Read session
$sshPid = $null
$serverPid = $null

if (Test-Path $PidFile) {
  try {
    $sess = Get-Content $PidFile -Raw | ConvertFrom-Json
    $sshPid = $sess.sshPid
    $serverPid = $sess.serverPid
  } catch {
    # ignore
  }
}

# 2) Stop server
Write-Host "==> Stopping server..." -ForegroundColor Cyan
if ($serverPid) {
  try {
    taskkill /PID $serverPid /T /F | Out-Null
    Write-Host "   OK: server stopped (PID $serverPid)" -ForegroundColor Green
  } catch {
    Write-Host "   WARN: could not stop server PID $serverPid (maybe already stopped)" -ForegroundColor Yellow
  }
} else {
  Write-Host "   INFO: server PID not found. Trying to free port 3000..." -ForegroundColor Yellow
  $lines = (netstat -ano | findstr ":3000" | findstr "LISTENING")
  foreach ($l in $lines) {
    $procId = (($l -split "\s+") | Where-Object { $_ })[-1]
    if ($procId -match "^\d+$") {
      try { taskkill /PID $procId /F | Out-Null } catch {}
    }
  }
}

# 3) Stop SSH tunnel
Write-Host "==> Stopping SSH tunnel..." -ForegroundColor Cyan
if ($sshPid) {
  try {
    taskkill /PID $sshPid /T /F | Out-Null
    Write-Host "   OK: tunnel stopped (PID $sshPid)" -ForegroundColor Green
  } catch {
    Write-Host "   WARN: could not stop tunnel PID $sshPid (maybe already stopped)" -ForegroundColor Yellow
  }
} else {
  Write-Host "   INFO: tunnel PID not found. Trying to stop ssh.exe..." -ForegroundColor Yellow
  Get-Process ssh -ErrorAction SilentlyContinue | ForEach-Object {
    try { Stop-Process -Id $_.Id -Force } catch {}
  }
}

# 4) Git add/commit/push
Write-Host ""
Write-Host "==> Preparing GitHub push..." -ForegroundColor Cyan

Set-Location $ProjectRoot
git checkout $Branch | Out-Null

$status = git status --porcelain
if (-not $status) {
  Write-Host "OK: nothing to commit (working tree clean)." -ForegroundColor Green
} else {
  git add .

  # Safety: do not commit any .env file
  $stagedFiles = (git diff --name-only --cached) -split "`r?`n" | Where-Object { $_ -and $_.Trim() -ne "" }

  $envFiles = $stagedFiles | Where-Object {
    $_ -ieq ".env" -or $_ -match "(^|/)\.env$" -or $_ -match "(^|/)\.env\."
  }

  if ($envFiles) {
    Write-Host "WARN: .env detected in staging. Removing from stage..." -ForegroundColor Yellow
    foreach ($f in $envFiles) {
      try { git restore --staged -- "$f" 2>$null } catch {}
    }
  }

  $msg = Read-Host "Commit message"
  if ([string]::IsNullOrWhiteSpace($msg)) {
    Write-Host "ERROR: empty commit message. Aborting." -ForegroundColor Red
    exit 1
  }

  git commit -m "$msg"

  try {
    git push $Remote $Branch
  } catch {
    Write-Host "WARN: push failed. Trying pull --rebase then push..." -ForegroundColor Yellow
    git pull --rebase $Remote $Branch
    git push $Remote $Branch
  }
}

# 5) Cleanup session file
if (Test-Path $PidFile) {
  Remove-Item $PidFile -Force
}

Write-Host ""
Write-Host "DONE." -ForegroundColor Green