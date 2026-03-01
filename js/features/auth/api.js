import apiClient from '../../services/apiClient.js';

export async function loginUsuario(login, senha) {
  return apiClient.login(login, senha);
}

export async function logoutUsuario() {
  return apiClient.logout();
}

export async function obterUsuarioAtual() {
  return apiClient.getMe();
}
