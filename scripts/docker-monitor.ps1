<#
.SYNOPSIS
    SINGEM — Monitoramento continuo dos containers Docker com alertas.

.DESCRIPTION
    Executa verificacoes periodicas de saude dos containers SINGEM,
    envia alertas via webhook quando detecta problemas e gera log
    estruturado para auditoria.

.PARAMETER Interval
    Intervalo entre verificacoes em segundos. Padrao: 60

.PARAMETER WebhookUrl
    URL de webhook para alertas (POST JSON). Obrigatorio para alertas.

.PARAMETER WebhookType
    Tipo do webhook: slack, teams ou generic. Auto-detectado pela URL se omitido.

.PARAMETER LogFile
    Arquivo de log. Padrao: ./storage/logs/docker-monitor.log

.PARAMETER Once
    Executa apenas uma verificacao e sai (para cron/agendador).

.PARAMETER Quiet
    Suprime saida no console (apenas log e webhook).

.EXAMPLE
    .\docker-monitor.ps1 -Once
    .\docker-monitor.ps1 -Interval 120 -WebhookUrl "https://hooks.slack.com/services/xxx"
    .\docker-monitor.ps1 -Once -WebhookUrl "https://webhook.office.com/xxx" -WebhookType teams
    .\docker-monitor.ps1 -Once -WebhookUrl "https://custom.example.com/hook" -WebhookType generic
#>

[CmdletBinding()]
param(
    [int]$Interval = 60,
    [string]$WebhookUrl = "",
    [ValidateSet("", "slack", "teams", "generic")]
    [string]$WebhookType = "",
    [string]$LogFile = "",
    [switch]$Once,
    [switch]$Quiet
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

# --- Paths -----------------------------------------------------------
$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir

if (-not $LogFile) {
    $logDir = Join-Path (Join-Path $projectRoot "storage") "logs"
    if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    $LogFile = Join-Path $logDir "docker-monitor.log"
}

# --- .env ------------------------------------------------------------
$envFile = Join-Path $projectRoot ".env"
$envMap = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') {
            $envMap[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
        }
    }
}

