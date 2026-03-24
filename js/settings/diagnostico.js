/**
 * @file diagnostico.js
 * @description Módulo de diagnóstico de armazenamento para a página de configurações
 * @module settings/diagnostico
 */

import { detectStorageUsage, printStorageReport, getSystemStats, formatBytes } from '../core/storageAudit.js';
import { StorageAdapter } from '../core/storageAdapter.js';
import { escapeHTML as escapeHtml } from '../utils/sanitize.js';
import {
  feedbackMarkup,
  metricCardMarkup,
  metricGridMarkup,
  progressMarkup,
  renderInto,
  reportMarkup,
  reportTableMarkup,
  tableCellMarkup,
  tableRowMarkup
} from './renderUtils.js';

// ============================================================================
// Estado do módulo
// ============================================================================
let initialized = false;
let storageAdapter = null;
const SERVER_MODE = window.CONFIG?.storage?.mode === 'server';

// ============================================================================
// Funções de formatação
// ============================================================================

/**
 * Formata data para exibição
 */
function _formatDate(dateString) {
  if (!dateString) {
    return '-';
  }
  const date = new Date(dateString);
  return date.toLocaleString('pt-BR');
}

// ============================================================================
// Renderização das seções
// ============================================================================

/**
 * Renderiza estatísticas de armazenamento
 */
async function renderStorageStats(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  if (SERVER_MODE) {
    const authAtivo = !!window.__SINGEM_AUTH?.accessToken;
    const apiBase =
      window.__API_BASE_URL__ ||
      window.CONFIG?.api?.baseUrl ||
      window.location.origin;
    renderInto(
      container,
      metricGridMarkup([
        metricCardMarkup({ tone: 'success', value: 'SERVER', label: 'Modo de armazenamento' }),
        metricCardMarkup({
          tone: authAtivo ? 'info' : 'warning',
          value: authAtivo ? 'ATIVA' : 'INATIVA',
          label: 'Sessão em memória'
        }),
        metricCardMarkup({
          tone: 'warning',
          value: escapeHtml(apiBase),
          label: 'API base'
        })
      ])
    );
    return;
  }

  try {
    const usage = await detectStorageUsage();

    let html = metricGridMarkup([
      metricCardMarkup({
        tone: 'success',
        value: usage.indexedDB.databases.length,
        label: 'Base(s) local legada'
      }),
      metricCardMarkup({
        tone: 'info',
        value: usage.localStorage.itemCount,
        label: 'Chaves de storage web'
      }),
      metricCardMarkup({
        tone: 'warning',
        value: formatBytes(usage.localStorage.totalSize),
        label: 'Tamanho de storage web'
      }),
      metricCardMarkup({
        tone: 'info',
        value: usage.sessionStorage.itemCount,
        label: 'Chaves de sessão web'
      })
    ]);

    // Estimativa de quota (se disponível)
    if (usage.quota) {
      const usedPercent = ((usage.quota.usage / usage.quota.quota) * 100).toFixed(1);
      html += progressMarkup({
        title: '📊 Uso de Quota',
        value: usedPercent,
        leftLabel: `Usado: ${formatBytes(usage.quota.usage)}`,
        centerLabel: `${usedPercent}%`,
        rightLabel: `Total: ${formatBytes(usage.quota.quota)}`
      });
    }

    renderInto(container, html);
  } catch (error) {
    renderInto(container, feedbackMarkup('error', `❌ Erro ao carregar estatísticas: ${error.message}`));
    console.error('[Diagnostico] Erro ao renderizar stats:', error);
  }
}

/**
 * Renderiza detalhes da base local legada
 */
