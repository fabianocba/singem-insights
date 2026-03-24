#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [switch]$SkipDockerEnsure,
  [switch]$NoCache,
  [switch]$Pull
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root

Write-DevTitle 'SINGEM DEV START'
Write-DevStep ('Compose oficial: {0}' -f $compose)

Ensure-ProjectEnvFiles -ProjectRoot $root
if (-not $SkipDockerEnsure) {
  Ensure-DockerDesktop -TimeoutSeconds 180 -PollSeconds 3
}
Stop-ComposeConflicts -ProjectRoot $root -CurrentCompose $compose
Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $compose, 'down', '--remove-orphans') -AllowFailure
Remove-SingemContainerConflicts

if ($NoCache) {
  Write-DevStep 'Reconstrução estrita sem cache...'
  $buildArgs = @('compose', '-f', $compose, 'build', '--no-cache')
  if ($Pull) { $buildArgs += '--pull' }
  Invoke-DevCommand -FilePath 'docker' -ArgumentList $buildArgs
}

$upArgs = @('compose', '-f', $compose)
$upArgs += @('up', '-d', '--build', '--remove-orphans')
if ($Pull) {
  $upArgs += '--pull=always'
}

Invoke-DevCommand -FilePath 'docker' -ArgumentList $upArgs
Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $compose, 'ps')

Write-Host ''
Write-DevOk 'Ambiente iniciado com estado atual do repositório.'
