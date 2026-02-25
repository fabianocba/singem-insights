param(
  [ValidateSet("ask","dev","main")]
  [string]$Branch = "ask"
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"
$Remote      = "origin"

Write-Host "==> Stopping SINGEM session (UNIFIED)..." -ForegroundColor Cyan
Write-Host "Project root detected: $ProjectRoot" -ForegroundColor Yellow

function Try-KillTree([int]$processId, [string]$label) {
  if (-not $processId) { return }
  try {
    taskkill /PID $processId /T /F | Out-Null
    Write-Host "$label stopped (PID $processId)." -ForegroundColor Green
  } catch {
    Write-Host "$label PID $processId not stopped (maybe already closed)." -ForegroundColor DarkYellow
  }
}

function Ensure-Git() {
  try { git --version | Out-Null }
  catch { throw "Git not found in PATH." }
}

if ($Branch -eq "ask") {
  Write-Host ""
  Write-Host "Choose target branch:" -ForegroundColor Cyan
  Write-Host "  1) dev"
  Write-Host "  2) main"
  $choice = Read-Host "Type 1 or 2"
  switch ($choice) {
    "1" { $Branch = "dev" }
    "2" { $Branch = "main" }
    default { throw "Invalid choice. Use 1 (dev) or 2 (main)." }
  }
}

Write-Host "==> Target branch: $Branch" -ForegroundColor Cyan

$sshPid = $null
$serverPid = $null

if (Test-Path $PidFile) {
  try {
    $sess = Get-Content $PidFile -Raw | ConvertFrom-Json
    $sshPid = $sess.sshPid
    $serverPid = $sess.serverPid
  } catch {
    Write-Host "Warning: Could not parse $PidFile" -ForegroundColor DarkYellow
  }
}

Try-KillTree -processId $serverPid -label "Server"
Try-KillTree -processId $sshPid -label "Tunnel"

Set-Location $ProjectRoot
Ensure-Git

git fetch $Remote
git checkout $Branch
git pull --ff-only $Remote $Branch

$status = git status --porcelain
if ($status) {
  git add .
  git status

  $msg = Read-Host "Commit message ($Branch)"
  if (-not [string]::IsNullOrWhiteSpace($msg)) {
    git commit -m "$msg"
    git push $Remote $Branch
    Write-Host "Push to $Branch completed." -ForegroundColor Green
  } else {
    Write-Host "Commit message empty. Skipping commit/push." -ForegroundColor Yellow
  }
} else {
  Write-Host "No changes to commit." -ForegroundColor Yellow
}

if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

Write-Host "DONE ($Branch)." -ForegroundColor Green
