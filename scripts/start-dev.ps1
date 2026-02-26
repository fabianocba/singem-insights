# start-dev.ps1 - SINGEM (Windows PowerShell)
# - Always syncs latest dev from GitHub (auto-stash if dirty)
# - Opens SSH tunnel to VPS Postgres
# - Starts backend (npm run dev/start)
# - Opens browser

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServerDir   = Join-Path $ProjectRoot "server"
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"

# === VPS / SSH TUNNEL SETTINGS ===
$VpsIp       = "72.61.55.250"
$SshUserHost = "root@$VpsIp"
$SshPort     = 2222

$LocalPort   = 5433
$RemoteHost  = "127.0.0.1"
$RemotePort  = 5432

# === URLS ===
$FrontUrl  = "http://localhost:8000"
$HealthUrl = "http://localhost:3000/health"

function Ensure-Command($cmd) {
  $null = Get-Command $cmd -ErrorAction SilentlyContinue
  if (-not $?) { throw "Command not found: $cmd. Install it and try again." }
}

Write-Host "==> Starting SINGEM session..." -ForegroundColor Cyan
Write-Host "ProjectRoot: $ProjectRoot" -ForegroundColor Yellow
Write-Host "ServerDir:   $ServerDir" -ForegroundColor Yellow
Write-Host "SSH:         $SshUserHost (port $SshPort)" -ForegroundColor Yellow
Write-Host "Tunnel:      127.0.0.1:${LocalPort} -> ${RemoteHost}:${RemotePort}" -ForegroundColor Yellow

# 0) Ensure required commands exist
Ensure-Command git
Ensure-Command ssh
Ensure-Command npm

# 1) ALWAYS sync latest dev from GitHub
Write-Host "==> Syncing with GitHub (branch dev)..." -ForegroundColor Cyan
Set-Location -LiteralPath $ProjectRoot

# Verify it's a git repo
if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
  Write-Host "ERROR: Not a git repository: $ProjectRoot" -ForegroundColor Red
  exit 1
}

# Stash if dirty
$dirty = (git status --porcelain)
$stashMade = $false
if ($dirty) {
  $stashMsg = "autostash start-dev $(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Write-Host "==> Working tree dirty: creating stash ($stashMsg)..." -ForegroundColor Yellow
  git stash push -u -m $stashMsg | Out-Null
  $stashMade = $true
}

# Checkout dev and pull fast-forward only
git fetch origin dev | Out-Null
git checkout dev | Out-Null
git pull origin dev --ff-only

# Re-apply stash if we created one
if ($stashMade) {
  Write-Host "==> Re-applying stash..." -ForegroundColor Cyan
  $popOut = git stash pop 2>&1
  if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Stash pop had conflicts. Resolve conflicts, then run again." -ForegroundColor Red
    Write-Host $popOut
    exit 1
  }
}

Write-Host "OK: GitHub dev synced." -ForegroundColor Green

# 2) Check SSH reachability
Write-Host "==> Checking VPS SSH connectivity (${VpsIp}:${SshPort})..." -ForegroundColor Cyan
$sshReach = (Test-NetConnection $VpsIp -Port $SshPort -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $sshReach) {
  Write-Host "ERROR: Cannot reach VPS on port $SshPort from this network." -ForegroundColor Red
  exit 1
}
Write-Host "OK: SSH port reachable." -ForegroundColor Green

# 3) Open tunnel window (interactive)
Write-Host "==> Opening SSH tunnel window..." -ForegroundColor Cyan
$sshLine = "ssh -p $SshPort -N -L ${LocalPort}:${RemoteHost}:${RemotePort} $SshUserHost"
Start-Process powershell.exe -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-Command",$sshLine | Out-Null

# 4) Wait tunnel
Write-Host "==> Waiting tunnel port $LocalPort..." -ForegroundColor Cyan
$tunnelOk = $false
for ($i=1; $i -le 40; $i++) {
  $tunnelOk = (Test-NetConnection 127.0.0.1 -Port $LocalPort -WarningAction SilentlyContinue).TcpTestSucceeded
  if ($tunnelOk) { break }
  Start-Sleep 1
}
if (-not $tunnelOk) {
  Write-Host "ERROR: Tunnel did not open on 127.0.0.1:$LocalPort." -ForegroundColor Red
  Write-Host "Check tunnel window (password/auth/timeout)." -ForegroundColor Yellow
  exit 1
}
Write-Host "OK: tunnel up." -ForegroundColor Green

# 5) Decide which npm script exists (dev or start)
if (-not (Test-Path (Join-Path $ServerDir "package.json"))) {
  Write-Host "ERROR: package.json not found in server dir: $ServerDir" -ForegroundColor Red
  exit 1
}

$pkg = Get-Content (Join-Path $ServerDir "package.json") -Raw | ConvertFrom-Json
$npmScript = $null
if ($pkg.scripts.dev) { $npmScript = "dev" }
elseif ($pkg.scripts.start) { $npmScript = "start" }
else {
  Write-Host "ERROR: No npm script 'dev' or 'start' found in server/package.json" -ForegroundColor Red
  Write-Host "Run: cd `"$ServerDir`"; npm run" -ForegroundColor Yellow
  exit 1
}

Write-Host "==> Starting backend: npm run $npmScript ..." -ForegroundColor Cyan
$serverCmd = "Set-Location -LiteralPath `"$ServerDir`"; npm run $npmScript"
Start-Process powershell.exe -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-Command",$serverCmd | Out-Null

# 6) Open browser
Start-Process "cmd.exe" -ArgumentList "/c","start","chrome",$FrontUrl,$HealthUrl | Out-Null

# 7) Save session
$session = @{
  startedAt   = (Get-Date).ToString("s")
  projectRoot = $ProjectRoot
  serverDir   = $ServerDir
  vpsIp       = $VpsIp
  sshPort     = $SshPort
  localPort   = $LocalPort
  remoteHost  = $RemoteHost
  remotePort  = $RemotePort
  npmScript   = $npmScript
}
$session | ConvertTo-Json | Set-Content -Encoding UTF8 $PidFile

Write-Host ""
Write-Host "DONE. Synced dev + tunnel localhost:$LocalPort + backend $npmScript" -ForegroundColor Green
