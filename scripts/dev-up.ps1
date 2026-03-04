[CmdletBinding()]
param(
  [ValidateSet('up', 'setup', 'tunnel', 'backend', 'frontend', 'health', 'stop')]
  [string]$Action = 'up',

  [ValidateSet('dev', 'main')]
  [string]$Branch = 'dev',

  [string]$ProjectRoot = (Get-Location).Path,
  [string]$RepoUrl = 'https://github.com/fabianocba/SINGEM.git',
  [string]$GitRemote = 'origin',

  [string]$SshHost = 'srv1401818.hstgr.cloud',
  [int]$SshPort = 2222,
  [string]$SshUser = 'root',

  [int]$DbLocalPort = 5433,
  [int]$DbRemotePort = 5432,
  [string]$DbRemoteHost = '127.0.0.1',

  [int]$BackendPort = 3000,
  [int]$FrontendPort = 8000,
  [string]$BackendHealthPath = '/health',

  [switch]$SkipGitSync,
  [switch]$SkipInstall,
  [switch]$NoAutoRepairTunnel,
  [switch]$ForceInstall
)

$ErrorActionPreference = 'Stop'
$script:SelfScriptPath = $PSCommandPath
$script:ResolvedProjectRoot = $null
$script:ServerDir = $null
$script:SessionPath = $null
$script:BackendHealthUrl = $null

function Write-Headline {
  param([string]$Text)
  Write-Host ''
  Write-Host ('=== {0} ===' -f $Text) -ForegroundColor Cyan
}

function Write-Step {
  param([string]$Text)
  Write-Host ('[STEP] {0}' -f $Text) -ForegroundColor Cyan
}

function Write-Ok {
  param([string]$Text)
  Write-Host ('[OK] {0}' -f $Text) -ForegroundColor Green
}

function Write-WarnMsg {
  param([string]$Text)
  Write-Host ('[WARN] {0}' -f $Text) -ForegroundColor Yellow
}

function Write-ErrMsg {
  param([string]$Text)
  Write-Host ('[ERR] {0}' -f $Text) -ForegroundColor Red
}

function Resolve-AbsolutePath {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return (Get-Location).Path
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path (Get-Location).Path $PathValue))
}

function ConvertTo-HashtableRecursive {
  param($InputObject)

  if ($null -eq $InputObject) {
    return $null
  }

  if ($InputObject -is [System.Collections.IDictionary]) {
    $hash = @{}
    foreach ($key in $InputObject.Keys) {
      $hash[$key] = ConvertTo-HashtableRecursive -InputObject $InputObject[$key]
    }
    return $hash
  }

  if ($InputObject -is [System.Collections.IEnumerable] -and -not ($InputObject -is [string])) {
    $list = @()
    foreach ($item in $InputObject) {
      $list += ,(ConvertTo-HashtableRecursive -InputObject $item)
    }
    return $list
  }

  if ($InputObject -is [psobject]) {
    $hash = @{}
    foreach ($prop in $InputObject.PSObject.Properties) {
      $hash[$prop.Name] = ConvertTo-HashtableRecursive -InputObject $prop.Value
    }
    return $hash
  }

  return $InputObject
}

function Read-Session {
  if (-not $script:SessionPath -or -not (Test-Path -LiteralPath $script:SessionPath)) {
    return @{}
  }

  try {
    $raw = Get-Content -LiteralPath $script:SessionPath -Raw
    if ([string]::IsNullOrWhiteSpace($raw)) {
      return @{}
    }

    $parsed = ConvertFrom-Json -InputObject $raw
    return (ConvertTo-HashtableRecursive -InputObject $parsed)
  } catch {
    Write-WarnMsg ('Falha lendo sessão atual: {0}' -f $_.Exception.Message)
    return @{}
  }
}

function Get-DefaultSession {
  return @{
    projectRoot = $script:ResolvedProjectRoot
    branch = $Branch
    createdAt = (Get-Date).ToString('s')
    updatedAt = (Get-Date).ToString('s')
    backend = @{
      port = $BackendPort
      health = $script:BackendHealthUrl
      processId = $null
      windowPid = $null
      status = 'unknown'
    }
    frontend = @{
      port = $FrontendPort
      url = ('http://localhost:{0}' -f $FrontendPort)
      processId = $null
      windowPid = $null
      status = 'unknown'
    }
    tunnel = @{
      localPort = $DbLocalPort
      remoteHost = $DbRemoteHost
      remotePort = $DbRemotePort
      sshHost = $SshHost
      sshPort = $SshPort
      sshUser = $SshUser
      processId = $null
      windowPid = $null
      status = 'unknown'
    }
  }
}

function Save-Session {
  param([hashtable]$Session)

  if (-not $script:SessionPath) {
    return
  }

  $Session['updatedAt'] = (Get-Date).ToString('s')
  $Session['projectRoot'] = $script:ResolvedProjectRoot
  $Session['branch'] = $Branch

  $json = $Session | ConvertTo-Json -Depth 10
  Set-Content -LiteralPath $script:SessionPath -Value $json -Encoding UTF8
}

function Update-Session {
  param([hashtable]$Patch)

  $session = Read-Session
  if (-not $session -or $session.Count -eq 0) {
    $session = Get-DefaultSession
  }

  foreach ($key in $Patch.Keys) {
    if ($Patch[$key] -is [hashtable]) {
      if (-not ($session[$key] -is [hashtable])) {
        $session[$key] = @{}
      }

      foreach ($innerKey in $Patch[$key].Keys) {
        $session[$key][$innerKey] = $Patch[$key][$innerKey]
      }
    } else {
      $session[$key] = $Patch[$key]
    }
  }

  Save-Session -Session $session
}

function Clear-Session {
  if ($script:SessionPath -and (Test-Path -LiteralPath $script:SessionPath)) {
    Remove-Item -LiteralPath $script:SessionPath -Force -ErrorAction SilentlyContinue
  }
}

function Require-Command {
  param(
    [string]$Name,
    [string]$Hint
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Comando obrigatório não encontrado: $Name. $Hint"
  }
}

function Test-DirectoryWritable {
  param([string]$DirPath)

  $targetDir = Resolve-AbsolutePath -PathValue $DirPath
  if (-not (Test-Path -LiteralPath $targetDir)) {
    throw "Diretório não encontrado para validação de permissão: $targetDir"
  }

  $tmpFile = Join-Path $targetDir ('.perm-check-{0}.tmp' -f ([Guid]::NewGuid().ToString('N')))
  try {
    Set-Content -LiteralPath $tmpFile -Value 'ok' -Encoding UTF8
    Remove-Item -LiteralPath $tmpFile -Force -ErrorAction SilentlyContinue
    return $true
  } catch {
    throw "Sem permissão de escrita em: $targetDir"
  }
}

