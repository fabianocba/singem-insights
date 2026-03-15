/**
 * SINGEM - Report Engine
 * Motor de relatórios com definições, filtros e agregações
 * @version 1.0.0
 */

import * as repo from './reportRepository.js';
import { formatCNPJ } from '../core/format.js';

// ============================================================================
// DEFINIÇÕES DE RELATÓRIOS
// ============================================================================

export const REPORTS = {
  fornecedorResumo: {
    id: 'fornecedorResumo',
    title: '📊 Resumo por Fornecedor',
    description: 'Total de NFs, valores, empenhos envolvidos por fornecedor',
    source: ['nf', 'empenho'],
    filters: ['dateRange', 'fornecedor', 'status'],
    groupBy: 'fornecedor',
    columns: [
      { key: 'fornecedor', label: 'Fornecedor', align: 'left' },
      { key: 'cnpj', label: 'CNPJ', align: 'center' },
      { key: 'qtdNFs', label: 'Qtd NFs', align: 'right', type: 'number' },
      { key: 'valorTotal', label: 'Valor Total', align: 'right', type: 'money' },
      { key: 'valorMedio', label: 'Valor Médio', align: 'right', type: 'money' },
      { key: 'primeiraData', label: 'Primeira NF', align: 'center', type: 'date' },
      { key: 'ultimaData', label: 'Última NF', align: 'center', type: 'date' },
      { key: 'empenhos', label: 'Empenhos', align: 'left' }
    ]
  },

  itemResumo: {
    id: 'itemResumo',
    title: '📦 Resumo por Item (Consumo)',
    description: 'Quantidade total, valor, preço médio por item',
    source: ['nf'],
    filters: ['dateRange', 'fornecedor', 'subelemento', 'empenho'],
    groupBy: 'item',
    columns: [
      { key: 'itemCompra', label: 'Item Compra', align: 'center' },
      { key: 'descricao', label: 'Descrição', align: 'left' },
      { key: 'unidade', label: 'Unidade', align: 'center' },
      { key: 'qtdTotal', label: 'Qtd Total', align: 'right', type: 'number' },
      { key: 'valorTotal', label: 'Valor Total', align: 'right', type: 'money' },
      { key: 'precoMedio', label: 'Preço Médio', align: 'right', type: 'money' },
      { key: 'qtdFornecedores', label: 'Fornecedores', align: 'right', type: 'number' },
      { key: 'qtdNFs', label: 'NFs', align: 'right', type: 'number' }
    ]
  },

  empenhosSaldos: {
    id: 'empenhosSaldos',
    title: '💰 Empenhos - Saldos e Execução',
    description: 'Valor empenhado, executado e saldo por empenho',
    source: ['empenho', 'nf'],
    filters: ['ano', 'fornecedor', 'subelemento', 'status'],
    groupBy: null,
    columns: [
      { key: 'empenho', label: 'Empenho', align: 'left' },
      { key: 'ano', label: 'Ano', align: 'center' },
      { key: 'subelemento', label: 'Subelemento', align: 'center' },
      { key: 'fornecedor', label: 'Fornecedor', align: 'left' },
      { key: 'valorEmpenhado', label: 'Empenhado', align: 'right', type: 'money' },
      { key: 'valorExecutado', label: 'Executado', align: 'right', type: 'money' },
      { key: 'saldo', label: 'Saldo', align: 'right', type: 'money' },
      { key: 'percentual', label: '% Exec.', align: 'right', type: 'percent' }
    ]
  },

  subelementosExecucao: {
    id: 'subelementosExecucao',
    title: '📋 Sub-elementos - Execução',
    description: 'Total empenhado, executado e saldo por subelemento',
    source: ['empenho', 'nf'],
    filters: ['ano', 'dateRange'],
    groupBy: 'subelemento',
    columns: [
      { key: 'subelemento', label: 'Subelemento', align: 'left' },
      { key: 'qtdEmpenhos', label: 'Qtd Empenhos', align: 'right', type: 'number' },
      { key: 'valorEmpenhado', label: 'Total Empenhado', align: 'right', type: 'money' },
      { key: 'valorExecutado', label: 'Total Executado', align: 'right', type: 'money' },
      { key: 'saldo', label: 'Saldo', align: 'right', type: 'money' },
      { key: 'percentual', label: '% Exec.', align: 'right', type: 'percent' }
    ]
  },

  auditoriaNF: {
    id: 'auditoriaNF',
    title: '⚠️ Auditoria NF × Empenho',
    description: 'NFs com divergências, totais incorretos, itens não conciliados',
    source: ['nf', 'empenho'],
    filters: ['dateRange', 'fornecedor', 'empenho', 'severidade'],
    groupBy: null,
    columns: [
      { key: 'nfNumero', label: 'NF', align: 'center' },
      { key: 'fornecedor', label: 'Fornecedor', align: 'left' },
      { key: 'empenho', label: 'Empenho', align: 'center' },
      { key: 'totalManual', label: 'Total Manual', align: 'right', type: 'money' },
      { key: 'somaItens', label: 'Soma Itens', align: 'right', type: 'money' },
      { key: 'diff', label: 'Diferença', align: 'right', type: 'money' },
      { key: 'severidade', label: 'Severidade', align: 'center', type: 'badge' },
      { key: 'problemas', label: 'Problemas', align: 'left' }
    ]
  },

  topItensPorValor: {
    id: 'topItensPorValor',
    title: '🏆 Top 20 Itens por Valor',
    description: 'Ranking dos itens com maior valor total',
    source: ['nf'],
    filters: ['dateRange'],
    groupBy: 'item',
    columns: [
      { key: 'ranking', label: '#', align: 'center' },
      { key: 'itemCompra', label: 'Item', align: 'center' },
      { key: 'descricao', label: 'Descrição', align: 'left' },
      { key: 'valorTotal', label: 'Valor Total', align: 'right', type: 'money' },
      { key: 'qtdTotal', label: 'Quantidade', align: 'right', type: 'number' },
      { key: 'percentual', label: '% do Total', align: 'right', type: 'percent' }
    ]
  },

  topFornecedoresPorValor: {
    id: 'topFornecedoresPorValor',
    title: '🏅 Top 20 Fornecedores por Valor',
    description: 'Ranking dos fornecedores com maior valor total',
    source: ['nf'],
    filters: ['dateRange'],
    groupBy: 'fornecedor',
    columns: [
      { key: 'ranking', label: '#', align: 'center' },
      { key: 'fornecedor', label: 'Fornecedor', align: 'left' },
      { key: 'cnpj', label: 'CNPJ', align: 'center' },
      { key: 'valorTotal', label: 'Valor Total', align: 'right', type: 'money' },
      { key: 'qtdNFs', label: 'Qtd NFs', align: 'right', type: 'number' },
      { key: 'percentual', label: '% do Total', align: 'right', type: 'percent' }
    ]
  }
};

