@echo off
REM ============================================
REM IFDESK - Abre Navegador SEM Cache
REM ============================================
REM Duplo-clique para abrir com cache limpo
REM Ideal para desenvolvimento e testes

echo.
echo ==========================================
echo    IFDESK - Abrindo com Cache Limpo
echo ==========================================
echo.

REM Gera timestamp para cache-busting
echo [1/2] Preparando URL sem cache...

REM Pega timestamp Unix (segundos desde 1970)
for /f "tokens=1-4 delims=:.," %%a in ("%time%") do (
    set /a "timestamp=(((%%a*60)+1%%b %% 100)*60+1%%c %% 100)*100+1%%d %% 100"
)

REM Adiciona data para unicidade
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set "datestr=%%c%%a%%b"
)

REM URL com parâmetros de cache-busting
set "url=http://localhost:8000/index.html?nocache=%datestr%%timestamp%&_=%random%"

echo      URL com cache-busting gerada

REM Abre navegador
echo.
echo [2/2] Abrindo navegador...

REM Tenta abrir com navegador padrão
start "" "%url%"

if %errorlevel% equ 0 (
    echo      [OK] Navegador aberto!
    echo.
    echo ==========================================
    echo    Aplicacao Aberta SEM Cache!
    echo ==========================================
    echo.
    echo URL Base: http://localhost:8000/index.html
    echo.
    echo [i] Cache-Busting: Ativo
    echo [i] Parametros: nocache + timestamp
    echo.
    echo Se ainda ver dados antigos:
    echo   - Pressione: Ctrl + Shift + R
    echo   - Ou: F12 ^> Application ^> Clear Storage
) else (
    echo      [ERRO] Falha ao abrir navegador
    echo.
    echo Copie e cole no navegador:
    echo %url%
)

echo.
echo Pressione qualquer tecla para fechar...
pause > nul
