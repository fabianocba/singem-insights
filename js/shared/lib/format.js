export function toDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

export function toLowerSafe(value) {
  return String(value || '').toLowerCase();
}

export function moneyBR(value) {
  const number = Number(value || 0);
  return number.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
