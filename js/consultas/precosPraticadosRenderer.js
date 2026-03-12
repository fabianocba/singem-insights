/**
 * Renderizador especializado do Módulo 3 - Preços Praticados (CATMAT/CATSER).
 */

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatCurrency(value) {
  const amount = toNumber(value);
  if (amount === null) {
    return 'R$ 0,00';
  }

  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatNumber(value, fractionDigits = 0) {
  const amount = toNumber(value);
  if (amount === null) {
    return '0';
  }

  return amount.toLocaleString('pt-BR', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits
  });
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

function formatDateBr(isoDate) {
  if (!isoDate) {
    return '-';
  }

  try {
    const date = new Date(`${String(isoDate).slice(0, 10)}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) {
      return '-';
    }

    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch {
    return '-';
  }
}

function buildSummaryCards(response) {
  const metrics = response?.metrics || {};

  const cards = [
    { label: 'Preço Médio', value: formatCurrency(metrics.precoMedio) },
    { label: 'Preço Mediano', value: formatCurrency(metrics.precoMediano) },
    { label: 'Menor Preço', value: formatCurrency(metrics.precoMinimo) },
    { label: 'Maior Preço', value: formatCurrency(metrics.precoMaximo) },
    { label: 'Registros', value: formatNumber(metrics.totalRegistros) },
    { label: 'Total Comprado', value: formatNumber(metrics.totalQuantidade, 2) },
    { label: 'Fornecedores Únicos', value: formatNumber(metrics.fornecedoresUnicos) },
    { label: 'UASGs Únicas', value: formatNumber(metrics.uasgsUnicas) }
  ];

  return `
    <section class="pi-summary-grid" aria-label="Resumo da inteligência de preços">
      ${cards
        .map(
          (card) => `
          <article class="pi-summary-card">
            <p class="pi-summary-card__label">${escapeHtml(card.label)}</p>
            <p class="pi-summary-card__value">${escapeHtml(card.value)}</p>
          </article>
        `
        )
        .join('')}
    </section>
  `;
}

function buildInsightList(response) {
  const insights = safeArray(response?.insights);
  if (!insights.length) {
    return '';
  }

  return `
    <section class="pi-panel" aria-label="Insights automáticos">
      <h5 class="pi-panel__title">Insights automáticos</h5>
      <ul class="pi-insight-list">
        ${insights
          .map((insight) => {
            const type = String(insight?.type || 'info').toLowerCase();
            return `<li class="pi-insight pi-insight--${escapeHtml(type)}">${escapeHtml(insight?.text || '')}</li>`;
          })
          .join('')}
      </ul>
    </section>
  `;
}

function buildTopRowsTable(title, rows, columns) {
  const safeRows = safeArray(rows);
  if (!safeRows.length) {
    return `
      <section class="pi-panel">
        <h5 class="pi-panel__title">${escapeHtml(title)}</h5>
        <p class="text-muted">Sem dados para exibir.</p>
      </section>
    `;
  }

  const head = columns.map((column) => `<th>${escapeHtml(column.label)}</th>`).join('');
  const body = safeRows
    .map((row) => {
      const tds = columns
        .map((column) => {
          const rawValue = column.formatter ? column.formatter(row[column.key], row) : row[column.key];
          return `<td>${escapeHtml(rawValue ?? '-')}</td>`;
        })
        .join('');
      return `<tr>${tds}</tr>`;
    })
    .join('');

  return `
    <section class="pi-panel">
      <h5 class="pi-panel__title">${escapeHtml(title)}</h5>
      <div class="pi-panel__table-wrapper">
        <table class="table table-striped pi-mini-table">
          <thead>
            <tr>${head}</tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>
  `;
}

function buildBarChartPanel(title, rows, options = {}) {
  const safeRows = safeArray(rows).slice(0, options.limit || 8);
  if (!safeRows.length) {
    return `
      <section class="pi-panel">
        <h5 class="pi-panel__title">${escapeHtml(title)}</h5>
        <p class="text-muted">Sem dados para exibir.</p>
      </section>
    `;
  }

  const labelKey = options.labelKey || 'label';
  const valueKey = options.valueKey || 'value';
  const valueFormatter = options.valueFormatter || ((value) => formatNumber(value, 0));

  const maxValue = safeRows.reduce((max, row) => {
    const current = toNumber(row[valueKey]) || 0;
    return Math.max(max, current);
  }, 0);

  const bars = safeRows
    .map((row) => {
      const label = String(row[labelKey] ?? '-');
      const value = toNumber(row[valueKey]) || 0;
      const percent = maxValue > 0 ? (value / maxValue) * 100 : 0;

      return `
        <div class="pi-bar-row">
          <div class="pi-bar-row__header">
            <span class="pi-bar-row__label" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
            <span class="pi-bar-row__value">${escapeHtml(valueFormatter(value, row))}</span>
          </div>
          <div class="pi-bar-track">
            <div class="pi-bar-fill" style="width:${percent.toFixed(2)}%"></div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <section class="pi-panel">
      <h5 class="pi-panel__title">${escapeHtml(title)}</h5>
      <div class="pi-bar-list">${bars}</div>
    </section>
  `;
}

function buildMainTable(mappedRows) {
  if (!mappedRows.length) {
    return `
      <div class="empty-state">
        <p>📋 Nenhum resultado encontrado para os filtros do Módulo 3.</p>
      </div>
    `;
  }

  const rows = mappedRows
    .map(
      (row, index) => `
      <tr>
        <td>${escapeHtml(row.dataCompra)}</td>
        <td>${escapeHtml(row.codigo)}</td>
        <td class="description-cell" title="${escapeHtml(row.descricao)}">${escapeHtml(row.descricao)}</td>
        <td>${escapeHtml(row.quantidade)}</td>
        <td>${escapeHtml(row.valor)}</td>
        <td class="orgao-cell" title="${escapeHtml(row.fornecedor)}">${escapeHtml(row.fornecedor)}</td>
        <td>${escapeHtml(row.marca || '-')}</td>
        <td class="orgao-cell" title="${escapeHtml(row.uasg)}">${escapeHtml(row.uasg)}</td>
        <td class="orgao-cell" title="${escapeHtml(row.orgao)}">${escapeHtml(row.orgao)}</td>
        <td>${escapeHtml(row.estado || '-')}</td>
        <td>${escapeHtml(row.modalidade || '-')}</td>
        <td>${escapeHtml(row.idItemCompra || '-')}</td>
        <td>
          <button class="btn btn-sm btn-info btn-price-details" data-index="${index}" title="Ver detalhes">
            🔎 Detalhes
          </button>
          <button class="btn btn-sm btn-secondary btn-view-json" data-index="${index}" title="Ver JSON">
            📄 JSON
          </button>
        </td>
      </tr>
    `
    )
    .join('');

  return `
    <div class="table-responsive">
      <table class="table table-striped pi-main-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>CATMAT/CATSER</th>
            <th>Descrição</th>
            <th>Quantidade</th>
            <th>Preço Unitário</th>
            <th>Fornecedor</th>
            <th>Marca</th>
            <th>UASG</th>
            <th>Órgão</th>
            <th>UF</th>
            <th>Modalidade</th>
            <th>ID Item Compra</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildSummaryDescription(response) {
  const summary = response?.summary;
  if (!summary?.text) {
    return '';
  }

  return `
    <section class="pi-panel">
      <h5 class="pi-panel__title">Resumo Executivo</h5>
      <p class="pi-summary-text">${escapeHtml(summary.text)}</p>
    </section>
  `;
}

function buildAnalyticsPanels(response) {
  const suppliers = response?.suppliers || {};
  const buyers = response?.buyers || {};
  const modalities = response?.modalities || {};
  const geography = response?.geography || {};
  const timeline = response?.timeline || {};

  return `
    <section class="pi-analytics-grid" aria-label="Análises complementares">
      ${buildBarChartPanel('Top Fornecedores (Frequência)', suppliers.topByFrequency, {
        labelKey: 'nomeFornecedor',
        valueKey: 'totalRegistros',
        valueFormatter: (value) => `${formatNumber(value)} registro(s)`
      })}
      ${buildBarChartPanel('Top UASGs Compradoras', buyers.topUasgs, {
        labelKey: 'nomeUasg',
        valueKey: 'totalRegistros',
        valueFormatter: (value) => `${formatNumber(value)} registro(s)`
      })}
      ${buildBarChartPanel('Distribuição por Modalidade', modalities.distribution, {
        labelKey: 'modalidadeNome',
        valueKey: 'totalRegistros',
        valueFormatter: (value) => `${formatNumber(value)} registro(s)`
      })}
      ${buildBarChartPanel('Preço Médio por Estado', geography.byState, {
        labelKey: 'estado',
        valueKey: 'precoMedio',
        valueFormatter: (value) => formatCurrency(value)
      })}
      ${buildBarChartPanel('Evolução Temporal (Mês)', safeArray(timeline.byMonth).slice(-12), {
        labelKey: 'periodo',
        valueKey: 'precoMedio',
        valueFormatter: (value) => formatCurrency(value)
      })}
      ${buildTopRowsTable('Top Fornecedores por Menor Preço Médio', suppliers.topByLowestAveragePrice, [
        { key: 'nomeFornecedor', label: 'Fornecedor' },
        { key: 'precoMedio', label: 'Preço Médio', formatter: (value) => formatCurrency(value) }
      ])}
      ${buildTopRowsTable('Top Órgãos Compradores', buyers.topOrgaos, [
        { key: 'nomeOrgao', label: 'Órgão' },
        { key: 'totalRegistros', label: 'Registros', formatter: (value) => formatNumber(value) },
        { key: 'totalQuantidade', label: 'Quantidade', formatter: (value) => formatNumber(value, 2) }
      ])}
      ${buildTopRowsTable('Preço Médio por Modalidade', modalities.averagePrice, [
        { key: 'modalidadeNome', label: 'Modalidade' },
        { key: 'precoMedio', label: 'Preço Médio', formatter: (value) => formatCurrency(value) }
      ])}
    </section>
  `;
}

function buildMetaInfo(response, mappedRows) {
  const query = response?.query || {};
  const page = response?.page || {};
  const cache = response?.cache || {};

  return `
    <div class="table-actions pi-table-actions">
      <div>
        <strong>Módulo 3 - Preços Praticados (CATMAT/CATSER)</strong>
        <div class="text-muted">
          Códigos: ${escapeHtml(safeArray(query.codes).join(', ') || '-')} | Página ${escapeHtml(page.number || 1)} de ${escapeHtml(page.totalPages || 1)} | ${escapeHtml(mappedRows.length)} registro(s) exibido(s)
        </div>
      </div>
      <div class="pi-export-group">
        <select id="priceExportFormat" class="form-control" aria-label="Formato de exportação">
          <option value="csv">CSV</option>
          <option value="xlsx">XLSX</option>
          <option value="json">JSON</option>
        </select>
        <button id="btnExportPriceData" class="btn btn-success" aria-label="Exportar resultados filtrados">
          📥 Exportar
        </button>
      </div>
    </div>
    <p class="text-muted pi-cache-label">Origem do cache: ${escapeHtml(cache.source || 'upstream')} | Chave: ${escapeHtml(cache.key || '-')}</p>
  `;
}

export function renderPriceIntelligenceResults(response, mappedRows = []) {
  return `
    <div class="pi-wrapper">
      ${buildMetaInfo(response, mappedRows)}
      ${buildSummaryCards(response)}
      ${buildSummaryDescription(response)}
      ${buildInsightList(response)}
      ${buildAnalyticsPanels(response)}
      <section class="pi-panel" aria-label="Tabela de resultados detalhados">
        <h5 class="pi-panel__title">Registros Detalhados</h5>
        ${buildMainTable(mappedRows)}
      </section>
    </div>
  `;
}

export function renderPriceDetailsModalContent(item = {}) {
  const details = [
    ['Data da Compra', formatDateBr(item.dataCompra)],
    ['Código CATMAT/CATSER', item.codigoItemCatalogo || '-'],
    ['Descrição', item.descricaoItem || '-'],
    ['Quantidade', formatNumber(item.quantidade, 2)],
    ['Preço Unitário', formatCurrency(item.precoUnitario)],
    ['Fornecedor', item.nomeFornecedor || '-'],
    ['CNPJ/NI Fornecedor', item.niFornecedor || '-'],
    ['Marca', item.marca || '-'],
    ['Código UASG', item.codigoUasg || '-'],
    ['Nome UASG', item.nomeUasg || '-'],
    ['Órgão', item.nomeOrgao || '-'],
    ['UF', item.estado || '-'],
    ['Modalidade', item.modalidadeNome || '-'],
    ['ID Compra', item.idCompra || '-'],
    ['Nº Item Compra', item.numeroItemCompra ?? '-'],
    ['ID Item Compra', item.idItemCompra || '-']
  ];

  return `
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
      <div class="pi-detail-item pi-detail-item--full">
        <span class="pi-detail-item__label">Payload bruto</span>
        <pre class="pi-detail-json"><code>${escapeHtml(JSON.stringify(item.raw || item, null, 2))}</code></pre>
      </div>
    </div>
  `;
}
