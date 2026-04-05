#Requires -Version 7.0
[CmdletBinding()]
param(
  [string]$ProjectRoot = '',
  [string]$KeyPath = '',
  [switch]$SkipHealthcheck
)

. "$PSScriptRoot/dev-common.ps1"

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-DeployTitle {
  param([string]$Text)
  Write-Host ''
  Write-Host ('=== {0} ===' -f $Text) -ForegroundColor Cyan
}

function Write-DeployStep {
  param([string]$Text)
  Write-Host ('[STEP] {0}' -f $Text) -ForegroundColor Cyan
}

function Write-DeployOk {
  param([string]$Text)
  Write-Host ('[OK] {0}' -f $Text) -ForegroundColor Green
}

function Write-DeployError {
  param([string]$Text)
  Write-Host ('[ERROR] {0}' -f $Text) -ForegroundColor Red
}

function Get-FirstNonEmptyValue {
  param([string[]]$Candidates)

  foreach ($candidate in $Candidates) {
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate.Trim()
    }
  }

  return ''
}

function Get-JsonConfigValue {
  param(
    [string]$FilePath,
    [string[]]$PropertyPath
  )

  if (-not (Test-Path -LiteralPath $FilePath)) {
    return ''
  }

  try {
    $content = Get-Content -LiteralPath $FilePath -Raw | ConvertFrom-Json -Depth 16
  } catch {
    return ''
  }

  $current = $content
  foreach ($segment in $PropertyPath) {
    if ($null -eq $current) {
      return ''
    }

    $property = $current.PSObject.Properties[$segment]
    if ($null -eq $property) {
      return ''
    }

    $current = $property.Value
  }

  if ($null -eq $current) {
    return ''
  }

  $text = [string]$current
  if ([string]::IsNullOrWhiteSpace($text)) {
    return ''
  }

  return $text.Trim()
}

function Normalize-RemoteLinuxPath {
  param([string]$Path)

  if ([string]::IsNullOrWhiteSpace($Path)) {
    return ''
  }

  $normalized = $Path.Trim()
  if ($normalized -match '^[A-Za-z]:[\\/]') {
    return ''
  }

  $normalized = $normalized -replace '\\', '/'
  $normalized = $normalized -replace '/+', '/'

  if ($Path.Trim().StartsWith('\')) {
    $normalized = '/' + $normalized.TrimStart('/')
  } elseif ($normalized -match '^(opt|root|var|srv|home)(/|$)') {
    $normalized = '/' + $normalized.TrimStart('/')
  }

  if (-not $normalized.StartsWith('/')) {
    return ''
  }

  if ($normalized.Length -gt 1) {
    $normalized = $normalized.TrimEnd('/')
  }

  return $normalized
}

function Get-LinuxParentPath {
  param([string]$Path)

  $normalized = Normalize-RemoteLinuxPath -Path $Path
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return ''
  }

  if ($normalized -eq '/') {
    return '/'
  }

  $parent = $normalized -replace '/[^/]+/?$', ''
  if ([string]::IsNullOrWhiteSpace($parent)) {
    return '/'
  }

  return $parent
}

function Add-RemoteCandidate {
  param(
    [System.Collections.Generic.List[string]]$List,
    [string]$Value
  )

  $normalized = Normalize-RemoteLinuxPath -Path $Value
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    return
  }

  if (-not $List.Contains($normalized)) {
    [void]$List.Add($normalized)
  }
}

