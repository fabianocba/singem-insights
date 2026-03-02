Write-Host ""
Write-Host "=== SINGEM START DEV (PORTABLE) ==="
Write-Host ""

$BackendPort = 3000
$FrontPort   = 8000
$BackendHealthUrl = "http://localhost:3000/health"

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

function Wait-HttpOk {
    param([string]$Url,[int]$TimeoutSec = 25)
    for ($i=0; $i -lt $TimeoutSec; $i++) {
        try {
            $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) { return $true }
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

function Test-LocalPort { param([string]$TargetHost,[int]$Port)
    try { return (Test-NetConnection $TargetHost -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded }
    catch { return $false }
}

function Start-TerminalCommand {
    param(
        [string]$WorkDir,
        [string]$Title,
        [string]$Command
    )
    # Abre uma nova janela do PowerShell e mantém aberta
    $args = "-NoExit", "-Command", "Set-Location `"$WorkDir`"; `$TargetHost.ui.RawUI.WindowTitle=`"$Title`"; $Command"
    return Start-Process -FilePath "powershell.exe" -ArgumentList $args -PassThru
}

$ProjectRoot = Find-GitRootPortable
if (-not $ProjectRoot) {
    Write-Host "[ERR] Nao foi possivel localizar a raiz do Git (.git)."
    exit 1
}

$serverDir = Join-Path $ProjectRoot "server"
if (-not (Test-Path $serverDir)) {
    Write-Host "[ERR] Pasta server nao encontrada em $ProjectRoot"
    exit 1
}

Set-Location $ProjectRoot
Write-Host ("ProjectRoot: {0}" -f $ProjectRoot)
Write-Host ""

# 1) Backend
$backendRunning = Wait-HttpOk -Url $BackendHealthUrl -TimeoutSec 2
if (-not $backendRunning) {
    Write-Host "[INFO] Subindo backend (server) em nova janela..."
    # Preferir npm run dev se existir
    $backendCmd = "if (Test-Path .\package.json) { npm run dev } else { node index.js }"
    $backendProc = Start-TerminalCommand -WorkDir $serverDir -Title "SINGEM BACKEND (DEV)" -Command $backendCmd
    # Espera /health
    $ok = Wait-HttpOk -Url $BackendHealthUrl -TimeoutSec 25
    if (-not $ok) {
        Write-Host "[ERR] Backend nao respondeu em /health (porta 3000). Verifique logs na janela do backend."
        # Mesmo assim continua para frontend, se quiser
    } else {
        Write-Host "[OK] Backend online."
    }
} else {
    Write-Host "[OK] Backend ja esta online."
    $backendProc = $null
}

# 2) Frontend (servidor estático)
$frontRunning = Test-LocalPort -TargetHost "127.0.0.1" -Port $FrontPort
if (-not $frontRunning) {
    Write-Host "[INFO] Subindo frontend estatico na porta 8000..."
    # Tenta usar http-server (se existir), senão usa python (se existir)
    $frontCmd = @"
if (Get-Command http-server -ErrorAction SilentlyContinue) {
  http-server `"$ProjectRoot`" -p 8000 -c-1
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
  py -m http.server 8000 --directory `"$ProjectRoot`"
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
  python -m http.server 8000 --directory `"$ProjectRoot`"
} else {
  Write-Host '[ERR] Nem http-server nem python encontrados. Instale: npm i -g http-server'
}
"@
    $frontProc = Start-TerminalCommand -WorkDir $ProjectRoot -Title "SINGEM FRONTEND (8000)" -Command $frontCmd
    Start-Sleep -Seconds 2
} else {
    Write-Host "[OK] Frontend ja esta na porta 8000."
    $frontProc = $null
}

# 3) Salvar sessão (PIDs das janelas)
$session = @{
    projectRoot = $ProjectRoot
    startedAt   = (Get-Date).ToString("s")
    backend = @{
        port = 3000
        health = $BackendHealthUrl
        windowPid = if ($backendProc) { $backendProc.Id } else { $null }
    }
    frontend = @{
        port = 8000
        windowPid = if ($frontProc) { $frontProc.Id } else { $null }
    }
} | ConvertTo-Json -Depth 6

$sessionPath = Join-Path $ProjectRoot ".dev-session.json"
$session | Set-Content -Path $sessionPath -Encoding UTF8

Write-Host ""
Write-Host ("[OK] Sessao salva em: {0}" -f $sessionPath)
Write-Host ("[INFO] Abra: http://localhost:{0}" -f $FrontPort)
Write-Host ""


