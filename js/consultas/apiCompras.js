/**
 * apiCompras.js
 * Cliente de Consulte Compras.gov em modo real (proxy backend).
 */

import { httpRequest } from '../shared/lib/http.js';

const BACKEND_BASE = '/api/compras';
const activeControllers = new Map();

const RETRYABLE_STATUS = new Set([0, 408, 425, 429, 500, 502, 503, 504]);
const RETRYABLE_MESSAGE =
  /(timeout|temporari|upstream|failed to fetch|network|conex|indisponivel|entitymanager|jpa entity|hibernate|datasource|could not open)/i;
const REQUEST_RETRY_CONFIG = Object.freeze({
  getMaxRetries: 2,
  postMaxRetries: 2,
  retryBaseDelayMs: 450
});

function getAuthToken() {
  return window.__SINGEM_AUTH?.accessToken || null;
}

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeQueryParams(params = {}) {
  const out = {};

  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }

    if (typeof value === 'string') {
      out[key] = normalizeText(value);
      return;
    }

    out[key] = value;
  });

  return out;
}

function buildQueryString(params = {}) {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

function unwrapBackendData(payload) {
  if (payload && typeof payload === 'object' && 'status' in payload && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

function normalizeResponse(rawData) {
  const root = unwrapBackendData(rawData);
  const metadataSource = root?._metadata || root?.metadata || {};

  const items = Array.isArray(root?.resultado)
    ? root.resultado
    : Array.isArray(root?.itens)
      ? root.itens
      : Array.isArray(root?.items)
        ? root.items
        : Array.isArray(root?.data)
          ? root.data
          : root?._embedded && typeof root._embedded === 'object'
            ? Object.values(root._embedded).find(Array.isArray) || []
            : Array.isArray(root)
              ? root
              : [];

  const totalRecords =
    root?.totalRegistros ?? metadataSource?.totalRegistros ?? metadataSource?.totalRecords ?? root?.total ?? 0;
  const totalPages = root?.totalPaginas ?? metadataSource?.totalPaginas ?? metadataSource?.totalPages ?? 1;

  return {
    _metadata: {
      totalRecords: Number(totalRecords || 0),
      totalPages: Math.max(1, Number(totalPages || 1))
    },
    items,
    _raw: root
  };
}

function parseFileNameFromDisposition(disposition, fallback = 'export.csv') {
  if (!disposition) {
    return fallback;
  }

  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const plainMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (plainMatch?.[1]) {
    return plainMatch[1];
  }

  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableError(error = {}) {
  const status = Number(error?.status || 0);
  const message = String(error?.message || '');
  return RETRYABLE_STATUS.has(status) || RETRYABLE_MESSAGE.test(message);
}

function getRetryDelayMs(attempt) {
  return REQUEST_RETRY_CONFIG.retryBaseDelayMs * 2 ** Math.max(0, attempt - 1);
}

function createAbortError() {
  const abortError = new Error('Requisicao cancelada por nova busca.');
  abortError.name = 'AbortError';
  abortError.isAbort = true;
  return abortError;
}

function buildRequestScope(method, path, explicitScope = null) {
  return explicitScope || `${method}:${path}`;
}

function cancelActiveRequest(scope) {
  const controller = activeControllers.get(scope);
  if (!controller) {
    return;
  }

  controller.abort();
  activeControllers.delete(scope);
}

async function requestWithRetry(makeRequest, maxRetries = 0) {
  let attempts = 0;
  let lastResponse = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    attempts = attempt + 1;
    const response = await makeRequest();
    lastResponse = response;

    if (response?.ok) {
      return {
        ok: true,
        data: response.data,
        error: null,
        attempts
      };
    }

    if (response?.error?.isAbort) {
      return {
        ok: false,
        data: null,
        error: response.error,
        attempts
      };
    }

    if (attempt >= maxRetries || !isRetryableError(response?.error || {})) {
      return {
        ok: false,
        data: null,
        error: response?.error || { message: 'Falha na API de integracoes', status: 0 },
        attempts
      };
    }

    await sleep(getRetryDelayMs(attempts));
  }

  return {
    ok: false,
    data: null,
    error: lastResponse?.error || { message: 'Falha na API de integracoes', status: 0 },
    attempts
  };
}

async function requestBackend(path, params = {}, options = {}) {
  const scope = buildRequestScope('GET', path, options.requestScope);
  cancelActiveRequest(scope);

  const controller = new AbortController();
  activeControllers.set(scope, controller);
  const normalizedParams = normalizeQueryParams(params);
  const requestUrl = `${BACKEND_BASE}${path}${buildQueryString(normalizedParams)}`;

  try {
    const response = await requestWithRetry(
      () =>
        httpRequest(requestUrl, {
          method: 'GET',
          signal: controller.signal
        }),
      REQUEST_RETRY_CONFIG.getMaxRetries
    );

    if (!response.ok) {
      if (response.error?.isAbort) {
        throw createAbortError();
      }

      const err = new Error(response.error?.message || 'Falha na API de integracoes');
      err.status = response.error?.status || 0;
      err.details = response.error?.data || null;
      err.attempts = response.attempts || 1;
      throw err;
    }

    return normalizeResponse(response.data);
  } finally {
    if (activeControllers.get(scope) === controller) {
      activeControllers.delete(scope);
    }
  }
}

async function requestBackendPost(path, body = {}, options = {}) {
  const scope = buildRequestScope('POST', path, options.requestScope);
  cancelActiveRequest(scope);

  const controller = new AbortController();
  activeControllers.set(scope, controller);

  try {
    const response = await requestWithRetry(
      () =>
        httpRequest(`${BACKEND_BASE}${path}`, {
          method: 'POST',
          body,
          signal: controller.signal
        }),
      REQUEST_RETRY_CONFIG.postMaxRetries
    );

    if (!response.ok) {
      if (response.error?.isAbort) {
        throw createAbortError();
      }

      const err = new Error(response.error?.message || 'Falha na API de integracoes');
      err.status = response.error?.status || 0;
      err.details = response.error?.data || null;
      err.attempts = response.attempts || 1;
      throw err;
    }

    return unwrapBackendData(response.data);
  } finally {
    if (activeControllers.get(scope) === controller) {
      activeControllers.delete(scope);
    }
  }
}

async function requestBackendExport(path, body = {}, format = 'csv') {
  const token = getAuthToken();
  const headers = {
    'Content-Type': 'application/json'
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BACKEND_BASE}${path}?format=${encodeURIComponent(format)}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    let message = `Falha na exportação (${response.status})`;
    try {
      const payload = await response.json();
      message = payload?.message || payload?.erro || message;
    } catch {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }

    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  const blob = await response.blob();
  const disposition = response.headers.get('content-disposition') || '';

  return {
    blob,
    filename: parseFileNameFromDisposition(disposition, `inteligencia-precos.${format}`),
    contentType: response.headers.get('content-type') || blob.type || 'application/octet-stream'
  };
}

function normalizeCatalogType(value) {
  const normalized = String(value || 'material')
    .trim()
    .toLowerCase();
  return normalized === 'servico' || normalized === 'catser' ? 'servico' : 'material';
}

function normalizePriceIntelligencePayload(filters = {}, options = {}) {
  const payload = {
    ...filters,
    tipoCatalogo: normalizeCatalogType(filters.tipoCatalogo || filters.tipo || filters.catalogType),
    codigos: filters.codigos || filters.codes || filters.codigo || '',
    pagina: Number(filters.pagina || filters.page || 1),
    tamanhoPagina: Number(filters.tamanhoPagina || filters.pageSize || 25),
    includeRaw: true,
    forceRefresh: options.forceRefresh === true || filters.forceRefresh === true
  };

  delete payload.page;
  delete payload.pageSize;
  delete payload.codes;
  delete payload.catalogType;
  delete payload.tipo;

  return payload;
}

async function requestReal({ backendPath, backendParams, requestScope }) {
  return requestBackend(backendPath, backendParams, { requestScope });
}

function normalizeAnalyticsResult(response) {
  return {
    _metadata: {
      totalRecords: Number(response?.page?.totalItems || response?.metrics?.totalRegistros || 0),
      totalPages: Number(response?.page?.totalPages || 1)
    },
    items: Array.isArray(response?.page?.items) ? response.page.items : [],
    _analytics: response,
    _raw: response
  };
}

export async function getPrecosPraticados(filters = {}, options = {}) {
  const payload = normalizePriceIntelligencePayload(filters, options);
  const response = await requestBackendPost(
    '/inteligencia-compras/query',
    { ...payload, focus: 'price' },
    {
      requestScope: 'procurement-analytics-price'
    }
  );

  return {
    ...normalizeAnalyticsResult(response),
    _priceIntelligence: response
  };
}

export async function exportPrecosPraticados(filters = {}, format = 'csv', options = {}) {
  const payload = normalizePriceIntelligencePayload(filters, options);
  return requestBackendExport('/inteligencia-compras/query/export', { ...payload, focus: 'price' }, format);
}

export async function getMateriais(filters = {}) {
  const {
    pagina = 1,
    codigoItem,
    codigoGrupo,
    codigoClasse,
    codigoPdm,
    bps,
    codigo_ncm,
    status,
    statusItem,
    descricao,
    descricaoItem
  } = filters;

  return requestReal({
    backendPath: '/modulo-material/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      codigoItem,
      descricaoItem: descricaoItem || descricao || undefined,
      codigoGrupo,
      codigoClasse,
      codigoPdm,
      statusItem: statusItem || status || undefined,
      bps,
      codigo_ncm
    }
  });
}

export async function getServicos(filters = {}) {
  const { pagina = 1, codigoGrupo, codigoClasse, status, descricao, statusItem, descricaoItem } = filters;

  return requestReal({
    backendPath: '/modulo-servico/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      descricaoItem: descricaoItem || descricao || undefined,
      statusItem: statusItem || status || undefined,
      codigoGrupo,
      codigoClasse
    }
  });
}

export async function getUASG(filters = {}) {
  const {
    pagina = 1,
    codigoUasg,
    codigoOrgao,
    uf,
    siglaUf,
    status,
    statusUasg,
    statusOrgao,
    usoSisg,
    cnpjCpfOrgao,
    cnpjCpfOrgaoVinculado,
    cnpjCpfOrgaoSuperior,
    entity = 'uasg',
    tipoCatalogo,
    codigos
  } = filters;

  const response = await requestBackendPost(
    '/inteligencia-compras/query',
    {
      focus: 'buyer',
      entity,
      pagina,
      tamanhoPagina: 30,
      codigoUasg,
      codigoOrgao,
      siglaUf: siglaUf || uf || undefined,
      statusUasg: statusUasg !== undefined ? statusUasg : status !== undefined ? status : true,
      statusOrgao,
      usoSisg,
      cnpjCpfOrgao,
      cnpjCpfOrgaoVinculado,
      cnpjCpfOrgaoSuperior,
      tipoCatalogo,
      codigos
    },
    {
      requestScope: 'procurement-analytics-buyer'
    }
  );

  return normalizeAnalyticsResult(response);
}

export async function exportUASGAnalytics(filters = {}, format = 'csv') {
  return requestBackendExport(
    '/inteligencia-compras/query/export',
    {
      focus: 'buyer',
      entity: filters.entity || 'uasg',
      ...filters
    },
    format
  );
}

/**
 * getFornecedor — Módulo 10
 * GET /modulo-fornecedor/1_consultarFornecedor
 * Parâmetros oficiais: cnpj, cpf, naturezaJuridicaId, porteEmpresaId, codigoCnae, ativo
 */
export async function getFornecedor(filters = {}) {
  const {
    pagina = 1,
    cnpj,
    cpf,
    naturezaJuridicaId,
    porteEmpresaId,
    codigoCnae,
    ativo,
    nomeFornecedor,
    tipoCatalogo,
    codigos,
    codigoUasg,
    estado
  } = filters;

  const response = await requestBackendPost(
    '/inteligencia-compras/query',
    {
      focus: 'supplier',
      pagina,
      tamanhoPagina: 30,
      cnpj,
      cpf,
      naturezaJuridicaId,
      porteEmpresaId,
      codigoCnae,
      ativo: ativo !== undefined ? ativo : true,
      nomeFornecedor,
      tipoCatalogo,
      codigos,
      codigoUasg,
      estado
    },
    {
      requestScope: 'procurement-analytics-supplier'
    }
  );

  return normalizeAnalyticsResult(response);
}

export async function exportFornecedorAnalytics(filters = {}, format = 'csv') {
  return requestBackendExport(
    '/inteligencia-compras/query/export',
    {
      focus: 'supplier',
      ...filters
    },
    format
  );
}

export async function getARP(filters = {}) {
  // A tela ARP opera sobre itens; converte aliases legados para o contrato oficial /modulo-arp/2_consultarARPItem.
  const {
    pagina = 1,
    dataVigenciaInicial,
    dataVigenciaFinal,
    dataAssinaturaInicial,
    dataAssinaturaFinal,
    codigoUnidadeGerenciadora,
    codigoModalidadeCompra,
    numeroAtaRegistroPreco,
    // Legados (mapeados para nomes oficiais)
    numeroAta,
    orgao,
    codigoItem,
    niFornecedor,
    fornecedor,
    codigoPdm,
    numeroCompra
  } = filters;

  const dataVigenciaInicialMin = filters.dataVigenciaInicialMin || dataVigenciaInicial;
  const dataVigenciaInicialMax = filters.dataVigenciaInicialMax || dataVigenciaFinal;

  return requestReal({
    backendPath: '/modulo-arp/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      dataVigenciaInicialMin,
      dataVigenciaInicialMax,
      dataAssinaturaInicial,
      dataAssinaturaFinal,
      // Nomes oficiais da API
      codigoUnidadeGerenciadora: codigoUnidadeGerenciadora || orgao || undefined,
      codigoModalidadeCompra,
      numeroAtaRegistroPreco: numeroAtaRegistroPreco || numeroAta || undefined,
      codigoItem,
      niFornecedor:
        niFornecedor ||
        (fornecedor && /^\d{14}$/.test(fornecedor.replace(/\D/g, '')) ? fornecedor.replace(/\D/g, '') : undefined),
      codigoPdm,
      numeroCompra
    }
  });
}