// ============================================================================
// EXECUÇÃO DE RELATÓRIOS
// ============================================================================

/**
 * Executa um relatório
 * @param {string} reportId - ID do relatório
 * @param {Object} params - Parâmetros e filtros
 * @returns {Promise<Object>} Resultado do relatório
 */
export async function runReport(reportId, params = {}) {
  const reportDef = REPORTS[reportId];
  if (!reportDef) {
    throw new Error(`Relatório não encontrado: ${reportId}`);
  }

  console.log(`[ReportEngine] Executando: ${reportDef.title}`);

  switch (reportId) {
    case 'fornecedorResumo':
      return await runFornecedorResumo(params);
    case 'itemResumo':
      return await runItemResumo(params);
    case 'empenhosSaldos':
      return await runEmpenhosSaldos(params);
    case 'subelementosExecucao':
      return await runSubelementosExecucao(params);
    case 'auditoriaNF':
      return await runAuditoriaNF(params);
    case 'topItensPorValor':
      return await runTopItensPorValor(params);
    case 'topFornecedoresPorValor':
      return await runTopFornecedoresPorValor(params);
    default:
      throw new Error(`Relatório ainda não implementado: ${reportId}`);
  }
}

// ============================================================================
// IMPLEMENTAÇÃO DOS RELATÓRIOS
// ============================================================================

