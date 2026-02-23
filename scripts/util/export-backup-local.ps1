$ErrorActionPreference = "Stop"
$destRoot = "C:\SINGEM_BACKUPS"
$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $destRoot "singem-$ts"
New-Item -ItemType Directory -Force -Path $dest | Out-Null
Copy-Item "$PSScriptRoot\..\..\js" $dest -Recurse -Force
Copy-Item "$PSScriptRoot\..\..\css" $dest -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$PSScriptRoot\..\..\config" $dest -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$PSScriptRoot\..\..\server" $dest -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "Backup em $dest"
