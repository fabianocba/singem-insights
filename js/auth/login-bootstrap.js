import { loadAppRuntime } from '../app-runtime-loader.js';
import { LOGIN_SHELL_TEMPLATE } from '../ui/loginShellTemplate.js';
import { fetchGovBrStatus, fetchSerproIdStatus, getApiBase, loginLocal } from './login-api.js';

function onDomReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback, { once: true });
    return;
  }

  callback();
}

function $(id) {
  return document.getElementById(id);
}

function setBootState(state) {
  document.body.classList.remove('login-booting', 'login-ready', 'login-error');
  document.body.classList.add(state);
}

function setSplashMessage(message) {
  const splashText = $('loginSplashText');
  if (splashText) {
    splashText.textContent = message;
  }
}

function showSplash(message) {
  const splash = $('loginSplash');
  if (!splash) {
    return;
  }

  if (message) {
    setSplashMessage(message);
  }

  splash.hidden = false;
  splash.classList.remove('is-hidden');
}

function hideSplash() {
  const splash = $('loginSplash');
  if (!splash) {
    return;
  }

  splash.classList.add('is-hidden');
  window.setTimeout(() => {
    splash.hidden = true;
  }, 220);
}

function showLoginShell() {
  const loginApp = $('login-app');
  if (!loginApp) {
    return;
  }

  loginApp.hidden = false;
  window.requestAnimationFrame(() => {
    loginApp.classList.add('is-ready');
    hideSplash();
    setBootState('login-ready');
  });
}

function showLoginError(message) {
  const errorDiv = $('loginError');
  if (!errorDiv) {
    return;
  }

  errorDiv.textContent = message;
  errorDiv.classList.remove('hidden');
  errorDiv.style.display = 'block';
  errorDiv.setAttribute('aria-hidden', 'false');
}

function clearLoginError() {
  const errorDiv = $('loginError');
  if (!errorDiv) {
    return;
  }

  errorDiv.textContent = '';
  errorDiv.classList.add('hidden');
  errorDiv.style.display = 'none';
  errorDiv.setAttribute('aria-hidden', 'true');
}

function formatLoginError(error) {
  if (error?.status === 401) {
    return 'Usuário ou senha inválidos.';
  }

  if (error?.status === 405) {
    return 'Método não permitido no login. Verifique o proxy de produção para /api/auth/login.';
  }

  if (error?.status === 429) {
    return 'Muitas tentativas de autenticação. Aguarde alguns instantes e tente novamente.';
  }

  return error?.message || 'Falha ao autenticar. Tente novamente.';
}

function bindPasswordToggle() {
  const toggle = $('toggleLoginSenha');
  const input = $('loginSenha');
  const icon = $('toggleLoginSenhaIcon');
  if (!toggle || !input || !icon) {
    return;
  }

  toggle.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', isPassword ? 'true' : 'false');
    icon.textContent = isPassword ? '🙈' : '👁';
  });
}

function bindRecoveryButton() {
  const button = $('btnRecuperarSenha');
  if (!button) {
    return;
  }

  button.addEventListener('click', () => {
    showLoginError('Recuperação de senha: procure o administrador do sistema.');
  });
}

function bindRedirect(button, url) {
  if (!button) {
    return;
  }

  button.onclick = (event) => {
    event.preventDefault();
    window.location.href = url;
  };
}

function disableProvider(button, warning) {
  if (button) {
    button.classList.add('disabled');
  }

  if (warning) {
    warning.classList.add('show');
  }
}

function hideProvider(button, separator) {
  if (button) {
    button.classList.add('disabled');
    button.style.display = 'none';
  }

  if (separator) {
    separator.style.display = 'none';
  }
}

async function bootstrapGovBr(base) {
  const button = $('btnGovBr');
  const warning = $('govbrUnavailable');
  if (!button) {
    return;
  }

  try {
    const data = await fetchGovBrStatus();
    if (data.sucesso && data.govbr && data.govbr.habilitado) {
      bindRedirect(button, base + '/api/auth/govbr/login');
      return;
    }

    disableProvider(button, warning);
  } catch {
    disableProvider(button, warning);
  }
}

