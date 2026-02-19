/* logger.js
 * Logger simples e estruturado para o parser refinado.
 * Captura anchors (trecho de texto usado para extrair) para cada campo.
 */
(function (global) {
  function makeAnchor(text, page, contextStart, contextEnd) {
    const snippet = (text || '').slice(contextStart || 0, contextEnd || Math.min(200, (text || '').length));
    return { snippet, page, contextStart, contextEnd };
  }

  class RefineLogger {
    constructor() {
      this.info = [];
      this.warnings = [];
      this.errors = [];
      this.anchors = [];
    }
    infof(msg, meta) {
      this.info.push({ msg, meta });
    }
    warn(msg, meta) {
      this.warnings.push({ msg, meta });
    }
    error(msg, meta) {
      this.errors.push({ msg, meta });
    }
    anchor(text, page, cs, ce) {
      const a = makeAnchor(text, page, cs, ce);
      this.anchors.push(a);
      return a;
    }
    dump() {
      return { info: this.info, warnings: this.warnings, errors: this.errors, anchors: this.anchors };
    }
  }

  global.RefineLogger = RefineLogger;
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined') {
    module.exports = RefineLogger;
  }
})(this);
