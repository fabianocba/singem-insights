/**
 * Renderizador executivo do Módulo 3 - Inteligencia de Precos Publicos.
 */

const TABLE_PAGE_SIZE_OPTIONS = [10, 15, 25, 50, 100];

const DEFAULT_DASHBOARD_STATE = Object.freeze({
  tableSortBy: 'dataCompra',
  tableSortDir: 'desc',
  tableQuickFilter: '',
  tablePage: 1,
  tablePageSize: 15,
  supplierCriterion: 'frequency'
});

const SUPPLIER_CRITERIA = {
  frequency: {
    label: 'Frequencia de registros',
    valueLabel: 'registro(s)',
    rowLabel: (entry) => entry.nomeFornecedor,
    rowValue: (entry) => toNumber(entry.totalRegistros, 0)
  },
  quantity: {
    label: 'Quantidade comprada',
    valueLabel: 'unidade(s)',
    rowLabel: (entry) => entry.nomeFornecedor,
    rowValue: (entry) => toNumber(entry.totalQuantidade, 0)
  },
  participation: {
    label: 'Participacao no volume',
    valueLabel: '%',
    rowLabel: (entry) => entry.nomeFornecedor,
    rowValue: (entry) => toNumber(entry.participacaoPercentual, 0)
  }
};

const SORTABLE_COLUMNS = {
  dataCompra: 'Data',
  codigo: 'CATMAT/CATSER',
  descricao: 'Descricao',
  quantidade: 'Quantidade',
  preco: 'Preco Unitario',
  fornecedor: 'Fornecedor',
  marca: 'Marca',
  uasg: 'UASG',
  orgao: 'Orgao',
  estado: 'UF',
  modalidade: 'Modalidade',
  idItemCompra: 'ID Item Compra'
};

