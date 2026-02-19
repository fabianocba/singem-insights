# Script para abrir a aplicação principal no navegador
# Uso: .\scripts\abrir-aplicacao.ps1
# ou: cd scripts; .\abrir-aplicacao.ps1

# Determina o diretório raiz do projeto
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

$url = "http://localhost:8000/index.html"
$port = 8000

Write-Host "`n╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 IFDESK - Inicialização Automática ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Verifica se Python está instalado
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
} elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
}

if (-not $pythonCmd) {
    Write-Host "❌ Python não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale Python de:" -ForegroundColor Yellow
    Write-Host "  https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "Pressione Enter para sair"
    exit 1
}

Write-Host "✅ Python encontrado: $pythonCmd" -ForegroundColor Green
Write-Host ""

# Verifica se o servidor está rodando
$serverRunning = $false
try {
    $null = Invoke-WebRequest -Uri $url -Method Head -TimeoutSec 2 -ErrorAction Stop
    $serverRunning = $true
    Write-Host "✅ Servidor já está rodando!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Servidor não está rodando" -ForegroundColor Yellow
}

# Se o servidor não está rodando, inicia automaticamente
if (-not $serverRunning) {
    Write-Host "🌐 Iniciando servidor PROXY CORS na porta $port..." -ForegroundColor Cyan
    Write-Host "   📡 Proxy: /api/* → Compras.gov.br (resolve CORS)" -ForegroundColor Yellow
    Write-Host ""
    
    # Muda para o diretório do projeto
    Push-Location $projectRoot
    
    # Inicia o servidor PROXY em background usando Start-Process
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = $pythonCmd
    $processInfo.Arguments = "proxy-server.py"
    $processInfo.WorkingDirectory = $projectRoot
    $processInfo.UseShellExecute = $true
    $processInfo.CreateNoWindow = $false
    
    $process = [System.Diagnostics.Process]::Start($processInfo)
    
    Write-Host "✅ Servidor proxy iniciado (PID: $($process.Id))" -ForegroundColor Green
    Write-Host ""
    
    # Aguarda 3 segundos para o servidor iniciar
    Write-Host "⏳ Aguardando servidor inicializar..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    
    Pop-Location
}

Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         SERVIDOR RODANDO!              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URL: " -NoNewline -ForegroundColor Yellow
Write-Host $url -ForegroundColor Cyan
Write-Host ""
Write-Host "🌐 Abrindo navegador..." -ForegroundColor Cyan

# Abre no navegador padrão
Start-Process $url

Write-Host ""
Write-Host "✅ Navegador aberto!" -ForegroundColor Green
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Yellow
Write-Host "║   ℹ️  INFORMAÇÕES IMPORTANTES           ║" -ForegroundColor Yellow
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Como usar:" -ForegroundColor Cyan
Write-Host "  1. Faça login no sistema" -ForegroundColor White
Write-Host "  2. Use as funcionalidades normalmente" -ForegroundColor White
Write-Host "  3. Módulos ES6 funcionam corretamente!" -ForegroundColor Green
Write-Host ""
Write-Host "🐛 Para ver logs de debug:" -ForegroundColor Cyan
Write-Host "  Pressione F12 → Aba Console" -ForegroundColor White
Write-Host ""
Write-Host "🛑 Para parar o servidor:" -ForegroundColor Cyan
Write-Host "  Feche a janela do Python que abriu" -ForegroundColor White
Write-Host ""
Write-Host "════════════════════════════════════════" -ForegroundColor Cyan
