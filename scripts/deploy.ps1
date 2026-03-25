#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [switch]$Pull,
  [switch]$NoCache,
  [switch]$SkipHealthcheck,
  [switch]$NoSslOverride
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Join-Path $root 'docker\prod\docker-compose.prod.yml'
$composeSsl = Join-Path $root 'docker\prod\docker-compose.prod.ssl.yml'
$envFile = Join-Path $root 'docker\prod\.env.prod'

$composeFiles = @($compose)
if ((-not $NoSslOverride) -and (Test-Path -LiteralPath $composeSsl)) {
  $composeFiles += $composeSsl
}

function New-ComposeCmd {
  param([string[]]$TailCommand)

  $composeFileParts = foreach ($composeFile in $composeFiles) {
    @('-f', $composeFile)
  }

  return @('compose', '--env-file', $envFile) + $composeFileParts + $TailCommand
}

function Invoke-CommandWithRetry {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,
    [Parameter(Mandatory = $true)]
    [string[]]$ArgumentList,
    [int]$MaxAttempts = 12,
    [int]$DelaySeconds = 5,
    [string]$Label = 'Comando'
  )

  for ($attempt = 1; $attempt -le $MaxAttempts; $attempt++) {
    try {
      Invoke-DevCommand -FilePath $FilePath -ArgumentList $ArgumentList
      if ($attempt -gt 1) {
        Write-DevOk ("{0} disponível após {1} tentativa(s)." -f $Label, $attempt)
      }
      return
    } catch {
      if ($attempt -eq $MaxAttempts) {
        throw
      }

      Write-DevStep (
        "{0} ainda indisponível (tentativa {1}/{2}). Aguardando {3}s..." -f $Label, $attempt, $MaxAttempts, $DelaySeconds
      )
      Start-Sleep -Seconds $DelaySeconds
    }
  }
}

Write-DevTitle 'SINGEM DEPLOY VPS'

if (-not (Test-Path -LiteralPath $compose)) {
  throw ("Compose de produção não encontrado: {0}" -f $compose)
}

if (-not (Test-Path -LiteralPath $envFile)) {
  throw ("Arquivo obrigatório ausente: {0}. Crie a partir de docker/prod/.env.prod." -f $envFile)
}

if ((-not $NoSslOverride) -and (Test-Path -LiteralPath $composeSsl)) {
  Write-DevStep ('Override SSL detectado: {0}' -f $composeSsl)
} elseif ($NoSslOverride) {
  Write-DevStep 'Override SSL desativado via parâmetro -NoSslOverride.'
}

Invoke-DevCommand -FilePath 'docker' -ArgumentList (New-ComposeCmd -TailCommand @('config', '--quiet'))
Write-DevOk 'Compose de produção válido.'

if ($Pull) {
  $pullCommand = New-ComposeCmd -TailCommand @('pull')
  Invoke-DevCommand -FilePath 'docker' -ArgumentList $pullCommand
}

$buildCommand = New-ComposeCmd -TailCommand @('build')
if ($NoCache) {
  $buildCommand += '--no-cache'
}
if ($Pull) {
  $buildCommand += '--pull'
}
Invoke-DevCommand -FilePath 'docker' -ArgumentList $buildCommand

$upCommand = New-ComposeCmd -TailCommand @('up', '-d', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $upCommand

Invoke-DevCommand -FilePath 'docker' -ArgumentList (New-ComposeCmd -TailCommand @('ps'))

if (-not $SkipHealthcheck) {
  Write-DevStep 'Validando saúde dos serviços principais...'

  try {
    $backendCommand = New-ComposeCmd -TailCommand @('exec', '-T', 'backend', 'node', '-e', "const http=require('http'); http.get('http://127.0.0.1:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1));")
    Invoke-DevCommand -FilePath 'docker' -ArgumentList $backendCommand
  } catch {
    throw ('Falha no healthcheck do backend: {0}' -f $_.Exception.Message)
  }

  try {
    $frontendCommand = New-ComposeCmd -TailCommand @('exec', '-T', 'backend', 'node', '-e', "const http=require('http'); http.get('http://frontend/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1));")
    Invoke-DevCommand -FilePath 'docker' -ArgumentList $frontendCommand
  } catch {
    throw ('Falha no healthcheck do frontend/proxy: {0}' -f $_.Exception.Message)
  }

  try {
    $aiCommand = New-ComposeCmd -TailCommand @('exec', '-T', 'ai-core', 'python', '-c', "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://localhost:8010/ai/health', timeout=10).status == 200 else 1)")
    Invoke-CommandWithRetry -FilePath 'docker' -ArgumentList $aiCommand -MaxAttempts 18 -DelaySeconds 5 -Label 'Healthcheck do AI Core'
  } catch {
    throw ('Falha no healthcheck do AI Core: {0}' -f $_.Exception.Message)
  }

  Write-DevOk 'Healthchecks essenciais concluídos.'
}

Write-Host ''
Write-DevOk 'Deploy VPS concluído com sucesso.'
