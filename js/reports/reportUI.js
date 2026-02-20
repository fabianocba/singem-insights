/**
 * SINGEM - Report UI
 * Interface de usuário para relatórios dinâmicos
 * @version 1.0.0
 */

import { REPORTS, runReport, fmtMoney } from './reportEngine.js';
import * as repo from './reportRepository.js';

// Estado do módulo
let currentResult = null;
let isInitialized = false;

// ============================================================================
// INICIALIZAÇÃO
// ============================================================================

/**
 * Inicializa o módulo de relatórios dinâmicos
 */
export async function initReportsUI() {
  if (isInitialized) {
    return;
  }

  console.log('[ReportUI] Inicializando módulo de relatórios dinâmicos...');

  // Renderizar lista de relatórios
  renderReportList();

  // Carregar dados para filtros
  await loadFilterData();

  // Bind eventos
  bindEvents();

  isInitialized = true;
  console.log('[ReportUI] ✅ Módulo inicializado');
}

/**
 * Renderiza lista de cards de relatórios
 */
function renderReportList() {
  const container = document.getElementById('reportCardsContainer');
  if (!container) {
    console.warn('[ReportUI] Container reportCardsContainer não encontrado');
    return;
  }

  const html = Object.values(REPORTS)
    .map(
      (rep) => `
    <div class="report-card-dynamic" data-report-id="${rep.id}">
      <div class="report-card-header">
        <h4>${rep.title}</h4>
      </div>
      <p class="report-card-desc">${rep.description}</p>
      <div class="report-card-footer">
        <button class="btn btn-primary btn-sm btn-gerar-relatorio" data-report-id="${rep.id}">
          Gerar Relatório
        </button>
      </div>
    </div>
  `
    )
    .join('');

  container.innerHTML = html;
}

/**
 * Carrega dados para os filtros
 */
async function loadFilterData() {
  try {
    // Anos
    const anos = await repo.getAnosDisponiveis();
    const selectAno = document.getElementById('filtroReportAno');
    if (selectAno) {
      selectAno.innerHTML =
        '<option value="">Todos os anos</option>' + anos.map((a) => `<option value="${a}">${a}</option>`).join('');
    }

    // Fornecedores
    const fornecedores = await repo.getFornecedoresUnicos();
    const selectForn = document.getElementById('filtroReportFornecedor');
    if (selectForn) {
      selectForn.innerHTML =
        '<option value="">Todos os fornecedores</option>' +
        fornecedores.map((f) => `<option value="${f.cnpj}">${f.nome}</option>`).join('');
    }

    // Subelementos
    const subs = await repo.getSubelementosUnicos();
    const selectSub = document.getElementById('filtroReportSubelemento');
    if (selectSub) {
      selectSub.innerHTML =
        '<option value="">Todos</option>' + subs.map((s) => `<option value="${s}">${s}</option>`).join('');
    }
  } catch (error) {
    console.error('[ReportUI] Erro ao carregar filtros:', error);
  }
}

/**
 * Bind de eventos
 */
function bindEvents() {
  // Click nos cards de relatório
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.btn-gerar-relatorio');
    if (btn) {
      const reportId = btn.dataset.reportId;
      await gerarRelatorio(reportId);
    }

    // Botão exportar CSV
    if (e.target.id === 'btnExportCSVDynamic' || e.target.closest('#btnExportCSVDynamic')) {
      exportCSV();
    }

    // Botão imprimir
    if (e.target.id === 'btnPrintDynamic' || e.target.closest('#btnPrintDynamic')) {
      printReport();
    }

    // Botão fechar relatório
    if (e.target.id === 'btnCloseReportDynamic' || e.target.closest('#btnCloseReportDynamic')) {
      closeReport();
    }
  });
}

// ============================================================================
// GERAÇÃO DE RELATÓRIO
// ============================================================================

/**
 * Gera um relatório
 */
