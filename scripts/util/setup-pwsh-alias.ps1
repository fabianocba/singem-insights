#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
)

$ErrorActionPreference = 'Stop'

$projectRootAbs = [System.IO.Path]::GetFullPath($ProjectRoot)

function Resolve-ProfilePath {
  $candidates = @(
    $PROFILE.CurrentUserCurrentHost,
    (Join-Path $HOME 'PowerShell\Microsoft.PowerShell_profile.ps1'),
    (Join-Path $env:APPDATA 'PowerShell\Microsoft.PowerShell_profile.ps1')
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) }

  foreach ($candidate in $candidates) {
    try {
      $dir = Split-Path -Parent $candidate
      if (-not (Test-Path -LiteralPath $dir)) {
        New-Item -ItemType Directory -Path $dir -Force -ErrorAction Stop | Out-Null
      }

      if (-not (Test-Path -LiteralPath $candidate)) {
        New-Item -ItemType File -Path $candidate -Force -ErrorAction Stop | Out-Null
      }

      return $candidate
    } catch {
      continue
    }
  }

  throw 'Não foi possível resolver/criar um caminho de profile para o PowerShell 7.'
}

$profilePath = Resolve-ProfilePath

$markerStart = '# >>> SINGEM env-doctor alias >>>'
$markerEnd   = '# <<< SINGEM env-doctor alias <<<'

$block = @"
$markerStart
`$env:SINGEM_ROOT = '$projectRootAbs'
function global:Invoke-SingemEnvDoctor {
  param([Parameter(ValueFromRemainingArguments=`$true)][string[]]`$Args)
  & pwsh -NoProfile -ExecutionPolicy Bypass -File (Join-Path `$env:SINGEM_ROOT 'scripts\\env-doctor.ps1') @Args
}
Set-Alias -Name ed -Value Invoke-SingemEnvDoctor -Scope Global -Force
$markerEnd
"@

$current = Get-Content -LiteralPath $profilePath -Raw

$pattern = [regex]::Escape($markerStart) + '[\s\S]*?' + [regex]::Escape($markerEnd)
if ($current -match $pattern) {
  $updated = [regex]::Replace($current, $pattern, [System.Text.RegularExpressions.MatchEvaluator]{ param($m) $block })
  Set-Content -LiteralPath $profilePath -Value $updated -Encoding UTF8
  Write-Host "[OK] Bloco SINGEM atualizado no perfil: $profilePath" -ForegroundColor Green
} else {
  if ($current -and -not $current.EndsWith([Environment]::NewLine)) {
    Add-Content -LiteralPath $profilePath -Value ''
  }
  Add-Content -LiteralPath $profilePath -Value $block
  Write-Host "[OK] Bloco SINGEM adicionado ao perfil: $profilePath" -ForegroundColor Green
}

Write-Host '[OK] Abra um novo terminal pwsh e execute: ed check -Offline' -ForegroundColor Green