function clamp(value, min, max, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(min, Math.min(parsed, max));
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toNumber(value, fallback = null) {
  if (value === null || value === undefined || value === '') {
    return fallback;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) {
      return fallback;
    }

    const normalized = text.includes(',') ? text.replace(/\./g, '').replace(',', '.') : text;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toInteger(value, fallback = null) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
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

function formatPercent(value, fractionDigits = 1) {
  const amount = toNumber(value, null);
  if (amount === null) {
    return '-';
  }

  return `${amount.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  })}%`;
}

function normalizeDateOnly(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  if (!text) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [day, month, year] = text.split('/');
    return `${year}-${month}-${day}`;
  }

  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString().slice(0, 10);
}

function formatDateBr(value) {
  const isoDate = normalizeDateOnly(value);
  if (!isoDate) {
    return '-';
  }

  try {
    const date = new Date(`${isoDate}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return '-';
  }
}

function formatPeriodLabel(periodValue) {
  const period = String(periodValue || '').trim();
  if (!period) {
    return '-';
  }

  if (/^\d{4}-\d{2}$/.test(period)) {
    const [year, month] = period.split('-');
    return `${month}/${year}`;
  }

  if (/^\d{4}-T[1-4]$/i.test(period)) {
    const [year, quarter] = period.split('-T');
    return `${quarter}T/${year}`;
  }

  if (/^\d{4}$/.test(period)) {
    return period;
  }

  return period;
}

function getCacheSourceLabel(cacheSource) {
  const source = normalizeText(cacheSource);

  if (source === 'upstream') {
    return 'Fonte oficial em tempo real';
  }

  if (source === 'database') {
    return 'Cache corporativo validado';
  }

  if (source === 'memory') {
    return 'Cache de memoria da sessao';
  }

  return 'Origem nao identificada';
}

function getPeriodSummary(query) {
  const dateStart = query?.dateStart;
  const dateEnd = query?.dateEnd;

  if (dateStart || dateEnd) {
    return `${formatDateBr(dateStart)} ate ${formatDateBr(dateEnd)}`;
  }

  if (query?.period) {
    const period = String(query.period).toUpperCase();
    return `Recorte rapido: ${period}`;
  }

  return 'Sem restricao temporal definida';
}

function getStatusTone(cacheSource) {
  const source = normalizeText(cacheSource);
  if (source === 'upstream') {
    return 'success';
  }

  if (source === 'database' || source === 'memory') {
    return 'info';
  }

  return 'neutral';
}

function normalizePriceDashboardState(state = {}) {
  const tableSortBy = Object.prototype.hasOwnProperty.call(SORTABLE_COLUMNS, state.tableSortBy)
    ? state.tableSortBy
    : DEFAULT_DASHBOARD_STATE.tableSortBy;

  const tableSortDir =
    String(state.tableSortDir || DEFAULT_DASHBOARD_STATE.tableSortDir).toLowerCase() === 'asc' ? 'asc' : 'desc';
  const tablePage = clamp(state.tablePage, 1, 99999, DEFAULT_DASHBOARD_STATE.tablePage);
  const tablePageSize = TABLE_PAGE_SIZE_OPTIONS.includes(Number(state.tablePageSize))
    ? Number(state.tablePageSize)
    : DEFAULT_DASHBOARD_STATE.tablePageSize;
  const supplierCriterion = Object.prototype.hasOwnProperty.call(SUPPLIER_CRITERIA, state.supplierCriterion)
    ? state.supplierCriterion
    : DEFAULT_DASHBOARD_STATE.supplierCriterion;

  return {
    tableSortBy,
    tableSortDir,
    tableQuickFilter: String(state.tableQuickFilter || ''),
    tablePage,
    tablePageSize,
    supplierCriterion
  };
}

export function createPriceDashboardState(partial = {}) {
  return normalizePriceDashboardState({
    ...DEFAULT_DASHBOARD_STATE,
    ...partial
  });
}

function isDebugEnabled() {
  if (typeof window === 'undefined') {
    return false;
  }

  if (window.SINGEM_DEBUG_PRICE_UI === true) {
    return true;
  }

  const host = String(window.location?.hostname || '');
  return host === 'localhost' || host === '127.0.0.1';
}

function logPriceUi(scope, payload = {}) {
  if (!isDebugEnabled()) {
    return;
  }

  try {
    // eslint-disable-next-line no-console
    console.log(`[PRICE_UI][${scope}]`, payload);
  } catch {
    // noop
  }
}

function buildExecutiveHeader(response) {
  const query = response?.query || {};
  const summary = response?.summary || {};
  const cache = response?.cache || {};
  const codes = safeArray(query.codes);

  return `
    <section class="pi-header" aria-label="Cabecalho executivo">
      <div class="pi-header__main">
        <div class="pi-header__titles">
          <h4 class="pi-header__title">Inteligencia de Precos Publicos</h4>
          <p class="pi-header__subtitle">Painel executivo para analise comparativa de compras publicas por CATMAT/CATSER.</p>
        </div>
        <div class="pi-header__actions">
          <button id="btnAtualizarAgoraHeader" class="btn btn-warning" aria-label="Atualizar dados da base oficial">
            Atualizar
          </button>
          <div class="pi-header__export-box">
            <select id="priceExportFormat" class="form-control" aria-label="Formato de exportacao do modulo">
              <option value="csv">CSV</option>
              <option value="xlsx">XLSX</option>
              <option value="json">JSON</option>
            </select>
            <button id="btnExportPriceDataHeader" class="btn btn-success" aria-label="Exportar consulta atual">
              Exportar
            </button>
          </div>
        </div>
      </div>
      <div class="pi-header__meta">
        <div class="pi-chip">
          <span class="pi-chip__label">Periodo</span>
          <strong class="pi-chip__value">${escapeHtml(getPeriodSummary(query))}</strong>
        </div>
        <div class="pi-chip">
          <span class="pi-chip__label">CATMAT/CATSER</span>
          <strong class="pi-chip__value">${escapeHtml(formatNumber(codes.length))} codigo(s)</strong>
        </div>
        <div class="pi-chip">
          <span class="pi-chip__label">Catalogo</span>
          <strong class="pi-chip__value">${escapeHtml(String(summary.catalogType || query.catalogType || '-').toUpperCase())}</strong>
        </div>
        <div class="pi-chip pi-chip--status pi-chip--${escapeHtml(getStatusTone(cache.source))}">
          <span class="pi-chip__label">Status da base</span>
          <strong class="pi-chip__value">${escapeHtml(getCacheSourceLabel(cache.source))}</strong>
        </div>
      </div>
    </section>
  `;
}

function buildKpiCards(response) {
  const metrics = response?.metrics || {};

  const cards = [
    {
      label: 'Preco medio',
      value: formatCurrency(metrics.precoMedio),
      subtitle: 'Media unitaria do recorte analisado'
    },
    {
      label: 'Mediana',
      value: formatCurrency(metrics.precoMediano),
      subtitle: 'Valor central para reduzir vieses extremos'
    },
    {
      label: 'Menor preco',
      value: formatCurrency(metrics.precoMinimo),
      subtitle: 'Melhor referencia observada'
    },
    {
      label: 'Maior preco',
      value: formatCurrency(metrics.precoMaximo),
      subtitle: 'Pico de preco no periodo'
    },
    {
      label: 'Total de registros',
      value: formatNumber(metrics.totalRegistros),
      subtitle: 'Quantidade de itens consolidados'
    },
    {
      label: 'Quantidade total comprada',
      value: formatNumber(metrics.totalQuantidade, 2),
      subtitle: 'Volume agregado informado'
    },
    {
      label: 'Fornecedores unicos',
      value: formatNumber(metrics.fornecedoresUnicos),
      subtitle: 'Base concorrencial identificada'
    },
    {
      label: 'UASGs unicas',
      value: formatNumber(metrics.uasgsUnicas),
      subtitle: 'Unidades compradoras no recorte'
    },
    {
      label: 'Valor total estimado',
      value: formatCurrency(metrics.valorTotalEstimado),
      subtitle: 'Quantidade x preco unitario'
    }
  ];

  return `
    <section class="pi-kpi-grid" aria-label="Resumo de KPIs executivos">
      ${cards
        .map(
          (card) => `
            <article class="pi-kpi-card" title="${escapeHtml(card.subtitle)}">
              <span class="pi-kpi-card__label">${escapeHtml(card.label)}</span>
              <strong class="pi-kpi-card__value">${escapeHtml(card.value)}</strong>
              <span class="pi-kpi-card__subtitle">${escapeHtml(card.subtitle)}</span>
            </article>
          `
        )
        .join('')}
    </section>
  `;
}

function buildDeltaBadge(delta, options = {}) {
  const amount = toNumber(delta, null);
  if (amount === null) {
    return '<span class="pi-delta pi-delta--neutral">Sem base comparativa</span>';
  }

  const neutralThreshold = toNumber(options.neutralThreshold, 0.3) || 0.3;

  if (Math.abs(amount) <= neutralThreshold) {
    return `<span class="pi-delta pi-delta--neutral">Estavel (${escapeHtml(formatPercent(amount))})</span>`;
  }

  const isUp = amount > 0;
  const trend = isUp ? 'Alta' : 'Queda';
  const cls = isUp ? 'up' : 'down';
  const symbol = isUp ? '▲' : '▼';

  return `<span class="pi-delta pi-delta--${cls}">${symbol} ${escapeHtml(trend)} (${escapeHtml(formatPercent(Math.abs(amount)))})</span>`;
}

function calculateModaComparison(response) {
  const rows = safeArray(response?.modalities?.distribution).filter(
    (entry) => toNumber(entry.precoMedio, null) !== null
  );
  if (rows.length < 2) {
    return null;
  }

  const leader = rows[0];
  const others = rows.slice(1);

  let weightedSum = 0;
  let totalWeight = 0;

  for (const row of others) {
    const price = toNumber(row.precoMedio, null);
    const weight = Math.max(1, toNumber(row.totalRegistros, 1) || 1);
    if (price === null) {
      continue;
    }

    weightedSum += price * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) {
    return null;
  }

  const leaderPrice = toNumber(leader.precoMedio, null);
  const othersAvg = weightedSum / totalWeight;

  if (leaderPrice === null || othersAvg <= 0) {
    return null;
  }

  return {
    leader,
    othersAvg,
    deltaPercent: ((leaderPrice - othersAvg) / othersAvg) * 100
  };
}

function buildComparativeCards(response) {
  const metrics = response?.metrics || {};
  const suppliers = response?.suppliers || {};
  const timelineTrend = response?.timeline?.trend || null;
  const modaComparison = calculateModaComparison(response);

  const avg = toNumber(metrics.precoMedio, null);
  const median = toNumber(metrics.precoMediano, null);
  const min = toNumber(metrics.precoMinimo, null);
  const max = toNumber(metrics.precoMaximo, null);

  const leaderSupplier = safeArray(suppliers.topByFrequency)[0] || null;
  const leaderSupplierAvg = toNumber(leaderSupplier?.precoMedio, null);

  const cards = [
    {
      title: 'Preco medio vs mediana',
      leftLabel: 'Media',
      leftValue: formatCurrency(avg),
      rightLabel: 'Mediana',
      rightValue: formatCurrency(median),
      delta: avg !== null && median !== null && median !== 0 ? ((avg - median) / median) * 100 : null
    },
    {
      title: 'Menor vs maior preco',
      leftLabel: 'Minimo',
      leftValue: formatCurrency(min),
      rightLabel: 'Maximo',
      rightValue: formatCurrency(max),
      delta: min !== null && max !== null && min > 0 ? ((max - min) / min) * 100 : null
    },
    {
      title: 'Fornecedor lider vs media global',
      leftLabel: leaderSupplier?.nomeFornecedor || 'Fornecedor lider',
      leftValue: formatCurrency(leaderSupplierAvg),
      rightLabel: 'Media global',
      rightValue: formatCurrency(avg),
      delta: leaderSupplierAvg !== null && avg !== null && avg > 0 ? ((leaderSupplierAvg - avg) / avg) * 100 : null
    },
    {
      title: 'Modalidade lider vs demais',
      leftLabel: modaComparison?.leader?.modalidadeNome || 'Modalidade lider',
      leftValue: formatCurrency(modaComparison?.leader?.precoMedio),
      rightLabel: 'Media das demais',
      rightValue: formatCurrency(modaComparison?.othersAvg),
      delta: modaComparison?.deltaPercent ?? null
    },
    {
      title: 'Inicio vs fim do periodo',
      leftLabel: timelineTrend ? formatPeriodLabel(timelineTrend.firstPeriod) : 'Inicio',
      leftValue: formatCurrency(timelineTrend?.firstAveragePrice),
      rightLabel: timelineTrend ? formatPeriodLabel(timelineTrend.lastPeriod) : 'Fim',
      rightValue: formatCurrency(timelineTrend?.lastAveragePrice),
      delta: timelineTrend?.deltaPercent ?? null
    }
  ];

  return `
    <section class="pi-comparative-grid" aria-label="Comparativos executivos">
      ${cards
        .map(
          (card) => `
            <article class="pi-comparative-card">
              <h5 class="pi-comparative-card__title">${escapeHtml(card.title)}</h5>
              <div class="pi-comparative-card__values">
                <div>
                  <span class="pi-comparative-card__label">${escapeHtml(card.leftLabel)}</span>
                  <strong class="pi-comparative-card__value">${escapeHtml(card.leftValue)}</strong>
                </div>
                <div>
                  <span class="pi-comparative-card__label">${escapeHtml(card.rightLabel)}</span>
                  <strong class="pi-comparative-card__value">${escapeHtml(card.rightValue)}</strong>
                </div>
              </div>
              ${buildDeltaBadge(card.delta)}
            </article>
          `
        )
        .join('')}
    </section>
  `;
}

function normalizeSeriesPoints(rows, valueKey) {
  return safeArray(rows)
    .map((row) => ({
      ...row,
      value: toNumber(row?.[valueKey], null)
    }))
    .filter((row) => row.value !== null);
}

function buildLineGeometry(points, width, height, padding) {
  const values = points.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const usableWidth = width - padding * 2;
  const usableHeight = height - padding * 2;
  const stepX = points.length > 1 ? usableWidth / (points.length - 1) : 0;

  const chartPoints = points.map((point, index) => {
    const x = padding + stepX * index;
    const normalizedY = (point.value - min) / range;
    const y = height - padding - normalizedY * usableHeight;
    return {
      ...point,
      x,
      y
    };
  });

  const linePath = chartPoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`)
    .join(' ');

  const first = chartPoints[0];
  const last = chartPoints[chartPoints.length - 1];
  const areaPath = `${linePath} L${last.x.toFixed(2)},${(height - padding).toFixed(2)} L${first.x.toFixed(2)},${(height - padding).toFixed(2)} Z`;

  return {
    chartPoints,
    linePath,
    areaPath,
    min,
    max
  };
}

function buildChartPanel(title, subtitle, content, options = {}) {
  const controls = options.controls || '';
  const footer = options.footer || '';
  const extraClass = options.extraClass ? ` ${options.extraClass}` : '';

  return `
    <article class="pi-card${extraClass}">
      <header class="pi-card__header">
        <div>
          <h5 class="pi-card__title">${escapeHtml(title)}</h5>
          <p class="pi-card__subtitle">${escapeHtml(subtitle || '')}</p>
        </div>
        ${controls}
      </header>
      <div class="pi-card__body">
        ${content}
      </div>
      ${footer ? `<footer class="pi-card__footer">${footer}</footer>` : ''}
    </article>
  `;
}

function buildEmptyChartMessage(message) {
  return `<div class="pi-empty-panel">${escapeHtml(message)}</div>`;
}

function pickTimelineSeries(response) {
  const timeline = response?.timeline || {};
  const month = normalizeSeriesPoints(timeline.byMonth, 'precoMedio');
  const quarter = normalizeSeriesPoints(timeline.byQuarter, 'precoMedio');
  const year = normalizeSeriesPoints(timeline.byYear, 'precoMedio');

  if (month.length >= 6) {
    return {
      label: 'Mensal',
      points: month
    };
  }

  if (quarter.length >= 4) {
    return {
      label: 'Trimestral',
      points: quarter
    };
  }

  return {
    label: 'Anual',
    points: year.length ? year : month
  };
}

function buildEvolutionChart(response) {
  const selected = pickTimelineSeries(response);
  const points = selected.points;

  if (points.length < 2) {
    return buildChartPanel(
      'Evolucao temporal do preco',
      'Serie insuficiente para inferencia de tendencia',
      buildEmptyChartMessage('Sem massa critica para renderizar serie temporal de preco medio.')
    );
  }

  const width = 700;
  const height = 260;
  const padding = 24;
  const geometry = buildLineGeometry(points, width, height, padding);

  const minPoint = geometry.chartPoints.reduce(
    (acc, point) => (point.value < acc.value ? point : acc),
    geometry.chartPoints[0]
  );
  const maxPoint = geometry.chartPoints.reduce(
    (acc, point) => (point.value > acc.value ? point : acc),
    geometry.chartPoints[0]
  );

  const labels = [
    geometry.chartPoints[0],
    geometry.chartPoints[Math.floor(geometry.chartPoints.length / 2)],
    geometry.chartPoints[geometry.chartPoints.length - 1]
  ];

  const svg = `
    <svg class="pi-chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolucao temporal do preco medio">
      <defs>
        <linearGradient id="piAreaGradient" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="#2b6cb0" stop-opacity="0.32"></stop>
          <stop offset="100%" stop-color="#2b6cb0" stop-opacity="0.05"></stop>
        </linearGradient>
      </defs>
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" class="pi-chart-axis"></line>
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" class="pi-chart-axis"></line>
      <path d="${geometry.areaPath}" fill="url(#piAreaGradient)"></path>
      <path d="${geometry.linePath}" class="pi-line-path"></path>
      ${geometry.chartPoints
        .map((point) => {
          const cls =
            point.periodo === minPoint.periodo
              ? 'pi-point pi-point--min'
              : point.periodo === maxPoint.periodo
                ? 'pi-point pi-point--max'
                : 'pi-point';
          return `
            <circle cx="${point.x.toFixed(2)}" cy="${point.y.toFixed(2)}" r="4" class="${cls}">
              <title>${escapeHtml(`${formatPeriodLabel(point.periodo)}: ${formatCurrency(point.value)}`)}</title>
            </circle>
          `;
        })
        .join('')}
      ${labels
        .map(
          (point) => `
            <text x="${point.x.toFixed(2)}" y="${(height - 6).toFixed(2)}" class="pi-chart-label" text-anchor="middle">
              ${escapeHtml(formatPeriodLabel(point.periodo))}
            </text>
          `
        )
        .join('')}
    </svg>
  `;

  const trend = response?.timeline?.trend;
  const footer = trend
    ? `
        <span>Tendencia ${escapeHtml(trend.direction)} no periodo (${escapeHtml(formatPercent(trend.deltaPercent))}).</span>
        <span>Pico: ${escapeHtml(formatCurrency(maxPoint.value))} | Piso: ${escapeHtml(formatCurrency(minPoint.value))}</span>
      `
    : `<span>Pico: ${escapeHtml(formatCurrency(maxPoint.value))} | Piso: ${escapeHtml(formatCurrency(minPoint.value))}</span>`;

  return buildChartPanel(
    'Evolucao temporal do preco',
    `Media ${selected.label.toLowerCase()} com extremos destacados`,
    svg,
    {
      extraClass: 'pi-card--hero',
      footer
    }
  );
}

function toHorizontalRows(rows, options = {}) {
  const valueFormatter = options.valueFormatter || ((value) => formatNumber(value));
  const safeRows = safeArray(rows).slice(0, options.limit || 8);

  return safeRows
    .map((entry) => {
      const label = options.labelResolver ? options.labelResolver(entry) : entry.label;
      const value = options.valueResolver ? options.valueResolver(entry) : entry.value;

      return {
        label: String(label || '-'),
        value: toNumber(value, 0) || 0,
        valueText: valueFormatter(value, entry),
        tooltip: options.tooltipResolver ? options.tooltipResolver(entry) : null
      };
    })
    .filter((entry) => entry.value >= 0);
}

function buildHorizontalBarChart(title, subtitle, rows) {
  if (!rows.length) {
    return buildChartPanel(
      title,
      subtitle,
      buildEmptyChartMessage('Sem dados suficientes para exibir este comparativo.')
    );
  }

  const maxValue = rows.reduce((acc, row) => Math.max(acc, row.value), 0) || 1;

  const content = `
    <div class="pi-hbar-list">
      ${rows
        .map((row) => {
          const percent = Math.max(2, (row.value / maxValue) * 100);
          return `
            <div class="pi-hbar-row" title="${escapeHtml(row.tooltip || `${row.label}: ${row.valueText}`)}">
              <div class="pi-hbar-row__meta">
                <span class="pi-hbar-row__label">${escapeHtml(row.label)}</span>
                <span class="pi-hbar-row__value">${escapeHtml(row.valueText)}</span>
              </div>
              <div class="pi-hbar-track">
                <span class="pi-hbar-fill" style="width:${percent.toFixed(2)}%"></span>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  return buildChartPanel(title, subtitle, content);
}

function buildColumnChart(title, subtitle, rows, options = {}) {
  if (!rows.length) {
    return buildChartPanel(title, subtitle, buildEmptyChartMessage('Sem dados suficientes para exibir este grafico.'));
  }

  const maxValue = rows.reduce((acc, row) => Math.max(acc, row.value), 0) || 1;
  const valueFormatter = options.valueFormatter || ((value) => formatNumber(value));

  const content = `
    <div class="pi-column-chart" role="img" aria-label="${escapeHtml(title)}">
      ${rows
        .map((row) => {
          const percent = Math.max(2, (row.value / maxValue) * 100);
          const valueText = valueFormatter(row.value, row);
          const tooltip = row.tooltip || `${row.label}: ${valueText}`;

          return `
            <div class="pi-column-chart__bar" title="${escapeHtml(tooltip)}">
              <span class="pi-column-chart__value">${escapeHtml(valueText)}</span>
              <span class="pi-column-chart__fill" style="height:${percent.toFixed(2)}%"></span>
              <span class="pi-column-chart__label">${escapeHtml(row.label)}</span>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  return buildChartPanel(title, subtitle, content);
}

function buildInsightsPanel(response) {
  const insights = safeArray(response?.insights);
  const summaryText = response?.summary?.text || '';

  const listMarkup = insights.length
    ? insights
        .map((insight) => {
          const type = normalizeText(insight?.type) || 'info';
          const cls = ['success', 'warning', 'error'].includes(type) ? type : 'info';
          return `<li class="pi-insight pi-insight--${cls}">${escapeHtml(insight?.text || '')}</li>`;
        })
        .join('')
    : '<li class="pi-insight pi-insight--info">Sem insights adicionais para os filtros atuais.</li>';

  const content = `
    <div class="pi-insights-panel">
      <p class="pi-insights-panel__summary">${escapeHtml(summaryText || 'Resumo executivo indisponivel no momento.')}</p>
      <ul class="pi-insight-list">${listMarkup}</ul>
    </div>
  `;

  return buildChartPanel('Painel de insights', 'Sintese automatica para decisao gerencial', content, {
    extraClass: 'pi-card--insights'
  });
}

function buildTopSuppliersChart(response, dashboardState) {
  const criterionKey = dashboardState.supplierCriterion;
  const criterion = SUPPLIER_CRITERIA[criterionKey] || SUPPLIER_CRITERIA.frequency;
  const suppliers = response?.suppliers || {};

  const sourceRows =
    criterionKey === 'quantity'
      ? suppliers.topByQuantity
      : criterionKey === 'participation'
        ? suppliers.topByParticipation
        : suppliers.topByFrequency;

  const rows = toHorizontalRows(sourceRows, {
    valueFormatter: (value) =>
      criterionKey === 'participation'
        ? formatPercent(value, 2)
        : criterionKey === 'quantity'
          ? `${formatNumber(value, 2)} ${criterion.valueLabel}`
          : `${formatNumber(value)} ${criterion.valueLabel}`,
    labelResolver: (entry) => criterion.rowLabel(entry),
    valueResolver: (entry) => criterion.rowValue(entry),
    tooltipResolver: (entry) => {
      const label = criterion.rowLabel(entry);
      const value = criterion.rowValue(entry);
      const priceAverage = toNumber(entry.precoMedio, null);
      return `${label} | ${criterion.label}: ${criterionKey === 'participation' ? formatPercent(value, 2) : formatNumber(value, criterionKey === 'quantity' ? 2 : 0)} | Preco medio: ${formatCurrency(priceAverage)}`;
    }
  });

  const controls = `
    <label class="pi-inline-control" for="piSupplierCriterion">
      Criterio
      <select id="piSupplierCriterion" class="form-control" aria-label="Criterio do grafico de fornecedores">
        <option value="frequency" ${criterionKey === 'frequency' ? 'selected' : ''}>Frequencia</option>
        <option value="quantity" ${criterionKey === 'quantity' ? 'selected' : ''}>Quantidade</option>
        <option value="participation" ${criterionKey === 'participation' ? 'selected' : ''}>Participacao</option>
      </select>
    </label>
  `;

  if (!rows.length) {
    return buildChartPanel(
      'Top fornecedores',
      'Classificacao por criterio selecionado',
      buildEmptyChartMessage('Sem fornecedores suficientes para o criterio selecionado.'),
      { controls }
    );
  }

  const maxValue = rows.reduce((acc, row) => Math.max(acc, row.value), 0) || 1;
  const content = `
    <div class="pi-hbar-list">
      ${rows
        .map((row) => {
          const percent = Math.max(2, (row.value / maxValue) * 100);
          return `
            <div class="pi-hbar-row" title="${escapeHtml(row.tooltip || `${row.label}: ${row.valueText}`)}">
              <div class="pi-hbar-row__meta">
                <span class="pi-hbar-row__label">${escapeHtml(row.label)}</span>
                <span class="pi-hbar-row__value">${escapeHtml(row.valueText)}</span>
              </div>
              <div class="pi-hbar-track">
                <span class="pi-hbar-fill" style="width:${percent.toFixed(2)}%"></span>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;

  return buildChartPanel('Top fornecedores', 'Recorrencia e participacao no recorte atual', content, {
    controls
  });
}

function buildTopUasgsChart(response) {
  const rows = toHorizontalRows(response?.buyers?.topUasgs, {
    labelResolver: (entry) => `${entry.codigoUasg || '-'} - ${entry.nomeUasg || 'UASG nao informada'}`,
    valueResolver: (entry) => entry.totalRegistros,
    valueFormatter: (value) => `${formatNumber(value)} registro(s)`,
    tooltipResolver: (entry) =>
      `${entry.codigoUasg || '-'} - ${entry.nomeUasg || 'UASG nao informada'} | Registros: ${formatNumber(entry.totalRegistros)} | Quantidade: ${formatNumber(entry.totalQuantidade, 2)}`
  });

  return buildHorizontalBarChart('Top orgaos / UASGs', 'Unidades com maior frequencia de compras', rows);
}

function buildPriceByModalidadeChart(response) {
  const rows = toHorizontalRows(response?.modalities?.distribution, {
    labelResolver: (entry) => entry.modalidadeNome || 'Nao informada',
    valueResolver: (entry) => entry.precoMedio,
    valueFormatter: (value) => formatCurrency(value),
    tooltipResolver: (entry) =>
      `${entry.modalidadeNome || 'Nao informada'} | Preco medio: ${formatCurrency(entry.precoMedio)} | Registros: ${formatNumber(entry.totalRegistros)}`
  });

  return buildHorizontalBarChart('Preco por modalidade', 'Comparativo do preco medio entre modalidades', rows);
}

function buildPriceByStateChart(response) {
  const rows = toHorizontalRows(response?.geography?.byState, {
    labelResolver: (entry) => entry.estado || 'UF nao informada',
    valueResolver: (entry) => entry.precoMedio,
    valueFormatter: (value) => formatCurrency(value),
    tooltipResolver: (entry) =>
      `${entry.estado || 'UF'} | Preco medio: ${formatCurrency(entry.precoMedio)} | Registros: ${formatNumber(entry.totalRegistros)}`
  });

  return buildHorizontalBarChart('Preco medio por estado', 'Visao geografica para referencias de preco', rows);
}

function buildDistributionChart(response) {
  const prices = safeArray(response?.rawItems)
    .map((item) => toNumber(item?.precoUnitario, null))
    .filter((price) => price !== null && price >= 0);

  if (!prices.length) {
    return buildColumnChart('Distribuicao de precos', 'Sem base suficiente para dispersao', []);
  }

  const min = Math.min(...prices);
  const max = Math.max(...prices);

  if (min === max) {
    return buildColumnChart(
      'Distribuicao de precos',
      'Todos os registros com o mesmo preco unitario',
      [
        {
          label: formatCurrency(min),
          value: prices.length,
          tooltip: `${formatCurrency(min)}: ${formatNumber(prices.length)} registro(s)`
        }
      ],
      {
        valueFormatter: (value) => formatNumber(value)
      }
    );
  }

  const binCount = clamp(Math.round(Math.sqrt(prices.length)), 5, 10, 7);
  const width = (max - min) / binCount;

  const bins = Array.from({ length: binCount }, (_, index) => ({
    start: min + width * index,
    end: index === binCount - 1 ? max : min + width * (index + 1),
    count: 0
  }));

  prices.forEach((price) => {
    const index = Math.min(binCount - 1, Math.floor((price - min) / width));
    bins[index].count += 1;
  });

  const rows = bins.map((bin) => ({
    label: `${formatNumber(bin.start, 0)}-${formatNumber(bin.end, 0)}`,
    value: bin.count,
    tooltip: `${formatCurrency(bin.start)} ate ${formatCurrency(bin.end)}: ${formatNumber(bin.count)} registro(s)`
  }));

  return buildColumnChart('Distribuicao de precos', 'Histograma por faixas de preco unitario', rows, {
    valueFormatter: (value) => formatNumber(value)
  });
}

function buildPurchaseFrequencyChart(response) {
  const timeline = response?.timeline || {};
  const byMonth = safeArray(timeline.byMonth);
  const byQuarter = safeArray(timeline.byQuarter);
  const byYear = safeArray(timeline.byYear);

  let source = byMonth;
  let label = 'Mensal';

  if (byMonth.length < 4 && byQuarter.length >= 3) {
    source = byQuarter;
    label = 'Trimestral';
  }

  if (!source.length && byYear.length) {
    source = byYear;
    label = 'Anual';
  }

  const rows = source
    .map((entry) => ({
      label: formatPeriodLabel(entry.periodo),
      value: toNumber(entry.totalRegistros, 0) || 0,
      tooltip: `${formatPeriodLabel(entry.periodo)}: ${formatNumber(entry.totalRegistros)} compra(s)`
    }))
    .filter((entry) => entry.value >= 0);

  return buildColumnChart(
    'Quantidade de compras ao longo do tempo',
    `Frequencia ${label.toLowerCase()} de compras`,
    rows,
    {
      valueFormatter: (value) => formatNumber(value)
    }
  );
}

function buildTableRows(mappedRows = []) {
  return safeArray(mappedRows).map((row, index) => {
    const extras = row?.extras || {};
    const sourceIndex = Number.isInteger(row.__sourceIndex) ? row.__sourceIndex : index;
    const precoNum = toNumber(extras.precoUnitario, toNumber(row.valor, 0) || 0) || 0;
    const quantidadeNum = toNumber(extras.quantidade, toNumber(row.quantidade, 0) || 0) || 0;
    const dataIso = normalizeDateOnly(extras.dataCompra || row.dataCompra);
    const dataExibicao = row.dataCompra || formatDateBr(dataIso);
    const descricao = String(row.descricao || '-');
    const fornecedor = String(row.fornecedor || '-');
    const marca = String(row.marca || '-');
    const modalidade = String(row.modalidade || '-');
    const estado = String(row.estado || '-');
    const codigo = String(row.codigo || '-');
    const idItemCompra = String(row.idItemCompra || '-');
    const uasg = String(row.uasg || row.orgao || '-');
    const orgao = String(extras.nomeOrgao || row.orgao || '-');

    return {
      sourceIndex,
      dataIso: dataIso || '',
      dataExibicao,
      codigo,
      descricao,
      quantidadeNum,
      quantidadeExibicao: formatNumber(quantidadeNum, 2),
      precoNum,
      precoExibicao: formatCurrency(precoNum),
      fornecedor,
      marca,
      uasg,
      orgao,
      estado,
      modalidade,
      idItemCompra,
      searchBlob: normalizeText(
        [dataExibicao, codigo, descricao, fornecedor, marca, uasg, orgao, estado, modalidade, idItemCompra].join(' ')
      )
    };
  });
}

function compareRows(left, right, key, direction) {
  const factor = direction === 'asc' ? 1 : -1;

  if (key === 'dataCompra') {
    return left.dataIso.localeCompare(right.dataIso, 'pt-BR') * factor;
  }

  if (key === 'quantidade') {
    return (left.quantidadeNum - right.quantidadeNum) * factor;
  }

  if (key === 'preco') {
    return (left.precoNum - right.precoNum) * factor;
  }

  const dictionary = {
    codigo: 'codigo',
    descricao: 'descricao',
    fornecedor: 'fornecedor',
    marca: 'marca',
    uasg: 'uasg',
    orgao: 'orgao',
    estado: 'estado',
    modalidade: 'modalidade',
    idItemCompra: 'idItemCompra'
  };

  const field = dictionary[key] || 'descricao';
  return String(left[field] || '').localeCompare(String(right[field] || ''), 'pt-BR', { sensitivity: 'base' }) * factor;
}

function buildTableViewModel(mappedRows, dashboardState) {
  const allRows = buildTableRows(mappedRows);
  const filterText = normalizeText(dashboardState.tableQuickFilter);

  const filteredRows = filterText ? allRows.filter((row) => row.searchBlob.includes(filterText)) : allRows;

  const sortedRows = [...filteredRows].sort((left, right) =>
    compareRows(left, right, dashboardState.tableSortBy, dashboardState.tableSortDir)
  );

  const totalItems = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / dashboardState.tablePageSize));
  const currentPage = clamp(dashboardState.tablePage, 1, totalPages, 1);
  const offset = (currentPage - 1) * dashboardState.tablePageSize;
  const pageRows = sortedRows.slice(offset, offset + dashboardState.tablePageSize);

  const prices = sortedRows.map((row) => row.precoNum);
  const minPrice = prices.length ? Math.min(...prices) : 0;
  const maxPrice = prices.length ? Math.max(...prices) : 0;

  return {
    allRows,
    filteredRows,
    sortedRows,
    pageRows,
    totalItems,
    totalPages,
    currentPage,
    minPrice,
    maxPrice
  };
}

