#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const versionFilePath = path.resolve(__dirname, '..', 'version.json');

function formatBuildUTC(date) {
  const pad = (value) => String(value).padStart(2, '0');

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());

  return `${year}${month}${day}-${hour}${minute}`;
}

function readVersionFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function bumpSemver(version, channel) {
  const match = String(version || '0.0.0').match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return '0.1.0';
  }

  const major = Number(match[1]);
  let minor = Number(match[2]);
  let patch = Number(match[3]);

  if (channel === 'main') {
    minor += 1;
    patch = 0;
  } else {
    patch += 1;
  }

  return `${major}.${minor}.${patch}`;
}

function writeVersionFile(filePath, data) {
  const content = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(filePath, content, 'utf8');
}

/**
 * Sincroniza o FALLBACK em js/core/version.js com os valores de version.json.
 * Isso garante que o bundle frontend fique alinhado com a fonte de verdade
 * sem exigir um passo de compilação JS separado.
 */
function syncFrontendVersionFallback(jsVersionPath, data) {
  let content = fs.readFileSync(jsVersionPath, 'utf8');

  const updated = content.replace(
    /const FALLBACK = Object\.freeze\(\{[\s\S]*?\}\);/,
    `const FALLBACK = Object.freeze({\n  name: '${data.name}',\n  version: '${data.version}',\n  build: '${data.build}',\n  buildTimestamp: '${data.buildTimestamp}'\n});`
  );

  if (updated === content) {
    console.warn(
      '[bump-version] AVISO: não foi possível localizar FALLBACK em js/core/version.js — atualize manualmente.'
    );
    return;
  }

  fs.writeFileSync(jsVersionPath, updated, 'utf8');
  console.log(`[bump-version] js/core/version.js FALLBACK sincronizado → ${data.version} (${data.build})`);
}

function syncPackageJsonVersion(pkgPath, version) {
  if (!fs.existsSync(pkgPath)) return;
  const raw = fs.readFileSync(pkgPath, 'utf8').replace(/^\uFEFF/, '');
  const pkg = JSON.parse(raw);
  if (pkg.version === version) return;
  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  console.log(`[bump-version] ${path.relative(path.resolve(__dirname, '..'), pkgPath)} → ${version}`);
}

function run() {
  const now = new Date();
  const current = readVersionFile(versionFilePath);
  const channel = String(current.channel || 'dev').toLowerCase();

  const next = {
    ...current,
    version: bumpSemver(current.version, channel),
    build: formatBuildUTC(now),
    buildTimestamp: now.toISOString()
  };

  writeVersionFile(versionFilePath, next);
  console.log(`[bump-version] version.json → ${next.version} (${next.build})`);

  const jsVersionPath = path.resolve(__dirname, '..', 'js', 'core', 'version.js');
  syncFrontendVersionFallback(jsVersionPath, next);

  syncPackageJsonVersion(path.resolve(__dirname, '..', 'package.json'), next.version);
  syncPackageJsonVersion(path.resolve(__dirname, '..', 'server', 'package.json'), next.version);
}

run();
