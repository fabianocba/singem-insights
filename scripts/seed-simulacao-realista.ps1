param(
  [string]$ProjectRoot = '.',
  [switch]$Apply,
  [string]$DbHost = '127.0.0.1',
  [int]$DbPort = 5432,
  [string]$DbName = 'singem',
  [string]$DbUser = 'adm',
  [string]$DbPassword = 'Singem@12345'
)

$ErrorActionPreference = 'Stop'

$root = Resolve-Path -Path $ProjectRoot
Set-Location $root

if (-not $env:DB_HOST) { $env:DB_HOST = $DbHost }
if (-not $env:DB_PORT) { $env:DB_PORT = "$DbPort" }
if (-not $env:DB_NAME) { $env:DB_NAME = $DbName }
if (-not $env:DB_USER) { $env:DB_USER = $DbUser }
if (-not $env:DB_PASSWORD) { $env:DB_PASSWORD = $DbPassword }
if (-not $env:DATABASE_URL) {
  $encodedPass = [System.Uri]::EscapeDataString($env:DB_PASSWORD)
  $env:DATABASE_URL = "postgresql://$($env:DB_USER):$encodedPass@$($env:DB_HOST):$($env:DB_PORT)/$($env:DB_NAME)"
}

Write-Host '[SINGEM][SEED] Simulacao operacional realista'
Write-Host "[SINGEM][SEED] ProjectRoot: $root"
Write-Host "[SINGEM][SEED] DB: $($env:DB_HOST):$($env:DB_PORT)/$($env:DB_NAME)"

$args = @('scripts/seed-simulacao-realista.js')
if ($Apply) {
  $args += '--apply'
  Write-Host '[SINGEM][SEED] Modo APPLY habilitado.'
}
else {
  Write-Host '[SINGEM][SEED] Modo DRY-RUN (sem escrita). Use -Apply para aplicar.'
}

Push-Location "$root/server"
try {
  & node @args
  if ($LASTEXITCODE -ne 0) {
    throw "Script retornou codigo $LASTEXITCODE"
  }
}
finally {
  Pop-Location
}

Write-Host '[SINGEM][SEED] Execucao concluida.'
