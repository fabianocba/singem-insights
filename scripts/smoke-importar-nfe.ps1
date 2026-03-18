param(
    [string]$PageUrl = 'http://localhost:8000/config/importar-nfe.html',
    [switch]$UseRealBackend,
    [switch]$AllowWrite,
    [string]$AuthToken = $env:SINGEM_SMOKE_TOKEN,
    [string]$ApiBaseUrl = $env:SINGEM_SMOKE_API_BASE,
    [string]$Login = $env:SINGEM_SMOKE_LOGIN,
    [string]$Password = $env:SINGEM_SMOKE_PASSWORD,
    [string]$StorageStatePath = $env:SINGEM_SMOKE_STORAGE_STATE,
    [string]$BrowserPath
)

$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$runnerPath = Join-Path $scriptRoot 'smoke-importar-nfe.cjs'
$tempDir = Join-Path $env:TEMP 'singem-playwright-smoke'
$packageJson = Join-Path $tempDir 'package.json'
$nodeModules = Join-Path $tempDir 'node_modules'
$playwrightModule = Join-Path $nodeModules 'playwright-core'

New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

Push-Location $tempDir
try {
    if (-not (Test-Path $packageJson)) {
        npm init -y | Out-Null
    }

    if (-not (Test-Path $playwrightModule)) {
        npm install playwright-core --no-package-lock --no-save
    }
}
finally {
    Pop-Location
}

$previousNodePath = $env:NODE_PATH
$env:NODE_PATH = $nodeModules

$nodeArgs = @($runnerPath, '--base-url', $PageUrl)

if ($UseRealBackend) {
    $nodeArgs += '--real-backend'
}

if ($AllowWrite) {
    $nodeArgs += '--allow-write'
}

if ($BrowserPath) {
    $nodeArgs += '--browser'
    $nodeArgs += $BrowserPath
}

if ($AuthToken) {
    $nodeArgs += '--auth-token'
    $nodeArgs += $AuthToken
}

if ($ApiBaseUrl) {
    $nodeArgs += '--api-base-url'
    $nodeArgs += $ApiBaseUrl
}

if ($Login) {
    $nodeArgs += '--login'
    $nodeArgs += $Login
}

if ($Password) {
    $nodeArgs += '--password'
    $nodeArgs += $Password
}

if ($StorageStatePath) {
    $nodeArgs += '--storage-state'
    $nodeArgs += $StorageStatePath
}

try {
    & node @nodeArgs
    exit $LASTEXITCODE
}
finally {
    $env:NODE_PATH = $previousNodePath
}
