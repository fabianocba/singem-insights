import { listarUsuarios, salvarUsuario, excluirUsuario } from './api.js';
import { validarUsuarioBasico } from './validators.js';

export function createUsuariosFeature() {
  return {
    listarUsuarios,
    salvarUsuario,
    excluirUsuario,
    validarUsuarioBasico
  };
}
