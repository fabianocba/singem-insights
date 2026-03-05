#!/usr/bin/env bash
set -euo pipefail

REMOTE="${REMOTE:-origin}"
APP_NAME="${APP_NAME:-singem-server}"
CREATE_TAG="${CREATE_TAG:-1}"
PM2_ENTRY="${PM2_ENTRY:-server/index.js}"
RUNTIME_VERSION_FILE="${RUNTIME_VERSION_FILE:-/opt/singem/runtime/version.json}"

echo "🚀 Deploy main SINGEM (bump patch automático)"

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

git fetch "$REMOTE" main
git checkout main
git pull "$REMOTE" main --ff-only

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

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME" --update-env
    echo "✅ PM2 reiniciado: ${APP_NAME}"
  else
    if [[ -f "$PM2_ENTRY" ]]; then
      pm2 start "$PM2_ENTRY" --name "$APP_NAME" --update-env
      echo "✅ PM2 iniciado: ${APP_NAME} (${PM2_ENTRY})"
    else
      echo "❌ PM2 app '${APP_NAME}' não encontrada e entrypoint '${PM2_ENTRY}' inexistente."
      exit 1
    fi
  fi

  pm2 save
  echo "✅ PM2 state salvo."
else
  echo "⚠️ PM2 não encontrado neste host. Reinicie o backend manualmente."
fi

echo "✅ Deploy main concluído."
