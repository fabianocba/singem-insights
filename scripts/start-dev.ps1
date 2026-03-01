Write-Host ""
Write-Host "=== SINGEM START DEV ==="
Write-Host ""

$TunnelHost = "127.0.0.1"
$TunnelLocalPort = 5433
$TunnelRemoteHost = "127.0.0.1"
$TunnelRemotePort = 5432
$TunnelSshPort = 2222
$TunnelSshUser = "root"
$TunnelSshIp = "72.61.55.250"

function Test-TunnelPort {
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

function Wait-TunnelPort {
    param(
        [string]$TargetHost,
        [int]$Port,
        [int]$TimeoutSec = 20
    )

    for ($i = 0; $i -lt $TimeoutSec; $i++) {
        if (Test-TunnelPort -TargetHost $TargetHost -Port $Port) {
            return $true
        }
        Start-Sleep -Seconds 1
    }

    return $false
}

function Wait-HttpOk {
    param(
        [string]$Url,
        [int]$TimeoutSec = 20
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

# Descobrir raiz real do repo
$ProjectRoot = git rev-parse --show-toplevel 2>$null
if (-not $ProjectRoot) {
    Write-Host "Erro: nao foi possivel localizar a raiz do Git."
    exit 1
}

Set-Location $ProjectRoot
Write-Host "Projeto: $ProjectRoot"
Write-Host ""

$ProjectRootResolved = (Resolve-Path -LiteralPath $ProjectRoot).Path.Replace('\\', '/')
$CurrentScriptGitPath = 'scripts/start-dev.ps1'
if ($PSCommandPath) {
    $scriptResolved = (Resolve-Path -LiteralPath $PSCommandPath).Path.Replace('\\', '/')
    $projectPrefix = "$ProjectRootResolved/"
    if ($scriptResolved.StartsWith($projectPrefix)) {
        $CurrentScriptGitPath = $scriptResolved.Substring($projectPrefix.Length)
    }
}

# ==============================
# GIT SYNC SEGURO
# ==============================
Write-Host "==> GIT: sincronizar dev sem risco de perda"

git fetch origin dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "Falha ao executar git fetch origin dev"
    exit 1
}

$originalBranch = git branch --show-current
if (-not $originalBranch) {
    Write-Host "Falha ao identificar branch atual."
    exit 1
}

git show-ref --verify --quiet refs/heads/dev
$localDevExists = ($LASTEXITCODE -eq 0)

$originDevHash = git rev-parse origin/dev
if ($LASTEXITCODE -ne 0 -or -not $originDevHash) {
    Write-Host "Falha ao obter hash de origin/dev"
    exit 1
}

$needSync = $true
if ($localDevExists) {
    $localDevHash = git rev-parse dev
    if ($LASTEXITCODE -eq 0 -and $localDevHash -eq $originDevHash) {
        $needSync = $false
    }
}

if (-not $needSync) {
    Write-Host "origin/dev sem novidades. Seguindo sem travar por alterações locais."
} else {
    $hasLocalChanges = ((git status --porcelain) | Measure-Object).Count -gt 0
    $stashCreated = $false

    if ($hasLocalChanges) {
        Write-Host "Alterações locais detectadas. Salvando temporariamente (git stash)..."
        $stashMessage = "start-dev autostash " + (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        git stash push -u -m $stashMessage
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao salvar alterações locais com git stash"
            exit 1
        }
        $stashCreated = $true
    }

    if (-not $localDevExists) {
        git switch -c dev --track origin/dev
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao criar branch dev local a partir de origin/dev"
            exit 1
        }
    } else {
        git switch dev
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao trocar para branch dev"
            exit 1
        }

        git merge --ff-only origin/dev
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha no fast-forward com origin/dev. Resolva merge/rebase e rode novamente."
            exit 1
        }
    }

    if ($originalBranch -ne "dev") {
        git switch $originalBranch
        if ($LASTEXITCODE -ne 0) {
            Write-Host "Falha ao retornar para branch original: $originalBranch"
            exit 1
        }
    }

    if ($stashCreated) {
        Write-Host "Restaurando alterações locais (git stash pop)..."
        git stash pop
        if ($LASTEXITCODE -ne 0) {
            Write-Host "A restauração do stash encontrou conflitos. Resolva os conflitos e continue."
            exit 1
        }
    }

    Write-Host "Repo sincronizado com origin/dev e alterações locais restauradas"
}
Write-Host ""

