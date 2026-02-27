Write-Host ""
Write-Host "=== SINGEM STOP DEV ==="
Write-Host ""

$BackendHost = "127.0.0.1"
$BackendPort = 3000
$FrontPort = 8000
$TunnelPort = 5433
$BackendHealthUrl = "http://localhost:3000/health"

$ProjectRoot = git rev-parse --show-toplevel 2>$null
if (-not $ProjectRoot) {
    Write-Host "❌ Não foi possível localizar a raiz do Git."
    exit 1
}

Set-Location $ProjectRoot
Write-Host "Projeto: $ProjectRoot"
Write-Host ""

function Test-LocalPort {
    param(
        [string]$TargetHost,
        [int]$Port
    )

    try {
        return (Test-NetConnection $TargetHost -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded
    } catch {
        return $false
    }
}

function Test-HttpOk {
    param(
        [string]$Url,
        [int]$TimeoutSec = 6
    )

    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        try {
            $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) {
                return $true
            }
        } catch {}

        Start-Sleep -Seconds 1
    }

    return $false
}

function Stop-ListeningPort {
    param(
        [int]$Port,
        [string]$Label
    )

    $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
    $pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

    if ($pids.Count -eq 0) {
        Write-Host "[stop] $Label não estava ativo na porta $Port."
        return
    }

    foreach ($procId in $pids) {
        try {
            Stop-Process -Id $procId -Force -ErrorAction Stop
            Write-Host "[stop] $Label encerrado (PID $procId, porta $Port)."
        } catch {
            Write-Host "[stop] Falha ao encerrar $Label (PID $procId, porta $Port): $($_.Exception.Message)"
        }
    }
}

function Stop-SshTunnelFallback {
    $sshProcs = Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -match '-L|-R|-D' }

    foreach ($proc in $sshProcs) {
        try {
            Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
            Write-Host "[stop] Tunnel SSH encerrado (PID $($proc.ProcessId))."
        } catch {}
    }
}

# ==============================
# ENCERRAR PROCESSOS
# ==============================
Write-Host "==> Encerrando serviços DEV (frontend, backend, túnel)..."

$backendPortOpen = Test-LocalPort -TargetHost $BackendHost -Port $BackendPort
if ($backendPortOpen) {
    $backendHealthOk = Test-HttpOk -Url $BackendHealthUrl -TimeoutSec 6
    if ($backendHealthOk) {
        Stop-ListeningPort -Port $BackendPort -Label "Backend SINGEM"
    } else {
        Write-Host "[stop] Porta 3000 ocupada, mas /health não confirmou backend SINGEM. Não encerrado por segurança."
    }
} else {
    Write-Host "[stop] Backend não estava ativo na porta 3000."
}

Stop-ListeningPort -Port $FrontPort -Label "Frontend"
Stop-ListeningPort -Port $TunnelPort -Label "Túnel PostgreSQL"
Stop-SshTunnelFallback

Write-Host "✅ Encerramento concluído."
Write-Host ""

# ==============================
# CHECAGEM DE ALTERAÇÕES
# ==============================
$dirtyFiles = git status --porcelain | Where-Object { $_ -notmatch "js/core/version.json" }

if ($dirtyFiles) {
    Write-Host ""
    Write-Host "⚠️ Existem alterações pendentes (exceto version.json):"
    $dirtyFiles
    Write-Host ""
    Write-Host "Se quiser salvar:"
    Write-Host "git add ."
    Write-Host 'git commit -m "mensagem"'
    Write-Host "git push origin dev"
    Write-Host ""
} else {
    Write-Host "✅ Nenhuma alteração pendente relevante."
}

Write-Host ""
Write-Host "Resumo:"
Write-Host "- ProjectRoot: $ProjectRoot"
Write-Host "- FrontPort: $FrontPort"
Write-Host "- BackendPort: $BackendPort"
Write-Host "- TunnelPort: $TunnelPort"
Write-Host "🛑 Ambiente DEV encerrado."
Write-Host ""
