# start-dev.ps1 - SINGEM DEV (BLINDADO) - PowerShell 5+
# Objetivo: sempre abrir o ambiente DEV na ÚLTIMA origin/dev e PROVAR que o front está servindo a versão correta.

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# =======================
# AJUSTES DE CONSOLE / ENCODING (resolve âš / FaÃ§a)
# =======================
try {
    chcp 65001 | Out-Null
    [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
    $OutputEncoding = [System.Text.UTF8Encoding]::new()
} catch {}

# =======================
# CONFIGURACOES (AJUSTE AQUI)
# =======================

# Se o repo estiver "sujo", por padrão ABORTA para não perder nada.
# Se quiser que ele faça stash automaticamente, mude para $true.
$AUTO_STASH_IF_DIRTY = $false

# Se a única alteração local for o próprio scripts/start-dev.ps1,
# ele faz OPÇÃO 1 automaticamente: add + commit + push em dev e continua.
$AUTO_COMMIT_SCRIPT_IF_ONLY_DIRTY = $true
$SCRIPT_REL_PATH = "scripts/start-dev.ps1"

# Se quiser que o script apenas avise sobre cache/SW, deixe true.
$SHOW_CACHE_SW_TIPS = $true

# Auto instalar deps do backend se node_modules estiver faltando.
$AUTO_INSTALL_BACKEND_DEPS = $true
$FORCE_NPM_CI_IF_POSSIBLE  = $false

# VPS / SSH TUNNEL
$VpsIp   = "72.61.55.250"
$SshPort = 2222
$SshUser = "root"

# Portas
$FrontPort   = 8000
$BackendPort = 3000
$DbLocalPort = 5433

$DbRemoteHost = "127.0.0.1"
$DbRemotePort = 5432

# Verificação de versão (ajuste se seu version.json estiver em outro caminho)
$VersionFileRelPath = "js\core\version.json"

# Pastas do projeto:
# Este script está em: D:\SINGEM\scripts\start-dev.ps1
# Então ProjectRoot deve ser D:\SINGEM
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$ServerDir   = Join-Path $ProjectRoot "server"

# URLs
$FrontUrl   = "http://localhost:${FrontPort}"
$HealthUrl  = "http://localhost:${BackendPort}/health"
$VersionUrl = "${FrontUrl}/js/core/version.json"

# =======================
# FUNCOES AUXILIARES
# =======================

function Write-Section($title) {
    Write-Host ""
    Write-Host "=============================="
    Write-Host $title
    Write-Host "=============================="
}

function Fail($msg) {
    Write-Host ""
    Write-Host "❌ ERRO: $msg" -ForegroundColor Red
    throw $msg
}

function Stop-PortProcess($port) {
    $conn = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $conn) {
        $procId = $conn.OwningProcess
        if ($procId -and $procId -ne 0) {
            Write-Host "Encerrando processo na porta $port (PID $procId)..."
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
            Start-Sleep -Seconds 1
        }
    }
}

function Wait-Port($hostname, $port, $timeoutSec=30) {
    for ($i=0; $i -lt $timeoutSec; $i++) {
        $ok = (Test-NetConnection $hostname -Port $port -WarningAction SilentlyContinue).TcpTestSucceeded
        if ($ok) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Wait-HttpOk($url, $timeoutSec=30) {
    for ($i=0; $i -lt $timeoutSec; $i++) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
            if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 400) { return $true }
        } catch {}
        Start-Sleep -Seconds 1
    }
    return $false
}

function Read-FileText($path) {
    if (-not (Test-Path $path)) { return $null }
    return Get-Content -Raw -Encoding UTF8 $path
}

function Strip-JsonPreamble($text) {
    if ($null -eq $text) { return $null }

    $clean = [string]$text

    # Remove BOM Unicode real no começo (U+FEFF) e marks invisíveis comuns
    $clean = $clean.TrimStart([char]0xFEFF, [char]0x200B, [char]0x2060)

    # Remove BOM UTF-8 mal decodificado como Latin-1/Windows-1252 (ï»¿)
    if ($clean.StartsWith("ï»¿")) {
        $clean = $clean.Substring(3)
    }

    return $clean
}

