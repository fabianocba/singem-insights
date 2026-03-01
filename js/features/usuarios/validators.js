import { validateRequired } from '../../shared/lib/validation.js';

export function validarUsuarioBasico({ nome, login }) {
  return validateRequired([
    { name: 'nome', value: nome, message: 'Nome é obrigatório.' },
    { name: 'login', value: login, message: 'Login é obrigatório.' }
  ]);
}