function Test-LocalPort {
  param(
    [int]$Port,
    [string]$TargetHost = '127.0.0.1',
    [int]$TimeoutMs = 1200
  )

  $client = New-Object System.Net.Sockets.TcpClient
  try {
    $async = $client.BeginConnect($TargetHost, $Port, $null, $null)
    if (-not $async.AsyncWaitHandle.WaitOne($TimeoutMs, $false)) {
      return $false
    }

    $client.EndConnect($async)
    return $true
  } catch {
    return $false
  } finally {
    $client.Dispose()
  }
}

function Wait-LocalPort {
  param(
    [int]$Port,
    [string]$TargetHost = '127.0.0.1',
    [int]$TimeoutSec = 20
  )

  for ($i = 0; $i -lt $TimeoutSec; $i++) {
    if (Test-LocalPort -Port $Port -TargetHost $TargetHost) {
      return $true
    }
    Start-Sleep -Seconds 1
  }

  return $false
}

function Get-PortProcessDetails {
  param([int]$Port)

  $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
  if (-not $listeners) {
    return @()
  }

  $pids = @($listeners | Select-Object -ExpandProperty OwningProcess -Unique)
  $details = @()

  foreach ($procId in $pids) {
    $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
    $procMeta = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue

    $details += [pscustomobject]@{
      pid = $procId
      name = if ($proc) { $proc.ProcessName } else { 'desconhecido' }
      commandLine = if ($procMeta) { $procMeta.CommandLine } else { '' }
    }
  }

  return $details
}

function Stop-ListeningPort {
  param(
    [int]$Port,
    [string]$Label
  )

  $procs = Get-PortProcessDetails -Port $Port
  if (-not $procs -or $procs.Count -eq 0) {
    Write-WarnMsg ("{0}: porta {1} não está em uso." -f $Label, $Port)
    return $false
  }

  $stopped = $false
  foreach ($proc in $procs) {
    if ($proc.pid -eq $PID) {
      continue
    }

    try {
      Stop-Process -Id $proc.pid -Force -ErrorAction Stop
      Write-Ok ("{0} finalizado (PID {1}, porta {2})." -f $Label, $proc.pid, $Port)
      $stopped = $true
    } catch {
      Write-WarnMsg ("Não foi possível finalizar PID {0} ({1}): {2}" -f $proc.pid, $proc.name, $_.Exception.Message)
    }
  }

  return $stopped
}

function Stop-ProcessIfAlive {
  param(
    [int]$ProcessId,
    [string]$Label
  )

  if (-not $ProcessId) {
    return $false
  }

  if ($ProcessId -eq $PID) {
    return $false
  }

  try {
    Get-Process -Id $ProcessId -ErrorAction Stop | Out-Null
    Stop-Process -Id $ProcessId -Force -ErrorAction Stop
    Write-Ok ("{0} finalizado (PID {1})." -f $Label, $ProcessId)
    return $true
  } catch {
    return $false
  }
}

function Get-MatchingSshTunnelProcesses {
  $forwardRegex = "-L\s*${DbLocalPort}:$([Regex]::Escape($DbRemoteHost)):${DbRemotePort}"
  $hostRegex = [Regex]::Escape("$SshUser@$SshHost")

  $sshProcs = Get-CimInstance Win32_Process -Filter "Name='ssh.exe'" -ErrorAction SilentlyContinue
  if (-not $sshProcs) {
    return @()
  }

  return @(
    $sshProcs | Where-Object {
      $cmd = [string]$_.CommandLine
      $cmd -match $forwardRegex -and $cmd -match $hostRegex
    }
  )
}

function Invoke-External {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Step $Label
  & $Command
  $exitCode = $LASTEXITCODE
  if ($exitCode -ne 0) {
    throw "Falha em '$Label' (exitcode=$exitCode)."
  }
}

function Ensure-ProjectRepository {
  param([switch]$AllowClone)

  $targetRoot = Resolve-AbsolutePath -PathValue $ProjectRoot

  if (Test-Path -LiteralPath (Join-Path $targetRoot '.git')) {
    return $targetRoot
  }

  if (-not $AllowClone) {
    throw "Projeto não encontrado em $targetRoot (sem pasta .git)."
  }

  Require-Command -Name 'git' -Hint 'Instale Git e adicione ao PATH.'

  if (-not (Test-Path -LiteralPath $targetRoot)) {
    $null = New-Item -ItemType Directory -Path $targetRoot -Force
  }

  $existingItems = @(Get-ChildItem -LiteralPath $targetRoot -Force -ErrorAction SilentlyContinue)
  if ($existingItems.Count -gt 0 -and -not (Test-Path -LiteralPath (Join-Path $targetRoot '.git'))) {
    throw "A pasta $targetRoot já existe e não é um repositório Git. Use -ProjectRoot apontando para a raiz do projeto."
  }

  if (-not (Test-Path -LiteralPath (Join-Path $targetRoot '.git'))) {
    Invoke-External -Label ("Clonando branch {0} de {1}" -f $Branch, $RepoUrl) -Command {
      git clone --branch $Branch --single-branch $RepoUrl $targetRoot
    }
  }

  return $targetRoot
}

function Sync-Repository {
  if ($SkipGitSync) {
    Write-WarnMsg 'Sincronização Git ignorada por parâmetro.'
    return
  }

  Push-Location $script:ResolvedProjectRoot
  try {
    Invoke-External -Label ("git fetch {0}/{1}" -f $GitRemote, $Branch) -Command {
      git fetch $GitRemote $Branch --prune
    }

    $checkoutOk = $true
    try {
      Invoke-External -Label ("git checkout {0}" -f $Branch) -Command {
        git checkout $Branch
      }
    } catch {
      $checkoutOk = $false
    }

    if (-not $checkoutOk) {
      Invoke-External -Label ("criando branch local {0}" -f $Branch) -Command {
        git checkout -b $Branch "$GitRemote/$Branch"
      }
    }

    $dirtyLines = @(git status --porcelain)
    if ($dirtyLines.Count -gt 0) {
      Write-WarnMsg 'Working tree com alterações locais. Pull automático foi ignorado para evitar conflitos.'
      return
    }

    Invoke-External -Label ("git pull --ff-only {0} {1}" -f $GitRemote, $Branch) -Command {
      git pull --ff-only $GitRemote $Branch
    }
  } finally {
    Pop-Location
  }
}

