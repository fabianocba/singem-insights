/**
 * Serviço de Conciliação NF-e × Empenho
 * Valida itens da NF-e contra saldos do empenho vinculado
 *
 * @module NfeConciliationService
 * @version 2.0.0
 */

/**
 * Status possíveis da conciliação
 * @readonly
 * @enum {string}
 */
const CONCILIATION_STATUS = {
  OK: 'OK',
  OK_COM_ALERTAS: 'OK_COM_ALERTAS',
  PENDENTE_CONFERENCIA: 'PENDENTE_CONFERENCIA',
  ERRO: 'ERRO'
};

/**
 * Tolerância padrão para validações
 */
const DEFAULT_TOLERANCE = {
  pricePercent: 0.5, // 0.5% de tolerância no preço
  priceAbsolute: 0.01, // R$ 0,01 de tolerância absoluta
  totalPercent: 0.1, // 0.1% de tolerância no total
  totalAbsolute: 0.05 // R$ 0,05 de tolerância absoluta
};

/**
 * Resultado da conciliação
 * @typedef {Object} ConciliationResult
 * @property {string} status - Status da conciliação
 * @property {string[]} errors - Erros bloqueantes
 * @property {string[]} alerts - Alertas não bloqueantes
 * @property {Object[]} itemsMatched - Itens correspondidos
 * @property {Object[]} itemsNotFound - Itens não encontrados no empenho
 * @property {Object[]} itemsOverQty - Itens com quantidade excedida
 * @property {Object} summary - Resumo da conciliação
 */

/**
 * Normaliza string para comparação
 * @param {string} s - String a normalizar
 * @returns {string} String normalizada (uppercase, sem acentos, trim)
 */
