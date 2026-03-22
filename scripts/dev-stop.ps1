#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = ''
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root

Write-DevTitle 'SINGEM DEV STOP'
Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $compose, 'down', '--remove-orphans')
Write-DevOk 'Serviços parados com limpeza segura de execução.'
