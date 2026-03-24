#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = ''
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root

Write-DevTitle 'SINGEM DEV REBUILD (limpo e controlado)'
Stop-ComposeConflicts -ProjectRoot $root -CurrentCompose $compose
Remove-SingemContainerConflicts

$downArgs = @('compose', '-f', $compose)
$downArgs += @('down', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $downArgs

$buildArgs = @('compose', '-f', $compose)
$buildArgs += @('build', '--no-cache', '--pull')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $buildArgs

$upArgs = @('compose', '-f', $compose)
$upArgs += @('up', '-d', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $upArgs

Write-DevOk 'Rebuild concluído sem reaproveitamento indevido de cache de imagem.'