function Initialize-Context {
  param([switch]$AllowClone)

  $script:ResolvedProjectRoot = Ensure-ProjectRepository -AllowClone:$AllowClone
  $script:ServerDir = Join-Path $script:ResolvedProjectRoot 'server'
  $script:SessionPath = Join-Path $script:ResolvedProjectRoot '.dev-session.json'
  $script:BackendHealthUrl = "http://localhost:$BackendPort$BackendHealthPath"

  if (-not (Test-Path -LiteralPath $script:ServerDir)) {
    throw "Pasta de backend não encontrada: $script:ServerDir"
  }

  Set-Location -LiteralPath $script:ResolvedProjectRoot
}

function Parse-EnvFile {
  param([string]$EnvPath)

  $map = @{}
  if (-not (Test-Path -LiteralPath $EnvPath)) {
    return $map
  }

  foreach ($line in (Get-Content -LiteralPath $EnvPath)) {
    $trimmed = $line.Trim()
    if ([string]::IsNullOrWhiteSpace($trimmed)) {
      continue
    }

    if ($trimmed.StartsWith('#')) {
      continue
    }

    $eqIndex = $trimmed.IndexOf('=')
    if ($eqIndex -lt 1) {
      continue
    }

    $key = $trimmed.Substring(0, $eqIndex).Trim()
    $value = $trimmed.Substring($eqIndex + 1).Trim().Trim('"')
    $map[$key] = $value
  }

  return $map
}

function Ensure-BackendEnvFile {
  $envPath = Join-Path $script:ServerDir '.env'
  $envDevPath = Join-Path $script:ServerDir '.env.development'
  $envExamplePath = Join-Path $script:ServerDir '.env.example'

  if (-not (Test-Path -LiteralPath $envPath)) {
    if (Test-Path -LiteralPath $envDevPath) {
      Copy-Item -LiteralPath $envDevPath -Destination $envPath -Force
      Write-WarnMsg "Arquivo server/.env ausente. Foi criado a partir de .env.development."
    } elseif (Test-Path -LiteralPath $envExamplePath) {
      Copy-Item -LiteralPath $envExamplePath -Destination $envPath -Force
      Write-WarnMsg "Arquivo server/.env ausente. Foi criado a partir de .env.example."
    } else {
      throw 'Arquivo server/.env não encontrado e não há template para criar automaticamente.'
    }
  }

  $envMap = Parse-EnvFile -EnvPath $envPath
  if ($envMap.ContainsKey('DATABASE_URL')) {
    $databaseUrl = [string]$envMap['DATABASE_URL']
    if ($databaseUrl -notmatch ":$DbLocalPort") {
      Write-WarnMsg ("DATABASE_URL em server/.env não aponta para a porta local {0}. Valor atual: {1}" -f $DbLocalPort, $databaseUrl)
    }
  }

  if ($envMap.ContainsKey('DB_PORT')) {
    $dbPortEnv = [int]$envMap['DB_PORT']
    if ($dbPortEnv -ne $DbLocalPort) {
      Write-WarnMsg ("DB_PORT em server/.env está {0}; esperado para túnel local: {1}." -f $dbPortEnv, $DbLocalPort)
    }
  }

  if ($envMap.ContainsKey('PORT')) {
    $backendPortEnv = [int]$envMap['PORT']
    if ($backendPortEnv -ne $BackendPort) {
      Write-WarnMsg ("PORT em server/.env está {0}; backend esperado em {1}." -f $backendPortEnv, $BackendPort)
    }
  }
}

function Ensure-NpmDependencies {
  param(
    [string]$WorkDir,
    [string]$Label,
    [switch]$OnlyWhenMissing,
    [string[]]$RequiredModules = @()
  )

  $packagePath = Join-Path $WorkDir 'package.json'
  if (-not (Test-Path -LiteralPath $packagePath)) {
    return
  }

  $nodeModulesPath = Join-Path $WorkDir 'node_modules'
  if ($OnlyWhenMissing -and (Test-Path -LiteralPath $nodeModulesPath)) {
    $missingModules = @()
    foreach ($moduleName in $RequiredModules) {
      $modulePath = Join-Path $nodeModulesPath $moduleName
      if (-not (Test-Path -LiteralPath $modulePath)) {
        $missingModules += $moduleName
      }
    }

    if ($missingModules.Count -eq 0) {
      Write-Ok ("Dependências já presentes ({0}); instalação ignorada." -f $Label)
      return
    }

    Write-WarnMsg ("Dependências ausentes em {0}: {1}. Tentando reinstalar..." -f $Label, ($missingModules -join ', '))
  }

  if ($SkipInstall) {
    Write-WarnMsg ("Instalação de dependências ignorada ({0})." -f $Label)
    return
  }

  Push-Location $WorkDir
  try {
    if (Test-Path -LiteralPath (Join-Path $WorkDir 'package-lock.json')) {
      try {
        Invoke-External -Label ("npm ci ({0})" -f $Label) -Command { npm ci }
      } catch {
        Write-WarnMsg ("npm ci falhou em {0}; fallback para npm install." -f $Label)
        Invoke-External -Label ("npm install ({0})" -f $Label) -Command { npm install }
      }
    } else {
      Invoke-External -Label ("npm install ({0})" -f $Label) -Command { npm install }
    }
  } finally {
    Pop-Location
  }
}

function Get-BackendRunSpec {
  $packagePath = Join-Path $script:ServerDir 'package.json'
  $hasDevScript = $false
  $hasStartScript = $false

  if (Test-Path -LiteralPath $packagePath) {
    try {
      $packageJson = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
      $hasDevScript = [bool]$packageJson.scripts.dev
      $hasStartScript = [bool]$packageJson.scripts.start
    } catch {
      $hasDevScript = $false
      $hasStartScript = $false
    }
  }

  $nodemonCmdPath = Join-Path $script:ServerDir 'node_modules\.bin\nodemon.cmd'
  $nodemonJsPath = Join-Path $script:ServerDir 'node_modules\nodemon\bin\nodemon.js'
  $hasNodemon = (Test-Path -LiteralPath $nodemonCmdPath) -or (Test-Path -LiteralPath $nodemonJsPath)

  if ($hasDevScript -and $hasNodemon) {
    return @{
      mode = 'npm-dev'
      description = 'npm run dev'
    }
  }

  if ($hasDevScript -and -not $hasNodemon) {
    Write-WarnMsg 'nodemon não encontrado no server/node_modules. Usando fallback: npm run start.'
  }

  if ($hasStartScript) {
    return @{
      mode = 'npm-start'
      description = 'npm run start'
    }
  }

  return @{
    mode = 'node'
    description = 'node index.js'
  }
}

