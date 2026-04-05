#!/usr/bin/env node
/**
 * SINGEM Backend — Validador de Imports
 * Verifica se todos os módulos críticos podem ser carregados
 * Executar: node server/scripts/validate-imports.js
 */

const path = require('path');

const MODULE_LIST = [
  './bootstrap',
  './app',
  './db',
  './config',
  './config/database',
  './utils/version',
  './middlewares/requestId',
  './middlewares/requestLogger',
  './middlewares/errorHandler',
  './middleware/rateLimit',
  './middleware/auth',
  './utils/appError',
  './src/core/routes',
  './src/services/NfeImportService',
  './src/services/NfeImportServiceV2',
  './src/services/systemConfigService',
  './src/services/emailService',
  './src/bootstrap/storageBootstrap',
  './src/config/storage',
];

const PACKAGE_DEPENDENCIES = [
  'express',
  'cors',
  'body-parser',
  'helmet',
  'pg',
  'dotenv',
  'jsonwebtoken',
  'bcrypt',
  'multer',
  'express-rate-limit',
  'nodemailer',
  'zod',
];

console.log('\n' + '='.repeat(60));
console.log('SINGEM Backend — Import Validation');
console.log('='.repeat(60) + '\n');

let passed = 0;
let failed = 0;

console.log('📦 Validando dependências do package.json...\n');

PACKAGE_DEPENDENCIES.forEach((pkg) => {
  try {
    require(pkg);
    console.log(`  ✅ ${pkg}`);
    passed++;
  } catch (error) {
    console.error(`  ❌ ${pkg} — ${error.message}`);
    failed++;
  }
});

console.log('\n' + '-'.repeat(60) + '\n');
console.log('📂 Validando módulos internos do backend...\n');

const serverDir = path.join(__dirname, '..');

function resolveInternalModule(modulePath) {
  const normalizedModulePath = modulePath.startsWith('./') ? modulePath.slice(2) : modulePath;
  return path.join(serverDir, normalizedModulePath);
}

MODULE_LIST.forEach((modulePath) => {
  try {
    const resolvedModule = resolveInternalModule(modulePath);
    require(resolvedModule);
    console.log(`  ✅ ${modulePath}`);
    passed++;
  } catch (error) {
    console.error(`  ❌ ${modulePath}`);
    console.error(`     Error: ${error.message}`);
    failed++;
  }
});

console.log('\n' + '='.repeat(60));
console.log(`Resultado: ${passed}✅ | ${failed}❌`);
console.log('='.repeat(60) + '\n');

if (failed === 0) {
  console.log('✅ Todos os imports estão válidos!\n');
  process.exit(0);
} else {
  console.error(`❌ ${failed} módulo(s) falharam!\n`);
  process.exit(1);
}