function Get-DeployProjectDirCandidates {
  param([string]$Root)

  $candidates = New-Object 'System.Collections.Generic.List[string]'

  foreach ($value in @(
    $env:SINGEM_REMOTE_PROJECT_DIR,
    $env:SINGEM_REMOTE_PATH,
    $env:REMOTE_PROJECT_PATH,
    $env:PROJECT_DIR
  )) {
    Add-RemoteCandidate -List $candidates -Value $value
  }

  $sessionFile = Join-Path $Root '.dev-session.json'
  foreach ($value in @(
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('remoteProjectDir')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('projectDir')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('remotePath')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('tunnel', 'remoteProjectDir')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('tunnel', 'projectDir')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('tunnel', 'remotePath'))
  )) {
    Add-RemoteCandidate -List $candidates -Value $value
  }

  $ecosystemFile = Join-Path $Root 'server\ecosystem.config.js'
  if (Test-Path -LiteralPath $ecosystemFile) {
    $ecosystemContent = Get-Content -LiteralPath $ecosystemFile -Raw
    $cwdMatch = [regex]::Match($ecosystemContent, 'cwd:\s*[''\"](?<cwd>/[^''\"]+)[''\"]')
    if ($cwdMatch.Success) {
      $projectDir = Get-LinuxParentPath -Path $cwdMatch.Groups['cwd'].Value.Trim()
      Add-RemoteCandidate -List $candidates -Value $projectDir
    }
  }

  $readmeFile = Join-Path $Root 'README.md'
  if (Test-Path -LiteralPath $readmeFile) {
    $readmeContent = Get-Content -LiteralPath $readmeFile -Raw
    $runtimeMatch = [regex]::Match($readmeContent, '(?<path>/[^\s`"'']+/runtime/version\.json)')
    if ($runtimeMatch.Success) {
      $runtimeFile = Normalize-RemoteLinuxPath -Path $runtimeMatch.Groups['path'].Value.Trim()
      $runtimeDir = Get-LinuxParentPath -Path $runtimeFile
      $projectDir = Get-LinuxParentPath -Path $runtimeDir
      Add-RemoteCandidate -List $candidates -Value $projectDir
    }
  }

  $workflowFile = Join-Path $Root '.github\workflows\deploy.yml'
  if (Test-Path -LiteralPath $workflowFile) {
    $workflowContent = Get-Content -LiteralPath $workflowFile -Raw
    foreach ($match in [regex]::Matches($workflowContent, '(?m)^\s*cd\s+(?<path>/[^\r\n]+)\s*$')) {
      Add-RemoteCandidate -List $candidates -Value $match.Groups['path'].Value.Trim()
    }
  }

  $auditFile = Join-Path $Root 'scripts\vps-docker-audit.ps1'
  if (Test-Path -LiteralPath $auditFile) {
    $auditContent = Get-Content -LiteralPath $auditFile -Raw
    $projectDirMatch = [regex]::Match($auditContent, 'ProjectDir\s*=\s*[''\"](?<path>/[^''\"]+)[''\"]')
    if ($projectDirMatch.Success) {
      Add-RemoteCandidate -List $candidates -Value $projectDirMatch.Groups['path'].Value.Trim()
    }
  }

  foreach ($fallback in @('/opt/singem', '/root/SINGEM', '/var/www/singem', '/var/www/singem-staging', '/srv/singem', '/home/singem')) {
    Add-RemoteCandidate -List $candidates -Value $fallback
  }

  return $candidates.ToArray()
}

function Resolve-SshPort {
  param([string[]]$Candidates)

  foreach ($candidate in $Candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) {
      continue
    }

    $parsedPort = 0
    if ([int]::TryParse($candidate.Trim(), [ref]$parsedPort) -and $parsedPort -gt 0) {
      return $parsedPort
    }
  }

  return 22
}

