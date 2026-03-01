import { loginUsuario, logoutUsuario, obterUsuarioAtual } from './api.js';
import { validarLogin } from './validators.js';

export function createAuthFeature() {
  return {
    loginUsuario,
    logoutUsuario,
    obterUsuarioAtual,
    validarLogin
  };
}
