/**
 * IFDESK - Sanitização de HTML
 * @module utils/sanitize
 *
 * Funções para prevenir XSS e sanitizar conteúdo HTML.
 * Usar em novos renders dinâmicos de conteúdo.
 */

// @ts-check

/**
 * Escapa caracteres especiais HTML
 * @param {string} str - String a escapar
 * @returns {string} String escapada
 */
export function escapeHTML(str) {
  if (!str || typeof str !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Template literal tag para HTML seguro
 * @param {TemplateStringsArray} strings - Strings literais
 * @param {...any} values - Valores a interpolar
 * @returns {string} HTML sanitizado
 *
 * @example
 * const userInput = '<script>alert("xss")</script>';
 * const html = safeHTML`<div>${userInput}</div>`;
 * // Resultado: '<div>&lt;script&gt;alert("xss")&lt;/script&gt;</div>'
 */
export function safeHTML(strings, ...values) {
  let result = strings[0];

  for (let i = 0; i < values.length; i++) {
    result += escapeHTML(String(values[i])) + strings[i + 1];
  }

  return result;
}

/**
 * Remove tags HTML perigosas
 * @param {string} html - HTML a sanitizar
 * @param {string[]} [allowedTags] - Tags permitidas
 * @returns {string} HTML sanitizado
 */
export function stripDangerousTags(html, allowedTags = ['b', 'i', 'u', 'em', 'strong', 'p', 'br', 'span']) {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const div = document.createElement('div');
  div.innerHTML = html;

  // Remove scripts
  const scripts = div.querySelectorAll('script, style, iframe, object, embed');
  scripts.forEach((el) => el.remove());

  // Remove event handlers
  const allElements = div.querySelectorAll('*');
  allElements.forEach((el) => {
    Array.from(el.attributes).forEach((attr) => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Remove tags não permitidas
  if (allowedTags && allowedTags.length > 0) {
    const selector = `*:not(${allowedTags.join(',')})`;
    const forbidden = div.querySelectorAll(selector);
    forbidden.forEach((el) => {
      const text = document.createTextNode(el.textContent || '');
      el.parentNode?.replaceChild(text, el);
    });
  }

  return div.innerHTML;
}

/**
 * Sanitiza URL para prevenir javascript: e data:
 * @param {string} url - URL a sanitizar
 * @returns {string|null} URL segura ou null
 */
export function sanitizeURL(url) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const trimmed = url.trim().toLowerCase();

  // Bloqueia protocolos perigosos
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    console.warn('⚠️ URL bloqueada por segurança:', url);
    return null;
  }

  return url;
}

/**
 * Sanitiza atributos HTML
 * @param {Object} attributes - Objeto com atributos
 * @returns {Object} Atributos sanitizados
 */
export function sanitizeAttributes(attributes) {
  if (!attributes || typeof attributes !== 'object') {
    return {};
  }

  const safe = {};
  const dangerous = ['onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout'];

  for (const [key, value] of Object.entries(attributes)) {
    const lowerKey = key.toLowerCase();

    // Bloqueia event handlers
    if (dangerous.includes(lowerKey) || lowerKey.startsWith('on')) {
      console.warn('⚠️ Atributo bloqueado:', key);
      continue;
    }

    // Sanitiza URLs em href e src
    if (lowerKey === 'href' || lowerKey === 'src') {
      const sanitized = sanitizeURL(value);
      if (sanitized) {
        safe[key] = sanitized;
      }
    } else {
      safe[key] = value;
    }
  }

  return safe;
}

/**
 * Cria elemento HTML seguro
 * @param {string} tag - Tag do elemento
 * @param {Object} [attributes] - Atributos
 * @param {string|Node[]} [content] - Conteúdo
 * @returns {HTMLElement} Elemento criado
 */
export function createSafeElement(tag, attributes = {}, content = '') {
  const element = document.createElement(tag);

  // Adiciona atributos sanitizados
  const safeAttrs = sanitizeAttributes(attributes);
  for (const [key, value] of Object.entries(safeAttrs)) {
    element.setAttribute(key, String(value));
  }

  // Adiciona conteúdo
  if (Array.isArray(content)) {
    content.forEach((child) => {
      if (child instanceof Node) {
        element.appendChild(child);
      }
    });
  } else if (content) {
    element.textContent = String(content);
  }

  return element;
}

/**
 * Valida e sanitiza JSON
 * @param {string} jsonString - String JSON
 * @returns {Object|null} Objeto parseado ou null
 */
export function safeJSONParse(jsonString) {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.warn('⚠️ Erro ao fazer parse de JSON:', error);
    return null;
  }
}

console.info('✅ Módulo de sanitização carregado');
