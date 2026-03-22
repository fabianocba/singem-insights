#!/bin/sh
# ============================================================
# SINGEM Backend — entrypoint Docker
# Aguarda o PostgreSQL estar acessível antes de iniciar.
# Usa Node.js para verificação TCP (compatível com Alpine).
# ============================================================
set -e

HOST="${DB_HOST:-postgres}"
DB_READY_PORT="${DB_PORT:-5432}"
MAX_TRIES=30
TRIES=0

echo "[DOCKER][BOOT] Aguardando PostgreSQL em ${HOST}:${DB_READY_PORT}..."

until node -e "
    const s = require('net').createConnection({ host: '$HOST', port: $DB_READY_PORT });
  s.on('connect', () => { s.destroy(); process.exit(0); });
  s.on('error', () => process.exit(1));
  setTimeout(() => process.exit(1), 2000);
" 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
        echo "[DOCKER][BOOT] Aviso: PostgreSQL não respondeu após ${MAX_TRIES} tentativas."
        echo "[DOCKER][BOOT] Iniciando servidor mesmo assim (bootstrap.js trata indisponibilidade)."
        break
    fi
    echo "[DOCKER][BOOT] Tentativa ${TRIES}/${MAX_TRIES} — aguardando 2s..."
    sleep 2
done

if [ "$TRIES" -lt "$MAX_TRIES" ]; then
    echo "[DOCKER][BOOT] PostgreSQL disponível."
fi

echo "[DOCKER][BOOT] Iniciando servidor SINGEM..."
exec "$@"
