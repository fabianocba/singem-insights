/**
 * apiCompras.js
 * Cliente para APIs públicas do Compras.gov.br (Dados Abertos)
 * Documentação: https://dadosabertos.compras.gov.br/swagger-ui/index.html
 *
 * NOTA: Usa proxy local para evitar bloqueio CORS
 * - Navegador chama: /api/modulo-material/material/1
 * - Proxy redireciona para: https://dadosabertos.compras.gov.br/modulo-material/material/1
 *
 * MODO DEMO: Se API estiver fora do ar, usa dados de exemplo (dadosMock.js)
 */

import * as Mock from './dadosMock.js';

const API_BASE = '/api';

// Carrega preferência de modo demo do localStorage
let MODO_DEMO = localStorage.getItem('consultasAPIModoDEMO') === 'true' || false;

/**
 * Timeout padrão para requisições (30 segundos)
 */
const REQUEST_TIMEOUT = 30000;

/**
 * Número máximo de tentativas em caso de erro 429/500
 */
const MAX_RETRIES = 3;

/**
 * Delay base para backoff exponencial (ms)
 */
const BACKOFF_BASE = 1000;

/**
 * Requisição HTTP com timeout e retry exponencial
 * @param {string} url - URL completa
 * @param {number} attempt - Tentativa atual (1-indexed)
 * @returns {Promise<Object>} Resposta JSON
 */
async function fetchWithRetry(url, attempt = 1) {
  console.log(`🌐 Fazendo requisição: ${url}`);
  console.log(`   Tentativa: ${attempt}/${MAX_RETRIES}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      mode: 'cors', // Explicitamente permite CORS
      headers: {
        Accept: 'application/json'
      }
    });
    clearTimeout(timeoutId);

    console.log(`✅ Resposta recebida - Status: ${response.status}`);

    // Sucesso
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Dados parseados com sucesso`);
      return data;
    }

    // Rate limit ou erro de servidor - retry com backoff
    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      const delay = BACKOFF_BASE * Math.pow(2, attempt - 1);
      console.warn(`⚠️ Erro ${response.status} - retry ${attempt}/${MAX_RETRIES} após ${delay}ms`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return fetchWithRetry(url, attempt + 1);
    }

    // Erro definitivo
    const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
    console.error(`❌ Erro HTTP: ${errorMsg}`);
    throw new Error(errorMsg);
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      const timeoutMsg = 'Requisição excedeu o tempo limite (30s)';
      console.error(`⏱️ Timeout: ${timeoutMsg}`);
      throw new Error(timeoutMsg);
    }

    // Erro de rede (CORS, conexão, etc)
    if (error.message === 'Failed to fetch') {
      console.error('❌ Erro de rede ou CORS');
      console.error('   Possíveis causas:');
      console.error('   1. Sem conexão com a internet');
      console.error('   2. API do Compras.gov.br fora do ar');
      console.error('   3. Bloqueio de CORS (menos provável - API pública)');
      console.error('   4. Firewall bloqueando a requisição');

      throw new Error(
        'Erro ao conectar com a API do Compras.gov.br\n\n' +
          'Verifique:\n' +
          '• Sua conexão com a internet\n' +
          '• Se o site https://dadosabertos.compras.gov.br está acessível'
      );
    }

    console.error(`❌ Erro inesperado:`, error);
    throw error;
  }
}

/**
 * Constrói query string a partir de objeto de parâmetros
 * @param {Object} params - Parâmetros { key: value }
 * @returns {string} Query string (ex: "?param1=val1&param2=val2")
 */
