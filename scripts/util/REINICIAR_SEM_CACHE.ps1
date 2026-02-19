# ============================================
# IFDESK - Reiniciar com Cache Limpo
# ============================================
#
# Este script:
# 1. Mata processos antigos na porta 8000
# 2. Inicia servidor com cache desabilitado
# 3. Abre navegador com parâmetros de cache limpo
#

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   IFDESK - Reiniciar SEM Cache" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# PASSO 1: Encerrar processos antigos
Write-Host "1. Encerrando processos na porta 8000..." -ForegroundColor Yellow

try {
    $connections = Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue
    if ($connections) {
        $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($pid in $pids) {
            Write-Host "   Encerrando PID: $pid" -ForegroundColor Gray
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
        Write-Host "   ✅ Processos encerrados" -ForegroundColor Green
    } else {
        Write-Host "   ℹ️ Nenhum processo encontrado" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ⚠️ Não foi possível verificar processos" -ForegroundColor Yellow
}

# PASSO 2: Detectar Python
Write-Host "`n2. Detectando Python..." -ForegroundColor Yellow

$pythonCmd = $null
foreach ($cmd in @('python', 'python3', 'py')) {
    try {
        $version = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = $cmd
            Write-Host "   ✅ Python encontrado: $version" -ForegroundColor Green
            break
        }
    } catch { continue }
}

if (-not $pythonCmd) {
    Write-Host "`n   ❌ ERRO: Python não encontrado!" -ForegroundColor Red
    Write-Host "   Instale Python 3.x e tente novamente" -ForegroundColor Yellow
    Read-Host "`nPressione Enter para sair"
    exit 1
}

# PASSO 3: Criar servidor com cache desabilitado
Write-Host "`n3. Configurando servidor SEM cache..." -ForegroundColor Yellow

$serverScript = @"
import http.server
import socketserver
from datetime import datetime

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Headers para desabilitar cache completamente
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def log_message(self, format, *args):
        # Log personalizado
        print(f'[{datetime.now().strftime("%H:%M:%S")}] {format % args}')

PORT = 8000
Handler = NoCacheHTTPRequestHandler

print(f'[{datetime.now().strftime("%H:%M:%S")}] ========================================')
print(f'[{datetime.now().strftime("%H:%M:%S")}] IFDESK - Servidor SEM Cache')
print(f'[{datetime.now().strftime("%H:%M:%S")}] ========================================')
print(f'[{datetime.now().strftime("%H:%M:%S")}] Porta: {PORT}')
print(f'[{datetime.now().strftime("%H:%M:%S")}] URL: http://localhost:{PORT}')
print(f'[{datetime.now().strftime("%H:%M:%S")}] Cache: DESABILITADO')
print(f'[{datetime.now().strftime("%H:%M:%S")}] ========================================')
print(f'[{datetime.now().strftime("%H:%M:%S")}] Pressione Ctrl+C para parar')
print(f'[{datetime.now().strftime("%H:%M:%S")}] ========================================')

with socketserver.TCPServer(('', PORT), Handler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print(f'\n[{datetime.now().strftime("%H:%M:%S")}] Servidor encerrado')
"@

# Salva script temporário
$tempScript = Join-Path $env:TEMP "ifdesk_nocache_server.py"
$serverScript | Out-File -FilePath $tempScript -Encoding UTF8

Write-Host "   ✅ Servidor configurado" -ForegroundColor Green

# PASSO 4: Iniciar servidor em background
Write-Host "`n4. Iniciando servidor..." -ForegroundColor Yellow

$serverProcess = Start-Process -FilePath $pythonCmd -ArgumentList $tempScript -PassThru -WindowStyle Hidden

# Aguarda servidor iniciar
Start-Sleep -Seconds 2

# Verifica se iniciou
$serverOk = $false
try {
    $null = Invoke-WebRequest -Uri "http://localhost:8000" -Method Head -TimeoutSec 2 -ErrorAction Stop
    $serverOk = $true
    Write-Host "   ✅ Servidor iniciado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Servidor pode ainda estar iniciando..." -ForegroundColor Yellow
}

# PASSO 5: Abrir navegador com cache limpo
Write-Host "`n5. Abrindo navegador..." -ForegroundColor Yellow

# URL com parâmetro de cache-bust
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$url = "http://localhost:8000/index.html?nocache=$timestamp"

try {
    Start-Process $url
    Write-Host "   ✅ Navegador aberto!" -ForegroundColor Green
} catch {
    Write-Host "   ⚠️ Erro ao abrir navegador" -ForegroundColor Yellow
    Write-Host "   Abra manualmente: $url" -ForegroundColor Cyan
}

# RESUMO FINAL
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   Sistema Iniciado (Modo Sem Cache)" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`n📌 URL: http://localhost:8000/index.html" -ForegroundColor Cyan
Write-Host "`n💡 IMPORTANTE:" -ForegroundColor Yellow
Write-Host "   - Cache do servidor: DESABILITADO" -ForegroundColor White
Write-Host "   - Arquivos sempre atualizados" -ForegroundColor White
Write-Host "   - Ideal para desenvolvimento" -ForegroundColor White
Write-Host "`n💡 AINDA VER ERRO?" -ForegroundColor Yellow
Write-Host "   No navegador, pressione:" -ForegroundColor White
Write-Host "   - Ctrl + Shift + R (hard refresh)" -ForegroundColor Cyan
Write-Host "   - Ou F12 → Application → Clear Storage" -ForegroundColor Cyan
Write-Host "`n⚠️ Para parar o servidor:" -ForegroundColor Yellow
Write-Host "   - Feche este terminal" -ForegroundColor White
Write-Host "   - Ou execute: Stop-Process -Id $($serverProcess.Id)" -ForegroundColor Gray
Write-Host "`n"

# Mantém terminal aberto
Write-Host "Pressione qualquer tecla para fechar (servidor continuará rodando)..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Limpa script temporário ao fechar
# Remove-Item $tempScript -ErrorAction SilentlyContinue
