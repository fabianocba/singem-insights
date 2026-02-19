/**
 * ══════════════════════════════════════════════════════════════════
 * IFDESK - ARQUIVO CENTRAL DE VERSÃO (js/core/version.js)
 * ══════════════════════════════════════════════════════════════════
 *
 * REGRA GLOBAL PERMANENTE DO PROJETO:
 * - Versão (MAJOR.MINOR.PATCH) → alterar apenas em mudanças funcionais
 * - Build → gerado automaticamente a cada reload (dinâmico)
 *
 * Padrão de incremento:
 * - Correção de bug → PATCH: v1.6.4 → v1.6.5
 * - Nova funcionalidade → MINOR: v1.6.4 → v1.7.0
 * - Mudança estrutural → MAJOR: v1.6.4 → v2.0.0
 *
 * ══════════════════════════════════════════════════════════════════
 */

// @ts-check

/** Nome da aplicação */
export const APP_NAME = 'IFDESK';

/**
 * Versão semântica (vMAJOR.MINOR.PATCH)
 * Incrementar manualmente apenas em mudanças funcionais reais
 */
export const APP_VERSION = 'v1.6.11';

/**
 * Gera build timestamp dinâmico (YYYY-MM-DD-HHMM)
 * @returns {string} Build no formato padrão
 */
function generateBuild() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}`;
}

/**
 * Build dinâmico - gerado automaticamente a cada reload
 * NÃO requer edição manual
 */
export const APP_BUILD = generateBuild();

/** Timestamp ISO completo */
export const BUILD_TIMESTAMP = new Date().toISOString();

/** String para exibição */
export const VERSION_DISPLAY = `${APP_NAME} ${APP_VERSION} • build ${APP_BUILD}`;

/** Query string para cache busting */
export const CACHE_BUSTER = '?v=' + APP_BUILD.replace(/-/g, '');

/**
 * Objeto VERSION - interface simplificada
 */
export const VERSION = {
  name: APP_NAME,
  version: APP_VERSION.replace('v', ''),
  get build() {
    return APP_BUILD;
  }
};

/**
 * Informações completas de versão
 */
export const VERSION_INFO = {
  name: APP_NAME,
  version: APP_VERSION,
  build: APP_BUILD,
  timestamp: BUILD_TIMESTAMP,
  fullName: 'IFDESK - Sistema de Controle de Material',
  organization: 'IF Baiano'
};

/**
 * Exibe versão no console de forma formatada (padrão obrigatório)
 */
export function logVersion() {
  console.log(`
IFDESK
v${APP_VERSION.replace('v', '')}
•
build ${APP_BUILD}
`);
}

/**
 * Atualiza elemento da UI com versão (se existir)
 */
export function renderVersionUI() {
  const el = document.getElementById('appVersion');
  if (el) {
    el.textContent = `${APP_NAME} ${APP_VERSION} • build ${APP_BUILD}`;
  }
}

// Expõe globalmente para uso em scripts não-módulo
if (typeof window !== 'undefined') {
  window.IFDESK_VERSION = APP_VERSION;
  window.IFDESK_BUILD = APP_BUILD;
  window.VERSION_INFO = VERSION_INFO;
  window.APP_VERSION = APP_VERSION;
}