function getPriceTier(price, min, max) {
  if (max <= min) {
    return 'neutral';
  }

  const ratio = (price - min) / (max - min);
  if (ratio <= 0.33) {
    return 'low';
  }

  if (ratio >= 0.66) {
    return 'high';
  }

  return 'mid';
}

function renderSortControl(label, key, state) {
  const isActive = state.tableSortBy === key;
  const dir = isActive ? state.tableSortDir : null;
  const indicator = dir === 'asc' ? ' ▲' : dir === 'desc' ? ' ▼' : '';

  return `
    <button class="pi-sort-btn ${isActive ? 'is-active' : ''}" data-sort-key="${escapeHtml(key)}" aria-label="Ordenar por ${escapeHtml(label)}">
      ${escapeHtml(label)}${indicator}
    </button>
  `;
}

function renderLocalTablePagination(model) {
  if (model.totalPages <= 1) {
    return '';
  }

  const firstPage = Math.max(1, model.currentPage - 2);
  const lastPage = Math.min(model.totalPages, firstPage + 4);
  const pages = [];

  for (let page = firstPage; page <= lastPage; page += 1) {
    pages.push(
      `<button class="pi-table-page-btn ${page === model.currentPage ? 'is-active' : ''}" data-page-number="${page}" aria-label="Ir para pagina ${page}">${page}</button>`
    );
  }

  return `
    <div class="pi-table-pagination" aria-label="Paginacao da tabela analitica">
      <button class="pi-table-page-btn" data-page-action="prev" ${model.currentPage <= 1 ? 'disabled' : ''}>
        ◀
      </button>
      ${pages.join('')}
      <button class="pi-table-page-btn" data-page-action="next" ${model.currentPage >= model.totalPages ? 'disabled' : ''}>
        ▶
      </button>
      <span class="pi-table-pagination__info">Pagina ${model.currentPage} de ${model.totalPages}</span>
    </div>
  `;
}

