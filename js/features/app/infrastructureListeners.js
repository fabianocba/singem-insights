/**
 * Módulo de Listeners de Infraestrutura Enterprise
 * Extraído de js/app.js — Fase 3 da modularização
 *
 * Conecta eventos do eventBus com a UI e o fluxo existente da aplicação.
 */

import * as eventBus from '../../core/eventBus.js';
import * as feedback from '../../ui/feedback.js';

/**
 * Configura todos os event listeners da nova infraestrutura Enterprise
 * @param {object} app - Instância de ControleMaterialApp
 */
export function setupInfrastructureListeners(app) {
  console.log('[App] Configurando event listeners da nova infraestrutura...');

  // ========================================================================
  // EVENTOS DE PDF PARSING
  // ========================================================================
  eventBus.on('pdf.parse:start', (event) => {
    console.log('[App] Parse de PDF iniciado:', event.detail);
    feedback.showLoading('📄 Processando PDF...');
  });

  eventBus.on('pdf.parse:done', (event) => {
    console.log('[App] Parse de PDF concluído:', event.detail);
    feedback.hideLoading();
    feedback.notifySuccess('✅ PDF processado com sucesso!');

    // Atualizar listas se necessário
    if (event.detail.tipoDocumento === 'empenho') {
      app.carregarEmpenhosSelect().catch((err) => console.error('Erro ao recarregar empenhos:', err));
    }
  });

  eventBus.on('pdf.parse:error', (event) => {
    console.error('[App] Erro ao processar PDF:', event.detail);
    feedback.hideLoading();
    feedback.notifyError(`❌ Erro ao processar PDF: ${event.detail.message || 'Erro desconhecido'}`);
  });

  // ========================================================================
  // EVENTOS DE SALVAMENTO
  // ========================================================================
  eventBus.on('ne.salva', (event) => {
    console.log('[App] Empenho salvo:', event.detail);
    feedback.notifySuccess(`✅ Empenho ${event.detail.numero} salvo com sucesso!`);

    // Atualizar dropdowns
    app.carregarEmpenhosSelect().catch((err) => console.error('Erro ao recarregar empenhos:', err));
  });

  eventBus.on('nf.salva', (event) => {
    console.log('[App] Nota fiscal salva:', event.detail);
    feedback.notifySuccess(`✅ Nota Fiscal ${event.detail.numero} salva com sucesso!`);

    // Atualizar listas se estiver na tela de comparação
    if (app.currentScreen === 'comparacaoScreen') {
      app.carregarNotasFiscaisComparacao().catch((err) => console.error('Erro ao recarregar notas fiscais:', err));
    }
  });

  // ========================================================================
  // EVENTOS DE FILA ASSÍNCRONA
  // ========================================================================
  eventBus.on('queue.task:start', (event) => {
    console.log('[App] Tarefa iniciada na fila:', event.detail);
    feedback.notifyInfo(`⚙️ Processando tarefa ${event.detail.tipo}...`);
  });

  eventBus.on('queue.task:done', (event) => {
    console.log('[App] Tarefa concluída:', event.detail);
    feedback.notifySuccess(`✅ Tarefa ${event.detail.tipo} concluída!`);
  });

  eventBus.on('queue.task:error', (event) => {
    console.error('[App] Erro em tarefa da fila:', event.detail);
    feedback.notifyError(`❌ Erro na tarefa ${event.detail.tipo}: ${event.detail.error}`);
  });

  // ========================================================================
  // EVENTOS DE RELATÓRIOS
  // ========================================================================
  eventBus.on('relatorio.gerar:start', (event) => {
    console.log('[App] Geração de relatório iniciada:', event.detail);
    feedback.showLoading('📊 Gerando relatório...');
  });

  eventBus.on('relatorio.gerar:done', (event) => {
    console.log('[App] Relatório gerado:', event.detail);
    feedback.hideLoading();
    feedback.notifySuccess('✅ Relatório gerado com sucesso!');
  });

  eventBus.on('relatorio.gerar:error', (event) => {
    console.error('[App] Erro ao gerar relatório:', event.detail);
    feedback.hideLoading();
    feedback.notifyError(`❌ Erro ao gerar relatório: ${event.detail.message}`);
  });

  // ========================================================================
  // EVENTOS DE SALDO
  // ========================================================================
  eventBus.on('saldo.atualizado', (event) => {
    console.log('[App] Saldo atualizado:', event.detail);
    feedback.notifySuccess('✅ Saldo atualizado!');

    // Recarregar controle de saldos se estiver naquela aba
    const tabControleSaldos = document.getElementById('tabControleSaldos');
    if (tabControleSaldos && tabControleSaldos.classList.contains('active')) {
      app.carregarControleSaldos().catch((err) => console.error('Erro ao recarregar controle de saldos:', err));
    }
  });

  console.log('[App] ✅ Event listeners configurados com sucesso');
}
