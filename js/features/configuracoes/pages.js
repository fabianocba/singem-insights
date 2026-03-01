import { carregarConfiguracoes, salvarConfiguracoes } from './api.js';
import { validarConfiguracoes } from './validators.js';

export function createConfiguracoesFeature() {
  return {
    carregarConfiguracoes,
    salvarConfiguracoes,
    validarConfiguracoes
  };
}
