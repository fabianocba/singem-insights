#Requires -Version 7.0

$ErrorActionPreference = 'SilentlyContinue'

if ([string]::IsNullOrWhiteSpace($env:SINGEM_ROOT)) {
  $env:SINGEM_ROOT = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\..'))
}

function global:Invoke-SingemEnvDoctor {
  [CmdletBinding()]
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  $doctorScript = Join-Path $env:SINGEM_ROOT 'scripts\env-doctor.ps1'
  if (-not (Test-Path -LiteralPath $doctorScript)) {
    Write-Host "[ERR] env-doctor não encontrado em: $doctorScript" -ForegroundColor Red
    return
  }

  & pwsh -NoProfile -ExecutionPolicy Bypass -File $doctorScript @Args
}

Set-Alias -Name ed -Value Invoke-SingemEnvDoctor -Scope Global -Force

Write-Host '[SINGEM] Terminal PowerShell 7 ativo (pwsh).' -ForegroundColor DarkCyan
Write-Host '[SINGEM] Comando disponível: ed [check|update|fix] [opções]' -ForegroundColor DarkCyan