function Get-FrontendRunnerSpec {
  if (Get-Command 'python' -ErrorAction SilentlyContinue) {
    return @{
      command = 'python'
      args = @('-m', 'http.server', "$FrontendPort", '--bind', '127.0.0.1', '--directory', $script:ResolvedProjectRoot)
      name = 'python'
    }
  }

  if (Get-Command 'py' -ErrorAction SilentlyContinue) {
    return @{
      command = 'py'
      args = @('-m', 'http.server', "$FrontendPort", '--bind', '127.0.0.1', '--directory', $script:ResolvedProjectRoot)
      name = 'py'
    }
  }

  if (Get-Command 'http-server' -ErrorAction SilentlyContinue) {
    return @{
      command = 'http-server'
      args = @($script:ResolvedProjectRoot, '-p', "$FrontendPort", '-c-1', '--cors')
      name = 'http-server'
    }
  }

  return $null
}

function Validate-Prerequisites {
  param([switch]$AllowClone)

  $targetRoot = Resolve-AbsolutePath -PathValue $ProjectRoot
  $permissionCheckPath = $targetRoot

  if (-not (Test-Path -LiteralPath $targetRoot)) {
    $parentPath = Split-Path -Parent $targetRoot
    if ([string]::IsNullOrWhiteSpace($parentPath)) {
      $parentPath = (Get-Location).Path
    }
    $permissionCheckPath = $parentPath
  }

  Test-DirectoryWritable -DirPath $permissionCheckPath | Out-Null

  $executionPolicy = Get-ExecutionPolicy -Scope CurrentUser
  if ($executionPolicy -eq 'Restricted') {
    Write-WarnMsg 'ExecutionPolicy CurrentUser está Restricted. Scripts podem falhar fora do VS Code Tasks.'
  }

  switch ($Action) {
    'setup' {
      Require-Command -Name 'git' -Hint 'Instale Git: https://git-scm.com/download/win'
      Require-Command -Name 'node' -Hint 'Instale Node.js LTS: https://nodejs.org/'
      Require-Command -Name 'npm' -Hint 'npm deve vir junto com o Node.js.'
      Require-Command -Name 'ssh' -Hint 'Instale OpenSSH Client (Feature do Windows).'
    }
    'up' {
      Require-Command -Name 'git' -Hint 'Instale Git: https://git-scm.com/download/win'
      Require-Command -Name 'node' -Hint 'Instale Node.js LTS: https://nodejs.org/'
      Require-Command -Name 'npm' -Hint 'npm deve vir junto com o Node.js.'
      Require-Command -Name 'ssh' -Hint 'Instale OpenSSH Client (Feature do Windows).'
    }
    'tunnel' {
      Require-Command -Name 'ssh' -Hint 'Instale OpenSSH Client (Feature do Windows).'
    }
    'backend' {
      Require-Command -Name 'node' -Hint 'Instale Node.js LTS: https://nodejs.org/'
      Require-Command -Name 'npm' -Hint 'npm deve vir junto com o Node.js.'
    }
    'frontend' {
      $runner = Get-FrontendRunnerSpec
      if (-not $runner) {
        throw 'Nenhum executor de frontend encontrado. Instale Python (python/py) ou http-server.'
      }
    }
  }

  $sshKeyCandidates = @(
    (Join-Path $env:USERPROFILE '.ssh\id_ed25519'),
    (Join-Path $env:USERPROFILE '.ssh\id_rsa')
  )

  $hasSshKey = $false
  foreach ($candidate in $sshKeyCandidates) {
    if (Test-Path -LiteralPath $candidate) {
      $hasSshKey = $true
      break
    }
  }

  if (-not $hasSshKey) {
    Write-WarnMsg 'Nenhuma chave SSH padrão detectada (~/.ssh/id_ed25519 ou id_rsa). Pode solicitar senha ao abrir túnel.'
  }
}

function Get-BackendHealthPayload {
  param([int]$TimeoutSec = 3)

  try {
    return Invoke-RestMethod -Uri $script:BackendHealthUrl -Method Get -TimeoutSec $TimeoutSec
  } catch {
    return $null
  }
}

function Wait-BackendHealthy {
  param(
    [int]$TimeoutSec = 50,
    [switch]$RequireDatabaseConnected
  )

  for ($i = 0; $i -lt $TimeoutSec; $i++) {
    $payload = Get-BackendHealthPayload -TimeoutSec 3
    if ($payload) {
      $statusOk = [string]$payload.status -eq 'OK'
      $dbOk = [string]$payload.database -eq 'conectado'

      if ($RequireDatabaseConnected) {
        if ($statusOk -and $dbOk) {
          return $payload
        }
      } else {
        if ($statusOk -or [string]$payload.status -eq 'DEGRADED') {
          return $payload
        }
      }
    }

    Start-Sleep -Seconds 1
  }

  return $null
}

function Read-VersionFromFile {
  $versionPath = Join-Path $script:ResolvedProjectRoot 'version.json'
  if (-not (Test-Path -LiteralPath $versionPath)) {
    return $null
  }

  try {
    $raw = Get-Content -LiteralPath $versionPath -Raw
    $obj = ConvertFrom-Json -InputObject $raw
    return $obj
  } catch {
    return $null
  }
}

function Get-AppVersionString {
  $apiVersionUrl = "http://localhost:$BackendPort/api/version"
  try {
    $apiVersion = Invoke-RestMethod -Uri $apiVersionUrl -Method Get -TimeoutSec 3
    if ($apiVersion -and $apiVersion.version) {
      return ('{0} (build {1})' -f $apiVersion.version, $apiVersion.build)
    }
  } catch {
  }

  $fileVersion = Read-VersionFromFile
  if ($fileVersion -and $fileVersion.version) {
    return ('{0} (build {1})' -f $fileVersion.version, $fileVersion.build)
  }

  return 'indisponível'
}

function Start-ComponentWindow {
  param(
    [ValidateSet('tunnel', 'backend', 'frontend')]
    [string]$ComponentAction
  )

  $argumentList = @(
    '-NoExit',
    '-ExecutionPolicy', 'Bypass',
    '-File', $script:SelfScriptPath,
    '-Action', $ComponentAction,
    '-Branch', $Branch,
    '-ProjectRoot', $script:ResolvedProjectRoot,
    '-RepoUrl', $RepoUrl,
    '-GitRemote', $GitRemote,
    '-SshHost', $SshHost,
    '-SshPort', "$SshPort",
    '-SshUser', $SshUser,
    '-DbLocalPort', "$DbLocalPort",
    '-DbRemotePort', "$DbRemotePort",
    '-DbRemoteHost', $DbRemoteHost,
    '-BackendPort', "$BackendPort",
    '-FrontendPort', "$FrontendPort",
    '-BackendHealthPath', $BackendHealthPath
  )

  return Start-Process -FilePath 'powershell.exe' -ArgumentList $argumentList -PassThru
}

