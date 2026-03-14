<#
.SYNOPSIS
    SINGEM — Gera certificados TLS para Docker (self-signed ou Let's Encrypt).

.DESCRIPTION
    Modo self-signed: gera certificado auto-assinado para desenvolvimento.
    Modo letsencrypt: usa Certbot via Docker para obter certificado real.

.PARAMETER Mode
    "selfsigned" para desenvolvimento ou "letsencrypt" para producao.

.PARAMETER Domain
    Dominio para o certificado. Obrigatorio para letsencrypt.

.PARAMETER Email
    Email para Let's Encrypt. Obrigatorio para letsencrypt.

.PARAMETER OutputDir
    Diretorio para salvar certificados. Padrao: ./docker/ssl

.PARAMETER DryRun
    Para letsencrypt: executa em modo staging (sem limites de rate).

.EXAMPLE
    .\docker-ssl-setup.ps1 -Mode selfsigned
    .\docker-ssl-setup.ps1 -Mode letsencrypt -Domain singem.ifbaiano.edu.br -Email admin@ifbaiano.edu.br
    .\docker-ssl-setup.ps1 -Mode letsencrypt -Domain singem.ifbaiano.edu.br -Email admin@ifbaiano.edu.br -DryRun
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("selfsigned", "letsencrypt")]
    [string]$Mode,

    [string]$Domain = "localhost",
    [string]$Email = "",
    [string]$OutputDir = "",
    [switch]$DryRun
)

Set-StrictMode -Version Latest

# --- Paths -----------------------------------------------------------
$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir

if (-not $OutputDir) {
    $OutputDir = Join-Path (Join-Path $projectRoot "docker") "ssl"
}
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null
}

# --- Banner ----------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SINGEM Docker - SSL/TLS Setup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Modo      : $Mode"
Write-Host "  Dominio   : $Domain"
Write-Host "  Destino   : $OutputDir"
Write-Host ""

# =====================================================================
# Self-Signed Certificate
# =====================================================================
if ($Mode -eq "selfsigned") {
    $certFile = Join-Path $OutputDir "fullchain.pem"
    $keyFile  = Join-Path $OutputDir "privkey.pem"

    if ((Test-Path $certFile) -and (Test-Path $keyFile)) {
        Write-Host "  [!] Certificados ja existem em $OutputDir" -ForegroundColor Yellow
        $resp = Read-Host "  Deseja sobrescrever? (s/N)"
        if ($resp -ne "s" -and $resp -ne "S") {
            Write-Host "  Operacao cancelada." -ForegroundColor Yellow
            exit 0
        }
    }

    Write-Host "  [*] Gerando certificado auto-assinado..." -ForegroundColor Cyan

    # Use OpenSSL inside a Docker container (no local install needed)
    $opensslCmd = @(
        "run", "--rm",
        "-v", "${OutputDir}:/certs",
        "alpine/openssl",
        "req", "-x509", "-nodes",
        "-days", "365",
        "-newkey", "rsa:2048",
        "-keyout", "/certs/privkey.pem",
        "-out", "/certs/fullchain.pem",
        "-subj", "/C=BR/ST=Bahia/L=Guanambi/O=IF Baiano/OU=TI/CN=$Domain",
        "-addext", "subjectAltName=DNS:$Domain,DNS:localhost,IP:127.0.0.1"
    )

    & docker @opensslCmd 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Falha ao gerar certificado." -ForegroundColor Red
        exit 1
    }

    Write-Host "  [OK] Certificado auto-assinado gerado!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Arquivos criados:" -ForegroundColor White
    Write-Host "    - $certFile"
    Write-Host "    - $keyFile"
    Write-Host ""
    Write-Host "  Para usar com Docker Compose, adicione ao docker-compose.prod.yml:" -ForegroundColor Yellow
    Write-Host "    frontend:"
    Write-Host "      volumes:"
    Write-Host "        - ./docker/ssl:/etc/nginx/ssl:ro"
    Write-Host "        - ./docker/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro"
    Write-Host ""
    Write-Host "  NOTA: Navegadores mostrarao aviso de seguranca (certificado auto-assinado)." -ForegroundColor Yellow

    exit 0
}

