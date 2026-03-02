Write-Host ""
Write-Host "=== SINGEM STOP DEV + TEST + COMMIT + PUSH (SESSION + SMART) ==="
Write-Host ""

$BackendHost = "127.0.0.1"
$BackendPort = 3000
$FrontPort   = 8000
$TunnelPort  = 5433
$BackendHealthUrl = "http://localhost:3000/health"

$GitRemote = "origin"
$GitBranch = "dev"
$RunIntegrationTests = $true
$IgnoreDirtyRegex = "js/core/version\.json"

function Run-Cmd {
  param([string]$Label,[scriptblock]$Cmd)
  Write-Host ""
  Write-Host "==> $Label"
  try {
    & $Cmd
    if ($LASTEXITCODE -ne 0) { throw "Command failed (exitcode=$LASTEXITCODE)." }
    return $true
  } catch {
    Write-Host ("[ERR] {0}: {1}" -f $Label, $_.Exception.Message)
    return $false
  }
}

function Test-LocalPort {
  param([string]$TargetHost,[int]$Port)
  try { return (Test-NetConnection $TargetHost -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded }
  catch { return $false }
}

function Wait-HttpOk {
  param([string]$Url,[int]$TimeoutSec = 20)
  for ($i=0; $i -lt $TimeoutSec; $i++) {
    try {
      $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
      if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) { return $true }
    } catch {}
    Start-Sleep -Seconds 1
  }
  return $false
}

function Stop-ListeningPort {
  param([int]$Port,[string]$Label)
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  $pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

  if ($pids.Count -eq 0) {
    Write-Host ("[stop] {0} was not active on port {1}." -f $Label, $Port)
    return
  }

  foreach ($pid in $pids) {
    try {
      Stop-Process -Id $pid -Force -ErrorAction Stop
      Write-Host ("[stop] {0} stopped (PID {1}, port {2})." -f $Label, $pid, $Port)
    } catch {
      Write-Host ("[stop] Failed stopping {0} (PID {1}): {2}" -f $Label, $pid, $_.Exception.Message)
    }
  }
}

function Stop-ProcessIfAlive {
  param([int]$Pid,[string]$Label)
  if (-not $Pid) { return $false }
  try {
    $p = Get-Process -Id $Pid -ErrorAction Stop
    Stop-Process -Id $Pid -Force -ErrorAction Stop
    Write-Host ("[stop] {0} stopped by PID (PID {1})." -f $Label, $Pid)
    return $true
  } catch { return $false }
}

function Stop-SshTunnelFallback {
  $sshProcs = Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -match '-L|-R|-D' }
  foreach ($proc in $sshProcs) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host ("[stop] SSH tunnel stopped (PID {0})." -f $proc.ProcessId)
    } catch {}
  }
}

function Get-DirtyLines {
  param([string]$IgnoreRegex)
  $lines = git status --porcelain
  if (-not $lines) { return @() }
  return @($lines | Where-Object { $_ -notmatch $IgnoreRegex })
}

function Get-StagedFiles {
  $files = git diff --cached --name-only
  if (-not $files) { return @() }
  return @($files | Where-Object { $_ -and $_.Trim().Length -gt 0 })
}

