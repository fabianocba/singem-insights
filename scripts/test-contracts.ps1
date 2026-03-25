#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [int]$HealthTimeoutSeconds = 180,
  [int]$HealthPollSeconds = 3
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$serverDir = Join-Path $root 'server'
$startedByThisScript = $false

function Test-BackendHealth {
  try {
    $response = Invoke-WebRequest -Uri 'http://127.0.0.1:3000/health' -Method Get -TimeoutSec 3 -UseBasicParsing
    return $response.StatusCode -eq 200
  } catch {
    return $false
  }
}

function Wait-BackendHealth {
  param(
    [int]$TimeoutSeconds,
    [int]$PollSeconds
  )

  $elapsed = 0
  while ($elapsed -lt $TimeoutSeconds) {
    if (Test-BackendHealth) {
      return $true
    }

    Start-Sleep -Seconds $PollSeconds
    $elapsed += $PollSeconds
  }

  return $false
}

Write-DevTitle 'SINGEM TEST CONTRACTS'

if (-not (Test-BackendHealth)) {
  Write-DevStep 'Backend indisponivel. Iniciando stack oficial de desenvolvimento...'
  Invoke-DevCommand -FilePath 'pwsh' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'start.ps1'), '-ProjectRoot', $root)
  $startedByThisScript = $true

  Write-DevStep 'Aguardando backend ficar saudavel para executar contratos...'
  if (-not (Wait-BackendHealth -TimeoutSeconds $HealthTimeoutSeconds -PollSeconds $HealthPollSeconds)) {
    throw ("Backend nao ficou saudavel em {0}s." -f $HealthTimeoutSeconds)
  }
}

try {
  Write-DevStep 'Executando contratos do backend...'
  & npm.cmd --prefix $serverDir run test:contracts
  if ($LASTEXITCODE -ne 0) {
    throw ("Falha ao executar testes de contrato (exit code {0})." -f $LASTEXITCODE)
  }
  Write-DevOk 'Testes de contrato executados com sucesso.'
} finally {
  if ($startedByThisScript) {
    Write-DevStep 'Encerrando stack iniciada por este runner...'
    Invoke-DevCommand -FilePath 'pwsh' -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $PSScriptRoot 'stop.ps1'), '-ProjectRoot', $root) -AllowFailure
  }
}
