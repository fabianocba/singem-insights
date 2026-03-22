#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [switch]$PruneBuilder
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root

Write-DevTitle 'SINGEM DEV RESET TOTAL'
Write-DevWarn 'Este comando remove containers, volumes locais do projeto e caches de desenvolvimento.'

Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $compose, 'down', '--remove-orphans', '--volumes', '--rmi', 'local') -AllowFailure

foreach ($image in @('singem-backend:latest', 'singem-frontend:latest', 'singem-ai-core:latest')) {
  Invoke-DevCommand -FilePath 'docker' -ArgumentList @('image', 'rm', $image) -AllowFailure
}

$pathsToRemove = @(
  (Join-Path $root 'node_modules'),
  (Join-Path $root 'server\node_modules'),
  (Join-Path $root 'singem-ai\.venv'),
  (Join-Path $root 'singem-ai\.pytest_cache'),
  (Join-Path $root '.cache'),
  (Join-Path $root 'dist'),
  (Join-Path $root 'build'),
  (Join-Path $root '.next'),
  (Join-Path $root 'logs'),
  (Join-Path $root 'server\logs')
)

foreach ($path in $pathsToRemove) {
  Remove-PathIfExists -PathToRemove $path
}

Get-ChildItem -Path $root -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue |
  ForEach-Object { Remove-PathIfExists -PathToRemove $_.FullName }

if ($PruneBuilder) {
  Invoke-DevCommand -FilePath 'docker' -ArgumentList @('builder', 'prune', '-f') -AllowFailure
}

Write-DevOk 'Reset local concluído. Execute scripts/dev-setup.ps1 e scripts/dev-start.ps1.'
