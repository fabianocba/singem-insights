# start-dev.ps1 (portable, fixed for PowerShell)
$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServerDir   = Join-Path $ProjectRoot "server"
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"

$SshUserHost = "root@72.61.55.250"
$LocalPort   = 5433
$RemoteHost  = "127.0.0.1"
$RemotePort  = 5432

$FrontUrl  = "http://localhost:8000"
$HealthUrl = "http://localhost:3000/health"

Write-Host "==> Starting SINGEM session..." -ForegroundColor Cyan
Write-Host "ProjectRoot: $ProjectRoot" -ForegroundColor Yellow
Write-Host "ServerDir:   $ServerDir" -ForegroundColor Yellow

# 0) Check SSH reachability
Write-Host "==> Checking VPS SSH connectivity (72.61.55.250:22)..." -ForegroundColor Cyan
$sshReach = (Test-NetConnection 72.61.55.250 -Port 22 -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $sshReach) {
  Write-Host "ERROR: Cannot reach VPS on port 22 from this network." -ForegroundColor Red
  exit 1
}
Write-Host "OK: port 22 reachable." -ForegroundColor Green

# 1) Open tunnel window (interactive)
Write-Host "==> Opening SSH tunnel window..." -ForegroundColor Cyan
$sshLine = "ssh -N -L $LocalPort`:$RemoteHost`:$RemotePort $SshUserHost"
Start-Process powershell.exe -ArgumentList "-NoExit","-ExecutionPolicy","Bypass","-Command",$sshLine | Out-Null

# 2) Wait tunnel
Write-Host "==> Waiting tunnel port $LocalPort..." -ForegroundColor Cyan
$tunnelOk = $false
for ($i=1; $i -le 40; $i++) {
  $tunnelOk = (Test-NetConnection 127.0.0.1 -Port $LocalPort -WarningAction SilentlyContinue).TcpTestSucceeded
  if ($tunnelOk) { break }
  Start-Sleep 1
}
if (-not $tunnelOk) {
  Write-Host "ERROR: Tunnel did not open. Check tunnel window (password/timeout)." -ForegroundColor Red
  exit 1
}
Write-Host "OK: tunnel up." -ForegroundColor Green

# 3) Decide which npm script exists (dev or start)
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

# 4) Open browser (don’t block waiting health; just open)
Start-Process "cmd.exe" -ArgumentList "/c","start","chrome",$FrontUrl,$HealthUrl | Out-Null

# 5) Save session
$session = @{
  startedAt   = (Get-Date).ToString("s")
  projectRoot = $ProjectRoot
  serverDir   = $ServerDir
  localPort   = $LocalPort
  npmScript   = $npmScript
}
$session | ConvertTo-Json | Set-Content -Encoding UTF8 $PidFile

Write-Host ""
Write-Host "DONE. Backend script=$npmScript" -ForegroundColor Green
