/**
 * SINGEM - Módulo de Validação de Nota Fiscal
 * Validação cruzada NF ↔ Empenho (sem alterar dados)
 *
 * @version 1.0.0
 * @description
 * - validateNFHeader(nf, empenho) → valida cabeçalho
 * - validateNFItems(nfItems, empenhoItems, options) → valida itens
 * - validateNF(nf, empenho, options) → validação completa
 */

const DEBUG_NF = false;

// ==========================================
// CONFIGURAÇÕES PADRÃO
// ==========================================

const DEFAULT_OPTIONS = {
  tolerancePricePct: 0.5, // 0.5% de tolerância no preço
  tolerancePriceAbs: 0.01, // R$ 0,01 de tolerância absoluta
  toleranceQtyPct: 0, // 0% tolerância na quantidade
  toleranceQtyAbs: 0, // 0 unidades de tolerância
  allowExtraItems: false, // Permitir itens que não estão no empenho
  allowOverQty: false, // Permitir quantidade acima do saldo
  requireEmpenho: true, // Exigir empenho vinculado
  validateFornecedor: true // Validar CNPJ do fornecedor
};

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Normaliza string para comparação (uppercase, trim, remove acentos)
 * @param {string} s - String a normalizar
 * @returns {string} String normalizada
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
 * Normaliza CNPJ para apenas dígitos
 * @param {string} cnpj - CNPJ com ou sem formatação
 * @returns {string} Apenas dígitos (14 caracteres)
 */
function normalizeCNPJ(cnpj) {
  if (!cnpj) {
    return '';
  }
  return String(cnpj).replace(/\D/g, '');
}

/**
 * Converte valor para número
 * @param {*} val - Valor a converter
 * @returns {number} Número ou 0
 */
function toNumber(val) {
  if (typeof val === 'number') {
    return val;
  }
  if (!val) {
    return 0;
  }
  const str = String(val)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  return parseFloat(str) || 0;
}

/**
 * Verifica se dois valores estão dentro da tolerância
 * @param {number} val1 - Valor 1
 * @param {number} val2 - Valor 2
 * @param {number} tolerancePct - Tolerância percentual
 * @param {number} toleranceAbs - Tolerância absoluta
 * @returns {boolean} True se dentro da tolerância
 */
function withinTolerance(val1, val2, tolerancePct = 0, toleranceAbs = 0) {
  const diff = Math.abs(val1 - val2);
  const base = Math.max(Math.abs(val1), Math.abs(val2), 0.01);
  const pctDiff = (diff / base) * 100;

  return diff <= toleranceAbs || pctDiff <= tolerancePct;
}

/**
 * Gera chave de match para um item
 * Prioridade: itemCompra > (descricao + unidade)
 * @param {Object} item - Item a gerar chave
 * @returns {Object} { primary: string, secondary: string }
 */
function generateMatchKey(item) {
  const itemCompra = String(item.itemCompra || item.codigo || '').trim();
  const descricao = normalizeStr(item.descricao || item.material || '');
  const unidade = normalizeStr(item.unidade || '');

  return {
    primary: itemCompra || null,
    secondary: `${descricao}|${unidade}`,
    descricao,
    unidade
  };
}

// ==========================================
// VALIDAÇÃO DE CABEÇALHO
// ==========================================

/**
 * Valida cabeçalho da NF contra o Empenho
 * @param {Object} nf - Dados da Nota Fiscal
 * @param {Object} empenho - Dados do Empenho
 * @param {Object} options - Opções de validação
 * @returns {Object} { ok, errors[], warnings[] }
 */
