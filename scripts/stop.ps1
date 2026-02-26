param(
  # ask = pergunta. yes = promove. no = não promove.
  [ValidateSet("ask","yes","no")]
  [string]$PromoteMain = "ask",

  [string]$CommitMessage = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

try {
  chcp 65001 | Out-Null
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
  $OutputEncoding = [System.Text.UTF8Encoding]::new()
} catch {}

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile     = Join-Path $ProjectRoot ".dev-session.json"
$Remote      = "origin"

# ===== VPS / DEPLOY SETTINGS (CORRETOS) =====
$VpsIp      = "72.61.55.250"
$SshPort    = 2222
$SshUser    = "root"
$VpsRepoDir = "/opt/singem"
$VpsFrontDir = "/opt/singem/public"
$VpsNginxSite = "/etc/nginx/sites-enabled/singem.cloud"
$Pm2AppName = "singem-server"
$SiteUrl = "https://www.singem.cloud"

$Summary = [ordered]@{
  ClosedItems = New-Object System.Collections.Generic.List[string]
  DevHead = ""
  DevPush = "skipped"
  MainAction = "not-promoted"
  MainHeadBefore = ""
  MainHeadAfter = ""
  Deploy = "skipped"
}

function Say($msg, $color="White") {
  Write-Host $msg -ForegroundColor $color
}

function Ensure-Command($cmd) {
  $null = Get-Command $cmd -ErrorAction SilentlyContinue
  if (-not $?) {
    throw "Comando não encontrado: $cmd. Instale e tente novamente."
  }
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
    $outLines = @(& $File @Args 2>&1 | ForEach-Object { "$($_)" })
    $code = $LASTEXITCODE
    if ($null -eq $code) { $code = 0 }
  } finally {
    $ErrorActionPreference = $oldEAP
  }

  $outText = ($outLines -join [Environment]::NewLine).Trim()
  return [pscustomobject]@{
    Out = $outLines
    OutText = $outText
    Code = [int]$code
    Ok = ([int]$code -eq 0)
  }
}

function Ensure-RunOk {
  param(
    [Parameter(Mandatory=$true)][pscustomobject]$Result,
    [Parameter(Mandatory=$true)][string]$Action
  )
  if (-not $Result.Ok) {
    $detail = $Result.OutText
    if ([string]::IsNullOrWhiteSpace($detail)) { $detail = "(sem saída)" }
    throw "$Action falhou (exit code $($Result.Code)).`n$detail"
  }
}

function Get-ProcessMeta {
  param([int]$ProcessId)

  try {
    $p = Get-Process -Id $ProcessId -ErrorAction Stop
  } catch {
    return $null
  }

  $cmdLine = ""
  try {
    $wmi = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue
    if ($wmi -and $wmi.CommandLine) { $cmdLine = "$($wmi.CommandLine)" }
  } catch {}

  return [pscustomobject]@{
    Id = $p.Id
    Name = "$($p.ProcessName)"
    CommandLine = $cmdLine
  }
}

function Test-ProcessSafeToKill {
  param(
    [Parameter(Mandatory=$true)][pscustomobject]$Meta,
    [Parameter(Mandatory=$true)][string]$Kind
  )

  $name = ($Meta.Name | ForEach-Object { $_.ToLowerInvariant() })
  $cmd  = ($Meta.CommandLine | ForEach-Object { $_.ToLowerInvariant() })

  if ($Kind -eq "chrome") {
    if ($name -in @("chrome","msedge")) {
      if ($cmd -match "localhost:8000|localhost:3000|singem") { return $true }
      if ([string]::IsNullOrWhiteSpace($cmd)) { return $true }
    }
    return $false
  }

  if ($Kind -eq "backend") {
    if ($name -in @("node","python","pwsh","powershell","cmd","npx")) {
      if ($cmd -match "singem|npm run dev|http\.server|http-server|server") { return $true }
      if ([string]::IsNullOrWhiteSpace($cmd)) { return $true }
    }
    return $false
  }

  if ($Kind -eq "tunnel") {
    if ($name -in @("ssh","pwsh","powershell","cmd")) {
      if ($cmd -match "-l 5433:|72\.61\.55\.250|singem") { return $true }
      if ($name -eq "ssh") { return $true }
    }
    return $false
  }

  return $false
}

