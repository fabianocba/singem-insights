import { validateRequired } from '../../shared/lib/validation.js';

export function validarLogin({ login, senha }) {
  return validateRequired([
    { name: 'login', value: login, message: 'Login é obrigatório.' },
    { name: 'senha', value: senha, message: 'Senha é obrigatória.' }
  ]);
}
