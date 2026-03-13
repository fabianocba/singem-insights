[CmdletBinding()]
param(
  [switch]$OnlyStop,
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev',
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$RepoUrl = 'https://github.com/fabianocba/SINGEM.git',
  [string]$GitRemote = 'origin',
  [string]$SshHost = 'srv1401818.hstgr.cloud',
  [int]$SshPort = 2222,
  [string]$SshUser = 'root',
  [int]$DbLocalPort = 5433,
  [int]$DbRemotePort = 5432,
  [string]$DbRemoteHost = '127.0.0.1',
  [int]$BackendPort = 3000,
  [int]$FrontendPort = 8000,
  [int]$AiPort = 8010,
  [string]$BackendHealthPath = '/health',
  [switch]$SkipGitSync,
  [switch]$SkipInstall,
  [switch]$NoAutoRepairTunnel,
  [switch]$NoTunnel,
  [switch]$NoOpenBrowser,
  [switch]$ForceInstall,
  [ValidateSet('auto', 'local', 'default')]
  [string]$ProductionEnvProfile = 'auto'
)

$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Text)
  Write-Host ('[STEP] {0}' -f $Text) -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Text)
  Write-Host ('[OK] {0}' -f $Text) -ForegroundColor Green
}

function Write-WarnMsg {
  param([string]$Text)
  Write-Host ('[WARN] {0}' -f $Text) -ForegroundColor Yellow
}

function Write-ErrMsg {
  param([string]$Text)
  Write-Host ('[ERR] {0}' -f $Text) -ForegroundColor Red
}

function Invoke-GitPublish {
  $rootPath = [System.IO.Path]::GetFullPath($ProjectRoot)
  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git não encontrado no PATH.'
  }

  if (-not (Test-Path -LiteralPath (Join-Path $rootPath '.git'))) {
    throw ("Pasta {0} não é um repositório Git válido." -f $rootPath)
  }

  Push-Location $rootPath
  try {
    Write-Step ('Publicando alterações para origin/{0}' -f $Branch)

    Write-Step 'Limpando artefatos Python gerados'
    Get-ChildItem -Path (Join-Path $rootPath 'singem-ai') -Recurse -Directory -Filter '__pycache__' -ErrorAction SilentlyContinue |
      Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
    Get-ChildItem -Path (Join-Path $rootPath 'singem-ai') -Recurse -File -Include '*.pyc' -ErrorAction SilentlyContinue |
      Remove-Item -Force -ErrorAction SilentlyContinue

    git add -A
    if ($LASTEXITCODE -ne 0) {
      throw 'Falha ao adicionar alterações ao stage.'
    }

    $staged = @(git diff --cached --name-only)
    if ($staged.Count -gt 0) {
      $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
      $commitMessage = "chore(dev): stop sync $stamp"
      git commit -m $commitMessage
      if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao criar commit automático no stop.'
      }
      Write-Ok ('Commit automático criado: {0}' -f $commitMessage)
    } else {
      Write-Ok 'Sem alterações locais para commit.'
    }

    git fetch origin $Branch --prune
    if ($LASTEXITCODE -ne 0) {
      throw ('Falha ao executar fetch de origin/{0}.' -f $Branch)
    }

    git rebase "origin/$Branch"
    if ($LASTEXITCODE -ne 0) {
      throw ('Falha ao executar rebase com origin/{0}. Resolva conflitos e tente novamente.' -f $Branch)
    }

    git push origin "HEAD:$Branch"
    if ($LASTEXITCODE -ne 0) {
      throw ('Falha ao executar push para origin/{0}.' -f $Branch)
    }

    Write-Ok ('Publicação concluída em origin/{0}.' -f $Branch)
  } finally {
    Pop-Location
  }
}

$targetScript = Join-Path $PSScriptRoot 'dev-up.ps1'
if (-not (Test-Path -LiteralPath $targetScript)) {
  Write-Host '[ERR] scripts\dev-up.ps1 não encontrado.' -ForegroundColor Red
  exit 1
}

$forwardArgs = @{
  Action = 'stop'
  Branch = $Branch
  ProjectRoot = $ProjectRoot
  RepoUrl = $RepoUrl
  GitRemote = $GitRemote
  SshHost = $SshHost
  SshPort = $SshPort
  SshUser = $SshUser
  DbLocalPort = $DbLocalPort
  DbRemotePort = $DbRemotePort
  DbRemoteHost = $DbRemoteHost
  BackendPort = $BackendPort
  FrontendPort = $FrontendPort
  AiPort = $AiPort
  BackendHealthPath = $BackendHealthPath
  ProductionEnvProfile = $ProductionEnvProfile
}

if ($SkipGitSync) { $forwardArgs.SkipGitSync = $true }
if ($SkipInstall) { $forwardArgs.SkipInstall = $true }
if ($NoAutoRepairTunnel) { $forwardArgs.NoAutoRepairTunnel = $true }
if ($NoTunnel) { $forwardArgs.NoTunnel = $true }
if ($NoOpenBrowser) { $forwardArgs.NoOpenBrowser = $true }
if ($ForceInstall) { $forwardArgs.ForceInstall = $true }

& $targetScript @forwardArgs
if ($LASTEXITCODE -ne 0) {
  Write-ErrMsg 'Falha ao encerrar serviços. Publicação Git não será executada.'
  exit $LASTEXITCODE
}

if ($OnlyStop) {
  Write-WarnMsg 'Parâmetro -OnlyStop mantido por compatibilidade, mas o stop sempre publica em origin/dev.'
}

Invoke-GitPublish
exit $LASTEXITCODE