function Resolve-ExistingKeyPath {
  param([string]$PreferredKeyPath)

  foreach ($candidate in @(
    $PreferredKeyPath,
    $env:SINGEM_SSH_KEY_PATH,
    $env:SSH_KEY_PATH,
    (Join-Path $env:USERPROFILE '.ssh\id_ed25519'),
    (Join-Path $env:USERPROFILE '.ssh\id_rsa')
  )) {
    if ([string]::IsNullOrWhiteSpace($candidate)) {
      continue
    }

    if (Test-Path -LiteralPath $candidate) {
      return $candidate
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($PreferredKeyPath) -and (-not (Test-Path -LiteralPath $PreferredKeyPath))) {
    throw ('Arquivo de chave SSH não encontrado: {0}' -f $PreferredKeyPath)
  }

  return ''
}

function Get-LocalGitOriginUrl {
  param([string]$Root)

  $gitConfigPath = Join-Path $Root '.git\config'
  if (-not (Test-Path -LiteralPath $gitConfigPath)) {
    return ''
  }

  $gitConfigContent = Get-Content -LiteralPath $gitConfigPath -Raw
  $originMatch = [regex]::Match($gitConfigContent, '(?ms)^\[remote\s+"origin"\]\s+.*?^\s*url\s*=\s*(?<url>.+?)\s*$')
  if ($originMatch.Success) {
    return $originMatch.Groups['url'].Value.Trim()
  }

  return ''
}

function Resolve-DeployTarget {
  param(
    [string]$Root,
    [string]$PreferredKeyPath
  )

  $sessionFile = Join-Path $Root '.dev-session.json'
  $projectCandidates = Get-DeployProjectDirCandidates -Root $Root

  $sshHost = Get-FirstNonEmptyValue -Candidates @(
    $env:SINGEM_SSH_HOST,
    $env:SSH_HOST,
    $env:HOST,
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('sshHost')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('remoteHost')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('tunnel', 'sshHost')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('tunnel', 'remoteHost'))
  )

  $sshUser = Get-FirstNonEmptyValue -Candidates @(
    $env:SINGEM_SSH_USER,
    $env:SSH_USER,
    $env:DEPLOY_USER,
    $env:USER,
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('sshUser')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('tunnel', 'sshUser'))
  )

  $sshPort = Resolve-SshPort -Candidates @(
    $env:SINGEM_SSH_PORT,
    $env:SSH_PORT,
    $env:PORT,
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('sshPort')),
    (Get-JsonConfigValue -FilePath $sessionFile -PropertyPath @('tunnel', 'sshPort'))
  )

  if ([string]::IsNullOrWhiteSpace($sshHost)) {
    throw 'HOST da VPS não encontrado. Defina SINGEM_SSH_HOST, SSH_HOST, HOST ou configure .dev-session.json com tunnel.sshHost.'
  }

  if ([string]::IsNullOrWhiteSpace($sshUser)) {
    throw 'Usuário SSH não encontrado. Defina SINGEM_SSH_USER, SSH_USER, USER ou configure .dev-session.json com tunnel.sshUser.'
  }

  return [pscustomobject]@{
    SshHost = $sshHost
    SshUser = $sshUser
    SshPort = $sshPort
    PreferredProjectDir = if ($projectCandidates.Count -gt 0) { $projectCandidates[0] } else { '/opt/singem' }
    ProjectDirCandidates = $projectCandidates
    GitOriginUrl = Get-LocalGitOriginUrl -Root $Root
    KeyPath = Resolve-ExistingKeyPath -PreferredKeyPath $PreferredKeyPath
  }
}

function ConvertTo-BashSingleQuotedValue {
  param([string]$Value)

  return $Value.Replace("'", "'\''")
}

