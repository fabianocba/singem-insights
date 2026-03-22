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
Ensure-NodeDependencies -ProjectRoot $root
Ensure-PythonVenv -ProjectRoot $root

Write-DevStep 'Compilando CSS Tailwind a partir do source atual...'
Invoke-DevCommand -FilePath 'npm' -ArgumentList @('run', 'tailwind:build') -WorkingDirectory $root
Write-DevOk 'css/tailwind.css atualizado.'

$buildArgs = @('compose', '-f', $compose)
if ($Profile -ne 'none') {
  $buildArgs += @('--profile', $Profile)
}
$buildArgs += @('build', '--pull')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $buildArgs

$upArgs = @('compose', '-f', $compose)
if ($Profile -ne 'none') {
  $upArgs += @('--profile', $Profile)
}
$upArgs += @('up', '-d', '--remove-orphans')
Invoke-DevCommand -FilePath 'docker' -ArgumentList $upArgs

Write-DevOk 'Update concluído. Ambiente local alinhado ao estado atual do projeto.'
