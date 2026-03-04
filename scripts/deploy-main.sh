#!/usr/bin/env bash
set -euo pipefail

REMOTE="${REMOTE:-origin}"
APP_NAME="${APP_NAME:-singem-server}"
CREATE_TAG="${CREATE_TAG:-1}"

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

VERSION_OUTPUT="$(node <<'NODE'
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const versionFileCandidates = [
  path.join(root, 'version.json'),
  path.join(root, 'js', 'core', 'version.json')
];
const versionFilePath = versionFileCandidates.find((candidate) => fs.existsSync(candidate)) || versionFileCandidates[0];
const serverPackagePath = path.join(root, 'server', 'package.json');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJson = (filePath, data) => fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const coreVersion = readJson(versionFilePath);
const serverPackage = readJson(serverPackagePath);

const currentVersion = String(serverPackage.version || coreVersion.version || '0.0.0').trim();
const match = currentVersion.match(/^(\d+)\.(\d+)\.(\d+)$/);
if (!match) {
  throw new Error(`Versão inválida em server/package.json: ${currentVersion}`);
}

const nextVersion = `${match[1]}.${match[2]}.${Number(match[3]) + 1}`;

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const build = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}-${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}`;
const buildTimestamp = now.toISOString();

const nextCoreVersion = {
  ...coreVersion,
  name: coreVersion.name || 'SINGEM',
  version: nextVersion,
  build,
  buildTimestamp
};

serverPackage.version = nextVersion;

writeJson(versionFilePath, nextCoreVersion);
writeJson(serverPackagePath, serverPackage);

console.log(`VERSION=${nextVersion}`);
console.log(`BUILD=${build}`);
NODE
)"

NEW_VERSION="$(echo "$VERSION_OUTPUT" | awk -F= '/^VERSION=/{print $2}')"
NEW_BUILD="$(echo "$VERSION_OUTPUT" | awk -F= '/^BUILD=/{print $2}')"

if [[ -z "$NEW_VERSION" || -z "$NEW_BUILD" ]]; then
  echo "❌ Falha ao gerar nova versão/build."
  exit 1
fi

echo "📦 Nova versão: v${NEW_VERSION} • build ${NEW_BUILD}"

if [[ -f version.json ]]; then
  git add version.json
fi

if [[ -f js/core/version.json ]]; then
  git add js/core/version.json
fi

git add server/package.json

if git diff --cached --quiet; then
  echo "ℹ️ Nenhuma alteração de versão detectada para commit."
else
  git commit -m "chore(release): v${NEW_VERSION} build ${NEW_BUILD}"
fi

if [[ "$CREATE_TAG" == "1" ]]; then
  git tag -a "v${NEW_VERSION}" -m "Release v${NEW_VERSION} (${NEW_BUILD})"
fi

git push "$REMOTE" main
if [[ "$CREATE_TAG" == "1" ]]; then
  git push "$REMOTE" --tags
fi

if command -v pm2 >/dev/null 2>&1; then
  if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
    pm2 restart "$APP_NAME"
    echo "✅ PM2 reiniciado: ${APP_NAME}"
  else
    echo "⚠️ PM2 app '${APP_NAME}' não encontrada. Reinicie manualmente o processo correto."
  fi
else
  echo "⚠️ PM2 não encontrado neste host. Reinicie o backend manualmente."
fi

echo "✅ Deploy main concluído."
