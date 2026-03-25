import repository from '../core/repository.js';
import { initTheme, mountThemeToggle } from './themeManager.js';
import { scheduleVisualAuditRefresh } from './aiVisualAudit.js';

const SCREEN_LABELS = {
  homeScreen: 'Painel executivo',
  almoxarifadoScreen: 'Almoxarifado inteligente',
  empenhoScreen: 'Cadastro de empenho',
  entregaScreen: 'Entrada de entrega',
  notaFiscalScreen: 'Entrada de nota fiscal',
  relatoriosScreen: 'Relatórios operacionais',
  configScreen: 'Configurações do sistema',
  catalogacaoScreen: 'Pedidos de catalogação',
  consultasScreen: 'Inteligência de compras',
  patrimonioScreen: 'Gestão de patrimônio',
  veiculosScreen: 'Gestão de veículos',
  servicosInternosScreen: 'Serviços internos',
  contratosScreen: 'Gestão de contratos',
  solicitacaoAlmoxScreen: 'Solicitação de almoxarifado',
  solicitacaoVeiculosScreen: 'Solicitação de veículos',
  solicitacaoServicosScreen: 'Solicitação de serviços'
};

let initialized = false;

const STYLABLE_INPUT_TYPES = new Set([
  'text',
  'email',
  'number',
  'search',
  'tel',
  'url',
  'password',
  'date',
  'datetime-local',
  'month',
  'week',
  'time'
]);

function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function setTextContent(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function buildMetricCard({ label, value, detail, accent }) {
  return `
    <article class="dashboard-metric-card ${accent ? `is-${accent}` : ''}">
      <span class="dashboard-metric-label">${label}</span>
      <strong class="dashboard-metric-value">${value}</strong>
      <p class="dashboard-metric-detail">${detail}</p>
    </article>
  `;
}

function getCurrentLabel(app) {
  return SCREEN_LABELS[app?.currentScreen] || 'SINGEM';
}

function getUserSubtitle(app) {
  if (!app?.usuarioLogado) {
    return 'Sessão encerrada';
  }

  if (app.authProvider === 'govbr') {
    return 'Autenticação Gov.br';
  }

  return app.usuarioLogado.perfil === 'admin' ? 'Acesso administrativo' : 'Sessão institucional';
}

function updateHeaderMeta(app) {
  const sectionLabel = document.getElementById('currentSectionLabel');
  const userMeta = document.getElementById('usuarioLogadoPerfil');

  if (sectionLabel) {
    sectionLabel.textContent = getCurrentLabel(app);
  }

  if (userMeta) {
    userMeta.textContent = getUserSubtitle(app);
  }
}

function updateSidebarState(app) {
  document.querySelectorAll('[data-nav-screen]').forEach((button) => {
    const isActive = button.dataset.navScreen === app?.currentScreen;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-current', isActive ? 'page' : 'false');
  });
}

function updateSidebarBackdrop() {
  const backdrop = document.getElementById('sidebarBackdrop');
  if (!backdrop) {
    return;
  }

  const isMobile = window.innerWidth < 1280;
  const isCollapsed = document.body.classList.contains('sidebar-collapsed');
  const isAuthenticated = document.body.classList.contains('app-authenticated');
  const showBackdrop = isMobile && isAuthenticated && !isCollapsed;

  backdrop.classList.toggle('hidden', !showBackdrop);
  backdrop.setAttribute('aria-hidden', showBackdrop ? 'false' : 'true');
  document.body.classList.toggle('sidebar-open', showBackdrop);
}

function isStylableControl(control) {
  if (!control) {
    return false;
  }

  const tagName = control.tagName;
  if (tagName === 'SELECT' || tagName === 'TEXTAREA') {
    return true;
  }

  if (tagName !== 'INPUT') {
    return false;
  }

  const type = String(control.type || 'text').toLowerCase();
  if (type === 'hidden' || type === 'file' || type === 'checkbox' || type === 'radio' || type === 'range') {
    return false;
  }

  if (STYLABLE_INPUT_TYPES.has(type)) {
    return true;
  }

  return type === '';
}

function applyScreenStructure(root = document) {
  root.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.add('sg-screen-shell');

    const header = screen.querySelector('.screen-header');
    if (header) {
      header.classList.add('sg-screen-header');
    }

    const sections = screen.querySelectorAll(
      '.form-container, .panel, .card, .filters-section, .results-section, .pagination-section, .table-container'
    );

    sections.forEach((section, index) => {
      section.classList.add('sg-section-shell', 'sg-reveal');
      section.style.setProperty('--sg-reveal-order', String(index + 1));

      if (section.matches('.form-container') || section.querySelector('form')) {
        section.classList.add('sg-form-shell');
      }
    });
  });
}

