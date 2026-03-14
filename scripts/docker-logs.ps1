<#
.SYNOPSIS
    SINGEM — Visualizacao e filtro de logs dos containers Docker.

.DESCRIPTION
    Centraliza a visualizacao de logs de todos os containers SINGEM
    com filtros por servico, nivel, texto e intervalo de tempo.

.PARAMETER Service
    Servico(s) para exibir logs. Valores: all, backend, frontend, postgres, redis, ai-core.
    Padrao: all

.PARAMETER Tail
    Numero de linhas recentes a exibir. Padrao: 100

.PARAMETER Follow
    Acompanha logs em tempo real (equivale a docker logs -f).

.PARAMETER Since
    Exibe logs a partir de um timestamp ou duracao (ex: "1h", "30m", "2026-03-13").
    Padrao: sem filtro

.PARAMETER Filter
    Filtra linhas que contenham este texto (case-insensitive).

.PARAMETER Level
    Filtra por nivel de log: ERROR, WARN, INFO, DEBUG.

.PARAMETER Export
    Exporta logs para arquivo em vez de exibir no console.

.EXAMPLE
    .\docker-logs.ps1
    .\docker-logs.ps1 -Service backend -Tail 50
    .\docker-logs.ps1 -Service backend -Follow
    .\docker-logs.ps1 -Service postgres -Since "1h"
    .\docker-logs.ps1 -Filter "ERROR" -Since "30m"
    .\docker-logs.ps1 -Service backend -Export "backend.log"
#>

[CmdletBinding()]
param(
    [ValidateSet("all", "backend", "frontend", "postgres", "redis", "ai-core")]
    [string]$Service = "all",
    [int]$Tail = 100,
    [switch]$Follow,
    [string]$Since = "",
    [string]$Filter = "",
    [ValidateSet("", "ERROR", "WARN", "INFO", "DEBUG")]
    [string]$Level = "",
    [string]$Export = ""
)

Set-StrictMode -Version Latest

# --- Service map -----------------------------------------------------
$serviceMap = @{
    "backend"  = "singem-backend"
    "frontend" = "singem-frontend"
    "postgres" = "singem-postgres"
    "redis"    = "singem-redis"
    "ai-core"  = "singem-ai-core"
}

# --- Resolve target containers --------------------------------------
$targets = @()
if ($Service -eq "all") {
    foreach ($key in @("backend", "frontend", "postgres", "redis")) {
        $targets += @{ Label = $key; Container = $serviceMap[$key] }
    }
} else {
    $targets += @{ Label = $Service; Container = $serviceMap[$Service] }
}

# --- Pre-checks ------------------------------------------------------
$dockerCheck = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "  [FAIL] Docker nao esta em execucao." -ForegroundColor Red
    exit 1
}

# --- Banner ----------------------------------------------------------
if (-not $Export) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host " SINGEM Docker - Logs" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Servico(s) : $Service"
    Write-Host "  Linhas     : $Tail"
    Write-Host "  Follow     : $Follow"
    if ($Since)  { Write-Host "  Desde      : $Since" }
    if ($Filter) { Write-Host "  Filtro     : $Filter" }
    if ($Level)  { Write-Host "  Nivel      : $Level" }
    Write-Host ""
}

# --- Build docker logs args -----------------------------------------
function Get-LogArgs {
    param([int]$TailCount, [string]$SinceVal, [switch]$FollowVal)

    $args_ = @("logs")
    if ($FollowVal) {
        $args_ += "--follow"
    }
    $args_ += "--tail"
    $args_ += $TailCount.ToString()
    $args_ += "--timestamps"

    if ($SinceVal) {
        $args_ += "--since"
        $args_ += $SinceVal
    }

    return $args_
}

# --- Color by level --------------------------------------------------
function Write-ColoredLine {
    param([string]$Label, [string]$Line)

    $prefix = "[$Label]"
    $color = "Gray"

    if ($Line -match '\b(ERROR|FATAL|CRIT)\b') {
        $color = "Red"
    } elseif ($Line -match '\b(WARN|WARNING)\b') {
        $color = "Yellow"
    } elseif ($Line -match '\b(INFO)\b') {
        $color = "Cyan"
    } elseif ($Line -match '\b(DEBUG|TRACE)\b') {
        $color = "DarkGray"
    }

    Write-Host "$prefix " -ForegroundColor White -NoNewline
    Write-Host $Line -ForegroundColor $color
}