# --- Logging ---------------------------------------------------------
function Write-Log {
    param([string]$Level, [string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] [$Level] $Message"
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    if (-not $Quiet) {
        $color = switch ($Level) {
            "ERROR" { "Red" }
            "WARN"  { "Yellow" }
            "OK"    { "Green" }
            default { "Gray" }
        }
        Write-Host $line -ForegroundColor $color
    }
}

# --- Webhook type auto-detect ----------------------------------------
function Resolve-WebhookType {
    param([string]$Url, [string]$Explicit)
    if ($Explicit) { return $Explicit }
    if ($Url -match 'hooks\.slack\.com') { return 'slack' }
    if ($Url -match 'webhook\.office\.com|microsoft') { return 'teams' }
    return 'generic'
}

# --- Alert -----------------------------------------------------------
$script:alertsSent = @{}
$script:cooldownMinutes = 10

function Format-SlackPayload {
    param([string]$Title, [string]$Detail, [string]$Severity)
    $emoji = switch ($Severity) {
        'ERROR' { ':red_circle:' }
        'WARN'  { ':warning:' }
        default { ':information_source:' }
    }
    $color = switch ($Severity) {
        'ERROR' { '#dc3545' }
        'WARN'  { '#ffc107' }
        default { '#17a2b8' }
    }
    return @{
        attachments = @(
            @{
                color    = $color
                fallback = "$emoji $Title - $Detail"
                blocks   = @(
                    @{
                        type = 'section'
                        text = @{
                            type = 'mrkdwn'
                            text = "$emoji *$Title*`n$Detail"
                        }
                    }
                    @{
                        type = 'context'
                        elements = @(
                            @{
                                type = 'mrkdwn'
                                text = "Host: ``$($env:COMPUTERNAME)`` | $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
                            }
                        )
                    }
                )
            }
        )
    } | ConvertTo-Json -Depth 10 -Compress
}

function Format-TeamsPayload {
    param([string]$Title, [string]$Detail, [string]$Severity)
    $color = switch ($Severity) {
        'ERROR' { 'attention' }
        'WARN'  { 'warning' }
        default { 'accent' }
    }
    return @{
        type        = 'message'
        attachments = @(
            @{
                contentType = 'application/vnd.microsoft.card.adaptive'
                content     = @{
                    '$schema' = 'http://adaptivecards.io/schemas/adaptive-card.json'
                    type      = 'AdaptiveCard'
                    version   = '1.4'
                    body      = @(
                        @{
                            type   = 'TextBlock'
                            text   = "SINGEM Docker Alert"
                            weight = 'Bolder'
                            size   = 'Medium'
                            style  = $color
                        }
                        @{
                            type   = 'TextBlock'
                            text   = $Title
                            weight = 'Bolder'
                            wrap   = $true
                        }
                        @{
                            type = 'TextBlock'
                            text = $Detail
                            wrap = $true
                        }
                        @{
                            type  = 'FactSet'
                            facts = @(
                                @{ title = 'Severity'; value = $Severity }
                                @{ title = 'Host'; value = $env:COMPUTERNAME }
                                @{ title = 'Time'; value = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') }
                            )
                        }
                    )
                }
            }
        )
    } | ConvertTo-Json -Depth 10 -Compress
}

function Format-GenericPayload {
    param([string]$Title, [string]$Detail, [string]$Severity)
    return @{
        event     = 'singem_docker_alert'
        severity  = $Severity
        title     = $Title
        detail    = $Detail
        host      = $env:COMPUTERNAME
        timestamp = (Get-Date -Format 'o')
    } | ConvertTo-Json -Compress
}

function Send-Alert {
    param([string]$Title, [string]$Detail, [string]$Severity)

    $key = "$Title|$Severity"
    $now = Get-Date
    if ($script:alertsSent.ContainsKey($key)) {
        $lastSent = $script:alertsSent[$key]
        $diff = ($now - $lastSent).TotalMinutes
        if ($diff -lt $script:cooldownMinutes) { return }
    }

    Write-Log $Severity "$Title - $Detail"

    if ($WebhookUrl) {
        $whType = Resolve-WebhookType $WebhookUrl $WebhookType
        $payload = switch ($whType) {
            'slack'   { Format-SlackPayload  $Title $Detail $Severity }
            'teams'   { Format-TeamsPayload  $Title $Detail $Severity }
            default   { Format-GenericPayload $Title $Detail $Severity }
        }

        try {
            Invoke-WebRequest -Uri $WebhookUrl -Method POST -Body $payload `
                -ContentType 'application/json' -UseBasicParsing -TimeoutSec 10 | Out-Null
            $script:alertsSent[$key] = $now
        } catch {
            Write-Log 'WARN' "Webhook falhou: $($_.Exception.Message)"
        }
    }

    $script:alertsSent[$key] = $now
}

# --- Container check -------------------------------------------------
function Get-ContainerStatus {
    $containers = @("singem-postgres", "singem-backend", "singem-frontend", "singem-redis")
    $results = @()

    foreach ($name in $containers) {
        $info = @{ Name = $name; Running = $false; Healthy = $false; Restarts = 0; Status = "not found" }

        $inspect = docker inspect --format '{{.State.Running}}|{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}|{{.RestartCount}}|{{.State.Status}}' $name 2>&1
        if ($LASTEXITCODE -eq 0) {
            $parts = $inspect.ToString().Split("|")
            $info.Running  = ($parts[0] -eq "true")
            $info.Healthy  = ($parts[1] -eq "healthy")
            $info.Restarts = [int]($parts[2])
            $info.Status   = $parts[3]

            # Container sem healthcheck: running = healthy
            if (($parts[1] -eq "none" -or $parts[1] -eq "") -and $info.Running) {
                $info.Healthy = $true
            }
        }

        $results += $info
    }
    return $results
}

# --- Resource check --------------------------------------------------
function Get-ResourceUsage {
    $stats = docker stats --no-stream --format '{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}|{{.MemPerc}}' 2>&1
    if ($LASTEXITCODE -ne 0) { return @() }

    $results = @()
    foreach ($line in $stats) {
        if ($line -match '^singem-') {
            $parts = $line.ToString().Split("|")
            $cpuStr = $parts[1] -replace '%', ''
            $memStr = $parts[3] -replace '%', ''
            $results += @{
                Name   = $parts[0]
                CPU    = [double]$cpuStr
                Memory = $parts[2]
                MemPct = [double]$memStr
            }
        }
    }
    return $results
}

# --- Connectivity check ----------------------------------------------
function Test-ServiceConnectivity {
    $checks = @()

    # Backend health endpoint
    try {
        $backendPort = if ($envMap["BACKEND_PORT_EXTERNAL"]) { $envMap["BACKEND_PORT_EXTERNAL"] } else { "3000" }
        $resp = Invoke-WebRequest -Uri "http://localhost:${backendPort}/health" -UseBasicParsing -TimeoutSec 5
        $checks += @{ Service = "Backend /health"; OK = ($resp.StatusCode -eq 200); Detail = "HTTP $($resp.StatusCode)" }
    } catch {
        $checks += @{ Service = "Backend /health"; OK = $false; Detail = $_.Exception.Message }
    }

    # Frontend
    try {
        $frontendPort = if ($envMap["FRONTEND_PORT_EXTERNAL"]) { $envMap["FRONTEND_PORT_EXTERNAL"] } else { "8000" }
        $resp = Invoke-WebRequest -Uri "http://localhost:${frontendPort}/" -UseBasicParsing -TimeoutSec 5
        $checks += @{ Service = "Frontend /"; OK = ($resp.StatusCode -eq 200); Detail = "HTTP $($resp.StatusCode)" }
    } catch {
        $checks += @{ Service = "Frontend /"; OK = $false; Detail = $_.Exception.Message }
    }

    # PostgreSQL via docker exec
    $pgCheck = docker exec singem-postgres pg_isready -U adm -d singem 2>&1
    $checks += @{ Service = "PostgreSQL"; OK = ($LASTEXITCODE -eq 0); Detail = $pgCheck }

    # Redis via docker exec
    $redisCheck = docker exec singem-redis redis-cli ping 2>&1
    $checks += @{ Service = "Redis"; OK = ($redisCheck -match "PONG"); Detail = $redisCheck }

    return $checks
}

# --- Disk usage check ------------------------------------------------
function Get-VolumeDiskUsage {
    $dfOutput = docker system df --format '{{.Type}}\t{{.TotalCount}}\t{{.Size}}' 2>&1
    if ($LASTEXITCODE -ne 0) { return $null }
    return $dfOutput
}

# --- Main check cycle ------------------------------------------------
function Invoke-HealthCheck {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $issues = @()

    Write-Log "INFO" "--- Verificacao iniciada ---"

    # 1. Docker Engine
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Send-Alert "Docker Engine Offline" "Docker nao esta respondendo" "ERROR"
        return
    }

    # 2. Container status
    $containers = Get-ContainerStatus
    foreach ($c in $containers) {
        if (-not $c.Running) {
            Send-Alert "Container Parado" "$($c.Name) nao esta em execucao (status: $($c.Status))" "ERROR"
            $issues += $c.Name
        } elseif (-not $c.Healthy) {
            Send-Alert "Container Unhealthy" "$($c.Name) esta unhealthy" "WARN"
            $issues += $c.Name
        }
        if ($c.Restarts -gt 5) {
            Send-Alert "Restart Loop" "$($c.Name) teve $($c.Restarts) restarts" "WARN"
        }
    }

    # 3. Resources
    $resources = Get-ResourceUsage
    foreach ($r in $resources) {
        if ($r.CPU -gt 90) {
            Send-Alert "CPU Alta" "$($r.Name) usando $($r.CPU)% CPU" "WARN"
        }
        if ($r.MemPct -gt 85) {
            Send-Alert "Memoria Alta" "$($r.Name) usando $($r.MemPct)% memoria ($($r.Memory))" "WARN"
        }
    }

    # 4. Connectivity
    $checks = Test-ServiceConnectivity
    foreach ($chk in $checks) {
        if (-not $chk.OK) {
            Send-Alert "Servico Inacessivel" "$($chk.Service): $($chk.Detail)" "ERROR"
            $issues += $chk.Service
        } else {
            Write-Log "OK" "$($chk.Service): $($chk.Detail)"
        }
    }

    # 5. Disk
    $diskInfo = Get-VolumeDiskUsage
    if ($diskInfo) {
        foreach ($line in $diskInfo) {
            Write-Log "INFO" "Docker disk: $line"
        }
    }

    # Summary
    $total = $containers.Count + $checks.Count
    $ok = $total - $issues.Count
    if ($issues.Count -eq 0) {
        Write-Log "OK" "Todos os $total checks passaram."
    } else {
        Write-Log "WARN" "$($issues.Count) problema(s) detectado(s) de $total checks."
    }

    Write-Log "INFO" "--- Verificacao concluida ---"
}

# === Entry point =====================================================

if (-not $Quiet) {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host " SINGEM Docker - Monitor" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "  Intervalo : $(if ($Once) { 'execucao unica' } else { "${Interval}s" })"
    Write-Host "  Webhook   : $(if ($WebhookUrl) { "$(Resolve-WebhookType $WebhookUrl $WebhookType)" } else { 'nao configurado' })"
    Write-Host "  Log       : $LogFile"
    Write-Host ""
}

if ($Once) {
    Invoke-HealthCheck
    exit 0
}

Write-Log "INFO" "Monitor iniciado. Intervalo: ${Interval}s. Ctrl+C para parar."

while ($true) {
    try {
        Invoke-HealthCheck
    } catch {
        Write-Log "ERROR" "Excecao no ciclo de verificacao: $($_.Exception.Message)"
    }
    Start-Sleep -Seconds $Interval
}
