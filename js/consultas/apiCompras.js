/**
 * apiCompras.js
 * Cliente de Consulte Compras.gov em modo real (proxy backend).
 */

import { httpRequest } from '../shared/lib/http.js';

const BACKEND_BASE = '/api/compras';
let activeController = null;

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

function normalizeResponse(rawData) {
  const root = rawData?.data && rawData?.success !== undefined ? rawData.data : rawData;
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

async function requestBackend(path, params = {}) {
  if (activeController) {
    activeController.abort();
  }

  const controller = new AbortController();
  activeController = controller;
  const normalizedParams = normalizeQueryParams(params);

  const response = await httpRequest(`${BACKEND_BASE}${path}${buildQueryString(normalizedParams)}`, {
    method: 'GET',
    signal: controller.signal
  });

  if (activeController === controller) {
    activeController = null;
  }

  if (!response.ok) {
    if (response.error?.isAbort) {
      const abortError = new Error('Requisição cancelada por nova busca.');
      abortError.name = 'AbortError';
      abortError.isAbort = true;
      throw abortError;
    }

    const err = new Error(response.error?.message || 'Falha na API de integrações');
    err.status = response.error?.status || 0;
    throw err;
  }

  return normalizeResponse(response.data);
}

async function requestReal({ backendPath, backendParams }) {
  return requestBackend(backendPath, backendParams);
}

export async function getMateriais(filters = {}) {
  const { pagina = 1, codigoGrupo, codigoClasse, codigoPdm, status, descricao } = filters;

  return requestReal({
    backendPath: '/modulo-material/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      codigoGrupo,
      codigoClasse,
      codigoPdm,
      status,
      descricao
    }
  });
}

export async function getServicos(filters = {}) {
  const { pagina = 1, codigoGrupo, codigoClasse, status, descricao } = filters;

  return requestReal({
    backendPath: '/modulo-servico/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      codigoGrupo,
      codigoClasse,
      status,
      descricao
    }
  });
}

export async function getUASG(filters = {}) {
  const { pagina = 1, codigoUasg, uf, status, nomeUasg, nomeOrgao } = filters;

  return requestReal({
    backendPath: '/modulo-uasg/consulta',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      codigoUasg,
      uf,
      statusUasg: status,
      nomeUasg,
      nomeOrgao
    }
  });
}

export async function getARP(filters = {}) {
  const { pagina = 1, numeroAta, anoAta, orgao, codigoItem, descricaoItem, fornecedor } = filters;

  return requestReal({
    backendPath: '/modulo-arp/consulta',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      numeroAta,
      anoAta,
      orgao,
      codigoItem,
      descricaoItem,
      fornecedor
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
  const { pagina = 1, uasg, modalidade, ano, objeto } = filters;

  return requestReal({
    backendPath: '/modulo-legado/licitacoes',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      uasg,
      modalidade,
      ano,
      objeto
    }
  });
}

export async function getLegadoItens(filters = {}) {
  const { pagina = 1, uasg, modalidade, numeroLicitacao, descricao } = filters;

  return requestReal({
    backendPath: '/modulo-legado/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      uasg,
      modalidade,
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
