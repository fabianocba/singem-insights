#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [switch]$NoCache,
  [switch]$Pull
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root
$envFile = Get-ComposeEnvFile -ComposeFile $compose

Write-DevTitle 'SINGEM START (DOCKER)'
Write-DevStep ("Compose: {0}" -f $compose)
Write-DevStep ("Env: {0}" -f $envFile)

Ensure-ProjectEnvFiles -ProjectRoot $root
Ensure-DockerDesktop -TimeoutSeconds 180 -PollSeconds 3
Stop-ComposeConflicts -ProjectRoot $root -CurrentCompose $compose
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('down', '--remove-orphans')) -AllowFailure
Remove-SingemContainerConflicts

if ($NoCache) {
  $buildArgs = @('build', '--no-cache')
  if ($Pull) { $buildArgs += '--pull' }
  Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs $buildArgs)
}

$upTail = @('up', '-d', '--build', '--remove-orphans')
if ($Pull) { $upTail += '--pull=always' }
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs $upTail)
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('ps'))

Write-DevOk 'Ambiente iniciado com sucesso.'
