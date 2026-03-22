#Requires -Version 7.0
<#
.SYNOPSIS
  Auditoria e atualização do ambiente de desenvolvimento SINGEM.
.DESCRIPTION
  Verifica versões instaladas, compara com as últimas disponíveis online e
  pode atualizar automaticamente as dependências do projeto.

  Modos:
    check   — Apenas audita e exibe relatório (padrão)
    update  — Atualiza dependências do projeto (npm, pip, vscode extensions)
    fix     — Tenta corrigir inconsistências e executar update completo

  Alias sugerido (adicione ao $PROFILE):
    Set-Alias ed "$env:SINGEM_ROOT\scripts\env-doctor.ps1"

.EXAMPLE
  pwsh -File .\scripts\env-doctor.ps1
  pwsh -File .\scripts\env-doctor.ps1 -Action update
  pwsh -File .\scripts\env-doctor.ps1 -Action fix -AutoConfirm
#>
[CmdletBinding()]
param(
  [ValidateSet('check', 'update', 'fix')]
  [string]$Action = 'check',

  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),

  # Pula confirmações interativas para uso em CI/automação
  [switch]$AutoConfirm,

  # Não busca versões online (modo offline)
  [switch]$Offline
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'

# ─────────────────────────────────────────────────────────────────────────────
#  CONFIGURAÇÃO
# ─────────────────────────────────────────────────────────────────────────────
$script:ProjectRoot  = [System.IO.Path]::GetFullPath($ProjectRoot)
$script:LogDir       = Join-Path $script:ProjectRoot 'logs'
$script:LogFile      = Join-Path $script:LogDir 'env-check.log'
$script:StartTime    = Get-Date
$script:TotalOk      = 0
$script:TotalWarn    = 0
$script:TotalErr     = 0
$script:Suggestions  = [System.Collections.Generic.List[string]]::new()

# ─────────────────────────────────────────────────────────────────────────────
#  INICIALIZAÇÃO DO LOG
# ─────────────────────────────────────────────────────────────────────────────
function Initialize-Log {
  if (-not (Test-Path -LiteralPath $script:LogDir)) {
    $null = New-Item -ItemType Directory -Path $script:LogDir -Force
  }
  $header = @(
    '=' * 70
    "  SINGEM env-doctor  |  Action: $Action  |  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    '=' * 70
    ''
  )
  $header | Out-File -FilePath $script:LogFile -Encoding UTF8 -Append
}

function Write-Log {
  param([string]$Message)
  $ts = Get-Date -Format 'HH:mm:ss'
  "[$ts] $Message" | Out-File -FilePath $script:LogFile -Encoding UTF8 -Append
}

# ─────────────────────────────────────────────────────────────────────────────
#  HELPERS DE OUTPUT
# ─────────────────────────────────────────────────────────────────────────────
function Write-Banner {
  param([string]$Text)
  $line = '─' * 68
  Write-Host ''
  Write-Host $line -ForegroundColor DarkCyan
  Write-Host "  $Text" -ForegroundColor Cyan
  Write-Host $line -ForegroundColor DarkCyan
}

function Write-Section {
  param([string]$Text)
  Write-Host ''
  Write-Host "  ▶ $Text" -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Text)
  Write-Host "  [OK]   $Text" -ForegroundColor Green
  Write-Log "[OK]   $Text"
}

function Write-WarnMsg {
  param([string]$Text)
  Write-Host "  [WARN] $Text" -ForegroundColor Yellow
  Write-Log "[WARN] $Text"
  $script:TotalWarn++
}

function Write-ErrMsg {
  param([string]$Text)
  Write-Host "  [ERR]  $Text" -ForegroundColor Red
  Write-Log "[ERR]  $Text"
  $script:TotalErr++
}

function Write-Info {
  param([string]$Text)
  Write-Host "  [INFO] $Text" -ForegroundColor DarkGray
  Write-Log "[INFO] $Text"
}

function Write-Step {
  param([string]$Text)
  Write-Host "  [....] $Text" -ForegroundColor DarkCyan
  Write-Log "[STEP] $Text"
}

function Add-Suggestion {
  param([string]$Text)
  $script:Suggestions.Add($Text)
}

