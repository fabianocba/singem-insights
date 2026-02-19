# Script para iniciar servidor proxy CORS
# Resolve problema de bloqueio CORS da API do Compras.gov.br

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   INICIANDO SERVIDOR PROXY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Detecta Python
$pythonCmd = $null
foreach ($cmd in @('python', 'python3', 'py')) {
    try {
        $version = & $cmd --version 2>&1
        if ($LASTEXITCODE -eq 0) {
            $pythonCmd = $cmd
            Write-Host "`n Python encontrado: $version" -ForegroundColor Green
            break
        }
    } catch {
        continue
    }
}

if (-not $pythonCmd) {
    Write-Host "`n ERRO: Python no encontrado!" -ForegroundColor Red
    Write-Host "`nInstale Python 3.x de: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host "Durante instalao, marque 'Add Python to PATH'" -ForegroundColor Yellow
    Read-Host "`nPressione Enter para sair"
    exit 1
}

# Verifica se porta 8000 est livre
try {
    $null = Invoke-WebRequest -Uri "http://localhost:8000" -Method Head -TimeoutSec 1 -ErrorAction Stop
    Write-Host "`n  Porta 8000 j est em uso" -ForegroundColor Yellow
    Write-Host "O servidor pode j estar rodando em outra janela" -ForegroundColor Gray
    Write-Host "`nAbrindo navegador..." -ForegroundColor Cyan
    Start-Sleep -Seconds 1
    Start-Process "http://localhost:8000/index.html"
    exit 0
} catch {
    # Porta livre, continua
}

# Volta para raiz do projeto
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
Set-Location $projectRoot

# Inicia servidor proxy
Write-Host "`n Iniciando servidor proxy..." -ForegroundColor Cyan
Write-Host "Porta: 8000" -ForegroundColor White
Write-Host "URL: http://localhost:8000" -ForegroundColor White
Write-Host "`n O que o proxy faz:" -ForegroundColor Yellow
Write-Host "   1. Serve os arquivos HTML/CSS/JS normalmente" -ForegroundColor Gray
Write-Host "   2. Intercepta chamadas /api/*" -ForegroundColor Gray
Write-Host "   3. Redireciona para Compras.gov.br" -ForegroundColor Gray
Write-Host "   4. Retorna com headers CORS corretos" -ForegroundColor Gray
Write-Host "`n Aguarde o navegador abrir..." -ForegroundColor Cyan
Write-Host "`n" -ForegroundColor White

# Inicia proxy em background
$job = Start-Job -ScriptBlock {
    param($python, $serverDir, $projectRoot)
    Set-Location $projectRoot
    & $python "$serverDir\proxy-server.py"
} -ArgumentList $pythonCmd, $PSScriptRoot, $projectRoot

# Aguarda servidor iniciar
Start-Sleep -Seconds 3

# Verifica se iniciou
try {
    $null = Invoke-WebRequest -Uri "http://localhost:8000" -Method Head -TimeoutSec 2 -ErrorAction Stop
    Write-Host " Servidor iniciado com sucesso!" -ForegroundColor Green
} catch {
    Write-Host "  Servidor pode estar iniciando..." -ForegroundColor Yellow
}

# Abre navegador
Start-Process "http://localhost:8000/index.html"

Write-Host "`n========================================" -ForegroundColor Green
Write-Host "   TUDO PRONTO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host "`nNavegador aberto em: http://localhost:8000" -ForegroundColor Cyan
Write-Host "`n Prximos passos:" -ForegroundColor Yellow
Write-Host "   1. Faa login no sistema" -ForegroundColor White
Write-Host "   2. Clique em 'Consultas Diversas'" -ForegroundColor White
Write-Host "   3. Escolha uma consulta (ex: Material)" -ForegroundColor White
Write-Host "   4. Clique em 'Buscar'" -ForegroundColor White
Write-Host "`n Agora as requisies vo funcionar!" -ForegroundColor Green
Write-Host "   (sem erro de CORS)" -ForegroundColor Gray
Write-Host "`n Para parar o servidor:" -ForegroundColor Red
Write-Host "   - Feche esta janela OU" -ForegroundColor White
Write-Host "   - Pressione Ctrl+C no terminal do servidor" -ForegroundColor White
Write-Host "`n" -ForegroundColor White

# Mantm janela aberta
Write-Host "Servidor rodando (Job ID: $($job.Id))..." -ForegroundColor Gray
Write-Host "Pressione Ctrl+C para encerrar" -ForegroundColor Yellow

# Aguarda indefinidamente
try {
    Wait-Job -Job $job
} catch {
    Write-Host "`nServidor encerrado" -ForegroundColor Yellow
} finally {
    Stop-Job -Job $job -ErrorAction SilentlyContinue
    Remove-Job -Job $job -ErrorAction SilentlyContinue
}

