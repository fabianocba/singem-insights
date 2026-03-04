[CmdletBinding()]
param(
  [switch]$OnlyStop,
  [switch]$DryRun,
  [switch]$SkipIntegrationTests,
  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev',
  [string]$ProjectRoot = (Get-Location).Path,
  [string]$SshHost = 'srv1401818.hstgr.cloud',
  [int]$SshPort = 2222,
  [int]$DbLocalPort = 5433,
  [int]$DbRemotePort = 5432,
  [int]$BackendPort = 3000,
  [int]$FrontendPort = 8000
)

if ($OnlyStop) {
  $devUpPath = Join-Path $PSScriptRoot 'dev-up.ps1'
  if (-not (Test-Path -LiteralPath $devUpPath)) {
    Write-Host '[ERR] scripts\dev-up.ps1 não encontrado.' -ForegroundColor Red
    exit 1
  }

  $forwardArgs = @{
    Action = 'stop'
    Branch = $Branch
    ProjectRoot = $ProjectRoot
    SshHost = $SshHost
    SshPort = $SshPort
    DbLocalPort = $DbLocalPort
    DbRemotePort = $DbRemotePort
    BackendPort = $BackendPort
    FrontendPort = $FrontendPort
  }

  & $devUpPath @forwardArgs

  exit $LASTEXITCODE
}

Write-Host ""
Write-Host ("=== SINGEM STOP {0} + TEST + COMMIT + PUSH (SESSION + SMART) ===" -f $Branch.ToUpperInvariant())
Write-Host ""

$BackendHost = "127.0.0.1"
$FrontPort   = $FrontendPort
$TunnelPort  = $DbLocalPort
$BackendHealthUrl = "http://localhost:$BackendPort/health"

$GitRemote = "origin"
$GitBranch = $Branch
$RunIntegrationTests = (-not $DryRun) -and (-not $SkipIntegrationTests)
$IgnoreDirtyRegex = "(?!)"
$ReleaseFilesRegex = "(version\.json|server/package\.json)$"
$AllowInfraFallbackForDev = ($GitBranch -eq 'dev')

if ($DryRun) {
  Write-Host "[INFO] Modo DRY-RUN ativo: sem alterações em arquivos, sem commit/push e sem encerramento de serviços."
}

if ($SkipIntegrationTests) {
  Write-Host "[WARN] Testes de integração desativados por parâmetro (-SkipIntegrationTests)."
}

function Invoke-Step {
  param([string]$Label,[scriptblock]$Cmd)

  if ($DryRun) {
    Write-Host ""
    Write-Host ("==> [DRY-RUN] {0}" -f $Label)
    return $true
  }

  Write-Host ""
  Write-Host "==> $Label"
  try {
    & $Cmd
    if ($LASTEXITCODE -ne 0) { throw "Comando falhou (exitcode=$LASTEXITCODE)." }
    return $true
  } catch {
    Write-Host ("[ERR] {0}: {1}" -f $Label, $_.Exception.Message)
    return $false
  }
}

function Test-LocalPort {
  param([string]$TargetHost,[int]$Port)
  try { return (Test-NetConnection $TargetHost -Port $Port -WarningAction SilentlyContinue).TcpTestSucceeded }
  catch { return $false }
}

function Wait-BackendHealthy {
  param([string]$Url,[int]$TimeoutSec = 10)
  for ($i=0; $i -lt $TimeoutSec; $i++) {
    try {
      $json = Invoke-RestMethod -Uri $Url -Method Get -TimeoutSec 3
      if ($json -and $json.status -eq 'OK' -and $json.database -eq 'conectado') { return $true }
    } catch {}
    Start-Sleep -Seconds 1
  }
  return $false
}

function Stop-ListeningPort {
  param([int]$Port,[string]$Label)
  $connections = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
  $pids = @($connections | Select-Object -ExpandProperty OwningProcess -Unique)

  if ($pids.Count -eq 0) {
    Write-Host ("[stop] {0} was not active on port {1}." -f $Label, $Port)
    return
  }

  foreach ($procId in $pids) {
    try {
      Stop-Process -Id $procId -Force -ErrorAction Stop
      Write-Host ("[stop] {0} stopped (PID {1}, port {2})." -f $Label, $procId, $Port)
    } catch {
      Write-Host ("[stop] Falha ao encerrar {0} (PID {1}): {2}" -f $Label, $procId, $_.Exception.Message)
    }
  }
}