# ─────────────────────────────────────────────────────────────────────────────
#  UTILITÁRIOS
# ─────────────────────────────────────────────────────────────────────────────

# Executa comando e retorna stdout; retorna $null se falhar (fail-safe)
function Invoke-SafeCommand {
  param([string]$Cmd, [string[]]$CmdArgs = @())
  try {
    $result = & $Cmd @CmdArgs 2>$null
    if ($null -ne $result) {
      return ($result | Out-String).Trim()
    }
    return $null
  } catch {
    return $null
  }
}

# Extrai somente o número de versão semver de uma string
function Get-SemVer {
  param([string]$Raw)
  if ([string]::IsNullOrWhiteSpace($Raw)) { return $null }
  if ($Raw -match '(\d+\.\d+\.\d+)') { return $Matches[1] }
  if ($Raw -match '(\d+\.\d+)')       { return $Matches[1] }
  return $null
}

# Compara duas strings semver; retorna $true se $Latest > $Current
function Test-IsOutdated {
  param([string]$Current, [string]$Latest)
  if ([string]::IsNullOrWhiteSpace($Current) -or [string]::IsNullOrWhiteSpace($Latest)) {
    return $false
  }
  try {
    $c = [Version]$Current
    $l = [Version]$Latest
    return $l -gt $c
  } catch {
    return $Current -ne $Latest
  }
}