# --- Filter logic ----------------------------------------------------
function Test-LineFilter {
    param([string]$Line)

    if ($Filter -and $Line -notmatch [regex]::Escape($Filter)) {
        return $false
    }

    if ($Level) {
        $levelPattern = switch ($Level) {
            "ERROR" { '\b(ERROR|FATAL|CRIT|ERRO)\b' }
            "WARN"  { '\b(WARN|WARNING|AVISO)\b' }
            "INFO"  { '\b(INFO)\b' }
            "DEBUG" { '\b(DEBUG|TRACE)\b' }
        }
        if ($Line -notmatch $levelPattern) {
            return $false
        }
    }

    return $true
}

# --- Follow mode (single service) -----------------------------------
if ($Follow) {
    if ($Service -eq "all") {
        # docker compose logs --follow for all
        $composeArgs = @("compose", "logs", "--follow", "--tail", $Tail.ToString(), "--timestamps")
        if ($Since) {
            $composeArgs += "--since"
            $composeArgs += $Since
        }

        Write-Host "  Seguindo logs de todos os servicos... (Ctrl+C para parar)" -ForegroundColor Yellow
        Write-Host ""

        if ($Filter -or $Level) {
            # Need to pipe and filter
            $process = Start-Process -FilePath "docker" -ArgumentList $composeArgs `
                -NoNewWindow -RedirectStandardOutput "NUL" -PassThru
            # Fallback: use docker compose logs directly
            $composeArgs = @("compose", "logs", "--follow", "--tail", $Tail.ToString())
            & docker @composeArgs 2>&1 | ForEach-Object {
                $line = $_.ToString()
                if (Test-LineFilter $line) {
                    Write-Host $line
                }
            }
        } else {
            & docker @composeArgs
        }
        exit 0
    }

    # Single service follow
    $container = $targets[0].Container
    $label = $targets[0].Label
    $logArgs = Get-LogArgs -TailCount $Tail -SinceVal $Since -FollowVal:$true
    $logArgs += $container

    Write-Host "  Seguindo logs de $label... (Ctrl+C para parar)" -ForegroundColor Yellow
    Write-Host ""

    if ($Filter -or $Level) {
        & docker @logArgs 2>&1 | ForEach-Object {
            $line = $_.ToString()
            if (Test-LineFilter $line) {
                Write-ColoredLine $label $line
            }
        }
    } else {
        & docker @logArgs 2>&1 | ForEach-Object {
            Write-ColoredLine $label $_.ToString()
        }
    }
    exit 0
}

# --- Snapshot mode (non-follow) -------------------------------------
$outputLines = @()

foreach ($target in $targets) {
    $container = $target.Container
    $label = $target.Label

    # Check if container exists
    $running = docker inspect --format '{{.State.Running}}' $container 2>&1
    if ($LASTEXITCODE -ne 0) {
        if (-not $Export) {
            Write-Host "  [$label] Container nao encontrado." -ForegroundColor DarkGray
        }
        continue
    }

    $logArgs = Get-LogArgs -TailCount $Tail -SinceVal $Since
    $logArgs += $container

    $lines = & docker @logArgs 2>&1

    foreach ($line in $lines) {
        $lineStr = $line.ToString()
        if (Test-LineFilter $lineStr) {
            if ($Export) {
                $outputLines += "[$label] $lineStr"
            } else {
                Write-ColoredLine $label $lineStr
            }
        }
    }

    if (-not $Export -and $Service -eq "all") {
        Write-Host ""
    }
}

# --- Export ----------------------------------------------------------
if ($Export) {
    $outputLines | Set-Content -Path $Export -Encoding UTF8
    Write-Host "  [OK] Logs exportados para: $Export ($($outputLines.Count) linhas)" -ForegroundColor Green
}
