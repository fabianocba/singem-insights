import { handleAiAvailabilityError, isAiAvailable } from '../aiIntegration.js';
import apiClient from '../services/apiClient.js';
import { escapeHTML as escapeHtml } from '../utils/sanitize.js';

const DEFAULT_REFRESH_DELAY_MS = 240;
const scopeTimers = new Map();

let initialized = false;

function queryAll(root, selector) {
  if (!root) {
    return [];
  }

  return Array.from(root.querySelectorAll(selector));
}

function count(root, selector) {
  return queryAll(root, selector).length;
}

function resolveAuditContainers(scope) {
  const containers = queryAll(document, '[data-ai-visual-audit]');
  if (!scope) {
    return containers;
  }

  return containers.filter((container) => container.dataset.aiVisualAudit === scope);
}

function resolveRoot(container) {
  const rootSelector = String(container?.dataset?.aiAuditRoot || '').trim();
  if (rootSelector) {
    const explicitRoot = document.querySelector(rootSelector);
    if (explicitRoot) {
      return explicitRoot;
    }
  }

  return (
    container.closest('.screen, .consultas-container, .settings-container, .backup-container, .status-page') ||
    document.body
  );
}

function collectMetrics(root, container) {
  const cardCount = count(
    root,
    '.dashboard-metric-card, .dashboard-panel, .menu-item, .menu-item-consulta, .report-card, .login-card, .sg-card, .form-container, .panel, .card'
  );
  const buttonCount = count(root, 'button, a.btn, [role="button"]');
  const formCount = count(root, 'form');
  const inputCount = count(root, 'input, select, textarea');
  const tableCount = count(root, 'table');
  const rowCount = count(root, 'tbody tr');
  const badgeCount = count(root, '.badge, .badge-status, .sg-badge, .ai-assist-chip, .sg-ai-pill');
  const alertCount = count(root, '.alert, .sg-alert, .status-message, .login-error, .error-box, .ai-report-panel');
  const modalCount = count(root, '.modal, .modal-card, .modal-content, dialog');
  const aiWidgetCount = count(root, '.ai-assist-card, .ai-report-panel, [data-ai-visual-audit-widget]');
  const visibleAiWidgetCount = count(
    root,
    '.ai-assist-card:not(.hidden), .ai-report-panel:not(.hidden), [data-ai-visual-audit-widget]:not(.hidden)'
  );
  const commandClusterCount = count(root, '.sg-command-cluster, .sg-toolbar, .dashboard-hero__actions, .form-actions');
  const inlineHandlerCount = count(root, '[onclick], [onerror], [onchange], [oninput], [onsubmit]');
  const inlineStyleCount = count(root, '[style]');
  const loadingMetricCount = queryAll(root, '.dashboard-metric-value').filter(
    (node) => String(node.textContent || '').trim() === '--'
  ).length;

  return {
    escopo: String(container?.dataset?.aiAuditLabel || container?.dataset?.aiVisualAudit || 'interface').trim(),
    total_componentes: cardCount + buttonCount + formCount + tableCount,
    total_cards: cardCount,
    total_botoes: buttonCount,
    total_formularios: formCount,
    total_campos: inputCount,
    total_tabelas: tableCount,
    total_linhas_tabela: rowCount,
    total_badges: badgeCount,
    total_alertas: alertCount,
    total_modais: modalCount,
    total_widgets_ia: aiWidgetCount,
    total_widgets_ia_visiveis: visibleAiWidgetCount,
    total_clusters_acao: commandClusterCount,
    alerta_handlers_inline: inlineHandlerCount,
    alerta_styles_inline: inlineStyleCount,
    alerta_metricas_carregando: loadingMetricCount,
    anomalia_densidade_acoes: Math.round((buttonCount / Math.max(cardCount, 1)) * 100),
    anomalia_densidade_campos: Math.round((inputCount / Math.max(formCount, 1)) * 100),
    anomalia_tabelas_sem_resultado: tableCount > 0 && rowCount === 0 ? tableCount : 0,
    anomalia_superficie_sem_ia: aiWidgetCount === 0 ? 1 : 0
  };
}

function buildPayload(container, metrics, forceRefresh) {
  const reportKey = String(
    container?.dataset?.aiAuditReportKey || `frontend_visual_${container?.dataset?.aiVisualAudit || 'page'}`
  ).trim();

  return {
    report_key: reportKey,
    context_module: String(container?.dataset?.aiAuditContextModule || 'frontend_visual').trim(),
    data: metrics,
    force_refresh: forceRefresh === true
  };
}

function buildLocalSummary(metrics) {
  const inlineDebt = Number(metrics.alerta_handlers_inline || 0) + Number(metrics.alerta_styles_inline || 0);
  const debtLabel =
    inlineDebt > 0
      ? `${inlineDebt} ponto(s) de divida inline ainda permanecem ativos.`
      : 'Nao ha divida inline relevante na superficie atual.';

  return (
    `A superficie ${String(metrics.escopo || 'atual').toLowerCase()} combina ` +
    `${metrics.total_cards} bloco(s), ${metrics.total_botoes} acao(oes) e ${metrics.total_formularios} formulario(s). ` +
    `${debtLabel}`
  );
}