function validateNFHeader(nf, empenho, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors = [];
  const warnings = [];

  if (DEBUG_NF) {
    console.log('[NFValidator] validateNFHeader:', { nf, empenho, opts });
  }

  // 1. Verificar se empenho existe
  if (opts.requireEmpenho && !empenho) {
    errors.push({
      code: 'NO_EMPENHO',
      message: 'Empenho não encontrado ou não vinculado à NF'
    });
    return { ok: false, errors, warnings };
  }

  // 2. Validar CNPJ do fornecedor
  if (opts.validateFornecedor && empenho) {
    const cnpjNF = normalizeCNPJ(nf.cnpjEmitente || nf.cnpjFornecedor);
    const cnpjEmpenho = normalizeCNPJ(empenho.cnpjFornecedor || empenho.cnpjDigits);

    if (cnpjNF && cnpjEmpenho && cnpjNF !== cnpjEmpenho) {
      errors.push({
        code: 'CNPJ_MISMATCH',
        message: 'CNPJ do fornecedor da NF difere do empenho',
        nfValue: cnpjNF,
        empenhoValue: cnpjEmpenho
      });
    } else if (!cnpjNF) {
      warnings.push({
        code: 'CNPJ_NF_MISSING',
        message: 'CNPJ do fornecedor não informado na NF'
      });
    } else if (!cnpjEmpenho) {
      warnings.push({
        code: 'CNPJ_EMPENHO_MISSING',
        message: 'CNPJ do fornecedor não cadastrado no empenho'
      });
    }
  }

  // 3. Validar número da NF
  if (!nf.numero) {
    errors.push({
      code: 'NF_NUMBER_MISSING',
      message: 'Número da NF não informado'
    });
  }

  // 4. Validar data da NF
  if (!nf.dataNotaFiscal && !nf.data) {
    errors.push({
      code: 'NF_DATE_MISSING',
      message: 'Data da NF não informada'
    });
  }

  // 5. Validar valor total
  const valorTotalNF = toNumber(nf.valorTotal);
  if (valorTotalNF <= 0) {
    warnings.push({
      code: 'NF_TOTAL_ZERO',
      message: 'Valor total da NF é zero ou negativo'
    });
  }

  const ok = errors.length === 0;

  if (DEBUG_NF) {
    console.log('[NFValidator] Header result:', { ok, errors, warnings });
  }

  return { ok, errors, warnings };
}

// ==========================================
// VALIDAÇÃO DE ITENS
// ==========================================

/**
 * Valida itens da NF contra itens do Empenho
 * @param {Array} nfItems - Itens da Nota Fiscal
 * @param {Array} empenhoItems - Itens do Empenho
 * @param {Object} options - Opções de validação
 * @returns {Object} Resultado detalhado da validação
 */
