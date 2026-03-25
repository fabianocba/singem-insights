#Requires -Version 7.0
[CmdletBinding()]
param(
  [ValidateSet('up', 'down', 'stop', 'rebuild', 'restart')]
  [string]$Action = 'up',
  [string]$ProjectRoot = '',
  [string]$Branch = ''
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontendUrl = 'http://127.0.0.1:8000/'
$frontendHealthUrl = 'http://127.0.0.1:8000/health'

function Wait-FrontendReady {
  param(
    [int]$TimeoutSeconds = 90,
    [int]$PollSeconds = 3
  )

  $elapsed = 0
  while ($elapsed -lt $TimeoutSeconds) {
    try {
      $resp = Invoke-WebRequest -Uri $frontendHealthUrl -Method Get -TimeoutSec 3 -UseBasicParsing
      if ($resp.StatusCode -eq 200) {
        return $true
      }
    } catch {
      # frontend ainda subindo
    }

    Start-Sleep -Seconds $PollSeconds
    $elapsed += $PollSeconds
  }

  return $false
}

function Open-FrontendInBrowser {
  Write-Host '[STEP] Aguardando frontend para abrir navegador...' -ForegroundColor Cyan
  $ready = Wait-FrontendReady

  if (-not $ready) {
    Write-Host '[WARN] Frontend ainda nao respondeu /health no tempo esperado. Abrindo URL mesmo assim.' -ForegroundColor Yellow
  }

  try {
    Start-Process $frontendUrl | Out-Null
    Write-Host ("[OK] Navegador aberto em {0}" -f $frontendUrl) -ForegroundColor Green
  } catch {
    Write-Host ("[WARN] Nao foi possivel abrir navegador automaticamente: {0}" -f $_.Exception.Message) -ForegroundColor Yellow
  }
}

Write-Host '[WARN] scripts/dev-up.ps1 e um wrapper de compatibilidade. Prefira scripts/start.ps1 e scripts/stop.ps1.' -ForegroundColor Yellow

if (-not [string]::IsNullOrWhiteSpace($Branch)) {
  Write-Host ("[INFO] Parametro -Branch recebido ({0}) e ignorado por este wrapper." -f $Branch) -ForegroundColor Cyan
}

switch ($Action) {
  'up' {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptRoot 'start.ps1') -ProjectRoot $ProjectRoot
    if ($LASTEXITCODE -eq 0) {
      Open-FrontendInBrowser
    }
    exit $LASTEXITCODE
  }
  'down' {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptRoot 'stop.ps1') -ProjectRoot $ProjectRoot
    exit $LASTEXITCODE
  }
  'stop' {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptRoot 'stop.ps1') -ProjectRoot $ProjectRoot
    exit $LASTEXITCODE
  }
  'rebuild' {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptRoot 'rebuild.ps1') -ProjectRoot $ProjectRoot
    exit $LASTEXITCODE
  }
  'restart' {
    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptRoot 'stop.ps1') -ProjectRoot $ProjectRoot
    if ($LASTEXITCODE -ne 0) {
      exit $LASTEXITCODE
    }

    & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path $scriptRoot 'start.ps1') -ProjectRoot $ProjectRoot
    if ($LASTEXITCODE -eq 0) {
      Open-FrontendInBrowser
    }
    exit $LASTEXITCODE
  }
}
