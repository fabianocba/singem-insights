const path = require('path');

const DEFAULT_BASE_PATH = process.env.STORAGE_BASE_PATH || '/app/storage';
const DEFAULT_MAX_FILE_SIZE_BYTES = Number(process.env.UPLOAD_MAX_FILE_SIZE_BYTES || 25 * 1024 * 1024);
const DEFAULT_ALLOWED_MIME = String(
  process.env.UPLOAD_ALLOWED_MIME_TYPES ||
    'application/pdf,application/xml,text/xml,text/plain,image/png,image/jpeg,application/zip'
)
  .split(',')
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const basePath = path.resolve(DEFAULT_BASE_PATH);

const storageConfig = {
  basePath,
  structure: {
    notasFiscais: {
      base: path.join(basePath, 'notas-fiscais'),
      pdf: path.join(basePath, 'notas-fiscais', 'pdf'),
      xml: path.join(basePath, 'notas-fiscais', 'xml'),
      meta: path.join(basePath, 'notas-fiscais', 'meta')
    },
    empenhos: {
      base: path.join(basePath, 'empenhos'),
      pdf: path.join(basePath, 'empenhos', 'pdf')
    },
    anexos: path.join(basePath, 'anexos'),
    uploads: path.join(basePath, 'uploads'),
    temp: path.join(basePath, 'temp'),
    logs: path.join(basePath, 'logs'),
    backups: path.join(basePath, 'backups')
  },
  policy: {
    maxFileSizeBytes: Number.isFinite(DEFAULT_MAX_FILE_SIZE_BYTES) ? DEFAULT_MAX_FILE_SIZE_BYTES : 25 * 1024 * 1024,
    allowedMimeTypes: DEFAULT_ALLOWED_MIME,
    defaultMode: process.env.SINGEM_DATA_MODE === 'simulado' ? 'simulado' : 'real'
  }
};

function resolveStoragePath(modulo, categoria) {
  const normalizedModulo = String(modulo || '')
    .trim()
    .toLowerCase();
  const normalizedCategoria = String(categoria || '')
    .trim()
    .toLowerCase();

  if (normalizedModulo === 'notas-fiscais') {
    if (normalizedCategoria === 'pdf') {
      return storageConfig.structure.notasFiscais.pdf;
    }
    if (normalizedCategoria === 'xml') {
      return storageConfig.structure.notasFiscais.xml;
    }
    if (normalizedCategoria === 'meta') {
      return storageConfig.structure.notasFiscais.meta;
    }
    return storageConfig.structure.notasFiscais.base;
  }

  if (normalizedModulo === 'empenhos') {
    if (normalizedCategoria === 'pdf') {
      return storageConfig.structure.empenhos.pdf;
    }
    return storageConfig.structure.empenhos.base;
  }

  if (normalizedModulo === 'anexos') {
    return storageConfig.structure.anexos;
  }

  if (normalizedModulo === 'uploads') {
    return storageConfig.structure.uploads;
  }

  if (normalizedModulo === 'logs') {
    return storageConfig.structure.logs;
  }

  if (normalizedModulo === 'backups') {
    return storageConfig.structure.backups;
  }

  if (normalizedModulo === 'temp') {
    return storageConfig.structure.temp;
  }

  return path.join(storageConfig.structure.uploads, normalizedModulo || 'geral', normalizedCategoria || 'outros');
}

function toRelativeStoragePath(absolutePath) {
  const abs = path.resolve(absolutePath);
  const relative = path.relative(storageConfig.basePath, abs);
  if (relative.startsWith('..')) {
    throw new Error('Caminho fora da raiz de storage configurada');
  }
  return relative.replace(/\\/g, '/');
}

module.exports = {
  storageConfig,
  resolveStoragePath,
  toRelativeStoragePath
};
