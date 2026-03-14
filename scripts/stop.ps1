#Requires -Version 7.0
<#
.SYNOPSIS
  Encerra todos os serviços DEV do SINGEM.
.DESCRIPTION
  Para backend, frontend, AI Core e túnel SSH.
  Opcionalmente publica alterações no Git com -Publish.
.EXAMPLE
  pwsh -File .\scripts\stop.ps1
  pwsh -File .\scripts\stop.ps1 -Publish
#>
[CmdletBinding()]
param(
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev',

  [string]$ProjectRoot = (Get-Location).Path,

  # Publica alterações no Git (commit + rebase + push) após parar
  [switch]$Publish,

  # Compatibilidade legada — ignorado (stop nunca mais publica por padrão)
  [switch]$OnlyStop
)

$ErrorActionPreference = 'Stop'

[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

function Write-Step  { param([string]$Text) Write-Host ('[STEP] {0}' -f $Text) -ForegroundColor Cyan }
function Write-Ok    { param([string]$Text) Write-Host ('[OK] {0}' -f $Text) -ForegroundColor Green }
function Write-WarnMsg { param([string]$Text) Write-Host ('[WARN] {0}' -f $Text) -ForegroundColor Yellow }
function Write-ErrMsg  { param([string]$Text) Write-Host ('[ERR] {0}' -f $Text) -ForegroundColor Red }

# --- 1. Encerrar serviços via dev-up.ps1 -Action stop ---
$targetScript = Join-Path $PSScriptRoot 'dev-up.ps1'
if (-not (Test-Path -LiteralPath $targetScript)) {
  Write-ErrMsg 'scripts\dev-up.ps1 não encontrado.'
  exit 1
}

Write-Step 'Encerrando serviços SINGEM...'

& $targetScript -Action stop -Branch $Branch -ProjectRoot $ProjectRoot
if ($LASTEXITCODE -ne 0) {
  Write-ErrMsg 'Falha ao encerrar serviços.'
  exit $LASTEXITCODE
}

# --- 2. Git Publish (somente se -Publish foi passado) ---
if (-not $Publish) {
  Write-Ok 'Serviços encerrados. Use -Publish para commit+push automático.'
  exit 0
}

$rootPath = [System.IO.Path]::GetFullPath($ProjectRoot)
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  Write-ErrMsg 'Git não encontrado no PATH.'
  exit 1
}
if (-not (Test-Path -LiteralPath (Join-Path $rootPath '.git'))) {
  Write-ErrMsg ('Pasta {0} não é um repositório Git válido.' -f $rootPath)
  exit 1
}

Push-Location $rootPath
try {
  Write-Step ('Publicando alterações para origin/{0}' -f $Branch)

  # Limpa artefatos Python
  Get-ChildItem -Path (Join-Path $rootPath 'singem-ai') -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue |
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
  Get-ChildItem -Path (Join-Path $rootPath 'singem-ai') -Recurse -File -Include '*.pyc' -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

  git add -A
  if ($LASTEXITCODE -ne 0) { throw 'Falha ao adicionar alterações ao stage.' }

  $staged = @(git diff --cached --name-only)
  if ($staged.Count -gt 0) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $msg = "chore(dev): stop sync $stamp"
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) { throw 'Falha ao criar commit.' }
    Write-Ok ('Commit criado: {0}' -f $msg)
  } else {
    Write-Ok 'Sem alterações locais para commit.'
  }

  git fetch origin $Branch --prune
  if ($LASTEXITCODE -ne 0) { throw ('Falha no fetch de origin/{0}.' -f $Branch) }

  git rebase "origin/$Branch"
  if ($LASTEXITCODE -ne 0) { throw ('Falha no rebase com origin/{0}. Resolva conflitos manualmente.' -f $Branch) }

  git push origin "HEAD:$Branch"
  if ($LASTEXITCODE -ne 0) { throw ('Falha no push para origin/{0}.' -f $Branch) }

  Write-Ok ('Publicação concluída em origin/{0}.' -f $Branch)
} catch {
  Write-ErrMsg $_.Exception.Message
  exit 1
} finally {
  Pop-Location
}

exit 0
