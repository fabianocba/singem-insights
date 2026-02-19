/**
 * IFDESK - Report Repository
 * Camada de acesso a dados otimizada para relatórios
 * @version 1.0.0
 */

/**
 * Busca Notas Fiscais com filtros
 * @param {Object} params - Filtros de busca
 * @returns {Promise<Array>} Lista de NFs normalizadas
 */
export async function getNFs(params = {}) {
  const { dateFrom, dateTo, fornecedor, empenhoId, status } = params;

  if (!window.dbManager?.db) {
    console.warn('[ReportRepo] dbManager não inicializado');
    return [];
  }

  try {
    // Buscar todas as NFs
    const nfs = await window.dbManager.listarNotasFiscais();

    // Aplicar filtros em memória (IDB não suporta filtros compostos nativamente)
    return (nfs || []).map(normalizeNF).filter((nf) => {
      // Filtro por data
      if (dateFrom && nf.dataISO < dateFrom) {
        return false;
      }
      if (dateTo && nf.dataISO > dateTo) {
        return false;
      }

      // Filtro por fornecedor (nome ou CNPJ)
      if (fornecedor) {
        const termo = normalizeText(fornecedor);
        const matchNome = normalizeText(nf.fornecedorNome).includes(termo);
        const matchCNPJ = (nf.fornecedorCNPJ || '').includes(termo.replace(/\D/g, ''));
        if (!matchNome && !matchCNPJ) {
          return false;
        }
      }

      // Filtro por empenho
      if (empenhoId && nf.empenhoId !== empenhoId) {
        return false;
      }

      // Filtro por status
      if (status && nf.status !== status) {
        return false;
      }

      return true;
    });
  } catch (error) {
    console.error('[ReportRepo] Erro ao buscar NFs:', error);
    return [];
  }
}

/**
 * Busca itens de NFs por IDs
 * @param {Array<number>} nfIds - IDs das NFs
 * @returns {Promise<Array>} Lista de itens normalizados
 */
export async function getNFItemsByNFIds(nfIds) {
  if (!nfIds?.length) {
    return [];
  }

  try {
    const nfs = await window.dbManager.listarNotasFiscais();
    const nfMap = new Map((nfs || []).map((nf) => [nf.id, nf]));

    const items = [];
    for (const nfId of nfIds) {
      const nf = nfMap.get(nfId);
      if (nf?.itens?.length) {
        nf.itens.forEach((item, idx) => {
          items.push({
            nfId,
            nfNumero: nf.numero,
            seq: idx + 1,
            itemCompra: item.itemCompra || item.codigo || '',
            descricao: String(item.descricao || item.material || '').toUpperCase(),
            unidade: String(item.unidade || 'UN').toUpperCase(),
            quantidade: parseFloat(item.quantidade) || 0,
            valorUnitario: parseFloat(item.valorUnitario) || 0,
            valorTotal: parseFloat(item.valorTotal) || item.quantidade * item.valorUnitario || 0
          });
        });
      }
    }

    return items;
  } catch (error) {
    console.error('[ReportRepo] Erro ao buscar itens NF:', error);
    return [];
  }
}

/**
 * Busca Empenhos com filtros
 * @param {Object} params - Filtros de busca
 * @returns {Promise<Array>} Lista de empenhos normalizados
 */
export async function getEmpenhos(params = {}) {
  const { ano, fornecedor, subelemento, status } = params;

  if (!window.dbManager?.db) {
    console.warn('[ReportRepo] dbManager não inicializado');
    return [];
  }

  try {
    const empenhos = await window.dbManager.listarEmpenhos();

    return (empenhos || []).map(normalizeEmpenho).filter((emp) => {
      // Filtro por ano
      if (ano && emp.ano !== parseInt(ano)) {
        return false;
      }

      // Filtro por fornecedor
      if (fornecedor) {
        const termo = normalizeText(fornecedor);
        const matchNome = normalizeText(emp.fornecedorNome).includes(termo);
        const matchCNPJ = (emp.fornecedorCNPJ || '').includes(termo.replace(/\D/g, ''));
        if (!matchNome && !matchCNPJ) {
          return false;
        }
      }

      // Filtro por subelemento
      if (subelemento) {
        const sub = String(subelemento);
        if (!emp.subelemento?.includes(sub)) {
          return false;
        }
      }

      // Filtro por status
      if (status && emp.statusValidacao !== status) {
        return false;
      }

      return true;
    });
  } catch (error) {
    console.error('[ReportRepo] Erro ao buscar empenhos:', error);
    return [];
  }
}

/**
 * Busca empenho por ID
 * @param {number} id - ID do empenho
 * @returns {Promise<Object|null>}
 */
export async function getEmpenhoById(id) {
  try {
    const emp = await window.dbManager.buscarEmpenhoPorId(parseInt(id));
    return emp ? normalizeEmpenho(emp) : null;
  } catch (error) {
    console.error('[ReportRepo] Erro ao buscar empenho:', error);
    return null;
  }
}

/**
 * Busca entregas/recebimentos
 * @param {Object} params - Filtros
 * @returns {Promise<Array>}
 */