async function gerarRelatorio(reportId) {
  const reportDef = REPORTS[reportId];
  if (!reportDef) {
    showError(`Relatório não encontrado: ${reportId}`);
    return;
  }

  // Coletar parâmetros dos filtros
  const params = collectFilterParams();

  // Mostrar loading
  showLoading(`Gerando ${reportDef.title}...`);

  try {
    // Executar relatório
    currentResult = await runReport(reportId, params);

    // Renderizar resultado
    renderResult(currentResult);

    // Mostrar área de resultado
    showResultArea();

    hideLoading();
  } catch (error) {
    hideLoading();
    showError(`Erro ao gerar relatório: ${error.message}`);
    console.error('[ReportUI] Erro:', error);
  }
}

/**
 * Coleta parâmetros dos filtros
 */
function collectFilterParams() {
  const params = {};

  // Período
  const dateFrom = document.getElementById('filtroReportDateFrom')?.value;
  const dateTo = document.getElementById('filtroReportDateTo')?.value;
  if (dateFrom) {
    params.dateFrom = dateFrom;
  }
  if (dateTo) {
    params.dateTo = dateTo;
  }

  // Ano
  const ano = document.getElementById('filtroReportAno')?.value;
  if (ano) {
    params.ano = parseInt(ano);
  }

  // Fornecedor
  const fornecedor = document.getElementById('filtroReportFornecedor')?.value;
  if (fornecedor) {
    params.fornecedor = fornecedor;
  }

  // Subelemento
  const subelemento = document.getElementById('filtroReportSubelemento')?.value;
  if (subelemento) {
    params.subelemento = subelemento;
  }

  // Severidade (para auditoria)
  const severidade = document.getElementById('filtroReportSeveridade')?.value;
  if (severidade) {
    params.severidade = severidade;
  }

  return params;
}

// ============================================================================
// RENDERIZAÇÃO
// ============================================================================

/**
 * Renderiza o resultado do relatório
 */
function renderResult(result) {
  const container = document.getElementById('reportResultContainer');
  if (!container) {
    return;
  }

  // Header
  const headerHtml = `
    <div class="report-result-header">
      <div>
        <h3>${result.meta.title}</h3>
        <p class="report-meta">
          Gerado em: ${formatDateTime(result.meta.geradoEm)} |
          Total de registros: ${result.meta.totalRows}
        </p>
      </div>
      <div class="report-actions">
        <button id="btnExportCSVDynamic" class="btn btn-secondary btn-sm">
          📊 Exportar CSV
        </button>
        <button id="btnPrintDynamic" class="btn btn-secondary btn-sm">
          🖨️ Imprimir
        </button>
        <button id="btnCloseReportDynamic" class="btn btn-outline btn-sm">
          ✕ Fechar
        </button>
      </div>
    </div>
  `;

  // Tabela
  const tableHtml = renderTable(result);

  // Totais
  const totalsHtml = renderTotals(result);

  container.innerHTML = headerHtml + tableHtml + totalsHtml;
}

/**
 * Renderiza a tabela de dados
 */
