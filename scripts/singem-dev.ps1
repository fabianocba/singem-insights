$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Write-Ok($msg) {
    Write-Host "[OK] $msg" -ForegroundColor Green
}

function Write-Warn($msg) {
    Write-Host "[WARN] $msg" -ForegroundColor Yellow
}

function Write-Fail($msg) {
    Write-Host "[ERRO] $msg" -ForegroundColor Red
}

function Test-CommandExists($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Stop-PortProcess($port) {
    try {
        $conns = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
        if ($conns) {
            $pids = $conns | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($pid in $pids) {
                if ($pid -and $pid -ne 0) {
                    try {
                        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                        Write-Ok "Processo $pid encerrado na porta $port"
                    } catch {
                        Write-Warn "Não foi possível encerrar PID $pid na porta $port"
                    }
                }
            }
        } else {
            Write-Ok "Porta $port já estava livre"
        }
    } catch {
        Write-Warn "Falha ao verificar a porta $port"
    }
}

function Wait-HttpOk($url, $timeoutSeconds = 40) {
    $start = Get-Date
    do {
        try {
            $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
            if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) {
                return $true
            }
        } catch {
            Start-Sleep -Seconds 2
        }
    } while (((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds)
    return $false
}

function Wait-PortOpen($hostname, $port, $timeoutSeconds = 25) {
    $start = Get-Date
    do {
        try {
            $ok = Test-NetConnection -ComputerName $hostname -Port $port -WarningAction SilentlyContinue
            if ($ok.TcpTestSucceeded) {
                return $true
            }
        } catch {
        }
        Start-Sleep -Seconds 2
    } while (((Get-Date) - $start).TotalSeconds -lt $timeoutSeconds)
    return $false
}

function Run-Step($label, $scriptBlock) {
    Write-Step $label
    & $scriptBlock
    if ($LASTEXITCODE -ne 0) {
        throw "Falha em: $label"
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor DarkCyan
Write-Host "        SINGEM DEV ENGINE PRO" -ForegroundColor DarkCyan
Write-Host "==========================================" -ForegroundColor DarkCyan
Write-Host ""

$PROJECT_ROOT = (Get-Location).Path
$SERVER_DIR   = Join-Path $PROJECT_ROOT "server"
$SCRIPTS_DIR  = Join-Path $PROJECT_ROOT "scripts"
$VENV_ACT     = Join-Path $PROJECT_ROOT ".venv\Scripts\Activate.ps1"

Write-Ok "Projeto detectado em: $PROJECT_ROOT"

if (-not (Test-Path $SERVER_DIR)) {
    throw "Pasta 'server' não encontrada. Execute este script na raiz do SINGEM."
}

Write-Step "Verificando ferramentas obrigatórias"
$required = @("git", "node", "npm", "ssh", "python")
foreach ($cmd in $required) {
    if (Test-CommandExists $cmd) {
        Write-Ok "$cmd encontrado"
    } else {
        throw "Comando obrigatório não encontrado: $cmd"
    }
}

Write-Step "Exibindo versões"
try { git --version } catch {}
try { node -v } catch {}
try { npm -v } catch {}
try { python --version } catch {}

if (Test-Path $VENV_ACT) {
    Write-Step "Ativando .venv"
    . $VENV_ACT
    Write-Ok ".venv ativado"
} else {
    Write-Warn ".venv não encontrado em $VENV_ACT"
}

Write-Step "Limpando portas usadas no DEV"
Stop-PortProcess 3000
Stop-PortProcess 8000
Stop-PortProcess 5433

Run-Step "Git fetch origin" {
    git fetch origin
}

Run-Step "Checkout dev" {
    git checkout dev
}

Run-Step "Reset hard para origin/dev" {
    git reset --hard origin/dev
}

Write-Step "Status Git atual"
git status --short
git log --oneline -1

Run-Step "Instalando dependências da raiz" {
    Set-Location $PROJECT_ROOT
    npm install
}

Run-Step "Instalando dependências do backend" {
    Set-Location $SERVER_DIR
    npm install
}

Set-Location $PROJECT_ROOT

Write-Step "Abrindo backend em nova janela"
$backendCmd = @"
Set-Location '$SERVER_DIR'
Write-Host '=== BACKEND SINGEM ===' -ForegroundColor Cyan
npm run dev
"@
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $backendCmd | Out-Null
Write-Ok "Janela do backend aberta"

Write-Step "Aguardando backend responder em http://localhost:3000/health"
if (Wait-HttpOk "http://localhost:3000/health" 45) {
    Write-Ok "Backend respondeu no health check"
} else {
    Write-Warn "Backend ainda não respondeu no /health dentro do tempo esperado"
}

Write-Step "Abrindo frontend em nova janela"
$frontendCmd = @"
Set-Location '$PROJECT_ROOT'
Write-Host '=== FRONTEND SINGEM ===' -ForegroundColor Cyan
python -m http.server 8000
"@
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $frontendCmd | Out-Null
Write-Ok "Janela do frontend aberta"

Write-Step "Abrindo túnel SSH do banco em nova janela"
$tunnelCmd = @"
Write-Host '=== TUNEL DB SINGEM ===' -ForegroundColor Cyan
ssh -L 5433:127.0.0.1:5432 -p 2222 root@srv1401818.hstgr.cloud
"@
Start-Process powershell -ArgumentList "-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $tunnelCmd | Out-Null
Write-Ok "Janela do túnel aberta"

Write-Step "Aguardando túnel do banco em localhost:5433"
if (Wait-PortOpen "127.0.0.1" 5433 25) {
    Write-Ok "Túnel do banco ativo em 127.0.0.1:5433"
} else {
    Write-Warn "Túnel do banco ainda não respondeu na porta 5433"
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "         SINGEM DEV INICIADO" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Projeto : $PROJECT_ROOT" -ForegroundColor Green
Write-Host "Frontend: http://localhost:8000" -ForegroundColor Green
Write-Host "Backend : http://localhost:3000" -ForegroundColor Green
Write-Host "Health  : http://localhost:3000/health" -ForegroundColor Green
Write-Host "DB      : 127.0.0.1:5433 -> VPS:5432" -ForegroundColor Green
Write-Host ""
Write-Host "Observação: se alguma janela fechar, revise o erro nela." -ForegroundColor Yellow

