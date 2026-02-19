/**
 * ══════════════════════════════════════════════════════════════════
 * IFDESK - ARQUIVO DE VERSÃO (COMPAT. LEGADO)
 * ══════════════════════════════════════════════════════════════════
 *
 * ⚠️  ARQUIVO LEGADO - Use js/core/version.js como fonte canônica
 *
 * Este arquivo re-exporta de js/core/version.js para compatibilidade.
 *
 * ══════════════════════════════════════════════════════════════════
 */

// Importa tudo de js/core/version.js (fonte canônica)
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
 * Exibe banner de versão no console
 */
export function showVersionBanner() {
  console.log(
    '\n' +
      '╔═══════════════════════════════════════════════════════════════╗\n' +
      '║                         IFDESK                                 ║\n' +
      '║               Sistema de Controle de Material                  ║\n' +
      '╠═══════════════════════════════════════════════════════════════╣\n' +
      '║  Versão: ' +
      APP_VERSION.padEnd(10) +
      '                                        ║\n' +
      '║  Build:  ' +
      APP_BUILD.padEnd(20) +
      '                             ║\n' +
      '╚═══════════════════════════════════════════════════════════════╝\n'
  );
}

/**
 * Cria e insere o rodapé de versão na página
 */
export function renderVersionFooter() {
  // Remove rodapé anterior se existir
  const existing = document.getElementById('ifdesk-version-footer');
  if (existing) {
    existing.remove();
  }

  const footer = document.createElement('div');
  footer.id = 'ifdesk-version-footer';
  footer.innerHTML =
    '<span class="v-name">' +
    APP_NAME +
    '</span> ' +
    '<span class="v-version">' +
    APP_VERSION +
    '</span> ' +
    '<span class="v-sep">•</span> ' +
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
    '#ifdesk-version-footer .v-version { color: #4fc3f7; font-weight: 600; }' +
    '#ifdesk-version-footer .v-build { color: #81c784; }' +
    '#ifdesk-version-footer .v-sep { color: #555; }' +
    '#ifdesk-version-footer:hover { background: linear-gradient(135deg, #1f1f3a 0%, #1a2744 100%); }';
  document.head.appendChild(style);
}

/**
 * Verifica se versão mudou e limpa cache
 */
function checkVersionChange() {
  const STORAGE_KEY = 'ifdesk-version-build';
  const stored = localStorage.getItem(STORAGE_KEY);
  const current = APP_VERSION + '-' + APP_BUILD;

  if (stored !== current) {
    if (stored) {
      console.log('🔄 Versão atualizada: ' + stored + ' → ' + current);
    }
    localStorage.setItem(STORAGE_KEY, current);

    // Atualiza Service Workers se disponível
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

// ══════════════════════════════════════════════════════════════════
// INICIALIZAÇÃO AUTOMÁTICA
// ══════════════════════════════════════════════════════════════════
if (typeof window !== 'undefined') {
  // Expõe globalmente
  window.IFDESK_VERSION = APP_VERSION;
  window.IFDESK_BUILD = APP_BUILD;
  window.IFDESK_VERSION_INFO = VERSION_INFO;

  // Mostra banner no console
  showVersionBanner();

  // Verifica mudança de versão
  checkVersionChange();

  // Renderiza rodapé quando DOM estiver pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderVersionFooter);
  } else {
    setTimeout(renderVersionFooter, 100);
  }
}

export default VERSION_INFO;