function Ensure-TunnelAvailable {
  param([switch]$AllowStart)

  if (Test-LocalPort -Port $DbLocalPort) {
    $matchingTunnel = @(Get-MatchingSshTunnelProcesses)
    if ($matchingTunnel.Count -gt 0) {
      Write-Ok ("Túnel SSH já ativo na porta {0}." -f $DbLocalPort)
      Update-Session -Patch @{
        tunnel = @{
          status = 'running'
          processId = $matchingTunnel[0].ProcessId
          localPort = $DbLocalPort
          sshHost = $SshHost
          sshPort = $SshPort
          sshUser = $SshUser
        }
      }
      return @{ ok = $true; reused = $true; processId = $matchingTunnel[0].ProcessId }
    }

    Write-ErrMsg ("Porta local {0} ocupada por processo que não é o túnel SINGEM." -f $DbLocalPort)
    $owners = Get-PortProcessDetails -Port $DbLocalPort
    foreach ($owner in $owners) {
      Write-Host ('    PID {0} | {1} | {2}' -f $owner.pid, $owner.name, $owner.commandLine) -ForegroundColor Yellow
    }
    Write-Host '    Libere a porta e tente novamente.' -ForegroundColor Yellow
    return @{ ok = $false; reason = 'occupied' }
  }

  if (-not $AllowStart) {
    return @{ ok = $false; reason = 'down' }
  }

  Write-Step ("Subindo túnel SSH para porta local {0}..." -f $DbLocalPort)
  $window = Start-ComponentWindow -ComponentAction 'tunnel'
  if (-not $window) {
    Write-ErrMsg 'Falha ao abrir terminal do túnel SSH.'
    return @{ ok = $false; reason = 'spawn-failed' }
  }

  $ready = Wait-LocalPort -Port $DbLocalPort -TimeoutSec 20
  if (-not $ready) {
    Write-ErrMsg ("Túnel não ficou ativo na porta {0}." -f $DbLocalPort)
    return @{ ok = $false; reason = 'startup-timeout'; windowPid = $window.Id }
  }

  $matchingAfterStart = @(Get-MatchingSshTunnelProcesses)
  $tunnelPid = if ($matchingAfterStart.Count -gt 0) { $matchingAfterStart[0].ProcessId } else { $null }

  Update-Session -Patch @{
    tunnel = @{
      status = 'running'
      windowPid = $window.Id
      processId = $tunnelPid
      localPort = $DbLocalPort
      sshHost = $SshHost
      sshPort = $SshPort
      sshUser = $SshUser
    }
  }

  Write-Ok ("Túnel SSH ativo em 127.0.0.1:{0}." -f $DbLocalPort)
  return @{ ok = $true; started = $true; processId = $tunnelPid; windowPid = $window.Id }
}

function Ensure-BackendAvailable {
  param([switch]$AllowStart)

  $healthy = Wait-BackendHealthy -TimeoutSec 2 -RequireDatabaseConnected
  if ($healthy) {
    Write-Ok ("Backend já saudável em http://localhost:{0}" -f $BackendPort)
    $backendProc = Get-PortProcessDetails -Port $BackendPort | Select-Object -First 1

    Update-Session -Patch @{
      backend = @{
        status = 'running'
        processId = if ($backendProc) { $backendProc.pid } else { $null }
      }
    }

    return @{ ok = $true; reused = $true }
  }

  $backendPortOpen = Test-LocalPort -Port $BackendPort
  if ($backendPortOpen -and -not $AllowStart) {
    return @{ ok = $false; reason = 'degraded' }
  }

  if ($backendPortOpen) {
    $owners = Get-PortProcessDetails -Port $BackendPort
    $allowRestart = $false
    foreach ($owner in $owners) {
      if ([string]$owner.name -match 'node|powershell|pwsh|nodemon') {
        $allowRestart = $true
      }
    }

    if (-not $allowRestart) {
      Write-ErrMsg ("Porta backend {0} está ocupada por processo não esperado." -f $BackendPort)
      foreach ($owner in $owners) {
        Write-Host ('    PID {0} | {1} | {2}' -f $owner.pid, $owner.name, $owner.commandLine) -ForegroundColor Yellow
      }
      return @{ ok = $false; reason = 'port-conflict' }
    }

    Write-WarnMsg 'Backend na porta alvo está degradado. Reiniciando processo.'
    Stop-ListeningPort -Port $BackendPort -Label 'Backend' | Out-Null
    Start-Sleep -Seconds 1
  }

  if (-not $AllowStart) {
    return @{ ok = $false; reason = 'down' }
  }

  Write-Step 'Subindo backend em novo terminal...'
  $window = Start-ComponentWindow -ComponentAction 'backend'

  if (-not $window) {
    return @{ ok = $false; reason = 'spawn-failed' }
  }

  $readyHealth = Wait-BackendHealthy -TimeoutSec 60 -RequireDatabaseConnected
  if (-not $readyHealth) {
    Write-ErrMsg 'Backend não ficou saudável (status OK + database conectado).'
    return @{ ok = $false; reason = 'startup-timeout'; windowPid = $window.Id }
  }

  $proc = Get-PortProcessDetails -Port $BackendPort | Select-Object -First 1

  Update-Session -Patch @{
    backend = @{
      status = 'running'
      windowPid = $window.Id
      processId = if ($proc) { $proc.pid } else { $null }
      health = $script:BackendHealthUrl
    }
  }

  Write-Ok 'Backend online e saudável.'
  return @{ ok = $true; started = $true; windowPid = $window.Id }
}

function Test-FrontendOnline {
  $url = "http://localhost:$FrontendPort/index.html"

  try {
    $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -Method Head -TimeoutSec 3
    return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500)
  } catch {
    return $false
  }
}

