param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$AuthToken = "",
  [switch]$OpenFrontend
)

$ErrorActionPreference = 'Stop'

$projectRoot = Split-Path -Parent $PSScriptRoot
$testFile = Join-Path $projectRoot 'server\tests\almoxarifado.contract.test.js'

if (-not (Test-Path $testFile)) {
  throw "Arquivo de teste não encontrado: $testFile"
}

$resolvedToken = if ([string]::IsNullOrWhiteSpace($AuthToken)) {
  $env:TEST_AUTH_TOKEN
} else {
  $AuthToken
}

$env:TEST_BASE_URL = $BaseUrl
if (-not [string]::IsNullOrWhiteSpace($resolvedToken)) {
  $env:TEST_AUTH_TOKEN = $resolvedToken
}

Write-Host "[almox] Verificando backend local em $BaseUrl ..." -ForegroundColor Cyan

try {
  $health = Invoke-RestMethod -Uri "$BaseUrl/health" -Method Get -TimeoutSec 8
  Write-Host "[almox] Backend respondeu: $($health.status)" -ForegroundColor Green
} catch {
  Write-Error "[almox] Backend indisponível em $BaseUrl. Suba o backend local antes de validar."
  exit 1
}

if ([string]::IsNullOrWhiteSpace($resolvedToken)) {
  Write-Warning "[almox] TEST_AUTH_TOKEN não informado. O teste autenticado será pulado; apenas a checagem de autenticação mínima será executada."
} else {
  Write-Host "[almox] Token de teste detectado. Executando suíte autenticada completa." -ForegroundColor Green
}

Write-Host "[almox] Executando testes de contrato..." -ForegroundColor Cyan
Push-Location $projectRoot

try {
  node --test $testFile
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  Write-Host "[almox] Testes de contrato concluídos com sucesso." -ForegroundColor Green

  if ($OpenFrontend) {
    $frontendUrl = 'http://127.0.0.1:8000/'
    Write-Host "[almox] Abrindo frontend em $frontendUrl" -ForegroundColor Cyan
    Start-Process $frontendUrl | Out-Null
  }

  Write-Host "[almox] Próximo passo manual: entrar no SINGEM e abrir a tela 'Almoxarifado'." -ForegroundColor Yellow
} finally {
  Pop-Location
}