export async function getEntregas(params = {}) {
  const { dateFrom, dateTo, empenhoId } = params;

  try {
    const entregas = await window.dbManager.listarEntregas();

    return (entregas || []).filter((ent) => {
      if (dateFrom && ent.dataEntrega < dateFrom) {
        return false;
      }
      if (dateTo && ent.dataEntrega > dateTo) {
        return false;
      }
      if (empenhoId && ent.empenhoId !== empenhoId) {
        return false;
      }
      return true;
    });
  } catch (error) {
    console.error('[ReportRepo] Erro ao buscar entregas:', error);
    return [];
  }
}

/**
 * Obtém lista de anos disponíveis nos empenhos
 * @returns {Promise<Array<number>>}
 */
export async function getAnosDisponiveis() {
  try {
    const empenhos = await window.dbManager.listarEmpenhos();
    const anos = new Set();
    (empenhos || []).forEach((emp) => {
      if (emp.ano) {
        anos.add(emp.ano);
      }
    });
    return Array.from(anos).sort((a, b) => b - a);
  } catch (error) {
    console.error('[ReportRepo] Erro ao buscar anos:', error);
    return [];
  }
}

/**
 * Obtém lista de fornecedores únicos
 * @returns {Promise<Array<{cnpj: string, nome: string}>>}
 */
export async function getFornecedoresUnicos() {
  try {
    const empenhos = await window.dbManager.listarEmpenhos();
    const map = new Map();

    (empenhos || []).forEach((emp) => {
      const cnpj = emp.cnpjFornecedor || emp.fornecedorCNPJ || '';
      const nome = emp.fornecedor || emp.fornecedorNome || '';
      if (cnpj && !map.has(cnpj)) {
        map.set(cnpj, { cnpj, nome });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error('[ReportRepo] Erro ao buscar fornecedores:', error);
    return [];
  }
}

/**
 * Obtém lista de subelementos únicos
 * @returns {Promise<Array<string>>}
 */
export async function getSubelementosUnicos() {
  try {
    const empenhos = await window.dbManager.listarEmpenhos();
    const set = new Set();

    (empenhos || []).forEach((emp) => {
      // Subelemento pode estar no empenho ou nos itens
      if (emp.subelemento) {
        set.add(emp.subelemento);
      }
      (emp.itens || []).forEach((it) => {
        if (it.subelemento) {
          set.add(it.subelemento);
        }
      });
    });

    return Array.from(set).sort();
  } catch (error) {
    console.error('[ReportRepo] Erro ao buscar subelementos:', error);
    return [];
  }
}

// ============================================================================
// FUNÇÕES DE NORMALIZAÇÃO
// ============================================================================

/**
 * Normaliza dados de NF para formato padrão de relatório
 */
function normalizeNF(nf) {
  const totalManual = parseFloat(nf.valorTotal) || 0;
  const somaItens = (nf.itens || []).reduce((sum, it) => {
    return sum + (parseFloat(it.valorTotal) || parseFloat(it.quantidade) * parseFloat(it.valorUnitario) || 0);
  }, 0);

  return {
    id: nf.id,
    numero: nf.numero,
    serie: nf.serie || '1',
    dataISO: nf.dataEmissao || nf.dataEntrada || nf.dataCriacao || '',
    fornecedorCNPJ: nf.cnpjEmitente || nf.cnpjFornecedor || '',
    fornecedorNome: nf.nomeEmitente || nf.fornecedor || '',
    empenhoId: nf.empenhoId || null,
    totalManual,
    somaItens,
    diff: Math.abs(totalManual - somaItens),
    status: nf.status || 'pendente',
    itens: nf.itens || []
  };
}

/**
 * Normaliza dados de empenho para formato padrão
 */
function normalizeEmpenho(emp) {
  const itens = emp.itens || [];
  const valorEmpenhado = parseFloat(emp.valorTotal) || parseFloat(emp.valorTotalEmpenho) || 0;

  // Extrair subelemento dos itens se não estiver no raiz
  let subelemento = emp.subelemento || '';
  if (!subelemento && itens.length > 0) {
    subelemento = itens[0]?.subelemento || '';
  }

  return {
    id: emp.id,
    ano: emp.ano || new Date().getFullYear(),
    numeroNE: emp.numero || '',
    slug: emp.slug || `${emp.ano}-NE-${emp.numero}`,
    subelemento,
    fornecedorNome: emp.fornecedor || emp.fornecedorNome || '',
    fornecedorCNPJ: emp.cnpjFornecedor || emp.fornecedorCNPJ || '',
    valorEmpenhado,
    valorUtilizado: parseFloat(emp.valorUtilizado) || 0,
    saldo: valorEmpenhado - (parseFloat(emp.valorUtilizado) || 0),
    statusValidacao: emp.statusValidacao || 'rascunho',
    dataEmpenho: emp.dataEmpenho || '',
    itens
  };
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

/**
 * Normaliza texto para comparação
 */
function normalizeText(str) {
  return String(str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export { normalizeText, normalizeNF, normalizeEmpenho };