function Ensure-FrontendAvailable {
  param([switch]$AllowStart)

  if (Test-LocalPort -Port $FrontendPort) {
    if (Test-FrontendOnline) {
      Write-Ok ("Frontend disponível em http://localhost:{0}" -f $FrontendPort)
      $frontendProc = Get-PortProcessDetails -Port $FrontendPort | Select-Object -First 1

      Update-Session -Patch @{
        frontend = @{
          status = 'running'
          processId = if ($frontendProc) { $frontendProc.pid } else { $null }
        }
      }

      return @{ ok = $true; reused = $true }
    }

    Write-WarnMsg ("Porta frontend {0} está aberta, mas endpoint não respondeu corretamente. Reaproveitando para evitar interrupção." -f $FrontendPort)
    return @{ ok = $true; reused = $true; uncertain = $true }
  }

  if (-not $AllowStart) {
    return @{ ok = $false; reason = 'down' }
  }

  Write-Step 'Subindo frontend em novo terminal...'
  $window = Start-ComponentWindow -ComponentAction 'frontend'
  if (-not $window) {
    return @{ ok = $false; reason = 'spawn-failed' }
  }

  $ready = Wait-LocalPort -Port $FrontendPort -TimeoutSec 20
  if (-not $ready) {
    Write-ErrMsg 'Frontend não abriu a porta esperada.'
    return @{ ok = $false; reason = 'startup-timeout'; windowPid = $window.Id }
  }

  $frontendProc = Get-PortProcessDetails -Port $FrontendPort | Select-Object -First 1

  Update-Session -Patch @{
    frontend = @{
      status = 'running'
      windowPid = $window.Id
      processId = if ($frontendProc) { $frontendProc.pid } else { $null }
      url = ('http://localhost:{0}' -f $FrontendPort)
    }
  }

  Write-Ok 'Frontend online.'
  return @{ ok = $true; started = $true; windowPid = $window.Id }
}

function Invoke-HealthChecks {
  param([switch]$TryRepairTunnel)

  $backendPortCheck = Test-NetConnection 127.0.0.1 -Port $BackendPort -WarningAction SilentlyContinue
  $frontendPortCheck = Test-NetConnection 127.0.0.1 -Port $FrontendPort -WarningAction SilentlyContinue
  $dbPortCheck = Test-NetConnection 127.0.0.1 -Port $DbLocalPort -WarningAction SilentlyContinue

  $backendPayload = $null
  if ($backendPortCheck.TcpTestSucceeded) {
    $backendPayload = Get-BackendHealthPayload -TimeoutSec 4
  }

  $repairedTunnel = $false
  $dbLooksDown = -not $dbPortCheck.TcpTestSucceeded
  $backendDbDown = $backendPayload -and ([string]$backendPayload.database -ne 'conectado')

  if (($dbLooksDown -or $backendDbDown) -and $TryRepairTunnel) {
    Write-WarnMsg 'Falha de conectividade do banco detectada. Tentando recuperar túnel SSH automaticamente...'
    $repairResult = Ensure-TunnelAvailable -AllowStart
    if ($repairResult.ok) {
      $repairedTunnel = $true
      Start-Sleep -Seconds 2
      $dbPortCheck = Test-NetConnection 127.0.0.1 -Port $DbLocalPort -WarningAction SilentlyContinue
      if ($backendPortCheck.TcpTestSucceeded) {
        $backendPayload = Get-BackendHealthPayload -TimeoutSec 4
      }
    }
  }

  $backendStatus = 'DOWN'
  $databaseStatus = 'indisponível'

  if ($backendPayload) {
    $backendStatus = [string]$backendPayload.status
    $databaseStatus = [string]$backendPayload.database
  } elseif ($backendPortCheck.TcpTestSucceeded) {
    $backendStatus = 'UNKNOWN'
    $databaseStatus = 'desconhecido'
  }

  return @{
    backendPortOk = [bool]$backendPortCheck.TcpTestSucceeded
    frontendPortOk = [bool]$frontendPortCheck.TcpTestSucceeded
    dbPortOk = [bool]$dbPortCheck.TcpTestSucceeded
    backendStatus = $backendStatus
    databaseStatus = $databaseStatus
    backendPayload = $backendPayload
    repairedTunnel = $repairedTunnel
    appVersion = Get-AppVersionString
  }
}

function Show-Summary {
  param(
    [hashtable]$HealthResult,
    [string]$Mode = 'up'
  )

  $tunnelStatus = if ($HealthResult.dbPortOk) { 'ONLINE' } else { 'OFFLINE' }
  $backendStatus = if ($HealthResult.backendPortOk) { $HealthResult.backendStatus } else { 'OFFLINE' }
  $frontendStatus = if ($HealthResult.frontendPortOk) { 'ONLINE' } else { 'OFFLINE' }

  Write-Host ''
  Write-Host '========== SINGEM DEV SUMMARY ==========' -ForegroundColor Cyan
  Write-Host ('Modo..............: {0}' -f $Mode)
  Write-Host ('Branch............: {0}' -f $Branch)
  Write-Host ('Projeto...........: {0}' -f $script:ResolvedProjectRoot)
  Write-Host ('Backend URL.......: http://localhost:{0} [{1}]' -f $BackendPort, $backendStatus)
  Write-Host ('Frontend URL......: http://localhost:{0} [{1}]' -f $FrontendPort, $frontendStatus)
  Write-Host ('Health endpoint...: {0}' -f $script:BackendHealthUrl)
  Write-Host ('Túnel DB..........: 127.0.0.1:{0} -> {1}:{2} via {3}@{4}:{5} [{6}]' -f $DbLocalPort, $DbRemoteHost, $DbRemotePort, $SshUser, $SshHost, $SshPort, $tunnelStatus)
  Write-Host ('Banco.............: {0}' -f $HealthResult.databaseStatus)
  Write-Host ('Versão app........: {0}' -f $HealthResult.appVersion)

  if ($HealthResult.repairedTunnel) {
    Write-Host 'Auto-reparo túnel.: executado' -ForegroundColor Yellow
  }

  Write-Host '========================================' -ForegroundColor Cyan
  Write-Host ''
}

function Invoke-SetupAction {
  Write-Headline 'SINGEM DEV SETUP'
  Validate-Prerequisites -AllowClone
  Initialize-Context -AllowClone

  Write-Step 'Validando portas principais'
  $backendBusy = Test-LocalPort -Port $BackendPort
  $frontendBusy = Test-LocalPort -Port $FrontendPort
  $dbBusy = Test-LocalPort -Port $DbLocalPort

  $backendPortStatus = if ($backendBusy) { 'ocupada' } else { 'livre' }
  $frontendPortStatus = if ($frontendBusy) { 'ocupada' } else { 'livre' }
  $dbPortStatus = if ($dbBusy) { 'ocupada' } else { 'livre' }

  Write-Host ("- Backend ({0}): {1}" -f $BackendPort, $backendPortStatus)
  Write-Host ("- Frontend ({0}): {1}" -f $FrontendPort, $frontendPortStatus)
  Write-Host ("- DB túnel ({0}): {1}" -f $DbLocalPort, $dbPortStatus)

  Sync-Repository
  Ensure-BackendEnvFile
  $onlyWhenMissing = -not $ForceInstall
  Ensure-NpmDependencies -WorkDir $script:ResolvedProjectRoot -Label 'root' -OnlyWhenMissing:$onlyWhenMissing
  Ensure-NpmDependencies -WorkDir $script:ServerDir -Label 'server' -OnlyWhenMissing:$onlyWhenMissing -RequiredModules @('express', 'pg')

  Update-Session -Patch (Get-DefaultSession)
  Write-Ok 'Setup concluído.'
}

