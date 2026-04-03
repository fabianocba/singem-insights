const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const db = require('../../db');
const { storageConfig, resolveStoragePath, toRelativeStoragePath } = require('../config/storage');

const KNOWN_EXTENSIONS = {
  'application/pdf': '.pdf',
  'application/xml': '.xml',
  'text/xml': '.xml',
  'text/plain': '.txt',
  'application/json': '.json',
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'application/zip': '.zip'
};

function sanitizeBaseName(input) {
  return String(input || 'arquivo')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function resolveExtension(originalName, mimeType) {
  const fromMime = KNOWN_EXTENSIONS[String(mimeType || '').toLowerCase()] || '';
  const fromName = path.extname(String(originalName || '')).toLowerCase();

  if (fromMime) {
    return fromMime;
  }

  if (fromName && fromName.length <= 10) {
    return fromName;
  }

  return '.bin';
}

function assertInsideBase(fullPath) {
  const resolved = path.resolve(fullPath);
  const relative = path.relative(storageConfig.basePath, resolved);
  if (relative.startsWith('..')) {
    throw new Error('Tentativa de acesso fora do storage base');
  }
  return resolved;
}

function buildStoredName({ prefix, originalName, ext }) {
  const timestamp = new Date().toISOString().replace(/[-:.TZ]/g, '');
  const nonce = crypto.randomBytes(6).toString('hex');
  const sanitized = sanitizeBaseName(path.basename(originalName, path.extname(originalName)) || 'arquivo');
  return `${prefix}_${sanitized}_${timestamp}_${nonce}${ext}`;
}

async function registerFileMetadata(payload) {
  const sql = `
    INSERT INTO arquivos (
      modulo,
      categoria,
      nome_original,
      nome_armazenado,
      extensao,
      mime_type,
      tamanho_bytes,
      caminho_relativo,
      caminho_absoluto,
      hash_arquivo,
      entidade_tipo,
      entidade_id,
      usuario_criador,
      status,
      modo_registro
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
    )
    RETURNING *
  `;

  const params = [
    payload.modulo,
    payload.categoria,
    payload.nomeOriginal,
    payload.nomeArmazenado,
    payload.extensao,
    payload.mimeType,
    payload.tamanhoBytes,
    payload.caminhoRelativo,
    payload.caminhoAbsoluto,
    payload.hashArquivo,
    payload.entidadeTipo,
    payload.entidadeId,
    payload.usuarioCriador,
    payload.status || 'ativo',
    payload.modoRegistro || storageConfig.policy.defaultMode
  ];

  const result = await db.query(sql, params);
  return result.rows[0];
}

async function saveBuffer({
  buffer,
  originalName,
  mimeType,
  modulo,
  categoria,
  entidadeTipo = null,
  entidadeId = null,
  usuarioCriador = null,
  prefix = 'FILE',
  modoRegistro = storageConfig.policy.defaultMode
}) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Buffer inválido para salvar arquivo');
  }

  if (buffer.length > storageConfig.policy.maxFileSizeBytes) {
    throw new Error(`Arquivo excede o limite de ${storageConfig.policy.maxFileSizeBytes} bytes`);
  }

  const mime = String(mimeType || '').toLowerCase();
  if (storageConfig.policy.allowedMimeTypes.length > 0 && !storageConfig.policy.allowedMimeTypes.includes(mime)) {
    throw new Error(`Tipo MIME não permitido: ${mime || 'desconhecido'}`);
  }

  const targetDir = resolveStoragePath(modulo, categoria);
  await fsp.mkdir(targetDir, { recursive: true });

  const extension = resolveExtension(originalName, mime);
  const storedName = buildStoredName({ prefix, originalName, ext: extension });
  const absolutePath = assertInsideBase(path.join(targetDir, storedName));

  const hashArquivo = crypto.createHash('sha256').update(buffer).digest('hex');

  await fsp.writeFile(absolutePath, buffer);

  const metadata = await registerFileMetadata({
    modulo,
    categoria,
    nomeOriginal: originalName,
    nomeArmazenado: storedName,
    extensao: extension,
    mimeType: mime || 'application/octet-stream',
    tamanhoBytes: buffer.length,
    caminhoRelativo: toRelativeStoragePath(absolutePath),
    caminhoAbsoluto: absolutePath,
    hashArquivo,
    entidadeTipo,
    entidadeId,
    usuarioCriador,
    modoRegistro,
    status: 'ativo'
  });

  return {
    ...metadata,
    absolutePath
  };
}

