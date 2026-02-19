# ============================================
# Iniciar IFDESK com servidor SEM CACHE
# ============================================
# 
# Este script inicia o servidor HTTP local
# com configuração que DESABILITA cache do navegador
# para evitar problemas com arquivos JavaScript em cache
#

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "🚀 IFDESK - Iniciando Servidor SEM CACHE" -ForegroundColor Yellow
Write-Host "========================================`n" -ForegroundColor Cyan

# Verifica se http-server está instalado
$httpServerExists = Get-Command http-server -ErrorAction SilentlyContinue

if (-not $httpServerExists) {
    Write-Host "❌ http-server não encontrado!" -ForegroundColor Red
    Write-Host "`nInstalando http-server globalmente...`n" -ForegroundColor Yellow
    npm install -g http-server
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "`n❌ Erro ao instalar http-server!" -ForegroundColor Red
        Write-Host "Execute manualmente: npm install -g http-server" -ForegroundColor Yellow
        Read-Host "`nPressione Enter para sair"
        exit 1
    }
}

Write-Host "✅ http-server encontrado`n" -ForegroundColor Green

# Inicia o servidor com cache DESABILITADO
Write-Host "🔧 Configurações do servidor:" -ForegroundColor Cyan
Write-Host "   - Porta: 8000" -ForegroundColor White
Write-Host "   - Cache: DESABILITADO (no-cache)" -ForegroundColor White
Write-Host "   - CORS: Habilitado" -ForegroundColor White
Write-Host "   - Gzip: Desabilitado (para debug)" -ForegroundColor White

Write-Host "`n🌐 Servidor iniciado em:" -ForegroundColor Green
Write-Host "   http://localhost:8000" -ForegroundColor Cyan
Write-Host "   http://127.0.0.1:8000" -ForegroundColor Cyan

Write-Host "`n💡 Dica:" -ForegroundColor Yellow
Write-Host "   Com cache desabilitado, você NÃO precisa" -ForegroundColor White
Write-Host "   fazer CTRL+F5 toda vez!`n" -ForegroundColor White

Write-Host "========================================`n" -ForegroundColor Cyan

# Inicia servidor com:
# -c-1 = cache DESABILITADO (força revalidação)
# -p 8000 = porta 8000
# --cors = habilita CORS
# -g false = desabilita gzip para facilitar debug
http-server -c-1 -p 8000 --cors -g false