function validateNFItems(nfItems, empenhoItems, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const result = {
    ok: true,
    matched: [], // Itens correspondidos corretamente
    notFound: [], // Itens da NF que não existem no empenho
    overQty: [], // Itens com quantidade acima do saldo
    priceDiff: [], // Itens com diferença de preço
    totalDiff: [], // Itens com diferença no valor total
    errors: [],
    warnings: [],
    summary: {
      totalNFItems: nfItems?.length || 0,
      totalEmpenhoItems: empenhoItems?.length || 0,
      matchedCount: 0,
      notFoundCount: 0,
      overQtyCount: 0,
      priceDiffCount: 0
    }
  };

  if (DEBUG_NF) {
    console.log('[NFValidator] validateNFItems:', { nfItems, empenhoItems, opts });
  }

  if (!nfItems || nfItems.length === 0) {
    result.errors.push({
      code: 'NO_NF_ITEMS',
      message: 'Nenhum item informado na NF'
    });
    result.ok = false;
    return result;
  }

  if (!empenhoItems || empenhoItems.length === 0) {
    result.errors.push({
      code: 'NO_EMPENHO_ITEMS',
      message: 'Empenho não possui itens cadastrados'
    });
    result.ok = false;
    return result;
  }

  // Criar mapa de itens do empenho para lookup rápido
  const empenhoMap = new Map();
  const empenhoMapSecondary = new Map();

  empenhoItems.forEach((item, idx) => {
    const key = generateMatchKey(item);
    const itemWithMeta = {
      ...item,
      _index: idx,
      _key: key,
      _saldoQtd: toNumber(item.saldoQuantidade ?? item.quantidade),
      _saldoValor: toNumber(item.saldoValor ?? item.valorTotal)
    };

    // Chave primária (itemCompra)
    if (key.primary) {
      empenhoMap.set(key.primary, itemWithMeta);
    }

    // Chave secundária (descricao|unidade)
    empenhoMapSecondary.set(key.secondary, itemWithMeta);
  });

  if (DEBUG_NF) {
    console.log('[NFValidator] Empenho maps:', {
      primary: Array.from(empenhoMap.keys()),
      secondary: Array.from(empenhoMapSecondary.keys())
    });
  }

  // Validar cada item da NF
  nfItems.forEach((nfItem, nfIdx) => {
    const nfKey = generateMatchKey(nfItem);
    let empenhoItem = null;
    let matchType = null;

    // Tentar match por itemCompra primeiro
    if (nfKey.primary && empenhoMap.has(nfKey.primary)) {
      empenhoItem = empenhoMap.get(nfKey.primary);
      matchType = 'itemCompra';
    }
    // Fallback: match por descricao+unidade
    else if (empenhoMapSecondary.has(nfKey.secondary)) {
      empenhoItem = empenhoMapSecondary.get(nfKey.secondary);
      matchType = 'descricao+unidade';
    }

    if (DEBUG_NF) {
      console.log(`[NFValidator] Item ${nfIdx + 1}:`, {
        nfKey,
        matched: !!empenhoItem,
        matchType
      });
    }

    // Item não encontrado no empenho
    if (!empenhoItem) {
      result.notFound.push({
        nfItem,
        nfIndex: nfIdx,
        key: nfKey
      });
      result.summary.notFoundCount++;

      if (!opts.allowExtraItems) {
        result.errors.push({
          code: 'ITEM_NOT_FOUND',
          message: `Item "${nfItem.descricao || nfItem.codigo}" não encontrado no empenho`,
          nfIndex: nfIdx,
          nfItem
        });
      } else {
        result.warnings.push({
          code: 'ITEM_NOT_FOUND',
          message: `Item "${nfItem.descricao || nfItem.codigo}" não encontrado no empenho (permitido)`,
          nfIndex: nfIdx
        });
      }
      return;
    }

    // Item encontrado - validar valores
    const nfQty = toNumber(nfItem.quantidade);
    const nfPrice = toNumber(nfItem.valorUnitario);
    const nfTotal = toNumber(nfItem.valorTotal);

    const empQty = toNumber(empenhoItem.quantidade);
    const empPrice = toNumber(empenhoItem.valorUnitario);
    const empTotal = toNumber(empenhoItem.valorTotal);
    const empSaldoQty = empenhoItem._saldoQtd;

    const matchResult = {
      nfItem,
      empenhoItem,
      nfIndex: nfIdx,
      empenhoIndex: empenhoItem._index,
      matchType,
      validations: {
        qty: { nf: nfQty, empenho: empQty, saldo: empSaldoQty },
        price: { nf: nfPrice, empenho: empPrice },
        total: { nf: nfTotal, empenho: empTotal }
      }
    };

    // Verificar quantidade vs saldo
    if (nfQty > empSaldoQty) {
      result.overQty.push({
        ...matchResult,
        exceeded: nfQty - empSaldoQty
      });
      result.summary.overQtyCount++;

      if (!opts.allowOverQty) {
        result.errors.push({
          code: 'OVER_QTY',
          message: `Item "${nfItem.descricao}": quantidade (${nfQty}) excede saldo disponível (${empSaldoQty})`,
          nfIndex: nfIdx,
          exceeded: nfQty - empSaldoQty
        });
      } else {
        result.warnings.push({
          code: 'OVER_QTY',
          message: `Item "${nfItem.descricao}": quantidade (${nfQty}) excede saldo (${empSaldoQty}) - permitido`,
          nfIndex: nfIdx
        });
      }
    }

    // Verificar preço unitário
    if (!withinTolerance(nfPrice, empPrice, opts.tolerancePricePct, opts.tolerancePriceAbs)) {
      const diffPct = empPrice > 0 ? ((Math.abs(nfPrice - empPrice) / empPrice) * 100).toFixed(2) : 0;
      result.priceDiff.push({
        ...matchResult,
        diffPct,
        diffAbs: Math.abs(nfPrice - empPrice)
      });
      result.summary.priceDiffCount++;

      result.warnings.push({
        code: 'PRICE_DIFF',
        message: `Item "${nfItem.descricao}": preço NF (R$ ${nfPrice.toFixed(2)}) difere do empenho (R$ ${empPrice.toFixed(2)}) - ${diffPct}%`,
        nfIndex: nfIdx
      });
    }

    // Verificar valor total do item
    const expectedTotal = nfQty * nfPrice;
    if (!withinTolerance(nfTotal, expectedTotal, 0.1, 0.02)) {
      result.totalDiff.push({
        ...matchResult,
        expected: expectedTotal,
        actual: nfTotal
      });

      result.warnings.push({
        code: 'TOTAL_DIFF',
        message: `Item "${nfItem.descricao}": valor total (R$ ${nfTotal.toFixed(2)}) difere do calculado (R$ ${expectedTotal.toFixed(2)})`,
        nfIndex: nfIdx
      });
    }

    // Adicionar ao matched
    result.matched.push(matchResult);
    result.summary.matchedCount++;
  });

  // Determinar resultado final
  result.ok = result.errors.length === 0;

  if (DEBUG_NF) {
    console.log('[NFValidator] Items result:', result);
  }

  return result;
}

