#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [switch]$Pull,
  [switch]$NoCache,
  [switch]$SkipHealthcheck
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Join-Path $root 'docker\prod\docker-compose.yml'
$composeSsl = Join-Path $root 'docker\prod\docker-compose.ssl.yml'
$envFile = Join-Path $root 'docker\prod\.env'

$composeFiles = @($compose)
if (Test-Path -LiteralPath $composeSsl) {
  $composeFiles += $composeSsl
}

function New-ComposeArgs {
  param([string[]]$TailArgs)

  $args = @('compose', '--env-file', $envFile)
  foreach ($composeFile in $composeFiles) {
    $args += @('-f', $composeFile)
  }

  return $args + $TailArgs
}

function Get-FrontendHealthUri {
  if ($composeFiles.Count -gt 1) {
    return 'https://127.0.0.1/health'
  }

  return 'http://127.0.0.1/health'
}

function Get-FrontendHostHeader {
  try {
    $frontUrl = [Uri](Get-Content -LiteralPath $envFile | Where-Object { $_ -match '^FRONTEND_URL=' } | Select-Object -First 1).Split('=', 2)[1]
    if (-not [string]::IsNullOrWhiteSpace($frontUrl.Host)) {
      return $frontUrl.Host
    }
  } catch {
    # fallback abaixo
  }

  return 'singem.cloud'
}

Write-DevTitle 'SINGEM DEPLOY VPS'

if (-not (Test-Path -LiteralPath $compose)) {
  throw ("Compose de produção não encontrado: {0}" -f $compose)
}

if (-not (Test-Path -LiteralPath $envFile)) {
  throw ("Arquivo obrigatório ausente: {0}. Crie a partir de docker/prod/.env.example." -f $envFile)
}

if (Test-Path -LiteralPath $composeSsl) {
  Write-DevStep ('Override SSL detectado: {0}' -f $composeSsl)
}

Invoke-DevCommand -FilePath 'docker' -ArgumentList (New-ComposeArgs -TailArgs @('config', '--quiet'))
Write-DevOk 'Compose de produção válido.'

if ($Pull) {
  $pullArgs = New-ComposeArgs -TailArgs @('pull')
  Invoke-DevCommand -FilePath 'docker' -ArgumentList $pullArgs
}

$buildArgs = New-ComposeArgs -TailArgs @('build')
if ($NoCache) {
  $buildArgs += '--no-cache'
}
if ($Pull) {
  $buildArgs += '--pull'
}
Invoke-DevCommand -FilePath 'docker' -ArgumentList $buildArgs

$upArgs = New-ComposeArgs -TailArgs @('up', '-d', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $upArgs

Invoke-DevCommand -FilePath 'docker' -ArgumentList (New-ComposeArgs -TailArgs @('ps'))

if (-not $SkipHealthcheck) {
  Write-DevStep 'Validando saúde dos serviços principais...'

  try {
    $backendHealth = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/health' -UseBasicParsing -TimeoutSec 10
    if ($backendHealth.StatusCode -ne 200) {
      throw ('Backend health retornou HTTP {0}' -f $backendHealth.StatusCode)
    }
  } catch {
    throw ('Falha no healthcheck do backend: {0}' -f $_.Exception.Message)
  }

  try {
    $frontendHeaders = @{ Host = (Get-FrontendHostHeader) }
    $frontendHealth = Invoke-WebRequest -Uri (Get-FrontendHealthUri) -Headers $frontendHeaders -UseBasicParsing -SkipCertificateCheck -TimeoutSec 15
    if ($frontendHealth.StatusCode -ne 200) {
      throw ('Frontend/proxy health retornou HTTP {0}' -f $frontendHealth.StatusCode)
    }
  } catch {
    throw ('Falha no healthcheck do frontend/proxy: {0}' -f $_.Exception.Message)
  }

  try {
    $aiArgs = New-ComposeArgs -TailArgs @('exec', '-T', 'ai-core', 'python', '-c', "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8010/ai/health', timeout=5).status == 200 else 1)")
    Invoke-DevCommand -FilePath 'docker' -ArgumentList $aiArgs
  } catch {
    throw ('Falha no healthcheck do AI Core: {0}' -f $_.Exception.Message)
  }

  Write-DevOk 'Healthchecks essenciais concluídos.'
}

Write-Host ''
Write-DevOk 'Deploy VPS concluído com sucesso.'
