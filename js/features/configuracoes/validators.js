export function validarConfiguracoes(config = {}) {
  const errors = [];

  if (config.intervaloSync !== undefined && Number(config.intervaloSync) <= 0) {
    errors.push('Intervalo de sincronização deve ser maior que zero.');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
