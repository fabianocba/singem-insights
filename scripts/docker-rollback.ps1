<#
.SYNOPSIS
    SINGEM — Rollback automatico de versao Docker.

.DESCRIPTION
    Reverte para a versao anterior das imagens Docker, incluindo
    rollback de migrations se necessario.

    Fluxo:
      1. Identifica versao atual e anterior (via tags/history)
      2. Para os servicos atuais
      3. Restaura imagens da versao anterior
      4. Sobe os servicos com a versao anterior
      5. Verifica healthchecks
      6. Registra o rollback

.PARAMETER Service
    Servico especifico para rollback: backend, frontend, all.
    Padrao: all

.PARAMETER Tag
    Tag especifica da imagem para reverter. Se omitido, usa a
    penultima tag disponivel.

.PARAMETER DryRun
    Mostra o que seria feito sem executar.

.PARAMETER WebhookUrl
    URL do webhook para notificacao.

.EXAMPLE
    .\docker-rollback.ps1
    .\docker-rollback.ps1 -Service backend
    .\docker-rollback.ps1 -Service backend -Tag v1.1.0
    .\docker-rollback.ps1 -DryRun
#>

[CmdletBinding()]
param(
    [ValidateSet("backend", "frontend", "all")]
    [string]$Service = "all",

    [string]$Tag = "",
    [switch]$DryRun,
    [string]$WebhookUrl = ""
)

Set-StrictMode -Version Latest

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
$historyFile = Join-Path (Join-Path $projectRoot "storage") "rollback-history.json"

# --- Banner ----------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SINGEM Docker - Rollback" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Servico   : $Service"
Write-Host "  Tag       : $(if ($Tag) { $Tag } else { '(auto - penultima)' })"
Write-Host "  DryRun    : $DryRun"
Write-Host "  Projeto   : $projectRoot"
Write-Host ""

