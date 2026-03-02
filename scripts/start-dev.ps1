Write-Host ""
Write-Host "=== SINGEM START DEV ===" -ForegroundColor Cyan
Write-Host ""

# ==============================
# CONFIG (TÚNEL POSTGRES)
# ==============================
$TunnelHost       = "127.0.0.1"
$TunnelLocalPort  = 5433
$TunnelRemoteHost = "127.0.0.1"
$TunnelRemotePort = 5432
$TunnelSshPort    = 2222
$TunnelSshUser    = "root"
$TunnelSshIp      = "72.61.55.250"

function Test-TunnelPort {
    param([string]$TargetHost, [int]$Port)
    try { return (Test-NetConnection $TargetHost -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded }
    catch { return $false }
}

function Wait-TunnelPort {
    param([string]$TargetHost, [int]$Port, [int]$TimeoutSec = 20)
    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        if (Test-TunnelPort -TargetHost $TargetHost -Port $Port) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Wait-HttpOk {
    param([string]$Url, [int]$TimeoutSec = 20)
    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        try {
            $res = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 3
            if ($res.StatusCode -ge 200 -and $res.StatusCode -lt 500) { return $true }
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

function Get-ProjectRoot {
    # 1) Tenta raiz do git
    $gitRoot = & git rev-parse --show-toplevel 2>$null
    if ($LASTEXITCODE -eq 0 -and $gitRoot) {
        return (Resolve-Path -LiteralPath $gitRoot).Path
    }

    # 2) Se estiver dentro de um .ps1, usa pasta do script
    if ($PSScriptRoot) {
        return (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
    }

    # 3) Fallback: pasta atual
    return (Get-Location).Path
}

# ==============================
# RAIZ DO PROJETO (PORTÁTIL)
# ==============================
$ProjectRoot = Get-ProjectRoot
Set-Location $ProjectRoot

Write-Host "Projeto detectado: $ProjectRoot" -ForegroundColor Yellow
Write-Host ""

# ==============================
# GIT SYNC SEGURO (DEV)
# ==============================
Write-Host "==> GIT: sincronizar dev sem risco de perda" -ForegroundColor Cyan

& git fetch origin dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao executar: git fetch origin dev" -ForegroundColor Red
    exit 1
}

$originalBranch = & git branch --show-current
if (-not $originalBranch) {
    Write-Host "Falha ao identificar branch atual." -ForegroundColor Red
    exit 1
}

& git show-ref --verify --quiet refs/heads/dev
$localDevExists = ($LASTEXITCODE -eq 0)

$originDevHash = & git rev-parse origin/dev
if ($LASTEXITCODE -ne 0 -or -not $originDevHash) {
    Write-Host "Falha ao obter hash de origin/dev" -ForegroundColor Red
    exit 1
}

$needSync = $true
if ($localDevExists) {
    $localDevHash = & git rev-parse dev
    if ($LASTEXITCODE -eq 0 -and $localDevHash -eq $originDevHash) { $needSync = $false }
}

if (-not $needSync) {
    Write-Host "origin/dev sem novidades. Seguindo." -ForegroundColor Green
} else {
    $hasLocalChanges = ((& git status --porcelain) | Measure-Object).Count -gt 0
    $stashCreated = $false

    if ($hasLocalChanges) {
        Write-Host "Alterações locais detectadas. Salvando temporariamente (git stash)..." -ForegroundColor Yellow
        $stashMessage = "start-dev autostash " + (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        & git stash push -u -m $stashMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao salvar alterações locais com git stash" -ForegroundColor Red
            exit 1
        }
        $stashCreated = $true
    }

    if (-not $localDevExists) {
        & git switch -c dev --track origin/dev
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao criar branch dev local a partir de origin/dev" -ForegroundColor Red
            exit 1
        }
    } else {
        & git switch dev
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao trocar para branch dev" -ForegroundColor Red
            exit 1
        }

        & git merge --ff-only origin/dev
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha no fast-forward com origin/dev. Resolva merge/rebase e rode novamente." -ForegroundColor Red
            exit 1
        }
    }

    if ($originalBranch -ne "dev") {
        & git switch $originalBranch
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao retornar para branch original: $originalBranch" -ForegroundColor Red
            exit 1
        }
    }

    if ($stashCreated) {
        Write-Host "Restaurando alterações locais (git stash pop)..." -ForegroundColor Yellow
        & git stash pop
        if ($LASTEXITCODE -ne 0) {
            Write-Host "A restauração do stash encontrou conflitos. Resolva conflitos e continue." -ForegroundColor Red
            exit 1
        }
    }

    Write-Host "Repo sincronizado com origin/dev e alterações locais restauradas" -ForegroundColor Green
}
Write-Host ""

