/**
 * Inicializacao da Nova Infraestrutura Enterprise
 * Exibe no console informacoes sobre os modulos implementados
 *
 * MODULO CONTROLADO - Nao executa automaticamente
 * Deve ser chamado explicitamente via initInfrastructureInfo()
 */

import { VERSION, renderVersionUI } from './core/version.js';

/**
 * Exibe informacoes da infraestrutura no console
 * So executa se window.DEBUG === true ou em modo desenvolvimento
 * @param {Object} options - Opcoes de configuracao
 * @param {boolean} options.verbose - Se true, exibe banner completo
 * @param {boolean} options.force - Se true, ignora verificacao de DEBUG
 */
export function initInfrastructureInfo(options = {}) {
  const { verbose = false, force = false } = options;

  // Verifica se deve executar
  const isDebug = window.DEBUG === true || window.location.hostname === 'localhost';
  if (!isDebug && !force) {
    return;
  }

  // Verifica bootstrap
  if (!window.__SINGEM_BOOTSTRAP_DONE__) {
    console.warn('[InfrastructureInfo] Aguardando bootstrap...');
    window.addEventListener('SINGEM:bootstrap:done', () => initInfrastructureInfo(options), { once: true });
    return;
  }

  // Versao compacta (padrao)
  console.log(
    `%c SINGEM %c ${VERSION.name} v${VERSION.version} (build ${VERSION.build}) `,
    'background: #1e7e34; color: white; padding: 2px 6px; border-radius: 3px 0 0 3px;',
    'background: #28a745; color: white; padding: 2px 6px; border-radius: 0 3px 3px 0;'
  );

  // Atualiza UI (se elemento existir)
  renderVersionUI();

  // Banner completo apenas em modo verbose
  if (verbose) {
    showFullBanner();
  }
}

/**
 * Exibe o banner completo da infraestrutura
 * Uso interno - chamado apenas em modo verbose
 */
function showFullBanner() {
  console.log(`
+--------------------------------------------------------------+
|  SINGEM - INFRAESTRUTURA ENTERPRISE                          |
+--------------------------------------------------------------+
|  Modulos:                                                     |
|   - js/core/eventBus.js      (pub/sub messaging)             |
|   - js/ui/feedback.js        (loading + toasts)              |
|   - js/workers/pdfWorker.js  (async PDF parsing)             |
|   - js/core/asyncQueue.js    (persistent queue)              |
|   - js/core/repository.js    (data layer + validation)       |
+--------------------------------------------------------------+
|  Eventos: ne.salva, nf.salva, pdf.parse:done, queue.task:*   |
+--------------------------------------------------------------+
  `);
}

/**
 * Verifica status da infraestrutura
 * @returns {Object} Status dos modulos
 */
export function getInfrastructureStatus() {
  return {
    version: VERSION,
    bootstrapDone: !!window.__SINGEM_BOOTSTRAP_DONE__,
    repository: !!window.repository,
    dbManager: !!window.dbManager?.db,
    eventBus: typeof window.eventBus !== 'undefined',
    timestamp: new Date().toISOString()
  };
}

// Exporta VERSION para compatibilidade
export { VERSION };