function Invoke-UpAction {
  Write-Headline 'SINGEM DEV UP'
  Invoke-SetupAction

  $tunnel = Ensure-TunnelAvailable -AllowStart
  if (-not $tunnel.ok) {
    throw 'Não foi possível garantir o túnel SSH para o banco.'
  }

  $backend = Ensure-BackendAvailable -AllowStart
  if (-not $backend.ok) {
    throw 'Não foi possível garantir backend saudável.'
  }

  $frontend = Ensure-FrontendAvailable -AllowStart
  if (-not $frontend.ok) {
    throw 'Não foi possível garantir frontend ativo.'
  }

  $health = Invoke-HealthChecks -TryRepairTunnel:(-not $NoAutoRepairTunnel)
  Show-Summary -HealthResult $health -Mode 'up'

  if (-not $health.backendPortOk) {
    throw 'Backend não está respondendo na porta esperada.'
  }

  if (-not $health.dbPortOk) {
    throw 'Porta local do túnel PostgreSQL não está acessível.'
  }

  if ([string]$health.databaseStatus -ne 'conectado') {
    throw 'Backend respondeu sem conexão ativa com o banco.'
  }
}

function Invoke-TunnelAction {
  Write-Headline 'SINGEM TUNNEL'
  Validate-Prerequisites
  Initialize-Context

  $matchingTunnel = @(Get-MatchingSshTunnelProcesses)
  if ((Test-LocalPort -Port $DbLocalPort) -and $matchingTunnel.Count -gt 0) {
    Write-Ok ("Túnel já ativo na porta {0}. Nada a fazer." -f $DbLocalPort)
    Update-Session -Patch @{
      tunnel = @{
        status = 'running'
        processId = $matchingTunnel[0].ProcessId
        windowPid = $PID
      }
    }
    return
  }

  if (Test-LocalPort -Port $DbLocalPort) {
    Write-ErrMsg ("Porta {0} ocupada por processo não identificado como túnel SINGEM." -f $DbLocalPort)
    $owners = Get-PortProcessDetails -Port $DbLocalPort
    foreach ($owner in $owners) {
      Write-Host ('    PID {0} | {1} | {2}' -f $owner.pid, $owner.name, $owner.commandLine) -ForegroundColor Yellow
    }
    exit 1
  }

  Update-Session -Patch @{
    tunnel = @{
      status = 'starting'
      windowPid = $PID
      localPort = $DbLocalPort
      sshHost = $SshHost
      sshPort = $SshPort
      sshUser = $SshUser
    }
  }

  while ($true) {
    $sshArgs = @(
      '-4',
      '-N',
      '-L', "127.0.0.1`:$DbLocalPort`:$DbRemoteHost`:$DbRemotePort",
      '-o', 'ExitOnForwardFailure=yes',
      '-o', 'ConnectTimeout=8',
      '-o', 'ServerAliveInterval=30',
      '-o', 'ServerAliveCountMax=3',
      '-p', "$SshPort",
      "$SshUser@$SshHost"
    )

    Write-Step ("Abrindo túnel SSH: 127.0.0.1:{0} -> {1}:{2}" -f $DbLocalPort, $DbRemoteHost, $DbRemotePort)
    $tunnelProc = Start-Process -FilePath 'ssh.exe' -ArgumentList $sshArgs -NoNewWindow -PassThru

    $ready = Wait-LocalPort -Port $DbLocalPort -TimeoutSec 10
    if ($ready) {
      Update-Session -Patch @{
        tunnel = @{
          status = 'running'
          processId = $tunnelProc.Id
          windowPid = $PID
        }
      }
      Write-Ok ("Túnel ativo na porta {0}." -f $DbLocalPort)
    } else {
      Write-WarnMsg 'Túnel não abriu a porta local no tempo esperado.'
    }

    $tunnelProc.WaitForExit()
    $exitCode = $tunnelProc.ExitCode

    Update-Session -Patch @{
      tunnel = @{
        status = 'reconnecting'
        processId = $null
      }
    }

    Write-WarnMsg ("Processo SSH encerrado (exitcode={0}). Tentando reconectar em 3s..." -f $exitCode)
    Start-Sleep -Seconds 3
  }
}

function Invoke-BackendAction {
  Write-Headline 'SINGEM BACKEND'
  Validate-Prerequisites
  Initialize-Context

  Ensure-BackendEnvFile
  Ensure-NpmDependencies -WorkDir $script:ServerDir -Label 'server' -OnlyWhenMissing -RequiredModules @('express', 'pg')

  $healthy = Wait-BackendHealthy -TimeoutSec 2 -RequireDatabaseConnected
  if ($healthy) {
    Write-Ok 'Backend já estava saudável. Nenhum novo processo iniciado.'
    $proc = Get-PortProcessDetails -Port $BackendPort | Select-Object -First 1
    Update-Session -Patch @{
      backend = @{
        status = 'running'
        processId = if ($proc) { $proc.pid } else { $null }
        windowPid = $PID
      }
    }
    return
  }

  if (Test-LocalPort -Port $BackendPort) {
    $owners = Get-PortProcessDetails -Port $BackendPort
    $safeToRestart = $false

    foreach ($owner in $owners) {
      if ([string]$owner.name -match 'node|nodemon|powershell|pwsh') {
        $safeToRestart = $true
      }
    }

    if (-not $safeToRestart) {
      Write-ErrMsg ("Porta backend {0} ocupada por processo inesperado." -f $BackendPort)
      foreach ($owner in $owners) {
        Write-Host ('    PID {0} | {1} | {2}' -f $owner.pid, $owner.name, $owner.commandLine) -ForegroundColor Yellow
      }
      exit 1
    }

    Stop-ListeningPort -Port $BackendPort -Label 'Backend degradado' | Out-Null
    Start-Sleep -Seconds 1
  }

  Update-Session -Patch @{
    backend = @{
      status = 'running'
      processId = $null
      windowPid = $PID
      health = $script:BackendHealthUrl
    }
  }

  Push-Location $script:ServerDir
  try {
    $backendRun = Get-BackendRunSpec
    Write-Step ("Executando backend: {0}" -f $backendRun.description)

    switch ([string]$backendRun['mode']) {
      'npm-dev' {
        npm run dev
      }
      'npm-start' {
        npm run start
      }
      default {
        node index.js
      }
    }

    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
    Update-Session -Patch @{
      backend = @{
        status = 'stopped'
      }
    }
  }

  exit $exitCode
}