function Stop-ProcessIfAlive {
  param(
    [Parameter(Mandatory=$true)][int]$ProcessId,
    [Parameter(Mandatory=$true)][string]$Label
  )

  if (-not $ProcessId) { return $false }

  try {
    Get-Process -Id $ProcessId -ErrorAction Stop | Out-Null
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    Write-Host ("[stop] {0} stopped by PID (PID {1})." -f $Label, $ProcessId)
    return $true
  } catch {
    return $false
  }
}

function Stop-SshTunnelFallback {
  param(
    [int]$LocalPort,
    [string]$RemoteHost,
    [int]$RemotePort,
    [string]$SshHost
  )

  $forwardPattern = "-L\s*${LocalPort}:${RemoteHost}:${RemotePort}"

  $sshProcs = Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue |
    Where-Object {
      $cmd = String($_.CommandLine)
      $cmd -match $forwardPattern -and $cmd -match [Regex]::Escape($SshHost)
    }

  if (-not $sshProcs -or @($sshProcs).Count -eq 0) {
    Write-Host "[stop] Nenhum processo de túnel SSH SINGEM correspondente foi encontrado."
    return
  }

  foreach ($proc in $sshProcs) {
    try {
      Stop-Process -Id $proc.ProcessId -Force -ErrorAction Stop
      Write-Host ("[stop] Túnel SSH encerrado (PID {0})." -f $proc.ProcessId)
    } catch {}
  }
}

function Get-DirtyLines {
  param([string]$IgnoreRegex)
  $lines = git status --porcelain
  if (-not $lines) { return @() }
  return @($lines | Where-Object { $_ -notmatch $IgnoreRegex })
}

function Get-StagedFiles {
  $files = git diff --cached --name-only
  if (-not $files) { return @() }
  return @($files | Where-Object { $_ -and $_.Trim().Length -gt 0 })
}

function New-SmartCommitMessage {
  param([string[]]$StagedFiles)

  if (-not $StagedFiles -or $StagedFiles.Count -eq 0) {
    $targetBranch = if ($GitBranch) { $GitBranch } else { 'dev' }
    return ("chore(core): sync {0} {1}" -f $targetBranch, (Get-Date -Format 'yyyyMMdd-HHmm'))
  }

  $tags = New-Object System.Collections.Generic.HashSet[string]
  $scope = "core"
  $type  = "chore"

  foreach ($f in $StagedFiles) {
    $p = $f.Replace("\","/").ToLower()

    if ($p -match "^scripts/") { $scope = "scripts"; $tags.Add("scripts") | Out-Null }
    if ($p -match "^server/integrations/") { $tags.Add("integracoes") | Out-Null; $type = "feat"; $scope = "core" }
    if ($p -match "^server/routes/nfe" -or $p -match "^server/domain/nfe/" -or $p -match "/nfe") { $tags.Add("nf") | Out-Null; $type = "feat"; $scope = "core" }
    if ($p -match "empenh" -or $p -match "anexarpdfne") { $tags.Add("empenho") | Out-Null; $type = "feat"; $scope = "core" }
    if ($p -match "audit" -or $p -match "auditlog" -or $p -match "storageaudit") { $tags.Add("auditoria") | Out-Null; $type = "feat"; $scope = "core" }
    if ($p -match "^docs/") { $tags.Add("docs") | Out-Null }
  }

  if ($scope -eq "scripts" -and $tags.Count -eq 1) {
    return "chore(scripts): dev start/stop automation"
  }

  $priority = @("integracoes","empenho","nf","auditoria","docs","scripts")
  $ordered = New-Object System.Collections.Generic.List[string]
  foreach ($x in $priority) { if ($tags.Contains($x)) { $ordered.Add($x) | Out-Null } }
  foreach ($t in $tags) { if (-not $ordered.Contains($t)) { $ordered.Add($t) | Out-Null } }

  if ($ordered.Count -eq 0) { $ordered.Add("ajustes") | Out-Null }
  return ("{0}({1}): {2}" -f $type, $scope, ($ordered -join " + "))
}

function Set-ObjectPropertyValue {
  param(
    [Parameter(Mandatory=$true)][psobject]$Object,
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)]$Value
  )

  if ($Object.PSObject.Properties.Match($Name).Count -gt 0) {
    $Object.$Name = $Value
  } else {
    Add-Member -InputObject $Object -NotePropertyName $Name -NotePropertyValue $Value
  }
}

