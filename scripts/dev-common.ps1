#Requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-DevTitle {
  param([string]$Text)
  Write-Host ''
  Write-Host ('=== {0} ===' -f $Text) -ForegroundColor Cyan
}

function Write-DevStep {
  param([string]$Text)
  Write-Host ('[STEP] {0}' -f $Text) -ForegroundColor Cyan
}

function Write-DevOk {
  param([string]$Text)
  Write-Host ('[OK] {0}' -f $Text) -ForegroundColor Green
}

function Write-DevWarn {
  param([string]$Text)
  Write-Host ('[WARN] {0}' -f $Text) -ForegroundColor Yellow
}

function Write-DevErr {
  param([string]$Text)
  Write-Host ('[ERR] {0}' -f $Text) -ForegroundColor Red
}

function Resolve-DevProjectRoot {
  param(
    [string]$ProjectRoot,
    [string]$ScriptRoot
  )

  if (-not [string]::IsNullOrWhiteSpace($ProjectRoot)) {
    return [System.IO.Path]::GetFullPath($ProjectRoot)
  }

  if (-not [string]::IsNullOrWhiteSpace($env:SINGEM_ROOT)) {
    return [System.IO.Path]::GetFullPath($env:SINGEM_ROOT)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $ScriptRoot '..'))
}

function Get-OfficialComposeFile {
  param([string]$ProjectRoot)

  $preferred = Join-Path $ProjectRoot 'docker\local\docker-compose.yml'
  $fallback = Join-Path $ProjectRoot 'docker-compose.yml'

  if (Test-Path -LiteralPath $preferred) {
    return $preferred
  }

  if (Test-Path -LiteralPath $fallback) {
    Write-DevWarn 'Usando compose legado na raiz (docker-compose.yml).'
    return $fallback
  }

  throw 'Nenhum docker-compose oficial encontrado.'
}

function Test-DevCommand {
  param([string]$Name)

  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Assert-DevCommand {
  param(
    [string]$Name,
    [string]$Hint
  )

  if (-not (Test-DevCommand -Name $Name)) {
    throw ("Comando obrigatório ausente: {0}. {1}" -f $Name, $Hint)
  }
}

function Invoke-DevCommand {
  param(
    [Parameter(Mandatory = $true)]
    [string]$FilePath,

    [string[]]$ArgumentList = @(),

    [string]$WorkingDirectory,

    [switch]$AllowFailure
  )

  $previous = $null
  if (-not [string]::IsNullOrWhiteSpace($WorkingDirectory)) {
    $previous = Get-Location
    Set-Location $WorkingDirectory
  }

  try {
    & $FilePath @ArgumentList
    if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
      throw ("Falha ao executar: {0} {1}" -f $FilePath, ($ArgumentList -join ' '))
    }
  } finally {
    if ($null -ne $previous) {
      Set-Location $previous
    }
  }
}

function Invoke-DevCompose {
  param(
    [string]$ProjectRoot,
    [string[]]$ComposeArgs
  )

  $composeFile = Get-OfficialComposeFile -ProjectRoot $ProjectRoot
  Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $composeFile) + $ComposeArgs
}

function Stop-ComposeConflicts {
  param(
    [string]$ProjectRoot,
    [string]$CurrentCompose
  )

  $knownComposeFiles = @(
    (Join-Path $ProjectRoot 'docker\local\docker-compose.yml'),
    (Join-Path $ProjectRoot 'docker-compose.yml')
  ) | Select-Object -Unique

  foreach ($composeFile in $knownComposeFiles) {
    if (-not (Test-Path -LiteralPath $composeFile)) {
      continue
    }

    if ($composeFile -eq $CurrentCompose) {
      continue
    }

    Write-DevStep ("Encerrando stack potencialmente conflitante: {0}" -f $composeFile)
    Invoke-DevCommand -FilePath 'docker' -ArgumentList @('compose', '-f', $composeFile, 'down', '--remove-orphans') -AllowFailure
  }
}

function Remove-SingemContainerConflicts {
  foreach ($container in @('singem-postgres', 'singem-redis', 'singem-backend', 'singem-frontend', 'singem-ai-core')) {
    Invoke-DevCommand -FilePath 'docker' -ArgumentList @('rm', '-f', $container) -AllowFailure
  }

  Invoke-DevCommand -FilePath 'docker' -ArgumentList @('network', 'rm', 'singem-network') -AllowFailure
}

function Ensure-EnvFile {
  param(
    [string]$TargetPath,
    [string]$ExamplePath
  )

  if (Test-Path -LiteralPath $TargetPath) {
    return
  }

  if (-not (Test-Path -LiteralPath $ExamplePath)) {
    throw ("Arquivo de exemplo não encontrado: {0}" -f $ExamplePath)
  }

  Copy-Item -LiteralPath $ExamplePath -Destination $TargetPath -Force
  Write-DevWarn ("Criado arquivo local: {0}" -f $TargetPath)
}

function Ensure-ProjectEnvFiles {
  param([string]$ProjectRoot)

  Ensure-EnvFile -TargetPath (Join-Path $ProjectRoot '.env') -ExamplePath (Join-Path $ProjectRoot '.env.example')
  Ensure-EnvFile -TargetPath (Join-Path $ProjectRoot 'server\.env') -ExamplePath (Join-Path $ProjectRoot 'server\.env.example')
  Ensure-EnvFile -TargetPath (Join-Path $ProjectRoot 'singem-ai\.env') -ExamplePath (Join-Path $ProjectRoot 'singem-ai\.env.example')
  Ensure-EnvFile -TargetPath (Join-Path $ProjectRoot 'docker\local\.env') -ExamplePath (Join-Path $ProjectRoot 'docker\local\.env.example')
}

function Remove-PathIfExists {
  param([string]$PathToRemove)

  if (Test-Path -LiteralPath $PathToRemove) {
    Remove-Item -LiteralPath $PathToRemove -Recurse -Force -ErrorAction SilentlyContinue
    Write-DevOk ("Removido: {0}" -f $PathToRemove)
  }
}

function Get-GitSyncSummary {
  param([string]$ProjectRoot)

  $result = [ordered]@{
    branch = 'unknown'
    ahead = 0
    behind = 0
    dirty = $false
  }

  try {
    $branch = (& git -C $ProjectRoot rev-parse --abbrev-ref HEAD).Trim()
    $result.branch = $branch

    $dirty = (& git -C $ProjectRoot status --porcelain)
    $result.dirty = -not [string]::IsNullOrWhiteSpace(($dirty -join ''))

    & git -C $ProjectRoot fetch origin --prune | Out-Null

    $counts = (& git -C $ProjectRoot rev-list --left-right --count "origin/$branch...$branch").Trim() -split '\s+'
    if ($counts.Count -ge 2) {
      $result.behind = [int]$counts[0]
      $result.ahead = [int]$counts[1]
    }
  } catch {
    Write-DevWarn ('Não foi possível avaliar sincronismo Git: {0}' -f $_.Exception.Message)
  }

  return $result
}
