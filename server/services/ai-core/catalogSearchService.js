'use strict';

const comprasGovGateway = require('../gov-api/comprasGovGatewayService');
const semanticRankingService = require('./semanticRankingService');

function pickFirst(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return null;
}

function pickText(...values) {
  const value = pickFirst(...values);
  if (value === null) {
    return null;
  }

  const text = String(value).trim();
  return text || null;
}

function buildReference(existing, codigo, descricao) {
  if (existing) {
    return existing;
  }

  return codigo || descricao ? { codigo, descricao } : undefined;
}

function normalizeCatalogItem(raw = {}) {
  const codigoItem = pickText(raw.codigoItem, raw.codigo, raw.id) || '';
  const descricaoItem = pickText(raw.descricaoItem, raw.descricao, raw.nome) || '';
  const codigoGrupo = pickText(raw.codigoGrupo, raw.grupoMaterial?.codigo, raw.id_grupo);
  const descricaoGrupo = pickText(raw.descricaoGrupo, raw.nomeGrupo, raw.grupoMaterial?.descricao);
  const codigoClasse = pickText(raw.codigoClasse, raw.classeMaterial?.codigo, raw.id_classe);
  const descricaoClasse = pickText(raw.descricaoClasse, raw.nomeClasse, raw.classeMaterial?.descricao);
  const codigoPdm = pickText(raw.codigoPdm, raw.pdm?.codigo, raw.id_pdm);
  const descricaoPdm = pickText(raw.descricaoPdm, raw.nomePdm, raw.pdm?.descricao);
  const unidadeFornecimento = pickText(raw.unidadeFornecimento, raw.unidade, raw.unidadeMedida, 'UN') || 'UN';
  const statusItem = raw.statusItem ?? raw.status ?? null;

  return {
    ...raw,
    codigoItem,
    codigo: codigoItem,
    descricaoItem,
    descricao: descricaoItem,
    codigoGrupo,
    descricaoGrupo,
    codigoClasse,
    descricaoClasse,
    codigoPdm,
    descricaoPdm,
    unidadeFornecimento,
    unidade: unidadeFornecimento,
    statusItem,
    status: statusItem,
    itemSustentavel: raw.itemSustentavel ?? raw.sustentavel ?? false,
    grupoMaterial: buildReference(raw.grupoMaterial, codigoGrupo, descricaoGrupo),
    classeMaterial: buildReference(raw.classeMaterial, codigoClasse, descricaoClasse),
    pdm: buildReference(raw.pdm, codigoPdm, descricaoPdm)
  };
}

function groupByPdm(rankedItems = []) {
  const groups = new Map();

  for (const entry of rankedItems) {
    const item = entry.item || {};
    const pdmKey = String(item.codigoPdm || item.pdm?.codigo || 'sem-pdm');
    const current = groups.get(pdmKey) || {
      codigoPdm: item.codigoPdm || item.pdm?.codigo || null,
      descricaoPdm: item.descricaoPdm || item.pdm?.descricao || 'Sem PDM informado',
      codigoGrupo: item.codigoGrupo || item.grupoMaterial?.codigo || null,
      descricaoGrupo: item.descricaoGrupo || item.grupoMaterial?.descricao || null,
      codigoClasse: item.codigoClasse || item.classeMaterial?.codigo || null,
      descricaoClasse: item.descricaoClasse || item.classeMaterial?.descricao || null,
      topScore: 0,
      itens: []
    };

    current.itens.push(entry);
    current.topScore = Math.max(current.topScore, entry.score || 0);
    groups.set(pdmKey, current);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      totalItens: group.itens.length,
      itens: [...group.itens].sort((left, right) => right.score - left.score)
    }))
    .sort((left, right) => right.topScore - left.topScore || right.totalItens - left.totalItens);
}