function buildLocalInsights(metrics) {
  return [
    `${metrics.total_componentes} componente(s) principais mapeados no estado atual.`,
    `${metrics.total_campos} campo(s) e ${metrics.total_tabelas} tabela(s) compoem a superficie ativa.`,
    `${metrics.total_widgets_ia_visiveis || metrics.total_widgets_ia} ponto(s) de IA estao expostos nesta experiencia.`
  ];
}

function buildLocalAlerts(metrics) {
  const alerts = [];

  if (metrics.alerta_handlers_inline > 0) {
    alerts.push(`${metrics.alerta_handlers_inline} handler(s) inline ainda dependem de migracao.`);
  }

  if (metrics.alerta_styles_inline > 0) {
    alerts.push(`${metrics.alerta_styles_inline} estilo(s) inline ainda foram detectados.`);
  }

  if (metrics.alerta_metricas_carregando > 0) {
    alerts.push(`${metrics.alerta_metricas_carregando} indicador(es) ainda estao em estado de carregamento.`);
  }

  return alerts;
}

function buildLocalAnomalies(metrics) {
  const anomalies = [];

  if (metrics.anomalia_tabelas_sem_resultado > 0) {
    anomalies.push('Ha tabela(s) renderizada(s) sem linhas no estado atual.');
  }

  if (metrics.anomalia_superficie_sem_ia > 0) {
    anomalies.push('A superficie ainda nao exibe widgets conectados ao IA Core.');
  }

  if (metrics.anomalia_densidade_acoes >= 300) {
    anomalies.push('A concentracao de acoes por bloco esta acima do padrao recomendado.');
  }

  return anomalies;
}

function renderList(items, emptyText) {
  if (!Array.isArray(items) || items.length === 0) {
    return `<p class="sg-ai-audit__empty">${escapeHtml(emptyText)}</p>`;
  }

  return `<ul class="sg-ai-audit__list">${items.map((item) => `<li>${escapeHtml(String(item || ''))}</li>`).join('')}</ul>`;
}

function renderMetrics(metrics) {
  const entries = [
    ['Componentes', metrics.total_componentes],
    ['Campos', metrics.total_campos],
    ['Tabelas', metrics.total_tabelas],
    ['Divida inline', Number(metrics.alerta_handlers_inline || 0) + Number(metrics.alerta_styles_inline || 0)]
  ];

  return entries
    .map(
      ([label, value]) => `
        <article class="sg-ai-audit__metric">
          <span>${escapeHtml(String(label))}</span>
          <strong>${escapeHtml(String(value))}</strong>
        </article>
      `
    )
    .join('');
}

function bindRefreshAction(container, scope) {
  container.querySelector('[data-ai-audit-action="refresh"]')?.addEventListener('click', () => {
    refreshVisualAudit(scope, { forceRefresh: true }).catch(() => {});
  });
}

function renderAudit(container, scope, model) {
  const confidenceText =
    Number.isFinite(Number(model.confidence)) && Number(model.confidence) > 0
      ? `Confianca ${Math.round(Number(model.confidence) * 100)}%`
      : '';

  const pills = [
    `<span class="sg-ai-pill">${escapeHtml(model.sourceLabel)}</span>`,
    model.modeLabel ? `<span class="sg-ai-pill is-muted">${escapeHtml(model.modeLabel)}</span>` : '',
    confidenceText ? `<span class="sg-ai-pill is-score">${escapeHtml(confidenceText)}</span>` : ''
  ]
    .filter(Boolean)
    .join('');

  container.innerHTML = `
    <div class="sg-ai-audit__header">
      <div>
        <h4 class="sg-ai-audit__title">${escapeHtml(model.title)}</h4>
        <p class="sg-ai-audit__meta">${escapeHtml(model.subtitle)}</p>
      </div>
      <div class="sg-ai-audit__status">
        ${pills}
        <button type="button" class="btn btn-outline btn-sm" data-ai-audit-action="refresh">Atualizar</button>
      </div>
    </div>
    <p class="sg-ai-audit__summary">${escapeHtml(model.summary)}</p>
    <div class="sg-ai-audit__metrics">${renderMetrics(model.metrics)}</div>
    <div class="sg-ai-audit__grid">
      <section class="sg-ai-audit__section">
        <h5>Indicadores</h5>
        ${renderList(model.insights, 'Sem indicadores complementares para esta tela.')}
      </section>
      <section class="sg-ai-audit__section">
        <h5>Alertas</h5>
        ${renderList(model.alerts, 'Nenhum alerta prioritario no estado atual.')}
      </section>
      <section class="sg-ai-audit__section">
        <h5>Anomalias</h5>
        ${renderList(model.anomalies, 'Nenhuma anomalia relevante foi detectada.')}
      </section>
    </div>
  `;
  container.classList.remove('hidden');
  bindRefreshAction(container, scope);
}

