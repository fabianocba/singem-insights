Write-Host ""
Write-Host "=== SINGEM START DEV ==="
Write-Host ""

# 🔎 Descobrir raiz real do repo
$ProjectRoot = git rev-parse --show-toplevel 2>$null
if (-not $ProjectRoot) {
    Write-Host "❌ Não foi possível localizar a raiz do Git."
    exit 1
}

Set-Location $ProjectRoot
Write-Host "Projeto: $ProjectRoot"
Write-Host ""

# ==============================
# GIT SYNC SEGURO
# ==============================
Write-Host "==> GIT: sincronizar dev sem risco de perda"

git fetch origin

# Ignorar version.json na checagem de dirty
$dirtyFiles = git status --porcelain | Where-Object { $_ -notmatch "js/core/version.json" }

if ($dirtyFiles) {
    Write-Host ""
    Write-Host "❌ Repo sujo (exceto version.json):"
    $dirtyFiles
    Write-Host ""
    exit 1
}

git checkout dev
git pull --ff-only origin dev

Write-Host "✅ Repo sincronizado com origin/dev"
Write-Host ""

# ==============================
# FRONTEND
# ==============================
Write-Host "==> FRONT: iniciar servidor local 8000"

Start-Process powershell -ArgumentList "cd `"$ProjectRoot`"; python -m http.server 8000"

Start-Sleep -Seconds 2

# ==============================
# BACKEND
# ==============================
Write-Host "==> BACKEND: iniciar npm run dev (porta 3000)"

Start-Process powershell -ArgumentList "cd `"$ProjectRoot\server`"; npm run dev"

Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🌐 Frontend:  http://localhost:8000"
Write-Host "🔎 Health:    http://localhost:3000/health"
Write-Host ""
Write-Host "🚀 Ambiente DEV iniciado com sucesso."
Write-Host ""