function buildAnalyticalTable(mappedRows, dashboardState) {
  const model = buildTableViewModel(mappedRows, dashboardState);

  const tableToolbar = `
    <div class="pi-table-toolbar">
      <div class="pi-table-toolbar__group pi-table-toolbar__group--search">
        <label for="piQuickFilter">Filtro rapido da tabela</label>
        <input
          id="piQuickFilter"
          type="text"
          class="form-control"
          placeholder="Filtrar por descricao, fornecedor, UASG, modalidade..."
          value="${escapeHtml(dashboardState.tableQuickFilter)}"
          aria-label="Filtro rapido da tabela analitica"
        />
      </div>
      <div class="pi-table-toolbar__group">
        <label for="piPageSize">Itens por pagina</label>
        <select id="piPageSize" class="form-control" aria-label="Quantidade de linhas por pagina">
          ${TABLE_PAGE_SIZE_OPTIONS.map(
            (size) =>
              `<option value="${size}" ${dashboardState.tablePageSize === size ? 'selected' : ''}>${size}</option>`
          ).join('')}
        </select>
      </div>
      <div class="pi-table-toolbar__stats">
        Exibindo <strong>${formatNumber(model.pageRows.length)}</strong> de <strong>${formatNumber(model.totalItems)}</strong> registro(s) da pagina consultada.
      </div>
    </div>
  `;

  const rowsMarkup = model.pageRows.length
    ? model.pageRows
        .map((row) => {
          const priceTier = getPriceTier(row.precoNum, model.minPrice, model.maxPrice);

          return `
            <tr>
              <td>${escapeHtml(row.dataExibicao)}</td>
              <td>${escapeHtml(row.codigo)}</td>
              <td class="pi-cell-truncate" title="${escapeHtml(row.descricao)}">${escapeHtml(row.descricao)}</td>
              <td>${escapeHtml(row.quantidadeExibicao)}</td>
              <td>
                <span class="pi-price-badge pi-price-badge--${priceTier}" title="Faixa relativa de preco na tabela atual">
                  ${escapeHtml(row.precoExibicao)}
                </span>
              </td>
              <td class="pi-cell-truncate" title="${escapeHtml(row.fornecedor)}">${escapeHtml(row.fornecedor)}</td>
              <td class="pi-cell-truncate" title="${escapeHtml(row.marca)}">${escapeHtml(row.marca)}</td>
              <td class="pi-cell-truncate" title="${escapeHtml(row.uasg)}">${escapeHtml(row.uasg)}</td>
              <td class="pi-cell-truncate" title="${escapeHtml(row.orgao)}">${escapeHtml(row.orgao)}</td>
              <td>${escapeHtml(row.estado)}</td>
              <td class="pi-cell-truncate" title="${escapeHtml(row.modalidade)}">${escapeHtml(row.modalidade)}</td>
              <td class="pi-cell-truncate" title="${escapeHtml(row.idItemCompra)}">${escapeHtml(row.idItemCompra)}</td>
              <td>
                <div class="pi-action-buttons">
                  <button class="btn btn-sm btn-info btn-price-details" data-source-index="${row.sourceIndex}" title="Ver detalhe completo do registro">
                    Detalhes
                  </button>
                  <button class="btn btn-sm btn-secondary btn-view-json" data-source-index="${row.sourceIndex}" title="Visualizar payload bruto do registro">
                    JSON
                  </button>
                </div>
              </td>
            </tr>
          `;
        })
        .join('')
    : `
      <tr>
        <td colspan="13">
          <div class="pi-empty-panel pi-empty-panel--inline">
            Nenhum registro corresponde ao filtro rapido informado.
          </div>
        </td>
      </tr>
    `;

  const tableMarkup = `
    <section class="pi-card pi-card--table" aria-label="Tabela analitica premium">
      <header class="pi-card__header">
        <div>
          <h5 class="pi-card__title">Tabela analitica premium</h5>
          <p class="pi-card__subtitle">Ordene colunas, filtre rapidamente e acesse detalhes institucionais.</p>
        </div>
      </header>
      <div class="pi-card__body">
        ${tableToolbar}
        <div class="table-responsive">
          <table class="table table-striped pi-main-table">
            <thead>
              <tr>
                <th>${renderSortControl('Data', 'dataCompra', dashboardState)}</th>
                <th>${renderSortControl('CATMAT', 'codigo', dashboardState)}</th>
                <th>${renderSortControl('Descricao', 'descricao', dashboardState)}</th>
                <th>${renderSortControl('Quantidade', 'quantidade', dashboardState)}</th>
                <th>${renderSortControl('Preco Unitario', 'preco', dashboardState)}</th>
                <th>${renderSortControl('Fornecedor', 'fornecedor', dashboardState)}</th>
                <th>${renderSortControl('Marca', 'marca', dashboardState)}</th>
                <th>${renderSortControl('UASG', 'uasg', dashboardState)}</th>
                <th>${renderSortControl('Orgao', 'orgao', dashboardState)}</th>
                <th>${renderSortControl('UF', 'estado', dashboardState)}</th>
                <th>${renderSortControl('Modalidade', 'modalidade', dashboardState)}</th>
                <th>${renderSortControl('ID Item Compra', 'idItemCompra', dashboardState)}</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>${rowsMarkup}</tbody>
          </table>
        </div>
        ${renderLocalTablePagination(model)}
      </div>
    </section>
  `;

  return {
    markup: tableMarkup,
    model
  };
}

