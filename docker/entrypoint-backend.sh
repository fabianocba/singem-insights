#!/bin/sh
# ============================================================
# SINGEM Backend — entrypoint Docker (melhorado)
# Aguarda o PostgreSQL estar acessível antes de iniciar.
# Usa Node.js para verificação TCP (compatível com Alpine).
# ============================================================
set -e

HOST="${DB_HOST:-postgres}"
DB_READY_PORT="${DB_PORT:-5432}"
MAX_TRIES=30
TRIES=0

echo "[DOCKER][BOOT] ============================================"
echo "[DOCKER][BOOT] SINGEM Backend Startup"
echo "[DOCKER][BOOT] ============================================"
echo "[DOCKER][BOOT] HOST=$HOST"
echo "[DOCKER][BOOT] PORT=$DB_READY_PORT"
echo "[DOCKER][BOOT] NODE_ENV=${NODE_ENV:-development}"
echo "[DOCKER][BOOT] ============================================"
echo ""

echo "[DOCKER][BOOT] Aguardando PostgreSQL em ${HOST}:${DB_READY_PORT}..."

until node -e "
    const net = require('net');
    const s = net.createConnection({ host: '$HOST', port: $DB_READY_PORT });
    const timeoutHandle = setTimeout(() => { s.destroy(); process.exit(1); }, 2000);
    s.on('connect', () => { clearTimeout(timeoutHandle); s.destroy(); process.exit(0); });
    s.on('error', () => { clearTimeout(timeoutHandle); process.exit(1); });
" 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
        echo "[DOCKER][BOOT] ⚠️  PostgreSQL não respondeu após ${MAX_TRIES} tentativas (${MAX_TRIES}*2s)"
        echo "[DOCKER][BOOT] ⚠️  Iniciando servidor mesmo assim (bootstrap.js trata indisponibilidade)"
        echo "[DOCKER][BOOT] ⚠️  Se o banco não estiver pronto, espere a aplicação inicializar automaticamente"
        break
    fi
    ELAPSED=$((TRIES * 2))
    echo "[DOCKER][BOOT] Tentativa ${TRIES}/${MAX_TRIES} (${ELAPSED}s total) — aguardando 2s..."
    sleep 2
done

if [ "$TRIES" -lt "$MAX_TRIES" ]; then
    echo "[DOCKER][BOOT] ✅ PostgreSQL disponível em ${TRIES} tentativa(s)"
fi

echo ""
echo "[DOCKER][BOOT] ============================================"
echo "[DOCKER][BOOT] Iniciando servidor SINGEM em PORT=${PORT:-3000}..."
echo "[DOCKER][BOOT] ============================================"
echo ""

# Executa o comando principal (node index.js)
# O entrypoint passa o controle para o CMD do Dockerfile
exec "$@"