function renderTable(result) {
  if (!result.rows?.length) {
    return `
      <div class="report-empty">
        <p>📭 Nenhum registro encontrado com os filtros aplicados.</p>
      </div>
    `;
  }

  const { columns, rows } = result;

  // Header
  const headerRow = columns.map((col) => `<th class="align-${col.align}">${col.label}</th>`).join('');

  // Body
  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((col) => {
          const val = row[col.key];
          const formatted = formatCell(val, col.type, row);
          return `<td class="align-${col.align} type-${col.type || 'text'}">${formatted}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  return `
    <div class="report-table-container">
      <table class="report-table">
        <thead>
          <tr>${headerRow}</tr>
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Renderiza os totais
 */
function renderTotals(result) {
  if (!result.totals || Object.keys(result.totals).length === 0) {
    return '';
  }

  const items = Object.entries(result.totals)
    .map(([key, val]) => {
      const label = formatTotalLabel(key);
      const formatted = typeof val === 'number' && key.toLowerCase().includes('valor') ? `R$ ${fmtMoney(val)}` : val;
      return `<div class="total-item"><span class="total-label">${label}:</span> <span class="total-value">${formatted}</span></div>`;
    })
    .join('');

  return `<div class="report-totals">${items}</div>`;
}

/**
 * Formata uma célula de acordo com o tipo
 */
function formatCell(val, type, _row) {
  if (val === null || val === undefined) {
    return '-';
  }

  switch (type) {
    case 'money':
      return `R$ ${fmtMoney(val)}`;

    case 'number':
      return (parseFloat(val) || 0).toLocaleString('pt-BR');

    case 'percent':
      return `${(parseFloat(val) || 0).toFixed(1)}%`;

    case 'date':
      if (!val) {
        return '-';
      }
      return formatDate(val);

    case 'badge':
      return renderBadge(val);

    default:
      return String(val);
  }
}

/**
 * Renderiza badge de severidade
 */
function renderBadge(val) {
  const classes = {
    bloqueante: 'badge-danger',
    alerta: 'badge-warning',
    ok: 'badge-success'
  };
  const labels = {
    bloqueante: '🔴 Bloqueante',
    alerta: '🟡 Alerta',
    ok: '🟢 OK'
  };
  const cls = classes[val] || 'badge-default';
  const label = labels[val] || val;
  return `<span class="badge ${cls}">${label}</span>`;
}

/**
 * Formata label de total
 */
function formatTotalLabel(key) {
  const labels = {
    qtdNFs: 'Total de NFs',
    valorTotal: 'Valor Total',
    qtdFornecedores: 'Fornecedores',
    qtdTotal: 'Quantidade Total',
    qtdItens: 'Itens Únicos',
    valorEmpenhado: 'Total Empenhado',
    valorExecutado: 'Total Executado',
    saldo: 'Saldo Total',
    totalRegistros: 'Total de Registros',
    bloqueantes: 'Bloqueantes',
    alertas: 'Alertas',
    totalGeral: 'Total Geral'
  };
  return labels[key] || key;
}

// ============================================================================
// EXPORTAÇÃO E IMPRESSÃO
// ============================================================================

/**
 * Exporta para CSV
 */
function exportCSV() {
  if (!currentResult) {
    showError('Nenhum relatório gerado para exportar.');
    return;
  }

  const { meta, columns, rows } = currentResult;

  // Header
  const header = columns.map((c) => `"${c.label}"`).join(';');

  // Rows
  const dataRows = rows
    .map((row) => {
      return columns
        .map((col) => {
          let val = row[col.key];
          if (val === null || val === undefined) {
            val = '';
          }
          if (typeof val === 'number') {
            return val.toString().replace('.', ',');
          }
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(';');
    })
    .join('\n');

  const csv = header + '\n' + dataRows;

  // Download
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `SINGEM_relatorio_${meta.reportId}_${formatFileDate()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showSuccess('CSV exportado com sucesso!');
}

/**
 * Imprime o relatório
 */
function printReport() {
  if (!currentResult) {
    showError('Nenhum relatório gerado para imprimir.');
    return;
  }

  const { meta, columns, rows, totals } = currentResult;

  // Gerar HTML para impressão
  const tableHtml = renderTableForPrint(columns, rows, totals);

  const printHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>${meta.title} - SINGEM</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
        h1 { font-size: 16px; margin-bottom: 8px; }
        .meta { color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        .align-right { text-align: right; }
        .align-center { text-align: center; }
        .totals { background: #e8f4fd; padding: 12px; border-radius: 4px; }
        .totals span { margin-right: 20px; }
        .badge { padding: 2px 6px; border-radius: 3px; font-size: 10px; }
        .badge-danger { background: #fee2e2; color: #dc2626; }
        .badge-warning { background: #fef3c7; color: #d97706; }
        .badge-success { background: #d1fae5; color: #059669; }
        @media print { body { padding: 10px; } }
      </style>
    </head>
    <body>
      <h1>${meta.title}</h1>
      <p class="meta">SINGEM - Gerado em ${formatDateTime(meta.geradoEm)} | ${rows.length} registros</p>
      ${tableHtml}
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(printHtml);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

function renderTableForPrint(columns, rows, totals) {
  const headerRow = columns.map((col) => `<th class="align-${col.align}">${col.label}</th>`).join('');

  const bodyRows = rows
    .map((row) => {
      const cells = columns
        .map((col) => {
          const val = row[col.key];
          const formatted = formatCellForPrint(val, col.type);
          return `<td class="align-${col.align}">${formatted}</td>`;
        })
        .join('');
      return `<tr>${cells}</tr>`;
    })
    .join('');

  let totalsHtml = '';
  if (totals && Object.keys(totals).length) {
    const totalsItems = Object.entries(totals)
      .map(([k, v]) => {
        const label = formatTotalLabel(k);
        const val = typeof v === 'number' && k.toLowerCase().includes('valor') ? `R$ ${fmtMoney(v)}` : v;
        return `<span><strong>${label}:</strong> ${val}</span>`;
      })
      .join(' ');
    totalsHtml = `<div class="totals">${totalsItems}</div>`;
  }

  return `
    <table>
      <thead><tr>${headerRow}</tr></thead>
      <tbody>${bodyRows}</tbody>
    </table>
    ${totalsHtml}
  `;
}

function formatCellForPrint(val, type) {
  if (val === null || val === undefined) {
    return '-';
  }

  switch (type) {
    case 'money':
      return `R$ ${fmtMoney(val)}`;
    case 'number':
      return (parseFloat(val) || 0).toLocaleString('pt-BR');
    case 'percent':
      return `${(parseFloat(val) || 0).toFixed(1)}%`;
    case 'date':
      return val ? formatDate(val) : '-';
    case 'badge': {
      const labels = { bloqueante: 'BLOQUEANTE', alerta: 'ALERTA', ok: 'OK' };
      return labels[val] || val;
    }
    default:
      return String(val);
  }
}

// ============================================================================
// UTILITÁRIOS UI
// ============================================================================

function showResultArea() {
  const area = document.getElementById('reportResultArea');
  if (area) {
    area.classList.remove('hidden');
  }

  const cards = document.getElementById('reportCardsContainer');
  if (cards) {
    cards.classList.add('hidden');
  }
}

function closeReport() {
  const area = document.getElementById('reportResultArea');
  if (area) {
    area.classList.add('hidden');
  }

  const cards = document.getElementById('reportCardsContainer');
  if (cards) {
    cards.classList.remove('hidden');
  }

  currentResult = null;
}

function showLoading(msg) {
  if (window.feedback?.showLoading) {
    window.feedback.showLoading(msg);
  } else {
    console.log('[ReportUI] Loading:', msg);
  }
}

function hideLoading() {
  if (window.feedback?.hideLoading) {
    window.feedback.hideLoading();
  }
}

function showError(msg) {
  if (window.feedback?.notifyError) {
    window.feedback.notifyError(msg);
  } else {
    alert('Erro: ' + msg);
  }
}

function showSuccess(msg) {
  if (window.feedback?.notifySuccess) {
    window.feedback.notifySuccess(msg);
  } else {
    console.log('[ReportUI] Sucesso:', msg);
  }
}

function formatDateTime(isoStr) {
  if (!isoStr) {
    return '-';
  }
  const d = new Date(isoStr);
  return d.toLocaleString('pt-BR');
}

function formatDate(isoStr) {
  if (!isoStr) {
    return '-';
  }
  const d = new Date(isoStr);
  return d.toLocaleDateString('pt-BR');
}

function formatFileDate() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

// Exportar para uso global
export { gerarRelatorio, exportCSV, printReport, closeReport };