function buildNoResultsGuide() {
  return `
    <section class="pi-card pi-card--zero" aria-label="Sem resultados na consulta">
      <header class="pi-card__header">
        <div>
          <h5 class="pi-card__title">Nenhum resultado para os filtros atuais</h5>
          <p class="pi-card__subtitle">Refine o recorte para ampliar a base de comparacao.</p>
        </div>
      </header>
      <div class="pi-card__body">
        <ul class="pi-check-list">
          <li>Valide os codigos CATMAT/CATSER informados.</li>
          <li>Amplie o periodo inicial/final para capturar mais compras.</li>
          <li>Remova filtros de fornecedor, marca ou estado para reduzir restricoes.</li>
          <li>Use o botao Atualizar para forcar consulta na base oficial.</li>
        </ul>
      </div>
    </section>
  `;
}

export function renderPriceIntelligenceLoadingState() {
  return `
    <div class="pi-loading-skeleton" aria-label="Carregando dashboard executivo">
      <div class="pi-skeleton pi-skeleton--header"></div>
      <div class="pi-skeleton-grid">
        <div class="pi-skeleton pi-skeleton--card"></div>
        <div class="pi-skeleton pi-skeleton--card"></div>
        <div class="pi-skeleton pi-skeleton--card"></div>
        <div class="pi-skeleton pi-skeleton--card"></div>
      </div>
      <div class="pi-skeleton-grid">
        <div class="pi-skeleton pi-skeleton--chart"></div>
        <div class="pi-skeleton pi-skeleton--chart"></div>
      </div>
      <div class="pi-skeleton pi-skeleton--table"></div>
    </div>
  `;
}