function applyVisualStandards(root = document) {
  applyScreenStructure(root);

  root.querySelectorAll('table').forEach((table) => {
    table.classList.add('sg-table');
  });

  root
    .querySelectorAll(
      '.table-container, .almox-table-wrapper, .nf-items-wrap, .report-table-container, .pi-panel__table-wrapper'
    )
    .forEach((shell) => {
      shell.classList.add('sg-table-shell');
    });

  root.querySelectorAll('form').forEach((form) => {
    form.classList.add('sg-form-layout');
  });

  root.querySelectorAll('input, select, textarea').forEach((control) => {
    if (!isStylableControl(control)) {
      return;
    }

    if (control.tagName === 'SELECT') {
      control.classList.add('sg-select');
      return;
    }

    if (control.tagName === 'TEXTAREA') {
      control.classList.add('sg-textarea');
      return;
    }

    control.classList.add('sg-input');
  });
}

function bindSidebarActions(app) {
  document.querySelectorAll('[data-nav-screen]').forEach((button) => {
    if (button.dataset.bound === '1') {
      return;
    }

    button.dataset.bound = '1';
    button.addEventListener('click', () => {
      app.showScreen(button.dataset.navScreen);
      if (window.innerWidth < 1280) {
        document.body.classList.add('sidebar-collapsed');
      }
      updateSidebarBackdrop();
    });
  });

  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebarToggle && sidebarToggle.dataset.bound !== '1') {
    sidebarToggle.dataset.bound = '1';
    sidebarToggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      const isCollapsed = document.body.classList.contains('sidebar-collapsed');
      sidebarToggle.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
      updateSidebarBackdrop();
    });
  }

  const sidebarBackdrop = document.getElementById('sidebarBackdrop');
  if (sidebarBackdrop && sidebarBackdrop.dataset.bound !== '1') {
    sidebarBackdrop.dataset.bound = '1';
    sidebarBackdrop.addEventListener('click', () => {
      document.body.classList.add('sidebar-collapsed');
      updateSidebarBackdrop();
    });
  }

  if (document.body.dataset.sidebarKeyBound !== '1') {
    document.body.dataset.sidebarKeyBound = '1';
    window.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') {
        return;
      }

      if (!document.body.classList.contains('sidebar-collapsed')) {
        document.body.classList.add('sidebar-collapsed');
        updateSidebarBackdrop();
      }
    });
  }

  if (document.body.dataset.sidebarResizeBound !== '1') {
    document.body.dataset.sidebarResizeBound = '1';
    window.addEventListener('resize', () => {
      updateSidebarBackdrop();
    });
  }

  document.querySelectorAll('[data-nav-href]').forEach((link) => {
    if (link.dataset.bound === '1') {
      return;
    }

    link.dataset.bound = '1';
    link.addEventListener('click', () => {
      window.location.href = link.dataset.navHref;
    });
  });
}

function renderMetricsSkeleton(container) {
  container.innerHTML = `
    <article class="dashboard-metric-card is-loading">
      <span class="dashboard-metric-label">Empenhos</span>
      <strong class="dashboard-metric-value">--</strong>
      <p class="dashboard-metric-detail">Atualizando painel...</p>
    </article>
    <article class="dashboard-metric-card is-loading">
      <span class="dashboard-metric-label">Notas fiscais</span>
      <strong class="dashboard-metric-value">--</strong>
      <p class="dashboard-metric-detail">Buscando dados do período...</p>
    </article>
    <article class="dashboard-metric-card is-loading">
      <span class="dashboard-metric-label">Fornecedores</span>
      <strong class="dashboard-metric-value">--</strong>
      <p class="dashboard-metric-detail">Consolidando base ativa...</p>
    </article>
    <article class="dashboard-metric-card is-loading">
      <span class="dashboard-metric-label">Valor empenhado</span>
      <strong class="dashboard-metric-value">--</strong>
      <p class="dashboard-metric-detail">Calculando exposição total...</p>
    </article>
  `;
}

