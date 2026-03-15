#!/usr/bin/env bash
# ============================================================
# SINGEM — Deploy para main (tag + push + Docker restart)
#
# Uso:
#   bash scripts/deploy-main.sh                # deploy padrão
#   CREATE_TAG=0 bash scripts/deploy-main.sh   # sem tag
#   COMPOSE_DIR=docker/prod bash scripts/deploy-main.sh
#
# Pré-requisitos:
#   - Branch main, working tree limpo
#   - Docker Compose instalado na VPS
#   - docker/prod/.env configurado
# ============================================================
set -euo pipefail

REMOTE="${REMOTE:-origin}"
CREATE_TAG="${CREATE_TAG:-1}"
COMPOSE_DIR="${COMPOSE_DIR:-docker/prod}"
RUNTIME_VERSION_FILE="${RUNTIME_VERSION_FILE:-/opt/singem/runtime/version.json}"

echo "🚀 Deploy main SINGEM (bump patch automático)"

# --- Validações de segurança --------------------------------
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "❌ Não é um repositório git válido."
  exit 1
fi

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "❌ Abortado: branch atual '$CURRENT_BRANCH'. Execute apenas na 'main'."
  exit 1
fi

if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "❌ Abortado: working tree sujo. Faça commit/stash antes do deploy."
  exit 1
fi

# --- Atualiza código ----------------------------------------
git fetch "$REMOTE" main
git checkout main
git pull "$REMOTE" main --ff-only

# --- Bump de versão -----------------------------------------
export SINGEM_RUNTIME_VERSION_FILE="$RUNTIME_VERSION_FILE"
echo "🔢 Atualizando versão de runtime em: ${SINGEM_RUNTIME_VERSION_FILE}"
npm --prefix server run version:deploy

VERSION_OUTPUT="$(node <<'NODE'
const fs = require('fs');

const runtimeFile = process.env.SINGEM_RUNTIME_VERSION_FILE;

if (!runtimeFile) {
  throw new Error('SINGEM_RUNTIME_VERSION_FILE não definido.');
}

const raw = fs.readFileSync(runtimeFile, 'utf8').replace(/^\uFEFF/, '');
const parsed = JSON.parse(raw);

console.log(`VERSION=${String(parsed.version || '').trim()}`);
console.log(`BUILD=${String(parsed.build || '').trim()}`);
NODE
)"

NEW_VERSION="$(echo "$VERSION_OUTPUT" | awk -F= '/^VERSION=/{print $2}')"
NEW_BUILD="$(echo "$VERSION_OUTPUT" | awk -F= '/^BUILD=/{print $2}')"

if [[ -z "$NEW_VERSION" || -z "$NEW_BUILD" ]]; then
  echo "❌ Falha ao ler versão/build de runtime."
  exit 1
fi

echo "📦 Versão runtime ativa: v${NEW_VERSION} • build ${NEW_BUILD}"

# --- Tag e push ---------------------------------------------
if [[ "$CREATE_TAG" == "1" ]]; then
  if git rev-parse -q --verify "refs/tags/v${NEW_VERSION}" >/dev/null 2>&1; then
    echo "⚠️ Tag v${NEW_VERSION} já existe; pulando criação de tag."
  else
    git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION} (${NEW_BUILD})"
  fi
fi

git push "$REMOTE" main
if [[ "$CREATE_TAG" == "1" ]]; then
  git push "$REMOTE" --tags
fi

# --- Restart via Docker Compose -----------------------------
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ Docker não encontrado. Instale Docker + Compose antes do deploy."
  exit 1
fi

if [[ ! -f "${COMPOSE_DIR}/.env" ]]; then
  echo "❌ ${COMPOSE_DIR}/.env não encontrado. Execute docker-setup primeiro."
  exit 1
fi

echo "🐳 Reconstruindo containers via Docker Compose..."
docker compose -f "${COMPOSE_DIR}/docker-compose.yml" up -d --build --remove-orphans

# Aguarda backend saudável (max 90s)
echo "⏳ Aguardando backend ficar saudável..."
TRIES=0
MAX=30
until docker compose -f "${COMPOSE_DIR}/docker-compose.yml" exec -T backend \
  wget -qO- http://localhost:3000/health >/dev/null 2>&1; do
    TRIES=$((TRIES + 1))
    if [ "$TRIES" -ge "$MAX" ]; then
      echo "⚠️ Backend não respondeu após ${MAX} tentativas."
      docker compose -f "${COMPOSE_DIR}/docker-compose.yml" logs --tail=30 backend
      exit 1
    fi
    sleep 3
done
echo "✅ Backend saudável."

# Limpa imagens antigas
docker image prune -f --filter "until=72h" 2>/dev/null || true

echo "✅ Deploy main concluído — v${NEW_VERSION} (${NEW_BUILD})"