# ==============================
# TÚNEL POSTGRES (AUTO-REPARO)
# ==============================
Write-Host "==> DB TUNNEL: verificar porta 5433" -ForegroundColor Cyan

$tunnelOk = Test-TunnelPort -TargetHost $TunnelHost -Port $TunnelLocalPort
if (-not $tunnelOk) {
    Write-Host "Porta 5433 fechada. Tentando abrir túnel automaticamente..." -ForegroundColor Yellow

    $sshCommand = "ssh -N -L $TunnelLocalPort`:$TunnelRemoteHost`:$TunnelRemotePort -p $TunnelSshPort $TunnelSshUser@$TunnelSshIp"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $sshCommand

    $tunnelOpened = Wait-TunnelPort -TargetHost $TunnelHost -Port $TunnelLocalPort -TimeoutSec 20
    if (-not $tunnelOpened) {
        Write-Host ""
        Write-Host "Falha ao abrir túnel PostgreSQL na porta 5433 em até 20s." -ForegroundColor Red
        Write-Host "Execute manualmente em outra janela PowerShell:" -ForegroundColor Yellow
        Write-Host "ssh -N -L 5433:127.0.0.1:5432 -p 2222 root@72.61.55.250" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    Write-Host "Túnel PostgreSQL aberto com sucesso (127.0.0.1:5433)." -ForegroundColor Green
} else {
    Write-Host "Túnel PostgreSQL já disponível (127.0.0.1:5433)." -ForegroundColor Green
}
Write-Host ""

# ==============================
# FRONTEND (porta 8000)
# ==============================
Write-Host "==> FRONT: iniciar servidor local 8000" -ForegroundColor Cyan

$frontPort = 8000
$frontAlreadyRunning = Test-TunnelPort -TargetHost "127.0.0.1" -Port $frontPort

if ($frontAlreadyRunning) {
    Write-Host "Frontend já está ativo na porta $frontPort. Reutilizando." -ForegroundColor Green
} else {
    # Preferir npx http-server (sem cache), fallback python
    $hasNpx = $false
    try { & npx --version *> $null; if ($LASTEXITCODE -eq 0) { $hasNpx = $true } } catch {}

    if ($hasNpx) {
        $frontCmd = "cd `"$ProjectRoot`"; npx http-server -p $frontPort -c-1"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontCmd
    } else {
        $frontCmd = "cd `"$ProjectRoot`"; python -m http.server $frontPort"
        Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontCmd
    }

    Start-Sleep -Seconds 2
}

# ==============================
# BACKEND (porta 3000)
# ==============================
Write-Host "==> BACKEND: iniciar npm run dev (porta 3000)" -ForegroundColor Cyan

$healthUrl = "http://localhost:3000/health"
$backendAlreadyRunning = Test-TunnelPort -TargetHost "127.0.0.1" -Port 3000

$ServerDir = Join-Path $ProjectRoot "server"

if ($backendAlreadyRunning) {
    Write-Host "Porta 3000 já está em uso. Validando /health..." -ForegroundColor Yellow
    $healthOk = Wait-HttpOk -Url $healthUrl -TimeoutSec 10
    if (-not $healthOk) {
        Write-Host "A porta 3000 está ocupada, mas /health não respondeu como backend SINGEM." -ForegroundColor Red
        Write-Host "Libere a porta 3000 ou encerre o processo atual e rode novamente." -ForegroundColor Red
        exit 1
    }
    Write-Host "Backend SINGEM já está ativo na porta 3000. Reutilizando." -ForegroundColor Green
} else {
    $backCmd = "cd `"$ServerDir`"; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $backCmd

    $healthOk = Wait-HttpOk -Url $healthUrl -TimeoutSec 25
    if (-not $healthOk) {
        Write-Host "Backend não ficou saudável em até 25s (/health)." -ForegroundColor Red
        Write-Host "Verifique logs da janela do backend e tente novamente." -ForegroundColor Red
        exit 1
    }
}

Write-Host "Health check OK: $healthUrl" -ForegroundColor Green

# ==============================
# ABRIR NAVEGADOR
# ==============================
Start-Process "http://localhost:8000"

Write-Host ""
Write-Host "Frontend:  http://localhost:8000" -ForegroundColor Yellow
Write-Host "Health:    $healthUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Ambiente DEV iniciado com sucesso." -ForegroundColor Green
Write-Host ""
