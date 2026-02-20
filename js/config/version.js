/**
 * ------------------------------------------------------------------
 * SINGEM - ARQUIVO DE VERSAO (COMPAT. LEGADO)
 * ------------------------------------------------------------------
 *
 *  ARQUIVO LEGADO - Use js/core/version.js como fonte canonica
 *
 * Este arquivo re-exporta de js/core/version.js para compatibilidade.
 *
 * ------------------------------------------------------------------
 */

// Importa tudo de js/core/version.js (fonte canonica)
import {
  APP_NAME,
  APP_VERSION,
  APP_BUILD,
  BUILD_TIMESTAMP,
  VERSION_DISPLAY,
  CACHE_BUSTER,
  VERSION_INFO,
  logVersion
} from '../core/version.js';

// Re-exporta para compatibilidade
export { APP_NAME, APP_VERSION, APP_BUILD, BUILD_TIMESTAMP, VERSION_DISPLAY, CACHE_BUSTER, VERSION_INFO, logVersion };

/**
 * Exibe banner de versao no console
 */
export function showVersionBanner() {
  console.log(
    '\n' +
      '+---------------------------------------------------------------+\n' +
      '|                         SINGEM                                |\n' +
      '|               Sistema de Controle de Material                 |\n' +
      '|---------------------------------------------------------------|\n' +
      '|  Versao: v' +
      APP_VERSION.padEnd(9) +
      '                                        |\n' +
      '|  Build:  ' +
      APP_BUILD.padEnd(20) +
      '                             |\n' +
      '+---------------------------------------------------------------+\n'
  );
}

/**
 * Cria e insere o rodape de versao na pagina
 */
export function renderVersionFooter() {
  // Remove rodape anterior se existir
  const existing = document.getElementById('SINGEM-version-footer');
  if (existing) {
    existing.remove();
  }

  const footer = document.createElement('div');
  footer.id = 'SINGEM-version-footer';
  footer.innerHTML =
    '<span class="v-name">' +
    APP_NAME +
    '</span> ' +
    '<span class="v-version">v' +
    APP_VERSION +
    '</span> ' +
    '<span class="v-sep">|</span> ' +
    '<span class="v-build">build ' +
    APP_BUILD +
    '</span>';

  // Estilos inline para garantir visibilidade
  footer.style.cssText =
    'position: fixed;' +
    'bottom: 0;' +
    'left: 0;' +
    'right: 0;' +
    'background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);' +
    'color: #8a8a9a;' +
    'font-size: 11px;' +
    'font-family: Segoe UI, system-ui, sans-serif;' +
    'padding: 6px 15px;' +
    'display: flex;' +
    'justify-content: center;' +
    'align-items: center;' +
    'gap: 6px;' +
    'z-index: 99999;' +
    'border-top: 1px solid #2a2a4a;' +
    'box-shadow: 0 -2px 10px rgba(0,0,0,0.3);' +
    'letter-spacing: 0.3px;';

  document.body.appendChild(footer);

  // Adiciona estilos para elementos internos
  const style = document.createElement('style');
  style.textContent =
    '#SINGEM-version-footer .v-version { color: #4fc3f7; font-weight: 600; }' +
    '#SINGEM-version-footer .v-build { color: #81c784; }' +
    '#SINGEM-version-footer .v-sep { color: #555; }' +
    '#SINGEM-version-footer:hover { background: linear-gradient(135deg, #1f1f3a 0%, #1a2744 100%); }';
  document.head.appendChild(style);
}

/**
 * Verifica se versao mudou e limpa cache
 */
function checkVersionChange() {
  const STORAGE_KEY = 'SINGEM-version-build';
  const stored = localStorage.getItem(STORAGE_KEY);
  const current = APP_VERSION + '-' + APP_BUILD;

  if (stored !== current) {
    if (stored) {
      console.log('Versao atualizada: ' + stored + ' -> ' + current);
    }
    localStorage.setItem(STORAGE_KEY, current);

    // Atualiza Service Workers se disponivel
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => {
          regs.forEach((reg) => {
            reg.update().catch(() => {});
          });
        })
        .catch(() => {});
    }
  }
}

// ------------------------------------------------------------------
// INICIALIZACAO AUTOMATICA
// ------------------------------------------------------------------
if (typeof window !== 'undefined') {
  // Expoe globalmente
  window.SINGEM_VERSION = APP_VERSION;
  window.SINGEM_BUILD = APP_BUILD;
  window.SINGEM_VERSION_INFO = VERSION_INFO;

  // Mostra banner no console
  showVersionBanner();

  // Verifica mudanca de versao
  checkVersionChange();

  // Renderiza rodape quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderVersionFooter);
  } else {
    setTimeout(renderVersionFooter, 100);
  }
}

export default VERSION_INFO;