function Invoke-MainVersionBump {
  param([string]$RootPath)

  $versionPath = Join-Path $RootPath "version.json"
  $serverPackagePath = Join-Path $RootPath "server\package.json"

  if (-not (Test-Path -LiteralPath $versionPath)) {
    Write-Host "[ERR] version.json não encontrado."
    return $null
  }

  if (-not (Test-Path -LiteralPath $serverPackagePath)) {
    Write-Host "[ERR] server/package.json não encontrado."
    return $null
  }

  try {
    $versionFile = Get-Content -LiteralPath $versionPath -Raw | ConvertFrom-Json
    $serverPackage = Get-Content -LiteralPath $serverPackagePath -Raw | ConvertFrom-Json
  } catch {
    Write-Host ("[ERR] Falha ao interpretar os arquivos de versão: {0}" -f $_.Exception.Message)
    return $null
  }

  $currentVersion = [string]$versionFile.version
  if (-not $currentVersion) {
    $currentVersion = [string]$serverPackage.version
  }

  if ($currentVersion -notmatch '^\d+\.\d+\.\d+$') {
    Write-Host ("[ERR] Versão semântica inválida: {0}" -f $currentVersion)
    return $null
  }

  $parts = $currentVersion.Split('.')
  $nextVersion = "{0}.{1}.{2}" -f $parts[0], $parts[1], ([int]$parts[2] + 1)

  $nowUtc = (Get-Date).ToUniversalTime()
  $build = "{0:yyyyMMdd-HHmm}" -f $nowUtc
  $buildTimestamp = $nowUtc.ToString("o")

  $nameValue = [string]$versionFile.name
  if (-not $nameValue) {
    $nameValue = "SINGEM"
  }

  Set-ObjectPropertyValue -Object $versionFile -Name "name" -Value $nameValue
  Set-ObjectPropertyValue -Object $versionFile -Name "version" -Value $nextVersion
  Set-ObjectPropertyValue -Object $versionFile -Name "channel" -Value "main"
  Set-ObjectPropertyValue -Object $versionFile -Name "build" -Value $build
  Set-ObjectPropertyValue -Object $versionFile -Name "buildTimestamp" -Value $buildTimestamp

  Set-ObjectPropertyValue -Object $serverPackage -Name "version" -Value $nextVersion

  if ($DryRun) {
    Write-Host ("[INFO] [DRY-RUN] Bump calculado: v{0} • build {1} (sem gravar arquivos)." -f $nextVersion, $build)
    return @{
      version = $nextVersion
      build = $build
      buildTimestamp = $buildTimestamp
    }
  }

  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($versionPath, (($versionFile | ConvertTo-Json -Depth 32) + "`n"), $utf8NoBom)
  [System.IO.File]::WriteAllText($serverPackagePath, (($serverPackage | ConvertTo-Json -Depth 32) + "`n"), $utf8NoBom)

  return @{
    version = $nextVersion
    build = $build
    buildTimestamp = $buildTimestamp
  }
}

function Find-GitRootPortable {
  $root = git rev-parse --show-toplevel 2>$null
  if ($root) { return $root }
  $here = Split-Path -Parent $PSCommandPath
  $dir = Get-Item $here
  while ($null -ne $dir) {
    if (Test-Path (Join-Path $dir.FullName ".git")) { return $dir.FullName }
    $dir = $dir.Parent
  }
  return $null
}

# ==============================
# ROOT
# ==============================
$ProjectRoot = Find-GitRootPortable
if (-not $ProjectRoot) { Write-Host "[ERR] Não foi possível localizar a raiz do git (.git)."; exit 1 }
Set-Location $ProjectRoot
Write-Host ("ProjectRoot: {0}" -f $ProjectRoot)
Write-Host ""

# ==============================
# LOAD SESSION
# ==============================
$sessionPath = Join-Path $ProjectRoot ".dev-session.json"
$session = $null
if (Test-Path $sessionPath) {
  try { $session = Get-Content $sessionPath -Raw | ConvertFrom-Json } catch { $session = $null }
}

