<#
.SYNOPSIS
    SINGEM — Gerencia agendamento automatico de backup no Windows Task Scheduler.

.DESCRIPTION
    Cria ou remove uma tarefa agendada que executa docker-backup.ps1
    diariamente no horario configurado.

.PARAMETER Install
    Cria a tarefa agendada.

.PARAMETER Uninstall
    Remove a tarefa agendada.

.PARAMETER Hour
    Hora de execucao (0-23). Padrao: 2

.PARAMETER Minute
    Minuto de execucao (0-59). Padrao: 0

.PARAMETER Keep
    Numero de backups a manter na rotacao. Padrao: 10

.PARAMETER Format
    Formato do backup: custom ou sql. Padrao: custom

.PARAMETER WebhookUrl
    URL de webhook para notificacao apos backup. Opcional.

.PARAMETER TaskName
    Nome da tarefa no Task Scheduler. Padrao: SINGEM-DockerBackup

.EXAMPLE
    .\docker-backup-scheduler.ps1 -Install
    .\docker-backup-scheduler.ps1 -Install -Hour 3 -Minute 30 -Keep 7
    .\docker-backup-scheduler.ps1 -Install -WebhookUrl "https://hooks.slack.com/xxx"
    .\docker-backup-scheduler.ps1 -Uninstall
#>

[CmdletBinding()]
param(
    [switch]$Install,
    [switch]$Uninstall,
    [ValidateRange(0, 23)]
    [int]$Hour = 2,
    [ValidateRange(0, 59)]
    [int]$Minute = 0,
    [int]$Keep = 10,
    [ValidateSet("custom", "sql")]
    [string]$Format = "custom",
    [string]$WebhookUrl = "",
    [string]$TaskName = "SINGEM-DockerBackup"
)

Set-StrictMode -Version Latest

$scriptDir   = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Split-Path -Parent $scriptDir
$backupScript = Join-Path $scriptDir "docker-backup.ps1"

# --- Banner ----------------------------------------------------------
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " SINGEM Docker - Backup Scheduler" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# --- Uninstall -------------------------------------------------------
if ($Uninstall) {
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "  [OK] Tarefa '$TaskName' removida com sucesso." -ForegroundColor Green
    } else {
        Write-Host "  [!] Tarefa '$TaskName' nao encontrada." -ForegroundColor Yellow
    }
    exit 0
}

# --- Install ---------------------------------------------------------
if ($Install) {
    if (-not (Test-Path $backupScript)) {
        Write-Host "  [FAIL] Script de backup nao encontrado: $backupScript" -ForegroundColor Red
        exit 1
    }

    # Build argument list for docker-backup.ps1
    $backupArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -Keep $Keep -Format $Format"
    if ($WebhookUrl) {
        $backupArgs += " -WebhookUrl `"$WebhookUrl`""
    }

    $timeStr = "{0:D2}:{1:D2}" -f $Hour, $Minute

    Write-Host "  Tarefa     : $TaskName"
    Write-Host "  Horario    : $timeStr (diario)"
    Write-Host "  Retencao   : $Keep backups"
    Write-Host "  Formato    : $Format"
    if ($WebhookUrl) { Write-Host "  Webhook    : configurado" }
    Write-Host "  Script     : $backupScript"
    Write-Host ""

    # Check for existing task
    $existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if ($existing) {
        Write-Host "  [!] Tarefa '$TaskName' ja existe. Substituindo..." -ForegroundColor Yellow
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    }

    # Create scheduled task
    $action = New-ScheduledTaskAction `
        -Execute "pwsh.exe" `
        -Argument $backupArgs `
        -WorkingDirectory $projectRoot

    $trigger = New-ScheduledTaskTrigger -Daily -At $timeStr

    $settings = New-ScheduledTaskSettingsSet `
        -AllowStartIfOnBatteries `
        -DontStopIfGoingOnBatteries `
        -StartWhenAvailable `
        -RunOnlyIfNetworkAvailable `
        -ExecutionTimeLimit (New-TimeSpan -Minutes 30)

    $principal = New-ScheduledTaskPrincipal `
        -UserId "$env:USERDOMAIN\$env:USERNAME" `
        -LogonType S4U `
        -RunLevel Highest

    try {
        Register-ScheduledTask `
            -TaskName $TaskName `
            -Action $action `
            -Trigger $trigger `
            -Settings $settings `
            -Principal $principal `
            -Description "SINGEM - Backup diario do PostgreSQL Docker (docker-backup.ps1)" | Out-Null

        Write-Host "  [OK] Tarefa '$TaskName' criada com sucesso!" -ForegroundColor Green
        Write-Host ""
        Write-Host "  Para verificar:" -ForegroundColor White
        Write-Host "    Get-ScheduledTask -TaskName '$TaskName'"
        Write-Host ""
        Write-Host "  Para executar manualmente:" -ForegroundColor White
        Write-Host "    Start-ScheduledTask -TaskName '$TaskName'"
        Write-Host ""
        Write-Host "  Para ver no Task Scheduler GUI:" -ForegroundColor White
        Write-Host "    taskschd.msc"
    } catch {
        Write-Host "  [FAIL] Erro ao criar tarefa: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host ""
        Write-Host "  NOTA: Pode ser necessario executar como Administrador." -ForegroundColor Yellow
        exit 1
    }

    exit 0
}

# --- No action specified ---------------------------------------------
Write-Host "  Use -Install para criar ou -Uninstall para remover o agendamento." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Exemplos:" -ForegroundColor White
Write-Host "    .\docker-backup-scheduler.ps1 -Install"
Write-Host "    .\docker-backup-scheduler.ps1 -Install -Hour 3 -Minute 30 -Keep 5"
Write-Host "    .\docker-backup-scheduler.ps1 -Uninstall"

# Show current status
$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Write-Host ""
    Write-Host "  Status atual: $($existing.State)" -ForegroundColor Cyan
    $info = $existing | Get-ScheduledTaskInfo -ErrorAction SilentlyContinue
    if ($info -and $info.LastRunTime) {
        Write-Host "  Ultima execucao: $($info.LastRunTime)"
        Write-Host "  Resultado: $($info.LastTaskResult)"
    }
    if ($info -and $info.NextRunTime) {
        Write-Host "  Proxima execucao: $($info.NextRunTime)"
    }
} else {
    Write-Host ""
    Write-Host "  Status: nao instalado" -ForegroundColor DarkGray
}
