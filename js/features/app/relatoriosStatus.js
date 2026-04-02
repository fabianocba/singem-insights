/**
 * Helpers puros de status para controle de saldos e relatórios.
 */

/**
 * Retorna cor do status geral de saldo
 * @param {string} status
 */
export function getStatusColor(status) {
  const cores = {
    pendente: 'rgba(237, 137, 54, 0.9)',
    parcial: 'rgba(66, 153, 225, 0.9)',
    completo: 'rgba(72, 187, 120, 0.9)'
  };
  return cores[status] || 'rgba(160, 174, 192, 0.9)';
}

/**
 * Retorna label traduzida do status
 * @param {string} status
 */
export function getStatusLabel(status) {
  const labels = {
    pendente: '⏳ Pendente',
    parcial: '🔄 Parcial',
    completo: '✅ Completo'
  };
  return labels[status] || status;
}

/**
 * Retorna cor do status do saldo do item
 * @param {string} status
 */
export function getSaldoStatusColor(status) {
  const cores = {
    pendente: '#ed8936',
    parcial: '#4299e1',
    completo: '#48bb78'
  };
  return cores[status] || '#a0aec0';
}