/**
 * R1: Resumo por Fornecedor
 */
async function runFornecedorResumo(params) {
  const nfs = await repo.getNFs(params);
  const grouped = groupBy(nfs, (nf) => nf.fornecedorCNPJ || nf.fornecedorNome);

  const rows = [];
  for (const [_key, items] of Object.entries(grouped)) {
    const valorTotal = sum(items, 'totalManual');
    const datas = items
      .map((nf) => nf.dataISO)
      .filter(Boolean)
      .sort();
    const empenhoIds = [...new Set(items.map((nf) => nf.empenhoId).filter(Boolean))];

    rows.push({
      fornecedor: items[0]?.fornecedorNome || 'N/D',
      cnpj: formatCNPJ(items[0]?.fornecedorCNPJ || ''),
      qtdNFs: items.length,
      valorTotal,
      valorMedio: items.length > 0 ? valorTotal / items.length : 0,
      primeiraData: datas[0] || '',
      ultimaData: datas[datas.length - 1] || '',
      empenhos: empenhoIds.length
    });
  }

  // Ordenar por valor total decrescente
  rows.sort((a, b) => b.valorTotal - a.valorTotal);

  const totals = {
    qtdNFs: sum(rows, 'qtdNFs'),
    valorTotal: sum(rows, 'valorTotal'),
    qtdFornecedores: rows.length
  };

  return buildResult('fornecedorResumo', rows, totals, params);
}

/**
 * R2: Resumo por Item
 */
async function runItemResumo(params) {
  const nfs = await repo.getNFs(params);
  const nfIds = nfs.map((nf) => nf.id);
  const items = await repo.getNFItemsByNFIds(nfIds);

  // Agrupar por item (itemCompra + descricao + unidade)
  const grouped = groupBy(items, (it) => `${it.itemCompra}|${it.descricao}|${it.unidade}`);

  const rows = [];
  for (const [_key, itens] of Object.entries(grouped)) {
    const qtdTotal = sum(itens, 'quantidade');
    const valorTotal = sum(itens, 'valorTotal');
    const fornecedores = new Set(itens.map((it) => it.nfId));
    const nfSet = new Set(itens.map((it) => it.nfId));

    rows.push({
      itemCompra: itens[0]?.itemCompra || '',
      descricao: itens[0]?.descricao || '',
      unidade: itens[0]?.unidade || 'UN',
      qtdTotal,
      valorTotal,
      precoMedio: qtdTotal > 0 ? valorTotal / qtdTotal : 0,
      qtdFornecedores: fornecedores.size,
      qtdNFs: nfSet.size
    });
  }

  rows.sort((a, b) => b.valorTotal - a.valorTotal);

  const totals = {
    qtdTotal: sum(rows, 'qtdTotal'),
    valorTotal: sum(rows, 'valorTotal'),
    qtdItens: rows.length
  };

  return buildResult('itemResumo', rows, totals, params);
}

/**
 * R3: Empenhos - Saldos e Execução
 */
async function runEmpenhosSaldos(params) {
  const empenhos = await repo.getEmpenhos(params);
  const nfs = await repo.getNFs({});

  // Calcular valor executado por empenho
  const execByEmpenho = {};
  nfs.forEach((nf) => {
    if (nf.empenhoId) {
      execByEmpenho[nf.empenhoId] = (execByEmpenho[nf.empenhoId] || 0) + nf.totalManual;
    }
  });

  const rows = empenhos.map((emp) => {
    const valorExecutado = execByEmpenho[emp.id] || emp.valorUtilizado || 0;
    const saldo = emp.valorEmpenhado - valorExecutado;
    const percentual = emp.valorEmpenhado > 0 ? (valorExecutado / emp.valorEmpenhado) * 100 : 0;

    return {
      empenho: emp.slug || `${emp.ano}-NE-${emp.numeroNE}`,
      ano: emp.ano,
      subelemento: emp.subelemento || 'N/D',
      fornecedor: emp.fornecedorNome || 'N/D',
      valorEmpenhado: emp.valorEmpenhado,
      valorExecutado,
      saldo,
      percentual
    };
  });

  rows.sort((a, b) => b.valorEmpenhado - a.valorEmpenhado);

  const totals = {
    valorEmpenhado: sum(rows, 'valorEmpenhado'),
    valorExecutado: sum(rows, 'valorExecutado'),
    saldo: sum(rows, 'saldo')
  };

  return buildResult('empenhosSaldos', rows, totals, params);
}

