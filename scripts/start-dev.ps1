# start-dev.ps1 - SINGEM (VERSÃO DEFINITIVA ESTÁVEL)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServerDir   = Join-Path $ProjectRoot "server"

# ===== VPS CONFIG =====
$VpsIp       = "72.61.55.250"
$SshUserHost = "root@$VpsIp"
$SshPort     = 2222

# ===== PORTAS =====
$BackendPort = 3000
$DbLocalPort = 5433      # IMPORTANTE: não usar 5432
$DbRemoteHost = "127.0.0.1"
$DbRemotePort = 5432     # Porta real do Postgres na VPS

$FrontUrl  = "http://localhost:8000"
$HealthUrl = "http://localhost:${BackendPort}/health"

function Stop-PortProcess($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $conn) {
        $processId = $conn.OwningProcess
        if ($processId -and $processId -ne 0) {
            Write-Host "Encerrando processo na porta $port (PID $processId)..."
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            Start-Sleep 1
        }
    }
}

function Wait-Port($hostname, $port, $timeout=60) {
    for ($i=0; $i -lt $timeout; $i++) {
        $ok = (Test-NetConnection $hostname -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
        if ($ok) { return $true }
        Start-Sleep 1
    }
    return $false
}

Write-Host ""
Write-Host "=== SINGEM START DEV ==="
Write-Host "Projeto: $ProjectRoot"
Write-Host "Servidor: $ServerDir"
Write-Host "Tunnel DB: 127.0.0.1:${DbLocalPort} -> ${DbRemoteHost}:${DbRemotePort}"
Write-Host "Backend: http://localhost:${BackendPort}"
Write-Host ""

# 1️⃣ Mata backend antigo (3000)
Stop-PortProcess $BackendPort

# 2️⃣ Mata possível túnel antigo na 5433
Stop-PortProcess $DbLocalPort

# 3️⃣ Sync Git
Set-Location $ProjectRoot
git fetch origin dev | Out-Null
git checkout dev | Out-Null
git pull origin dev --ff-only | Out-Null
Write-Host "Git dev sincronizado."

# 4️⃣ Testa conexão SSH
$sshReach = (Test-NetConnection $VpsIp -Port $SshPort -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $sshReach) {
    Write-Host "Erro: Não conecta na VPS (${VpsIp}:${SshPort})"
    exit 1
}

# 5️⃣ Abre túnel 5433 -> 5432 VPS
$sshCmd = "ssh -p $SshPort -N -L ${DbLocalPort}:${DbRemoteHost}:${DbRemotePort} $SshUserHost"
Start-Process powershell -ArgumentList "-NoExit","-Command",$sshCmd

Write-Host "Aguardando túnel abrir na porta ${DbLocalPort}..."
if (-not (Wait-Port "127.0.0.1" $DbLocalPort 60)) {
    Write-Host "Túnel não abriu. Digite a senha na janela SSH."
    exit 1
}

Write-Host "Tunnel OK."

# 6️⃣ Inicia backend
$serverCmd = "cd `"$ServerDir`"; npm run dev"
Start-Process powershell -ArgumentList "-NoExit","-Command",$serverCmd

# 7️⃣ Abre navegador
Start-Process $FrontUrl
Start-Process $HealthUrl

Write-Host ""
Write-Host "=== AMBIENTE PRONTO ==="
