/**
 * 🔒 Auth Remember - Lembrar usuário/senha com segurança local
 * - Login salvo em localStorage (texto simples)
 * - Senha salva somente criptografada (AES-GCM) com chave em IndexedDB (store 'config')
 * - Sem auto-login; apenas autopreenchimento
 */

const LOGIN_KEY = 'remember.login';
const PASS_KEY = 'remember.pass';
const FLAGS_KEY = 'remember.flags';
const REMEMBER_KEY_ID = 'rememberKey';
const CONFIG_STORE = 'config';

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64(uint8) {
  return btoa(String.fromCharCode(...uint8));
}

function fromBase64(str) {
  return new Uint8Array([...atob(str)].map((c) => c.charCodeAt(0)));
}

async function ensureDBReady() {
  if (!window.dbManager) {
    throw new Error('dbManager indisponível');
  }
  if (!window.dbManager.db) {
    if (window.dbManager.initSafe) {
      await window.dbManager.initSafe();
    } else {
      await window.dbManager.init();
    }
  }
}

async function getOrCreateRememberKey() {
  await ensureDBReady();
  try {
    const existing = await window.dbManager.get(CONFIG_STORE, REMEMBER_KEY_ID);
    if (existing && existing.key) {
      return await crypto.subtle.importKey('raw', fromBase64(existing.key), 'AES-GCM', true, ['encrypt', 'decrypt']);
    }
  } catch (e) {
    console.warn('Não foi possível obter chave existente, gerando nova.', e);
  }

  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', key));
  const keyB64 = toBase64(raw);
  await window.dbManager.update(CONFIG_STORE, {
    id: REMEMBER_KEY_ID,
    key: keyB64,
    dataCriacao: new Date().toISOString()
  });
  return key;
}

async function encrypt(text) {
  const key = await getOrCreateRememberKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
  return {
    iv: toBase64(iv),
    cipher: toBase64(new Uint8Array(cipher))
  };
}

async function decrypt(payload) {
  if (!payload || !payload.iv || !payload.cipher) {
    return null;
  }
  const key = await getOrCreateRememberKey();
  const iv = fromBase64(payload.iv);
  const cipher = fromBase64(payload.cipher);
  try {
    const plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
    return decoder.decode(plainBuffer);
  } catch (err) {
    console.warn('Falha ao descriptografar senha lembrada:', err);
    return null;
  }
}

export async function saveRememberOptions({ rememberUser, rememberPass, login, pass }) {
  const flags = { rememberUser: !!rememberUser, rememberPass: !!rememberPass };
  localStorage.setItem(FLAGS_KEY, JSON.stringify(flags));

  if (flags.rememberUser && login) {
    localStorage.setItem(LOGIN_KEY, login);
  } else {
    localStorage.removeItem(LOGIN_KEY);
  }

  if (flags.rememberPass && pass) {
    try {
      const payload = await encrypt(pass);
      localStorage.setItem(PASS_KEY, JSON.stringify(payload));
    } catch (err) {
      console.error('Erro ao salvar senha lembrada:', err);
      localStorage.removeItem(PASS_KEY);
    }
  } else {
    localStorage.removeItem(PASS_KEY);
  }
}

export async function loadRememberOptions() {
  const flags = JSON.parse(localStorage.getItem(FLAGS_KEY) || '{}');
  const rememberUser = !!flags.rememberUser;
  const rememberPass = !!flags.rememberPass;

  const login = rememberUser ? localStorage.getItem(LOGIN_KEY) || '' : '';
  let pass = '';

  if (rememberPass) {
    try {
      const payload = JSON.parse(localStorage.getItem(PASS_KEY) || 'null');
      if (payload) {
        const decrypted = await decrypt(payload);
        pass = decrypted || '';
      }
    } catch (err) {
      console.warn('Falha ao carregar senha lembrada:', err);
    }
  }

  return { rememberUser, rememberPass, login, pass };
}

export function clearRemembered() {
  localStorage.removeItem(LOGIN_KEY);
  localStorage.removeItem(PASS_KEY);
  localStorage.removeItem(FLAGS_KEY);
}

console.log('🔒 authRemember carregado');
