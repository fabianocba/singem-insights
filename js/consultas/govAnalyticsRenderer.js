import { escapeHTML as escapeHtml } from '../utils/sanitize.js';

function toNumber(value, fallback = null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value, fractionDigits = 0) {
  const amount = toNumber(value, null);
  if (amount === null) {
    return '0';
  }

  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

function formatCurrency(value) {
  const amount = toNumber(value, null);
  if (amount === null) {
    return 'R$ 0,00';
  }

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function buildMetricCards(dataset, response) {
  const metrics = response?.metrics || {};
  const cards =
    dataset === 'fornecedor'
      ? [
          ['Perfis', formatNumber(metrics.totalProfiles)],
          ['Ativos', formatNumber(metrics.activeProfiles)],
          ['Duplicidades', formatNumber(metrics.duplicateGroups)],
          ['Precos relacionados', formatNumber(metrics.relatedPriceRecords)]
        ]
      : [
          ['Perfis', formatNumber(metrics.totalProfiles)],
          ['Ativos', formatNumber(metrics.activeProfiles)],
          ['Uso SISG', formatNumber(metrics.usingSisg)],
          ['Precos relacionados', formatNumber(metrics.relatedPriceRecords)]
        ];

  return `
    <section class="pi-layout pi-layout--two">
      ${cards
        .map(
          ([label, value]) => `
            <article class="pi-metric-card">
              <span class="pi-metric-card__label">${escapeHtml(label)}</span>
              <strong class="pi-metric-card__value">${escapeHtml(value)}</strong>
            </article>
          `
        )
        .join('')}
    </section>
  `;
}

function buildRelatedPanel(response) {
  const related = response?.integratedPanel?.relatedPriceSummary;
  if (!related) {
    return '';
  }

  return `
    <section class="pi-card" aria-label="Contexto relacionado de preco">
      <header class="pi-card__header">
        <div>
          <h5 class="pi-card__title">Contexto relacionado de preços</h5>
          <p class="pi-card__subtitle">Cruza o perfil atual com o historico premium de compras publicas.</p>
        </div>
      </header>
      <div class="pi-card__body">
        <div class="pi-layout pi-layout--two">
          <article class="pi-metric-card">
            <span class="pi-metric-card__label">Registros</span>
            <strong class="pi-metric-card__value">${escapeHtml(formatNumber(related.totalRegistros))}</strong>
          </article>
          <article class="pi-metric-card">
            <span class="pi-metric-card__label">Compras</span>
            <strong class="pi-metric-card__value">${escapeHtml(formatNumber(related.totalCompras))}</strong>
          </article>
          <article class="pi-metric-card">
            <span class="pi-metric-card__label">Preco medio</span>
            <strong class="pi-metric-card__value">${escapeHtml(formatCurrency(related.precoMedio))}</strong>
          </article>
          <article class="pi-metric-card">
            <span class="pi-metric-card__label">Valor estimado</span>
            <strong class="pi-metric-card__value">${escapeHtml(formatCurrency(related.valorTotalEstimado))}</strong>
          </article>
        </div>
      </div>
    </section>
  `;
}

function buildConnectionsList(title, rows = [], itemResolver) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return '';
  }

  return `
    <section class="pi-card" aria-label="${escapeHtml(title)}">
      <header class="pi-card__header">
        <div>
          <h5 class="pi-card__title">${escapeHtml(title)}</h5>
        </div>
      </header>
      <div class="pi-card__body">
        <ul class="pi-check-list">
          ${rows
            .slice(0, 6)
            .map((row) => `<li>${escapeHtml(itemResolver(row))}</li>`)
            .join('')}
        </ul>
      </div>
    </section>
  `;
}

function buildInsights(response) {
  const insights = Array.isArray(response?.insights) ? response.insights : [];
  if (!insights.length) {
    return '';
  }

  return `
    <section class="pi-card" aria-label="Insights analiticos">
      <header class="pi-card__header">
        <div>
          <h5 class="pi-card__title">Insights</h5>
          <p class="pi-card__subtitle">Leitura automatica do recorte atual.</p>
        </div>
      </header>
      <div class="pi-card__body">
        <ul class="pi-check-list">
          ${insights.map((insight) => `<li>${escapeHtml(String(insight?.text || insight || ''))}</li>`).join('')}
        </ul>
      </div>
    </section>
  `;
}

export function renderGovAnalyticsPanel(response, dataset) {
  if (!response || (dataset !== 'fornecedor' && dataset !== 'uasg')) {
    return '';
  }

  const title = dataset === 'fornecedor' ? 'Painel analitico de fornecedor' : 'Painel analitico de UASG / Orgao';
  const subtitle = response?.summary?.text || 'Sem resumo analitico disponivel para este recorte.';
  const supplierConnections = response?.integratedPanel?.linkedSuppliers || [];
  const buyerConnections = response?.integratedPanel?.linkedBuyers || [];

  return `
    <div class="pi-dashboard pi-dashboard--compact">
      <section class="pi-card" aria-label="Resumo executivo">
        <header class="pi-card__header">
          <div>
            <h4 class="pi-card__title">${escapeHtml(title)}</h4>
            <p class="pi-card__subtitle">${escapeHtml(subtitle)}</p>
          </div>
        </header>
      </section>
      ${buildMetricCards(dataset, response)}
      ${buildRelatedPanel(response)}
      <section class="pi-layout pi-layout--two">
        ${buildConnectionsList(
          dataset === 'fornecedor' ? 'Principais compradores conectados' : 'Principais fornecedores conectados',
          dataset === 'fornecedor' ? buyerConnections : supplierConnections,
          (row) => {
            if (dataset === 'fornecedor') {
              return `${row.codigoUasg || row.codigoOrgao || '-'} - ${row.nomeUasg || row.orgao || 'Perfil institucional'}`;
            }

            return `${row.cnpjCpf || row.niFornecedor || '-'} - ${row.nomeFornecedor || row.nome || 'Fornecedor'}`;
          }
        )}
        ${buildInsights(response)}
      </section>
    </div>
  `;
}