function New-RemoteDeployScript {
  param(
    [string]$PreferredProjectDir,
    [string[]]$ProjectDirCandidates,
    [string]$GitOriginUrl,
    [switch]$SkipRemoteHealthcheck
  )

  $candidateValues = @($ProjectDirCandidates)
  if ($candidateValues.Count -eq 0) {
    $candidateValues = @($PreferredProjectDir)
  }

  $bashCandidateArray = ($candidateValues | ForEach-Object {
    "'{0}'" -f (ConvertTo-BashSingleQuotedValue -Value $_)
  }) -join ' '
  $bashPreferredProjectDir = ConvertTo-BashSingleQuotedValue -Value $PreferredProjectDir
  $bashGitOriginUrl = ConvertTo-BashSingleQuotedValue -Value $GitOriginUrl

  $remoteScript = @'
set -euo pipefail

log_step() {
  printf '[STEP] %s\n' "$1"
}

log_ok() {
  printf '[OK] %s\n' "$1"
}

log_error() {
  printf '[ERROR] %s\n' "$1" >&2
}

fail() {
  log_error "$1"
  exit 1
}

canonical_dir() {
  if command -v readlink >/dev/null 2>&1; then
    readlink -f "$1" 2>/dev/null && return 0
  fi

  (
    cd "$1" >/dev/null 2>&1 && pwd -P
  )
}

has_project_markers() {
  local candidate="$1"
  [ -d "$candidate/.git" ] || { [ -f "$candidate/package.json" ] && [ -d "$candidate/server" ]; }
}

find_remote_project_dir() {
  local compose_file=''
  local candidate=''
  local resolved=''
  local configured_candidates=(__REMOTE_PROJECT_CANDIDATES__)

  # Corrigido: a descoberta do diretório remoto usa apenas paths Linux e busca real na VPS.
  printf '[STEP] %s\n' 'Procurando diretório remoto...' >&2

  for candidate in "${configured_candidates[@]}"; do
    [ -n "$candidate" ] || continue

    if [ -f "$candidate/docker/prod/docker-compose.prod.yml" ] && has_project_markers "$candidate"; then
      resolved="$(canonical_dir "$candidate")"
      [ -n "$resolved" ] || resolved="$candidate"
      printf '%s\n' "$resolved"
      return 0
    fi
  done

  while IFS= read -r compose_file; do
    [ -n "$compose_file" ] || continue

    candidate="${compose_file%/docker/prod/docker-compose.prod.yml}"
    if has_project_markers "$candidate"; then
      resolved="$(canonical_dir "$candidate")"
      [ -n "$resolved" ] || resolved="$candidate"
      printf '%s\n' "$resolved"
      return 0
    fi
  done < <(find /root /opt /var/www /srv /home -type f -path '*/docker/prod/docker-compose.prod.yml' 2>/dev/null)
  return 1
}

bootstrap_remote_project_dir() {
  local preferred_dir='__PREFERRED_PROJECT_DIR__'
  local repo_url='__GIT_ORIGIN_URL__'
  local parent_dir=''
  local resolved=''

  [ -n "$repo_url" ] || fail 'URL do remote origin local não encontrada para bootstrap remoto.'

  parent_dir="${preferred_dir%/*}"
  [ -n "$parent_dir" ] || parent_dir='/'

  printf '[STEP] %s\n' "Diretório remoto ausente. Clonando repositório em $preferred_dir..." >&2
  mkdir -p "$parent_dir"

  if [ -d "$preferred_dir/.git" ]; then
    resolved="$(canonical_dir "$preferred_dir")"
    [ -n "$resolved" ] || resolved="$preferred_dir"
    printf '%s\n' "$resolved"
    return 0
  fi

  git clone --branch main --single-branch "$repo_url" "$preferred_dir"
  resolved="$(canonical_dir "$preferred_dir")"
  [ -n "$resolved" ] || resolved="$preferred_dir"
  printf '%s\n' "$resolved"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || fail "Comando remoto ausente: $1"
}

require_file() {
  [ -f "$1" ] || fail "Arquivo remoto ausente: $1"
}

PROJECT_DIR="$(find_remote_project_dir || true)"
if [ -z "$PROJECT_DIR" ]; then
  log_step 'Nenhum diretório remoto existente foi encontrado.'
  log_step 'Tentando bootstrap remoto do repositório...'
  PROJECT_DIR="$(bootstrap_remote_project_dir)"
fi

log_ok "Diretório remoto encontrado: $PROJECT_DIR"
cd "$PROJECT_DIR"

log_step 'Validando pré-requisitos remotos...'
require_cmd git
require_cmd docker
require_cmd curl
if ! docker compose version >/dev/null 2>&1; then
  fail 'Docker Compose não está disponível na VPS.'
fi
log_ok 'Pré-requisitos remotos disponíveis.'

log_step 'Atualizando git...'
git fetch origin
git checkout main
git reset --hard origin/main
log_ok 'Repositório remoto sincronizado com origin/main.'

log_step 'Validando arquivos compose...'
require_file docker/prod/docker-compose.prod.yml
require_file docker/prod/.env.prod

compose_args=(--env-file docker/prod/.env.prod -f docker/prod/docker-compose.prod.yml)
if [ -f docker/prod/docker-compose.prod.ssl.yml ]; then
  compose_args+=(-f docker/prod/docker-compose.prod.ssl.yml)
fi

docker compose "${compose_args[@]}" config --quiet >/dev/null
log_ok 'Arquivos compose validados.'

log_step 'Preparando diretórios persistentes e permissões de storage...'
set -a
# shellcheck disable=SC1091
. docker/prod/.env.prod
set +a

storage_host_path="${SINGEM_STORAGE_HOST_PATH:-/opt/singem/storage}"
data_host_path="${SINGEM_DATA_HOST_PATH:-/opt/singem/data}"
config_host_path="${SINGEM_CONFIG_HOST_PATH:-/opt/singem/config}"

mkdir -p "$storage_host_path" "$storage_host_path/logs/backend" "$data_host_path" "$config_host_path"
chown -R 1001:1001 "$storage_host_path"
chmod -R u+rwX,g+rwX "$storage_host_path"
log_ok "Storage pronto: $storage_host_path (owner 1001:1001)"

log_step 'Executando docker compose remoto...'
docker compose "${compose_args[@]}" down --remove-orphans

log_step 'Verificando conflitos de porta 3000...'
port_conflicts="$(docker ps --filter publish=3000 --format '{{.ID}} {{.Names}} {{.Ports}}')"
if [ -n "$port_conflicts" ]; then
  printf '%s\n' "$port_conflicts"
  while IFS= read -r conflict_line; do
    [ -n "$conflict_line" ] || continue
    conflict_name="$(printf '%s' "$conflict_line" | awk '{print $2}')"
    case "$conflict_name" in
      singem-dev-backend*|singem-backend*)
        log_step "Removendo container conflitante: $conflict_name"
        docker rm -f "$conflict_name" >/dev/null
        ;;
      *)
        fail "Porta 3000 já está em uso por container não gerenciado pelo deploy: $conflict_name"
        ;;
    esac
  done <<EOF
