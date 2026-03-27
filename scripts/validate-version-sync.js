#!/usr/bin/env node
/**
 * Valida que version.json, js/core/version.js (FALLBACK),
 * package.json e server/package.json estão todos sincronizados.
 *
 * Usado no CI e como gate local antes de commits/deploys.
 * Sai com código 1 se qualquer divergência for detectada.
 *
 * Uso: node scripts/validate-version-sync.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '');
  return JSON.parse(raw);
}

function extractFallbackField(jsContent, field) {
  const match = jsContent.match(new RegExp(`${field}:\\s*'([^']+)'`));
  return match ? match[1] : null;
}

let ok = true;

function fail(msg) {
  console.error(`[ERRO] ${msg}`);
  ok = false;
}

// ── 1. version.json (fonte de verdade) ──────────────────────────
const versionJsonPath = path.join(root, 'version.json');
const vj = readJson(versionJsonPath);

if (!vj.version) fail('version.json não contém campo "version"');
if (!vj.build) fail('version.json não contém campo "build"');
if (!vj.name) fail('version.json não contém campo "name"');

// ── 2. js/core/version.js FALLBACK ──────────────────────────────
const jsCoreVersionPath = path.join(root, 'js', 'core', 'version.js');
const jsContent = fs.readFileSync(jsCoreVersionPath, 'utf8');

const fallbackMatch = jsContent.match(/const FALLBACK = Object\.freeze\(\{([\s\S]*?)\}\);/);
if (!fallbackMatch) {
  fail('js/core/version.js: bloco FALLBACK não encontrado');
} else {
  const block = fallbackMatch[1];
  const fbVersion = extractFallbackField(block, 'version');
  const fbBuild = extractFallbackField(block, 'build');
  const fbName = extractFallbackField(block, 'name');

  if (fbVersion !== vj.version) {
    fail(`js/core/version.js FALLBACK.version="${fbVersion}" ≠ version.json="${vj.version}"`);
  }
  if (fbBuild !== vj.build) {
    fail(`js/core/version.js FALLBACK.build="${fbBuild}" ≠ version.json="${vj.build}"`);
  }
  if (fbName !== vj.name) {
    fail(`js/core/version.js FALLBACK.name="${fbName}" ≠ version.json="${vj.name}"`);
  }
}

// ── 3. package.json ─────────────────────────────────────────────
const rootPkg = readJson(path.join(root, 'package.json'));
if (rootPkg.version !== vj.version) {
  fail(`package.json.version="${rootPkg.version}" ≠ version.json="${vj.version}"`);
}

// ── 4. server/package.json ──────────────────────────────────────
const serverPkgPath = path.join(root, 'server', 'package.json');
if (fs.existsSync(serverPkgPath)) {
  const serverPkg = readJson(serverPkgPath);
  if (serverPkg.version !== vj.version) {
    fail(`server/package.json.version="${serverPkg.version}" ≠ version.json="${vj.version}"`);
  }
}

// ── Resultado ───────────────────────────────────────────────────
if (ok) {
  console.log(`[OK] Todas as fontes de versão sincronizadas: ${vj.name} ${vj.version} (${vj.build})`);
  process.exit(0);
} else {
  console.error('');
  console.error('Para corrigir: node scripts/bump-version.js  OU  pwsh scripts/version.ps1');
  process.exit(1);
}
