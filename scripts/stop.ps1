#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = ''
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root
$envFile = Get-ComposeEnvFile -ComposeFile $compose

Write-DevTitle 'SINGEM STOP (DOCKER)'
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('down', '--remove-orphans'))
Write-DevOk 'Serviços parados com sucesso.'