# =====================================================================
# Let's Encrypt (Certbot via Docker)
# =====================================================================
if ($Mode -eq "letsencrypt") {
    if (-not $Email) {
        Write-Host "  [FAIL] -Email e obrigatorio para Let's Encrypt." -ForegroundColor Red
        exit 1
    }
    if ($Domain -eq "localhost") {
        Write-Host "  [FAIL] -Domain nao pode ser 'localhost' para Let's Encrypt." -ForegroundColor Red
        exit 1
    }

    $certbotData = Join-Path $projectRoot "certbot"
    $webroot     = Join-Path $certbotData "www"
    $letsencryptDir = Join-Path $certbotData "conf"

    if (-not (Test-Path $webroot)) { New-Item -ItemType Directory -Path $webroot -Force | Out-Null }
    if (-not (Test-Path $letsencryptDir)) { New-Item -ItemType Directory -Path $letsencryptDir -Force | Out-Null }

    Write-Host "  [*] Verificando se o dominio $Domain aponta para este servidor..." -ForegroundColor Cyan
    Write-Host "  [!] Certifique-se que a porta 80 esta acessivel da internet." -ForegroundColor Yellow
    Write-Host ""

    # 1. Start temp nginx for ACME challenge
    Write-Host "  [*] Iniciando nginx temporario para ACME challenge..." -ForegroundColor Cyan

    $nginxTempConf = @(
        "server {"
        "    listen 80;"
        "    server_name $Domain;"
        "    location /.well-known/acme-challenge/ {"
        "        root /var/www/certbot;"
        "    }"
        "    location / {"
        "        return 200 'SINGEM SSL Setup';"
        "        add_header Content-Type text/plain;"
        "    }"
        "}"
    ) -join "`n"

    $tempConfPath = Join-Path $certbotData "nginx-acme.conf"
    $nginxTempConf | Set-Content -Path $tempConfPath -Encoding UTF8

    & docker run --rm -d `
        --name singem-acme-nginx `
        -p "80:80" `
        -v "${tempConfPath}:/etc/nginx/conf.d/default.conf:ro" `
        -v "${webroot}:/var/www/certbot:ro" `
        nginx:alpine 2>&1

    if ($LASTEXITCODE -ne 0) {
        Write-Host "  [FAIL] Nao foi possivel iniciar nginx temporario." -ForegroundColor Red
        exit 1
    }

    Start-Sleep -Seconds 3

    # 2. Run certbot
    Write-Host "  [*] Executando Certbot..." -ForegroundColor Cyan

    $certbotArgs = @(
        "run", "--rm",
        "-v", "${letsencryptDir}:/etc/letsencrypt",
        "-v", "${webroot}:/var/www/certbot",
        "certbot/certbot",
        "certonly",
        "--webroot",
        "--webroot-path", "/var/www/certbot",
        "-d", $Domain,
        "--email", $Email,
        "--agree-tos",
        "--no-eff-email"
    )

    if ($DryRun) {
        $certbotArgs += "--staging"
        Write-Host "  [!] Modo staging (dry-run) - certificado de teste." -ForegroundColor Yellow
    }

    & docker @certbotArgs 2>&1
    $certbotExit = $LASTEXITCODE

    # 3. Cleanup temp nginx
    docker stop singem-acme-nginx 2>$null

    if ($certbotExit -ne 0) {
        Write-Host "  [FAIL] Certbot falhou (exit code $certbotExit)." -ForegroundColor Red
        Write-Host "  Verifique se o dominio aponta para este servidor e a porta 80 esta acessivel." -ForegroundColor Yellow
        exit 1
    }

    # 4. Copy certs to ssl dir
    $livePath = Join-Path $letsencryptDir "live" $Domain
    if (Test-Path $livePath) {
        Copy-Item -Path (Join-Path $livePath "fullchain.pem") -Destination (Join-Path $OutputDir "fullchain.pem") -Force
        Copy-Item -Path (Join-Path $livePath "privkey.pem")   -Destination (Join-Path $OutputDir "privkey.pem") -Force
    }

    Write-Host ""
    Write-Host "  [OK] Certificado Let's Encrypt obtido com sucesso!" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Arquivos:" -ForegroundColor White
    Write-Host "    - $(Join-Path $OutputDir 'fullchain.pem')"
    Write-Host "    - $(Join-Path $OutputDir 'privkey.pem')"
    Write-Host ""
    Write-Host "  Renovacao automatica:" -ForegroundColor Yellow
    Write-Host "    Agende no cron/Task Scheduler (a cada 60 dias):"
    Write-Host "    docker run --rm -v ${letsencryptDir}:/etc/letsencrypt -v ${webroot}:/var/www/certbot certbot/certbot renew"
    Write-Host ""
    Write-Host "  Para usar com Docker Compose, adicione ao frontend:" -ForegroundColor Yellow
    Write-Host "    volumes:"
    Write-Host "      - ./docker/ssl:/etc/nginx/ssl:ro"
    Write-Host "      - ./docker/nginx-ssl.conf:/etc/nginx/conf.d/default.conf:ro"
    Write-Host "    ports:"
    Write-Host '      - "443:443"'
    Write-Host '      - "80:80"'

    exit 0
}
