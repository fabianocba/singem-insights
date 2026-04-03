const notasService = require('./notas-fiscais.service');
const { ok, created, paginated } = require('../../utils/httpResponse');
const fileStorageService = require('../../services/fileStorageService');

async function list(req, res, next) {
  try {
    const result = await notasService.listNotas(req.query);
    return paginated(req, res, result.items, result.meta);
  } catch (error) {
    return next(error);
  }
}

async function getById(req, res, next) {
  try {
    const result = await notasService.getNotaById(req.params.id);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function getItems(req, res, next) {
  try {
    const result = await notasService.getItemsByNotaId(req.params.id);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function getByChave(req, res, next) {
  try {
    const result = await notasService.getNotaByChave(req.params.chave);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function create(req, res, next) {
  try {
    const result = await notasService.createNota(req.body, req.user, { ip: req.ip });
    return created(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function update(req, res, next) {
  try {
    const result = await notasService.updateNota(req.params.id, req.body, req.user);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function conferir(req, res, next) {
  try {
    const result = await notasService.conferirNota(req.params.id, req.user);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function receber(req, res, next) {
  try {
    const result = await notasService.receberNota(req.params.id, req.user);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function remove(req, res, next) {
  try {
    const result = await notasService.deleteNota(req.params.id, req.user);
    return ok(req, res, result);
  } catch (error) {
    return next(error);
  }
}

async function uploadArquivo(req, res, next) {
  try {
    const notaId = req.params.id;
    await notasService.getNotaById(notaId);

    if (!req.file) {
      return res.status(400).json({ erro: 'Arquivo é obrigatório' });
    }

    const categoria = String(req.body.categoria || 'anexo')
      .trim()
      .toLowerCase();
    const arquivo = await fileStorageService.saveBuffer({
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      modulo: 'notas-fiscais',
      categoria,
      entidadeTipo: 'nota_fiscal',
      entidadeId: notaId,
      usuarioCriador: req.user?.id || null,
      prefix: 'NF_ARQ'
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
    const notaId = req.params.id;
    await notasService.getNotaById(notaId);

    const arquivos = await fileStorageService.listFilesByEntity('nota_fiscal', notaId);
    return ok(req, res, arquivos);
  } catch (error) {
    return next(error);
  }
}

async function downloadArquivo(req, res, next) {
  try {
    const notaId = req.params.id;
    const arquivoId = req.params.arquivoId;

    await notasService.getNotaById(notaId);
    const metadata = await fileStorageService.getFileByIdForEntity(arquivoId, 'nota_fiscal', notaId);
    if (!metadata) {
      return res.status(404).json({ erro: 'Arquivo não encontrado para esta nota fiscal' });
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
  getItems,
  getByChave,
  create,
  update,
  conferir,
  receber,
  remove,
  uploadArquivo,
  listArquivos,
  downloadArquivo
};