function New-SmartCommitMessage {
  param([string[]]$StagedFiles)

  if (-not $StagedFiles -or $StagedFiles.Count -eq 0) {
    return ("chore(core): sync dev {0}" -f (Get-Date -Format 'yyyyMMdd-HHmm'))
  }

  $tags = New-Object System.Collections.Generic.HashSet[string]
  $scope = "core"
  $type  = "chore"

  foreach ($f in $StagedFiles) {
    $p = $f.Replace("\","/").ToLower()

    if ($p -match "^scripts/") { $scope = "scripts"; $tags.Add("scripts") | Out-Null }
    if ($p -match "^server/integrations/") { $tags.Add("integracoes") | Out-Null; $type = "feat"; $scope = "core" }
    if ($p -match "^server/routes/nfe" -or $p -match "^server/domain/nfe/" -or $p -match "/nfe") { $tags.Add("nf") | Out-Null; $type = "feat"; $scope = "core" }
    if ($p -match "empenh" -or $p -match "anexarpdfne") { $tags.Add("empenho") | Out-Null; $type = "feat"; $scope = "core" }
    if ($p -match "audit" -or $p -match "auditlog" -or $p -match "storageaudit") { $tags.Add("auditoria") | Out-Null; $type = "feat"; $scope = "core" }
    if ($p -match "^docs/") { $tags.Add("docs") | Out-Null }
  }

  if ($scope -eq "scripts" -and $tags.Count -eq 1) {
    return "chore(scripts): dev start/stop automation"
  }

  $priority = @("integracoes","empenho","nf","auditoria","docs","scripts")
  $ordered = New-Object System.Collections.Generic.List[string]
  foreach ($x in $priority) { if ($tags.Contains($x)) { $ordered.Add($x) | Out-Null } }
  foreach ($t in $tags) { if (-not $ordered.Contains($t)) { $ordered.Add($t) | Out-Null } }

  if ($ordered.Count -eq 0) { $ordered.Add("ajustes") | Out-Null }
  return ("{0}({1}): {2}" -f $type, $scope, ($ordered -join " + "))
}

function Find-GitRootPortable {
  $root = git rev-parse --show-toplevel 2>$null
  if ($root) { return $root }
  $here = Split-Path -Parent $PSCommandPath
  $dir = Get-Item $here
  while ($dir -ne $null) {
    if (Test-Path (Join-Path $dir.FullName ".git")) { return $dir.FullName }
    $dir = $dir.Parent
  }
  return $null
}

# ==============================
# ROOT
# ==============================
$ProjectRoot = Find-GitRootPortable
if (-not $ProjectRoot) { Write-Host "[ERR] Could not locate git root (.git)."; exit 1 }
Set-Location $ProjectRoot
Write-Host ("ProjectRoot: {0}" -f $ProjectRoot)
Write-Host ""

# ==============================
# LOAD SESSION
# ==============================
$sessionPath = Join-Path $ProjectRoot ".dev-session.json"
$session = $null
if (Test-Path $sessionPath) {
  try { $session = Get-Content $sessionPath -Raw | ConvertFrom-Json } catch { $session = $null }
}

# ==============================
# CHECKOUT DEV
# ==============================
$ok = Run-Cmd "Checkout branch dev" { git checkout $GitBranch }
if (-not $ok) { exit 1 }

# ==============================
# DIRTY?
# ==============================
$dirtyLines = Get-DirtyLines -IgnoreRegex $IgnoreDirtyRegex
if (-not $dirtyLines -or $dirtyLines.Count -eq 0) {
  Write-Host "[OK] No relevant pending changes."
  Write-Host "[DONE]"
  exit 0
}

# ==============================
# TESTS (backend if needed)
# ==============================
$serverDir = Join-Path $ProjectRoot "server"
$startedTempBackend = $false
$tempBackendProc = $null

if ($RunIntegrationTests) {
  if (-not (Test-Path $serverDir)) { Write-Host "[ERR] server folder not found."; exit 1 }

  $backendUp = Wait-HttpOk -Url $BackendHealthUrl -TimeoutSec 2
  if (-not $backendUp) {
    Write-Host "[INFO] Backend not running. Starting temporary backend for tests..."
    Set-Location $serverDir
    $tempBackendProc = Start-Process -FilePath "node" -ArgumentList "index.js" -PassThru -WindowStyle Hidden
    $startedTempBackend = $true
    Set-Location $ProjectRoot

    $okHealth = Wait-HttpOk -Url $BackendHealthUrl -TimeoutSec 20
    if (-not $okHealth) {
      Write-Host "[ERR] Backend did not become healthy on /health."
      if ($startedTempBackend -and $tempBackendProc) { try { Stop-Process -Id $tempBackendProc.Id -Force } catch {} }
      exit 1
    }
  }

  $ok = Run-Cmd "Run integration contract tests" {
    Set-Location $serverDir
    npm run test:integracoes
  }
  Set-Location $ProjectRoot

  if ($startedTempBackend -and $tempBackendProc) {
    try { Stop-Process -Id $tempBackendProc.Id -Force; Write-Host ("[stop] Temporary backend stopped (PID {0})." -f $tempBackendProc.Id) } catch {}
  }

  if (-not $ok) { Write-Host "[ERR] Tests failed. Aborting."; exit 1 }
}

# ==============================
# STAGE + COMMIT
# ==============================
$ok = Run-Cmd "Stage all changes" { git add -A }
if (-not $ok) { exit 1 }

$stagedFiles = Get-StagedFiles
if (-not $stagedFiles -or $stagedFiles.Count -eq 0) { Write-Host "[OK] Nothing staged."; exit 0 }

$commitMsg = New-SmartCommitMessage -StagedFiles $stagedFiles
Write-Host ""
Write-Host ("[INFO] Commit message: {0}" -f $commitMsg)
Write-Host ("[INFO] Staged files: {0}" -f $stagedFiles.Count)
Write-Host ""

$ok = Run-Cmd "Commit" { git commit -m $commitMsg }
if (-not $ok) { exit 1 }

# ==============================
# PULL/REBASE + PUSH
# ==============================
$ok = Run-Cmd "Pull --rebase from origin/dev" { git pull --rebase $GitRemote $GitBranch }
if (-not $ok) { Write-Host "[WARN] Pull/rebase failed. Resolve conflicts and rerun."; exit 1 }

$ok = Run-Cmd "Push to origin/dev" { git push $GitRemote $GitBranch }
if (-not $ok) { exit 1 }

# ==============================
# STOP SERVICES (PID FIRST)
# ==============================
Write-Host ""
Write-Host "==> Stopping DEV services (frontend, backend, tunnel)..."

$stoppedAny = $false
if ($session) {
  $stoppedAny = (Stop-ProcessIfAlive -Pid $session.backend.windowPid -Label "Backend window") -or $stoppedAny
  $stoppedAny = (Stop-ProcessIfAlive -Pid $session.frontend.windowPid -Label "Frontend window") -or $stoppedAny

  # limpa sessão se conseguiu parar algo
  if ($stoppedAny) {
    try { Remove-Item $sessionPath -Force -ErrorAction SilentlyContinue } catch {}
  }
}

# Fallback: parar por porta (só se não parou nada por PID)
if (-not $stoppedAny) {
  $backendPortOpen = Test-LocalPort -TargetHost $BackendHost -Port $BackendPort
  if ($backendPortOpen) {
    $healthOk = Wait-HttpOk -Url $BackendHealthUrl -TimeoutSec 2
    if ($healthOk) { Stop-ListeningPort -Port $BackendPort -Label "Backend SINGEM" }
    else { Write-Host "[stop] Port 3000 busy but /health did not confirm backend. Not stopping." }
  } else { Write-Host "[stop] Backend was not active on port 3000." }

  Stop-ListeningPort -Port $FrontPort -Label "Frontend"
  Stop-ListeningPort -Port $TunnelPort -Label "PostgreSQL tunnel"
  Stop-SshTunnelFallback
}

Write-Host ""
Write-Host "[OK] Commit + pull/rebase + push completed, then services stopped."
Write-Host "[DONE]"
Write-Host ""
