/* score.js
 * Pontuação de confiança por campo e agregação
 */
(function (global) {
  function fieldConfidence(fieldValue, _method) {
    if (fieldValue === null || fieldValue === undefined) {
      return 0;
    }
    // heurísticas simples: numeric exact > 0.95, parsed date >0.9, string with anchor >0.85
    if (typeof fieldValue === 'number') {
      return 0.98;
    }
    if (typeof fieldValue === 'string' && /\d{4}-\d{2}-\d{2}/.test(fieldValue)) {
      return 0.92;
    }
    if (typeof fieldValue === 'object') {
      return 0.9;
    }
    return 0.8;
  }

  function aggregate(confMap) {
    const vals = Object.values(confMap).filter((v) => typeof v === 'number');
    if (!vals.length) {
      return 0;
    }
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.max(0, Math.min(1, sum / vals.length));
  }

  global.refineScore = { fieldConfidence, aggregate };
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined') {
    module.exports = global.refineScore;
  }
})(this);