export async function getPNCP(filters = {}) {
  const { pagina = 1, cnpjOrgao, ano, modalidade, situacao, objeto } = filters;

  return requestReal({
    backendPath: '/modulo-contratacoes/consulta',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      cnpjOrgao,
      ano,
      modalidade,
      situacao,
      objeto
    }
  });
}

export async function getLegadoLicitacoes(filters = {}) {
  // data_publicacao_inicial e data_publicacao_final são OBRIGATÓRIAS na API real
  const { pagina = 1, data_publicacao_inicial, data_publicacao_final, uasg, modalidade, ano } = filters;

  return requestReal({
    backendPath: '/modulo-legado/licitacoes',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      data_publicacao_inicial,
      data_publicacao_final,
      uasg,
      modalidade,
      ano
    }
  });
}

export async function getLegadoItens(filters = {}) {
  // modalidade é OBRIGATÓRIA — a API retorna erro ou 3.5M registros sem este parâmetro
  const { pagina = 1, uasg, modalidade, numeroLicitacao, descricao } = filters;

  return requestReal({
    backendPath: '/modulo-legado/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      modalidade, // OBRIGATÓRIO
      uasg,
      numeroLicitacao,
      descricao
    }
  });
}

export async function getGruposMaterial() {
  const data = await requestReal({
    backendPath: '/modulo-material/grupos',
    backendParams: { tamanhoPagina: 100 }
  });

  return data.items || [];
}

export async function getClassesMaterial(codigoGrupo) {
  if (!codigoGrupo) {
    return [];
  }

  const data = await requestReal({
    backendPath: '/modulo-material/classes',
    backendParams: { codigoGrupo, tamanhoPagina: 100 }
  });

  return data.items || [];
}

export async function getGruposServico() {
  const data = await requestReal({
    backendPath: '/modulo-servico/grupos',
    backendParams: { tamanhoPagina: 100 }
  });

  return data.items || [];
}

export async function getClassesServico(codigoGrupo) {
  if (!codigoGrupo) {
    return [];
  }

  const data = await requestReal({
    backendPath: '/modulo-servico/classes',
    backendParams: { codigoGrupo, tamanhoPagina: 100 }
  });

  return data.items || [];
}

export function setModoDemo() {
  return false;
}

export function isModoDemo() {
  return false;
}

export function getAPIStatus() {
  return {
    modoDemo: false,
    apiBase: BACKEND_BASE,
    descricao: '🌐 Modo real (Proxy backend Compras.gov.br)'
  };
}
