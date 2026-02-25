/**
 * CATMAT Validation Helpers - SINGEM
 * Funções de validação para CATMAT obrigatório
 */

const db = require('../config/database');
const { config } = require('../config');

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
        ativo: true
      };
      configCacheExpires = now + CACHE_TTL;
      return configCache;
    }

    // Busca no banco
    const result = await db.query(`SELECT valor FROM configuracoes WHERE chave = 'catmat_obrigatorio'`);

    if (result.rows.length > 0) {
      configCache = JSON.parse(result.rows[0].valor);
    } else {
      // Config padrão: desativado
      configCache = {
        empenho_items: false,
        nota_fiscal_items: false,
        ativo: false
      };
    }

    configCacheExpires = now + CACHE_TTL;
    return configCache;
  } catch (err) {
    console.error('[CATMAT] Erro ao buscar config:', err);
    // Em caso de erro, assume desativado
    return {
      empenho_items: false,
      nota_fiscal_items: false,
      ativo: false
    };
  }
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
  if (!config.ativo || !config[entidade]) {
    return { valido: true, erros: [] };
  }

  const erros = [];

  if (!Array.isArray(itens)) {
    return { valido: true, erros: [] };
  }

  itens.forEach((item, index) => {
    const seq = item.seq || item.item_numero || index + 1;

    // Verifica se tem código CATMAT
    const catmatCodigo = item.catmatCodigo || item.catmat_codigo || item.material_id || item.catmat_id;

    if (!catmatCodigo) {
      erros.push({
        item: seq,
        descricao: item.descricao?.substring(0, 50) || `Item ${seq}`,
        erro: 'CATMAT obrigatório não informado'
      });
    }
  });

  return {
    valido: erros.length === 0,
    erros
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
