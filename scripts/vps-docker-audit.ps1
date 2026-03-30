#Requires -Version 7.0
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SshHost,

  [Parameter(Mandatory = $true)]
  [string]$SshUser,

  [int]$Port = 22,

  [string]$KeyPath = '',

  [string]$ProjectDir = '/var/www/singem',

  [switch]$ApplyDeploy,

  [switch]$SkipHealthcheck
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-AuditTitle {
  param([string]$Text)
  Write-Host ''
  Write-Host ('=== {0} ===' -f $Text) -ForegroundColor Cyan
}

function Write-AuditStep {
  param([string]$Text)
  Write-Host ('[STEP] {0}' -f $Text) -ForegroundColor Cyan
}

function Write-AuditOk {
  param([string]$Text)
  Write-Host ('[OK] {0}' -f $Text) -ForegroundColor Green
}

function Write-AuditWarn {
  param([string]$Text)
  Write-Host ('[WARN] {0}' -f $Text) -ForegroundColor Yellow
}

function Invoke-Remote {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Script,

    [switch]$AllowFailure
  )

  $sshArgs = @('-p', "$Port")
  if (-not [string]::IsNullOrWhiteSpace($KeyPath)) {
    $sshArgs += @('-i', $KeyPath)
  }
  $sshArgs += @('-o', 'ConnectTimeout=12', '-o', 'ServerAliveInterval=30', '-o', 'StrictHostKeyChecking=accept-new')
  $sshArgs += @("$SshUser@$SshHost", $Script)

  & ssh @sshArgs
  if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
    throw ('Falha no comando remoto (exit {0}).' -f $LASTEXITCODE)
  }
}

if ([string]::IsNullOrWhiteSpace($KeyPath)) {
  $defaultKey = Join-Path $env:USERPROFILE '.ssh\id_ed25519'
  if (Test-Path -LiteralPath $defaultKey) {
    $KeyPath = $defaultKey
  }
}

Write-AuditTitle 'SINGEM VPS DOCKER AUDIT'
Write-AuditStep ('Host: {0}:{1}' -f $SshHost, $Port)
Write-AuditStep ('Projeto remoto: {0}' -f $ProjectDir)

$remotePrelude = @"
set -e
cd '$ProjectDir'
"@

$composePrelude = @"
COMPOSE_FILES="-f docker/prod/docker-compose.prod.yml"
if [ -f docker/prod/docker-compose.prod.ssl.yml ]; then
  COMPOSE_FILES="$COMPOSE_FILES -f docker/prod/docker-compose.prod.ssl.yml"
fi
"@

Write-AuditStep 'Verificando pré-requisitos remotos (docker e compose)...'
Invoke-Remote -Script ($remotePrelude + @"
docker --version
docker compose version
"@)
Write-AuditOk 'Docker e Docker Compose encontrados na VPS.'

Write-AuditStep 'Validando estrutura docker/prod e arquivos obrigatórios...'
Invoke-Remote -Script ($remotePrelude + @"
test -f docker/prod/docker-compose.prod.yml
test -f docker/prod/.env.prod
$composePrelude
sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES config --quiet"
"@)
Write-AuditOk 'Compose de produção válido com .env presente.'

if ($ApplyDeploy) {
  Write-AuditStep 'Aplicando deploy Docker remoto (pull/build/up)...'
  Invoke-Remote -Script ($remotePrelude + @"
$composePrelude
sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES pull --ignore-buildable || true"
sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES up -d --build --remove-orphans"
"@)
  Write-AuditOk 'Deploy Docker remoto aplicado.'
}

Write-AuditStep 'Coletando status da stack Docker na VPS...'
Invoke-Remote -Script ($remotePrelude + @"
$composePrelude
sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES ps"
echo
sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES images"
"@)

if (-not $SkipHealthcheck) {
  Write-AuditStep 'Executando healthchecks dentro dos containers...'
  Invoke-Remote -Script ($remotePrelude + @"
$composePrelude
sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES exec -T backend wget -qO- http://localhost:3000/health >/dev/null"
if sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES ps --services" | grep -q '^frontend$'; then
  if [ -f docker/prod/docker-compose.prod.ssl.yml ]; then
    sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES exec -T frontend wget --no-check-certificate -qO- https://localhost/health >/dev/null"
  else
    sh -lc "docker compose --env-file docker/prod/.env.prod $COMPOSE_FILES exec -T frontend wget -qO- http://localhost/health >/dev/null"
  fi
fi
"@) -AllowFailure
  if ($LASTEXITCODE -eq 0) {
    Write-AuditOk 'Healthchecks do backend concluídos com sucesso.'
  } else {
    Write-AuditWarn 'Healthcheck parcial: verifique logs com docker compose logs --tail=80 backend frontend.'
  }
}

Write-Host ''
Write-AuditOk 'Auditoria VPS concluída. Stack validada no modo Docker-only.'