function Try-KillTree {
  param(
    [int]$ProcessId,
    [string]$Label,
    [string]$Kind
  )

  if (-not $ProcessId) { return $false }

  $meta = Get-ProcessMeta -ProcessId $ProcessId
  if ($null -eq $meta) {
    Say "🟡 $Label PID $ProcessId já não existe." "Yellow"
    return $false
  }

  if (-not (Test-ProcessSafeToKill -Meta $meta -Kind $Kind)) {
    Say "🟡 Ignorado por segurança: $Label PID $ProcessId ($($meta.Name))." "Yellow"
    return $false
  }

  try {
    taskkill /PID $ProcessId /T /F | Out-Null
    Say "✅ $Label fechado (PID $ProcessId)." "Green"
    [void]$Summary.ClosedItems.Add("$Label PID $ProcessId")
    return $true
  } catch {
    Say "🟡 $Label PID $ProcessId não foi finalizado (talvez já estava fechado)." "Yellow"
    return $false
  }
}

function Try-KillByPort {
  param(
    [int]$Port,
    [string]$Label,
    [string]$Kind
  )

  try {
    $processIds = @(Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique)
    foreach ($processIdFromPort in $processIds) {
      if ($processIdFromPort) {
        [void](Try-KillTree -ProcessId $processIdFromPort -Label "$Label (porta $Port)" -Kind $Kind)
      }
    }
  } catch {}
}

function Get-GitHead {
  param([string]$Ref = "HEAD")
  $r = Run-Native git @("rev-parse",$Ref)
  if (-not $r.Ok) { return "" }
  return $r.OutText
}

Ensure-Command git
Ensure-Command ssh

Say ""
Say "🧹 ==> Encerrando sessão SINGEM (DEV primeiro, MAIN opcional)..." "Cyan"
Say "📁 ProjectRoot: $ProjectRoot" "DarkYellow"

Set-Location -LiteralPath $ProjectRoot
if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
  throw "Não é um repositório git válido: $ProjectRoot"
}

$sshPid = $null
$serverPid = $null
$chromePid = $null

if (Test-Path $PidFile) {
  try {
    $sess = Get-Content $PidFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $sshPid    = $sess.sshPid
    $serverPid = $sess.serverPid
    $chromePid = $sess.chromePid
    Say "ℹ️ Sessão anterior lida de $PidFile" "DarkGray"
  } catch {
    Say "🟡 Não consegui ler $PidFile (JSON inválido/corrompido). Seguindo por fallback de portas." "Yellow"
  }
} else {
  Say "🟡 $PidFile não encontrado. Seguindo por fallback de portas." "Yellow"
}

# 0) Fechar processos via PID + fallback por portas
[void](Try-KillTree -ProcessId $serverPid -Label "Backend (janela PowerShell)" -Kind "backend")
[void](Try-KillTree -ProcessId $sshPid -Label "Tunnel SSH (janela PowerShell)" -Kind "tunnel")
[void](Try-KillTree -ProcessId $chromePid -Label "Browser" -Kind "chrome")

Try-KillByPort -Port 3000 -Label "Backend" -Kind "backend"
Try-KillByPort -Port 5433 -Label "Tunnel SSH" -Kind "tunnel"
Try-KillByPort -Port 8000 -Label "Front server" -Kind "backend"

Say ""
Say "🔄 ==> DEV: sync + commit + push (se houver alterações)..." "Cyan"

# 1) DEV: sempre salvar primeiro (com auto-stash)
$stashMade = $false
$stashName = ""

$dirty = (Run-Native git @("status","--porcelain")).OutText
if (-not [string]::IsNullOrWhiteSpace($dirty)) {
  $stashName = "autostash stop " + (Get-Date -Format "yyyyMMdd-HHmmss")
  Say "🟡 Working tree sujo. Fazendo stash automático: $stashName" "Yellow"
  $r = Run-Native git @("stash","push","-u","-m",$stashName)
  Ensure-RunOk -Result $r -Action "git stash push"
  $stashMade = $true
}

