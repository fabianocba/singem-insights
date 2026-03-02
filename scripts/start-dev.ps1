Write-Host ""
Write-Host "=== SINGEM START DEV (PORTABLE) ==="
Write-Host ""

$TunnelHost       = "127.0.0.1"
$TunnelLocalPort  = 5433
$TunnelRemoteHost = "127.0.0.1"
$TunnelRemotePort = 5432
$TunnelSshPort    = 2222
$TunnelSshUser    = "root"
$TunnelSshHost    = "srv1401818.hstgr.cloud"

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

function Wait-BackendHealthy {
    param([string]$Url,[int]$TimeoutSec = 25)
    for ($i=0; $i -lt $TimeoutSec; $i++) {
        try {
            $json = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 3
            if ($json -and $json.status -eq 'OK' -and $json.database -eq 'conectado') {
                return $true
            }
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

function Test-LocalPort { param([string]$TargetHost,[int]$Port)
    try { return (Test-NetConnection $TargetHost -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded }
    catch { return $false }
}

function Stop-ListeningPort {
    param([int]$Port,[string]$Label)
    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    $procIds = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)
    if ($procIds.Count -eq 0) { return }

    foreach ($procId in $procIds) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host ("[stop] {0} stopped (PID {1}, port {2})." -f $Label, $procId, $Port)
        } catch {}
    }
}

function Start-TerminalCommand {
    param(
        [string]$WorkDir,
        [string]$Title,
        [string]$Command
    )

    # Monta um script interno seguro (sem briga de aspas)
    $inner = @"
Set-Location -LiteralPath '$WorkDir'
`$host.ui.RawUI.WindowTitle = '$Title'
$Command
"@

    $args = @(
        "-NoExit",
        "-ExecutionPolicy","Bypass",
        "-Command", $inner
    )

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

# 0) Túnel PostgreSQL
$tunnelProc = $null
$tunnelRunning = Test-LocalPort -TargetHost $TunnelHost -Port $TunnelLocalPort
if (-not $tunnelRunning) {
    Write-Host "[INFO] Túnel PostgreSQL ausente. Abrindo túnel SSH..."
    $sshCmd = "ssh -N -L $TunnelLocalPort`:$TunnelRemoteHost`:$TunnelRemotePort -p $TunnelSshPort $TunnelSshUser@$TunnelSshHost"
    $tunnelProc = Start-TerminalCommand -WorkDir $ProjectRoot -Title "SINGEM DB TUNNEL" -Command $sshCmd

    Start-Sleep -Seconds 2
    $tunnelUp = Test-LocalPort -TargetHost $TunnelHost -Port $TunnelLocalPort
    if (-not $tunnelUp) {
        Write-Host "[ERR] Túnel SSH não ficou disponível na porta 5433. Verifique credenciais/chave SSH."
        exit 1
    }
    Write-Host "[OK] Túnel PostgreSQL ativo na 5433."
} else {
    Write-Host "[OK] Túnel PostgreSQL já ativo na 5433."
}

# 1) Backend
$backendRunning = Wait-BackendHealthy -Url $BackendHealthUrl -TimeoutSec 2
if (-not $backendRunning) {
    if (Test-LocalPort -TargetHost "127.0.0.1" -Port $BackendPort) {
        Write-Host "[INFO] Backend na 3000 está degradado. Reiniciando..."
        Stop-ListeningPort -Port $BackendPort -Label "Backend"
        Start-Sleep -Seconds 1
    }

    Write-Host "[INFO] Subindo backend (server) em nova janela..."
    # Preferir npm run dev se existir
    $backendCmd = "if (Test-Path .\package.json) { npm run dev } else { node index.js }"
    $backendProc = Start-TerminalCommand -WorkDir $serverDir -Title "SINGEM BACKEND (DEV)" -Command $backendCmd
    # Espera /health real (DB conectada)
    $ok = Wait-BackendHealthy -Url $BackendHealthUrl -TimeoutSec 25
    if (-not $ok) {
        Write-Host "[ERR] Backend não ficou saudável (status OK + DB conectada) na porta 3000."
        Write-Host "[ERR] Verifique logs do backend e túnel PostgreSQL."
        exit 1
    } else {
        Write-Host "[OK] Backend online."
    }
} else {
    Write-Host "[OK] Backend já saudável."
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
    tunnel = @{
        port = $TunnelLocalPort
        windowPid = if ($tunnelProc) { $tunnelProc.Id } else { $null }
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