$port_conflicts
EOF
fi

if ! docker compose "${compose_args[@]}" up -d --build --remove-orphans postgres redis backend; then
  log_error 'Falha ao subir serviços core (postgres, redis, backend).'
  docker ps || true
  docker compose "${compose_args[@]}" logs --tail=240 backend || true
  docker compose "${compose_args[@]}" logs --tail=180 postgres || true
  exit 1
fi

docker compose "${compose_args[@]}" ps
log_ok 'Serviços core iniciados.'

if [ '__SKIP_HEALTHCHECK__' != '1' ]; then
  log_step 'Validando healthcheck...'
  backend_container="$(docker compose "${compose_args[@]}" ps -q backend 2>/dev/null || true)"
  max_attempts=30
  attempt=1
  health_ok=0

  while [ "$attempt" -le "$max_attempts" ]; do
    backend_health='unknown'
    if [ -n "$backend_container" ]; then
      backend_health="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$backend_container" 2>/dev/null || true)"
    fi

    if curl -fsS http://127.0.0.1:3000/health >/dev/null; then
      health_ok=1
      log_ok "Healthcheck remoto respondeu 200 na tentativa ${attempt}/${max_attempts} (container: ${backend_health:-unknown})."
      break
    fi

    if [ "$backend_health" = 'unhealthy' ]; then
      log_error 'Container backend marcado como unhealthy durante validação.'
      docker ps || true
      docker compose "${compose_args[@]}" logs --tail=200 backend || true
      docker compose "${compose_args[@]}" logs --tail=120 frontend || true
      exit 1
    fi

    sleep 5
    attempt=$((attempt + 1))
  done

  if [ "$health_ok" -ne 1 ]; then
    log_error 'Healthcheck remoto não respondeu 200 dentro da janela de espera.'
    docker ps || true
    docker compose "${compose_args[@]}" logs --tail=200 backend || true
    docker compose "${compose_args[@]}" logs --tail=120 frontend || true
    exit 1
  fi
