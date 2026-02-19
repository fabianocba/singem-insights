# Inicia o Proxy Local para API SIASG
# Contorna problemas de CORS ao acessar a API do governo federal

Write-Host "`n============================================" -ForegroundColor Cyan
Write-Host "  PROXY LOCAL - API SIASG" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Cyan

# Verificar se Python está disponível
$pythonCmd = $null
foreach ($cmd in @("python", "python3", "py")) {
    try {
        $null = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = $cmd
            break
        }
    } catch {}
}

if (-not $pythonCmd) {
    Write-Host "ERRO: Python nao encontrado!" -ForegroundColor Red
    Write-Host "Instale Python em: https://www.python.org/downloads/`n" -ForegroundColor Yellow
    pause
    exit 1
}

Write-Host "Python encontrado: $pythonCmd" -ForegroundColor Green

# Verificar se o arquivo do proxy existe
$proxyPath = "server\proxy-api-siasg.py"
if (-not (Test-Path $proxyPath)) {
    Write-Host "`nERRO: Arquivo $proxyPath nao encontrado!" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "Arquivo do proxy: OK`n" -ForegroundColor Green

# Instruções
Write-Host "INSTRUCOES:" -ForegroundColor Yellow
Write-Host "1. O proxy sera iniciado na porta 8001" -ForegroundColor White
Write-Host "2. No arquivo teste-api-siasg.html, altere:" -ForegroundColor White
Write-Host "   const API_BASE = 'http://localhost:8001'" -ForegroundColor Cyan
Write-Host "3. Mantenha esta janela aberta enquanto testa" -ForegroundColor White
Write-Host "4. Pressione Ctrl+C para parar o proxy`n" -ForegroundColor White

Write-Host "============================================`n" -ForegroundColor Cyan

# Iniciar o proxy
& $pythonCmd $proxyPath
