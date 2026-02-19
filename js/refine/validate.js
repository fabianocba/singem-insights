/* validate.js
 * Validações: DV CNPJ/CPF, chave 44 (mód 11), somas
 */
(function (global) {
  // eslint-disable-next-line no-undef
  const n = global.refineNormalize || (typeof require !== 'undefined' ? require('./normalize') : {});

  function mod11Chave44(chave) {
    if (!chave || chave.length !== 44) {
      return false;
    }
    // basic mod 11 verification (DANFE key uses mod 11 on check digit?)
    // We'll validate by recomputing last digit from previous 43 digits
    const digits = chave.split('').map(Number);
    const dv = digits[43];
    const body = digits.slice(0, 43).reverse();
    let m = 2,
      s = 0;
    for (const d of body) {
      s += d * m;
      m = m === 9 ? 2 : m + 1;
    }
    const r = s % 11;
    const calc = r === 0 || r === 1 ? 0 : 11 - r;
    return calc === dv;
  }

  function validCNPJ(cnpj) {
    const s = n.onlyDigits(cnpj) || '';
    if (s.length !== 14) {
      return false;
    }
    const calc = (t) => {
      const size = t.length;
      let sum = 0,
        pos = size - 7;
      for (let i = size; i >= 1; i--) {
        sum += t[size - i] * pos;
        pos--;
        if (pos < 2) {
          pos = 9;
        }
      }
      const res = sum % 11;
      return res < 2 ? 0 : 11 - res;
    };
    const arr = s.split('').map(Number);
    const d1 = calc(arr.slice(0, 12));
    const d2 = calc(arr.slice(0, 12).concat([d1]));
    return d1 === arr[12] && d2 === arr[13];
  }

  function validCPF(cpf) {
    const s = n.onlyDigits(cpf) || '';
    if (s.length !== 11) {
      return false;
    }
    const arr = s.split('').map(Number);
    const calc = (len) => {
      let sum = 0;
      for (let i = 0; i < len; i++) {
        sum += arr[i] * (len + 1 - i);
      }
      const r = sum % 11;
      return r < 2 ? 0 : 11 - r;
    };
    return calc(9) === arr[9] && calc(10) === arr[10];
  }

  function approxEqual(a, b, tolerancePercent = 0.5) {
    if (a === null || a === undefined || b === null || b === undefined) {
      return false;
    }
    const tol = Math.abs(b) * (tolerancePercent / 100);
    return Math.abs(a - b) <= tol;
  }

  global.refineValidate = { mod11Chave44, validCNPJ, validCPF, approxEqual };
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined') {
    module.exports = global.refineValidate;
  }
})(this);