function renderLoading(container, title, subtitle) {
  container.innerHTML = `
    <div class="sg-ai-audit__header">
      <div>
        <h4 class="sg-ai-audit__title">${escapeHtml(title)}</h4>
        <p class="sg-ai-audit__meta">${escapeHtml(subtitle)}</p>
      </div>
      <div class="sg-ai-audit__status">
        <span class="sg-ai-pill">IA</span>
        <span class="sg-ai-pill is-muted">Processando</span>
      </div>
    </div>
    <p class="sg-ai-audit__summary">Analisando a estrutura visual e os sinais da interface atual.</p>
  `;
  container.classList.remove('hidden');
}

async function refreshAuditContainer(container, { forceRefresh = false } = {}) {
  const root = resolveRoot(container);
  if (!root) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const scope = String(container.dataset.aiVisualAudit || '').trim();
  const title = String(container.dataset.aiAuditTitle || 'Radar IA da Interface').trim();
  const metrics = collectMetrics(root, container);
  const subtitle = String(
    container.dataset.aiAuditSubtitle || `${metrics.escopo} · ${metrics.total_componentes} componente(s) mapeado(s)`
  ).trim();
  const payload = buildPayload(container, metrics, forceRefresh);
  const signature = JSON.stringify(payload);

  if (
    !forceRefresh &&
    container.dataset.aiAuditSignature === signature &&
    container.dataset.aiAuditRendered === '1' &&
    container.dataset.aiAuditMode === 'remote'
  ) {
    return;
  }

  renderLoading(container, title, subtitle);

  try {
    const available = await isAiAvailable({ forceRefresh: forceRefresh === true });

    if (!available) {
      renderAudit(container, scope, {
        title,
        subtitle,
        summary: buildLocalSummary(metrics),
        insights: buildLocalInsights(metrics),
        alerts: buildLocalAlerts(metrics),
        anomalies: buildLocalAnomalies(metrics),
        sourceLabel: 'Local',
        modeLabel: 'IA indisponivel',
        confidence: 0,
        metrics
      });
      container.dataset.aiAuditSignature = signature;
      container.dataset.aiAuditRendered = '1';
      container.dataset.aiAuditMode = 'local';
      return;
    }

    const response = await apiClient.ai.reportSummary(payload);

    renderAudit(container, scope, {
      title,
      subtitle,
      summary: String(response?.summary || buildLocalSummary(metrics)),
      insights:
        Array.isArray(response?.insights) && response.insights.length ? response.insights : buildLocalInsights(metrics),
      alerts: Array.isArray(response?.alerts) ? response.alerts : buildLocalAlerts(metrics),
      anomalies: Array.isArray(response?.anomalies) ? response.anomalies : buildLocalAnomalies(metrics),
      sourceLabel: 'IA Core',
      modeLabel: response?.cached ? 'Cache' : 'Atual',
      confidence: response?.confidence,
      metrics
    });
    container.dataset.aiAuditSignature = signature;
    container.dataset.aiAuditRendered = '1';
    container.dataset.aiAuditMode = 'remote';
  } catch (error) {
    handleAiAvailabilityError(error);
    renderAudit(container, scope, {
      title,
      subtitle,
      summary: buildLocalSummary(metrics),
      insights: buildLocalInsights(metrics),
      alerts: buildLocalAlerts(metrics),
      anomalies: buildLocalAnomalies(metrics),
      sourceLabel: 'Local',
      modeLabel: 'Fallback',
      confidence: 0,
      metrics
    });
    container.dataset.aiAuditSignature = signature;
    container.dataset.aiAuditRendered = '1';
    container.dataset.aiAuditMode = 'local';
  }
}

export function initVisualAudits() {
  if (initialized) {
    return;
  }

  initialized = true;
}

export async function refreshVisualAudit(scope, { forceRefresh = false } = {}) {
  initVisualAudits();

  const containers = resolveAuditContainers(scope);
  if (!containers.length) {
    return;
  }

  await Promise.allSettled(containers.map((container) => refreshAuditContainer(container, { forceRefresh })));
}

export function scheduleVisualAuditRefresh(scope, { forceRefresh = false, delay = DEFAULT_REFRESH_DELAY_MS } = {}) {
  initVisualAudits();

  const timerKey = scope || '*';
  const currentTimer = scopeTimers.get(timerKey);
  if (currentTimer) {
    clearTimeout(currentTimer);
  }

  const nextTimer = setTimeout(() => {
    scopeTimers.delete(timerKey);
    refreshVisualAudit(scope, { forceRefresh }).catch(() => {});
  }, delay);

  scopeTimers.set(timerKey, nextTimer);
}