export async function updateDashboardMetrics(app) {
  const container = document.getElementById('dashboardMetrics');
  const subtitle = document.getElementById('dashboardSubtitle');

  if (!container || !app?.usuarioLogado) {
    return;
  }

  const requestId = String(Date.now());
  container.dataset.requestId = requestId;
  renderMetricsSkeleton(container);

  try {
    const [empenhos, notasFiscais, unidade] = await Promise.all([
      repository.listEmpenhos(false),
      repository.listNotasFiscais(),
      repository.getUnidade()
    ]);

    if (container.dataset.requestId !== requestId) {
      return;
    }

    const totalEmpenhos = empenhos.length;
    const validados = empenhos.filter((item) => item.statusValidacao === 'validado').length;
    const rascunhos = Math.max(0, totalEmpenhos - validados);
    const fornecedoresUnicos = new Set(
      empenhos
        .map((item) => item.fornecedor || item.fornecedorRazao || item.header?.fornecedorRazao || '')
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    ).size;
    const valorTotal = empenhos.reduce((sum, item) => {
      const amount = Number(item.valorTotalEmpenho || item.valorTotal || item.header?.valorTotalEmpenho || 0);
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    const unidadeNome = unidade?.razaoSocial || 'IF Baiano';
    const lastRefresh = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date());

    if (subtitle) {
      subtitle.textContent = `Base operacional de ${unidadeNome} com monitoramento contínuo dos fluxos críticos.`;
    }

    setTextContent('dashboardUnitHeading', `${unidadeNome} · central operacional`);
    setTextContent(
      'dashboardOperationalPulse',
      `${validados} empenho(s) validados, ${notasFiscais.length} nota(s) fiscal(is) registradas e ${fornecedoresUnicos} fornecedor(es) ativos no recorte local.`
    );
    setTextContent('dashboardValidatedCount', String(validados));
    setTextContent('dashboardDraftCount', String(rascunhos));
    setTextContent('dashboardSupplierActiveCount', String(fornecedoresUnicos));
    setTextContent('dashboardInvoiceCount', String(notasFiscais.length));
    setTextContent('dashboardLastRefresh', lastRefresh);

    container.innerHTML = [
      buildMetricCard({
        label: 'Empenhos',
        value: totalEmpenhos,
        detail: `${validados} validados e ${rascunhos} em rascunho`,
        accent: 'brand'
      }),
      buildMetricCard({
        label: 'Notas fiscais',
        value: notasFiscais.length,
        detail: 'Registros disponíveis para conferência e vínculo',
        accent: 'info'
      }),
      buildMetricCard({
        label: 'Fornecedores',
        value: fornecedoresUnicos,
        detail: 'Base ativa no recorte operacional atual',
        accent: 'success'
      }),
      buildMetricCard({
        label: 'Valor empenhado',
        value: formatCurrency(valorTotal),
        detail: 'Exposição financeira consolidada do painel',
        accent: 'warning'
      })
    ].join('');
    scheduleVisualAuditRefresh('homeScreen');
  } catch (error) {
    console.warn('[PremiumShell] Falha ao atualizar métricas:', error);
    setTextContent('dashboardUnitHeading', 'Painel institucional indisponível');
    setTextContent('dashboardOperationalPulse', 'Não foi possível consolidar o panorama operacional agora.');
    setTextContent('dashboardValidatedCount', '--');
    setTextContent('dashboardDraftCount', '--');
    setTextContent('dashboardSupplierActiveCount', '--');
    setTextContent('dashboardInvoiceCount', '--');
    setTextContent('dashboardLastRefresh', '--:--');
    container.innerHTML = `
      <article class="dashboard-metric-card is-error">
        <span class="dashboard-metric-label">Painel</span>
        <strong class="dashboard-metric-value">Indisponível</strong>
        <p class="dashboard-metric-detail">Não foi possível carregar as métricas agora.</p>
      </article>
    `;
    scheduleVisualAuditRefresh('homeScreen');
  }
}

export function refreshPremiumShell(app) {
  if (!initialized) {
    return;
  }

  const isAuthenticated = Boolean(app?.usuarioLogado) && app?.currentScreen !== 'loginScreen';
  const sidebar = document.getElementById('appSidebar');

  document.body.classList.toggle('app-authenticated', isAuthenticated);

  if (sidebar) {
    sidebar.classList.toggle('hidden', !isAuthenticated);
  }

  applyVisualStandards(document);

  updateHeaderMeta(app);
  bindSidebarActions(app);
  updateSidebarState(app);
  updateSidebarBackdrop();

  if (isAuthenticated && app?.currentScreen === 'homeScreen') {
    updateDashboardMetrics(app);
  }
}

export function initPremiumShell(app) {
  if (initialized) {
    refreshPremiumShell(app);
    return;
  }

  initTheme();
  bindSidebarActions(app);
  mountThemeToggle(document.getElementById('themeToggle'), { showLabel: false });

  if (window.innerWidth < 1280) {
    document.body.classList.add('sidebar-collapsed');
  }

  initialized = true;
  refreshPremiumShell(app);
}
