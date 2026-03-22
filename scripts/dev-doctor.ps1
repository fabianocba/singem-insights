#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = ''
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root

Write-DevTitle 'SINGEM DEV DOCTOR'

$checks = @()

function Add-Check {
  param([string]$Name, [bool]$Ok, [string]$Details)
  $script:checks += [pscustomobject]@{ Nome = $Name; Status = $(if ($Ok) { 'OK' } else { 'RISCO' }); Detalhes = $Details }
}

foreach ($cmd in @('pwsh', 'git', 'docker')) {
  Add-Check -Name ("Comando: {0}" -f $cmd) -Ok (Test-DevCommand -Name $cmd) -Details $(if (Test-DevCommand -Name $cmd) { 'disponível' } else { 'ausente' })
}

foreach ($cmd in @('node', 'npm', 'python')) {
  Add-Check -Name ("Comando opcional (modo híbrido): {0}" -f $cmd) -Ok $true -Details $(if (Test-DevCommand -Name $cmd) { 'disponível' } else { 'não instalado (ok em Docker-first)' })
}

$sync = Get-GitSyncSummary -ProjectRoot $root
Add-Check -Name 'Git sincronizado com origin' -Ok (($sync.ahead -eq 0) -and ($sync.behind -eq 0)) -Details ("branch={0}, ahead={1}, behind={2}" -f $sync.branch, $sync.ahead, $sync.behind)
Add-Check -Name 'Git sem alterações locais' -Ok (-not $sync.dirty) -Details $(if ($sync.dirty) { 'working tree suja' } else { 'working tree limpa' })

$envMatrix = @(
  @{ Name = '.env'; Path = (Join-Path $root '.env') },
  @{ Name = 'server/.env'; Path = (Join-Path $root 'server\.env') },
  @{ Name = 'singem-ai/.env'; Path = (Join-Path $root 'singem-ai\.env') }
)

foreach ($item in $envMatrix) {
  Add-Check -Name ("Arquivo {0}" -f $item.Name) -Ok (Test-Path -LiteralPath $item.Path) -Details $item.Path
}

Add-Check -Name 'Script deploy-vps oficial' -Ok (Test-Path -LiteralPath (Join-Path $root 'scripts\deploy-vps.ps1')) -Details (Join-Path $root 'scripts\deploy-vps.ps1')

try {
  Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $compose, 'config', '--quiet')
  Add-Check -Name 'Compose oficial válido' -Ok $true -Details $compose
} catch {
  Add-Check -Name 'Compose oficial válido' -Ok $false -Details $_.Exception.Message
}

try {
  $running = @((& docker compose -f $compose ps --status running --services) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  Add-Check -Name 'Serviços Docker em execução' -Ok ($running.Count -gt 0) -Details ($(if ($running.Count -gt 0) { $running -join ', ' } else { 'nenhum serviço em execução' }))
} catch {
  Add-Check -Name 'Serviços Docker em execução' -Ok $false -Details $_.Exception.Message
}

$legacyArtifacts = @(
  (Join-Path $root 'dist'),
  (Join-Path $root 'build'),
  (Join-Path $root '.next'),
  (Join-Path $root '.cache')
)

$legacyFound = @($legacyArtifacts | Where-Object { Test-Path -LiteralPath $_ })
Add-Check -Name 'Sem artefatos de build legados' -Ok ($legacyFound.Count -eq 0) -Details ($(if ($legacyFound.Count -eq 0) { 'limpo' } else { $legacyFound -join '; ' }))

$checks | Format-Table -AutoSize

$riskCount = @($checks | Where-Object { $_.Status -eq 'RISCO' }).Count
Write-Host ''
if ($riskCount -eq 0) {
  Write-DevOk 'Doctor: ambiente saudável e determinístico.'
  exit 0
}

Write-DevWarn ("Doctor: {0} risco(s) encontrado(s)." -f $riskCount)
Write-Host 'Sugestões rápidas:' -ForegroundColor Yellow
Write-Host '  1) scripts/dev-update.ps1' -ForegroundColor Yellow
Write-Host '  2) scripts/dev-rebuild.ps1' -ForegroundColor Yellow
Write-Host '  3) scripts/dev-reset.ps1 (se persistir legado)' -ForegroundColor Yellow
exit 2
