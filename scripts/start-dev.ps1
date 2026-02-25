# start-dev.ps1 (versão estável)
$ErrorActionPreference = "Stop"

$ProjectRoot = "C:\SINGEM"
$ServerDir   = "C:\SINGEM\server"

$SshUserHost = "root@72.61.55.250"
$LocalPort   = 5433
$RemoteHost  = "127.0.0.1"
$RemotePort  = 5432

$PidFile     = Join-Path $ProjectRoot ".dev-session.json"
$TunnelTitle = "SINGEM - TUNEL SSH (NAO FECHAR)"
$ServerTitle = "SINGEM - SERVER (npm run dev)"

# ===== URLs (ajuste se precisar) =====
$FrontUrl  = "http://localhost:8000"
$HealthUrl = "http://localhost:3000/health"
# ====================================

Write-Host "==> Iniciando sessão SINGEM..." -ForegroundColor Cyan

# 1) Abrir túnel SSH em nova janela
Write-Host "==> Abrindo túnel SSH..." -ForegroundColor Cyan
$tunnelCmd = "powershell -NoExit -Command `$Host.UI.RawUI.WindowTitle='$TunnelTitle'; ssh -N -L $LocalPort`:$RemoteHost`:$RemotePort $SshUserHost"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "start", $tunnelCmd | Out-Null

# 2) Aguardar porta do túnel
Write-Host "==> Aguardando porta $LocalPort (túnel)..." -ForegroundColor Cyan
$ok = $false
for ($i=1; $i -le 20; $i++) {
    $ok = (Test-NetConnection 127.0.0.1 -Port $LocalPort -WarningAction SilentlyContinue).TcpTestSucceeded
    if ($ok) { break }
    Start-Sleep -Seconds 1
}
if (-not $ok) {
    Write-Host "❌ Túnel não abriu na porta $LocalPort. Veja a janela do túnel (senha/erro)." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Túnel OK (porta $LocalPort aberta)." -ForegroundColor Green

# 3) Subir server em nova janela
Write-Host "==> Iniciando servidor (npm run dev)..." -ForegroundColor Cyan
$serverCmd = "powershell -NoExit -Command `$Host.UI.RawUI.WindowTitle='$ServerTitle'; cd '$ServerDir'; npm run dev"
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "start", $serverCmd | Out-Null

# 4) Esperar um pouquinho o backend (mas não travar)
Write-Host "==> Tentando detectar backend (/health)..." -ForegroundColor Cyan
$backendOk = $false
for ($i=1; $i -le 10; $i++) {
    try {
        Invoke-WebRequest -Uri $HealthUrl -UseBasicParsing -TimeoutSec 2 | Out-Null
        $backendOk = $true
        break
    } catch {
        Start-Sleep -Seconds 1
    }
}
if ($backendOk) {
    Write-Host "✅ Backend respondeu. Abrindo Chrome..." -ForegroundColor Green
} else {
    Write-Host "⚠️ Backend ainda não respondeu, vou abrir o Chrome mesmo assim." -ForegroundColor Yellow
}

# 5) Abrir Chrome (garantido) com 2 abas
# (cmd /c start chrome abre mesmo se o chrome já estiver rodando)
Start-Process -FilePath "cmd.exe" -ArgumentList "/c", "start", "chrome", $FrontUrl, $HealthUrl | Out-Null

# 6) Salvar sessão
$session = @{
    startedAt   = (Get-Date).ToString("s")
    projectRoot = $ProjectRoot
    serverDir   = $ServerDir
    sshUserHost = $SshUserHost
    localPort   = $LocalPort
    frontUrl    = $FrontUrl
    healthUrl   = $HealthUrl
}
$session | ConvertTo-Json | Set-Content -Encoding UTF8 $PidFile

Write-Host ""
Write-Host "✅ Tudo iniciado." -ForegroundColor Green
Write-Host "   - Front:  $FrontUrl"
Write-Host "   - Health: $HealthUrl"
Write-Host "   - Sessão: $PidFile"
Write-Host "Dica: NÃO feche a janela do túnel." -ForegroundColor Yellow