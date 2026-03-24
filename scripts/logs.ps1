#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [string]$Service = '',
  [int]$Tail = 200,
  [switch]$Follow
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root
$envFile = Get-ComposeEnvFile -ComposeFile $compose

Write-DevTitle 'SINGEM LOGS (DOCKER)'

$tailArgs = @('logs', '--tail', [string]$Tail)
if ($Follow) { $tailArgs += '--follow' }
if (-not [string]::IsNullOrWhiteSpace($Service)) { $tailArgs += $Service }

Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs $tailArgs)
