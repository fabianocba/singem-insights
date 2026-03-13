[CmdletBinding()]
param(
  [string]$ProjectRoot = 'C:\SINGEM',
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev'
)

$devScript = Join-Path $ProjectRoot 'scripts\dev-up.ps1'
if (-not (Test-Path -LiteralPath $devScript)) {
  throw "Script principal não encontrado: $devScript"
}

function singem {
  param(
    [ValidateSet('setup', 'up', 'stop', 'restart', 'health', 'frontend', 'backend', 'ai', 'tunnel')]
    [string]$Action = 'up'
  )

  pwsh -NoProfile -ExecutionPolicy Bypass -File $devScript -Action $Action -ProjectRoot $ProjectRoot -Branch $Branch
}

Set-Alias su singem
Write-Host '[OK] Alias carregado na sessão atual: singem / su' -ForegroundColor Green
