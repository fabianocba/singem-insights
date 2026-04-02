import * as CatalogacaoTela from '../../catalogacaoTela.js';
import { refreshPremiumShell } from '../../ui/premiumShell.js';

/**
 * Navega para uma tela específica, controlando autenticação, classes CSS,
 * ativação de features e atualização de navegação.
 * @param {object} app - instância de ControleMaterialApp
 * @param {string} screenId - ID da tela destino
 */
export function showScreen(app, screenId) {
  // Verifica autenticação (exceto para tela de login)
  if (screenId !== 'loginScreen' && !app.usuarioLogado) {
    screenId = 'loginScreen';
  }

  // Esconde todas as telas via classes utilitárias (evita conflito de inline style)
  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.remove('active');
    screen.classList.add('hidden');
    screen.setAttribute('aria-hidden', 'true');
  });

  // Mostra a tela solicitada
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('active');
    targetScreen.setAttribute('aria-hidden', 'false');
    app.currentScreen = screenId;

    // Inicializa módulo de consultas quando a tela for aberta
    if (screenId === 'consultasScreen' && typeof window.initConsultas === 'function') {
      window.initConsultas();
    }

    // Inicializa tela de pedidos de catalogação CATMAT
    if (screenId === 'catalogacaoScreen') {
      CatalogacaoTela.initTelaCatalogacao('catalogacaoPedidosContainer');
    }

    if (screenId === 'almoxarifadoScreen') {
      app.features.almoxarifado?.activate().catch((error) => {
        console.error('[showScreen] Erro ao abrir almoxarifado:', error);
        app.showError('Erro ao abrir o módulo de almoxarifado: ' + error.message, error);
      });
    }

    // Carrega empenhos no select quando entra na tela de Nota Fiscal
    if (screenId === 'notaFiscalScreen') {
      app
        .carregarEmpenhosSelect()
        .catch((err) => console.error('[showScreen] Erro ao carregar empenhos para NF:', err));
    }
  }

  // Controla visibilidade do header
  const header = document.getElementById('mainHeader');
  if (header) {
    if (screenId === 'loginScreen') {
      header.classList.add('hidden');
    } else {
      header.classList.remove('hidden');
    }
  }

  // Atualiza navegação
  document.querySelectorAll('.nav-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  if (screenId === 'homeScreen') {
    document.getElementById('btnHome')?.classList.add('active');
  } else if (screenId === 'configScreen') {
    document.getElementById('btnConfig')?.classList.add('active');
  }

  document.body.dataset.currentScreen = screenId;
  refreshPremiumShell(app);
}
