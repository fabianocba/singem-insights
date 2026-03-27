#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [ValidateSet('auto', 'patch', 'minor', 'major')]
  [string]$Bump = 'auto'
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$versionFile = Join-Path $root 'version.json'

if (-not (Test-Path -LiteralPath $versionFile)) {
  throw "Arquivo não encontrado: $versionFile"
}

$data = Get-Content -LiteralPath $versionFile -Raw | ConvertFrom-Json
$version = [string]$data.version
$channel = [string]$data.channel

if ($version -notmatch '^(\d+)\.(\d+)\.(\d+)$') {
  throw "Version inválida em version.json: $version"
}

$major = [int]$Matches[1]
$minor = [int]$Matches[2]
$patch = [int]$Matches[3]

$effectiveBump = $Bump
if ($effectiveBump -eq 'auto') {
  if ($channel -eq 'main') {
    $effectiveBump = 'minor'
  } else {
    $effectiveBump = 'patch'
  }
}

switch ($effectiveBump) {
  'major' {
    $major += 1
    $minor = 0
    $patch = 0
  }
  'minor' {
    $minor += 1
    $patch = 0
  }
  'patch' {
    $patch += 1
  }
}

$now = (Get-Date).ToUniversalTime()
$newVersion = "$major.$minor.$patch"
$data.version = $newVersion
$data.build = $now.ToString('yyyyMMdd-HHmm')
$data.buildTimestamp = $now.ToString('o')

$data | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $versionFile -Encoding UTF8
Write-Host "[OK] version.json atualizado para $newVersion ($effectiveBump)" -ForegroundColor Green

# Sincronizar o FALLBACK em js/core/version.js com os novos valores
$jsVersionPath = Join-Path $root 'js' 'core' 'version.js'
if (Test-Path -LiteralPath $jsVersionPath) {
  $jsContent = Get-Content -LiteralPath $jsVersionPath -Raw
  $newFallback = "const FALLBACK = Object.freeze({`n  name: '$($data.name)',`n  version: '$newVersion',`n  build: '$($data.build)',`n  buildTimestamp: '$($data.buildTimestamp)'`n});"
  $pattern = 'const FALLBACK = Object\.freeze\(\{[\s\S]*?\}\);'
  $updated = [regex]::Replace($jsContent, $pattern, $newFallback)
  if ($updated -ne $jsContent) {
    [System.IO.File]::WriteAllText($jsVersionPath, $updated, [System.Text.Encoding]::UTF8)
    Write-Host "[OK] js/core/version.js FALLBACK sincronizado → $newVersion ($($data.build))" -ForegroundColor Green
  } else {
    Write-Warning "[AVISO] Não foi possível localizar FALLBACK em js/core/version.js — atualize manualmente."
  }
} else {
  Write-Warning "[AVISO] Arquivo não encontrado: $jsVersionPath"
}

# Sincronizar package.json e server/package.json
foreach ($pkgRelPath in @('package.json', 'server/package.json')) {
  $pkgPath = Join-Path $root $pkgRelPath
  if (Test-Path -LiteralPath $pkgPath) {
    $pkg = Get-Content -LiteralPath $pkgPath -Raw | ConvertFrom-Json
    if ([string]$pkg.version -ne $newVersion) {
      $pkg.version = $newVersion
      $pkg | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $pkgPath -Encoding UTF8
      Write-Host "[OK] $pkgRelPath → $newVersion" -ForegroundColor Green
    }
  }
}
