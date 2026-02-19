/* normalize.js
 * Normalização de números, datas, CNPJ/CPF, chave 44
 */
(function (global) {
  const utils = {};

  utils.parseNumber = function (s) {
    if (s === null || s === undefined) {
      return null;
    }
    s = String(s).replace(/\s+/g, '');
    // remove currency
    s = s.replace(/R\$|\$/g, '');
    // heurística: if both '.' and ',' exist, decide which is decimal by last occurrence
    const hasDot = s.indexOf('.') >= 0;
    const hasComma = s.indexOf(',') >= 0;
    if (hasDot && hasComma) {
      // last symbol likely decimal separator
      const lastDot = s.lastIndexOf('.');
      const lastComma = s.lastIndexOf(',');
      if (lastComma > lastDot) {
        s = s.replace(/\./g, '');
        s = s.replace(/,/g, '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (hasComma && !hasDot) {
      s = s.replace(/\./g, '');
      s = s.replace(/,/g, '.');
    } else {
      s = s.replace(/,/g, '');
    }
    const n = Number(s);
    return isNaN(n) ? null : n;
  };

  utils.normalizeDate = function (s) {
    if (!s) {
      return null;
    }
    s = String(s).trim();
    // common formats
    // dd/mm/yyyy or dd-mm-yyyy
    const m1 = s.match(/(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
    if (m1) {
      const d = parseInt(m1[1], 10);
      const m = parseInt(m1[2], 10) - 1;
      let y = parseInt(m1[3], 10);
      if (y < 100) {
        y += y > 50 ? 1900 : 2000;
      }
      const iso = new Date(y, m, d).toISOString().slice(0, 10);
      return iso;
    }
    // yyyy-mm-dd
    const m2 = s.match(/(\d{4})[-](\d{1,2})[-](\d{1,2})/);
    if (m2) {
      return new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3])).toISOString().slice(0, 10);
    }
    return null;
  };

  utils.onlyDigits = function (s) {
    if (!s) {
      return '';
    }
    return String(s).replace(/\D+/g, '');
  };

  utils.maskedCnpjCpf = function (s) {
    if (!s) {
      return { masked: null, digits: null };
    }
    const d = utils.onlyDigits(s);
    if (d.length === 11) {
      return { masked: d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'), digits: d };
    }
    if (d.length === 14) {
      return { masked: d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5'), digits: d };
    }
    return { masked: s, digits: d };
  };

  utils.normalizeChave44 = function (s) {
    if (!s) {
      return null;
    }
    const d = utils.onlyDigits(s);
    return d.length === 44 ? d : null;
  };

  global.refineNormalize = utils;
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined') {
    module.exports = utils;
  }
})(this);