function buildQueryString(params) {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`);

  return filtered.length > 0 ? '?' + filtered.join('&') : '';
}

/**
 * Consulta itens de material do catálogo
 * @param {Object} filters - { pagina, codigoGrupo, codigoClasse, codigoPdm, status }
 * @returns {Promise<Object>} { _metadata, itens }
 */
export async function getMateriais(filters = {}) {
  // Se modo demo ativo, retorna dados mock
  if (MODO_DEMO) {
    console.warn('⚠️ MODO DEMO: Retornando dados de exemplo (API indisponível)');
    return Promise.resolve(Mock.MOCK_MATERIAIS);
  }

  const { pagina = 1, codigoGrupo, codigoClasse, codigoPdm, status } = filters;

  const params = buildQueryString({
    codigoGrupo,
    codigoClasse,
    codigoPdm,
    status
  });

  const url = `${API_BASE}/modulo-material/material/${pagina}${params}`;

  try {
    return await fetchWithRetry(url);
  } catch (error) {
    // Se falhar, ativa modo demo e retorna dados mock
    console.error('❌ API falhou. Ativando MODO DEMO...');
    MODO_DEMO = true;
    return Mock.MOCK_MATERIAIS;
  }
}

/**
 * Consulta itens de serviço do catálogo
 * @param {Object} filters - { pagina, codigoGrupo, codigoClasse, status }
 * @returns {Promise<Object>} { _metadata, itens }
 */
export async function getServicos(filters = {}) {
  if (MODO_DEMO) {
    console.warn('⚠️ MODO DEMO: Retornando dados de exemplo');
    return Promise.resolve(Mock.MOCK_SERVICOS);
  }

  const { pagina = 1, codigoGrupo, codigoClasse, status } = filters;

  const params = buildQueryString({
    codigoGrupo,
    codigoClasse,
    status
  });

  const url = `${API_BASE}/modulo-servico/servico/${pagina}${params}`;

  try {
    return await fetchWithRetry(url);
  } catch (error) {
    console.error('❌ API falhou. Ativando MODO DEMO...');
    MODO_DEMO = true;
    return Mock.MOCK_SERVICOS;
  }
}

/**
 * Consulta unidades UASG
 * @param {Object} filters - { pagina, codigoUasg, uf, status }
 * @returns {Promise<Object>} { _metadata, itens }
 */
export async function getUASG(filters = {}) {
  if (MODO_DEMO) {
    console.warn('⚠️ MODO DEMO: Retornando dados de exemplo');
    return Promise.resolve(Mock.MOCK_UASG);
  }

  const { pagina = 1, codigoUasg, uf, status } = filters;

  const params = buildQueryString({
    codigoUasg,
    uf,
    status
  });

  const url = `${API_BASE}/modulo-uasg/uasg/${pagina}${params}`;

  try {
    return await fetchWithRetry(url);
  } catch (error) {
    console.error('❌ API falhou. Ativando MODO DEMO...');
    MODO_DEMO = true;
    return Mock.MOCK_UASG;
  }
}

/**
 * Consulta itens de ARP (Atas de Registro de Preço)
 * @param {Object} filters - { pagina, numeroAta, anoAta, orgao, codigoItem }
 * @returns {Promise<Object>} { _metadata, itens }
 */
export async function getARP(filters = {}) {
  if (MODO_DEMO) {
    console.warn('⚠️ MODO DEMO: Retornando dados de exemplo');
    return Promise.resolve(Mock.MOCK_ARP);
  }

  const { pagina = 1, numeroAta, anoAta, orgao, codigoItem } = filters;

  const params = buildQueryString({
    numeroAta,
    anoAta,
    orgao,
    codigoItem
  });

  const url = `${API_BASE}/modulo-arp/arp-item/${pagina}${params}`;

  try {
    return await fetchWithRetry(url);
  } catch (error) {
    console.error('❌ API falhou. Ativando MODO DEMO...');
    MODO_DEMO = true;
    return Mock.MOCK_ARP;
  }
}

/**
 * Consulta contratações PNCP (Lei 14.133/2021)
 * @param {Object} filters - { pagina, cnpjOrgao, ano, modalidade, situacao }
 * @returns {Promise<Object>} { _metadata, itens }
 */
export async function getPNCP(filters = {}) {
  if (MODO_DEMO) {
    console.warn('⚠️ MODO DEMO: PNCP não disponível em modo demo');
    return Promise.resolve({
      _metadata: { totalRegistros: 0 },
      _embedded: { itens: [] }
    });
  }

  const { pagina = 1, cnpjOrgao, ano, modalidade, situacao } = filters;

  const params = buildQueryString({
    cnpjOrgao,
    ano,
    modalidade,
    situacao
  });

  const url = `${API_BASE}/pncp/v1/contratacoes/${pagina}${params}`;
  return await fetchWithRetry(url);
}

/**
 * Consulta licitações legado (sistema antigo)
 * @param {Object} filters - { pagina, uasg, modalidade, ano }
 * @returns {Promise<Object>} { _metadata, itens }
 */
export async function getLegadoLicitacoes(filters = {}) {
  const { pagina = 1, uasg, modalidade, ano } = filters;

  const params = buildQueryString({
    uasg,
    modalidade,
    ano
  });

  const url = `${API_BASE}/licitacoes/v1/licitacoes/${pagina}${params}`;
  return await fetchWithRetry(url);
}

/**
 * Consulta itens de licitação legado
 * @param {Object} filters - { pagina, uasg, modalidade, numeroLicitacao }
 * @returns {Promise<Object>} { _metadata, itens }
 */
export async function getLegadoItens(filters = {}) {
  const { pagina = 1, uasg, modalidade, numeroLicitacao } = filters;

  const params = buildQueryString({
    uasg,
    modalidade,
    numeroLicitacao
  });

  const url = `${API_BASE}/licitacoes/v1/licitacoes-itens/${pagina}${params}`;
  return await fetchWithRetry(url);
}

/**
 * Consulta grupos de material (auxiliar para filtros)
 * @returns {Promise<Array>} Lista de grupos
 */
export async function getGruposMaterial() {
  const url = `${API_BASE}/modulo-material/grupo-material`;
  const data = await fetchWithRetry(url);
  return data._embedded?.grupoMateriais || [];
}

/**
 * Consulta classes de material por grupo (auxiliar para filtros)
 * @param {string} codigoGrupo - Código do grupo
 * @returns {Promise<Array>} Lista de classes
 */
export async function getClassesMaterial(codigoGrupo) {
  if (!codigoGrupo) {
    return [];
  }
  const url = `${API_BASE}/modulo-material/classe-material?codigoGrupo=${codigoGrupo}`;
  const data = await fetchWithRetry(url);
  return data._embedded?.classeMateriais || [];
}

/**
 * Consulta grupos de serviço (auxiliar para filtros)
 * @returns {Promise<Array>} Lista de grupos
 */
export async function getGruposServico() {
  const url = `${API_BASE}/modulo-servico/grupo-servico`;
  const data = await fetchWithRetry(url);
  return data._embedded?.grupoServicos || [];
}

/**
 * Consulta classes de serviço por grupo (auxiliar para filtros)
 * @param {string} codigoGrupo - Código do grupo
 * @returns {Promise<Array>} Lista de classes
 */
export async function getClassesServico(codigoGrupo) {
  if (!codigoGrupo) {
    return [];
  }
  const url = `${API_BASE}/modulo-servico/classe-servico?codigoGrupo=${codigoGrupo}`;
  const data = await fetchWithRetry(url);
  return data._embedded?.classeServicos || [];
}

/**
 * Ativa/Desativa modo DEMO (dados mockados)
 * @param {boolean} ativar - true para ativar, false para desativar
 */
export function setModoDemo(ativar) {
  MODO_DEMO = ativar;
  localStorage.setItem('consultasAPIModoDEMO', ativar ? 'true' : 'false');
  console.log(`🎭 Modo DEMO ${ativar ? 'ATIVADO' : 'DESATIVADO'}`);
}

/**
 * Verifica se está em modo DEMO
 * @returns {boolean}
 */
export function isModoDemo() {
  return MODO_DEMO;
}

/**
 * Retorna status da API
 * @returns {Object} Status da conexão com API
 */
export function getAPIStatus() {
  return {
    modoDemo: MODO_DEMO,
    apiBase: API_BASE,
    descricao: MODO_DEMO ? '🎭 Modo Demonstração (Dados de Exemplo)' : '🌐 Conectado à API do Compras.gov.br'
  };
}