async function registerExistingPath({
  absolutePath,
  modulo,
  categoria,
  nomeOriginal,
  mimeType,
  entidadeTipo = null,
  entidadeId = null,
  usuarioCriador = null,
  prefix = 'FILE',
  modoRegistro = storageConfig.policy.defaultMode
}) {
  const ensuredPath = assertInsideBase(absolutePath);
  const stat = await fsp.stat(ensuredPath);
  if (!stat.isFile()) {
    throw new Error('Caminho informado não é arquivo regular');
  }

  const relativePath = toRelativeStoragePath(ensuredPath);
  const check = await db.query('SELECT * FROM arquivos WHERE caminho_relativo = $1 AND status <> $2 LIMIT 1', [
    relativePath,
    'excluido'
  ]);

  if (check.rows.length > 0) {
    return check.rows[0];
  }

  const content = await fsp.readFile(ensuredPath);
  const ext = path.extname(ensuredPath) || resolveExtension(nomeOriginal, mimeType);
  const fileName = path.basename(ensuredPath);

  return registerFileMetadata({
    modulo,
    categoria,
    nomeOriginal: nomeOriginal || fileName,
    nomeArmazenado: fileName || buildStoredName({ prefix, originalName: nomeOriginal || fileName, ext }),
    extensao: ext,
    mimeType: mimeType || 'application/octet-stream',
    tamanhoBytes: stat.size,
    caminhoRelativo: relativePath,
    caminhoAbsoluto: ensuredPath,
    hashArquivo: crypto.createHash('sha256').update(content).digest('hex'),
    entidadeTipo,
    entidadeId,
    usuarioCriador,
    modoRegistro,
    status: 'ativo'
  });
}

async function getFileById(id) {
  const result = await db.query('SELECT * FROM arquivos WHERE id = $1 AND status <> $2', [id, 'excluido']);
  return result.rows[0] || null;
}

async function listFilesByEntity(entidadeTipo, entidadeId) {
  const result = await db.query(
    `SELECT *
       FROM arquivos
      WHERE entidade_tipo = $1
        AND entidade_id = $2
        AND status <> $3
      ORDER BY criado_em DESC`,
    [entidadeTipo, String(entidadeId), 'excluido']
  );

  return result.rows;
}

async function getFileByIdForEntity(id, entidadeTipo, entidadeId) {
  const result = await db.query(
    `SELECT *
       FROM arquivos
      WHERE id = $1
        AND entidade_tipo = $2
        AND entidade_id = $3
        AND status <> $4
      LIMIT 1`,
    [id, entidadeTipo, String(entidadeId), 'excluido']
  );

  return result.rows[0] || null;
}

async function createReadStreamById(id) {
  const metadata = await getFileById(id);
  if (!metadata) {
    return null;
  }

  const absolutePath = metadata.caminho_absoluto || path.join(storageConfig.basePath, metadata.caminho_relativo);
  const resolved = assertInsideBase(absolutePath);

  await fsp.access(resolved);

  return {
    metadata,
    stream: fs.createReadStream(resolved)
  };
}

async function deleteFileById(id) {
  const metadata = await getFileById(id);
  if (!metadata) {
    return null;
  }

  const absolutePath = metadata.caminho_absoluto || path.join(storageConfig.basePath, metadata.caminho_relativo);
  const resolved = assertInsideBase(absolutePath);

  try {
    await fsp.unlink(resolved);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const result = await db.query('UPDATE arquivos SET status = $1, atualizado_em = NOW() WHERE id = $2 RETURNING *', [
    'excluido',
    id
  ]);

  return result.rows[0] || null;
}

module.exports = {
  saveBuffer,
  registerExistingPath,
  getFileById,
  listFilesByEntity,
  getFileByIdForEntity,
  createReadStreamById,
  deleteFileById
};
