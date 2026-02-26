param(
  # Se "ask": pergunta na hora. Se "yes": promove dev->main. Se "no": não promove.
  [ValidateSet("ask","yes","no")]
  [string]$PromoteMain = "ask",

  # Mensagem do commit (se vazio, pergunta). Se ainda ficar vazio, aborta commit/push.
  [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"
$Remote      = "origin"

# ===== VPS / DEPLOY SETTINGS =====
# Mantidos "no arquivo" como você pediu.
$VpsIp   = "72.61.55.250"
$SshPort = 2222
$SshUser = "root"

# Ajuste para a pasta REAL do repositório na VPS (onde existe .git)
# Se você já usa outra pasta, troque aqui.
$VpsRepoDir = "/var/www/singem"

# Comando de restart pós-atualização.
# Se você usa systemd/dockers/pm2, ajuste aqui.
# - pm2: (pm2 restart singem || pm2 restart all)
# - systemd: (systemctl restart singem)
# - docker compose: (docker compose up -d --build)
$RestartCmd = "pm2 restart singem || pm2 restart all || true"

# Deploy: atualiza main e reinicia
$DeployCmd = "cd $VpsRepoDir && git fetch origin main && git checkout main && git pull --ff-only origin main && $RestartCmd"

# ================================

function Ensure-Command($cmd) {
  $null = Get-Command $cmd -ErrorAction SilentlyContinue
  if (-not $?) { throw "Command not found: $cmd. Install it and try again." }
}

function Say($msg, $color="White") {
  Write-Host $msg -ForegroundColor $color
}

function Try-KillTree([int]$processId, [string]$label) {
  if (-not $processId) { return }
  try {
    taskkill /PID $processId /T /F | Out-Null
    Say "OK: $label fechado (PID $processId)." "Green"
  } catch {
    Say "WARN: $label PID $processId não foi finalizado (talvez já estava fechado)." "Yellow"
  }
}

function Try-KillByPort([int]$port, [string]$label) {
  try {
    $pids = (Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($pid in $pids) {
      if ($pid) { Try-KillTree -processId $pid -label "$label (fallback port $port)" }
    }
  } catch {
    # ignore
  }
}

# -------------------- START --------------------

Say "==> Stopping SINGEM session (DEV first, optional MAIN)..." "Cyan"
Say "ProjectRoot: $ProjectRoot" "DarkYellow"

Ensure-Command git
Ensure-Command ssh

# 0) Ler sessão e fechar processos (PowerShell windows + Chrome)
$sshPid    = $null
$serverPid = $null
$chromePid = $null

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

# Fecha (preferencial) pelos PIDs que o start salvou
Try-KillTree -processId $serverPid -label "Backend (PowerShell window)"
Try-KillTree -processId $sshPid    -label "Tunnel (PowerShell window)"
Try-KillTree -processId $chromePid -label "Chrome (opened by start)"

# Fallback: fecha por portas, se PIDs não existirem
# Backend local (3000) e túnel local (5433)
Try-KillByPort -port 3000 -label "Backend"
Try-KillByPort -port 5433 -label "Tunnel"

# 1) DEV: sempre salvar primeiro
Set-Location -LiteralPath $ProjectRoot
if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
  throw "Not a git repository: $ProjectRoot"
}

Say "==> DEV: sync + commit + push (se houver alterações)..." "Cyan"
git fetch $Remote dev | Out-Null
git checkout dev | Out-Null
git pull --ff-only $Remote dev

$status = git status --porcelain
if ($status) {
  git add .
  git status

  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    $CommitMessage = Read-Host "Commit message (dev)"
  }
  if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
    throw "Commit message vazio. Abortando para não fazer push sem mensagem."
  }

  git commit -m "$CommitMessage"
  git push $Remote dev
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

if ($doPromote) {
  Say "==> MAIN: fast-forward para DEV + push + deploy..." "Cyan"

  # Atualiza main local
  git fetch $Remote main | Out-Null
  git checkout main | Out-Null
  git pull --ff-only $Remote main

  # Promove main -> dev (FF-only para não criar merge commit)
  git merge --ff-only dev

  # Push main
  git push $Remote main
  Say "OK: MAIN atualizado com DEV e enviado (push)." "Green"

  # Deploy na VPS
  Say "==> VPS deploy (main)..." "Cyan"
  Say "SSH: $SshUser@$VpsIp port $SshPort" "DarkYellow"
  Say "CMD: $DeployCmd" "DarkYellow"

  ssh -p $SshPort "$SshUser@$VpsIp" $DeployCmd
  Say "OK: Deploy executado na VPS." "Green"
} else {
  Say "MAIN não foi promovido (você escolheu não)." "Yellow"
}

# 3) Limpar sessão
if (Test-Path $PidFile) { Remove-Item $PidFile -Force }

Say "DONE." "Green"
