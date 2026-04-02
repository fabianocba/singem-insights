export function parseMoneyInputBR(value) {
  let s = String(value ?? '').trim();
  if (!s) {
    return 0;
  }

  s = s.replace(/\s+/g, '').replace(/^R\$/i, '');

  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.');
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function money2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}

export function fmtMoneyBR(n) {
  return money2(n).toFixed(2).replace('.', ',');
}
