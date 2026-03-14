<#
.SYNOPSIS
    SINGEM Docker — Diagnóstico de saúde do ambiente
.DESCRIPTION
    Verifica o estado completo do ambiente Docker SINGEM:
      - Docker Desktop em execução
      - Status de cada container (health, uptime, memória)
      - Conectividade: PostgreSQL, Backend /health, Frontend
      - Alerta de segurança: JWT_SECRET ou DB_PASSWORD com valor padrão
      - Migrations pendentes (se backend está rodando)
.EXAMPLE
    .\scripts\docker-health.ps1
.EXAMPLE
    .\scripts\docker-health.ps1 -Verbose
#>
[CmdletBinding()]
param()

$ErrorActionPreference = "Continue"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot

# ---- Contadores ----
$script:checks = 0
$script:passed = 0
$script:warned = 0
$script:failed = 0

function Write-Check {
    param(
        [string]$Label,
        [ValidateSet('OK','WARN','FAIL','INFO')]
        [string]$Status,
        [string]$Detail = ""
    )
    $script:checks++
    $icon = switch ($Status) {
        'OK'   { $script:passed++; Write-Host "  [OK]   " -NoNewline -ForegroundColor Green; break }
        'WARN' { $script:warned++; Write-Host "  [WARN] " -NoNewline -ForegroundColor Yellow; break }
        'FAIL' { $script:failed++; Write-Host "  [FAIL] " -NoNewline -ForegroundColor Red; break }
        'INFO' { Write-Host "  [INFO] " -NoNewline -ForegroundColor Cyan; break }
    }
    Write-Host "$Label" -NoNewline
    if ($Detail) {
        Write-Host " - $Detail" -ForegroundColor DarkGray
    } else {
        Write-Host ""
    }
}

function Test-TcpPort {
    param([string]$Host_, [int]$Port, [int]$TimeoutMs = 3000)
    try {
        $client = [System.Net.Sockets.TcpClient]::new()
        $task = $client.ConnectAsync($Host_, $Port)
        $completed = $task.Wait($TimeoutMs)
        $client.Close()
        $client.Dispose()
        return $completed -and -not $task.IsFaulted
    } catch {
        return $false
    }
}

function Test-HttpEndpoint {
    param([string]$Url, [int]$TimeoutSec = 5)
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec -ErrorAction Stop
        return @{ Ok = $true; StatusCode = $response.StatusCode; Content = $response.Content }
    } catch {
        return @{ Ok = $false; Error = $_.Exception.Message }
    }
}

# ============================================================
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SINGEM Docker - Diagnostico de Saude" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# ---- 1. Docker Desktop ----
Write-Host "1. Docker Engine" -ForegroundColor White
$dockerVersion = $null
try {
    $dockerVersion = docker version --format '{{.Server.Version}}' 2>$null
} catch {}

