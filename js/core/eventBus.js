/**
 * Event Bus - Sistema de mensageria interna
 * Desacopla módulos através de eventos customizados
 */

const bus = new EventTarget();

/**
 * Emite um evento no bus
 * @param {string} type - Tipo do evento (ex: "ne.salva", "pdf.parse:start")
 * @param {Object} detail - Dados do evento
 */
export const emit = (type, detail = {}) => {
  const event = new CustomEvent(type, { detail });
  bus.dispatchEvent(event);
  console.log(`[EventBus] ${type}`, detail);
};

/**
 * Registra listener para um evento
 * @param {string} type - Tipo do evento
 * @param {Function} fn - Callback
 */
export const on = (type, fn) => {
  bus.addEventListener(type, fn);
};

/**
 * Remove listener de um evento
 * @param {string} type - Tipo do evento
 * @param {Function} fn - Callback
 */
export const off = (type, fn) => {
  bus.removeEventListener(type, fn);
};

/**
 * Emite evento único (remove listener após primeira execução)
 * @param {string} type - Tipo do evento
 * @param {Function} fn - Callback
 */
export const once = (type, fn) => {
  bus.addEventListener(type, fn, { once: true });
};

// Log de inicialização
console.log('[EventBus] Sistema de eventos inicializado');
