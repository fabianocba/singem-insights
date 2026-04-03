const fs = require('fs').promises;
const path = require('path');
const { storageConfig } = require('../config/storage');
const { logInfo, logError } = require('../config/logger');

function listManagedDirs() {
  const dirs = new Set([
    storageConfig.basePath,
    storageConfig.structure.notasFiscais.base,
    storageConfig.structure.notasFiscais.pdf,
    storageConfig.structure.notasFiscais.xml,
    storageConfig.structure.notasFiscais.meta,
    storageConfig.structure.empenhos.base,
    storageConfig.structure.empenhos.pdf,
    storageConfig.structure.anexos,
    storageConfig.structure.uploads,
    storageConfig.structure.temp,
    storageConfig.structure.logs,
    storageConfig.structure.backups
  ]);

  return Array.from(dirs);
}

async function ensureDirWritable(dir) {
  await fs.mkdir(dir, { recursive: true });

  const probeFile = path.join(dir, '.singem-write-test');
  await fs.writeFile(probeFile, 'ok', 'utf8');
  await fs.unlink(probeFile);
}

async function bootstrapStorageDirectories({ strict = true } = {}) {
  const managedDirs = listManagedDirs();
  const failures = [];

  for (const dir of managedDirs) {
    try {
      await ensureDirWritable(dir);
      logInfo('Storage directory ready', { dir });
    } catch (error) {
      failures.push({ dir, error: error.message });
      logError('Storage directory check failed', { dir, error: error.message });
    }
  }

  if (failures.length > 0 && strict) {
    const details = failures.map((item) => `${item.dir}: ${item.error}`).join(' | ');
    throw new Error(`[Storage] Falha ao inicializar diretórios persistentes: ${details}`);
  }

  if (failures.length > 0) {
    return { ok: false, failures, managedDirs };
  }

  return { ok: true, failures: [], managedDirs };
}

module.exports = {
  bootstrapStorageDirectories,
  listManagedDirs
};