function Normalize-Json($jsonText) {
    if (-not $jsonText) { return $null }

    $jsonText = Strip-JsonPreamble $jsonText

    try {
        return ($jsonText | ConvertFrom-Json)
    } catch {
        # fallback defensivo: remove qualquer prefixo antes do primeiro '{' ou '['
        $objIdx = $jsonText.IndexOf('{')
        $arrIdx = $jsonText.IndexOf('[')

        if ($objIdx -ge 0 -and $arrIdx -ge 0) {
            $firstIdx = [Math]::Min($objIdx, $arrIdx)
        } elseif ($objIdx -ge 0) {
            $firstIdx = $objIdx
        } elseif ($arrIdx -ge 0) {
            $firstIdx = $arrIdx
        } else {
            return $null
        }

        if ($firstIdx -gt 0) {
            $jsonText = $jsonText.Substring($firstIdx)
        }

        try {
            return ($jsonText | ConvertFrom-Json)
        } catch {
            return $null
        }
    }
}

function Get-Preview($text, $maxLen=30) {
    if ($null -eq $text) { return "" }
    $raw = [string]$text
    if ($raw.Length -le $maxLen) { return $raw }
    return $raw.Substring(0, $maxLen)
}

function Ensure-RepoRoot($root) {
    if (-not (Test-Path (Join-Path $root ".git"))) {
        Fail "Nao encontrei .git em '$root'. Garanta que este script esteja DENTRO do repo (ex: D:\SINGEM\scripts\start-dev.ps1)."
    }
}

function Ensure-Tool($name, $hint) {
    $cmd = Get-Command $name -ErrorAction SilentlyContinue
    if (-not $cmd) { Fail "Ferramenta '$name' não encontrada. $hint" }
}

function Get-DirtyFiles {
    # SEMPRE retorna ARRAY (mesmo 0 ou 1 item) -> evita erro .Count
    $out = & git status --porcelain
    if ($LASTEXITCODE -ne 0) { Fail "git status falhou" }
    if (-not $out) { return @() }

    $files = New-Object System.Collections.Generic.List[string]

    foreach ($line in ($out -split "`n")) {
        $l = $line.TrimEnd()
        if (-not $l) { continue }
        if ($l.Length -lt 4) { continue }

        # formato: " M path" ou "M  path" etc. => pega depois do status
        $path = $l.Substring(3).Trim()
        if ($path) { [void]$files.Add($path) }
    }

    return @($files.ToArray())
}

function AutoCommit-ScriptIfNeeded($dirtyFilesInput) {
    # Normaliza para array
    $dirtyFiles = @($dirtyFilesInput)

    if (-not $AUTO_COMMIT_SCRIPT_IF_ONLY_DIRTY) { return $false }
    if ($dirtyFiles.Count -ne 1) { return $false }
    if ($dirtyFiles[0] -ne $SCRIPT_REL_PATH) { return $false }

    Write-Host "⚠ Repo sujo apenas pelo script (${SCRIPT_REL_PATH}). Vou salvar no Git (OPÇÃO 1 automática)..."

    & git add $SCRIPT_REL_PATH
    if ($LASTEXITCODE -ne 0) { Fail "git add do script falhou" }

    & git commit -m "chore: update start-dev.ps1 (dev bootstrap)"
    if ($LASTEXITCODE -ne 0) {
        Fail "git commit falhou (configure user.name/user.email ou verifique se havia mudanças)."
    }

    & git push origin dev
    if ($LASTEXITCODE -ne 0) { Fail "git push falhou (credenciais/permissão no GitHub)" }

    Write-Host "✅ Script commitado e enviado para origin/dev."
    return $true
}

