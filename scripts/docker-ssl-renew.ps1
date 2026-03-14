<#
.SYNOPSIS
    SINGEM — Renovacao automatica de certificados Let's Encrypt.

.DESCRIPTION
    Renova certificados via Certbot (Docker), copia para docker/ssl/ e
    recarrega o nginx sem downtime. Pode ser instalado como tarefa
    agendada no Windows Task Scheduler.

    Fluxo:
      1. Executa certbot renew via Docker
      2. Copia certificados atualizados para docker/ssl/
      3. Faz reload do nginx (sem restart)
      4. Notifica via webhook (opcional)

.PARAMETER Domain
    Dominio do certificado. Obrigatorio.

.PARAMETER Install
    Instala tarefa agendada (a cada 30 dias, 03:00).

.PARAMETER Uninstall
    Remove a tarefa agendada.

.PARAMETER WebhookUrl
    URL do webhook para notificacao (Slack/Teams/generico).

.PARAMETER DryRun
    Executa certbot com --dry-run (nao altera certificados).

.PARAMETER Force
    Forca renovacao mesmo que o certificado nao tenha expirado.

.EXAMPLE
    .\docker-ssl-renew.ps1 -Domain singem.ifbaiano.edu.br
    .\docker-ssl-renew.ps1 -Domain singem.ifbaiano.edu.br -DryRun
    .\docker-ssl-renew.ps1 -Domain singem.ifbaiano.edu.br -Install
    .\docker-ssl-renew.ps1 -Domain singem.ifbaiano.edu.br -Uninstall
#>

[CmdletBinding()]
param(
    [string]$Domain = "",
    [switch]$Install,
    [switch]$Uninstall,
    [string]$WebhookUrl = "",
    [switch]$DryRun,
    [switch]$Force
)

Set-StrictMode -Version Latest

# --- Paths -----------------------------------------------------------
$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
$sslDir      = Join-Path (Join-Path $projectRoot "docker") "ssl"
$certbotDir  = Join-Path $projectRoot "certbot"
$certbotConf = Join-Path $certbotDir "conf"
$certbotWww  = Join-Path $certbotDir "www"

$taskName = "SINGEM-SSL-Renew"

# --- Banner ----------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SINGEM Docker - SSL Certificate Renewal" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Dominio   : $(if ($Domain) { $Domain } else { '(nao definido)' })"
Write-Host "  Projeto   : $projectRoot"
Write-Host "  DryRun    : $DryRun"
Write-Host ""