/**
 * R4: Sub-elementos - Execução
 */
async function runSubelementosExecucao(params) {
  const empenhos = await repo.getEmpenhos(params);
  const nfs = await repo.getNFs(params);

  // Calcular execução por empenho
  const execByEmpenho = {};
  nfs.forEach((nf) => {
    if (nf.empenhoId) {
      execByEmpenho[nf.empenhoId] = (execByEmpenho[nf.empenhoId] || 0) + nf.totalManual;
    }
  });

  // Agrupar por subelemento
  const grouped = groupBy(empenhos, (emp) => emp.subelemento || 'SEM SUBELEMENTO');

  const rows = [];
  for (const [sub, emps] of Object.entries(grouped)) {
    const valorEmpenhado = sum(emps, 'valorEmpenhado');
    const valorExecutado = emps.reduce((acc, emp) => acc + (execByEmpenho[emp.id] || 0), 0);
    const saldo = valorEmpenhado - valorExecutado;
    const percentual = valorEmpenhado > 0 ? (valorExecutado / valorEmpenhado) * 100 : 0;

    rows.push({
      subelemento: sub,
      qtdEmpenhos: emps.length,
      valorEmpenhado,
      valorExecutado,
      saldo,
      percentual
    });
  }

  rows.sort((a, b) => b.valorEmpenhado - a.valorEmpenhado);

  const totals = {
    valorEmpenhado: sum(rows, 'valorEmpenhado'),
    valorExecutado: sum(rows, 'valorExecutado'),
    saldo: sum(rows, 'saldo')
  };

  return buildResult('subelementosExecucao', rows, totals, params);
}

/**
 * R5: Auditoria NF × Empenho
 */
async function runAuditoriaNF(params) {
  const { severidade } = params;
  const nfs = await repo.getNFs(params);
  const empenhos = await repo.getEmpenhos({});
  const empenhoMap = new Map(empenhos.map((e) => [e.id, e]));

  const TOLERANCIA = 0.05; // 5 centavos

  const rows = [];
  for (const nf of nfs) {
    const problemas = [];
    let sev = 'ok';

    // Verificar diferença entre total manual e soma itens
    if (nf.diff > TOLERANCIA) {
      if (nf.diff > 1) {
        problemas.push(`Diferença de R$ ${fmtMoney(nf.diff)} entre total e soma`);
        sev = 'bloqueante';
      } else {
        problemas.push(`Diferença mínima de R$ ${fmtMoney(nf.diff)}`);
        sev = sev === 'ok' ? 'alerta' : sev;
      }
    }

    // Verificar se empenho existe e está validado
    if (nf.empenhoId) {
      const emp = empenhoMap.get(nf.empenhoId);
      if (!emp) {
        problemas.push('Empenho vinculado não encontrado');
        sev = 'bloqueante';
      } else if (emp.statusValidacao !== 'validado') {
        problemas.push('Empenho em rascunho');
        sev = sev === 'ok' ? 'alerta' : sev;
      }
    } else {
      problemas.push('NF sem empenho vinculado');
      sev = sev === 'ok' ? 'alerta' : sev;
    }

    // Filtrar por severidade se especificado
    if (severidade && sev !== severidade) {
      continue;
    }

    // Só incluir se tem problemas
    if (problemas.length > 0) {
      const emp = empenhoMap.get(nf.empenhoId);
      rows.push({
        nfNumero: nf.numero,
        fornecedor: nf.fornecedorNome || 'N/D',
        empenho: emp?.slug || 'N/V',
        totalManual: nf.totalManual,
        somaItens: nf.somaItens,
        diff: nf.diff,
        severidade: sev,
        problemas: problemas.join('; ')
      });
    }
  }

  // Ordenar por severidade (bloqueante primeiro) e depois por diferença
  const sevOrder = { bloqueante: 0, alerta: 1, ok: 2 };
  rows.sort((a, b) => {
    const sevDiff = sevOrder[a.severidade] - sevOrder[b.severidade];
    if (sevDiff !== 0) {
      return sevDiff;
    }
    return b.diff - a.diff;
  });

  const totals = {
    totalRegistros: rows.length,
    bloqueantes: rows.filter((r) => r.severidade === 'bloqueante').length,
    alertas: rows.filter((r) => r.severidade === 'alerta').length
  };

  return buildResult('auditoriaNF', rows, totals, params);
}

