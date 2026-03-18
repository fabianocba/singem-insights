import apiClient from '../../services/apiClient.js';

function buildQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === false) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry !== undefined && entry !== null && entry !== '') {
          query.append(key, String(entry));
        }
      });
      return;
    }

    query.set(key, String(value));
  });

  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

async function getPaginated(endpoint, params = {}) {
  const envelope = await apiClient.getEnvelope(`${endpoint}${buildQueryString(params)}`);

  return {
    items: Array.isArray(envelope?.data) ? envelope.data : [],
    meta: envelope?.meta || {}
  };
}

export async function carregarMetaAlmoxarifado() {
  return apiClient.get('/api/almoxarifado/meta');
}

export async function carregarDashboardAlmoxarifado(params = {}) {
  return apiClient.get(`/api/almoxarifado/dashboard${buildQueryString(params)}`);
}

export async function carregarResumoAlmoxarifado(params = {}) {
  return apiClient.get(`/api/almoxarifado/relatorios/resumo${buildQueryString(params)}`);
}

export async function listarContasContabeisAlmoxarifado(params = {}) {
  return getPaginated('/api/almoxarifado/contas-contabeis', params);
}

export async function criarContaContabilAlmoxarifado(payload) {
  return apiClient.post('/api/almoxarifado/contas-contabeis', payload);
}

export async function listarItensAlmoxarifado(params = {}) {
  return getPaginated('/api/almoxarifado/itens', params);
}

export async function obterItemAlmoxarifado(itemId) {
  return apiClient.get(`/api/almoxarifado/itens/${itemId}`);
}

export async function criarItemAlmoxarifado(payload) {
  return apiClient.post('/api/almoxarifado/itens', payload);
}

export async function atualizarItemAlmoxarifado(itemId, payload) {
  return apiClient.put(`/api/almoxarifado/itens/${itemId}`, payload);
}

export async function listarNotasEntradaAlmoxarifado(params = {}) {
  return getPaginated('/api/almoxarifado/notas-entrada', params);
}

export async function criarNotaEntradaAlmoxarifado(payload) {
  return apiClient.post('/api/almoxarifado/notas-entrada', payload);
}

export async function listarMovimentacoesAlmoxarifado(params = {}) {
  return getPaginated('/api/almoxarifado/movimentacoes', params);
}

export async function criarMovimentacaoAlmoxarifado(payload) {
  return apiClient.post('/api/almoxarifado/movimentacoes', payload);
}

export async function listarSolicitacoesAlmoxarifado(params = {}) {
  return getPaginated('/api/almoxarifado/solicitacoes', params);
}

export async function criarSolicitacaoAlmoxarifado(payload) {
  return apiClient.post('/api/almoxarifado/solicitacoes', payload);
}

export async function atualizarStatusSolicitacaoAlmoxarifado(solicitacaoId, payload) {
  return apiClient.patch(`/api/almoxarifado/solicitacoes/${solicitacaoId}/status`, payload);
}

export async function listarAuditoriaAlmoxarifado(params = {}) {
  return getPaginated('/api/almoxarifado/auditoria', params);
}