async function renderIndexedDBDetails(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  if (SERVER_MODE) {
    try {
      const empenhos = await window.dbManager.buscarEmpenhos(true);
      const notasFiscais = await window.dbManager.buscarNotasFiscais();
      const authAtivo = !!window.__SINGEM_AUTH?.accessToken;

      renderInto(
        container,
        reportMarkup({
          title: '🖥️ API PostgreSQL (VPS)',
          content: reportTableMarkup({
            rows: [
              tableRowMarkup([
                tableCellMarkup({ html: '📋 Empenhos' }),
                tableCellMarkup({ html: empenhos.length, className: 'settings-report__count' })
              ]),
              tableRowMarkup([
                tableCellMarkup({ html: '📄 Notas Fiscais' }),
                tableCellMarkup({ html: notasFiscais.length, className: 'settings-report__count' })
              ]),
              tableRowMarkup([
                tableCellMarkup({ html: '🔐 Sessão' }),
                tableCellMarkup({
                  html: authAtivo ? 'Ativa ✅' : 'Inativa ⚠️',
                  className: `settings-report__count settings-report__count--${authAtivo ? 'success' : 'warning'}`
                })
              ])
            ]
          })
        })
      );
      return;
    } catch (error) {
      renderInto(container, feedbackMarkup('error', `❌ Erro ao consultar API: ${error.message}`));
      return;
    }
  }

  try {
    // Obter estatísticas do sistema (já retorna objeto com contagens)
    const sysStats = await getSystemStats();

    // Transformar em formato compatível com o render
    const stats = [
      {
        name: 'ControleMaterialDB',
        version: window.dbManager?.db?.version || 6,
        stores: [
          { name: 'empenhos', count: sysStats.empenhos || 0 },
          { name: 'notasFiscais', count: sysStats.notasFiscais || 0 },
          { name: 'arquivos', count: sysStats.arquivos || 0 },
          { name: 'auditLogs', count: sysStats.auditLogs || 0 }
        ]
      }
    ];

    if (stats.length === 0) {
      renderInto(container, feedbackMarkup('neutral', 'Nenhum banco de dados encontrado.'));
      return;
    }

    renderInto(
      container,
      stats
        .map((db) =>
          reportMarkup({
            title: `🗄️ ${db.name} <span class="settings-report__meta">(v${db.version})</span>`,
            content: reportTableMarkup({
              headers: ['Store', { label: 'Registros', className: 'is-center' }],
              rows: db.stores.map((store) =>
                tableRowMarkup([
                  tableCellMarkup({ html: `📁 ${escapeHtml(String(store.name))}` }),
                  tableCellMarkup({
                    html: store.count,
                    className: 'settings-report__count settings-report__count--info'
                  })
                ])
              )
            })
          })
        )
        .join('')
    );
  } catch (error) {
    renderInto(container, feedbackMarkup('error', `❌ Erro ao carregar base local legada: ${error.message}`));
    console.error('[Diagnostico] Erro ao renderizar base local legada:', error);
  }
}

/**
 * Renderiza detalhes do localStorage
 */
function renderLocalStorageDetails(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  renderInto(
    container,
    feedbackMarkup('neutral', 'Armazenamento local desativado por política. Operação em modo server-only.')
  );
}

/**
 * Renderiza informações do sistema
 */
function renderSystemInfo(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }

  const info = {
    'Versão SINGEM': window.APP_VERSION || 'Não definida',
    'Modo Storage': SERVER_MODE ? 'Servidor (PostgreSQL) ✅' : 'Local legado',
    'User Agent': navigator.userAgent,
    Plataforma: navigator.platform,
    Idioma: navigator.language,
    Online: navigator.onLine ? 'Sim ✅' : 'Não ❌',
    'Cookies habilitados': navigator.cookieEnabled ? 'Sim ✅' : 'Não ❌',
    'Storage local legado suportado': 'indexedDB' in window ? 'Sim ✅' : 'Não ❌',
    'Storage web suportado': 'localStorage' in window ? 'Sim ✅' : 'Não ❌',
    'Service Worker': 'serviceWorker' in navigator ? 'Suportado ✅' : 'Não suportado ❌',
    'Data/Hora atual': new Date().toLocaleString('pt-BR'),
    Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  renderInto(
    container,
    reportTableMarkup({
      rows: Object.entries(info).map(([key, value]) =>
        tableRowMarkup([
          tableCellMarkup({ html: key, className: 'settings-report__key' }),
          tableCellMarkup({
            html: escapeHtml(String(value)),
            className: 'settings-report__value settings-report__value--break'
          })
        ])
      )
    })
  );
}

