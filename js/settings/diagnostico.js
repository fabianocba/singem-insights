/**
 * @file diagnostico.js
 * @description Módulo de diagnóstico de armazenamento para a página de configurações
 * @module settings/diagnostico
 */

import { detectStorageUsage, printStorageReport, getSystemStats } from '../core/storageAudit.js';
import { StorageAdapter } from '../core/storageAdapter.js';

// ============================================================================
// Estado do módulo
// ============================================================================
let initialized = false;
let storageAdapter = null;

// ============================================================================
// Funções de formatação
// ============================================================================

/**
 * Formata bytes para exibição legível
 */
function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

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

  try {
    const usage = await detectStorageUsage();

    let html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div style="background: #e8f5e9; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #2e7d32;">
            ${usage.indexedDB.databases.length}
          </div>
          <div style="color: #666;">Banco(s) IndexedDB</div>
        </div>

        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #1565c0;">
            ${usage.localStorage.totalKeys}
          </div>
          <div style="color: #666;">Chaves localStorage</div>
        </div>

        <div style="background: #fff3e0; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #e65100;">
            ${formatBytes(usage.localStorage.totalSize)}
          </div>
          <div style="color: #666;">Tamanho localStorage</div>
        </div>

        <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 24px; font-weight: bold; color: #7b1fa2;">
            ${usage.sessionStorage.totalKeys}
          </div>
          <div style="color: #666;">Chaves sessionStorage</div>
        </div>
      </div>
    `;

    // Estimativa de quota (se disponível)
    if (usage.quota) {
      const usedPercent = ((usage.quota.usage / usage.quota.quota) * 100).toFixed(1);
      html += `
        <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
          <div style="font-weight: bold; margin-bottom: 10px;">📊 Uso de Quota</div>
          <div style="background: #e0e0e0; border-radius: 4px; overflow: hidden; height: 20px;">
            <div style="background: linear-gradient(90deg, #4caf50, #8bc34a); height: 100%; width: ${Math.min(usedPercent, 100)}%;"></div>
          </div>
          <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 12px; color: #666;">
            <span>Usado: ${formatBytes(usage.quota.usage)}</span>
            <span>${usedPercent}%</span>
            <span>Total: ${formatBytes(usage.quota.quota)}</span>
          </div>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="status-message error">❌ Erro ao carregar estatísticas: ${error.message}</div>`;
    console.error('[Diagnostico] Erro ao renderizar stats:', error);
  }
}

/**
 * Renderiza detalhes do IndexedDB
 */
async function renderIndexedDBDetails(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
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
      container.innerHTML = '<div style="color: #666;">Nenhum banco de dados encontrado.</div>';
      return;
    }

    let html = '';

    for (const db of stats) {
      html += `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
          <div style="font-weight: bold; color: #1e7e34; margin-bottom: 10px;">
            🗄️ ${db.name} <span style="font-weight: normal; color: #666;">(v${db.version})</span>
          </div>

          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <thead>
              <tr style="background: #e8f5e9;">
                <th style="padding: 8px; text-align: left; border-bottom: 1px solid #ddd;">Store</th>
                <th style="padding: 8px; text-align: right; border-bottom: 1px solid #ddd;">Registros</th>
              </tr>
            </thead>
            <tbody>
      `;

      for (const store of db.stores) {
        html += `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #eee;">📁 ${store.name}</td>
                <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">
                  <span style="background: #e3f2fd; padding: 2px 8px; border-radius: 12px; font-weight: bold;">
                    ${store.count}
                  </span>
                </td>
              </tr>
        `;
      }

      html += `
            </tbody>
          </table>
        </div>
      `;
    }

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="status-message error">❌ Erro ao carregar IndexedDB: ${error.message}</div>`;
    console.error('[Diagnostico] Erro ao renderizar IndexedDB:', error);
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

  try {
    const keys = Object.keys(localStorage);

    if (keys.length === 0) {
      container.innerHTML = '<div style="color: #666;">Nenhuma chave encontrada no localStorage.</div>';
      return;
    }

    // Agrupa por prefixo
    const groups = {};
    keys.forEach((key) => {
      const parts = key.split('_');
      const prefix = parts.length > 1 ? parts[0] : 'outros';
      if (!groups[prefix]) {
        groups[prefix] = [];
      }
      groups[prefix].push(key);
    });

    let html = `
      <div style="font-size: 14px;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #e3f2fd;">
              <th style="padding: 10px; text-align: left;">Chave</th>
              <th style="padding: 10px; text-align: right;">Tamanho</th>
              <th style="padding: 10px; text-align: center;">Preview</th>
            </tr>
          </thead>
          <tbody>
    `;

    keys.sort().forEach((key) => {
      const value = localStorage.getItem(key) || '';
      const size = new Blob([value]).size;
      const preview = value.substring(0, 50) + (value.length > 50 ? '...' : '');

      html += `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #eee; font-family: monospace; font-size: 12px;">
                ${escapeHtml(key)}
              </td>
              <td style="padding: 8px; text-align: right; border-bottom: 1px solid #eee;">
                ${formatBytes(size)}
              </td>
              <td style="padding: 8px; border-bottom: 1px solid #eee; color: #666; font-size: 11px; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                ${escapeHtml(preview)}
              </td>
            </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="status-message error">❌ Erro ao carregar localStorage: ${error.message}</div>`;
    console.error('[Diagnostico] Erro ao renderizar localStorage:', error);
  }
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
    'Versão SINGEM': localStorage.getItem('SINGEM_app_version') || 'Não definida',
    'User Agent': navigator.userAgent,
    Plataforma: navigator.platform,
    Idioma: navigator.language,
    Online: navigator.onLine ? 'Sim ✅' : 'Não ❌',
    'Cookies habilitados': navigator.cookieEnabled ? 'Sim ✅' : 'Não ❌',
    'IndexedDB suportado': 'indexedDB' in window ? 'Sim ✅' : 'Não ❌',
    'localStorage suportado': 'localStorage' in window ? 'Sim ✅' : 'Não ❌',
    'Service Worker': 'serviceWorker' in navigator ? 'Suportado ✅' : 'Não suportado ❌',
    'Data/Hora atual': new Date().toLocaleString('pt-BR'),
    Timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
  };

  let html = `
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
  `;

  for (const [key, value] of Object.entries(info)) {
    html += `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold; width: 200px;">${key}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; word-break: break-all;">${escapeHtml(String(value))}</td>
      </tr>
    `;
  }

  html += '</table>';
  container.innerHTML = html;
}

/**
 * Escapa HTML para prevenir XSS
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
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
