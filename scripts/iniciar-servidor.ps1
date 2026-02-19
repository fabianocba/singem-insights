# Script para iniciar servidor HTTP local para teste do neParser
# Uso: .\iniciar-servidor.ps1

Write-Host "🚀 Iniciando servidor HTTP local..." -ForegroundColor Green
Write-Host "📁 Diretório: $PWD" -ForegroundColor Cyan
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

if ($pythonCmd) {
    Write-Host "✅ Python encontrado: $pythonCmd" -ForegroundColor Green
    Write-Host ""
    Write-Host "🌐 Servidor rodando em:" -ForegroundColor Yellow
    Write-Host "   http://localhost:8000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📄 Para testar o parser, abra:" -ForegroundColor Yellow
    Write-Host "   http://localhost:8000/teste-ne-parser.html" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "⛔ Para parar o servidor, pressione Ctrl+C" -ForegroundColor Red
    Write-Host ""
    
    & $pythonCmd -m http.server 8000
} else {
    Write-Host "❌ Python não encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale Python de:" -ForegroundColor Yellow
    Write-Host "  https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Ou use Node.js com:" -ForegroundColor Yellow
    Write-Host "  npx http-server -p 8000" -ForegroundColor Cyan
}
