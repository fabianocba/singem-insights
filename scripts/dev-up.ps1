#Requires -Version 7.0
<#
.SYNOPSIS
  Ponto de entrada unificado para o ambiente de desenvolvimento SINGEM.

.DESCRIPTION
  Orquestra ações do ciclo de vida Docker (up, down, setup, rebuild, update,
  reset, doctor) com suporte opcional a troca de branch antes da execução.

.PARAMETER Action
  Ação a executar: up | down | setup | rebuild | update | reset | doctor.

.PARAMETER ProjectRoot
  Raiz do repositório. Usa detecção automática se omitido.

.PARAMETER Branch
  Branch Git para checkout antes da ação. Se omitido, mantém o branch atual.

.PARAMETER NoCache
  Força build sem cache (aplica-se a up e rebuild).

.PARAMETER Pull
  Sempre puxa imagens base mais recentes.

.EXAMPLE
  pwsh -File .\scripts\dev-up.ps1 -Action up -ProjectRoot C:\SINGEM -Branch dev
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('up', 'down', 'setup', 'rebuild', 'update', 'reset', 'doctor')]
  [string]$Action,

  [string]$ProjectRoot = '',

  [string]$Branch = '',

  [switch]$NoCache,
  [switch]$Pull
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot

Write-DevTitle "SINGEM DEV-UP  [$Action]"

# ── Troca de branch (opcional) ─────────────────────────────────────────────
if (-not [string]::IsNullOrWhiteSpace($Branch)) {
  Assert-DevCommand -Name 'git' -Hint 'Instale o Git'

  $currentBranch = (& git -C $root rev-parse --abbrev-ref HEAD).Trim()

  if ($currentBranch -ne $Branch) {
    $dirty = (& git -C $root status --porcelain)
    if (-not [string]::IsNullOrWhiteSpace(($dirty -join ''))) {
      Write-DevWarn 'Working tree sujo. Salvando alterações com git stash...'
      & git -C $root stash push -m "dev-up auto-stash before checkout $Branch"
      if ($LASTEXITCODE -ne 0) { throw 'Falha ao executar git stash.' }
    }

    Write-DevStep "Checkout: $currentBranch -> $Branch"
    & git -C $root checkout $Branch
    if ($LASTEXITCODE -ne 0) { throw "Falha ao fazer checkout do branch '$Branch'." }

    Write-DevStep 'Atualizando branch com origin...'
    & git -C $root pull --ff-only origin $Branch
    if ($LASTEXITCODE -ne 0) {
      Write-DevWarn 'git pull --ff-only falhou. Branch local pode estar divergente.'
    }
  } else {
    Write-DevOk "Já no branch '$Branch'."
  }
}

# ── Despacho da ação ───────────────────────────────────────────────────────
$scriptMap = @{
  up      = 'dev-start.ps1'
  down    = 'dev-stop.ps1'
  setup   = 'dev-setup.ps1'
  rebuild = 'dev-rebuild.ps1'
  update  = 'dev-update.ps1'
  reset   = 'dev-reset.ps1'
  doctor  = 'dev-doctor.ps1'
}

$targetScript = Join-Path $PSScriptRoot $scriptMap[$Action]

if (-not (Test-Path -LiteralPath $targetScript)) {
  throw "Script não encontrado: $targetScript"
}

# Montar argumentos para repasse (hashtable para splatting correto)
$forwardArgs = @{ ProjectRoot = $root }

if ($Action -eq 'up') {
  if ($NoCache)  { $forwardArgs['NoCache'] = $true }
  if ($Pull)     { $forwardArgs['Pull'] = $true }
}

Write-DevStep "Delegando para $($scriptMap[$Action])..."
& $targetScript @forwardArgs

# ── Abrir navegador após ações que levantam o ambiente ─────────────────────
if ($Action -in 'up', 'rebuild', 'update') {
  $frontendUrl = 'http://localhost:8000'
  Write-DevStep "Abrindo navegador em $frontendUrl..."
  Start-Process $frontendUrl
}

Write-Host ''
Write-DevOk "Ação '$Action' concluída com sucesso."
