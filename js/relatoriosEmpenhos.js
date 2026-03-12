/**
 * SINGEM - Módulo de Relatórios de Empenhos
 * Gerencia diferentes tipos de relatórios e visualizações de empenhos
 * @version 1.0.0
 */

import { emit } from './core/eventBus.js';
import { handleAiAvailabilityError, isAiAvailable } from './aiIntegration.js';
import apiClient from './services/apiClient.js';

/**
 * Configuração dos tipos de relatório disponíveis
 */
const TIPOS_RELATORIO = {
  todos: {
    titulo: '📋 Todos os Empenhos',
    descricao: 'Lista completa de empenhos cadastrados',
    filtro: () => true
  },
  ano: {
    titulo: '📅 Empenhos por Ano',
    descricao: 'Empenhos filtrados pelo ano selecionado',
    filtro: (emp, filtros) => !filtros.ano || emp.ano === filtros.ano
  },
  'com-saldo': {
    titulo: '💰 Empenhos com Saldo',
    descricao: 'Empenhos que ainda possuem saldo disponível',
    filtro: (emp) => {
      const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
      const valorUtilizado = emp.valorUtilizado ?? 0;
      return valorEmpenho - valorUtilizado > 0;
    }
  },
  'sem-saldo': {
    titulo: '🔴 Empenhos Sem Saldo',
    descricao: 'Empenhos totalmente utilizados ou com saldo zerado',
    filtro: (emp) => {
      const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
      const valorUtilizado = emp.valorUtilizado ?? 0;
      return valorEmpenho - valorUtilizado <= 0;
    }
  },
  rascunho: {
    titulo: '📝 Em Fase de Cadastro',
    descricao: 'Empenhos ainda em fase de cadastro (rascunho)',
    filtro: (emp) => emp.statusValidacao === 'rascunho' || !emp.statusValidacao
  },
  validado: {
    titulo: '✅ Empenhos Validados',
    descricao: 'Empenhos validados e prontos para uso',
    filtro: (emp) => emp.statusValidacao === 'validado'
  }
};

/**
 * Estado do módulo de relatórios
 */
const estadoRelatorio = {
  tipoAtual: 'todos',
  empenhos: [],
  empenhosComSaldo: [], // Cache com saldos calculados
  filtros: {
    ano: '',
    busca: ''
  },
  ordenacao: 'recente',
  resumoIA: {
    debounceTimer: null,
    requestVersion: 0
  }
};

function buildRelatorioSearchKey(emp) {
  return [
    String(emp.ano || ''),
    String(emp.numero || ''),
    String(emp.fornecedor || ''),
    String(emp.processoSuap || emp.processo || ''),
    String(emp.cnpjDigits || emp.cnpjFornecedor || '')
  ]
    .join(' ')
    .toLowerCase();
}

// Flag de debug para os relatórios
const DEBUG_REL_EMP = false;
const AI_REPORT_SUMMARY_KEY = 'relatorio_empenhos';

/**
 * Inicializa o módulo de relatórios
 */
export function inicializarRelatorios() {
  console.log('[Relatórios] Inicializando módulo de relatórios de empenhos...');

  // Configurar eventos dos botões de tipo
  setupEventosTipoRelatorio();

  // Configurar eventos de filtros
  setupEventosFiltros();

  // Configurar botão de exportação
  setupExportacao();

  // Configurar delegação de eventos para botões Ver/Detalhes
  setupDelegacaoEventosRelatorio();

  // Configurar atualização manual do resumo de IA
  setupEventosResumoIA();

  // Carregar anos disponíveis
  carregarAnosDisponiveis();

  console.log('[Relatórios] ✅ Módulo inicializado');
}

/**
 * Configura eventos dos botões de tipo de relatório
 */
