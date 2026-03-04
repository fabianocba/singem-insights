[CmdletBinding()]
param(
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev'
)

$projectRoot = Split-Path -Parent $PSScriptRoot
$startScript = Join-Path $projectRoot 'scripts\start-dev.ps1'

if (-not (Test-Path -LiteralPath $startScript)) {
  Write-Host '[ERR] scripts\start-dev.ps1 não encontrado.' -ForegroundColor Red
  exit 1
}

& $startScript -Branch $Branch -ProjectRoot $projectRoot
exit $LASTEXITCODE
