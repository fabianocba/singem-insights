/**
 * CATMAT Validation Helpers - SINGEM
 * Funções de validação para CATMAT obrigatório
 */

const db = require('../config/database');
const { config } = require('../config');
const catmatService = require('../integrations/catmat/catmatService');

/**
 * Cache da configuração (evita queries repetidas)
 */
let configCache = null;
let configCacheExpires = 0;
const CACHE_TTL = 60000; // 1 minuto

/**
 * Busca configuração de CATMAT obrigatório
 * @returns {Promise<{empenho_items: boolean, nota_fiscal_items: boolean, ativo: boolean}>}
 */
async function getCatmatObrigatorioConfig() {
  const now = Date.now();

  // Retorna cache se ainda válido
  if (configCache && now < configCacheExpires) {
    return configCache;
  }

  try {
    // Verifica ENV primeiro
    if (config.catmatObrigatorio) {
      configCache = {
        empenho_items: true,
        nota_fiscal_items: true,
        itens: true,
        ativo: true
      };
      configCacheExpires = now + CACHE_TTL;
      return configCache;
    }

    // Busca no banco
    const result = await db.query(`SELECT valor FROM configuracoes WHERE chave = 'catmat_obrigatorio'`);

    if (result.rows.length > 0) {
      const rawValue = result.rows[0].valor;
      const dbConfig = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue || {};
      configCache = {
        empenho_items: Boolean(dbConfig.empenho_items),
        nota_fiscal_items: Boolean(dbConfig.nota_fiscal_items),
        itens: Boolean(dbConfig.itens),
        ativo: Boolean(dbConfig.ativo)
      };
    } else {
      // Config padrão: desativado
      configCache = {
        empenho_items: false,
        nota_fiscal_items: false,
        itens: false,
        ativo: false
      };
    }

    if (config.catmatObrigatorioEmpenho) {
      configCache.empenho_items = true;
    }
    if (config.catmatObrigatorioNF) {
      configCache.nota_fiscal_items = true;
    }
    if (config.catmatObrigatorioItens) {
      configCache.itens = true;
    }
    configCache.ativo =
      configCache.ativo ||
      configCache.empenho_items ||
      configCache.nota_fiscal_items ||
      configCache.itens ||
      config.catmatObrigatorioEmpenho ||
      config.catmatObrigatorioNF ||
      config.catmatObrigatorioItens;

    configCacheExpires = now + CACHE_TTL;
    return configCache;
  } catch (err) {
    console.error('[CATMAT] Erro ao buscar config:', err);
    // Em caso de erro, assume desativado
    return {
      empenho_items: false,
      nota_fiscal_items: false,
      itens: false,
      ativo: false
    };
  }
}

async function resolveCodigoCatmat(item) {
  const directCode = item.catmatCodigo || item.catmat_codigo || item.catmat_id || item.catmatId || null;
  if (directCode) {
    return String(directCode).replace(/\D/g, '');
  }

  const materialId = item.material_id || item.materialId || null;
  if (!materialId) {
    return '';
  }

  const result = await db.query('SELECT codigo, catmat_id FROM materials WHERE id = $1 LIMIT 1', [materialId]);
  const row = result.rows[0];
  if (!row) {
    return '';
  }

  return String(row.catmat_id || row.codigo || '').replace(/\D/g, '');
}

/**
 * Valida se itens possuem CATMAT quando obrigatório
 * @param {Array} itens - Array de itens a validar
 * @param {string} entidade - 'empenho_items' ou 'nota_fiscal_items'
 * @returns {Promise<{valido: boolean, erros: Array}>}
 */