function setupEventosTipoRelatorio() {
  const botoesTipo = Array.from(document.querySelectorAll('.btn-tipo-relatorio'));
  botoesTipo.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const tipo = e.currentTarget.dataset.tipo;

      // Atualizar visual dos botões
      botoesTipo.forEach((b) => b.classList.remove('active'));
      e.currentTarget.classList.add('active');

      // Atualizar tipo atual
      estadoRelatorio.tipoAtual = tipo;

      // Atualizar título
      const config = TIPOS_RELATORIO[tipo];
      const tituloEl = document.getElementById('tituloRelatorioAtual');
      if (tituloEl && config) {
        tituloEl.textContent = config.titulo;
      }

      // Recarregar relatório
      await carregarRelatorioEmpenhos();
    });
  });
}

/**
 * Configura eventos de filtros (busca, ano, ordenação)
 */
function setupEventosFiltros() {
  // Busca
  const inputBusca = document.getElementById('buscaEmpenhoRelatorio');
  if (inputBusca) {
    let debounceTimer;
    inputBusca.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        estadoRelatorio.filtros.busca = e.target.value.toLowerCase().trim();
        await renderizarListaRelatorio();
      }, 300);
    });
  }

  // Filtro por ano
  const selectAno = document.getElementById('filtroAnoRelatorio');
  if (selectAno) {
    selectAno.addEventListener('change', async (e) => {
      estadoRelatorio.filtros.ano = e.target.value;
      await renderizarListaRelatorio();
    });
  }

  // Ordenação
  const selectOrdenacao = document.getElementById('ordenacaoRelatorio');
  if (selectOrdenacao) {
    selectOrdenacao.addEventListener('change', async (e) => {
      estadoRelatorio.ordenacao = e.target.value;
      await renderizarListaRelatorio();
    });
  }
}

/**
 * Configura botão de exportação
 */
function setupExportacao() {
  const btnExportar = document.getElementById('btnExportarRelatorio');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => exportarRelatorio());
  }
}

/**
 * Configura delegação de eventos para botões Ver/Detalhes no container do relatório
 * Usa event delegation para não perder listeners quando a lista é re-renderizada
 */
function setupDelegacaoEventosRelatorio() {
  const container = document.getElementById('relatorioEmpenhosContainer');
  if (!container) {
    console.warn('[Relatórios] Container relatorioEmpenhosContainer não encontrado');
    return;
  }

  // Evitar bind duplicado
  if (container.__boundRelEmp) {
    return;
  }
  container.__boundRelEmp = true;

  container.addEventListener('click', async (ev) => {
    // Buscar botão ou elemento clicável com data-action e data-id
    const target = ev.target?.closest('[data-action][data-id]');
    if (!target) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (DEBUG_REL_EMP) {
      console.log('[REL] click', { action, id, target });
    }

    if (!id) {
      console.warn('[Relatórios] ID do empenho não encontrado no botão');
      return;
    }

    const empenhoId = parseInt(id, 10);
    if (isNaN(empenhoId)) {
      console.warn('[Relatórios] ID inválido:', id);
      return;
    }

    try {
      if (action === 'ver') {
        // Abrir empenho em modo visualização
        if (window.app?.abrirEmpenhoParaEdicao) {
          await window.app.abrirEmpenhoParaEdicao(empenhoId, true);
        } else {
          console.error('[Relatórios] window.app.abrirEmpenhoParaEdicao não disponível');
        }
      } else if (action === 'detalhes') {
        // Mostrar modal de detalhes
        if (window.app?.mostrarDetalhesEmpenho) {
          await window.app.mostrarDetalhesEmpenho(empenhoId);
        } else {
          console.error('[Relatórios] window.app.mostrarDetalhesEmpenho não disponível');
        }
      }
    } catch (e) {
      console.error('[Relatórios] Erro ao executar ação:', e);
    }
  });

  if (DEBUG_REL_EMP) {
    console.log('[Relatórios] ✅ Delegação de eventos configurada');
  }
}

