#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = ''
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root

Write-DevTitle 'SINGEM DEV UPDATE'
Stop-ComposeConflicts -ProjectRoot $root -CurrentCompose $compose
Remove-SingemContainerConflicts

$sync = Get-GitSyncSummary -ProjectRoot $root
Write-DevStep ("Git: branch={0} ahead={1} behind={2} dirty={3}" -f $sync.branch, $sync.ahead, $sync.behind, $sync.dirty)

if ($sync.dirty) {
  Write-DevWarn 'Há alterações locais não commitadas. Isso pode divergir do estado oficial do repositório.'
}

Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $compose, 'down', '--remove-orphans') -AllowFailure

Ensure-ProjectEnvFiles -ProjectRoot $root

$buildArgs = @('compose', '-f', $compose)
$buildArgs += @('build', '--pull')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $buildArgs

$upArgs = @('compose', '-f', $compose)
$upArgs += @('up', '-d', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $upArgs

Write-DevOk 'Update concluído. Ambiente local alinhado ao estado atual do projeto.'