async function validarCatmatItens(itens, entidade) {
  const config = await getCatmatObrigatorioConfig();

  // Se CATMAT não é obrigatório para esta entidade, retorna válido
  if (!config.ativo || (!config[entidade] && !config.itens)) {
    return { valido: true, erros: [], itensNormalizados: Array.isArray(itens) ? itens : [] };
  }

  const erros = [];
  const itensNormalizados = [];

  if (!Array.isArray(itens)) {
    return { valido: true, erros: [], itensNormalizados: [] };
  }

  for (let index = 0; index < itens.length; index++) {
    const item = itens[index];
    const seq = item.seq || item.item_numero || index + 1;

    const catmatCodigo = await resolveCodigoCatmat(item);

    if (!catmatCodigo) {
      erros.push({
        item: seq,
        descricao: item.descricao?.substring(0, 50) || `Item ${seq}`,
        erro: 'CATMAT obrigatório não informado'
      });
      continue;
    }

    const material = await catmatService.validateAndHydrate(catmatCodigo);
    if (!material) {
      erros.push({
        item: seq,
        descricao: item.descricao?.substring(0, 50) || `Item ${seq}`,
        erro: `CATMAT ${catmatCodigo} inválido ou não encontrado na API oficial`
      });
      continue;
    }

    const mirror = await db.query('SELECT id, codigo FROM materials WHERE codigo = $1 LIMIT 1', [
      String(material.codigo || material.catmat_id)
    ]);

    const materialId = mirror.rows[0]?.id || item.material_id || null;

    itensNormalizados.push({
      ...item,
      material_id: materialId,
      catmat_codigo: String(material.codigo || material.catmat_id),
      catmat_id: Number(material.codigo || material.catmat_id),
      catmat_descricao: material.descricao || material.catmat_padrao_desc || item.descricao || null,
      catmat_status: material.status || 'ATIVO',
      catmat_fonte: material.fonte || 'api_oficial_compras'
    });
  }

  return {
    valido: erros.length === 0,
    erros,
    itensNormalizados
  };
}

/**
 * Middleware Express para validar CATMAT em itens
 * @param {string} entidade - 'empenho_items' ou 'nota_fiscal_items'
 */
function catmatObrigatorioMiddleware(entidade) {
  return async function catmatValidator(req, res, next) {
    try {
      const itens = req.body.itens || [];
      const resultado = await validarCatmatItens(itens, entidade);

      if (!resultado.valido) {
        return res.status(400).json({
          sucesso: false,
          erro: 'CATMAT obrigatório não informado em alguns itens',
          detalhes: resultado.erros,
          codigo: 'CATMAT_OBRIGATORIO'
        });
      }

      req.catmatValidation = resultado;
      if (Array.isArray(resultado.itensNormalizados) && resultado.itensNormalizados.length > 0) {
        req.body.itens = resultado.itensNormalizados;
      }

      return next();
    } catch (err) {
      console.error('[CATMAT] Erro no middleware:', err);
      return next();
    }
  };
}

/**
 * Registra log de vínculo CATMAT
 * @param {Object} dados - Dados do vínculo
 */
async function logVinculoCatmat({
  entidade,
  entidadeId,
  materialId,
  catmatId,
  oldCatmat,
  newCatmat,
  acao,
  dadosAnteriores,
  usuarioId,
  usuarioNome,
  ipAddress
}) {
  try {
    await db.insert('catmat_vinculos_log', {
      entidade,
      entidade_id: entidadeId,
      material_id: materialId,
      catmat_id: catmatId,
      old_catmat: oldCatmat || null,
      new_catmat: newCatmat || null,
      acao,
      dados_anteriores: dadosAnteriores ? JSON.stringify(dadosAnteriores) : null,
      usuario_id: usuarioId,
      usuario_nome: usuarioNome,
      ip_address: ipAddress
    });
  } catch (err) {
    console.error('[CATMAT] Erro ao registrar log:', err);
    // Não propaga erro - log é secundário
  }
}

/**
 * Limpa cache de configuração (usar após atualização)
 */
function limparCacheConfig() {
  configCache = null;
  configCacheExpires = 0;
}

module.exports = {
  getCatmatObrigatorioConfig,
  validarCatmatItens,
  catmatObrigatorioMiddleware,
  logVinculoCatmat,
  limparCacheConfig
};