# ==============================
# TROCA DE BRANCH
# ==============================
$ok = Invoke-Step ("Trocar para branch {0}" -f $GitBranch) { git checkout $GitBranch }
if (-not $ok) { exit 1 }

# ==============================
# ALTERAÇÕES? (ANTES DO BUMP)
# ==============================
$dirtyLines = Get-DirtyLines -IgnoreRegex $IgnoreDirtyRegex
if (-not $dirtyLines -or $dirtyLines.Count -eq 0) {
  Write-Host "[OK] Nenhuma alteração pendente relevante."
  Write-Host "[DONE]"
  exit 0
}

$releaseVersionInfo = $null
if ($GitBranch -eq "main") {
  $mainRelevantChanges = @($dirtyLines | Where-Object { $_ -notmatch $ReleaseFilesRegex })
  if (-not $mainRelevantChanges -or $mainRelevantChanges.Count -eq 0) {
    Write-Host "[OK] Apenas arquivos de versão foram alterados na main. Sem novas mudanças de código para release."
    Write-Host "[DONE]"
    exit 0
  }

  Write-Host ""
  Write-Host "==> Incrementar versão semântica (main)"
  $releaseVersionInfo = Invoke-MainVersionBump -RootPath $ProjectRoot
  if (-not $releaseVersionInfo) { exit 1 }
  Write-Host ("[INFO] Versão de release preparada: v{0} • build {1}" -f $releaseVersionInfo.version, $releaseVersionInfo.build)
}

# ==============================
# ALTERAÇÕES? (APÓS BUMP)
# ==============================
$dirtyLinesAfterBump = Get-DirtyLines -IgnoreRegex $IgnoreDirtyRegex
if (-not $dirtyLinesAfterBump -or $dirtyLinesAfterBump.Count -eq 0) {
  Write-Host "[OK] Nenhuma alteração pendente relevante."
  Write-Host "[DONE]"
  exit 0
}

# ==============================
# TESTES (backend se necessário)
# ==============================
$serverDir = Join-Path $ProjectRoot "server"
$startedTempBackend = $false
$tempBackendProc = $null

if ($RunIntegrationTests) {
  $skipTestsByInfra = $false

  if (-not (Test-Path $serverDir)) { Write-Host "[ERR] Pasta server não encontrada."; exit 1 }

  $backendUp = Wait-BackendHealthy -Url $BackendHealthUrl -TimeoutSec 2
  if (-not $backendUp) {
    Write-Host "[INFO] Backend não está em execução. Iniciando backend temporário para testes..."
    Set-Location $serverDir
    $tempBackendProc = Start-Process -FilePath "node" -ArgumentList "index.js" -PassThru -WindowStyle Hidden
    $startedTempBackend = $true
    Set-Location $ProjectRoot

    $okHealth = Wait-BackendHealthy -Url $BackendHealthUrl -TimeoutSec 20
    if (-not $okHealth) {
      if ($startedTempBackend -and $tempBackendProc) {
        try { Stop-Process -Id $tempBackendProc.Id -Force -ErrorAction Stop } catch {}
      }

      if ($AllowInfraFallbackForDev) {
        Write-Host "[WARN] Backend não ficou saudável (status OK + DB conectado) em /health."
        Write-Host "[WARN] Infra de banco/túnel indisponível na branch dev. Testes de integração serão ignorados neste ciclo."
        $skipTestsByInfra = $true
      } else {
        Write-Host "[ERR] Backend não ficou saudável (status OK + DB conectado) em /health."
        exit 1
      }
    }
  }

  if (-not $skipTestsByInfra) {
    $ok = Invoke-Step "Executar testes de integração" {
      Set-Location $serverDir
      npm run test:integracoes
    }
    Set-Location $ProjectRoot

    if (-not $ok) { Write-Host "[ERR] Testes falharam. Abortando."; exit 1 }
  } else {
    Write-Host "[WARN] Testes de integração ignorados devido indisponibilidade de infraestrutura (dev)."
  }

  if ($startedTempBackend -and $tempBackendProc) {
    try { Stop-Process -Id $tempBackendProc.Id -Force; Write-Host ("[stop] Backend temporário encerrado (PID {0})." -f $tempBackendProc.Id) } catch {}
  }
}

