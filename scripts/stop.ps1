param(
  # ask = pergunta. yes = promove. no = não promove.
  [ValidateSet("ask","yes","no")]
  [string]$PromoteMain = "ask",

  [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"
$Remote      = "origin"

# ===== VPS / DEPLOY SETTINGS (CORRETOS) =====
$VpsIp   = "72.61.55.250"
$SshPort = 2222
$SshUser = "root"
$VpsRepoDir = "/opt/singem"
$Pm2AppName = "singem-server"

# Deploy: só continua se tudo der certo
$DeployCmd = @"
set -e
cd $VpsRepoDir
test -d .git
git fetch origin main
git checkout main
git pull --ff-only origin main
pm2 restart $Pm2AppName
pm2 status $Pm2AppName || true
"@

function Ensure-Command($cmd) {
  $null = Get-Command $cmd -ErrorAction SilentlyContinue
  if (-not $?) { throw "Command not found: $cmd. Install it and try again." }
}

function Say($msg, $color="White") { Write-Host $msg -ForegroundColor $color }

function Try-KillTree([int]$processId, [string]$label) {
  if (-not $processId) { return }
  try { taskkill /PID $processId /T /F | Out-Null; Say "OK: $label fechado (PID $processId)." "Green" }
  catch { Say "WARN: $label PID $processId não foi finalizado (talvez já estava fechado)." "Yellow" }
}

function Try-KillByPort([int]$port, [string]$label) {
  try {
    $pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($pid in $pids) { if ($pid) { Try-KillTree -processId $pid -label "$label (fallback port $port)" } }
  } catch {}
}

# Executa comando nativo sem o PowerShell "matar" por stderr/hints.
function Run-Native {
  param(
    [Parameter(Mandatory=$true)][string]$File,
    [Parameter(Mandatory=$false)][string[]]$Args = @()
  )
  $oldEAP = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $out = & $File @Args 2>&1
    $code = $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $oldEAP
  }
  return @{ Out = $out; Code = $code }
}

Ensure-Command git
Ensure-Command ssh

Say "==> Stopping SINGEM session (DEV first, optional MAIN)..." "Cyan"
Say "ProjectRoot: $ProjectRoot" "DarkYellow"

# 0) Fechar processos via PID (se existir) + fallback por portas
$sshPid=$null; $serverPid=$null; $chromePid=$null
if (Test-Path $PidFile) {
  try {
    $sess = Get-Content $PidFile -Raw | ConvertFrom-Json
    $sshPid    = $sess.sshPid
    $serverPid = $sess.serverPid
    $chromePid = $sess.chromePid
  } catch {
    Say "WARN: não consegui ler $PidFile (vou usar fallback por portas)." "Yellow"
  }
} else {
  Say "WARN: $PidFile não encontrado (vou usar fallback por portas)." "Yellow"
}

Try-KillTree -processId $serverPid -label "Backend (PowerShell window)"
Try-KillTree -processId $sshPid    -label "Tunnel (PowerShell window)"
Try-KillTree -processId $chromePid -label "Chrome (opened by start)"
Try-KillByPort -port 3000 -label "Backend"
Try-KillByPort -port 5433 -label "Tunnel"

# 1) DEV: sempre salvar primeiro (com auto-stash)
Set-Location -LiteralPath $ProjectRoot
if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) { throw "Not a git repository: $ProjectRoot" }

Say "==> DEV: sync + commit + push (se houver alterações)..." "Cyan"

# Auto-stash se tiver alterações (evita erro no checkout)
$dirty = (Run-Native git @("status","--porcelain")).Out
$stashMade = $false
$stashName = ""
if ($dirty -and ($dirty | Out-String).Trim().Length -gt 0) {
  $stashName = "autostash stop $(Get-Date -Format 'yyyyMMdd-HHmmss')"
  Say "==> Working tree sujo: fazendo stash automático ($stashName)..." "Yellow"
  $r = Run-Native git @("stash","push","-u","-m",$stashName)
  if ($r.Code -ne 0) { throw ($r.Out | Out-String) }
  $stashMade = $true
}