function Invoke-FrontendAction {
  Write-Headline 'SINGEM FRONTEND'
  Validate-Prerequisites
  Initialize-Context

  $runner = Get-FrontendRunnerSpec
  if (-not $runner) {
    Write-ErrMsg 'Python/py/http-server não encontrado para subir frontend.'
    exit 1
  }

  if (Test-LocalPort -Port $FrontendPort) {
    Write-Ok ("Frontend já ativo na porta {0}." -f $FrontendPort)
    $proc = Get-PortProcessDetails -Port $FrontendPort | Select-Object -First 1

    Update-Session -Patch @{
      frontend = @{
        status = 'running'
        processId = if ($proc) { $proc.pid } else { $null }
        windowPid = $PID
        url = ('http://localhost:{0}' -f $FrontendPort)
      }
    }

    return
  }

  Update-Session -Patch @{
    frontend = @{
      status = 'running'
      processId = $null
      windowPid = $PID
      url = ('http://localhost:{0}' -f $FrontendPort)
    }
  }

  Push-Location $script:ResolvedProjectRoot
  try {
    Write-Step ("Executando frontend com {0}" -f $runner.name)
    & ([string]$runner['command']) @($runner['args'])
    $exitCode = $LASTEXITCODE
  } finally {
    Pop-Location
    Update-Session -Patch @{
      frontend = @{
        status = 'stopped'
      }
    }
  }

  exit $exitCode
}

function Invoke-HealthAction {
  Write-Headline 'SINGEM HEALTHCHECK'
  Initialize-Context

  $health = Invoke-HealthChecks -TryRepairTunnel:(-not $NoAutoRepairTunnel)

  if (-not $health.backendPortOk) {
    Write-WarnMsg ("Backend não respondeu na porta {0}." -f $BackendPort)
    Write-Host 'Sugestão: execute SINGEM: BACKEND ou scripts\dev-up.ps1 -Action backend' -ForegroundColor Yellow
  }

  if (-not $health.frontendPortOk) {
    Write-WarnMsg ("Frontend não respondeu na porta {0}." -f $FrontendPort)
    Write-Host 'Sugestão: execute SINGEM: FRONTEND ou scripts\dev-up.ps1 -Action frontend' -ForegroundColor Yellow
  }

  if (-not $health.dbPortOk) {
    Write-WarnMsg ("Porta local do túnel ({0}) está indisponível." -f $DbLocalPort)
    Write-Host 'Sugestão: execute SINGEM: TUNNEL ou scripts\dev-up.ps1 -Action tunnel' -ForegroundColor Yellow
  }

  if ([string]$health.databaseStatus -ne 'conectado') {
    Write-WarnMsg 'Backend sem conexão confirmada com PostgreSQL.'
    Write-Host 'Sugestão: valide server/.env (DATABASE_URL/DB_PORT) e o túnel SSH.' -ForegroundColor Yellow
  }

  Show-Summary -HealthResult $health -Mode 'health'

  $failed = (-not $health.backendPortOk) -or (-not $health.frontendPortOk) -or (-not $health.dbPortOk) -or ([string]$health.databaseStatus -ne 'conectado')
  if ($failed) {
    exit 1
  }
}

function Invoke-StopAction {
  Write-Headline 'SINGEM STOP'
  Initialize-Context

  $session = Read-Session
  $stoppedAny = $false

  if ($session -and $session.Count -gt 0) {
    $stoppedAny = (Stop-ProcessIfAlive -ProcessId ([int]$session.backend.windowPid) -Label 'Backend terminal') -or $stoppedAny
    $stoppedAny = (Stop-ProcessIfAlive -ProcessId ([int]$session.backend.processId) -Label 'Backend process') -or $stoppedAny

    $stoppedAny = (Stop-ProcessIfAlive -ProcessId ([int]$session.frontend.windowPid) -Label 'Frontend terminal') -or $stoppedAny
    $stoppedAny = (Stop-ProcessIfAlive -ProcessId ([int]$session.frontend.processId) -Label 'Frontend process') -or $stoppedAny

    $stoppedAny = (Stop-ProcessIfAlive -ProcessId ([int]$session.tunnel.windowPid) -Label 'Tunnel terminal') -or $stoppedAny
    $stoppedAny = (Stop-ProcessIfAlive -ProcessId ([int]$session.tunnel.processId) -Label 'Tunnel process') -or $stoppedAny
  }

  $stoppedAny = (Stop-ListeningPort -Port $BackendPort -Label 'Backend (fallback por porta)') -or $stoppedAny
  $stoppedAny = (Stop-ListeningPort -Port $FrontendPort -Label 'Frontend (fallback por porta)') -or $stoppedAny

  $matchingTunnels = @(Get-MatchingSshTunnelProcesses)
  if ($matchingTunnels.Count -gt 0) {
    foreach ($proc in $matchingTunnels) {
      $stoppedAny = (Stop-ProcessIfAlive -ProcessId $proc.ProcessId -Label 'SSH tunnel (matching)') -or $stoppedAny
    }
  } elseif (Test-LocalPort -Port $DbLocalPort) {
    Write-WarnMsg ("Porta {0} segue ocupada por processo não identificado como túnel SINGEM." -f $DbLocalPort)
    $owners = Get-PortProcessDetails -Port $DbLocalPort
    foreach ($owner in $owners) {
      Write-Host ('    PID {0} | {1} | {2}' -f $owner.pid, $owner.name, $owner.commandLine) -ForegroundColor Yellow
    }
  }

  Clear-Session

  if ($stoppedAny) {
    Write-Ok 'Serviços DEV encerrados com sucesso.'
  } else {
    Write-WarnMsg 'Nenhum processo DEV ativo foi encontrado para encerramento.'
  }
}

try {
  switch ($Action) {
    'setup' {
      Invoke-SetupAction
    }
    'up' {
      Invoke-UpAction
    }
    'tunnel' {
      Invoke-TunnelAction
    }
    'backend' {
      Invoke-BackendAction
    }
    'frontend' {
      Invoke-FrontendAction
    }
    'health' {
      Invoke-HealthAction
    }
    'stop' {
      Invoke-StopAction
    }
  }
} catch {
  Write-ErrMsg $_.Exception.Message
  exit 1
}

exit 0
