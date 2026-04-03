#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${SINGEM_PROJECT_DIR:-/opt/singem}"
STORAGE_DIR="${SINGEM_STORAGE_HOST_PATH:-${PROJECT_DIR}/storage}"
BACKUP_DIR="${STORAGE_DIR}/backups"
COMPOSE_FILE="${SINGEM_COMPOSE_FILE:-${PROJECT_DIR}/docker/prod/docker-compose.prod.yml}"
ENV_FILE="${SINGEM_ENV_FILE:-${PROJECT_DIR}/docker/prod/.env.prod}"

DB_DUMP_FILE="${1:-}"
STORAGE_ARCHIVE_FILE="${2:-}"

if [ -z "${DB_DUMP_FILE}" ] || [ -z "${STORAGE_ARCHIVE_FILE}" ]; then
	echo "Uso: $0 <dump.sql> <storage.tar.gz>" >&2
	echo "Exemplo: $0 ${BACKUP_DIR}/postgres-20260402-220000.sql ${BACKUP_DIR}/storage-20260402-220000.tar.gz" >&2
	exit 1
fi

if [ ! -f "${DB_DUMP_FILE}" ]; then
	echo "[ERRO] Dump SQL não encontrado: ${DB_DUMP_FILE}" >&2
	exit 1
fi

if [ ! -f "${STORAGE_ARCHIVE_FILE}" ]; then
	echo "[ERRO] Arquivo storage não encontrado: ${STORAGE_ARCHIVE_FILE}" >&2
	exit 1
fi

echo "[INFO] Restaurando banco de dados..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
	sh -lc 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < "${DB_DUMP_FILE}"

echo "[INFO] Restaurando arquivos de storage..."
mkdir -p "${STORAGE_DIR}"
tar -xzf "${STORAGE_ARCHIVE_FILE}" -C "${STORAGE_DIR}"

echo "[OK] Restauração concluída"
