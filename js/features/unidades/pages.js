import { listarUnidades, salvarUnidade, excluirUnidade } from './api.js';
import { validarUnidadeBasica } from './validators.js';

export function createUnidadesFeature() {
  return {
    listarUnidades,
    salvarUnidade,
    excluirUnidade,
    validarUnidadeBasica
  };
}
