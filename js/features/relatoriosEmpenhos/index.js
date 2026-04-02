import { estadoRelatorio } from './state.js';
import { carregarAnosDisponiveis, calcularSaldosEmpenhos } from './data.js';
import { renderizarListaRelatorio } from './render.js';
import {
  setupDelegacaoEventosRelatorio,
  setupEventosFiltros,
  setupEventosTipoRelatorio,
  setupExportacao
} from './events.js';
import { exportarRelatorio } from './export.js';

export function inicializarRelatorios() {
  console.log('[Relatórios] Inicializando módulo de relatórios de empenhos...');

  setupEventosTipoRelatorio(carregarRelatorioEmpenhos);
  setupEventosFiltros(renderizarListaRelatorio);
  setupExportacao(exportarRelatorio);
  setupDelegacaoEventosRelatorio();
  carregarAnosDisponiveis();

  console.log('[Relatórios] ✅ Módulo inicializado');
}

export async function carregarRelatorioEmpenhos() {
  const container = document.getElementById('relatorioEmpenhosContainer');
  if (!container) {
    return;
  }

  try {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <span>⏳ Carregando empenhos...</span>
      </div>
    `;

    const empenhos = await window.dbManager.buscarEmpenhos(true);
    estadoRelatorio.empenhos = empenhos || [];
    estadoRelatorio.empenhosComSaldo = await calcularSaldosEmpenhos(estadoRelatorio.empenhos);

    await carregarAnosDisponiveis();
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

window.RelatoriosEmpenhos = {
  inicializar: inicializarRelatorios,
  carregar: carregarRelatorioEmpenhos
};

export default {
  inicializarRelatorios,
  carregarRelatorioEmpenhos
};
