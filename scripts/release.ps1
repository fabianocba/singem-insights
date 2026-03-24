$ErrorActionPreference = "Stop"
Set-Location C:\SINGEM

function Log($msg, $color="White") {
    Write-Host $msg -ForegroundColor $color
}

Log "=== SINGEM ENTERPRISE RELEASE ===" Cyan

Log "[GIT] Sync dev" Yellow
git fetch origin
git checkout dev
git pull origin dev
git add .
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { git commit -m "chore: release" }
git push origin dev

Log "[GIT] Promote dev -> main" Yellow
git checkout main
git reset --hard origin/dev
git push origin main --force

Log "[DEPLOY] VPS ENTERPRISE" Yellow

$remote = @"
set -e

cd /root/SINGEM

echo "========== BACKUP =========="
TS=`$(date +%s)
git branch backup-`$TS || true

echo "========== UPDATE =========="
git fetch origin
git checkout main
git reset --hard origin/main

echo "========== START PROD =========="
docker compose --env-file docker/prod/.env -f docker/prod/docker-compose.yml up -d --build --remove-orphans

echo "========== HEALTH CHECK =========="
sleep 10

if curl -k https://127.0.0.1/health -H "Host: singem.cloud" | grep -qi "ok"; then
    echo "HEALTH OK"
else
    echo "HEALTH FAIL"
    exit 1
fi

echo "========== STATUS =========="
docker compose --env-file docker/prod/.env -f docker/prod/docker-compose.yml ps
"@

ssh -p 2222 root@srv1401818.hstgr.cloud $remote

Log "=== DEPLOY FINALIZADO ===" Green