function setupEventosResumoIA() {
  const container = document.getElementById('resumoRelatorioIA');
  if (!container || container.__boundRelatorioIA) {
    return;
  }

  container.__boundRelatorioIA = true;
  container.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-ai-report-action]');
    if (!btn) {
      return;
    }

    if (btn.dataset.aiReportAction === 'refresh') {
      await atualizarResumoRelatorioIA(filtrarEmpenhos(), { forceRefresh: true });
    }
  });
}

function getResumoRelatorioIAContainer() {
  return document.getElementById('resumoRelatorioIA');
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hideResumoRelatorioIA() {
  const container = getResumoRelatorioIAContainer();
  if (!container) {
    return;
  }

  if (estadoRelatorio.resumoIA.debounceTimer) {
    clearTimeout(estadoRelatorio.resumoIA.debounceTimer);
    estadoRelatorio.resumoIA.debounceTimer = null;
  }

  container.innerHTML = '';
  container.classList.add('hidden');
}

function renderResumoRelatorioIALoading(container) {
  container.innerHTML = `
    <div class="ai-report-header">
      <div>
        <h4>🧠 Resumo por IA</h4>
        <p class="ai-report-subtitle">Analisando o recorte atual do relatório...</p>
      </div>
      <div class="ai-report-status">
        <span class="ai-assist-chip">IA</span>
        <span class="ai-assist-chip ai-assist-chip-muted">Processando</span>
      </div>
    </div>
    <p class="ai-report-text">Gerando leitura inteligente das métricas filtradas.</p>
  `;
  container.classList.remove('hidden');
}

function renderResumoRelatorioIAErro(container, message) {
  container.innerHTML = `
    <div class="ai-report-error">
      <div class="ai-report-header">
        <div>
          <h4>🧠 Resumo por IA</h4>
          <p class="ai-report-subtitle">O resumo inteligente não pôde ser carregado agora.</p>
        </div>
        <div class="ai-report-status">
          <button type="button" class="btn btn-outline btn-sm" data-ai-report-action="refresh">Tentar novamente</button>
        </div>
      </div>
      <p class="ai-report-text">${escapeHtml(message)}</p>
    </div>
  `;
  container.classList.remove('hidden');
}

function buildResumoRelatorioIAData(empenhosFiltrados) {
  const totalEmpenhos = empenhosFiltrados.length;
  const valorTotal = empenhosFiltrados.reduce((acc, emp) => acc + (emp.valorTotalEmpenho ?? emp.valorTotal ?? 0), 0);
  const valorUtilizado = empenhosFiltrados.reduce((acc, emp) => acc + (emp.valorUtilizado ?? 0), 0);
  const saldoTotal = valorTotal - valorUtilizado;
  const comSaldo = empenhosFiltrados.filter((emp) => (emp.saldoDisponivel ?? 0) > 0).length;
  const semSaldo = empenhosFiltrados.filter((emp) => (emp.saldoDisponivel ?? 0) <= 0).length;
  const rascunhos = empenhosFiltrados.filter(
    (emp) => emp.statusValidacao === 'rascunho' || !emp.statusValidacao
  ).length;
  const validados = empenhosFiltrados.filter((emp) => emp.statusValidacao === 'validado').length;
  const criticidadeAlta = empenhosFiltrados.filter((emp) => (emp.percentualUtilizado ?? 0) >= 80).length;
  const percentualMedioUtilizado =
    totalEmpenhos > 0
      ? Number(
          (empenhosFiltrados.reduce((acc, emp) => acc + (emp.percentualUtilizado ?? 0), 0) / totalEmpenhos).toFixed(2)
        )
      : 0;

  const fornecedores = new Map();
  for (const emp of empenhosFiltrados) {
    const fornecedor = String(emp.fornecedor || 'Fornecedor não informado').trim();
    fornecedores.set(fornecedor, (fornecedores.get(fornecedor) || 0) + 1);
  }

  const maiorConcentracaoFornecedor = totalEmpenhos > 0 ? Math.max(...fornecedores.values()) : 0;
  const concentracaoFornecedorPct =
    totalEmpenhos > 0 ? Number(((maiorConcentracaoFornecedor / totalEmpenhos) * 100).toFixed(2)) : 0;
  const anosCobertos = new Set(empenhosFiltrados.map((emp) => String(emp.ano || '')).filter(Boolean)).size;

  return {
    total_empenhos: totalEmpenhos,
    valor_total_empenhado: Number(valorTotal.toFixed(2)),
    valor_total_utilizado: Number(valorUtilizado.toFixed(2)),
    saldo_total_disponivel: Number(saldoTotal.toFixed(2)),
    percentual_medio_utilizado: percentualMedioUtilizado,
    total_empenhos_com_saldo: comSaldo,
    total_empenhos_sem_saldo: semSaldo,
    total_rascunhos_pendentes: rascunhos,
    total_validados: validados,
    total_fornecedores_unicos: fornecedores.size,
    total_anos_cobertos: anosCobertos,
    alerta_empenhos_sem_saldo: semSaldo,
    alerta_rascunhos_pendentes: rascunhos,
    anomalia_empenhos_criticos: criticidadeAlta,
    anomalia_concentracao_fornecedor_pct: concentracaoFornecedorPct,
    tipo_relatorio: estadoRelatorio.tipoAtual,
    ano_filtro: estadoRelatorio.filtros.ano || 'todos',
    busca_aplicada: estadoRelatorio.filtros.busca || 'sem filtro textual',
    ordenacao_aplicada: estadoRelatorio.ordenacao
  };
}

function renderResumoRelatorioIA(container, payload, empenhosFiltrados) {
  const confidence = Math.round(Number(payload?.confidence || 0) * 100);
  const insights = Array.isArray(payload?.insights) ? payload.insights : [];
  const alerts = Array.isArray(payload?.alerts) ? payload.alerts : [];
  const anomalies = Array.isArray(payload?.anomalies) ? payload.anomalies : [];
  const recorteLabel = TIPOS_RELATORIO[estadoRelatorio.tipoAtual]?.titulo || 'Relatório de Empenhos';

  const renderList = (items, emptyText) => {
    if (!items.length) {
      return `<p class="ai-report-empty">${escapeHtml(emptyText)}</p>`;
    }

    return `<ul class="ai-report-list">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
  };

  container.innerHTML = `
    <div class="ai-report-header">
      <div>
        <h4>🧠 Resumo por IA</h4>
        <p class="ai-report-subtitle">${escapeHtml(recorteLabel)} • ${empenhosFiltrados.length} empenho(s) analisado(s)</p>
      </div>
      <div class="ai-report-status">
        <span class="ai-assist-chip">IA</span>
        <span class="ai-assist-chip ai-assist-chip-muted">${payload?.cached ? 'Cache' : 'Atual'}</span>
        <span class="ai-assist-chip ai-assist-chip-score">Confiança ${confidence}%</span>
        <button type="button" class="btn btn-outline btn-sm" data-ai-report-action="refresh">Atualizar agora</button>
      </div>
    </div>
    <p class="ai-report-text">${escapeHtml(payload?.summary || 'Resumo indisponível.')}</p>
    <div class="ai-report-grid">
      <section class="ai-report-section">
        <h5>Indicadores-chave</h5>
        ${renderList(insights, 'Sem indicadores complementares para este recorte.')}
      </section>
      <section class="ai-report-section">
        <h5>Alertas</h5>
        ${renderList(alerts, 'Nenhum alerta relevante foi detectado.')}
      </section>
      <section class="ai-report-section">
        <h5>Anomalias</h5>
        ${renderList(anomalies, 'Nenhuma anomalia relevante foi detectada.')}
      </section>
    </div>
  `;
  container.classList.remove('hidden');
}

function agendarAtualizacaoResumoRelatorioIA(empenhosFiltrados) {
  const container = getResumoRelatorioIAContainer();
  if (!container) {
    return;
  }

  if (estadoRelatorio.resumoIA.debounceTimer) {
    clearTimeout(estadoRelatorio.resumoIA.debounceTimer);
  }

  estadoRelatorio.resumoIA.debounceTimer = setTimeout(() => {
    estadoRelatorio.resumoIA.debounceTimer = null;
    atualizarResumoRelatorioIA(empenhosFiltrados).catch((error) => {
      console.warn('[Relatórios] Falha ao atualizar resumo IA:', error?.message || error);
    });
  }, 500);
}

async function atualizarResumoRelatorioIA(empenhosFiltrados, { forceRefresh = false } = {}) {
  const container = getResumoRelatorioIAContainer();
  if (!container) {
    return;
  }

  if (!Array.isArray(empenhosFiltrados) || empenhosFiltrados.length === 0) {
    hideResumoRelatorioIA();
    return;
  }

  const available = await isAiAvailable();
  if (!available) {
    renderResumoRelatorioIAErro(container, 'Serviço de IA indisponível no momento para resumir o relatório.');
    return;
  }

  const requestVersion = ++estadoRelatorio.resumoIA.requestVersion;
  renderResumoRelatorioIALoading(container);

  try {
    const response = await apiClient.ai.reportSummary({
      report_key: AI_REPORT_SUMMARY_KEY,
      context_module: 'empenhos',
      data: buildResumoRelatorioIAData(empenhosFiltrados),
      force_refresh: forceRefresh
    });

    if (requestVersion !== estadoRelatorio.resumoIA.requestVersion) {
      return;
    }

    renderResumoRelatorioIA(container, response, empenhosFiltrados);
  } catch (error) {
    if (requestVersion !== estadoRelatorio.resumoIA.requestVersion) {
      return;
    }

    handleAiAvailabilityError(error);
    renderResumoRelatorioIAErro(container, error?.message || 'Resumo inteligente indisponível para este relatório.');
  }
}

/**
 * Carrega anos disponíveis no select de filtro
 */
async function carregarAnosDisponiveis() {
  try {
    const empenhos = estadoRelatorio.empenhos.length
      ? estadoRelatorio.empenhos
      : await window.dbManager.buscarEmpenhos(true);
    const anos = [...new Set(empenhos.map((e) => e.ano).filter(Boolean))].sort((a, b) => b - a);

    const selectAno = document.getElementById('filtroAnoRelatorio');
    if (selectAno) {
      selectAno.innerHTML = '<option value="">Todos os anos</option>';
      anos.forEach((ano) => {
        selectAno.innerHTML += `<option value="${ano}">${ano}</option>`;
      });
    }
  } catch (error) {
    console.error('[Relatórios] Erro ao carregar anos:', error);
  }
}

/**
 * Carrega o relatório de empenhos conforme tipo selecionado
 */
export async function carregarRelatorioEmpenhos() {
  const container = document.getElementById('relatorioEmpenhosContainer');
  if (!container) {
    return;
  }

  try {
    // Mostrar loading
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <span>⏳ Carregando empenhos...</span>
      </div>
    `;

    // Buscar todos os empenhos
    const empenhos = await window.dbManager.buscarEmpenhos(true);
    estadoRelatorio.empenhos = empenhos || [];

    // Calcular saldos para cada empenho
    estadoRelatorio.empenhosComSaldo = await calcularSaldosEmpenhos(estadoRelatorio.empenhos);

    // Atualizar filtro de anos
    await carregarAnosDisponiveis();

    // Renderizar lista (inclui atualização de resumo)
    await renderizarListaRelatorio();

    console.log('[Relatórios] ✅ Relatório carregado:', estadoRelatorio.empenhos.length, 'empenhos');
  } catch (error) {
    console.error('[Relatórios] Erro ao carregar relatório:', error);
    container.innerHTML = `
      <div class="alert alert-danger">
        ❌ Erro ao carregar relatório: ${error.message}
      </div>
    `;
  }
}

/**
 * Calcula saldos para todos os empenhos
 * @param {Array} empenhos - Lista de empenhos
 * @returns {Array} Empenhos com saldo calculado
 */
async function calcularSaldosEmpenhos(empenhos) {
  const empenhosComSaldo = [];

  for (const emp of empenhos) {
    const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
    let valorUtilizado = 0;

    // Buscar notas fiscais vinculadas ao empenho
    if (emp.id && window.dbManager?.buscarNotasFiscaisPorEmpenho) {
      try {
        const nfs = await window.dbManager.buscarNotasFiscaisPorEmpenho(emp.id);
        valorUtilizado = (nfs || []).reduce((acc, nf) => acc + (nf.valorTotal || 0), 0);
      } catch (e) {
        // Ignorar erros de NFs
      }
    }

    const saldoDisponivel = valorEmpenho - valorUtilizado;
    const percentualUtilizado = valorEmpenho > 0 ? (valorUtilizado / valorEmpenho) * 100 : 0;

    empenhosComSaldo.push({
      ...emp,
      valorUtilizado,
      saldoDisponivel,
      percentualUtilizado,
      searchKey: emp.searchKey || buildRelatorioSearchKey(emp)
    });
  }

  return empenhosComSaldo;
}

/**
 * Renderiza o resumo/estatísticas do relatório
 */
async function renderizarResumoRelatorio() {
  const container = document.getElementById('resumoRelatorio');
  if (!container) {
    return;
  }

  const empenhosFiltrados = filtrarEmpenhos();

  // Calcular estatísticas
  const totalEmpenhos = empenhosFiltrados.length;
  const valorTotal = empenhosFiltrados.reduce((acc, e) => acc + (e.valorTotalEmpenho ?? e.valorTotal ?? 0), 0);
  const valorUtilizado = empenhosFiltrados.reduce((acc, e) => acc + (e.valorUtilizado ?? 0), 0);
  const saldoTotal = valorTotal - valorUtilizado;

  const comSaldo = empenhosFiltrados.filter((e) => e.saldoDisponivel > 0).length;
  const semSaldo = empenhosFiltrados.filter((e) => e.saldoDisponivel <= 0).length;
  const rascunhos = empenhosFiltrados.filter((e) => e.statusValidacao === 'rascunho' || !e.statusValidacao).length;
  const validados = empenhosFiltrados.filter((e) => e.statusValidacao === 'validado').length;

  // Formatador de moeda
  const formatCurrency = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  container.innerHTML = `
    <div class="resumo-card destaque-azul">
      <div class="valor">${totalEmpenhos}</div>
      <div class="label">Total de Empenhos</div>
    </div>
    <div class="resumo-card">
      <div class="valor" style="font-size: 16px;">${formatCurrency(valorTotal)}</div>
      <div class="label">Valor Total Empenhado</div>
    </div>
    <div class="resumo-card destaque-verde">
      <div class="valor" style="font-size: 16px;">${formatCurrency(saldoTotal)}</div>
      <div class="label">Saldo Disponível</div>
    </div>
    <div class="resumo-card destaque-verde">
      <div class="valor">${comSaldo}</div>
      <div class="label">Com Saldo</div>
    </div>
    <div class="resumo-card destaque-vermelho">
      <div class="valor">${semSaldo}</div>
      <div class="label">Sem Saldo</div>
    </div>
    <div class="resumo-card destaque-amarelo">
      <div class="valor">${rascunhos}</div>
      <div class="label">Em Cadastro</div>
    </div>
    <div class="resumo-card destaque-azul">
      <div class="valor">${validados}</div>
      <div class="label">Validados</div>
    </div>
  `;
}

/**
 * Filtra empenhos conforme tipo de relatório e filtros ativos
 */
function filtrarEmpenhos() {
  const config = TIPOS_RELATORIO[estadoRelatorio.tipoAtual];
  if (!config) {
    return estadoRelatorio.empenhosComSaldo;
  }

  let resultado = estadoRelatorio.empenhosComSaldo.filter((emp) => config.filtro(emp, estadoRelatorio.filtros));

  // Aplicar filtro de ano adicional (para tipo "ano")
  if (estadoRelatorio.filtros.ano) {
    resultado = resultado.filter((emp) => String(emp.ano) === String(estadoRelatorio.filtros.ano));
  }

  // Aplicar filtro de busca
  if (estadoRelatorio.filtros.busca) {
    const termo = estadoRelatorio.filtros.busca;
    resultado = resultado.filter((emp) => {
      const searchKey = emp.searchKey || buildRelatorioSearchKey(emp);
      return searchKey.includes(termo);
    });
  }

  // Ordenar
  resultado = ordenarEmpenhos(resultado);

  return resultado;
}

/**
 * Ordena empenhos conforme ordenação selecionada
 */
function ordenarEmpenhos(empenhos) {
  const ordenacao = estadoRelatorio.ordenacao;

  const comparadores = {
    recente: (a, b) => new Date(b.dataEmpenho || b.dataCriacao || 0) - new Date(a.dataEmpenho || a.dataCriacao || 0),
    antigo: (a, b) => new Date(a.dataEmpenho || a.dataCriacao || 0) - new Date(b.dataEmpenho || b.dataCriacao || 0),
    numero: (a, b) => {
      const anoA = parseInt(a.ano) || 0;
      const anoB = parseInt(b.ano) || 0;
      if (anoB !== anoA) {
        return anoB - anoA;
      }
      return (parseInt(b.numero) || 0) - (parseInt(a.numero) || 0);
    },
    'valor-desc': (a, b) => (b.valorTotalEmpenho ?? b.valorTotal ?? 0) - (a.valorTotalEmpenho ?? a.valorTotal ?? 0),
    'valor-asc': (a, b) => (a.valorTotalEmpenho ?? a.valorTotal ?? 0) - (b.valorTotalEmpenho ?? b.valorTotal ?? 0),
    'saldo-desc': (a, b) => (b.saldoDisponivel ?? 0) - (a.saldoDisponivel ?? 0),
    'saldo-asc': (a, b) => (a.saldoDisponivel ?? 0) - (b.saldoDisponivel ?? 0)
  };

  const comparar = comparadores[ordenacao] || (() => 0);

  return [...empenhos].sort((a, b) => comparar(a, b));
}

/**
 * Renderiza a lista de empenhos filtrados
 */
async function renderizarListaRelatorio() {
  const container = document.getElementById('relatorioEmpenhosContainer');
  if (!container) {
    return;
  }

  const empenhosFiltrados = filtrarEmpenhos();

  // Atualizar resumo
  await renderizarResumoRelatorio();
  agendarAtualizacaoResumoRelatorioIA(empenhosFiltrados);

  if (empenhosFiltrados.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <p>📭 Nenhum empenho encontrado com os filtros selecionados.</p>
        ${estadoRelatorio.filtros.busca ? '<p><small>Tente ajustar os termos da busca.</small></p>' : ''}
      </div>
    `;
    return;
  }

  // Formatador de moeda
  const formatCurrency = (valor) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  // Gerar cards
  const cardsHTML = empenhosFiltrados
    .map((emp) => {
      const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
      const saldo = emp.saldoDisponivel ?? 0;
      const percentual = emp.percentualUtilizado ?? 0;
      const status = emp.statusValidacao || 'rascunho';

      // Cor do saldo
      let saldoCor = '#28a745'; // Verde
      if (saldo <= 0) {
        saldoCor = '#dc3545';
      } // Vermelho
      else if (percentual >= 80) {
        saldoCor = '#ffc107';
      } // Amarelo

      // Badge de status
      const badgeClass = status === 'validado' ? 'badge-success' : 'badge-warning';
      const badgeText = status === 'validado' ? '✅ Validado' : '📝 Rascunho';

      return `
      <div class="empenho-card" data-empenho-id="${emp.id}" style="margin-bottom: 12px;">
        <div class="empenho-card__header">
          <span class="empenho-card__titulo">NE ${emp.ano}/${emp.numero}</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="empenho-card__body">
          <div class="empenho-card__descricao" data-action="ver" data-id="${emp.id}" style="cursor: pointer;">
            ${emp.fornecedor || 'Fornecedor não informado'}
          </div>
          <div class="empenho-card__meta">
            <div class="empenho-card__info">
              <strong>Valor:</strong> ${formatCurrency(valorEmpenho)}
              <span style="margin-left: 16px; color: ${saldoCor}; font-weight: bold;">
                Saldo: ${formatCurrency(saldo)}
              </span>
              ${percentual > 0 ? `<span style="margin-left: 8px; color: #666; font-size: 12px;">(${percentual.toFixed(0)}% utilizado)</span>` : ''}
            </div>
            <div class="empenho-card__acoes">
              <button class="btn-acao" data-action="ver" data-id="${emp.id}" title="Visualizar">
                👁️ Ver
              </button>
              <button class="btn-acao" data-action="detalhes" data-id="${emp.id}" title="Detalhes">
                📋 Detalhes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <div class="empenhos-lista">
      ${cardsHTML}
    </div>
    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
      📊 Exibindo ${empenhosFiltrados.length} de ${estadoRelatorio.empenhosComSaldo.length} empenho(s)
    </div>
  `;
}

/**
 * Exporta o relatório atual para CSV
 */
function exportarRelatorio() {
  const empenhosFiltrados = filtrarEmpenhos();

  if (empenhosFiltrados.length === 0) {
    alert('❌ Nenhum empenho para exportar.');
    return;
  }

  const config = TIPOS_RELATORIO[estadoRelatorio.tipoAtual];
  const titulo = config?.titulo || 'Relatório de Empenhos';

  // Cabeçalho CSV
  const headers = [
    'Ano',
    'Número',
    'Fornecedor',
    'CNPJ',
    'Processo',
    'Valor Empenho',
    'Valor Utilizado',
    'Saldo Disponível',
    '% Utilizado',
    'Status',
    'Data Empenho'
  ];

  // Linhas
  const rows = empenhosFiltrados.map((emp) => [
    emp.ano || '',
    emp.numero || '',
    emp.fornecedor || '',
    emp.cnpjDigits || emp.cnpjFornecedor || '',
    emp.processoSuap || emp.processo || '',
    (emp.valorTotalEmpenho ?? emp.valorTotal ?? 0).toFixed(2).replace('.', ','),
    (emp.valorUtilizado ?? 0).toFixed(2).replace('.', ','),
    (emp.saldoDisponivel ?? 0).toFixed(2).replace('.', ','),
    (emp.percentualUtilizado ?? 0).toFixed(1).replace('.', ','),
    emp.statusValidacao === 'validado' ? 'Validado' : 'Rascunho',
    emp.dataEmpenho ? new Date(emp.dataEmpenho).toLocaleDateString('pt-BR') : ''
  ]);

  // Gerar CSV
  const csvContent = [headers.join(';'), ...rows.map((r) => r.map((c) => `"${c}"`).join(';'))].join('\n');

  // Baixar arquivo
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const dataAtual = new Date().toISOString().split('T')[0];
  link.download = `relatorio_empenhos_${estadoRelatorio.tipoAtual}_${dataAtual}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  emit('relatorio.exportado', { tipo: estadoRelatorio.tipoAtual, qtd: empenhosFiltrados.length });

  alert(`✅ Relatório exportado!\n\n📄 ${titulo}\n📊 ${empenhosFiltrados.length} empenho(s)`);
}

// Exportar funções globais para uso no HTML
window.RelatoriosEmpenhos = {
  inicializar: inicializarRelatorios,
  carregar: carregarRelatorioEmpenhos
};

export default {
  inicializarRelatorios,
  carregarRelatorioEmpenhos
};