# ==============================
# TUNEL POSTGRESQL (AUTO-REPARO)
# ==============================
Write-Host "==> DB TUNNEL: verificar porta 5433"

$tunnelOk = Test-TunnelPort -TargetHost $TunnelHost -Port $TunnelLocalPort
if (-not $tunnelOk) {
    Write-Host "Porta 5433 fechada. Tentando abrir túnel automaticamente..."

    $sshCommand = "ssh -N -L $TunnelLocalPort`:$TunnelRemoteHost`:$TunnelRemotePort -p $TunnelSshPort $TunnelSshUser@$TunnelSshIp"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $sshCommand

    $tunnelOpened = Wait-TunnelPort -TargetHost $TunnelHost -Port $TunnelLocalPort -TimeoutSec 20
    if (-not $tunnelOpened) {
        Write-Host ""
        Write-Host "Falha ao abrir túnel PostgreSQL na porta 5433 em até 20s."
        Write-Host "Execute manualmente em outra janela PowerShell:"
        Write-Host "ssh -N -L 5433:127.0.0.1:5432 -p 2222 root@72.61.55.250"
        Write-Host ""
        exit 1
    }

    Write-Host "Túnel PostgreSQL aberto com sucesso (127.0.0.1:5433)."
} else {
    Write-Host "Túnel PostgreSQL já disponível (127.0.0.1:5433)."
}

Write-Host ""

# ==============================
# FRONTEND
# ==============================
Write-Host "==> FRONT: iniciar servidor local 8000"

$frontAlreadyRunning = Test-TunnelPort -TargetHost "127.0.0.1" -Port 8000
if ($frontAlreadyRunning) {
    Write-Host "Frontend já está ativo na porta 8000. Reutilizando instância existente."
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot'; python -m http.server 8000"
    Start-Sleep -Seconds 2
}

# ==============================
# BACKEND
# ==============================
Write-Host "==> BACKEND: iniciar npm run dev (porta 3000)"

$healthUrl = "http://localhost:3000/health"

$backendAlreadyRunning = Test-TunnelPort -TargetHost "127.0.0.1" -Port 3000
if ($backendAlreadyRunning) {
    Write-Host "Porta 3000 já está em uso. Validando /health..."
    $healthOk = Wait-HttpOk -Url $healthUrl -TimeoutSec 10
    if (-not $healthOk) {
        Write-Host "A porta 3000 está ocupada, mas /health não respondeu como backend SINGEM."
        Write-Host "Libere a porta 3000 ou encerre o processo atual e rode novamente."
        exit 1
    }
    Write-Host "Backend SINGEM já está ativo na porta 3000. Reutilizando instância existente."
} else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ProjectRoot\server'; npm run dev"
    $healthOk = Wait-HttpOk -Url $healthUrl -TimeoutSec 20
    if (-not $healthOk) {
        Write-Host "Backend não ficou saudável em até 20s (endpoint /health)."
        Write-Host "Verifique logs da janela do backend e tente novamente."
        exit 1
    }
}

Write-Host "Health check OK: $healthUrl"

# ==============================
# ABRIR NAVEGADOR
# ==============================
Start-Process "http://localhost:8000"

Write-Host ""
Write-Host "Frontend:  http://localhost:8000"
Write-Host "Health:    $healthUrl"
Write-Host ""
Write-Host "Ambiente DEV iniciado com sucesso."
Write-Host ""