fi

log_step 'Subindo frontend após backend saudável...'
if ! docker compose "${compose_args[@]}" up -d --remove-orphans frontend; then
  log_error 'Falha ao subir frontend após backend saudável.'
  docker ps || true
  docker compose "${compose_args[@]}" logs --tail=160 frontend || true
  exit 1
fi

docker compose "${compose_args[@]}" ps
log_ok 'Docker compose remoto concluído.'
'@

  $remoteScript = $remoteScript.Replace('__REMOTE_PROJECT_CANDIDATES__', $bashCandidateArray)
  $remoteScript = $remoteScript.Replace('__PREFERRED_PROJECT_DIR__', $bashPreferredProjectDir)
  $remoteScript = $remoteScript.Replace('__GIT_ORIGIN_URL__', $bashGitOriginUrl)
  $remoteScript = $remoteScript.Replace('__SKIP_HEALTHCHECK__', $(if ($SkipRemoteHealthcheck) { '1' } else { '0' }))
  $remoteScript = $remoteScript -replace "`r`n", "`n"

  return $remoteScript
}

function Invoke-RemoteDeploy {
  param([pscustomobject]$Target)

  $remoteScript = New-RemoteDeployScript `
    -PreferredProjectDir $Target.PreferredProjectDir `
    -ProjectDirCandidates $Target.ProjectDirCandidates `
    -GitOriginUrl $Target.GitOriginUrl `
    -SkipRemoteHealthcheck:$SkipHealthcheck

  $remoteScriptBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($remoteScript))

  $sshArgs = @(
    '-p', "$($Target.SshPort)",
    '-o', 'ConnectTimeout=20',
    '-o', 'ServerAliveInterval=30',
    '-o', 'StrictHostKeyChecking=accept-new'
  )

  if (-not [string]::IsNullOrWhiteSpace($Target.KeyPath)) {
    $sshArgs += @('-i', $Target.KeyPath)
  }

  $remoteCommand = "printf '%s' '$remoteScriptBase64' | base64 -d | bash"
  $sshArgs += @("$($Target.SshUser)@$($Target.SshHost)", $remoteCommand)

  & ssh @sshArgs
  if ($LASTEXITCODE -ne 0) {
    throw ('Falha ao executar deploy remoto via SSH em {0}@{1}:{2}.' -f $Target.SshUser, $Target.SshHost, $Target.SshPort)
  }
}

try {
  $root = Resolve-DevProjectRoot -ProjectRoot $ProjectRoot -ScriptRoot $PSScriptRoot
  Assert-DevCommand -Name 'ssh' -Hint 'Instale e configure o cliente OpenSSH disponível no Windows.'

  $target = Resolve-DeployTarget -Root $root -PreferredKeyPath $KeyPath

  Write-DeployTitle 'SINGEM REMOTE DEPLOY'
  Write-DeployStep ('Destino SSH: {0}@{1}:{2}' -f $target.SshUser, $target.SshHost, $target.SshPort)
  Write-DeployStep ('Projeto remoto preferencial: {0}' -f $target.PreferredProjectDir)
  Write-DeployStep 'Conectando à VPS via SSH...'

  if ([string]::IsNullOrWhiteSpace($target.KeyPath)) {
    Write-DeployStep 'Nenhuma chave SSH local foi encontrada. Se a VPS exigir senha, o OpenSSH solicitará a digitação no terminal.'
  }

  Write-DeployStep 'Executando deploy 100% remoto na VPS. Nenhum comando Docker será executado localmente.'
  Invoke-RemoteDeploy -Target $target

  Write-Host ''
  Write-DeployOk 'Deploy remoto concluído com sucesso.'
} catch {
  Write-Host ''
  Write-DeployError $_.Exception.Message
  exit 1
}