# --- Funcoes ---------------------------------------------------------
function Send-Webhook {
    param([string]$Message, [string]$Status)
    if (-not $WebhookUrl) { return }
    try {
        $body = @{
            text    = $Message
            status  = $Status
            source  = "singem-ssl-renew"
            domain  = $Domain
            time    = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
        } | ConvertTo-Json -Depth 3

        Invoke-RestMethod -Uri $WebhookUrl -Method Post -Body $body `
            -ContentType "application/json" -TimeoutSec 10 | Out-Null
        Write-Host "  [*] Webhook enviado." -ForegroundColor Gray
    }
    catch {
        Write-Host "  [!] Falha ao enviar webhook: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

function Test-DockerRunning {
    try {
        $out = & docker info 2>&1
        if ($LASTEXITCODE -ne 0) { return $false }
        return $true
    }
    catch { return $false }
}

# --- Uninstall -------------------------------------------------------
if ($Uninstall) {
    Write-Host "  [*] Removendo tarefa agendada '$taskName'..." -ForegroundColor Cyan
    try {
        $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existing) {
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
            Write-Host "  [OK] Tarefa removida." -ForegroundColor Green
        }
        else {
            Write-Host "  [!] Tarefa nao encontrada." -ForegroundColor Yellow
        }
    }
    catch {
        Write-Host "  [FAIL] Erro: $($_.Exception.Message)" -ForegroundColor Red
    }
    exit 0
}

# --- Install ---------------------------------------------------------
if ($Install) {
    if (-not $Domain) {
        Write-Host "  [FAIL] -Domain e obrigatorio para -Install." -ForegroundColor Red
        exit 1
    }

    Write-Host "  [*] Instalando tarefa agendada '$taskName'..." -ForegroundColor Cyan

    $scriptPath = $MyInvocation.MyCommand.Definition
    $arguments  = "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -Domain `"$Domain`""
    if ($WebhookUrl) {
        $arguments += " -WebhookUrl `"$WebhookUrl`""
    }

    $action  = New-ScheduledTaskAction -Execute "powershell.exe" -Argument $arguments -WorkingDirectory $projectRoot
    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday,Thursday -At "03:00"
    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

    try {
        $existing = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
        if ($existing) {
            Set-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings | Out-Null
            Write-Host "  [OK] Tarefa atualizada." -ForegroundColor Green
        }
        else {
            Register-ScheduledTask -TaskName $taskName `
                -Action $action -Trigger $trigger -Settings $settings `
                -Description "SINGEM - Renovacao automatica de certificado SSL Let's Encrypt" `
                -RunLevel Highest | Out-Null
            Write-Host "  [OK] Tarefa criada." -ForegroundColor Green
        }
        Write-Host ""
        Write-Host "  Agendamento: Segunda e Quinta as 03:00" -ForegroundColor White
        Write-Host "  Dominio    : $Domain" -ForegroundColor White
        Write-Host ""
    }
    catch {
        Write-Host "  [FAIL] Erro: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
    exit 0
}

# --- Validacoes ------------------------------------------------------
if (-not $Domain) {
    Write-Host "  [FAIL] -Domain e obrigatorio." -ForegroundColor Red
    Write-Host ""
    Write-Host "  Uso:" -ForegroundColor Yellow
    Write-Host "    .\docker-ssl-renew.ps1 -Domain singem.ifbaiano.edu.br"
    Write-Host "    .\docker-ssl-renew.ps1 -Domain singem.ifbaiano.edu.br -DryRun"
    Write-Host "    .\docker-ssl-renew.ps1 -Domain singem.ifbaiano.edu.br -Install"
    Write-Host ""

    # Mostrar status da tarefa agendada
    $task = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
    if ($task) {
        $info = $task | Get-ScheduledTaskInfo
        Write-Host "  Tarefa agendada: INSTALADA" -ForegroundColor Green
        Write-Host "  Estado         : $($task.State)"
        Write-Host "  Ultima execucao: $(if ($info.LastRunTime -and $info.LastRunTime -ne [datetime]::MinValue) { $info.LastRunTime } else { 'nunca' })"
    }
    else {
        Write-Host "  Tarefa agendada: nao instalada" -ForegroundColor Yellow
    }

    # Verificar validade do certificado atual
    $certFile = Join-Path $sslDir "fullchain.pem"
    if (Test-Path $certFile) {
        $certInfo = & docker run --rm -v "${sslDir}:/certs:ro" alpine/openssl x509 -enddate -noout -in /certs/fullchain.pem 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host ""
            Write-Host "  Certificado atual: $certInfo" -ForegroundColor White
        }
    }

    exit 0
}

if (-not (Test-DockerRunning)) {
    Write-Host "  [FAIL] Docker nao esta rodando." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $certbotConf)) {
    Write-Host "  [FAIL] Diretorio certbot nao encontrado: $certbotConf" -ForegroundColor Red
    Write-Host "  Execute primeiro: .\docker-ssl-setup.ps1 -Mode letsencrypt -Domain $Domain -Email <email>" -ForegroundColor Yellow
    exit 1
}

# --- Renovacao -------------------------------------------------------
Write-Host "  [*] Executando certbot renew..." -ForegroundColor Cyan

$certbotArgs = @(
    "run", "--rm",
    "-v", "${certbotConf}:/etc/letsencrypt",
    "-v", "${certbotWww}:/var/www/certbot",
    "certbot/certbot",
    "renew"
)

