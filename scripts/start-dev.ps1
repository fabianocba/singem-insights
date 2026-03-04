[CmdletBinding()]
param(
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev',
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$SshHost = 'srv1401818.hstgr.cloud',
  [int]$SshPort = 2222,
  [int]$DbLocalPort = 5433,
  [int]$DbRemotePort = 5432,
  [int]$BackendPort = 3000,
  [int]$FrontendPort = 8000,
  [switch]$SkipGitSync,
  [switch]$SkipInstall,
  [switch]$NoAutoRepairTunnel,
  [switch]$ForceInstall
)

$devUpPath = Join-Path $PSScriptRoot 'dev-up.ps1'
if (-not (Test-Path -LiteralPath $devUpPath)) {
  Write-Host '[ERR] scripts\dev-up.ps1 não encontrado.' -ForegroundColor Red
  exit 1
}

$forwardArgs = @{
  Action = 'up'
  Branch = $Branch
  ProjectRoot = $ProjectRoot
  SshHost = $SshHost
  SshPort = $SshPort
  DbLocalPort = $DbLocalPort
  DbRemotePort = $DbRemotePort
  BackendPort = $BackendPort
  FrontendPort = $FrontendPort
  SkipGitSync = $SkipGitSync
  SkipInstall = $SkipInstall
  NoAutoRepairTunnel = $NoAutoRepairTunnel
  ForceInstall = $ForceInstall
}

& $devUpPath @forwardArgs

exit $LASTEXITCODE