# Busca a versão mais recente via GitHub Releases API
function Get-LatestFromGitHub {
  param([string]$Repo)  # formato: 'owner/repo'
  if ($Offline) { return $null }
  try {
    $url  = "https://api.github.com/repos/$Repo/releases/latest"
    $resp = Invoke-RestMethod -Uri $url -TimeoutSec 8 -ErrorAction Stop `
              -Headers @{ 'User-Agent' = 'SINGEM-env-doctor/1.0' }
    $tag  = $resp.tag_name -replace '^v', ''
    return (Get-SemVer $tag)
  } catch {
    return $null
  }
}

# Busca versão de pacote npm no registry
function Get-LatestFromNpm {
  param([string]$Package)
  if ($Offline) { return $null }
  try {
    $raw = Invoke-SafeCommand 'npm' @('view', $Package, 'version', '--prefer-online', '--silent')
    return (Get-SemVer $raw)
  } catch {
    return $null
  }
}

# Linha de relatório formatada
function Write-ReportRow {
  param(
    [string]$Tool,
    [string]$Current,
    [string]$Latest,
    [string]$Status   # OK | OUTDATED | NOT_FOUND | UNKNOWN
  )

  $toolCol    = $Tool.PadRight(22)
  $currCol    = ([string]::IsNullOrWhiteSpace($Current) ? '—' : $Current).PadRight(16)
  $latestCol  = ([string]::IsNullOrWhiteSpace($Latest)  ? '—' : $Latest).PadRight(16)

  switch ($Status) {
    'OK'        {
      Write-Host ("  {0}{1}{2}{3}" -f $toolCol, $currCol, $latestCol, 'OK') -ForegroundColor Green
      $script:TotalOk++
      Write-Log "ROW | $toolCol $currCol $latestCol OK"
    }
    'OUTDATED'  {
      Write-Host ("  {0}{1}{2}{3}" -f $toolCol, $currCol, $latestCol, 'DESATUALIZADO') -ForegroundColor Yellow
      $script:TotalWarn++
      Write-Log "ROW | $toolCol $currCol $latestCol DESATUALIZADO"
    }
    'NOT_FOUND' {
      Write-Host ("  {0}{1}{2}{3}" -f $toolCol, $currCol, $latestCol, 'NÃO ENCONTRADO') -ForegroundColor Red
      $script:TotalErr++
      Write-Log "ROW | $toolCol $currCol $latestCol NAO_ENCONTRADO"
    }
    default     {
      Write-Host ("  {0}{1}{2}{3}" -f $toolCol, $currCol, $latestCol, 'DESCONHECIDO') -ForegroundColor DarkGray
      Write-Log "ROW | $toolCol $currCol $latestCol DESCONHECIDO"
    }
  }
}

# ─────────────────────────────────────────────────────────────────────────────
#  VERIFICAÇÕES INDIVIDUAIS
# ─────────────────────────────────────────────────────────────────────────────

function Test-NodeJS {
  try {
    $raw = Invoke-SafeCommand 'node' @('--version')
    $current = Get-SemVer $raw
    if (-not $current) {
      Write-ReportRow 'Node.js' $null $null 'NOT_FOUND'
      Add-Suggestion 'Instale o Node.js LTS: https://nodejs.org ou via nvm'
      return
    }

    $latest = Get-LatestFromGitHub 'nodejs/node'
    # GitHub node latest pode retornar pre-release — usa npm dist-tags como fallback
    if (-not $latest -and -not $Offline) {
      try {
        $nodeIndex = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json' -TimeoutSec 8 -ErrorAction Stop
        $lts       = $nodeIndex | Where-Object { $_.lts } | Select-Object -First 1
        if ($null -ne $lts) { $latest = Get-SemVer $lts.version }
      } catch { }
    }

    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'Node.js' $current $latest $status
    if ($status -eq 'OUTDATED') {
      Add-Suggestion "Atualize o Node.js: nvm install $latest && nvm use $latest"
    }
  } catch {
    Write-ReportRow 'Node.js' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-NodeJS: $($_.Exception.Message)"
  }
}

function Test-Npm {
  try {
    $raw = Invoke-SafeCommand 'npm' @('--version')
    $current = Get-SemVer $raw
    if (-not $current) {
      Write-ReportRow 'npm' $null $null 'NOT_FOUND'
      Add-Suggestion 'npm deve ser instalado junto com o Node.js'
      return
    }

    $latest = Get-LatestFromNpm 'npm'
    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'npm' $current $latest $status
    if ($status -eq 'OUTDATED') {
      Add-Suggestion "Atualize o npm: npm install -g npm@latest"
    }
  } catch {
    Write-ReportRow 'npm' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-Npm: $($_.Exception.Message)"
  }
}

function Test-Python {
  try {
    # Tenta python3 depois python
    $raw = Invoke-SafeCommand 'python3' @('--version')
    if (-not $raw) { $raw = Invoke-SafeCommand 'python' @('--version') }
    $current = Get-SemVer $raw
    if (-not $current) {
      Write-ReportRow 'Python' $null $null 'NOT_FOUND'
      Add-Suggestion 'Instale o Python 3.x: https://python.org ou via winget install Python.Python.3'
      return
    }

    $latest = $null
    if (-not $Offline) {
      try {
        # PyPI não publica Python. Usa GitHub cpython
        $releases = Invoke-RestMethod -Uri 'https://api.github.com/repos/python/cpython/releases?per_page=10' `
                     -TimeoutSec 8 -ErrorAction Stop `
                     -Headers @{ 'User-Agent' = 'SINGEM-env-doctor/1.0' }
        $stable   = $releases | Where-Object { -not $_.prerelease } | Select-Object -First 1
        if ($null -ne $stable) { $latest = Get-SemVer $stable.tag_name }
      } catch { }
    }

    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'Python' $current $latest $status
    if ($status -eq 'OUTDATED') {
      Add-Suggestion "Atualize o Python: winget upgrade Python.Python.3"
    }
  } catch {
    Write-ReportRow 'Python' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-Python: $($_.Exception.Message)"
  }
}

function Test-Pip {
  try {
    $raw = Invoke-SafeCommand 'pip' @('--version')
    if (-not $raw) { $raw = Invoke-SafeCommand 'pip3' @('--version') }
    $current = Get-SemVer $raw
    if (-not $current) {
      Write-ReportRow 'pip' $null $null 'NOT_FOUND'
      Add-Suggestion 'Instale pip: python -m ensurepip --upgrade'
      return
    }

    $latest = $null
    if (-not $Offline) {
      try {
        $resp   = Invoke-RestMethod -Uri 'https://pypi.org/pypi/pip/json' -TimeoutSec 8 -ErrorAction Stop
        $latest = $resp.info.version
      } catch { }
    }

    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'pip' $current $latest $status
    if ($status -eq 'OUTDATED') {
      Add-Suggestion "Atualize pip: python -m pip install --upgrade pip"
    }
  } catch {
    Write-ReportRow 'pip' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-Pip: $($_.Exception.Message)"
  }
}

function Test-PowerShell {
  try {
    $current = $PSVersionTable.PSVersion.ToString()
    $clean   = Get-SemVer $current

    $latest = Get-LatestFromGitHub 'PowerShell/PowerShell'
    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $clean $latest) { 'OUTDATED' }
              else                                    { 'OK'       }

    Write-ReportRow 'PowerShell' $current $latest $status
    if ($status -eq 'OUTDATED') {
      Add-Suggestion "Atualize o PowerShell: winget upgrade Microsoft.PowerShell"
    }
  } catch {
    Write-ReportRow 'PowerShell' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-PowerShell: $($_.Exception.Message)"
  }
}

function Test-Git {
  try {
    $raw = Invoke-SafeCommand 'git' @('--version')
    $current = Get-SemVer $raw
    if (-not $current) {
      Write-ReportRow 'Git' $null $null 'NOT_FOUND'
      Add-Suggestion 'Instale o Git: https://git-scm.com ou winget install Git.Git'
      return
    }

    $latest = Get-LatestFromGitHub 'git-for-windows/git'
    # Limpa sufixos como '.windows.1'
    if ($latest) { $latest = ($latest -split '\.windows')[0] }

    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'Git' $current $latest $status
    if ($status -eq 'OUTDATED') {
      Add-Suggestion "Atualize o Git: winget upgrade Git.Git"
    }
  } catch {
    Write-ReportRow 'Git' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-Git: $($_.Exception.Message)"
  }
}

function Test-Docker {
  try {
    $raw = Invoke-SafeCommand 'docker' @('--version')
    $current = Get-SemVer $raw
    if (-not $current) {
      Write-ReportRow 'Docker' $null $null 'NOT_FOUND'
      Add-Suggestion 'Instale o Docker Desktop: https://docs.docker.com/desktop/'
      return
    }

    $latest = $null
    if (-not $Offline) {
      try {
        $rel    = Invoke-RestMethod -Uri 'https://api.github.com/repos/moby/moby/releases/latest' `
                    -TimeoutSec 8 -ErrorAction Stop `
                    -Headers @{ 'User-Agent' = 'SINGEM-env-doctor/1.0' }
        $latest = Get-SemVer $rel.tag_name
      } catch { }
    }

    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'Docker' $current $latest $status
    if ($status -eq 'OUTDATED') {
      Add-Suggestion "Atualize o Docker Desktop manualmente: https://docs.docker.com/desktop/release-notes/"
    }
  } catch {
    Write-ReportRow 'Docker' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-Docker: $($_.Exception.Message)"
  }
}

function Test-DockerCompose {
  try {
    $raw = Invoke-SafeCommand 'docker' @('compose', 'version')
    $current = Get-SemVer $raw
    if (-not $current) {
      # Tenta docker-compose legado
      $rawLegacy = Invoke-SafeCommand 'docker-compose' @('--version')
      $current   = Get-SemVer $rawLegacy
      if (-not $current) {
        Write-ReportRow 'Docker Compose' $null $null 'NOT_FOUND'
        Add-Suggestion 'Docker Compose v2 vem integrado ao Docker Desktop'
        return
      }
    }

    $latest = Get-LatestFromGitHub 'docker/compose'
    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'Docker Compose' $current $latest $status
  } catch {
    Write-ReportRow 'Docker Compose' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-DockerCompose: $($_.Exception.Message)"
  }
}

function Test-VSCode {
  try {
    $raw = Invoke-SafeCommand 'code' @('--version')
    $current = Get-SemVer $raw
    if (-not $current) {
      Write-ReportRow 'VS Code' $null $null 'NOT_FOUND'
      Add-Suggestion "VS Code não encontrado no PATH — verifique a instalação"
      return
    }

    $latest = $null
    if (-not $Offline) {
      try {
        $rel    = Invoke-RestMethod -Uri 'https://api.github.com/repos/microsoft/vscode/releases/latest' `
                    -TimeoutSec 8 -ErrorAction Stop `
                    -Headers @{ 'User-Agent' = 'SINGEM-env-doctor/1.0' }
        $latest = Get-SemVer $rel.tag_name
      } catch { }
    }

    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'VS Code' $current $latest $status
    if ($status -eq 'OUTDATED') {
      Add-Suggestion "Atualize o VS Code: Help > Check for Updates ou winget upgrade Microsoft.VisualStudioCode"
    }
  } catch {
    Write-ReportRow 'VS Code' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-VSCode: $($_.Exception.Message)"
  }
}

function Test-Nvm {
  try {
    $raw     = Invoke-SafeCommand 'nvm' @('version')
    if (-not $raw) { $raw = Invoke-SafeCommand 'nvm' @('--version') }
    $current = Get-SemVer $raw
    if (-not $current) {
      Write-ReportRow 'nvm' '(não instalado)' '—' 'UNKNOWN'
      Add-Suggestion 'nvm não encontrado — instale de: https://github.com/coreybutler/nvm-windows'
      return
    }

    $latest = Get-LatestFromGitHub 'coreybutler/nvm-windows'
    $status = if (-not $latest)                       { 'UNKNOWN'  }
              elseif (Test-IsOutdated $current $latest) { 'OUTDATED' }
              else                                      { 'OK'       }

    Write-ReportRow 'nvm' $current $latest $status
  } catch {
    Write-ReportRow 'nvm' '?' $null 'UNKNOWN'
    Write-Log "[ERR] Test-Nvm: $($_.Exception.Message)"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
#  RELATÓRIO DE DEPENDÊNCIAS DO PROJETO
# ─────────────────────────────────────────────────────────────────────────────

function Show-ProjectDependencies {
  Write-Section 'Dependências do Projeto (package.json)'

  $pkgPath = Join-Path $script:ProjectRoot 'package.json'
  if (-not (Test-Path -LiteralPath $pkgPath)) {
    Write-WarnMsg "package.json não encontrado em: $pkgPath"
    return
  }

  try {
    $outdated = Invoke-SafeCommand 'npm' @('outdated', '--json', '--prefix', $script:ProjectRoot)
    if (-not $outdated -or $outdated -eq '{}') {
      Write-Ok 'Todas as dependências npm estão atualizadas'
      return
    }

    $parsed = ConvertFrom-Json $outdated -AsHashtable -ErrorAction Stop
    foreach ($pkg in $parsed.Keys) {
      $info = $parsed[$pkg]
      Write-WarnMsg ("npm: $pkg — atual: $($info.current ?? '—')  última: $($info.latest ?? '—')")
    }
    Add-Suggestion "Atualize as dependências npm: cd '$($script:ProjectRoot)' && npm update"
  } catch {
    Write-Info "Não foi possível verificar dependências npm outdated: $($_.Exception.Message)"
  }
}

function Show-PythonDependencies {
  Write-Section 'Dependências Python (singem-ai/requirements.txt)'

  $reqPath = Join-Path $script:ProjectRoot 'singem-ai' 'requirements.txt'
  if (-not (Test-Path -LiteralPath $reqPath)) {
    Write-Info 'requirements.txt não encontrado — pulando'
    return
  }

  if ($Offline) {
    Write-Info 'Modo offline — verificação de pacotes Python pulada'
    return
  }

  try {
    $cmd = if (Get-Command 'pip3' -ErrorAction SilentlyContinue) { 'pip3' } else { 'pip' }
    $raw = Invoke-SafeCommand $cmd @('list', '--outdated', '--format=json')
    if (-not $raw -or $raw -eq '[]') {
      Write-Ok 'Todos os pacotes Python estão atualizados'
      return
    }

    $pkgs = ConvertFrom-Json $raw -ErrorAction Stop
    foreach ($pkg in $pkgs) {
      Write-WarnMsg ("pip: $($pkg.name) — atual: $($pkg.version)  última: $($pkg.latest_version)")
    }

    if ($pkgs.Count -gt 0) {
      Add-Suggestion "Atualize pacotes Python: pip install --upgrade -r '$reqPath'"
    }
  } catch {
    Write-Info "Não foi possível verificar pacotes Python outdated: $($_.Exception.Message)"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
#  AÇÕES DE ATUALIZAÇÃO
# ─────────────────────────────────────────────────────────────────────────────

function Confirm-Action {
  param([string]$Message)
  if ($AutoConfirm) { return $true }
  Write-Host ''
  $r = Read-Host "  $Message [S/N]"
  return ($r -match '^[Ss]')
}

function Update-NpmGlobal {
  Write-Step 'Atualizando npm (global)...'
  try {
    & npm install -g npm@latest 2>&1 | ForEach-Object { Write-Info $_ }
    Write-Ok 'npm global atualizado'
  } catch {
    Write-ErrMsg "Falha ao atualizar npm: $($_.Exception.Message)"
  }
}

function Update-NodeViaNvm {
  if (-not (Get-Command 'nvm' -ErrorAction SilentlyContinue)) {
    Write-Info 'nvm não disponível — pulando atualização do Node'
    return
  }

  Write-Step 'Buscando versão LTS do Node via nvm...'
  try {
    & nvm install 'lts' 2>&1 | ForEach-Object { Write-Info $_ }
    & nvm use 'lts' 2>&1    | ForEach-Object { Write-Info $_ }
    Write-Ok 'Node.js LTS ativado via nvm'
  } catch {
    Write-WarnMsg "Falha ao atualizar Node via nvm: $($_.Exception.Message)"
  }
}

function Update-NpmDependencies {
  Write-Step "Atualizando dependências npm do projeto..."
  $pkgPath = Join-Path $script:ProjectRoot 'package.json'
  if (-not (Test-Path -LiteralPath $pkgPath)) {
    Write-WarnMsg 'package.json não encontrado — pulando'
    return
  }

  try {
    Push-Location $script:ProjectRoot
    & npm update 2>&1 | ForEach-Object { Write-Info $_ }
    Write-Ok 'Dependências npm atualizadas'
  } catch {
    Write-ErrMsg "Falha ao atualizar dependências npm: $($_.Exception.Message)"
  } finally {
    Pop-Location
  }
}

function Update-PipGlobal {
  Write-Step 'Atualizando pip...'
  try {
    $py = if (Get-Command 'python3' -ErrorAction SilentlyContinue) { 'python3' } else { 'python' }
    & $py -m pip install --upgrade pip 2>&1 | ForEach-Object { Write-Info $_ }
    Write-Ok 'pip atualizado'
  } catch {
    Write-WarnMsg "Falha ao atualizar pip: $($_.Exception.Message)"
  }
}

function Update-PythonDependencies {
  $reqPath = Join-Path $script:ProjectRoot 'singem-ai' 'requirements.txt'
  if (-not (Test-Path -LiteralPath $reqPath)) {
    Write-Info 'requirements.txt não encontrado — pulando'
    return
  }

  Write-Step "Atualizando dependências Python (singem-ai)..."
  try {
    $pip = if (Get-Command 'pip3' -ErrorAction SilentlyContinue) { 'pip3' } else { 'pip' }
    & $pip install --upgrade -r $reqPath 2>&1 | ForEach-Object { Write-Info $_ }
    Write-Ok 'Dependências Python atualizadas'
  } catch {
    Write-ErrMsg "Falha ao atualizar dependências Python: $($_.Exception.Message)"
  }
}

function Update-VSCodeExtensions {
  if (-not (Get-Command 'code' -ErrorAction SilentlyContinue)) {
    Write-Info 'VS Code CLI não disponível — pulando extensões'
    return
  }

  Write-Step 'Atualizando extensões do VS Code...'
  try {
    & code --update-extensions 2>&1 | ForEach-Object { Write-Info $_ }
    Write-Ok 'Extensões VS Code atualizadas'
  } catch {
    Write-WarnMsg "Falha ao atualizar extensões VS Code: $($_.Exception.Message)"
  }
}

function Update-FrontendDependencies {
  Write-Step 'Verificando integridade do frontend (npm ci check)...'
  $pkgLock = Join-Path $script:ProjectRoot 'package-lock.json'
  if (-not (Test-Path -LiteralPath $pkgLock)) {
    Write-Info 'package-lock.json não encontrado — executando npm install'
    try {
      Push-Location $script:ProjectRoot
      & npm install 2>&1 | ForEach-Object { Write-Info $_ }
      Write-Ok 'npm install executado com sucesso'
    } catch {
      Write-ErrMsg "Falha no npm install: $($_.Exception.Message)"
    } finally {
      Pop-Location
    }
  } else {
    Write-Ok 'package-lock.json presente — projeto íntegro'
  }
}

# ─────────────────────────────────────────────────────────────────────────────
#  DIAGNÓSTICO DE SEGURANÇA
# ─────────────────────────────────────────────────────────────────────────────

function Show-SecurityAudit {
  Write-Section 'Auditoria de Segurança (npm audit)'

  if (-not (Get-Command 'npm' -ErrorAction SilentlyContinue)) {
    Write-Info 'npm não disponível — pulando auditoria'
    return
  }

  try {
    $raw = Invoke-SafeCommand 'npm' @('audit', '--json', '--prefix', $script:ProjectRoot)
    if (-not $raw) {
      Write-Info 'Não foi possível obter dados do npm audit'
      return
    }

    $data = ConvertFrom-Json $raw -ErrorAction Stop
    $meta = $data.metadata
    if ($null -ne $meta) {
      $vulns = $meta.vulnerabilities
      if ($vulns.critical -gt 0) {
        Write-ErrMsg "npm audit: $($vulns.critical) vulnerabilidade(s) CRÍTICA(s)"
        Add-Suggestion "Execute: npm audit fix para corrigir vulnerabilidades"
      } elseif ($vulns.high -gt 0) {
        Write-WarnMsg "npm audit: $($vulns.high) vulnerabilidade(s) HIGH"
        Add-Suggestion "Execute: npm audit fix para corrigir vulnerabilidades HIGH"
      } else {
        Write-Ok 'npm audit: nenhuma vulnerabilidade crítica ou alta encontrada'
      }
    }
  } catch {
    Write-Info "npm audit retornou dados não parseáveis — verifique manualmente com 'npm audit'"
  }
}

# ─────────────────────────────────────────────────────────────────────────────
#  INSTRUÇÃO DE ALIAS
# ─────────────────────────────────────────────────────────────────────────────

function Show-AliasHint {
  Write-Section 'Como configurar o alias "ed"'
  Write-Host ''
  Write-Host '  Adicione ao seu $PROFILE do pwsh (PowerShell 7):' -ForegroundColor DarkGray
  Write-Host ''
  Write-Host ('  function Invoke-SingemEnvDoctor {{ param([Parameter(ValueFromRemainingArguments=$true)][string[]]$Args); & pwsh -NoProfile -ExecutionPolicy Bypass -File "{0}" @Args }}' -f $PSCommandPath) -ForegroundColor White
  Write-Host '  Set-Alias ed Invoke-SingemEnvDoctor -Scope Global -Force' -ForegroundColor White
  Write-Host ''
  Write-Host '  Depois use:  ed          (check)' -ForegroundColor DarkGray
  Write-Host '               ed update   (update)' -ForegroundColor DarkGray
  Write-Host '               ed fix      (fix)' -ForegroundColor DarkGray
}

# ─────────────────────────────────────────────────────────────────────────────
#  SUMÁRIO FINAL
# ─────────────────────────────────────────────────────────────────────────────

function Show-Summary {
  $elapsed = (Get-Date) - $script:StartTime
  $ms      = [int]$elapsed.TotalMilliseconds

  Write-Host ''
  Write-Host ('─' * 68) -ForegroundColor DarkCyan
  Write-Host ''
  Write-Host ('  Resumo:') -ForegroundColor White
  Write-Host ("    OK         : {0}" -f $script:TotalOk)   -ForegroundColor Green
  Write-Host ("    Avisos     : {0}" -f $script:TotalWarn)  -ForegroundColor Yellow
  Write-Host ("    Erros      : {0}" -f $script:TotalErr)   -ForegroundColor Red
  Write-Host ("    Tempo total: {0} ms" -f $ms)             -ForegroundColor DarkGray
  Write-Host ("    Log salvo  : {0}" -f $script:LogFile)    -ForegroundColor DarkGray

  if ($script:Suggestions.Count -gt 0) {
    Write-Host ''
    Write-Host '  Sugestões:' -ForegroundColor Cyan
    foreach ($s in $script:Suggestions) {
      Write-Host "    → $s" -ForegroundColor Yellow
    }
  }

  Write-Host ''
  Write-Host ('─' * 68) -ForegroundColor DarkCyan
  Write-Host ''

  Write-Log "SUMMARY | OK=$($script:TotalOk) WARN=$($script:TotalWarn) ERR=$($script:TotalErr) TIME=${ms}ms"
}

# ─────────────────────────────────────────────────────────────────────────────
#  FLOWS PRINCIPAIS
# ─────────────────────────────────────────────────────────────────────────────

function Invoke-Check {
  # Cabeçalho da tabela
  Write-Section 'Verificação do Ambiente'
  Write-Host ''
  Write-Host ('  {0}{1}{2}{3}' -f 'Ferramenta'.PadRight(22), 'Versão Atual'.PadRight(16), 'Última Versão'.PadRight(16), 'Status') -ForegroundColor White
  Write-Host ('  ' + '─' * 62) -ForegroundColor DarkGray

  Test-NodeJS
  Test-Npm
  Test-Nvm
  Test-Python
  Test-Pip
  Test-PowerShell
  Test-Git
  Test-Docker
  Test-DockerCompose
  Test-VSCode

  Show-ProjectDependencies
  Show-PythonDependencies
  Show-SecurityAudit
}

function Invoke-Update {
  Write-Section 'Modo UPDATE — Atualizando dependências do projeto'

  if (-not (Confirm-Action "Deseja atualizar as dependências do projeto SINGEM?")) {
    Write-Info 'Atualização cancelada pelo usuário'
    return
  }

  Update-NpmGlobal
  Update-PipGlobal
  Update-NpmDependencies
  Update-PythonDependencies
  Update-FrontendDependencies
  Update-VSCodeExtensions
}

function Invoke-Fix {
  Write-Section 'Modo FIX — Verificação + Atualização completa'

  # Primeiro faz check para identificar problemas
  Invoke-Check

  Write-Host ''
  Write-Host '  Fix irá:' -ForegroundColor Cyan
  Write-Host '    1. Atualizar npm global'        -ForegroundColor DarkGray
  Write-Host '    2. Atualizar Node via nvm (se disponível)' -ForegroundColor DarkGray
  Write-Host '    3. Atualizar dependências npm do projeto' -ForegroundColor DarkGray
  Write-Host '    4. Atualizar pip'               -ForegroundColor DarkGray
  Write-Host '    5. Atualizar dependências Python' -ForegroundColor DarkGray
  Write-Host '    6. Atualizar extensões VS Code' -ForegroundColor DarkGray

  if (-not (Confirm-Action "Deseja executar o fix completo?")) {
    Write-Info 'Fix cancelado pelo usuário'
    return
  }

  Update-NpmGlobal
  Update-NodeViaNvm
  Update-NpmDependencies
  Update-PipGlobal
  Update-PythonDependencies
  Update-FrontendDependencies
  Update-VSCodeExtensions
}

# ─────────────────────────────────────────────────────────────────────────────
#  PONTO DE ENTRADA
# ─────────────────────────────────────────────────────────────────────────────

[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding           = [System.Text.UTF8Encoding]::new($false)
try { & chcp.com 65001 *> $null } catch { }

Initialize-Log

Write-Banner "SINGEM env-doctor  |  Modo: $($Action.ToUpper())  |  $(Get-Date -Format 'dd/MM/yyyy HH:mm')"

if ($Offline) {
  Write-WarnMsg 'Modo OFFLINE ativo — versões mais recentes não serão buscadas'
}

switch ($Action) {
  'check'  { Invoke-Check }
  'update' { Invoke-Check; Write-Host ''; Invoke-Update }
  'fix'    { Invoke-Fix }
}

Show-Summary
Show-AliasHint

exit 0
