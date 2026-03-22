#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [ValidateSet('none', 'ai', 'full')]
  [string]$Profile = 'none'
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root

Write-DevTitle 'SINGEM DEV REBUILD (limpo e controlado)'
Stop-ComposeConflicts -ProjectRoot $root -CurrentCompose $compose
Remove-SingemContainerConflicts

Write-DevStep 'Compilando CSS Tailwind a partir do source atual...'
Invoke-DevCommand -FilePath 'npm' -ArgumentList @('run', 'tailwind:build') -WorkingDirectory $root
Write-DevOk 'css/tailwind.css atualizado.'

$downArgs = @('compose', '-f', $compose)
if ($Profile -ne 'none') {
  $downArgs += @('--profile', $Profile)
}
$downArgs += @('down', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $downArgs

$buildArgs = @('compose', '-f', $compose)
if ($Profile -ne 'none') {
  $buildArgs += @('--profile', $Profile)
}
$buildArgs += @('build', '--no-cache', '--pull')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $buildArgs

$upArgs = @('compose', '-f', $compose)
if ($Profile -ne 'none') {
  $upArgs += @('--profile', $Profile)
}
$upArgs += @('up', '-d', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $upArgs

Write-DevOk 'Rebuild concluído sem reaproveitamento indevido de cache de imagem.'