$r = Run-Native git @("fetch",$Remote,"dev")
Ensure-RunOk -Result $r -Action "git fetch origin dev"

$r = Run-Native git @("checkout","dev")
Ensure-RunOk -Result $r -Action "git checkout dev"

$r = Run-Native git @("pull","--ff-only",$Remote,"dev")
Ensure-RunOk -Result $r -Action "git pull --ff-only origin dev"

if ($stashMade) {
  Say "🔁 Reaplicando stash..." "Cyan"
  $r = Run-Native git @("stash","pop")
  if (-not $r.Ok) {
    Say "❌ Falha ao aplicar stash." "Red"
    if (-not [string]::IsNullOrWhiteSpace($r.OutText)) { Say $r.OutText "Red" }
    Say ""
    Say "Passos para resolver:" "Yellow"
    Say "1) git status" "Yellow"
    Say "2) Resolva os conflitos nos arquivos marcados" "Yellow"
    Say "3) git add <arquivos-resolvidos>" "Yellow"
    Say "4) git stash drop (opcional, após validar)" "Yellow"
    Say "5) Rode o stop novamente" "Yellow"
    throw "Conflito ao aplicar stash. Fluxo interrompido antes de promote/deploy."
  }
}

# commit/push dev se houver mudanças
$statusBeforeAdd = (Run-Native git @("status","--porcelain")).OutText
if (-not [string]::IsNullOrWhiteSpace($statusBeforeAdd)) {
  $r = Run-Native git @("add",".")
  Ensure-RunOk -Result $r -Action "git add ."

  $statusAfterAdd = (Run-Native git @("status","--porcelain")).OutText
  if ([string]::IsNullOrWhiteSpace($statusAfterAdd)) {
    Say "🟡 Após git add não há mudanças para commit." "Yellow"
    $Summary.DevPush = "no-changes"
  } else {
    if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
      $CommitMessage = "chore: daily dev save " + (Get-Date -Format "yyyy-MM-dd HH:mm")
      Say "ℹ️ CommitMessage automática: $CommitMessage" "DarkGray"
    }

    $r = Run-Native git @("commit","-m",$CommitMessage)
    if (-not $r.Ok) {
      if ($r.OutText -match "nothing to commit|working tree clean") {
        Say "🟡 Git reportou 'nothing to commit'. Seguindo sem push de conteúdo." "Yellow"
        $Summary.DevPush = "no-changes"
      } else {
        throw "git commit falhou.`n$($r.OutText)"
      }
    } else {
      $r = Run-Native git @("push",$Remote,"dev")
      Ensure-RunOk -Result $r -Action "git push origin dev"
      Say "✅ DEV commitado e enviado (push)." "Green"
      $Summary.DevPush = "pushed"
    }
  }
} else {
  Say "🟡 DEV sem mudanças para commit." "Yellow"
  $Summary.DevPush = "no-changes"
}

$Summary.DevHead = Get-GitHead -Ref "HEAD"

# 2) Perguntar se promove DEV -> MAIN
$doPromote = $false
if ($PromoteMain -eq "yes") {
  $doPromote = $true
} elseif ($PromoteMain -eq "no") {
  $doPromote = $false
} else {
  $ans = Read-Host "Promover DEV -> MAIN agora e publicar no site? [s/N]"
  if ($ans -match '^(s|S|y|Y)$') {
    $doPromote = $true
  } else {
    $doPromote = $false
  }
}

if (-not $doPromote) {
  Say "🟡 MAIN não foi promovido (opção selecionada)." "Yellow"
  if (Test-Path $PidFile) { Remove-Item $PidFile -Force -ErrorAction SilentlyContinue }

  Say ""
  Say "✅ DONE." "Green"
  Say "--- Resumo ---" "Cyan"
  Say "Fechados: $($Summary.ClosedItems.Count) processo(s)" "White"
  Say "DEV head: $($Summary.DevHead)" "White"
  Say "DEV push: $($Summary.DevPush)" "White"
  Say "MAIN: $($Summary.MainAction)" "White"
  Say "Deploy: $($Summary.Deploy)" "White"
  exit 0
}

