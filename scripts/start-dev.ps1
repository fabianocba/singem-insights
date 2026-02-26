# start-dev.ps1 - SINGEM DEV (SEM SENHA SSH)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServerDir   = Join-Path $ProjectRoot "server"

# ===== VPS CONFIG =====
$VpsIp       = "72.61.55.250"
$SshPort     = 2222
$SshUser     = "root"

# ===== PORTAS =====
$BackendPort = 3000
$DbLocalPort = 5433
$DbRemoteHost = "127.0.0.1"
$DbRemotePort = 5432

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

function Wait-Port($hostname, $port, $timeout=30) {
    for ($i=0; $i -lt $timeout; $i++) {
        $ok = (Test-NetConnection $hostname -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
        if ($ok) { return $true }
        Start-Sleep 1
    }
    return $false
}

Write-Host ""
Write-Host "=== SINGEM START DEV (AUTO SSH) ==="
Write-Host "Projeto: $ProjectRoot"
Write-Host "Servidor: $ServerDir"
Write-Host "Tunnel DB: 127.0.0.1:${DbLocalPort} -> ${DbRemoteHost}:${DbRemotePort}"
Write-Host "Backend: http://localhost:${BackendPort}"
Write-Host ""

# 1️⃣ Mata backend antigo
Stop-PortProcess $BackendPort

# 2️⃣ Mata túnel antigo
Stop-PortProcess $DbLocalPort

# 3️⃣ Sync Git (branch dev)
Set-Location $ProjectRoot
git fetch origin dev | Out-Null
git checkout dev | Out-Null
git pull origin dev --ff-only | Out-Null
Write-Host "Git dev sincronizado."

# 4️⃣ Abre túnel SSH SEM SENHA
$sshCmd = "ssh -o StrictHostKeyChecking=no -p ${SshPort} -N -L ${DbLocalPort}:${DbRemoteHost}:${DbRemotePort} ${SshUser}@${VpsIp}"
Start-Process powershell -ArgumentList "-NoExit","-Command",$sshCmd

Write-Host "Aguardando túnel abrir..."
if (-not (Wait-Port "127.0.0.1" $DbLocalPort 30)) {
    Write-Host "Erro: túnel não abriu."
    exit 1
}
Write-Host "Tunnel OK."

# 5️⃣ Inicia backend
$serverCmd = "cd `"$ServerDir`"; npm run dev"
Start-Process powershell -ArgumentList "-NoExit","-Command",$serverCmd

# 6️⃣ Abre navegador
Start-Process $FrontUrl
Start-Process $HealthUrl

Write-Host ""
Write-Host "=== AMBIENTE DEV PRONTO ==="
