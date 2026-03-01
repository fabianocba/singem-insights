import { validateRequired } from '../../shared/lib/validation.js';

export function validarFornecedorBasico({ nome, cnpj }) {
  return validateRequired([
    { name: 'nome', value: nome, message: 'Nome do fornecedor é obrigatório.' },
    { name: 'cnpj', value: cnpj, message: 'CNPJ do fornecedor é obrigatório.' }
  ]);
}
