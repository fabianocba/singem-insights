#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="${SINGEM_VPS_BASE_DIR:-/opt/singem}"
STORAGE_DIR="${SINGEM_STORAGE_HOST_PATH:-${BASE_DIR}/storage}"
CONFIG_DIR="${SINGEM_CONFIG_HOST_PATH:-${BASE_DIR}/config}"
DATA_DIR="${SINGEM_DATA_HOST_PATH:-${BASE_DIR}/data}"

mkdir -p "${STORAGE_DIR}/notas-fiscais/pdf"
mkdir -p "${STORAGE_DIR}/notas-fiscais/xml"
mkdir -p "${STORAGE_DIR}/notas-fiscais/meta"
mkdir -p "${STORAGE_DIR}/empenhos/pdf"
mkdir -p "${STORAGE_DIR}/anexos"
mkdir -p "${STORAGE_DIR}/uploads"
mkdir -p "${STORAGE_DIR}/temp"
mkdir -p "${STORAGE_DIR}/logs/backend"
mkdir -p "${STORAGE_DIR}/backups"
mkdir -p "${CONFIG_DIR}"
mkdir -p "${DATA_DIR}/postgres"
mkdir -p "${DATA_DIR}/redis"

chmod -R 775 "${BASE_DIR}"

echo "[SINGEM][STORAGE] Estrutura persistente preparada em ${BASE_DIR}"
