[CmdletBinding()]
param(
  [string]$ProjectRoot = 'C:\SINGEM',
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev'
)

$targetScript = Join-Path $PSScriptRoot 'scripts\util\setup-pwsh-alias.ps1'
 $fallbackScript = Join-Path $PSScriptRoot 'scripts\util\enable-sigem-alias.ps1'
if (-not (Test-Path -LiteralPath $targetScript)) {
  throw "Script não encontrado: $targetScript"
}

& $targetScript -ProjectRoot $ProjectRoot -Branch $Branch
if ($LASTEXITCODE -eq 0) {
  exit 0
}

if (-not (Test-Path -LiteralPath $fallbackScript)) {
  exit $LASTEXITCODE
}

Write-Host '[WARN] Persistência indisponível neste ambiente. Aplicando fallback na sessão atual...' -ForegroundColor Yellow
. $fallbackScript -ProjectRoot $ProjectRoot -Branch $Branch
exit 0