function normalizeStr(s) {
  if (!s) {
    return '';
  }
  return String(s)
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Converte valor para número com precisão
 * @param {*} val - Valor a converter
 * @param {number} decimals - Casas decimais (default: 4)
 * @returns {number} Número convertido
 */
function toNumber(val, decimals = 4) {
  if (typeof val === 'number') {
    return Number(val.toFixed(decimals));
  }
  if (!val) {
    return 0;
  }
  const str = String(val)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Number(num.toFixed(decimals));
}

/**
 * Verifica se dois valores estão dentro da tolerância
 * @param {number} val1 - Valor 1
 * @param {number} val2 - Valor 2
 * @param {number} tolerancePercent - Tolerância percentual
 * @param {number} toleranceAbsolute - Tolerância absoluta
 * @returns {boolean}
 */
function withinTolerance(val1, val2, tolerancePercent = 0, toleranceAbsolute = 0) {
  const diff = Math.abs(val1 - val2);
  const base = Math.max(Math.abs(val1), Math.abs(val2), 0.01);
  const percentDiff = (diff / base) * 100;
  return diff <= toleranceAbsolute || percentDiff <= tolerancePercent;
}

/**
 * Gera chave de match para um item
 * @param {Object} item - Item (NF ou Empenho)
 * @returns {Object} Chaves de match
 */
function generateMatchKey(item) {
  // Código do produto (cProd na NF, itemCompra ou codigo no empenho)
  const codigo = String(item.codigo || item.cProd || item.itemCompra || '').trim();

  // Descrição normalizada
  const descricao = normalizeStr(item.descricao || item.xProd || item.material || '');

  // Unidade normalizada
  const unidade = normalizeStr(item.unidade || item.uCom || '');

  return {
    primary: codigo || null,
    secondary: `${descricao}|${unidade}`,
    descricao,
    unidade,
    codigo
  };
}

/**
 * Classe de serviço de conciliação
 */
class NfeConciliationService {
  /**
   * @param {Object} config - Configuração
   * @param {Object} config.tolerance - Tolerâncias customizadas
   */
  constructor(config = {}) {
    this.tolerance = { ...DEFAULT_TOLERANCE, ...config.tolerance };
  }

  /**
   * Concilia NF-e com Empenho
   * @param {Object} nfe - Dados da NF-e (parseados)
   * @param {Object} empenho - Dados do Empenho
   * @returns {ConciliationResult}
   */
  conciliar(nfe, empenho) {
    const errors = [];
    const alerts = [];
    const itemsMatched = [];
    const itemsNotFound = [];
    const itemsOverQty = [];
    const itemsPriceDiff = [];

    // 1. Validar inputs
    if (!nfe) {
      return this._buildErrorResult(['NF-e não informada']);
    }
    if (!empenho) {
      return this._buildErrorResult(['Empenho não informado para conciliação']);
    }

    const nfItens = nfe.itens || [];
    const empenhoItens = empenho.itens || [];

    if (nfItens.length === 0) {
      errors.push('NF-e não possui itens');
    }
    if (empenhoItens.length === 0) {
      errors.push('Empenho não possui itens cadastrados');
    }

    if (errors.length > 0) {
      return this._buildErrorResult(errors);
    }

    // 2. Validar CNPJ do fornecedor
    const cnpjNF = this._normalizeCNPJ(nfe.emitente?.cnpj);
    const cnpjEmpenho = this._normalizeCNPJ(empenho.cnpjFornecedor || empenho.cnpjDigits);

    if (cnpjNF && cnpjEmpenho && cnpjNF !== cnpjEmpenho) {
      alerts.push(`CNPJ divergente: NF=${this._formatCNPJ(cnpjNF)}, Empenho=${this._formatCNPJ(cnpjEmpenho)}`);
    }

    // 3. Criar mapa de itens do empenho
    const empenhoMap = this._buildEmpenhoMap(empenhoItens);

    // 4. Conciliar cada item da NF-e
    for (let i = 0; i < nfItens.length; i++) {
      const nfItem = nfItens[i];
      const matchResult = this._matchItem(nfItem, empenhoMap, i + 1);

      if (!matchResult.found) {
        itemsNotFound.push({
          nfItem,
          nfIndex: i + 1,
          codigo: nfItem.codigo,
          descricao: nfItem.descricao,
          quantidade: nfItem.quantidade,
          valorTotal: nfItem.valorTotal
        });
        alerts.push(`Item ${i + 1} não encontrado no empenho: ${nfItem.descricao || nfItem.codigo}`);
        continue;
      }

      const empenhoItem = matchResult.empenhoItem;

      // Validar quantidade vs saldo
      const qtyNF = toNumber(nfItem.quantidade, 4);
      const saldoQty = toNumber(empenhoItem.saldoQuantidade ?? empenhoItem.quantidade, 4);

      if (qtyNF > saldoQty) {
        itemsOverQty.push({
          nfItem,
          empenhoItem,
          nfIndex: i + 1,
          qtyNF,
          saldoQty,
          excedido: Number((qtyNF - saldoQty).toFixed(4))
        });
        errors.push(`Item ${i + 1} "${nfItem.descricao}": quantidade NF (${qtyNF}) excede saldo (${saldoQty})`);
      }

      // Validar preço unitário
      const priceNF = toNumber(nfItem.valorUnitario, 4);
      const priceEmp = toNumber(empenhoItem.valorUnitario, 4);

      if (!withinTolerance(priceNF, priceEmp, this.tolerance.pricePercent, this.tolerance.priceAbsolute)) {
        const diffPercent = priceEmp > 0 ? ((Math.abs(priceNF - priceEmp) / priceEmp) * 100).toFixed(2) : 0;
        itemsPriceDiff.push({
          nfItem,
          empenhoItem,
          nfIndex: i + 1,
          priceNF,
          priceEmp,
          diffPercent
        });
        alerts.push(
          `Item ${i + 1} "${nfItem.descricao}": preço NF (R$ ${priceNF.toFixed(4)}) difere do empenho (R$ ${priceEmp.toFixed(4)}) - ${diffPercent}%`
        );
      }

      // Item correspondido
      itemsMatched.push({
        nfItem,
        empenhoItem,
        nfIndex: i + 1,
        empenhoIndex: empenhoItem._index,
        matchType: matchResult.matchType,
        validations: {
          quantity: { nf: qtyNF, empenho: saldoQty, ok: qtyNF <= saldoQty },
          price: {
            nf: priceNF,
            empenho: priceEmp,
            ok: withinTolerance(priceNF, priceEmp, this.tolerance.pricePercent, this.tolerance.priceAbsolute)
          }
        }
      });
    }

    // 5. Validar total geral
    const totalNF = toNumber(nfe.totais?.valorNF || nfe.totais?.valorProdutos, 2);
    const saldoTotalEmpenho = this._calcularSaldoTotal(empenhoItens);

    if (totalNF > saldoTotalEmpenho) {
      errors.push(`Total NF (R$ ${totalNF.toFixed(2)}) excede saldo do empenho (R$ ${saldoTotalEmpenho.toFixed(2)})`);
    }

    // 6. Determinar status final
    let status;
    if (errors.length > 0) {
      status = CONCILIATION_STATUS.PENDENTE_CONFERENCIA;
    } else if (alerts.length > 0) {
      status = CONCILIATION_STATUS.OK_COM_ALERTAS;
    } else {
      status = CONCILIATION_STATUS.OK;
    }

    return {
      status,
      errors,
      alerts,
      itemsMatched,
      itemsNotFound,
      itemsOverQty,
      itemsPriceDiff,
      summary: {
        totalItensNF: nfItens.length,
        totalItensEmpenho: empenhoItens.length,
        itensCorrespondidos: itemsMatched.length,
        itensNaoEncontrados: itemsNotFound.length,
        itensQtdExcedida: itemsOverQty.length,
        itensPrecoDiv: itemsPriceDiff.length,
        totalNF,
        saldoTotalEmpenho,
        totalErrors: errors.length,
        totalAlerts: alerts.length
      },
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Cria mapa de itens do empenho para lookup rápido
   * @private
   */
  _buildEmpenhoMap(empenhoItens) {
    const mapByCodigo = new Map();
    const mapByDescricao = new Map();

    empenhoItens.forEach((item, idx) => {
      const key = generateMatchKey(item);
      const itemWithMeta = {
        ...item,
        _index: idx,
        _key: key,
        saldoQuantidade: toNumber(item.saldoQuantidade ?? item.quantidade, 4),
        saldoValor: toNumber(item.saldoValor ?? item.valorTotal, 2)
      };

      // Chave por código
      if (key.primary) {
        mapByCodigo.set(key.primary, itemWithMeta);
      }

      // Chave por descrição normalizada + unidade
      mapByDescricao.set(key.secondary, itemWithMeta);
    });

    return { mapByCodigo, mapByDescricao };
  }

  /**
   * Encontra item correspondente no empenho
   * @private
   */
  _matchItem(nfItem, empenhoMap, _nfIndex) {
    const nfKey = generateMatchKey(nfItem);

    // Tentar match por código primeiro
    if (nfKey.primary && empenhoMap.mapByCodigo.has(nfKey.primary)) {
      return {
        found: true,
        empenhoItem: empenhoMap.mapByCodigo.get(nfKey.primary),
        matchType: 'codigo'
      };
    }

    // Fallback: match por descrição + unidade
    if (empenhoMap.mapByDescricao.has(nfKey.secondary)) {
      return {
        found: true,
        empenhoItem: empenhoMap.mapByDescricao.get(nfKey.secondary),
        matchType: 'descricao+unidade'
      };
    }

    // Tentar match por descrição parcial (substring)
    for (const [key, item] of empenhoMap.mapByDescricao) {
      const [descEmp] = key.split('|');
      if (descEmp && nfKey.descricao) {
        // Se a descrição do empenho contém a da NF ou vice-versa
        if (descEmp.includes(nfKey.descricao) || nfKey.descricao.includes(descEmp)) {
          return {
            found: true,
            empenhoItem: item,
            matchType: 'descricao-parcial'
          };
        }
      }
    }

    return { found: false };
  }

  /**
   * Calcula saldo total do empenho
   * @private
   */
  _calcularSaldoTotal(empenhoItens) {
    return empenhoItens.reduce((total, item) => {
      const saldo = toNumber(item.saldoValor ?? item.valorTotal, 2);
      return total + saldo;
    }, 0);
  }

  /**
   * Normaliza CNPJ para dígitos
   * @private
   */
  _normalizeCNPJ(cnpj) {
    if (!cnpj) {
      return '';
    }
    return String(cnpj).replace(/\D/g, '');
  }

  /**
   * Formata CNPJ para exibição
   * @private
   */
  _formatCNPJ(cnpj) {
    if (!cnpj || cnpj.length !== 14) {
      return cnpj;
    }
    return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  /**
   * Constrói resultado de erro
   * @private
   */
  _buildErrorResult(errors) {
    return {
      status: CONCILIATION_STATUS.ERRO,
      errors,
      alerts: [],
      itemsMatched: [],
      itemsNotFound: [],
      itemsOverQty: [],
      itemsPriceDiff: [],
      summary: null,
      timestamp: new Date().toISOString()
    };
  }
}

// Exports
module.exports = {
  NfeConciliationService,
  CONCILIATION_STATUS,
  DEFAULT_TOLERANCE,
  normalizeStr,
  toNumber,
  withinTolerance,
  generateMatchKey
};
