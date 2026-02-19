# ============================================
# IFDESK - Abre Navegador SEM Cache
# ============================================
# Clique-direito → Executar com PowerShell
# Ou duplo-clique (se configurado)
#

Write-Host "`n==========================================" -ForegroundColor Cyan
Write-Host "   IFDESK - Abrindo com Cache Limpo" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# PASSO 1: Verifica se servidor está rodando
Write-Host "`n[1/3] Verificando servidor..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000" -Method Head -TimeoutSec 2 -ErrorAction Stop
    Write-Host "      ✅ Servidor está rodando!" -ForegroundColor Green
} catch {
    Write-Host "      ❌ Servidor NÃO está rodando!" -ForegroundColor Red
    Write-Host "`nPor favor, inicie o servidor primeiro:" -ForegroundColor Yellow
    Write-Host "  1. Execute: python -m http.server 8000" -ForegroundColor Cyan
    Write-Host "  2. Ou abra a pasta no VS Code (inicia automaticamente)" -ForegroundColor Cyan
    Write-Host "`nPressione qualquer tecla para sair..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

# PASSO 2: Gera URL com cache-busting
Write-Host "`n[2/3] Preparando URL sem cache..." -ForegroundColor Yellow

# Timestamp Unix (milissegundos)
$timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()

# Random adicional
$random = Get-Random -Minimum 10000 -Maximum 99999

# URL com múltiplos parâmetros para garantir cache-busting
$url = "http://localhost:8000/index.html?nocache=$timestamp&_=$random&v=1.3.0"

Write-Host "      ✅ URL com cache-busting gerada" -ForegroundColor Green

# PASSO 3: Abre navegador
Write-Host "`n[3/3] Abrindo navegador..." -ForegroundColor Yellow

$opened = $false

# Tentativa 1: Start-Process
try {
    Start-Process $url -ErrorAction Stop
    $opened = $true
    Write-Host "      ✅ Navegador aberto via Start-Process!" -ForegroundColor Green
} catch {
    Write-Host "      ⚠️ Tentativa 1 falhou, tentando alternativa..." -ForegroundColor Yellow
}

# Tentativa 2: cmd start
if (-not $opened) {
    try {
        cmd /c start $url
        $opened = $true
        Write-Host "      ✅ Navegador aberto via cmd!" -ForegroundColor Green
    } catch {
        Write-Host "      ⚠️ Tentativa 2 falhou, tentando explorer..." -ForegroundColor Yellow
    }
}

# Tentativa 3: explorer
if (-not $opened) {
    try {
        explorer $url
        $opened = $true
        Write-Host "      ✅ Navegador aberto via explorer!" -ForegroundColor Green
    } catch {
        Write-Host "      ❌ Erro ao abrir navegador" -ForegroundColor Red
    }
}

# Resultado
if ($opened) {
    Write-Host "`n==========================================" -ForegroundColor Green
    Write-Host "   Aplicação Aberta SEM Cache!" -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "`n📌 URL Base: http://localhost:8000/index.html" -ForegroundColor Cyan
    Write-Host "`n💡 Cache-Busting:" -ForegroundColor Yellow
    Write-Host "   ✓ Parâmetros: nocache + timestamp + random" -ForegroundColor White
    Write-Host "   ✓ Força navegador a baixar arquivos novos" -ForegroundColor White
    Write-Host "`n💡 Se ainda ver dados antigos:" -ForegroundColor Yellow
    Write-Host "   - Pressione: Ctrl + Shift + R" -ForegroundColor Cyan
    Write-Host "   - Ou: F12 → Application → Clear Storage" -ForegroundColor Cyan
} else {
    Write-Host "`n==========================================" -ForegroundColor Red
    Write-Host "   Erro ao Abrir Navegador" -ForegroundColor Red
    Write-Host "==========================================" -ForegroundColor Red
    Write-Host "`nCopie e cole no navegador:" -ForegroundColor Yellow
    Write-Host "  $url" -ForegroundColor Cyan
}

Write-Host "`nPressione qualquer tecla para fechar..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
