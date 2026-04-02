/**
 * Módulo de Relatórios e Controle de Saldos
 * Extraído de js/app.js — Fase 2 da modularização
 *
 * Todas as funções aceitam `app` (instância de ControleMaterialApp) como
 * primeiro argumento quando precisam de métodos de UI da classe.
 */

import * as dbGateway from '../../core/dbGateway.js';
import * as RelatoriosStatus from './relatoriosStatus.js';
import * as RelatoriosPresentation from './relatoriosPresentation.js';
import * as RelatoriosSaldos from './relatoriosSaldos.js';

// ============================================================================
// GERAÇÃO DE RELATÓRIOS
// ============================================================================

/**
 * Gera relatório pelo tipo solicitado
 * @param {object} app - Instância de ControleMaterialApp
 * @param {string} tipo - Tipo de relatório
 */
export async function gerarRelatorio(app, tipo) {
  try {
    app.showLoading('Gerando relatório...');

    let dados = null;
    let titulo = '';

    switch (tipo) {
      case 'conferencia':
        titulo = 'Relatório de Conferência';
        // TODO: Implementar lógica específica
        break;

      case 'saldos':
        titulo = 'Controle de Saldos de Empenhos';
        await RelatoriosSaldos.exibirControleSaldos(app);
        return; // Usa visualização customizada

      case 'empenhos':
        titulo = 'Relatório de Empenhos';
        // buscarEmpenhos() agora já retorna apenas empenhos ativos
        dados = await dbGateway.buscarEmpenhos();
        break;

      case 'entregas':
        titulo = 'Relatório de Entregas';
        dados = await dbGateway.invokeIfAvailable('buscarEntregas');
        break;

      case 'divergencias':
        titulo = 'Relatório de Divergências';
        // TODO: Implementar lógica específica
        break;
    }

    RelatoriosPresentation.exibirRelatorio(titulo, dados);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    app.showError('Erro ao gerar relatório: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

// ============================================================================
// CONTROLE DE SALDOS
// ============================================================================

/**
 * Exibe o controle de saldos de empenhos (formato planilha)
 * @param {object} app - Instância de ControleMaterialApp
 */
export async function exibirControleSaldos(app) {
  return RelatoriosSaldos.exibirControleSaldos(app);
}

/**
 * Carrega o controle de saldos na aba dedicada da tela principal
 * @param {object} app - Instância de ControleMaterialApp
 */
export async function carregarControleSaldosTab(app) {
  return RelatoriosSaldos.carregarControleSaldosTab(app);
}

/**
 * Carrega e exibe o saldo detalhado de um empenho específico
 * @param {object} app - Instância de ControleMaterialApp
 * @param {number} empenhoId - ID do empenho
 * @param {HTMLElement|null} container - Container opcional para o resultado
 */
export async function carregarSaldoEmpenho(app, empenhoId, container = null) {
  return RelatoriosSaldos.carregarSaldoEmpenho(app, empenhoId, container);
}

// ============================================================================
// HELPERS DE STATUS — funções puras
// ============================================================================

/**
 * Retorna cor do status geral de saldo
 * @param {string} status
 */
export const getStatusColor = RelatoriosStatus.getStatusColor;

/**
 * Retorna label traduzida do status
 * @param {string} status
 */
export const getStatusLabel = RelatoriosStatus.getStatusLabel;

/**
 * Retorna cor do status do saldo do item
 * @param {string} status
 */
export const getSaldoStatusColor = RelatoriosStatus.getSaldoStatusColor;

// ============================================================================
// EXIBIÇÃO DE RELATÓRIO GENÉRICO
// ============================================================================

/**
 * Exibe relatório na tela (função pura, sem dependência de `app`)
 * @param {string} titulo
 * @param {Array|null} dados
 */
export const exibirRelatorio = RelatoriosPresentation.exibirRelatorio;

// ============================================================================
// EXPORTAÇÃO E FILTROS
// ============================================================================

/**
 * Exportar relatório em PDF
 * @param {object} app
 */
export const exportarRelatorioPDF = RelatoriosPresentation.exportarRelatorioPDF;

/**
 * Exportar relatório em CSV
 * @param {object} app
 */
export const exportarRelatorioCSV = RelatoriosPresentation.exportarRelatorioCSV;

/**
 * Aplicar filtros no relatório (stub)
 */
export const aplicarFiltrosRelatorio = RelatoriosPresentation.aplicarFiltrosRelatorio;

// ============================================================================
// ESTATÍSTICAS DE ARQUIVOS
// ============================================================================

/**
 * Mostra estatísticas de arquivos
 * @param {object} app
 */
export const mostrarEstatisticasArquivos = RelatoriosPresentation.mostrarEstatisticasArquivos;

/**
 * Atualiza estatísticas de arquivos se o painel estiver visível
 * @param {object} app
 */
export const atualizarEstatisticasArquivos = RelatoriosPresentation.atualizarEstatisticasArquivos;
