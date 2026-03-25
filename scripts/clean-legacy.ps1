#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [switch]$Apply
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot

Write-DevTitle 'SINGEM CLEAN LEGACY'

$legacyPaths = @(
  'docker/local/docker-compose.yml',
  'docker/local/nginx-dev.conf',
  'docker/local/.env.example',
  'docker/prod/docker-compose.yml',
  'docker/prod/docker-compose.ssl.yml',
  'docker/nginx.conf',
  'docker/nginx-ssl.conf',
  'scripts/dev-update.ps1',
  'scripts/dev-doctor.ps1',
  'scripts/dev-setup.ps1',
  'scripts/dev-reset.ps1',
  'scripts/release.ps1',
  'docker-compose.yml',
  'docker-compose.prod.yml',
  'docker-compose.staging.yml',
  'docker-compose.test.yml',
  'docker-compose.logging.yml',
  'docker-compose.monitoring.yml',
  'docker-compose.loadtest.yml',
  'docker-compose.gpu.yml',
  'docker-compose.waf.yml'
)

$found = @()
foreach ($relativePath in $legacyPaths) {
  $fullPath = Join-Path $root $relativePath
  if (Test-Path -LiteralPath $fullPath) {
    $found += $fullPath
  }
}

if ($found.Count -eq 0) {
  Write-DevOk 'Nenhum artefato legado encontrado.'
  exit 0
}

Write-DevWarn 'Arquivos legados detectados:'
$found | ForEach-Object { Write-Host (' - {0}' -f $_) -ForegroundColor Yellow }

if (-not $Apply) {
  Write-Host ''
  Write-DevStep 'Dry-run concluído. Execute com -Apply para remover os artefatos listados.'
  exit 0
}

foreach ($path in $found) {
  Remove-PathIfExists -PathToRemove $path
}

Write-DevOk 'Limpeza de legado concluída.'
