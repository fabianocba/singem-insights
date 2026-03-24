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
$envFile = Join-Path $root 'docker\prod\.env'

Write-DevTitle 'SINGEM DEPLOY VPS'

if (-not (Test-Path -LiteralPath $compose)) {
  throw ("Compose de produção não encontrado: {0}" -f $compose)
}

if (-not (Test-Path -LiteralPath $envFile)) {
  throw ("Arquivo obrigatório ausente: {0}. Crie a partir de docker/prod/.env.example." -f $envFile)
}

Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '--env-file', $envFile, '-f', $compose, 'config', '--quiet')
Write-DevOk 'Compose de produção válido.'

if ($Pull) {
  $pullArgs = @('compose', '--env-file', $envFile, '-f', $compose)
  $pullArgs += 'pull'
  Invoke-DevCommand -FilePath 'docker' -ArgumentList $pullArgs
}

$buildArgs = @('compose', '--env-file', $envFile, '-f', $compose)
$buildArgs += 'build'
if ($NoCache) {
  $buildArgs += '--no-cache'
}
if ($Pull) {
  $buildArgs += '--pull'
}
Invoke-DevCommand -FilePath 'docker' -ArgumentList $buildArgs

$upArgs = @('compose', '--env-file', $envFile, '-f', $compose)
$upArgs += @('up', '-d', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $upArgs

Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '--env-file', $envFile, '-f', $compose, 'ps')

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
    $frontendHealth = Invoke-WebRequest -Uri 'http://127.0.0.1/backend-health' -UseBasicParsing -TimeoutSec 10
    if ($frontendHealth.StatusCode -ne 200) {
      throw ('Frontend/proxy health retornou HTTP {0}' -f $frontendHealth.StatusCode)
    }
  } catch {
    Write-DevWarn ('Não foi possível validar /backend-health via localhost sem host header: {0}' -f $_.Exception.Message)
  }

  try {
    $aiArgs = @('compose', '--env-file', $envFile, '-f', $compose, 'exec', '-T', 'ai-core', 'python', '-c', "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8010/ai/health').status == 200 else 1)")
    Invoke-DevCommand -FilePath 'docker' -ArgumentList $aiArgs
  } catch {
    throw ('Falha no healthcheck do AI Core: {0}' -f $_.Exception.Message)
  }

  Write-DevOk 'Healthchecks essenciais concluídos.'
}

Write-Host ''
Write-DevOk 'Deploy VPS concluído com sucesso.'
