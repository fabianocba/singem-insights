import { listarFornecedores, buscarFornecedorPorCnpj } from './api.js';
import { validarFornecedorBasico } from './validators.js';

export function createFornecedoresFeature() {
  return {
    listarFornecedores,
    buscarFornecedorPorCnpj,
    validarFornecedorBasico
  };
}