export function renderPriceIntelligenceZeroState(options = {}) {
  const title = options.title || 'Nenhuma consulta executada';
  const message =
    options.message ||
    'Preencha os filtros do modulo de Inteligencia de Precos Publicos e clique em Buscar para gerar o dashboard executivo.';

  return `
    <div class="pi-zero-state" aria-live="polite">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

export function renderPriceIntelligenceErrorState(errorState = {}) {
  const title = errorState.title || 'Falha ao carregar painel executivo';
  const message = errorState.message || 'Nao foi possivel consultar a base oficial no momento.';
  const details = errorState.details || '';

  return `
    <div class="pi-error-state" role="alert">
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(message)}</p>
      ${details ? `<details><summary>Detalhes tecnicos</summary><pre>${escapeHtml(details)}</pre></details>` : ''}
      <button id="btnPriceRetry" class="btn btn-primary" aria-label="Tentar novamente a consulta">
        Tentar novamente
      </button>
    </div>
  `;
}

export function renderPriceIntelligenceResults(response, mappedRows = [], uiState = {}) {
  const dashboardState = normalizePriceDashboardState(uiState);
  const metrics = response?.metrics || {};
  const insights = safeArray(response?.insights);
  const tableData = buildAnalyticalTable(mappedRows, dashboardState);

  logPriceUi('CHART_DATA', {
    timelineMonthPoints: safeArray(response?.timeline?.byMonth).length,
    modalities: safeArray(response?.modalities?.distribution).length,
    suppliers: safeArray(response?.suppliers?.topByFrequency).length,
    states: safeArray(response?.geography?.byState).length,
    rawItems: safeArray(response?.rawItems).length
  });

  logPriceUi('INSIGHTS_RENDER', {
    totalInsights: insights.length,
    hasSummary: Boolean(response?.summary?.text)
  });

  logPriceUi('TABLE_RENDER', {
    rowsMapped: mappedRows.length,
    rowsFiltered: tableData.model.totalItems,
    tablePage: tableData.model.currentPage,
    tablePages: tableData.model.totalPages,
    sortBy: dashboardState.tableSortBy,
    sortDir: dashboardState.tableSortDir
  });

  return `
    <div class="pi-dashboard">
      ${buildExecutiveHeader(response)}
      ${buildKpiCards(response)}
      ${buildComparativeCards(response)}
      ${
        toInteger(metrics.totalRegistros, 0) === 0
          ? buildNoResultsGuide()
          : `
            <section class="pi-layout pi-layout--hero">
              ${buildEvolutionChart(response)}
              ${buildInsightsPanel(response)}
            </section>

            <section class="pi-layout pi-layout--two">
              ${buildTopSuppliersChart(response, dashboardState)}
              ${buildTopUasgsChart(response)}
            </section>

            <section class="pi-layout pi-layout--two">
              ${buildPriceByModalidadeChart(response)}
              ${buildPriceByStateChart(response)}
            </section>

            <section class="pi-layout pi-layout--two">
              ${buildDistributionChart(response)}
              ${buildPurchaseFrequencyChart(response)}
            </section>
          `
      }
      ${tableData.markup}
    </div>
  `;
}

export function renderPriceDetailsModalContent(item = {}) {
  const raw = item.raw || item;

  const details = [
    ['Data da compra', formatDateBr(item.dataCompra)],
    ['CATMAT/CATSER', item.codigoItemCatalogo || '-'],
    ['Descricao', item.descricaoItem || '-'],
    ['Quantidade', formatNumber(item.quantidade, 2)],
    ['Preco unitario', formatCurrency(item.precoUnitario)],
    ['Fornecedor', item.nomeFornecedor || '-'],
    ['CNPJ/NI fornecedor', item.niFornecedor || '-'],
    ['Marca', item.marca || '-'],
    ['Codigo UASG', item.codigoUasg || '-'],
    ['Nome UASG', item.nomeUasg || '-'],
    ['Orgao', item.nomeOrgao || '-'],
    ['Estado', item.estado || '-'],
    ['Modalidade', item.modalidadeNome || '-'],
    ['ID compra', item.idCompra || '-'],
    ['Numero item compra', item.numeroItemCompra ?? '-'],
    ['ID item compra', item.idItemCompra || '-']
  ];

  return `
    <div class="pi-detail-tabs" role="tablist" aria-label="Abas de detalhe do registro">
      <button class="pi-detail-tab is-active" type="button" data-detail-tab="resumo">Visao executiva</button>
      <button class="pi-detail-tab" type="button" data-detail-tab="json">JSON bruto</button>
    </div>

    <section class="pi-detail-panel is-active" data-detail-panel="resumo">
      <div class="pi-detail-grid">
        ${details
          .map(
            ([label, value]) => `
              <div class="pi-detail-item">
                <span class="pi-detail-item__label">${escapeHtml(label)}</span>
                <span class="pi-detail-item__value">${escapeHtml(value)}</span>
              </div>
            `
          )
          .join('')}
      </div>
    </section>

    <section class="pi-detail-panel" data-detail-panel="json" hidden>
      <pre class="pi-detail-json"><code>${escapeHtml(JSON.stringify(raw, null, 2))}</code></pre>
    </section>
  `;
}