# --- Helpers ---------------------------------------------------------
function Send-Webhook {
    param([string]$Message, [string]$Status)
    if (-not $WebhookUrl) { return }
    try {
        $body = @{
            text   = $Message
            status = $Status
            source = "singem-rollback"
            time   = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        } | ConvertTo-Json -Depth 3
        Invoke-RestMethod -Uri $WebhookUrl -Method Post -Body $body `
            -ContentType "application/json" -TimeoutSec 10 | Out-Null
    }
    catch { }
}

function Get-RollbackHistory {
    if (Test-Path $historyFile) {
        try {
            return Get-Content -Path $historyFile -Raw | ConvertFrom-Json
        }
        catch { }
    }
    return @()
}

function Save-RollbackEntry {
    param($Entry)
    $dir = Split-Path -Parent $historyFile
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }

    $history = @(Get-RollbackHistory)
    $history += $Entry

    # Manter apenas os ultimos 20 registros
    if ($history.Count -gt 20) {
        $history = $history[($history.Count - 20)..($history.Count - 1)]
    }

    $history | ConvertTo-Json -Depth 5 | Set-Content -Path $historyFile -Encoding UTF8
}

function Get-CurrentImageId {
    param([string]$ContainerName)
    $imgId = & docker inspect --format "{{.Image}}" $ContainerName 2>&1
    if ($LASTEXITCODE -eq 0) { return $imgId }
    return ""
}

function Get-PreviousImage {
    param([string]$ImageName)
    # Listar imagens por data de criacao (mais recente primeiro)
    $images = & docker images $ImageName --format "{{.ID}} {{.Tag}} {{.CreatedAt}}" --no-trunc 2>&1
    if ($LASTEXITCODE -ne 0 -or -not $images) {
        return $null
    }

    $imgList = @($images -split "`n" | Where-Object { $_ -match "\S" })
    if ($imgList.Count -lt 2) {
        return $null
    }

    # Segunda imagem e a anterior
    $parts = $imgList[1] -split "\s+"
    return @{
        Id  = $parts[0]
        Tag = $parts[1]
    }
}

function Test-ContainerHealthy {
    param([string]$Container, [int]$TimeoutSec = 120)
    Write-Host "  [*] Aguardando healthcheck de $Container..." -ForegroundColor Cyan
    for ($i = 1; $i -le $TimeoutSec; $i += 5) {
        $health = & docker inspect --format "{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}" $Container 2>&1
        if ($health -eq "healthy") {
            Write-Host "  [OK] $Container esta healthy." -ForegroundColor Green
            return $true
        }
        Start-Sleep -Seconds 5
    }
    Write-Host "  [FAIL] $Container nao ficou healthy em ${TimeoutSec}s." -ForegroundColor Red
    return $false
}

# --- Identify targets ------------------------------------------------
$targets = @()
if ($Service -eq "all" -or $Service -eq "backend") {
    $targets += @{
        name      = "backend"
        container = "singem-backend"
        image     = "singem-backend"
        compose   = "backend"
    }
}
if ($Service -eq "all" -or $Service -eq "frontend") {
    $targets += @{
        name      = "frontend"
        container = "singem-frontend"
        image     = "singem-frontend"
        compose   = "frontend"
    }
}

# --- Check current state ---------------------------------------------
Write-Host "  [*] Verificando estado atual..." -ForegroundColor Cyan

foreach ($t in $targets) {
    $currentId = Get-CurrentImageId -ContainerName $t.container
    $t.currentImageId = $currentId

    if ($Tag) {
        $t.targetTag = $Tag
        Write-Host "  $($t.name): tag alvo = $Tag"
    }
    else {
        $prev = Get-PreviousImage -ImageName $t.image
        if ($prev) {
            $t.targetTag = $prev.Tag
            $t.targetId  = $prev.Id
            Write-Host "  $($t.name): versao anterior = $($prev.Tag)"
        }
        else {
            Write-Host "  [!] $($t.name): nenhuma versao anterior encontrada." -ForegroundColor Yellow
            $t.targetTag = ""
        }
    }
}

$hasTarget = $targets | Where-Object { $_.targetTag }
if (-not $hasTarget) {
    Write-Host ""
    Write-Host "  [FAIL] Nenhuma versao anterior disponivel para rollback." -ForegroundColor Red
    Write-Host "  Use -Tag para especificar uma tag manualmente." -ForegroundColor Yellow
    exit 1
}

# --- DryRun ----------------------------------------------------------
if ($DryRun) {
    Write-Host ""
    Write-Host "  === DRY RUN - nenhuma alteracao sera feita ===" -ForegroundColor Yellow
    foreach ($t in $targets) {
        if ($t.targetTag) {
            Write-Host "  $($t.name): rollback para $($t.targetTag)"
        }
    }
    Write-Host ""
    exit 0
}

# --- Execute rollback ------------------------------------------------
Write-Host ""
Write-Host "  [1/4] Parando servicos..." -ForegroundColor Cyan

Set-Location $projectRoot
foreach ($t in $targets) {
    if (-not $t.targetTag) { continue }
    Write-Host "  Parando $($t.container)..."
    & docker compose stop $t.compose 2>&1 | Out-Null
}

Write-Host "  [2/4] Aplicando imagens anteriores..." -ForegroundColor Cyan
foreach ($t in $targets) {
    if (-not $t.targetTag) { continue }
    $imgRef = "$($t.image):$($t.targetTag)"
    Write-Host "  $($t.name) -> $imgRef"

    # Re-tag se necessario
    if ($t.targetTag -ne "latest") {
        & docker tag $imgRef "$($t.image):latest" 2>&1
    }
}

Write-Host "  [3/4] Reiniciando servicos..." -ForegroundColor Cyan
foreach ($t in $targets) {
    if (-not $t.targetTag) { continue }
    & docker compose up -d $t.compose 2>&1
}

Write-Host "  [4/4] Verificando healthchecks..." -ForegroundColor Cyan
$allHealthy = $true
foreach ($t in $targets) {
    if (-not $t.targetTag) { continue }
    $ok = Test-ContainerHealthy -Container $t.container -TimeoutSec 120
    if (-not $ok) { $allHealthy = $false }
}

# --- Save history ----------------------------------------------------
$entry = @{
    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    service   = $Service
    targets   = @($targets | ForEach-Object {
        @{ name = $_.name; from = $_.currentImageId; to = $_.targetTag }
    })
    success   = $allHealthy
}
Save-RollbackEntry -Entry $entry

if ($allHealthy) {
    Write-Host ""
    Write-Host "  [OK] Rollback concluido com sucesso!" -ForegroundColor Green
    Send-Webhook -Message "SINGEM Rollback OK: $Service -> $(($targets | ForEach-Object { $_.targetTag }) -join ', ')" -Status "ok"
}
else {
    Write-Host ""
    Write-Host "  [!] Rollback parcial — alguns servicos nao ficaram healthy." -ForegroundColor Yellow
    Send-Webhook -Message "SINGEM Rollback PARCIAL: $Service — alguns servicos degradados" -Status "warning"
}

# --- Show history ----------------------------------------------------
Write-Host ""
Write-Host "  Historico recente:" -ForegroundColor White
$history = @(Get-RollbackHistory)
$recent = @($history | Select-Object -Last 5)
foreach ($h in $recent) {
    $mark = $(if ($h.success) { "[OK]" } else { "[!]" })
    $color = $(if ($h.success) { "Green" } else { "Yellow" })
    Write-Host "    $mark $($h.timestamp) — $($h.service)" -ForegroundColor $color
}
Write-Host ""
exit $(if ($allHealthy) { 0 } else { 1 })
