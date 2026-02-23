/**
 * 🔒 Auth Remember (modo servidor)
 * Em ambiente PostgreSQL/API não persistimos credenciais no navegador.
 */

let rememberedLogin = '';

export async function saveRememberOptions({ rememberUser, rememberPass, login, pass }) {
  rememberedLogin = rememberUser && login ? String(login) : '';
  void rememberPass;
  void pass;
}

export async function loadRememberOptions() {
  return { rememberUser: !!rememberedLogin, rememberPass: false, login: rememberedLogin, pass: '' };
}

export function clearRemembered() {
  rememberedLogin = '';
}

console.log('🔒 authRemember carregado (modo servidor, sem persistência local)');
