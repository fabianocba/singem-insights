[CmdletBinding()]
param(
  [string]$ProjectRoot = 'C:\SINGEM',
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev'
)

$ErrorActionPreference = 'Stop'

$devScript = Join-Path $ProjectRoot 'scripts\dev-up.ps1'
if (-not (Test-Path -LiteralPath $devScript)) {
  throw "Script principal não encontrado: $devScript"
}

$aliasBlock = @"
# >>> SINGEM DEV ALIAS >>>
function singem {
  param(
    [ValidateSet('setup','up','stop','restart','health','frontend','backend','ai','tunnel')]
    [string]
    `$Action = 'up'
  )

  pwsh -NoProfile -ExecutionPolicy Bypass -File '$devScript' -Action `$Action -ProjectRoot '$ProjectRoot' -Branch '$Branch'
}

Set-Alias su singem
# <<< SINGEM DEV ALIAS <<<
"@

$profilePaths = @(
  $PROFILE.CurrentUserCurrentHost,
  $PROFILE.CurrentUserAllHosts,
  (Join-Path (Split-Path $PROFILE.CurrentUserCurrentHost -Parent) 'Microsoft.VSCode_profile.ps1'),
  (Join-Path (Split-Path $PROFILE.CurrentUserCurrentHost -Parent | Split-Path -Parent) 'WindowsPowerShell\\Microsoft.PowerShell_profile.ps1'),
  (Join-Path (Split-Path $PROFILE.CurrentUserCurrentHost -Parent | Split-Path -Parent) 'WindowsPowerShell\\profile.ps1'),
  (Join-Path (Split-Path $PROFILE.CurrentUserCurrentHost -Parent | Split-Path -Parent) 'WindowsPowerShell\\Microsoft.VSCode_profile.ps1')
) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

$pattern = '(?s)# >>> SINGEM DEV ALIAS >>>.*?# <<< SINGEM DEV ALIAS <<<\r?\n?'

$updated = @()
$failed = @()

foreach ($profilePath in $profilePaths) {
  try {
    $dir = Split-Path -Parent $profilePath
    if (-not [string]::IsNullOrWhiteSpace($dir) -and -not (Test-Path -LiteralPath $dir)) {
      New-Item -ItemType Directory -Path $dir -Force -ErrorAction Stop | Out-Null
    }

    if (-not (Test-Path -LiteralPath $profilePath)) {
      New-Item -ItemType File -Path $profilePath -Force -ErrorAction Stop | Out-Null
    }

    $content = Get-Content -LiteralPath $profilePath -Raw -ErrorAction SilentlyContinue
    if ($null -eq $content) {
      $content = ''
    }

    $cleanContent = [regex]::Replace($content, $pattern, '')
    $cleanContent = $cleanContent.TrimEnd()
    if ($cleanContent.Length -gt 0) {
      $cleanContent += "`r`n`r`n"
    }

    $newContent = $cleanContent + $aliasBlock + "`r`n"
    Set-Content -LiteralPath $profilePath -Value $newContent -Encoding UTF8 -ErrorAction Stop
    $updated += $profilePath
    Write-Host ("[OK] Alias atualizado em: {0}" -f $profilePath) -ForegroundColor Green
  } catch {
    $failed += [pscustomobject]@{ path = $profilePath; error = $_.Exception.Message }
    Write-Host ("[WARN] Não foi possível atualizar {0}: {1}" -f $profilePath, $_.Exception.Message) -ForegroundColor Yellow
  }
}

if ($updated.Count -eq 0) {
  Write-Host '[WARN] Nenhum profile pôde ser atualizado automaticamente neste ambiente.' -ForegroundColor Yellow
  Write-Host '[WARN] Fallback: carregue o alias na sessão atual com:' -ForegroundColor Yellow
  Write-Host ("       . '{0}'" -f (Join-Path $PSScriptRoot 'enable-sigem-alias.ps1')) -ForegroundColor Yellow
  exit 1
}

Write-Host '[OK] Finalizado. Abra um novo terminal para carregar automaticamente o alias.' -ForegroundColor Green