/**
 * R6: Top 20 Itens por Valor
 */
async function runTopItensPorValor(params) {
  const nfs = await repo.getNFs(params);
  const nfIds = nfs.map((nf) => nf.id);
  const items = await repo.getNFItemsByNFIds(nfIds);

  // Agrupar por item
  const grouped = groupBy(items, (it) => `${it.itemCompra}|${it.descricao}`);

  const rows = [];
  for (const [_key, itens] of Object.entries(grouped)) {
    rows.push({
      itemCompra: itens[0]?.itemCompra || '',
      descricao: itens[0]?.descricao || '',
      valorTotal: sum(itens, 'valorTotal'),
      qtdTotal: sum(itens, 'quantidade')
    });
  }

  // Ordenar e pegar top 20
  rows.sort((a, b) => b.valorTotal - a.valorTotal);
  const top20 = rows.slice(0, 20);

  // Calcular percentual
  const totalGeral = sum(rows, 'valorTotal');
  top20.forEach((row, idx) => {
    row.ranking = idx + 1;
    row.percentual = totalGeral > 0 ? (row.valorTotal / totalGeral) * 100 : 0;
  });

  return buildResult('topItensPorValor', top20, { totalGeral }, params);
}

/**
 * R7: Top 20 Fornecedores por Valor
 */
async function runTopFornecedoresPorValor(params) {
  const nfs = await repo.getNFs(params);
  const grouped = groupBy(nfs, (nf) => nf.fornecedorCNPJ || nf.fornecedorNome);

  const rows = [];
  for (const [_key, items] of Object.entries(grouped)) {
    rows.push({
      fornecedor: items[0]?.fornecedorNome || 'N/D',
      cnpj: formatCNPJ(items[0]?.fornecedorCNPJ || ''),
      valorTotal: sum(items, 'totalManual'),
      qtdNFs: items.length
    });
  }

  rows.sort((a, b) => b.valorTotal - a.valorTotal);
  const top20 = rows.slice(0, 20);

  const totalGeral = sum(rows, 'valorTotal');
  top20.forEach((row, idx) => {
    row.ranking = idx + 1;
    row.percentual = totalGeral > 0 ? (row.valorTotal / totalGeral) * 100 : 0;
  });

  return buildResult('topFornecedoresPorValor', top20, { totalGeral }, params);
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function buildResult(reportId, rows, totals, params) {
  const def = REPORTS[reportId];
  return {
    meta: {
      reportId,
      title: def.title,
      description: def.description,
      geradoEm: new Date().toISOString(),
      params,
      totalRows: rows.length
    },
    columns: def.columns,
    rows,
    totals
  };
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = typeof keyFn === 'function' ? keyFn(item) : item[keyFn];
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(item);
    return acc;
  }, {});
}

function sum(arr, field) {
  return arr.reduce((acc, item) => acc + (parseFloat(item[field]) || 0), 0);
}

function fmtMoney(val) {
  return (parseFloat(val) || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

export { groupBy, sum, fmtMoney, formatCNPJ };
