<#
.SYNOPSIS
    SINGEM — Gerador de .env para Docker (desenvolvimento e produção)
.DESCRIPTION
    Cria ou atualiza o arquivo .env na raiz do projeto com valores automáticos:
    - Gera JWT_SECRET (64 hex chars) e REDIS_PASSWORD automaticamente
    - Gera ADMIN_PASSWORD aleatória de 20 caracteres
    - Modo -Production força valores seguros e valida campos obrigatórios
.PARAMETER Production
    Gera .env com valores de produção e valida campos obrigatórios.
.PARAMETER Force
    Sobrescreve .env existente sem pedir confirmação.
.PARAMETER FrontendUrl
    URL pública do frontend (obrigatório em produção). Ex: https://singem.ifbaiano.edu.br
.EXAMPLE
    # Desenvolvimento (padrão)
    .\scripts\docker-setup.ps1

    # Produção
    .\scripts\docker-setup.ps1 -Production -FrontendUrl "https://singem.ifbaiano.edu.br"

    # Sobrescrever existente
    .\scripts\docker-setup.ps1 -Force
#>
[CmdletBinding()]
param(
    [switch]$Production,
    [switch]$Force,
    [string]$FrontendUrl = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$EnvFile = Join-Path $ProjectRoot ".env"

# ---- Helpers ----

function New-RandomHex([int]$Bytes = 32) {
    $buf = [byte[]]::new($Bytes)
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($buf)
    $rng.Dispose()
    return ($buf | ForEach-Object { $_.ToString("x2") }) -join ''
}

function New-RandomPassword([int]$Length = 20) {
    $chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%&*'
    $buf = [byte[]]::new($Length)
    $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::new()
    $rng.GetBytes($buf)
    $rng.Dispose()
    return ($buf | ForEach-Object { $chars[$_ % $chars.Length] }) -join ''
}

# ---- Validação de produção ----

if ($Production -and -not $FrontendUrl) {
    Write-Error "Em modo -Production, -FrontendUrl é obrigatório. Ex: -FrontendUrl 'https://singem.ifbaiano.edu.br'"
    exit 1
}

# ---- Verificar existência ----

if ((Test-Path $EnvFile) -and -not $Force) {
    Write-Host ""
    Write-Host "[docker-setup] Arquivo .env já existe em: $EnvFile" -ForegroundColor Yellow
    $resp = Read-Host "Sobrescrever? (s/N)"
    if ($resp -notin @('s', 'S', 'sim', 'y', 'yes')) {
        Write-Host "[docker-setup] Operação cancelada." -ForegroundColor Gray
        exit 0
    }
}

# ---- Gerar secrets ----

$jwtSecret       = New-RandomHex -Bytes 32     # 64 hex chars
$dbPassword       = New-RandomPassword -Length 24
$adminPassword    = New-RandomPassword -Length 20
$redisPassword    = New-RandomPassword -Length 16
$aiToken          = New-RandomHex -Bytes 16     # 32 hex chars

# Em desenvolvimento, usar defaults mais simples
if (-not $Production) {
    $dbPassword    = "Singem@12345"
    $redisPassword = ""
    $aiToken       = "change-me"
}

# ---- Definir variáveis ----

$nodeEnv       = $(if ($Production) { "production" } else { "development" })
$trustProxy    = $(if ($Production) { "true" } else { "false" })
$frontendUrl   = $(if ($FrontendUrl) { $FrontendUrl } else { "http://localhost:8000" })
$corsOrigins   = $(if ($Production -and $FrontendUrl) { $FrontendUrl } else { "http://localhost:8000,http://localhost:3000" })

# ---- Gerar conteúdo ----

$timestamp = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
$lines = @(
    "# ============================================================"
    "# SINGEM — Variáveis de ambiente Docker"
    "# Gerado por docker-setup.ps1 em $timestamp"
    "# Modo: $nodeEnv"
    "# ============================================================"
    ""
    "# ------ Banco de dados PostgreSQL -------------------------"
    "DB_NAME=singem"
    "DB_USER=adm"
    "DB_PASSWORD=$dbPassword"
    ""
    "DB_PORT_EXTERNAL=5432"
    ""
    "# ------ Backend Node.js -----------------------------------"
    "NODE_ENV=$nodeEnv"
    "TRUST_PROXY=$trustProxy"
    "API_BODY_LIMIT=10mb"
    ""
    "BACKEND_PORT_EXTERNAL=3000"
    "FRONTEND_PORT_EXTERNAL=8000"
    ""
    "CORS_ORIGINS=$corsOrigins"
    "FRONTEND_URL=$frontendUrl"
    ""
    "# ------ JWT -----------------------------------------------"
    "JWT_SECRET=$jwtSecret"
    "JWT_EXPIRES_IN=15m"
    "JWT_REFRESH_EXPIRES_IN=7d"
    ""
    "# ------ Admin inicial -------------------------------------"
    "ADMIN_LOGIN=admin"
    "ADMIN_NOME=Administrador SINGEM"
    "ADMIN_EMAIL=admin@ifbaiano.edu.br"
    "ADMIN_PASSWORD=$adminPassword"
    ""
    "# ------ AI Core (padrão oficial via Docker) --------------"
    "AI_PORT_EXTERNAL=8010"
    "AI_CORE_ENABLED=true"
    "AI_CORE_INTERNAL_TOKEN=$aiToken"
    "AI_CORE_TIMEOUT_MS=15000"
    "AI_CORE_HEALTH_TIMEOUT_MS=2500"
    "EMBEDDING_PROVIDER=hash"
    "EMBEDDING_DIMENSION=384"
    "ENABLE_VECTOR_SEARCH=true"
    ""
    "# ------ Redis ---------------------------------------------"
    "REDIS_PORT_EXTERNAL=6379"
    "REDIS_PASSWORD=$redisPassword"
    ""
    "# ------ Integrações externas ------------------------------"
    "GOVBR_ENABLED=false"
    "SERPRO_ENABLED=false"
    "SERPROID_ENABLED=false"
    "CATMAT_ENABLED=false"
    "CATMAT_OBRIGATORIO=false"
    ""
    "# ------ Compras.gov.br -----------------------------------"
    "COMPRASGOV_BASE_URL=https://dadosabertos.compras.gov.br"
    "COMPRASGOV_TIMEOUT_MS=10000"
    "COMPRASGOV_MAX_RETRIES=3"
    ""
    "# ------ SMTP (opcional) ----------------------------------"
    "SMTP_HOST="
    "SMTP_PORT=587"
    "SMTP_SECURE=false"
    "SMTP_USER="
    "SMTP_PASS="
    "SMTP_FROM=SINGEM <naoresponda@ifbaiano.edu.br>"
)

$content = $lines -join "`n"

# ---- Escrever arquivo ----

$content | Set-Content -Path $EnvFile -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " SINGEM Docker — .env gerado com sucesso" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Arquivo:  $EnvFile"
Write-Host "  Modo:     $nodeEnv"
Write-Host ""

if ($Production) {
    Write-Host "  [PRODUÇÃO] Valores gerados automaticamente:" -ForegroundColor Cyan
    Write-Host "    JWT_SECRET:     $($jwtSecret.Substring(0,8))..." -ForegroundColor DarkGray
    Write-Host "    DB_PASSWORD:    $($dbPassword.Substring(0,4))..." -ForegroundColor DarkGray
    Write-Host "    ADMIN_PASSWORD: $($adminPassword.Substring(0,4))..." -ForegroundColor DarkGray
    Write-Host "    REDIS_PASSWORD: $($redisPassword.Substring(0,4))..." -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  Próximos passos:" -ForegroundColor Yellow
    Write-Host "    1. Revise o .env e ajuste SMTP, integrações, etc."
    Write-Host "    2. cd docker/prod && docker compose up -d --build"
    Write-Host "    3. docker compose logs -f backend  # verificar migrations e saúde"
} else {
    Write-Host "  [DEV] Próximos passos:" -ForegroundColor Yellow
    Write-Host "    1. cd docker/local && docker compose up --build"
    Write-Host "    2. Acesse http://localhost:8000"
    Write-Host "    3. Login: admin / $adminPassword"
}

Write-Host ""