if ($dockerVersion) {
    Write-Check "Docker Engine" "OK" "v$dockerVersion"
} else {
    Write-Check "Docker Engine" "FAIL" "Docker nao esta em execucao ou nao foi encontrado"
    Write-Host ""
    Write-Host "  Inicie o Docker Desktop e tente novamente." -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# ---- 2. Containers ----
Write-Host ""
Write-Host "2. Containers SINGEM" -ForegroundColor White

$expectedContainers = @("singem-postgres", "singem-redis", "singem-backend", "singem-frontend")
$optionalContainers = @("singem-ai-core")

$allContainers = docker compose -f "$ProjectRoot\docker-compose.yml" ps --format json 2>$null
if (-not $allContainers) {
    Write-Check "Compose" "FAIL" "Nenhum container encontrado. Execute: docker compose up --build"
    Write-Host ""
    exit 1
}

$containers = @()
foreach ($line in ($allContainers -split "`n")) {
    $trimmed = $line.Trim()
    if ($trimmed -and $trimmed.StartsWith('{')) {
        try { $containers += ($trimmed | ConvertFrom-Json) } catch {}
    }
}

foreach ($name in $expectedContainers) {
    $c = $containers | Where-Object { $_.Name -eq $name }
    if (-not $c) {
        Write-Check $name "FAIL" "Container nao encontrado"
        continue
    }

    $state = $c.State
    $health = $c.Health
    $status = $c.Status

    if ($state -eq "running" -and $health -eq "healthy") {
        Write-Check $name "OK" $status
    } elseif ($state -eq "running") {
        $healthLabel = $(if ($health) { "health=$health" } else { "sem healthcheck" })
        Write-Check $name "WARN" "$status ($healthLabel)"
    } else {
        Write-Check $name "FAIL" "$state - $status"
    }
}

foreach ($name in $optionalContainers) {
    $c = $containers | Where-Object { $_.Name -eq $name }
    if (-not $c) {
        Write-Check $name "INFO" "Nao ativo (profile ai/full)"
    } elseif ($c.State -eq "running") {
        Write-Check $name "OK" $c.Status
    } else {
        Write-Check $name "WARN" "$($c.State) - $($c.Status)"
    }
}

# ---- 3. Uso de recursos ----
Write-Host ""
Write-Host "3. Recursos" -ForegroundColor White

$stats = docker stats --no-stream --format "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}" 2>$null
if ($stats) {
    foreach ($line in $stats) {
        $parts = $line -split "`t"
        if ($parts.Count -ge 3 -and $parts[0] -match "singem") {
            $memParts = $parts[2] -split "/"
            Write-Check $parts[0] "INFO" "CPU: $($parts[1])  MEM: $($memParts[0].Trim())"
        }
    }
} else {
    Write-Check "Recursos" "WARN" "Nao foi possivel obter stats (containers parados?)"
}

# ---- 4. Conectividade ----
Write-Host ""
Write-Host "4. Conectividade" -ForegroundColor White

# Ler portas do .env ou usar defaults
$envFile = Join-Path $ProjectRoot ".env"
$dbPortExt = 5432
$backendPortExt = 3000
$frontendPortExt = 8000

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -ErrorAction SilentlyContinue
    foreach ($line in $envContent) {
        if ($line -match "^DB_PORT_EXTERNAL=(\d+)") { $dbPortExt = [int]$Matches[1] }
        if ($line -match "^BACKEND_PORT_EXTERNAL=(\d+)") { $backendPortExt = [int]$Matches[1] }
        if ($line -match "^FRONTEND_PORT_EXTERNAL=(\d+)") { $frontendPortExt = [int]$Matches[1] }
    }
}

# PostgreSQL TCP
if (Test-TcpPort "127.0.0.1" $dbPortExt) {
    Write-Check "PostgreSQL :$dbPortExt" "OK" "Porta TCP aberta"
} else {
    Write-Check "PostgreSQL :$dbPortExt" "FAIL" "Porta TCP nao responde"
}

# Backend /health
$healthResult = Test-HttpEndpoint "http://localhost:$backendPortExt/health"
if ($healthResult.Ok) {
    try {
        $healthJson = $healthResult.Content | ConvertFrom-Json
        $dbStatus = $healthJson.database
        $detail = "HTTP $($healthResult.StatusCode), db=$dbStatus"
        if ($dbStatus -eq "conectado") {
            Write-Check "Backend /health" "OK" $detail
        } else {
            Write-Check "Backend /health" "WARN" $detail
        }
    } catch {
        Write-Check "Backend /health" "OK" "HTTP $($healthResult.StatusCode)"
    }
} else {
    Write-Check "Backend /health" "FAIL" $healthResult.Error
}

# Frontend
$frontResult = Test-HttpEndpoint "http://localhost:$frontendPortExt/"
if ($frontResult.Ok) {
    Write-Check "Frontend :$frontendPortExt" "OK" "HTTP $($frontResult.StatusCode)"
} else {
    Write-Check "Frontend :$frontendPortExt" "FAIL" $frontResult.Error
}

# ---- 5. Segurança ----
Write-Host ""
Write-Host "5. Seguranca" -ForegroundColor White