// ==========================================
// VALIDAÇÃO COMPLETA
// ==========================================

/**
 * Validação completa da NF contra o Empenho
 * @param {Object} nf - Dados da Nota Fiscal (header + itens)
 * @param {Object} empenho - Dados do Empenho (header + itens)
 * @param {Object} options - Opções de validação
 * @returns {Object} Resultado completo da validação
 */
function validateNF(nf, empenho, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (DEBUG_NF) {
    console.log('[NFValidator] ========== INÍCIO VALIDAÇÃO NF ==========');
    console.log('[NFValidator] NF:', nf);
    console.log('[NFValidator] Empenho:', empenho);
    console.log('[NFValidator] Options:', opts);
  }

  const headerResult = validateNFHeader(nf, empenho, opts);
  const itemsResult = validateNFItems(nf.itens || [], empenho?.itens || [], opts);

  const result = {
    ok: headerResult.ok && itemsResult.ok,
    header: headerResult,
    items: itemsResult,
    errors: [...headerResult.errors, ...itemsResult.errors],
    warnings: [...headerResult.warnings, ...itemsResult.warnings],
    summary: {
      ...itemsResult.summary,
      totalErrors: headerResult.errors.length + itemsResult.errors.length,
      totalWarnings: headerResult.warnings.length + itemsResult.warnings.length
    },
    timestamp: new Date().toISOString()
  };

  if (DEBUG_NF) {
    console.log('[NFValidator] ========== FIM VALIDAÇÃO NF ==========');
    console.log('[NFValidator] Resultado:', result.ok ? '✅ OK' : '❌ FALHA');
    console.log('[NFValidator] Erros:', result.errors.length);
    console.log('[NFValidator] Warnings:', result.warnings.length);
  }

  return result;
}

// ==========================================
// FUNÇÕES DE UTILIDADE
// ==========================================

/**
 * Gera relatório HTML das divergências
 * @param {Object} validationResult - Resultado da validação
 * @returns {string} HTML do relatório
 */