if ($DryRun) {
    $certbotArgs += "--dry-run"
    Write-Host "  [!] Modo dry-run: nenhum certificado sera alterado." -ForegroundColor Yellow
}

if ($Force) {
    $certbotArgs += "--force-renewal"
    Write-Host "  [!] Forca renovacao (--force-renewal)." -ForegroundColor Yellow
}

$output = & docker @certbotArgs 2>&1
$exitCode = $LASTEXITCODE

$outputText = $output -join "`n"
Write-Host $outputText

if ($exitCode -ne 0) {
    Write-Host ""
    Write-Host "  [FAIL] Certbot falhou (exit code $exitCode)." -ForegroundColor Red
    Send-Webhook -Message "SINGEM SSL Renew FALHOU para $Domain (exit $exitCode)" -Status "error"
    exit 1
}

# --- Verificar se houve renovacao ------------------------------------
$renewed = $outputText -match "Congratulations|renewed|successfully"
$noRenewal = $outputText -match "No renewals were attempted|not yet due"

if ($DryRun) {
    Write-Host ""
    Write-Host "  [OK] Dry-run concluido com sucesso." -ForegroundColor Green
    Send-Webhook -Message "SINGEM SSL Renew dry-run OK para $Domain" -Status "ok"
    exit 0
}

if ($noRenewal) {
    Write-Host ""
    Write-Host "  [OK] Certificado ainda valido, sem necessidade de renovacao." -ForegroundColor Green
    Send-Webhook -Message "SINGEM SSL: Certificado $Domain ainda valido, sem renovacao necessaria." -Status "ok"
    exit 0
}

# --- Copiar certificados atualizados --------------------------------
if ($renewed) {
    Write-Host ""
    Write-Host "  [*] Copiando certificados atualizados para $sslDir..." -ForegroundColor Cyan

    $livePath = Join-Path (Join-Path (Join-Path $certbotConf "live") $Domain) ""
    $fullchain = Join-Path $livePath "fullchain.pem"
    $privkey   = Join-Path $livePath "privkey.pem"

    if ((Test-Path $fullchain) -and (Test-Path $privkey)) {
        if (-not (Test-Path $sslDir)) {
            New-Item -ItemType Directory -Path $sslDir -Force | Out-Null
        }
        Copy-Item -Path $fullchain -Destination (Join-Path $sslDir "fullchain.pem") -Force
        Copy-Item -Path $privkey   -Destination (Join-Path $sslDir "privkey.pem") -Force
        Write-Host "  [OK] Certificados copiados." -ForegroundColor Green
    }
    else {
        Write-Host "  [!] Arquivos live nao encontrados em $livePath" -ForegroundColor Yellow
        Write-Host "  Verifique manualmente: $certbotConf" -ForegroundColor Yellow
    }

    # --- Reload nginx (sem downtime) ---------------------------------
    Write-Host "  [*] Recarregando nginx..." -ForegroundColor Cyan

    $nginxContainer = & docker ps --filter "name=singem-frontend" --format "{{.Names}}" 2>&1
    if ($nginxContainer -and $nginxContainer -match "singem-frontend") {
        & docker exec $nginxContainer nginx -s reload 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "  [OK] Nginx recarregado com sucesso." -ForegroundColor Green
        }
        else {
            Write-Host "  [!] Falha ao recarregar nginx. Pode ser necessario restart manual." -ForegroundColor Yellow
        }
    }
    else {
        Write-Host "  [!] Container singem-frontend nao encontrado. Reload nao executado." -ForegroundColor Yellow
    }

    Send-Webhook -Message "SINGEM SSL: Certificado $Domain renovado e nginx recarregado com sucesso!" -Status "ok"
}

Write-Host ""
Write-Host "  [OK] Processo de renovacao concluido." -ForegroundColor Green
Write-Host ""
exit 0