$insecureDefaults = @{
    "JWT_SECRET"     = "change_this_secret_in_production_min32chars!"
    "DB_PASSWORD"    = "Singem@12345"
    "ADMIN_PASSWORD" = "MudarNaPrimeiraExecucao123!"
}

if (Test-Path $envFile) {
    $envLines = Get-Content $envFile -ErrorAction SilentlyContinue
    $envMap = @{}
    foreach ($line in $envLines) {
        if ($line -match "^([A-Z_]+)=(.*)$") {
            $envMap[$Matches[1]] = $Matches[2]
        }
    }

    $nodeEnv = $envMap["NODE_ENV"]
    $isProd = $nodeEnv -eq "production"

    foreach ($key in $insecureDefaults.Keys) {
        $val = $envMap[$key]
        if ($val -eq $insecureDefaults[$key]) {
            if ($isProd) {
                Write-Check $key "FAIL" "Valor padrao inseguro em PRODUCAO!"
            } else {
                Write-Check $key "WARN" "Valor padrao (ok para dev)"
            }
        } elseif ($val) {
            Write-Check $key "OK" "Personalizado"
        } else {
            Write-Check $key "WARN" "Vazio ou nao definido"
        }
    }

    $jwtVal = $envMap["JWT_SECRET"]
    $jwtLen = $(if ($jwtVal) { $jwtVal.Length } else { 0 })
    if ($jwtLen -gt 0 -and $jwtLen -lt 32) {
        Write-Check "JWT_SECRET comprimento" "WARN" "$jwtLen chars (recomendado: 32+)"
    }
} else {
    Write-Check ".env" "WARN" "Arquivo .env nao encontrado. Execute: .\scripts\docker-setup.ps1"
}

# ---- 6. Migrations ----
Write-Host ""
Write-Host "6. Migrations" -ForegroundColor White

$migrationFiles = Get-ChildItem "$ProjectRoot\server\migrations\*.sql" -ErrorAction SilentlyContinue | Sort-Object Name
$totalMigrations = $migrationFiles.Count
Write-Check "Arquivos SQL" "INFO" "$totalMigrations encontrados"

# Tentar consultar _migrations via docker exec
$appliedMigrations = $null
try {
    $pgResult = docker compose -f "$ProjectRoot\docker-compose.yml" exec -T postgres psql -U adm -d singem -t -c "SELECT count(*) FROM _migrations;" 2>$null
    if ($LASTEXITCODE -eq 0 -and $pgResult) {
        $appliedCount = [int]($pgResult.Trim())
        $pending = $totalMigrations - $appliedCount
        if ($pending -eq 0) {
            Write-Check "Migrations aplicadas" "OK" "$appliedCount/$totalMigrations (todas aplicadas)"
        } elseif ($pending -gt 0) {
            Write-Check "Migrations aplicadas" "WARN" "$appliedCount/$totalMigrations ($pending pendente(s))"
        } else {
            Write-Check "Migrations aplicadas" "INFO" "$appliedCount aplicadas, $totalMigrations em disco"
        }
    } else {
        Write-Check "Migrations aplicadas" "INFO" "Nao foi possivel consultar (postgres indisponivel)"
    }
} catch {
    Write-Check "Migrations aplicadas" "INFO" "Nao foi possivel consultar"
}

# ---- Resumo ----
Write-Host ""
Write-Host "--------------------------------------------" -ForegroundColor DarkGray
$summaryColor = $(if ($script:failed -gt 0) { "Red" } elseif ($script:warned -gt 0) { "Yellow" } else { "Green" })
Write-Host "  Resultado: $($script:passed) OK, $($script:warned) WARN, $($script:failed) FAIL  (total: $($script:checks))" -ForegroundColor $summaryColor

if ($script:failed -gt 0) {
    Write-Host ""
    Write-Host "  Corrija os itens FAIL antes de prosseguir." -ForegroundColor Red
} elseif ($script:warned -gt 0) {
    Write-Host "  Ambiente funcional com alertas." -ForegroundColor Yellow
} else {
    Write-Host "  Ambiente 100% saudavel!" -ForegroundColor Green
}
Write-Host ""