function generateValidationReport(validationResult) {
  const { ok, errors, warnings, items } = validationResult;

  let html = `
    <div class="validation-report ${ok ? 'report-ok' : 'report-error'}">
      <h4>${ok ? '✅ Validação OK' : '❌ Divergências Encontradas'}</h4>

      <div class="report-summary">
        <p><strong>Itens NF:</strong> ${items.summary.totalNFItems}</p>
        <p><strong>Correspondidos:</strong> ${items.summary.matchedCount}</p>
        <p><strong>Não encontrados:</strong> ${items.summary.notFoundCount}</p>
        <p><strong>Quantidade excedida:</strong> ${items.summary.overQtyCount}</p>
        <p><strong>Preço divergente:</strong> ${items.summary.priceDiffCount}</p>
      </div>
  `;

  if (errors.length > 0) {
    html += `
      <div class="report-errors">
        <h5>🚫 Erros (impedem salvamento):</h5>
        <ul>
          ${errors.map((e) => `<li><strong>${e.code}:</strong> ${e.message}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (warnings.length > 0) {
    html += `
      <div class="report-warnings">
        <h5>⚠️ Avisos:</h5>
        <ul>
          ${warnings.map((w) => `<li><strong>${w.code}:</strong> ${w.message}</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (items.notFound.length > 0) {
    html += `
      <div class="report-not-found">
        <h5>🔍 Itens não encontrados no empenho:</h5>
        <ul>
          ${items.notFound.map((i) => `<li>${i.nfItem.descricao || i.nfItem.codigo} (${i.nfItem.unidade})</li>`).join('')}
        </ul>
      </div>
    `;
  }

  if (items.overQty.length > 0) {
    html += `
      <div class="report-over-qty">
        <h5>📊 Itens com quantidade excedida:</h5>
        <ul>
          ${items.overQty
            .map(
              (i) =>
                `<li>${i.nfItem.descricao}: NF=${i.validations.qty.nf}, Saldo=${i.validations.qty.saldo} (excesso: ${i.exceeded})</li>`
            )
            .join('')}
        </ul>
      </div>
    `;
  }

  html += '</div>';

  return html;
}

/**
 * Formata resultado para console (debug)
 * @param {Object} validationResult - Resultado da validação
 */
function logValidationResult(validationResult) {
  const { ok, errors, warnings, items } = validationResult;

  console.group(`🔍 Validação NF: ${ok ? '✅ OK' : '❌ FALHA'}`);

  console.log('📊 Resumo:', items.summary);

  if (errors.length > 0) {
    console.group('🚫 Erros:');
    errors.forEach((e) => console.error(`  [${e.code}] ${e.message}`));
    console.groupEnd();
  }

  if (warnings.length > 0) {
    console.group('⚠️ Avisos:');
    warnings.forEach((w) => console.warn(`  [${w.code}] ${w.message}`));
    console.groupEnd();
  }

  console.groupEnd();
}

// ==========================================
// TESTES MANUAIS
// ==========================================

/**
 * Suite de testes manuais para validação
 */
const NFTest = {
  /**
   * Executa todos os testes
   */
  async runAll() {
    console.log('🧪 Iniciando testes do NFValidator...\n');

    const tests = [
      this.testNFCorreta,
      this.testItemNaoEncontrado,
      this.testQuantidadeExcedida,
      this.testPrecoDivergente,
      this.testFornecedorDiferente
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
      try {
        const result = await test.call(this);
        if (result) {
          passed++;
          console.log(`✅ ${test.name}: PASSOU`);
        } else {
          failed++;
          console.log(`❌ ${test.name}: FALHOU`);
        }
      } catch (e) {
        failed++;
        console.error(`❌ ${test.name}: ERRO -`, e);
      }
    }

    console.log(`\n📊 Resultado: ${passed} passou, ${failed} falhou`);
    return { passed, failed };
  },

  /**
   * Teste 1: NF correta com itens iguais ao empenho
   */
  testNFCorreta() {
    const empenho = {
      cnpjFornecedor: '12345678000199',
      itens: [{ itemCompra: '001', descricao: 'CANETA AZUL', unidade: 'UN', quantidade: 100, valorUnitario: 2.5 }]
    };

    const nf = {
      numero: '12345',
      dataNotaFiscal: '2025-01-15',
      cnpjEmitente: '12345678000199',
      valorTotal: 250,
      itens: [
        {
          itemCompra: '001',
          descricao: 'CANETA AZUL',
          unidade: 'UN',
          quantidade: 50,
          valorUnitario: 2.5,
          valorTotal: 125
        }
      ]
    };

    const result = validateNF(nf, empenho);
    return result.ok === true;
  },

  /**
   * Teste 2: NF com item inexistente
   */
  testItemNaoEncontrado() {
    const empenho = {
      cnpjFornecedor: '12345678000199',
      itens: [{ itemCompra: '001', descricao: 'CANETA AZUL', unidade: 'UN', quantidade: 100, valorUnitario: 2.5 }]
    };

    const nf = {
      numero: '12345',
      dataNotaFiscal: '2025-01-15',
      cnpjEmitente: '12345678000199',
      valorTotal: 100,
      itens: [
        {
          itemCompra: '999',
          descricao: 'ITEM INEXISTENTE',
          unidade: 'UN',
          quantidade: 10,
          valorUnitario: 10,
          valorTotal: 100
        }
      ]
    };

    const result = validateNF(nf, empenho);
    return result.ok === false && result.items.notFound.length > 0;
  },

  /**
   * Teste 3: NF com quantidade maior que saldo
   */
  testQuantidadeExcedida() {
    const empenho = {
      cnpjFornecedor: '12345678000199',
      itens: [{ itemCompra: '001', descricao: 'CANETA AZUL', unidade: 'UN', quantidade: 10, valorUnitario: 2.5 }]
    };

    const nf = {
      numero: '12345',
      dataNotaFiscal: '2025-01-15',
      cnpjEmitente: '12345678000199',
      valorTotal: 500,
      itens: [
        {
          itemCompra: '001',
          descricao: 'CANETA AZUL',
          unidade: 'UN',
          quantidade: 200,
          valorUnitario: 2.5,
          valorTotal: 500
        }
      ]
    };

    const result = validateNF(nf, empenho);
    return result.ok === false && result.items.overQty.length > 0;
  },

  /**
   * Teste 4: NF com preço divergente
   */
  testPrecoDivergente() {
    const empenho = {
      cnpjFornecedor: '12345678000199',
      itens: [{ itemCompra: '001', descricao: 'CANETA AZUL', unidade: 'UN', quantidade: 100, valorUnitario: 2.5 }]
    };

    const nf = {
      numero: '12345',
      dataNotaFiscal: '2025-01-15',
      cnpjEmitente: '12345678000199',
      valorTotal: 300,
      itens: [
        {
          itemCompra: '001',
          descricao: 'CANETA AZUL',
          unidade: 'UN',
          quantidade: 10,
          valorUnitario: 30,
          valorTotal: 300
        }
      ]
    };

    const result = validateNF(nf, empenho);
    return result.items.priceDiff.length > 0;
  },

  /**
   * Teste 5: NF com fornecedor diferente
   */
  testFornecedorDiferente() {
    const empenho = {
      cnpjFornecedor: '12345678000199',
      itens: [{ itemCompra: '001', descricao: 'CANETA AZUL', unidade: 'UN', quantidade: 100, valorUnitario: 2.5 }]
    };

    const nf = {
      numero: '12345',
      dataNotaFiscal: '2025-01-15',
      cnpjEmitente: '99999999000199',
      valorTotal: 25,
      itens: [
        {
          itemCompra: '001',
          descricao: 'CANETA AZUL',
          unidade: 'UN',
          quantidade: 10,
          valorUnitario: 2.5,
          valorTotal: 25
        }
      ]
    };

    const result = validateNF(nf, empenho);
    return result.ok === false && result.errors.some((e) => e.code === 'CNPJ_MISMATCH');
  }
};

// ==========================================
// EXPORTAR PARA WINDOW (uso global)
// ==========================================

window.NFValidator = {
  // Funções de validação
  validateNFHeader,
  validateNFItems,
  validateNF,

  // Utilitários
  generateValidationReport,
  logValidationResult,
  normalizeStr,
  normalizeCNPJ,
  toNumber,

  // Testes
  NFTest,

  // Configurações
  DEFAULT_OPTIONS,

  // Versão
  VERSION: '1.0.0'
};

// Expor NFTest globalmente para facilitar testes via console
window.NFTest = NFTest;

console.log('✅ NFValidator carregado (v1.0.0) - Use window.NFValidator ou window.NFTest.runAll()');
