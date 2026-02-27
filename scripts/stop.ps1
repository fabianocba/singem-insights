Write-Host ""
Write-Host "=== SINGEM STOP DEV ==="
Write-Host ""

$ProjectRoot = git rev-parse --show-toplevel 2>$null
if (-not $ProjectRoot) {
    Write-Host "❌ Não foi possível localizar a raiz do Git."
    exit 1
}

Set-Location $ProjectRoot
Write-Host "Projeto: $ProjectRoot"
Write-Host ""

# ==============================
# ENCERRAR PROCESSOS
# ==============================
Write-Host "==> Encerrando processos Node e Python..."

Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process python -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "✅ Processos encerrados."
Write-Host ""

# ==============================
# CHECAGEM DE ALTERAÇÕES
# ==============================
$dirtyFiles = git status --porcelain | Where-Object { $_ -notmatch "js/core/version.json" }

if ($dirtyFiles) {
    Write-Host ""
    Write-Host "⚠️ Existem alterações pendentes (exceto version.json):"
    $dirtyFiles
    Write-Host ""
    Write-Host "Se quiser salvar:"
    Write-Host "git add ."
    Write-Host 'git commit -m "mensagem"'
    Write-Host "git push origin dev"
    Write-Host ""
} else {
    Write-Host "✅ Nenhuma alteração pendente relevante."
}

Write-Host ""
Write-Host "🛑 Ambiente DEV encerrado."
Write-Host ""