# 3) MAIN: política fixa => main sempre vira dev (se divergir, reset + force-with-lease)
Say ""
Say "🚀 ==> MAIN: atualizando para ficar IDÊNTICA ao DEV (política fixa)..." "Cyan"

$r = Run-Native git @("fetch",$Remote,"main")
Ensure-RunOk -Result $r -Action "git fetch origin main"

$Summary.MainHeadBefore = Get-GitHead -Ref "origin/main"
$devHeadForMain = Get-GitHead -Ref "dev"

Say "ℹ️ Hash atual main (origin/main): $($Summary.MainHeadBefore)" "DarkYellow"
Say "ℹ️ Hash atual dev: $devHeadForMain" "DarkYellow"

$r = Run-Native git @("checkout","main")
Ensure-RunOk -Result $r -Action "git checkout main"

$r = Run-Native git @("pull","--ff-only",$Remote,"main")
Ensure-RunOk -Result $r -Action "git pull --ff-only origin main"

$r = Run-Native git @("merge","--ff-only","dev")
if (-not $r.Ok) {
  Say "🟡 MAIN divergiu do DEV. Aplicando reset main=dev + force-with-lease." "Yellow"

  $r = Run-Native git @("reset","--hard","dev")
  Ensure-RunOk -Result $r -Action "git reset --hard dev"

  $r = Run-Native git @("push","--force-with-lease",$Remote,"main")
  Ensure-RunOk -Result $r -Action "git push --force-with-lease origin main"

  Say "✅ MAIN agora é idêntica ao DEV (force-with-lease)." "Green"
  $Summary.MainAction = "force-with-lease"
} else {
  $r = Run-Native git @("push",$Remote,"main")
  Ensure-RunOk -Result $r -Action "git push origin main"
  Say "✅ MAIN atualizado com DEV (fast-forward) e enviado (push)." "Green"
  $Summary.MainAction = "fast-forward"
}

$Summary.MainHeadAfter = Get-GitHead -Ref "HEAD"

# 4) Deploy VPS (main)
Say ""
Say "🌐 ==> VPS deploy (main)..." "Cyan"
Say "RepoDir: $VpsRepoDir | PM2: $Pm2AppName" "DarkYellow"