function Git-EnsureLatestDev {
    Write-Section "GIT: Forcar ultima origin/dev (blindado)"

    Set-Location $ProjectRoot
    Ensure-RepoRoot $ProjectRoot
    Ensure-Tool git "Instale o Git e reinicie o terminal/VS Code."

    $dirtyFiles = @(Get-DirtyFiles)

    if ($dirtyFiles.Count -gt 0) {
        Write-Host "⚠ Repo com alterações locais (dirty):"
        $dirtyFiles | ForEach-Object { Write-Host " - $_" }

        $didAutoCommit = AutoCommit-ScriptIfNeeded $dirtyFiles

        if (-not $didAutoCommit) {
            if ($AUTO_STASH_IF_DIRTY) {
                Write-Host "→ AUTO_STASH_IF_DIRTY=true: fazendo stash..."
                & git stash push -u -m "auto-stash start-dev.ps1"
                if ($LASTEXITCODE -ne 0) { Fail "git stash falhou" }
            } else {
                Fail "Repo sujo. Para evitar perda, abortei. Faça commit/stash, ou ative AUTO_STASH_IF_DIRTY."
            }
        }
    }

    & git fetch origin dev
    if ($LASTEXITCODE -ne 0) { Fail "git fetch origin dev falhou" }

    & git checkout dev
    if ($LASTEXITCODE -ne 0) { Fail "git checkout dev falhou" }

    & git reset --hard origin/dev
    if ($LASTEXITCODE -ne 0) { Fail "git reset --hard origin/dev falhou" }

    $originDev = (& git rev-parse "origin/dev").Trim()
    if ($LASTEXITCODE -ne 0 -or -not $originDev) { Fail "Nao consegui ler origin/dev" }

    $head = (& git rev-parse "HEAD").Trim()
    if ($LASTEXITCODE -ne 0 -or -not $head) { Fail "Nao consegui ler HEAD" }

    if ($head -ne $originDev) {
        Fail "HEAD ($head) nao bate com origin/dev ($originDev). Algo impediu o sync."
    }

    Write-Host "✅ OK: repo está EXACTAMENTE no último origin/dev"
    Write-Host "HEAD: $head"
    & git log -1 --oneline
}

function Start-FrontServer {
    Write-Section "FRONT: Subir servidor em localhost:${FrontPort}"

    Stop-PortProcess $FrontPort

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        $cmd = "python -m http.server ${FrontPort} --bind 127.0.0.1 --directory `"$ProjectRoot`""
        Start-Process powershell -ArgumentList "-NoExit","-Command",$cmd | Out-Null
        Write-Host "→ Front via Python http.server"
    } else {
        Ensure-Tool node "Instale Node.js LTS."
        $cmd = "npx --yes http-server `"$ProjectRoot`" -p ${FrontPort} -a 127.0.0.1 -c-1"
        Start-Process powershell -ArgumentList "-NoExit","-Command",$cmd | Out-Null
        Write-Host "→ Front via npx http-server (raiz forçada + cache desativado -c-1)"
    }

    Write-Host "Aguardando Front..."
    if (-not (Wait-HttpOk $FrontUrl 25)) {
        Fail "Front nao respondeu em ${FrontUrl}"
    }
    Write-Host "✅ Front OK: ${FrontUrl}"
}

function Start-SshTunnel {
    Write-Section "DB TUNNEL: Abrir SSH -L ${DbLocalPort} -> ${DbRemoteHost}:${DbRemotePort}"

    Stop-PortProcess $DbLocalPort
    Ensure-Tool ssh "Ative/instale OpenSSH Client no Windows."

    $sshCmd = "ssh -o StrictHostKeyChecking=no -o ExitOnForwardFailure=yes -p ${SshPort} -N -L ${DbLocalPort}:${DbRemoteHost}:${DbRemotePort} ${SshUser}@${VpsIp}"
    Start-Process powershell -ArgumentList "-NoExit","-Command",$sshCmd | Out-Null

    Write-Host "Aguardando túnel abrir..."
    if (-not (Wait-Port "127.0.0.1" $DbLocalPort 30)) {
        Fail "Túnel não abriu em 127.0.0.1:${DbLocalPort}"
    }
    Write-Host "✅ Túnel OK: 127.0.0.1:${DbLocalPort}"
}

