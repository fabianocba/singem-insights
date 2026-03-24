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

function Test-DockerEngineReady {
  $errorText = ''

  try {
    $output = & docker ps --format '{{.ID}}' 2>&1
    if ($LASTEXITCODE -eq 0) {
      return [ordered]@{ Ready = $true; Error = '' }
    }

    $errorText = (($output | Out-String).Trim())
  } catch {
    $errorText = $_.Exception.Message
  }

  return [ordered]@{ Ready = $false; Error = $errorText }
}

function Get-DockerDesktopExecutablePath {
  $candidates = @(
    (Join-Path ${env:ProgramFiles} 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path ${env:ProgramW6432} 'Docker\Docker\Docker Desktop.exe'),
    (Join-Path ${env:LocalAppData} 'Docker\Docker\Docker Desktop.exe'),
    'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  ) | Where-Object { -not [string]::IsNullOrWhiteSpace($_) } | Select-Object -Unique

  foreach ($path in $candidates) {
    if (Test-Path -LiteralPath $path) {
      return $path
    }
  }

  return ''
}

function Test-DockerDesktopProcessRunning {
  try {
    $proc = Get-Process -Name 'Docker Desktop' -ErrorAction SilentlyContinue
    return $null -ne $proc
  } catch {
    return $false
  }
}

function Ensure-DockerDesktop {
  param(
    [int]$TimeoutSeconds = 180,
    [int]$PollSeconds = 3
  )

  Assert-DevCommand -Name 'docker' -Hint 'Instale o Docker Desktop para Windows.'

  $probe = Test-DockerEngineReady
  if ($probe.Ready) {
    Write-DevOk 'Docker Desktop ativo.'
    return
  }

  $firstError = ($probe.Error -replace '\s+', ' ').Trim()
  if (-not [string]::IsNullOrWhiteSpace($firstError)) {
    Write-DevWarn ("Docker indisponivel: {0}" -f $firstError)
  }

  if (Test-DockerDesktopProcessRunning) {
    Write-DevStep 'Docker Desktop ja esta aberto. Aguardando Docker Engine ficar disponivel...'
  } else {
    $dockerDesktopExe = Get-DockerDesktopExecutablePath
    if ([string]::IsNullOrWhiteSpace($dockerDesktopExe)) {
      throw 'Docker Desktop nao encontrado nos caminhos padrao. Instale o Docker Desktop ou ajuste a instalacao.'
    }

    Write-DevStep 'Docker nao esta ativo. Iniciando Docker Desktop...'
    Start-Process -FilePath $dockerDesktopExe | Out-Null
    Write-DevStep 'Aguardando Docker Engine ficar disponivel...'
  }

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  $lastProgressSecond = -1
  $lastError = $firstError

  while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    Start-Sleep -Seconds $PollSeconds
    $probe = Test-DockerEngineReady

    if ($probe.Ready) {
      Write-DevOk 'Docker Desktop ativo.'
      return
    }

    $currentSecond = [int][Math]::Floor($stopwatch.Elapsed.TotalSeconds)
    if ($currentSecond -ge ($lastProgressSecond + 15)) {
      $remaining = [Math]::Max(0, $TimeoutSeconds - $currentSecond)
      Write-DevStep ("Aguardando Docker Engine... ({0}s restantes)" -f $remaining)
      $lastProgressSecond = $currentSecond
    }

    if (-not [string]::IsNullOrWhiteSpace($probe.Error)) {
      $lastError = ($probe.Error -replace '\s+', ' ').Trim()
    }
  }

  $hint = if (-not [string]::IsNullOrWhiteSpace($lastError)) {
    " Ultimo erro: $lastError"
  } else {
    ''
  }

  throw ("Docker Desktop nao ficou pronto em {0}s.{1} Verifique o Docker Desktop e execute novamente." -f $TimeoutSeconds, $hint)
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
