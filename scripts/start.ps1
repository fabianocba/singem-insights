#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [switch]$NoCache,
  [switch]$Pull
)

. "$PSScriptRoot/dev-common.ps1"

$root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
$compose = Get-OfficialComposeFile -ProjectRoot $root
$envFile = Get-ComposeEnvFile -ComposeFile $compose

$backendHostPort = 3000
try {
  $backendPortLine = Get-Content -LiteralPath $envFile -ErrorAction Stop |
    Where-Object { $_ -match '^\s*BACKEND_PORT_EXTERNAL\s*=.*$' } |
    Select-Object -First 1

  if (-not [string]::IsNullOrWhiteSpace($backendPortLine)) {
    $parts = $backendPortLine -split '=', 2
    if ($parts.Count -eq 2) {
      $rawValue = ($parts[1] ?? '').Trim().Trim('"').Trim("'")
      if ($rawValue -match '^\d+$') {
        $backendHostPort = [int]$rawValue
      }
    }
  }
} catch {
  # Mantem fallback 3000 se o env nao puder ser lido.
}

Write-DevTitle 'SINGEM START (DOCKER)'
Write-DevStep ("Compose: {0}" -f $compose)
Write-DevStep ("Env: {0}" -f $envFile)

Ensure-ProjectEnvFiles -ProjectRoot $root
Write-DevStep 'Regenerando CSS final (tailwind.css) antes do start...'
Invoke-DevCommand -FilePath 'npm' -ArgumentList @('run', 'tailwind:build') -WorkingDirectory $root

Write-DevStep 'Validando consistência de versão (version.json, js/core/version.js, package.json)...'
Invoke-DevCommand -FilePath 'node' -ArgumentList @('scripts/validate-version-sync.js') -WorkingDirectory $root

Ensure-DockerDesktop -TimeoutSeconds 180 -PollSeconds 3
Stop-ComposeConflicts -ProjectRoot $root -CurrentCompose $compose
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('down', '--remove-orphans')) -AllowFailure
Remove-SingemContainerConflicts
Ensure-BackendHostPortAvailable -Port $backendHostPort

if ($NoCache) {
  $buildArgs = @('build', '--no-cache')
  if ($Pull) { $buildArgs += '--pull' }
  Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs $buildArgs)
}

$upTail = @('up', '-d', '--build', '--remove-orphans')
if ($Pull) { $upTail += '--pull=always' }
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs $upTail)
Invoke-DevCommand -FilePath 'docker' -ArgumentList (Get-ComposeArgs -ComposeFile $compose -EnvFile $envFile -TailArgs @('ps'))

Write-DevOk 'Ambiente iniciado com sucesso.'