async function bootstrapSerproID(base) {
  const button = $('btnSerproID');
  const warning = $('serproidUnavailable');
  const separator = $('serproidSeparator');
  if (!button) {
    return;
  }

  try {
    const data = await fetchSerproIdStatus();
    if (data.sucesso && data.serproid && data.serproid.habilitado && data.serproid.configurado) {
      bindRedirect(button, base + '/api/auth/serproid/login');
      return;
    }

    if (data.sucesso && data.serproid && data.serproid.habilitado && !data.serproid.configurado) {
      disableProvider(button, warning);
      return;
    }

    hideProvider(button, separator);
  } catch {
    hideProvider(button, separator);
  }
}

async function bootstrapProviders() {
  const base = getApiBase();
  await Promise.all([bootstrapGovBr(base), bootstrapSerproID(base)]);
}

function normalizeCredential(value) {
  return String(value || '').trim();
}

async function handleLoginSubmit(event) {
  event.preventDefault();

  clearLoginError();

  const form = $('loginForm');
  const btnLogin = $('btnLogin');
  const login = normalizeCredential(form?.elements?.username?.value);
  const senha = String(form?.elements?.password?.value || '');

  if (!login || !senha) {
    showLoginError('Informe usuário e senha para continuar.');
    return;
  }

  if (btnLogin) {
    btnLogin.disabled = true;
    btnLogin.textContent = 'Autenticando...';
  }

  try {
    await loginLocal(login, senha);

    showSplash('Carregando ambiente da aplicação...');
    const loginApp = $('login-app');
    if (loginApp) {
      loginApp.classList.remove('is-ready');
    }

    await loadAppRuntime();

    if (loginApp) {
      loginApp.hidden = true;
    }

    const appRoot = $('app');
    if (appRoot) {
      appRoot.hidden = false;
    }

    hideSplash();
  } catch (error) {
    showLoginError(formatLoginError(error));
    hideSplash();
  } finally {
    if (btnLogin) {
      btnLogin.disabled = false;
      btnLogin.innerHTML = '<span>Entrar</span><span class="login-submit__arrow" aria-hidden="true">→</span>';
    }
  }
}

function bindLoginForm() {
  const form = $('loginForm');
  if (!form) {
    return;
  }

  form.setAttribute('action', '/api/auth/login');
  form.setAttribute('method', 'POST');
  form.addEventListener('submit', handleLoginSubmit);
}

async function resetLegacyRuntimeCaches() {
  if (!('serviceWorker' in navigator) || !('caches' in window)) {
    return;
  }

  const flag = 'singem.login.cache-reset.v1';
  if (sessionStorage.getItem(flag) === '1') {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  if (registrations.length === 0) {
    sessionStorage.setItem(flag, '1');
    return;
  }

  await Promise.all(registrations.map((reg) => reg.unregister()));
  const cacheKeys = await caches.keys();
  await Promise.all(cacheKeys.map((key) => caches.delete(key)));
  sessionStorage.setItem(flag, '1');
}

async function bootstrapLogin() {
  setBootState('login-booting');
  showSplash('Preparando autenticação...');

  const loginApp = $('login-app');
  if (!loginApp) {
    throw new Error('Container de login não encontrado.');
  }

  window.__API_BASE_URL__ = window.__API_BASE_URL__ || window.CONFIG?.api?.baseUrl || window.location.origin;

  await resetLegacyRuntimeCaches().catch((error) => {
    console.warn('[login-bootstrap] Falha ao limpar caches legados:', error?.message || error);
  });

  loginApp.innerHTML = LOGIN_SHELL_TEMPLATE;

  bindPasswordToggle();
  bindRecoveryButton();
  bindLoginForm();
  await bootstrapProviders();

  showLoginShell();
}

onDomReady(() => {
  void bootstrapLogin().catch((error) => {
    console.error('[login-bootstrap] Falha ao inicializar login:', error);
    setBootState('login-error');
    showLoginError('Falha ao iniciar a tela de login. Recarregue a página.');
    showLoginShell();
  });
});