$r = Run-Native git @("fetch",$Remote,"dev")
if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

$r = Run-Native git @("checkout","dev")
if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

$r = Run-Native git @("pull","--ff-only",$Remote,"dev")
if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

# reaplica stash se foi criado
if ($stashMade) {
  Say "==> Reaplicando stash..." "Cyan"
  $r = Run-Native git @("stash","pop")
  if ($r.Code -ne 0) {
    Say ($r.Out | Out-String) "Red"
    throw "Conflito ao aplicar stash. Resolva os conflitos e rode o stop novamente."
  }
}

# commit/push dev se houver mudanças
$status = (Run-Native git @("status","--porcelain")).Out
if (($status | Out-String).Trim().Length -gt 0) {
  $r = Run-Native git @("add",".")
  if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

  (Run-Native git @("status")).Out | Out-Host

  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $CommitMessage = Read-Host "Commit message (dev)"
  }
  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    throw "Commit message vazio. Abortando para não fazer push sem mensagem."
  }

  $r = Run-Native git @("commit","-m",$CommitMessage)
  if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

  $r = Run-Native git @("push",$Remote,"dev")
  if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

  Say "OK: DEV commitado e enviado (push)." "Green"
} else {
  Say "DEV: sem mudanças para commit." "Yellow"
}

# 2) Perguntar se promove DEV -> MAIN
$doPromote = $false
if ($PromoteMain -eq "yes") { $doPromote = $true }
elseif ($PromoteMain -eq "no") { $doPromote = $false }
else {
  $ans = Read-Host "Promover DEV -> MAIN agora e publicar no site? (S/N)"
  if ($ans -match '^(s|S|y|Y)$') { $doPromote = $true }
}

if (-not $doPromote) {
  Say "MAIN não foi promovido (você escolheu não)." "Yellow"
  if (Test-Path $PidFile) { Remove-Item $PidFile -Force }
  Say "DONE." "Green"
  exit 0
}

# 3) MAIN: política fixa => main sempre vira dev (se divergir, reset + force-with-lease)
Say "==> MAIN: atualizando para ficar IDÊNTICA ao DEV (política fixa)..." "Cyan"

$r = Run-Native git @("fetch",$Remote,"main")
if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

$r = Run-Native git @("checkout","main")
if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

$r = Run-Native git @("pull","--ff-only",$Remote,"main")
if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

# tenta FF primeiro; se não der, força reset
$r = Run-Native git @("merge","--ff-only","dev")
if ($r.Code -ne 0) {
  Say "WARN: MAIN divergiu do DEV. Aplicando RESET main=dev + force-with-lease." "Yellow"
  Say ($r.Out | Out-String) "DarkYellow"

  $r = Run-Native git @("reset","--hard","dev")
  if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

  $r = Run-Native git @("push","--force-with-lease",$Remote,"main")
  if ($r.Code -ne 0) { throw ($r.Out | Out-String) }

  Say "OK: MAIN agora é idêntica ao DEV (force-with-lease)." "Green"
} else {
  $r = Run-Native git @("push",$Remote,"main")
  if ($r.Code -ne 0) { throw ($r.Out | Out-String) }
  Say "OK: MAIN atualizado com DEV (fast-forward) e enviado (push)." "Green"
}

# 4) Deploy VPS (main)
Say "==> VPS deploy (main)..." "Cyan"
Say "RepoDir: $VpsRepoDir | PM2: $Pm2AppName" "DarkYellow"
$r = Run-Native ssh @("-p",$SshPort,"$SshUser@$VpsIp",$DeployCmd)
if ($r.Code -ne 0) { throw ($r.Out | Out-String) }
Say "OK: Deploy executado na VPS." "Green"

# 5) Limpar sessão
if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

Say "DONE." "Green"