function Ensure-BackendDeps {
    if (-not $AUTO_INSTALL_BACKEND_DEPS) { return }

    $nodeModules = Join-Path $ServerDir "node_modules"
    $pkgLock     = Join-Path $ServerDir "package-lock.json"

    if (Test-Path $nodeModules) { return }

    Write-Section "BACKEND: Dependências ausentes (node_modules). Instalando..."

    Set-Location $ServerDir
    Ensure-Tool npm "Instale Node.js (vem com npm)."

    if ($FORCE_NPM_CI_IF_POSSIBLE -and (Test-Path $pkgLock)) {
        Write-Host "→ Rodando: npm ci"
        & npm ci
        if ($LASTEXITCODE -ne 0) { Fail "npm ci falhou" }
    } else {
        Write-Host "→ Rodando: npm install"
        & npm install
        if ($LASTEXITCODE -ne 0) { Fail "npm install falhou" }
    }

    Set-Location $ProjectRoot
    Write-Host "✅ Dependências instaladas."
}

function Start-Backend {
    Write-Section "BACKEND: Subir npm run dev (porta ${BackendPort})"

    Stop-PortProcess $BackendPort

    if (-not (Test-Path $ServerDir)) {
        Fail "Pasta server nao encontrada: ${ServerDir}"
    }
    if (-not (Test-Path (Join-Path $ServerDir "package.json"))) {
        Fail "package.json nao encontrado em: ${ServerDir}"
    }

    Ensure-BackendDeps

    $cmd = "cd `"$ServerDir`"; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit","-Command",$cmd | Out-Null

    Write-Host "Aguardando /health..."
    if (-not (Wait-HttpOk $HealthUrl 45)) {
        Fail "Backend nao respondeu em ${HealthUrl}"
    }
    Write-Host "✅ Backend OK: ${HealthUrl}"
}

function Verify-ServingLatestDev {
    Write-Section "VERIFICACAO: provar que está servindo a última dev"

    Set-Location $ProjectRoot

    $originDev = (& git rev-parse "origin/dev").Trim()
    $head      = (& git rev-parse "HEAD").Trim()
    if ($head -ne $originDev) {
        Fail "Verificacao GIT falhou: HEAD != origin/dev (${head} != ${originDev})"
    }
    Write-Host "✅ Git OK: HEAD == origin/dev (${head})"

    $localVersionPath = Join-Path $ProjectRoot $VersionFileRelPath
    $localTxt = Read-FileText $localVersionPath
    if (-not $localTxt) {
        Write-Host "⚠ Não achei '${VersionFileRelPath}' no disco. Pulando comparação de version.json."
        return [pscustomobject]@{ Head = $head; ServedVersionObject = $null }
    }

    $servedTxt = $null
    $versionUrlWithTs = "${VersionUrl}?ts=$([DateTime]::UtcNow.Ticks)"
    try {
        $served = Invoke-WebRequest -Uri $versionUrlWithTs -UseBasicParsing -TimeoutSec 10 -Headers @{ "Cache-Control"="no-cache"; "Pragma"="no-cache" }
        $servedTxt = $served.Content
    } catch {
        Fail "Não consegui ler ${VersionUrl}. Talvez o front não esteja servindo do ProjectRoot."
    }

    $localTxt = Strip-JsonPreamble $localTxt
    $servedTxt = Strip-JsonPreamble $servedTxt

    $localObj  = Normalize-Json $localTxt
    $servedObj = Normalize-Json $servedTxt

    if ($null -eq $localObj -or $null -eq $servedObj) {
        Write-Host "❌ DIFERENÇA: Falha ao interpretar version.json local ou servido" -ForegroundColor Red
        Write-Host ("DISCO:   len={0} | preview='{1}'" -f $localTxt.Length, (Get-Preview $localTxt 30))
        Write-Host ("SERVIDO: len={0} | preview='{1}'" -f $servedTxt.Length, (Get-Preview $servedTxt 30))
        Fail "Verificação de versão falhou (relatório acima)."
    }

    $fields = @("name", "version", "build", "buildTimestamp")
    $differences = New-Object System.Collections.Generic.List[string]

    foreach ($field in $fields) {
        $localValue = [string]$localObj.$field
        $servedValue = [string]$servedObj.$field
        if ($localValue -ne $servedValue) {
            [void]$differences.Add($field)
        }
    }

    if ($differences.Count -gt 0) {
        Write-Host "❌ DIFERENÇA: version.json do DISCO != version.json SERVIDO" -ForegroundColor Red
        Write-Host "DISCO:   ${localVersionPath}"
        Write-Host "SERVIDO: ${VersionUrl}"
        Write-Host ""
        Write-Host "Campos divergentes:"
        foreach ($field in $differences) {
            $localValue = [string]$localObj.$field
            $servedValue = [string]$servedObj.$field
            Write-Host ("- {0}: local='{1}' | servido='{2}'" -f $field, $localValue, $servedValue)
        }
        Write-Host ""
        Write-Host ("DISCO  -> len={0} | preview='{1}'" -f $localTxt.Length, (Get-Preview $localTxt 30))
        Write-Host ("SERVIDO-> len={0} | preview='{1}'" -f $servedTxt.Length, (Get-Preview $servedTxt 30))
        Fail "Verificação de versão falhou (relatório acima)."
    }

    Write-Host "✅ OK: version.json servido == version.json do repo"
    Write-Host ("VERSÃO SERVIDA: {0} | build: {1} | ts: {2}" -f $servedObj.version, $servedObj.build, $servedObj.buildTimestamp)

    return [pscustomobject]@{
        Head = $head
        ServedVersionObject = [pscustomobject]@{
            name = $servedObj.name
            version = $servedObj.version
            build = $servedObj.build
            buildTimestamp = $servedObj.buildTimestamp
        }
    }
}

function Open-Browser {
    Write-Section "ABRIR: Browser + rotas"
    Start-Process $FrontUrl    | Out-Null
    Start-Process $HealthUrl   | Out-Null
    Start-Process $VersionUrl  | Out-Null
}

# =======================
# EXECUCAO
# =======================

Write-Host ""
Write-Host "=== SINGEM START DEV (BLINDADO) ==="
Write-Host "Projeto: ${ProjectRoot}"
Write-Host "Server : ${ServerDir}"
Write-Host "Front  : ${FrontUrl}"
Write-Host "Health : ${HealthUrl}"
Write-Host "Version: ${VersionUrl}"
Write-Host ""

try {
    Git-EnsureLatestDev
    Start-FrontServer
    Start-SshTunnel
    Start-Backend
    $verifyInfo = Verify-ServingLatestDev
    Open-Browser

    Write-Host ""
    Write-Host "✅ AMBIENTE DEV PRONTO E CONFIRMADO NA ÚLTIMA origin/dev" -ForegroundColor Green
    if ($verifyInfo -and $verifyInfo.Head) {
        Write-Host ("HEAD COMMIT: {0}" -f $verifyInfo.Head)
    }
    if ($verifyInfo -and $verifyInfo.ServedVersionObject) {
        Write-Host "VERSÃO SERVIDA (OBJETO):"
        $verifyInfo.ServedVersionObject | ConvertTo-Json -Depth 10
    }

    if ($SHOW_CACHE_SW_TIPS) {
        Write-Host ""
        Write-Host "DICA (se ainda parecer desatualizado no Chrome):"
        Write-Host "1) F12 -> Application -> Service Workers -> Unregister"
        Write-Host "2) Application -> Clear storage -> Clear site data"
        Write-Host "3) Recarregue com Ctrl+Shift+R"
    }

} catch {
    Write-Host ""
    Write-Host "🧯 FALHOU: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}