// ============================================================================
// Event Handlers
// ============================================================================

/**
 * Imprime relatório no console
 */
async function handlePrintReport() {
  const btn = document.getElementById('btnPrintStorageReport');
  const originalText = btn.innerHTML;

  try {
    btn.disabled = true;
    btn.innerHTML = '⏳ Gerando...';

    await printStorageReport();

    btn.innerHTML = '✅ Impresso no Console!';
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);

    // Sugere abrir o console
    console.log('\n%c📋 Relatório impresso acima ☝️', 'font-size: 14px; font-weight: bold; color: #1e7e34;');
    console.log('%cPressione F12 para ver o DevTools se não estiver visível', 'color: #666;');
  } catch (error) {
    console.error('[Diagnostico] Erro ao gerar relatório:', error);
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

// ============================================================================
// Carregamento da aba
// ============================================================================

/**
 * Carrega todos os dados da aba de diagnóstico
 */
async function loadDiagnosticoTab() {
  console.log('[Diagnostico] Carregando aba de diagnóstico...');

  // Renderiza todas as seções em paralelo
  await Promise.all([
    renderStorageStats('storageStats'),
    renderIndexedDBDetails('indexedDBDetails'),
    renderLocalStorageDetails('localStorageDetails')
  ]);

  // Renderiza info do sistema (síncrono)
  renderSystemInfo('systemInfo');

  console.log('[Diagnostico] ✅ Aba de diagnóstico carregada');
}

// ============================================================================
// Inicialização
// ============================================================================

// Função irParaBackup removida - botão btnIrParaBackup foi removido do HTML
// Backup agora é acessado exclusivamente pela aba Preferências

/**
 * Inicializa o módulo de diagnóstico
 */
async function initDiagnostico() {
  if (initialized) {
    console.log('[Diagnostico] Já inicializado');
    return;
  }

  console.log('[Diagnostico] Inicializando módulo...');

  try {
    // Inicializa adaptadores
    storageAdapter = new StorageAdapter();
    await storageAdapter.init();

    // Configura event listeners
    const btnPrint = document.getElementById('btnPrintStorageReport');

    if (btnPrint) {
      btnPrint.addEventListener('click', handlePrintReport);
    }

    // Botão btnIrParaBackup removido do HTML - backup centralizado em Preferências

    initialized = true;
    console.log('[Diagnostico] ✅ Módulo inicializado');
  } catch (error) {
    console.error('[Diagnostico] ❌ Erro ao inicializar:', error);
  }
}

// ============================================================================
// Exportações e integração global
// ============================================================================

// Expõe funções globalmente para integração com settingsManager
window.diagnosticoModule = {
  init: initDiagnostico,
  load: loadDiagnosticoTab,
  printReport: handlePrintReport
};

// Auto-inicializa quando a aba de diagnóstico é clicada
document.addEventListener('DOMContentLoaded', () => {
  // Observer para detectar quando a aba é exibida
  const tabDiagnostico = document.getElementById('tabDiagnostico');
  if (tabDiagnostico) {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class' && tabDiagnostico.classList.contains('active')) {
          if (!initialized) {
            initDiagnostico().then(() => loadDiagnosticoTab());
          } else {
            loadDiagnosticoTab();
          }
        }
      });
    });

    observer.observe(tabDiagnostico, { attributes: true });
  }
});

export { initDiagnostico, loadDiagnosticoTab, renderStorageStats, renderIndexedDBDetails, renderLocalStorageDetails };