function buildSuggestions(query, groups = []) {
  if (!query || groups.length === 0) {
    return [];
  }

  const totalItens = groups.reduce((sum, group) => sum + Number(group.totalItens || 0), 0);
  const suggestions = [
    {
      tipo: 'todos_grupos',
      label: `Todos os grupos - ${query}`,
      termo: query,
      totalItens,
      topScore: groups[0]?.topScore || 0
    }
  ];

  for (const group of groups) {
    const preview = group.itens[0]?.item || {};
    suggestions.push({
      tipo: 'pdm',
      label: group.descricaoPdm || 'Sem PDM informado',
      codigoPdm: group.codigoPdm,
      descricaoPdm: group.descricaoPdm,
      codigoGrupo: group.codigoGrupo || preview.codigoGrupo || null,
      descricaoGrupo: group.descricaoGrupo || preview.descricaoGrupo || null,
      codigoClasse: group.codigoClasse || preview.codigoClasse || null,
      descricaoClasse: group.descricaoClasse || preview.descricaoClasse || null,
      totalItens: group.totalItens,
      topScore: group.topScore,
      previewCodigo: preview.codigoItem || preview.codigo || null,
      previewDescricao: preview.descricaoItem || preview.descricao || null
    });
  }

  return suggestions;
}

async function buscarMateriaisComRanking(query, options = {}, context = {}) {
  const normalizedQuery = semanticRankingService.normalizeText(query);
  const isCodeQuery = /^\d+$/.test(normalizedQuery);
  const limit = Math.max(1, Math.min(Number(options.limite || options.tamanhoPagina || 20), 100));
  const offset = Math.max(0, Number(options.offset || 0));
  const detalhar = options.detalhar === true || String(options.detalhar || '').toLowerCase() === 'true';
  const upstreamPageSize = isCodeQuery ? Math.max(limit, 5) : Math.max(limit * 4, 80);
  const upstream = await comprasGovGateway.consultarItemMaterial(
    {
      ...(isCodeQuery ? { codigoItem: normalizedQuery } : { descricaoItem: query }),
      codigoGrupo: options.codigoGrupo,
      codigoClasse: options.codigoClasse,
      codigoPdm: options.codigoPdm,
      statusItem: options.statusItem || '1'
    },
    {
      pagina: 1,
      tamanhoPagina: upstreamPageSize
    },
    context
  );

  const items = Array.isArray(upstream?.resultado) ? upstream.resultado.map(normalizeCatalogItem).filter((item) => item.codigoItem && item.descricaoItem) : [];
  const rankedItems = semanticRankingService.rankItems(query, items);
  const groupedByPdm = groupByPdm(rankedItems);
  const shouldReturnSuggestions = !isCodeQuery && !options.codigoPdm && !detalhar;
  const entries = shouldReturnSuggestions ? rankedItems.slice(0, limit) : rankedItems.slice(offset, offset + limit);
  const contextoSelecionado = options.codigoPdm
    ? groupedByPdm.find((group) => String(group.codigoPdm || '') === String(options.codigoPdm || '')) || {
        codigoPdm: options.codigoPdm,
        descricaoPdm: null,
        codigoGrupo: options.codigoGrupo || null,
        descricaoGrupo: null,
        codigoClasse: options.codigoClasse || null,
        descricaoClasse: null
      }
    : null;

  return {
    query,
    modo: shouldReturnSuggestions ? 'suggestions' : 'items',
    totalRegistros: rankedItems.length,
    dados: entries.map((entry) => entry.item),
    rankedItems: entries,
    groupedByPdm,
    sugestoes: shouldReturnSuggestions ? buildSuggestions(query, groupedByPdm) : [],
    filtros: {
      codigoGrupo: options.codigoGrupo || null,
      codigoClasse: options.codigoClasse || null,
      codigoPdm: options.codigoPdm || null,
      detalhar: shouldReturnSuggestions ? false : detalhar
    },
    contextoSelecionado,
    totalUpstream: Number(upstream?.totalRegistros || items.length || 0),
    offset,
    limite: limit
  };
}

module.exports = {
  normalizeCatalogItem,
  buscarMateriaisComRanking,
  groupByPdm
};
