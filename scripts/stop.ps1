Write-Host ""
Write-Host "=== SINGEM STOP DEV + TEST + COMMIT + PUSH (PORTABLE + SMART) ==="
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

        if ($p -match "^server/integrations/") { $tags.Add("integracoes") | Out-Null; $type = "feat" }
        if ($p -match "^server/integrations/dadosgov/") { $tags.Add("dadosgov") | Out-Null; $type = "feat" }
        if ($p -match "^server/integrations/catmat/") { $tags.Add("catmat") | Out-Null; $type = "feat" }
        if ($p -match "^server/integrations/sync/" -or $p -match "^server/routes/sync\.routes") { $tags.Add("sync") | Out-Null; $type = "feat" }

        if ($p -match "^server/routes/nfe" -or $p -match "^server/domain/nfe/" -or $p -match "/nfe") { $tags.Add("nf") | Out-Null; $type = "feat" }
        if ($p -match "empenh" -or $p -match "anexarpdfne") { $tags.Add("empenho") | Out-Null; $type = "feat" }

        if ($p -match "audit" -or $p -match "auditlog" -or $p -match "storageaudit") { $tags.Add("auditoria") | Out-Null; $type = "feat" }

        if ($p -match "^server/tests/" -or $p -match "/tests/") { $tags.Add("testes") | Out-Null; if ($type -ne "feat") { $type = "test" } }
        if ($p -match "^docs/") { $tags.Add("docs") | Out-Null }
        if ($p -match "^scripts/" -or $p -match "^config/") { $tags.Add("infra") | Out-Null }

        if ($p -match "^server/") { $scope = "server" }
        if ($p -match "^js/" -or $p -match "^index\.html" -or $p -match "^config/") { if ($scope -ne "server") { $scope = "web" } }
    }

    if ($tags.Contains("integracoes") -or $tags.Contains("nf") -or $tags.Contains("empenho")) {
        $scope = "core"
        if ($type -eq "test") { $type = "feat" }
    }

    $priority = @("integracoes","dadosgov","catmat","sync","empenho","nf","auditoria","testes","docs","infra")
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
if (-not $ProjectRoot) {
    Write-Host "[ERR] Could not locate git root (.git)."
    exit 1
}
Set-Location $ProjectRoot
Write-Host ("ProjectRoot: {0}" -f $ProjectRoot)
Write-Host ""

# ==============================
# GIT PREP (checkout dev)
# ==============================
$ok = Run-Cmd "Checkout branch dev" { git checkout $GitBranch }
if (-not $ok) { exit 1 }

# ==============================
# DIRTY?
# ==============================
$dirtyLines = Get-DirtyLines -IgnoreRegex $IgnoreDirtyRegex
if (-not $dirtyLines -or $dirtyLines.Count -eq 0) {
    Write-Host "[OK] No relevant pending changes."
    Write-Host "[DONE] Nothing to push."
    Write-Host ""
    exit 0
}

# ==============================
# TESTS (BEFORE STOP BACKEND)
# If backend is not running, start it temporarily, run tests, then stop it.
# ==============================
$serverDir = Join-Path $ProjectRoot "server"
$startedTempBackend = $false
$tempBackendProc = $null

if ($RunIntegrationTests) {
    if (-not (Test-Path $serverDir)) {
        Write-Host "[ERR] server folder not found. Aborting tests."
        exit 1
    }

    $backendUp = Wait-HttpOk -Url $BackendHealthUrl -TimeoutSec 2
    if (-not $backendUp) {
        Write-Host "[INFO] Backend not running. Starting temporary backend for tests..."
        Set-Location $serverDir

        # Start backend detached
        $tempBackendProc = Start-Process -FilePath "node" -ArgumentList "index.js" -PassThru -WindowStyle Hidden
        $startedTempBackend = $true

        Set-Location $ProjectRoot

        $okHealth = Wait-HttpOk -Url $BackendHealthUrl -TimeoutSec 20
        if (-not $okHealth) {
            Write-Host "[ERR] Backend did not become healthy on /health. Aborting."
            if ($startedTempBackend -and $tempBackendProc) { try { Stop-Process -Id $tempBackendProc.Id -Force } catch {} }
            exit 1
        }
    }

    $ok = Run-Cmd "Run integration contract tests" {
        Set-Location $serverDir
        npm run test:integracoes
    }
    Set-Location $ProjectRoot

    # Stop temporary backend after tests
    if ($startedTempBackend -and $tempBackendProc) {
        try {
            Stop-Process -Id $tempBackendProc.Id -Force
            Write-Host ("[stop] Temporary backend stopped (PID {0})." -f $tempBackendProc.Id)
        } catch {}
    }

    if (-not $ok) {
        Write-Host "[ERR] Tests failed. Aborting commit/push."
        exit 1
    }
}

# ==============================
# STAGE + COMMIT
# ==============================
$ok = Run-Cmd "Stage all changes" { git add -A }
if (-not $ok) { exit 1 }

$stagedFiles = Get-StagedFiles
if (-not $stagedFiles -or $stagedFiles.Count -eq 0) {
    Write-Host "[OK] Nothing staged after add."
    exit 0
}

$commitMsg = New-SmartCommitMessage -StagedFiles $stagedFiles
Write-Host ""
Write-Host ("[INFO] Commit message: {0}" -f $commitMsg)
Write-Host ("[INFO] Staged files: {0}" -f $stagedFiles.Count)
Write-Host ""

$ok = Run-Cmd "Commit" { git commit -m $commitMsg }
if (-not $ok) { exit 1 }

# ==============================
# PULL REBASE (AFTER COMMIT)
# ==============================
$ok = Run-Cmd "Pull --rebase from origin/dev" { git pull --rebase $GitRemote $GitBranch }
if (-not $ok) {
    Write-Host "[WARN] Pull/rebase failed. Resolve conflicts if any, then rerun."
    exit 1
}

# ==============================
# PUSH
# ==============================
$ok = Run-Cmd "Push to origin/dev" { git push $GitRemote $GitBranch }
if (-not $ok) { exit 1 }

# ==============================
# STOP SERVICES (NOW SAFE)
# ==============================
Write-Host ""
Write-Host "==> Stopping DEV services (frontend, backend, tunnel)..."

# Backend: only stop if /health indicates something up
$backendPortOpen = Test-LocalPort -TargetHost $BackendHost -Port $BackendPort
if ($backendPortOpen) {
    $healthOk = Wait-HttpOk -Url $BackendHealthUrl -TimeoutSec 2
    if ($healthOk) {
        Stop-ListeningPort -Port $BackendPort -Label "Backend SINGEM"
    } else {
        Write-Host "[stop] Port 3000 busy but /health did not confirm SINGEM backend. Not stopping for safety."
    }
} else {
    Write-Host "[stop] Backend was not active on port 3000."
}

Stop-ListeningPort -Port $FrontPort -Label "Frontend"
Stop-ListeningPort -Port $TunnelPort -Label "PostgreSQL tunnel"
Stop-SshTunnelFallback

Write-Host ""
Write-Host "[OK] Commit + pull/rebase + push completed, then services stopped."
Write-Host "[DONE]"
Write-Host ""
