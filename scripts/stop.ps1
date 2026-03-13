[CmdletBinding()]
param(
  [switch]$OnlyStop,
  [switch]$SkipGitPublish,
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev',
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$SshHost = 'srv1401818.hstgr.cloud',
  [int]$SshPort = 2222,
  [int]$DbLocalPort = 5433,
  [int]$DbRemotePort = 5432,
  [int]$BackendPort = 3000,
  [int]$FrontendPort = 8000
)

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
  if ($SkipGitPublish) {
    Write-WarnMsg 'Publicação Git ignorada por parâmetro (-SkipGitPublish).'
    return
  }

  if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-WarnMsg 'Git não encontrado no PATH. Publicação ignorada.'
    return
  }

  $rootPath = [System.IO.Path]::GetFullPath($ProjectRoot)
  if (-not (Test-Path -LiteralPath (Join-Path $rootPath '.git'))) {
    Write-WarnMsg ("Pasta {0} não é um repositório Git. Publicação ignorada." -f $rootPath)
    return
  }

  Push-Location $rootPath
  try {
    Write-Step ("Publicando alterações para origin/{0}" -f $Branch)

    Write-Step 'Limpando artefatos gerados (__pycache__ e *.pyc)'
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
      $commitMessage = "chore(dev): sync stop $stamp"
      git commit -m $commitMessage
      if ($LASTEXITCODE -ne 0) {
        throw 'Falha ao criar commit automático no stop.'
      }
      Write-Ok ("Commit automático criado: {0}" -f $commitMessage)
    } else {
      Write-Ok 'Sem alterações locais para commit.'
    }

    Write-Step ("Sincronizando base remota origin/{0}" -f $Branch)
    git fetch origin $Branch --prune
    if ($LASTEXITCODE -ne 0) {
      throw ("Falha ao executar fetch de origin/{0}." -f $Branch)
    }

    git rebase "origin/$Branch"
    if ($LASTEXITCODE -ne 0) {
      throw ("Falha ao executar rebase com origin/{0}. Resolva conflitos e tente novamente." -f $Branch)
    }

    git push origin "HEAD:$Branch"
    if ($LASTEXITCODE -ne 0) {
      throw ("Falha ao executar push para origin/{0}." -f $Branch)
    }

    Write-Ok ("Publicação concluída em origin/{0}." -f $Branch)
  } finally {
    Pop-Location
  }
}

$devUpPath = Join-Path $PSScriptRoot 'dev-up.ps1'
if (-not (Test-Path -LiteralPath $devUpPath)) {
  Write-Host '[ERR] scripts\dev-up.ps1 não encontrado.' -ForegroundColor Red
  exit 1
}

$forwardArgs = @{
  Action = 'stop'
  Branch = $Branch
  ProjectRoot = $ProjectRoot
  SshHost = $SshHost
  SshPort = $SshPort
  DbLocalPort = $DbLocalPort
  DbRemotePort = $DbRemotePort
  BackendPort = $BackendPort
  FrontendPort = $FrontendPort
}

if ($OnlyStop) {
  & $devUpPath @forwardArgs
  exit $LASTEXITCODE
}

& $devUpPath @forwardArgs
if ($LASTEXITCODE -ne 0) {
  Write-ErrMsg 'Falha ao encerrar serviços. Publicação Git não será executada.'
  exit $LASTEXITCODE
}

Invoke-GitPublish
exit $LASTEXITCODE
