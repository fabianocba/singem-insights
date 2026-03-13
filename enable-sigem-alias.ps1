[CmdletBinding()]
param(
  [string]$ProjectRoot = 'C:\SINGEM',
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev'
)

$targetScript = Join-Path $PSScriptRoot 'scripts\util\enable-sigem-alias.ps1'
if (-not (Test-Path -LiteralPath $targetScript)) {
  throw "Script não encontrado: $targetScript"
}

. $targetScript -ProjectRoot $ProjectRoot -Branch $Branch
