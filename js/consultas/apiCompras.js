/**
 * apiCompras.js
 * Cliente de Consultas Diversas em modo real (backend de integrações + fallback API pública).
 */

import { httpRequest } from '../shared/lib/http.js';

const BACKEND_BASE = '/api/integracoes/comprasgov';
const PUBLIC_API_BASE = 'https://dadosabertos.compras.gov.br';

const REQUEST_TIMEOUT = 30000;
const MAX_RETRIES = 3;
const BACKOFF_BASE = 1000;

function buildQueryString(params = {}) {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  return filtered.length > 0 ? `?${filtered.join('&')}` : '';
}

async function fetchWithRetry(url, attempt = 1) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'SINGEM-Consultas'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return response.json();
    }

    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      const delay = BACKOFF_BASE * 2 ** (attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, attempt + 1);
    }

    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new Error('Requisição excedeu o tempo limite (30s)');
    }

    throw error;
  }
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
  const response = await httpRequest(`${BACKEND_BASE}${path}${buildQueryString(params)}`, { method: 'GET' });

  if (!response.ok) {
    const err = new Error(response.error?.message || 'Falha na API de integrações');
    err.status = response.error?.status || 0;
    throw err;
  }

  return normalizeResponse(response.data);
}

async function requestPublic(path, params = {}) {
  const data = await fetchWithRetry(`${PUBLIC_API_BASE}${path}${buildQueryString(params)}`);
  return normalizeResponse(data);
}

async function requestReal({ backendPath, backendParams, publicPath, publicParams }) {
  try {
    return await requestBackend(backendPath, backendParams);
  } catch (error) {
    const canFallbackToPublic = [0, 401, 403, 404, 429, 500, 502, 503, 504].includes(Number(error.status || 0));
    if (!canFallbackToPublic) {
      throw error;
    }

    return requestPublic(publicPath, publicParams);
  }
}

export async function getMateriais(filters = {}) {
  const { pagina = 1, codigoGrupo, codigoClasse, codigoPdm, status, descricao } = filters;

  return requestReal({
    backendPath: '/catmat/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      codigoGrupo,
      codigoClasse,
      codigoPdm,
      status,
      descricao,
      nome: descricao
    },
    publicPath: `/modulo-material/material/${pagina}`,
    publicParams: {
      codigoGrupo,
      codigoClasse,
      codigoPdm,
      status,
      descricao,
      nome: descricao
    }
  });
}

export async function getServicos(filters = {}) {
  const { pagina = 1, codigoGrupo, codigoClasse, status, descricao } = filters;

  return requestReal({
    backendPath: '/catser/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      codigoGrupo,
      codigoClasse,
      status,
      descricao,
      nome: descricao
    },
    publicPath: `/modulo-servico/servico/${pagina}`,
    publicParams: {
      codigoGrupo,
      codigoClasse,
      status,
      descricao,
      nome: descricao
    }
  });
}

export async function getUASG(filters = {}) {
  const { pagina = 1, codigoUasg, uf, status, nomeUasg, nomeOrgao } = filters;

  return requestReal({
    backendPath: '/uasg',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      codigoUasg,
      uf,
      statusUasg: status,
      nomeUasg,
      nomeOrgao
    },
    publicPath: `/modulo-uasg/uasg/${pagina}`,
    publicParams: {
      codigoUasg,
      uf,
      status,
      nomeUasg,
      nomeOrgao
    }
  });
}

export async function getARP(filters = {}) {
  const { pagina = 1, numeroAta, anoAta, orgao, codigoItem, descricaoItem, fornecedor } = filters;

  return requestReal({
    backendPath: '/arp',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      numeroAta,
      anoAta,
      orgao,
      codigoItem,
      descricaoItem,
      fornecedor
    },
    publicPath: `/modulo-arp/arp-item/${pagina}`,
    publicParams: {
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
    backendPath: '/contratacoes',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      cnpjOrgao,
      ano,
      modalidade,
      situacao,
      objeto
    },
    publicPath: `/pncp/v1/contratacoes/${pagina}`,
    publicParams: {
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
    backendPath: '/legado/licitacoes',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      uasg,
      modalidade,
      ano,
      objeto
    },
    publicPath: `/licitacoes/v1/licitacoes/${pagina}`,
    publicParams: {
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
    backendPath: '/legado/itens',
    backendParams: {
      pagina,
      tamanhoPagina: 30,
      uasg,
      modalidade,
      numeroLicitacao,
      descricao,
      nome: descricao
    },
    publicPath: `/licitacoes/v1/licitacoes-itens/${pagina}`,
    publicParams: {
      uasg,
      modalidade,
      numeroLicitacao,
      descricao,
      nome: descricao
    }
  });
}

export async function getGruposMaterial() {
  const data = await requestReal({
    backendPath: '/catmat/grupos',
    backendParams: { tamanhoPagina: 100 },
    publicPath: '/modulo-material/grupo-material',
    publicParams: {}
  });

  return data.items || [];
}

export async function getClassesMaterial(codigoGrupo) {
  if (!codigoGrupo) {
    return [];
  }

  const data = await requestReal({
    backendPath: '/catmat/classes',
    backendParams: { codigoGrupo, tamanhoPagina: 100 },
    publicPath: '/modulo-material/classe-material',
    publicParams: { codigoGrupo }
  });

  return data.items || [];
}

export async function getGruposServico() {
  const data = await requestReal({
    backendPath: '/catser/grupos',
    backendParams: { tamanhoPagina: 100 },
    publicPath: '/modulo-servico/grupo-servico',
    publicParams: {}
  });

  return data.items || [];
}

export async function getClassesServico(codigoGrupo) {
  if (!codigoGrupo) {
    return [];
  }

  const data = await requestReal({
    backendPath: '/catser/classes',
    backendParams: { codigoGrupo, tamanhoPagina: 100 },
    publicPath: '/modulo-servico/classe-servico',
    publicParams: { codigoGrupo }
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
    descricao: '🌐 Modo real (Backend + fallback API oficial)'
  };
}
