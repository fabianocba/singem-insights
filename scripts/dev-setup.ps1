#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [switch]$InstallLocalToolchains
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot

Write-DevTitle 'SINGEM DEV SETUP (Máquina descartável)'
Write-DevStep ('Projeto: {0}' -f $root)

Assert-DevCommand -Name 'pwsh' -Hint 'Instale PowerShell 7+'
Assert-DevCommand -Name 'git' -Hint 'Instale Git'
Assert-DevCommand -Name 'docker' -Hint 'Instale Docker Desktop com Compose plugin'

Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', 'version')
Write-DevOk 'Docker Compose disponível'

Ensure-ProjectEnvFiles -ProjectRoot $root
Write-DevOk 'Arquivos .env locais alinhados com exemplos oficiais'

if ($InstallLocalToolchains) {
  Assert-DevCommand -Name 'node' -Hint 'Instale Node.js LTS'
  Assert-DevCommand -Name 'npm' -Hint 'npm deve acompanhar o Node.js instalado'
  Assert-DevCommand -Name 'python' -Hint 'Instale Python 3.11+'

  Ensure-NodeDependencies -ProjectRoot $root
  Ensure-PythonVenv -ProjectRoot $root
  Write-DevOk 'Dependências locais opcionais instaladas (modo híbrido).'
} else {
  Write-DevStep 'Modo Docker-first: sem instalação obrigatória de node_modules/venv local.'
}

$compose = Get-OfficialComposeFile -ProjectRoot $root
Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $compose, 'config', '--quiet')
Write-DevOk ('Compose válido: {0}' -f $compose)

Write-Host ''
Write-DevOk 'Setup concluído. Próximo passo: scripts/dev-start.ps1'
