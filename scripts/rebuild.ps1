#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = ''
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root
$envFile = Get-ComposeEnvFile -ComposeFile $compose

Write-DevTitle 'SINGEM REBUILD (DOCKER)'
Stop-ComposeConflicts -ProjectRoot $root -CurrentCompose $compose
Remove-SingemContainerConflicts

Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('down', '--remove-orphans')) -AllowFailure
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('build', '--no-cache', '--pull'))
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('up', '-d', '--remove-orphans'))
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('ps'))

Write-DevOk 'Rebuild concluído com sucesso.'