# ==============================
# STAGE + COMMIT
# ==============================
$ok = Invoke-Step "Adicionar alterações ao stage" { git add -A }
if (-not $ok) { exit 1 }

$stagedFiles = Get-StagedFiles
if (-not $stagedFiles -or $stagedFiles.Count -eq 0) {
  if ($DryRun) {
    Write-Host "[INFO] [DRY-RUN] Nenhum arquivo em stage real. Simulando itens para validar o fluxo completo."
    $stagedFiles = @("version.json", "server/package.json")
  } else {
    Write-Host "[OK] Nada em stage."
    exit 0
  }
}

if ($releaseVersionInfo) {
  $commitMsg = ("chore(release): v{0} build {1}" -f $releaseVersionInfo.version, $releaseVersionInfo.build)
} else {
  $commitMsg = New-SmartCommitMessage -StagedFiles $stagedFiles
}
Write-Host ""
Write-Host ("[INFO] Mensagem de commit: {0}" -f $commitMsg)
Write-Host ("[INFO] Arquivos em stage: {0}" -f $stagedFiles.Count)
Write-Host ""

$ok = Invoke-Step "Criar commit" { git commit -m $commitMsg }
if (-not $ok) { exit 1 }

# ==============================
# PULL/REBASE + PUSH
# ==============================
$ok = Invoke-Step ("Pull --rebase de {0}/{1}" -f $GitRemote, $GitBranch) { git pull --rebase $GitRemote $GitBranch }
if (-not $ok) { Write-Host "[WARN] Pull/rebase falhou. Resolva os conflitos e execute novamente."; exit 1 }

$ok = Invoke-Step ("Push para {0}/{1}" -f $GitRemote, $GitBranch) { git push $GitRemote $GitBranch }
if (-not $ok) { exit 1 }

# ==============================
# ENCERRAR SERVIÇOS (PID PRIMEIRO)
# ==============================
if ($DryRun) {
  Write-Host ""
  Write-Host "[OK] DRY-RUN concluído com sucesso."
  Write-Host "[DONE]"
  Write-Host ""
  exit 0
}

Write-Host ""
Write-Host "==> Encerrando serviços (frontend, backend, túnel)..."

$stoppedAny = $false
if ($session) {
  $stoppedAny = (Stop-ProcessIfAlive -ProcessId $session.backend.windowPid -Label "Janela do backend") -or $stoppedAny
  $stoppedAny = (Stop-ProcessIfAlive -ProcessId $session.frontend.windowPid -Label "Janela do frontend") -or $stoppedAny
  $stoppedAny = (Stop-ProcessIfAlive -ProcessId $session.tunnel.windowPid -Label "Janela do túnel DB") -or $stoppedAny

  # limpa sessão se conseguiu parar algo
  if ($stoppedAny) {
    try { Remove-Item $sessionPath -Force -ErrorAction SilentlyContinue } catch {}
  }
}

# Fallback: encerrar por porta (só se não encerrou nada por PID)
if (-not $stoppedAny) {
  $backendPortOpen = Test-LocalPort -TargetHost $BackendHost -Port $BackendPort
  if ($backendPortOpen) {
    $healthOk = Wait-BackendHealthy -Url $BackendHealthUrl -TimeoutSec 2
    if ($healthOk) { Stop-ListeningPort -Port $BackendPort -Label "Backend SINGEM" }
    else { Write-Host ("[stop] Porta {0} ocupada, mas /health não confirmou o backend. Não será encerrado." -f $BackendPort) }
  } else { Write-Host ("[stop] Backend não estava ativo na porta {0}." -f $BackendPort) }

  Stop-ListeningPort -Port $FrontPort -Label "Frontend"
  Stop-ListeningPort -Port $TunnelPort -Label "Túnel PostgreSQL"
  Stop-SshTunnelFallback -LocalPort $TunnelPort -RemoteHost "127.0.0.1" -RemotePort $DbRemotePort -SshHost $SshHost
}

Write-Host ""
Write-Host "[OK] Commit + pull/rebase + push concluídos, em seguida serviços encerrados."
Write-Host "[DONE]"
Write-Host ""


