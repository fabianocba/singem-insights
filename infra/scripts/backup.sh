#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="${SINGEM_PROJECT_DIR:-/opt/singem}"
STORAGE_DIR="${SINGEM_STORAGE_HOST_PATH:-${PROJECT_DIR}/storage}"
BACKUP_DIR="${STORAGE_DIR}/backups"
COMPOSE_FILE="${SINGEM_COMPOSE_FILE:-${PROJECT_DIR}/docker/prod/docker-compose.prod.yml}"
ENV_FILE="${SINGEM_ENV_FILE:-${PROJECT_DIR}/docker/prod/.env.prod}"
RETENTION_DAYS="${SINGEM_BACKUP_RETENTION_DAYS:-15}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
DB_DUMP_FILE="${BACKUP_DIR}/postgres-${TIMESTAMP}.sql"
STORAGE_ARCHIVE_FILE="${BACKUP_DIR}/storage-${TIMESTAMP}.tar.gz"

mkdir -p "${BACKUP_DIR}"

if [ ! -f "${COMPOSE_FILE}" ]; then
	echo "[ERRO] Compose não encontrado: ${COMPOSE_FILE}" >&2
	exit 1
fi

if [ ! -f "${ENV_FILE}" ]; then
	echo "[ERRO] Arquivo de ambiente não encontrado: ${ENV_FILE}" >&2
	exit 1
fi

echo "[INFO] Iniciando backup PostgreSQL..."
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" exec -T postgres \
	sh -lc 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB"' > "${DB_DUMP_FILE}"

echo "[INFO] Iniciando backup do storage..."
tar --exclude='backups' -czf "${STORAGE_ARCHIVE_FILE}" -C "${STORAGE_DIR}" .

echo "[OK] Backup concluído"
echo "[OK] Dump DB: ${DB_DUMP_FILE}"
echo "[OK] Storage: ${STORAGE_ARCHIVE_FILE}"

if [[ "${RETENTION_DAYS}" =~ ^[0-9]+$ ]] && [ "${RETENTION_DAYS}" -gt 0 ]; then
	echo "[INFO] Aplicando retenção de backups: ${RETENTION_DAYS} dias"
	find "${BACKUP_DIR}" -type f \( -name 'postgres-*.sql' -o -name 'storage-*.tar.gz' \) -mtime +"${RETENTION_DAYS}" -print -delete || true
fi
