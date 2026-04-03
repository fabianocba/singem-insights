const empenhosService = require('./empenhos.service');
const { ok, created, paginated } = require('../../utils/httpResponse');
const fileStorageService = require('../../services/fileStorageService');

async function list(req, res, next) {
  try {
    const result = await empenhosService.listEmpenhos(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await empenhosService.getEmpenhoById(req.params.id);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function getBySlug(req, res, next) {
  try {
    const result = await empenhosService.getEmpenhoBySlug(req.params.slug);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await empenhosService.createEmpenho(req.body, req.user, { ip: req.ip });
    return created(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await empenhosService.updateEmpenho(req.params.id, req.body, req.user, { ip: req.ip });
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await empenhosService.deleteEmpenho(req.params.id);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function sync(req, res, next) {
  try {
    const result = await empenhosService.syncEmpenhos(req.body.operacoes, req.user);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function uploadArquivo(req, res, next) {
  try {
    const empenhoId = req.params.id;
    await empenhosService.getEmpenhoById(empenhoId);

    if (!req.file) {
      return res.status(400).json({ erro: 'Arquivo é obrigatório' });
    }

    const categoria = String(req.body.categoria || 'pdf')
      .trim()
      .toLowerCase();
    const arquivo = await fileStorageService.saveBuffer({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      modulo: 'empenhos',
      categoria,
      entidadeTipo: 'empenho',
      entidadeId: empenhoId,
      usuarioCriador: req.user?.id || null,
      prefix: 'EMP_ARQ'
    });

    return created(req, res, {
      id: arquivo.id,
      nomeOriginal: arquivo.nome_original,
      nomeArmazenado: arquivo.nome_armazenado,
      categoria: arquivo.categoria,
      mimeType: arquivo.mime_type,
      tamanhoBytes: arquivo.tamanho_bytes,
      criadoEm: arquivo.criado_em
    });
  } catch (error) {
    return next(error);
  }
}

async function listArquivos(req, res, next) {
  try {
    const empenhoId = req.params.id;
    await empenhosService.getEmpenhoById(empenhoId);

    const arquivos = await fileStorageService.listFilesByEntity('empenho', empenhoId);
    return ok(req, res, arquivos);
  } catch (error) {
    return next(error);
  }
}

async function downloadArquivo(req, res, next) {
  try {
    const empenhoId = req.params.id;
    const arquivoId = req.params.arquivoId;

    await empenhosService.getEmpenhoById(empenhoId);
    const metadata = await fileStorageService.getFileByIdForEntity(arquivoId, 'empenho', empenhoId);
    if (!metadata) {
      return res.status(404).json({ erro: 'Arquivo não encontrado para este empenho' });
    }

    const payload = await fileStorageService.createReadStreamById(metadata.id);
    if (!payload) {
      return res.status(404).json({ erro: 'Arquivo não encontrado' });
    }

    res.setHeader('Content-Type', payload.metadata.mime_type || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${payload.metadata.nome_original || payload.metadata.nome_armazenado}"`
    );

    payload.stream.on('error', next);
    payload.stream.pipe(res);
    return undefined;
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  list,
  getById,
  getBySlug,
  create,
  update,
  remove,
  sync,
  uploadArquivo,
  listArquivos,
  downloadArquivo
};
