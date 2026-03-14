<#
.SYNOPSIS
    SINGEM — Backup automatizado do PostgreSQL via Docker.

.DESCRIPTION
    Realiza dump do banco PostgreSQL (singem-postgres container),
    compacta com gzip, mantém rotação de N backups antigos e
    opcionalmente envia webhook de notificação.

.PARAMETER OutputDir
    Diretório destino dos backups. Padrão: ./04_BACKUPS/docker

.PARAMETER Keep
    Número máximo de backups a manter por rotação. Padrão: 10

.PARAMETER WebhookUrl
    URL de webhook para notificação (POST JSON). Opcional.

.PARAMETER ContainerName
    Nome do container PostgreSQL. Padrão: singem-postgres

.PARAMETER DbName
    Nome do banco. Padrão: usa DB_NAME do .env ou "singem"

.PARAMETER DbUser
    Usuário do banco. Padrão: usa DB_USER do .env ou "adm"

.PARAMETER Format
    Formato do dump: "custom" (pg_dump -Fc) ou "sql" (plain text gzip).
    Padrão: custom

.EXAMPLE
    .\docker-backup.ps1
    .\docker-backup.ps1 -Keep 5 -Format sql
    .\docker-backup.ps1 -WebhookUrl "https://hooks.example.com/backup"
#>

[CmdletBinding()]
param(
    [string]$OutputDir = "",
    [int]$Keep = 10,
    [string]$WebhookUrl = "",
    [string]$ContainerName = "singem-postgres",
    [string]$DbName = "",
    [string]$DbUser = "",
    [ValidateSet("custom", "sql")]
    [string]$Format = "custom"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# --- Helpers ---------------------------------------------------------
function Write-Step  { param([string]$Msg) Write-Host "  [*] $Msg" -ForegroundColor Cyan }
function Write-Ok    { param([string]$Msg) Write-Host "  [OK] $Msg" -ForegroundColor Green }
function Write-Fail  { param([string]$Msg) Write-Host "  [FAIL] $Msg" -ForegroundColor Red }

# --- Resolve project root --------------------------------------------
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir

# --- Read .env for defaults ------------------------------------------
$envFile = Join-Path $projectRoot ".env"
$envMap = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$') {
            $envMap[$Matches[1]] = $Matches[2].Trim('"').Trim("'")
        }
    }
}

if (-not $DbName)  { $DbName  = if ($envMap["DB_NAME"]) { $envMap["DB_NAME"] } else { "singem" } }
if (-not $DbUser)  { $DbUser  = if ($envMap["DB_USER"]) { $envMap["DB_USER"] } else { "adm" } }

# --- OutputDir -------------------------------------------------------
if (-not $OutputDir) {
    $OutputDir = Join-Path $projectRoot "04_BACKUPS" "docker"
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# --- Banner ----------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Yellow
Write-Host " SINGEM Docker - Backup PostgreSQL" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Yellow
Write-Host "  Container : $ContainerName"
Write-Host "  Banco     : $DbName"
Write-Host "  Usuario   : $DbUser"
Write-Host "  Formato   : $Format"
Write-Host "  Destino   : $OutputDir"
Write-Host "  Rotacao   : $Keep backups"
Write-Host ""

# --- Pre-checks ------------------------------------------------------
Write-Step "Verificando Docker..."
$dockerInfo = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Docker nao esta em execucao."
    exit 1
}
Write-Ok "Docker Engine ativo."

Write-Step "Verificando container $ContainerName..."
$running = docker inspect --format '{{.State.Running}}' $ContainerName 2>&1
if ($LASTEXITCODE -ne 0 -or $running -ne "true") {
    Write-Fail "Container '$ContainerName' nao esta em execucao."
    exit 1
}
Write-Ok "Container em execucao."

# --- Dump ------------------------------------------------------------
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

if ($Format -eq "custom") {
    $fileName = "singem_backup_${timestamp}.dump"
    $dumpCmd = "pg_dump -U $DbUser -d $DbName -Fc"
} else {
    $fileName = "singem_backup_${timestamp}.sql.gz"
    $dumpCmd = "pg_dump -U $DbUser -d $DbName | gzip"
}

$tempPath = "/tmp/$fileName"
$localPath = Join-Path $OutputDir $fileName

Write-Step "Executando pg_dump dentro do container..."
$startTime = Get-Date

if ($Format -eq "custom") {
    docker exec $ContainerName sh -c "$dumpCmd > $tempPath" 2>&1
} else {
    docker exec $ContainerName sh -c "$dumpCmd > $tempPath" 2>&1
}

if ($LASTEXITCODE -ne 0) {
    Write-Fail "pg_dump falhou (exit code $LASTEXITCODE)."
    exit 1
}

$elapsed = (Get-Date) - $startTime

# --- Copy file out of container -------------------------------------
Write-Step "Copiando backup para host..."
docker cp "${ContainerName}:${tempPath}" $localPath 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Fail "Falha ao copiar backup do container."
    exit 1
}

# Cleanup temp inside container
docker exec $ContainerName rm -f $tempPath 2>$null

$sizeBytes = (Get-Item $localPath).Length
$sizeMB = [math]::Round($sizeBytes / 1MB, 2)

Write-Ok "Backup concluido: $fileName ($sizeMB MB) em $([math]::Round($elapsed.TotalSeconds, 1))s"

# --- Rotation --------------------------------------------------------
Write-Step "Aplicando rotacao (manter $Keep backups)..."

$pattern = $(if ($Format -eq "custom") { "singem_backup_*.dump" } else { "singem_backup_*.sql.gz" })
$backups = @(Get-ChildItem -Path $OutputDir -Filter $pattern |
    Sort-Object -Property LastWriteTime -Descending)

if ($backups.Count -gt $Keep) {
    $toDelete = @($backups | Select-Object -Skip $Keep)
    foreach ($old in $toDelete) {
        Remove-Item $old.FullName -Force
        Write-Host "    Removido: $($old.Name)" -ForegroundColor DarkGray
    }
    Write-Ok "Removidos $($toDelete.Count) backups antigos."
} else {
    Write-Ok "Nenhum backup antigo para remover ($($backups.Count)/$Keep)."
}

# --- Verification ----------------------------------------------------
Write-Step "Verificando integridade do backup..."
if ($sizeBytes -lt 100) {
    Write-Fail "Backup suspeito: tamanho muito pequeno ($sizeBytes bytes)."
    exit 1
}
Write-Ok "Backup valido ($sizeMB MB)."

# --- Webhook notification --------------------------------------------
if ($WebhookUrl) {
    Write-Step "Enviando notificacao via webhook..."
    $payload = @{
        event     = "backup_completed"
        project   = "singem"
        database  = $DbName
        file      = $fileName
        size_mb   = $sizeMB
        duration  = [math]::Round($elapsed.TotalSeconds, 1)
        timestamp = (Get-Date -Format "o")
        host      = $env:COMPUTERNAME
    } | ConvertTo-Json -Compress

    try {
        $response = Invoke-WebRequest -Uri $WebhookUrl -Method POST -Body $payload `
            -ContentType "application/json" -UseBasicParsing -TimeoutSec 10
        Write-Ok "Webhook enviado (HTTP $($response.StatusCode))."
    } catch {
        Write-Fail "Webhook falhou: $($_.Exception.Message)"
        # Nao falhar o script por causa de webhook
    }
}

# --- Summary ---------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Backup concluido com sucesso!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host "  Arquivo  : $localPath"
Write-Host "  Tamanho  : $sizeMB MB"
Write-Host "  Duracao  : $([math]::Round($elapsed.TotalSeconds, 1))s"
Write-Host ""

exit 0
