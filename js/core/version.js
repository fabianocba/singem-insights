/**
 * ══════════════════════════════════════════════════════════════════
 * SINGEM - ARQUIVO CENTRAL DE VERSÃO (js/core/version.js)
 * ══════════════════════════════════════════════════════════════════
 *
 * FONTE CANÔNICA DE VERSÃO - Atualizada automaticamente pelo CI
 *
 * A versão abaixo é sincronizada com js/core/version.json pelo
 * GitHub Actions em cada push para a branch principal.
 *
 * Padrão SemVer: MAJOR.MINOR.PATCH
 * - Correção de bug → PATCH: 0.0.2 → 0.0.3
 * - Nova funcionalidade → MINOR: 0.0.2 → 0.1.0
 * - Mudança estrutural → MAJOR: 0.0.2 → 1.0.0
 *
 * ══════════════════════════════════════════════════════════════════
 */

// @ts-check

/** Nome da aplicação */
export const APP_NAME = 'SINGEM';

/**
 * Versão semântica (MAJOR.MINOR.PATCH)
 * @GENERATED - Atualizada automaticamente pelo CI, não editar manualmente
 */
export const APP_VERSION = '0.0.2';

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
  version: APP_VERSION,
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
  fullName: 'SINGEM - Sistema de Controle de Material',
  organization: 'IF Baiano'
};

/**
 * Exibe versão no console de forma formatada
 */
export function logVersion() {
  console.log(
    `%c SINGEM %c v${APP_VERSION} %c build ${APP_BUILD} `,
    'background: #1e7e34; color: white; padding: 2px 6px; border-radius: 3px 0 0 3px;',
    'background: #28a745; color: white; padding: 2px 6px;',
    'background: #6c757d; color: white; padding: 2px 6px; border-radius: 0 3px 3px 0;'
  );
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
  window.SINGEM_VERSION = APP_VERSION;
  window.SINGEM_BUILD = APP_BUILD;
  window.VERSION_INFO = VERSION_INFO;
  window.APP_VERSION = APP_VERSION;
}
