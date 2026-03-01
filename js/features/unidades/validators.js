import { validateRequired } from '../../shared/lib/validation.js';

export function validarUnidadeBasica({ razaoSocial, cnpj }) {
  return validateRequired([
    { name: 'razaoSocial', value: razaoSocial, message: 'Razão Social é obrigatória.' },
    { name: 'cnpj', value: cnpj, message: 'CNPJ é obrigatório.' }
  ]);
}