$deploySteps = @(
  "set -e"
  "cd $VpsRepoDir"
  "if [ ! -d .git ]; then echo '[ERRO] Diretório não é repositório git: $VpsRepoDir'; exit 2; fi"
  "if ! command -v pm2 >/dev/null 2>&1; then echo '[ERRO] pm2 não encontrado no servidor'; exit 3; fi"
  "if ! command -v curl >/dev/null 2>&1; then echo '[ERRO] curl não encontrado no servidor'; exit 4; fi"
  "if ! command -v rsync >/dev/null 2>&1; then echo '[ERRO] rsync não encontrado no servidor'; exit 5; fi"
  "git fetch origin main"
  "git checkout main || git checkout -B main origin/main"
  "if git merge-base --is-ancestor HEAD origin/main; then git merge --ff-only origin/main; echo '[INFO] VPS main fast-forward para origin/main'; else echo '[WARN] VPS main divergiu; aplicando reset --hard origin/main'; git reset --hard origin/main; fi"
  "mkdir -p $VpsFrontDir"
  "rsync -a --delete --exclude='.git' --exclude='server' --exclude='node_modules' --exclude='01_EMPENHOS' --exclude='02_NOTAS_FISCAIS' --exclude='03_RELATORIOS' --exclude='04_BACKUPS' --exclude='05_ANEXOS' --exclude='IF GUANAMBI' --exclude='storage' --exclude='scripts' --exclude='docs' --exclude='tests' --exclude='testes' --exclude='*.code-workspace' $VpsRepoDir/ $VpsFrontDir/"
  "if [ ! -f $VpsNginxSite ]; then echo '[ERRO] Config Nginx não encontrada: $VpsNginxSite'; exit 6; fi"
  "ACTIVE_ROOT=`$(grep -E '^[[:space:]]*root[[:space:]]+' $VpsNginxSite | head -n 1 | awk '{print `$2}' | sed 's/;//')"
  "if [ -z `"`$ACTIVE_ROOT`" ]; then echo '[ERRO] Não foi possível detectar root no Nginx'; exit 7; fi"
  "echo [INFO] Nginx root ativo: `$ACTIVE_ROOT"
  "if [ `"`$ACTIVE_ROOT`" != `"$VpsFrontDir`" ]; then echo '[WARN] Nginx root diferente do padrão. Sincronizando também para o root ativo para evitar front antigo.'; mkdir -p `"`$ACTIVE_ROOT`"; rsync -a --delete --exclude='.git' --exclude='server' --exclude='node_modules' --exclude='01_EMPENHOS' --exclude='02_NOTAS_FISCAIS' --exclude='03_RELATORIOS' --exclude='04_BACKUPS' --exclude='05_ANEXOS' --exclude='IF GUANAMBI' --exclude='storage' --exclude='scripts' --exclude='docs' --exclude='tests' --exclude='testes' --exclude='*.code-workspace' $VpsRepoDir/ `"`$ACTIVE_ROOT`"/; fi"
  "nginx -t"
  "systemctl reload nginx"
  "pm2 restart $Pm2AppName"
  "pm2 status $Pm2AppName || true"
  "echo [INFO] Smoke: HTML"
  "HTML=$(curl -fsSL $SiteUrl)"
  "echo `"`$HTML`" | grep -q 'SINGEM v' || { echo '[ERRO] Smoke HTML sem marcador de versionamento (SINGEM v)'; exit 8; }"
  "echo [OK] HTML contém marcador de versionamento"
  "echo [INFO] Smoke: /api/version"
  "curl -fsSL $SiteUrl/api/version"
  "echo"
  "echo [INFO] Smoke: /health"
  "curl -fsSL $SiteUrl/health"
  "echo"
)
$deployCmd = $deploySteps -join "; "

$r = Run-Native ssh @("-p",$SshPort,"$SshUser@$VpsIp",$deployCmd)
if (-not $r.Ok) {
  Say "❌ Falha no deploy via SSH." "Red"
  if (-not [string]::IsNullOrWhiteSpace($r.OutText)) {
    Say $r.OutText "Red"
  }
  Say ""
  Say "Diagnóstico sugerido:" "Yellow"
  Say "- Test-NetConnection $VpsIp -Port $SshPort" "Yellow"
  Say "- ssh -p $SshPort $SshUser@$VpsIp" "Yellow"
  Say "- No remoto: command -v pm2 ; pm2 -v ; ls -la $VpsRepoDir" "Yellow"
  throw "Deploy na VPS falhou."
}

if (-not [string]::IsNullOrWhiteSpace($r.OutText)) {
  Say "📄 Saída remota resumida:" "DarkGray"
  Say $r.OutText "Gray"
}

Say "✅ Deploy executado na VPS." "Green"
$Summary.Deploy = "ok"

# 5) Limpar sessão
if (Test-Path $PidFile) {
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}

Say ""
Say "✅ DONE." "Green"
Say "--- Resumo ---" "Cyan"
if ($Summary.ClosedItems.Count -gt 0) {
  Say ("Fechados: " + ($Summary.ClosedItems -join ", ")) "White"
} else {
  Say "Fechados: nenhum processo encontrado/finalizado" "White"
}
Say "DEV head: $($Summary.DevHead)" "White"
Say "DEV push: $($Summary.DevPush)" "White"
Say "MAIN: $($Summary.MainAction)" "White"
if (-not [string]::IsNullOrWhiteSpace($Summary.MainHeadBefore)) {
  Say "MAIN hash antes: $($Summary.MainHeadBefore)" "White"
}
if (-not [string]::IsNullOrWhiteSpace($Summary.MainHeadAfter)) {
  Say "MAIN hash depois: $($Summary.MainHeadAfter)" "White"
}
Say "Deploy: $($Summary.Deploy)" "White"
