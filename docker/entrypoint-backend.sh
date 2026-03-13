#!/bin/sh
# ============================================================
# SINGEM Backend — entrypoint Docker
# Aguarda o PostgreSQL estar acessível antes de iniciar.
# Usado como referência (o bootstrap.js já tolera banco offline).
# ============================================================
set -e

HOST="${DB_HOST:-postgres}"
PORT="${DB_PORT:-5432}"
MAX_TRIES=30
TRIES=0

echo "[Entrypoint] Aguardando PostgreSQL em ${HOST}:${PORT}..."

until nc -z "$HOST" "$PORT" 2>/dev/null; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX_TRIES" ]; then
        echo "[Entrypoint] Aviso: PostgreSQL não respondeu após ${MAX_TRIES} tentativas."
        echo "[Entrypoint] Iniciando servidor mesmo assim (bootstrap.js trata indisponibilidade)."
        break
    fi
    echo "[Entrypoint] Tentativa ${TRIES}/${MAX_TRIES} — aguardando 2s..."
    sleep 2
done

if [ "$TRIES" -lt "$MAX_TRIES" ]; then
    echo "[Entrypoint] PostgreSQL disponível."
fi

echo "[Entrypoint] Iniciando servidor SINGEM..."
exec node index.js
