import * as asyncQueue from '../../core/asyncQueue.js';
import * as authRemember from '../../core/authRemember.js';
import { initPremiumShell } from '../../ui/premiumShell.js';
import { renderSidebar } from '../../core/accessScope.js';
import { createBrandImage, replaceElementChildren } from './versionBranding.js';

export async function init(app) {
  try {
    console.log('🚀 Iniciando aplicação SINGEM...');

    app.setupCriticalAuthListeners();
    app.setupImageFallbacks();

    const apiClient = (await import('../../services/apiClient.js')).default;
    const health = await apiClient.healthCheck();
    if (!health.online) {
      throw new Error('API PostgreSQL indisponível. Inicie o server Node/VPS antes de usar o sistema.');
    }
    console.log('✅ API PostgreSQL disponível');

    app.setupInfrastructureListeners();
    console.log('✅ Event listeners da infraestrutura configurados');

    asyncQueue.run().catch((err) => {
      console.error('❌ Erro ao processar fila:', err);
    });

    console.log('ℹ️ Restauração de diretório externo desativada (modo banco/API).');

    await app.carregarDadosUnidade();
    console.log('✅ Dados da unidade carregados');

    await app.verificarUsuariosCadastrados();
    await app.verificarSessao();
    await app.handleOAuthCallback();

    app.setupEventListeners();
    console.log('✅ Event listeners configurados');

    initPremiumShell(app);

    await app.restaurarDadosLembrados();

    if (!app.usuarioLogado) {
      app.showScreen('loginScreen');
    }
    console.log('✅ Aplicação iniciada com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar aplicação:', error);
    app.setupCriticalAuthListeners();
    app.showError('Erro ao inicializar a aplicação: ' + error.message);
  }
}

export function setupCriticalAuthListeners(app) {
  if (!app._onLoginSubmitHandler) {
    app._onLoginSubmitHandler = (event) => {
      event.preventDefault();
      app.realizarLogin(event);
    };
  }

  const loginForm = document.getElementById('loginForm') || document.getElementById('formLogin');
  if (!loginForm) {
    return;
  }

  loginForm.removeEventListener('submit', app._onLoginSubmitHandler);
  loginForm.addEventListener('submit', app._onLoginSubmitHandler);
}

export async function verificarSessao(app) {
  const token = window.__SINGEM_AUTH?.accessToken;
  if (!token) {
    console.log('ℹ️ Nenhum token em memória para restauração de sessão.');
    return;
  }

  try {
    const apiClient = (await import('../../services/apiClient.js')).default;
    const response = await apiClient.get('/api/auth/me');

    if (!(response?.sucesso && response?.usuario)) {
      throw new Error('Resposta inválida de /api/auth/me');
    }

    app.usuarioLogado = { ...response.usuario };
    app.authProvider = response.usuario.authProvider || 'local';

    if (window.settingsUsuarios) {
      window.settingsUsuarios.usuarioLogado = { ...app.usuarioLogado };
    }

    renderSidebar(app.usuarioLogado);
    app.atualizarUsuarioHeader();
    app.showScreen('homeScreen');
    console.log('✅ Sessão restaurada com token em memória.');
  } catch (error) {
    console.warn('[AUTH] Falha ao restaurar sessão:', error?.message || error);
    if (window.__SINGEM_AUTH) {
      window.__SINGEM_AUTH.accessToken = null;
      window.__SINGEM_AUTH.refreshToken = null;
    }
  }
}

export async function handleOAuthCallback(app) {
  const urlParams = new URLSearchParams(window.location.search);
  const accessToken = urlParams.get('accessToken');
  const refreshToken = urlParams.get('refreshToken');
  const error = urlParams.get('error');
  const provider = urlParams.get('provider') || 'oauth';

  if (accessToken || refreshToken || error) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }

  if (error) {
    const decodedError = decodeURIComponent(error);
    console.error('[OAuth] Erro no callback:', decodedError);

    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
      errorDiv.textContent = decodedError;
      errorDiv.classList.remove('hidden');
    }
    return;
  }

  if (accessToken && refreshToken) {
    console.log('[OAuth] Tokens recebidos, autenticando...');

    try {
      if (window.__SINGEM_AUTH) {
        window.__SINGEM_AUTH.accessToken = accessToken;
        window.__SINGEM_AUTH.refreshToken = refreshToken;
      }

      const apiClient = (await import('../../services/apiClient.js')).default;
      const response = await apiClient.get('/api/auth/me');

      if (response.sucesso && response.usuario) {
        app.usuarioLogado = { ...response.usuario };
        app.authProvider = response.usuario.authProvider || provider;

        if (window.settingsUsuarios) {
          window.settingsUsuarios.usuarioLogado = { ...app.usuarioLogado };
        }

        console.log(`[OAuth] ✅ Login via ${provider}:`, app.usuarioLogado.nome);

        renderSidebar(app.usuarioLogado);
        app.atualizarUsuarioHeader();
        app.showScreen('homeScreen');
        app.showSuccess(`Bem-vindo(a), ${app.usuarioLogado.nome}!`);
      } else {
        throw new Error('Falha ao obter dados do usuário');
      }
    } catch (err) {
      console.error('[OAuth] Erro ao validar token:', err);
      if (window.__SINGEM_AUTH) {
        window.__SINGEM_AUTH.accessToken = null;
        window.__SINGEM_AUTH.refreshToken = null;
      }
      app.showError('Sessão inválida. Faça login novamente.');
    }
  }
}

export async function verificarUsuariosCadastrados() {
  try {
    if (!window.repository) {
      return;
    }

    const temUsuarios = await window.repository.hasUsuarios();
    const loginHelp = document.querySelector('.login-help');

    if (temUsuarios) {
      if (loginHelp) {
        loginHelp.hidden = true;
        loginHelp.open = false;
      }
    } else if (loginHelp) {
      loginHelp.hidden = false;
      loginHelp.open = true;
    }
  } catch (error) {
    console.warn('[VERIF_USUARIOS] Erro ao verificar usuários:', error?.message || error);
  }
}

export async function carregarDadosUnidade() {
  try {
    const unidade = await window.getUnidadeOrcamentaria();
    const loginLogo = document.querySelector('.login-logo');
    const headerLogo = document.querySelector('.logo h1');

    if (unidade && unidade.razaoSocial) {
      const loginNome = document.getElementById('loginUnidadeNome');
      const loginInfo = document.getElementById('loginUnidadeInfo');

      if (loginNome) {
        loginNome.textContent = `Bem-vindo(a) ao ${unidade.razaoSocial}`;
      }

      if (loginInfo) {
        loginInfo.textContent = `CNPJ: ${unidade.cnpj || 'Não cadastrado'}`;
      }

      if (loginLogo && unidade.logomarca) {
        replaceElementChildren(loginLogo, [createBrandImage(unidade.logomarca, 'Logo da Unidade')]);
      } else if (loginLogo) {
        replaceElementChildren(loginLogo, [
          createBrandImage('img/marca-if-baiano-campus-guanambi-horizontal.jpg', 'IF Baiano')
        ]);
      }

      const logoSubtitle = document.querySelector('.logo p');
      if (logoSubtitle) {
        logoSubtitle.textContent = unidade.razaoSocial || 'IF Baiano - Campus';
      }

      if (headerLogo && unidade.logomarca) {
        replaceElementChildren(headerLogo, [
          createBrandImage(unidade.logomarca, 'Logo', 'header'),
          document.createTextNode(' Controle de Material')
        ]);
      } else if (headerLogo) {
        headerLogo.textContent = 'Controle de Material';
      }
    } else {
      if (loginLogo) {
        replaceElementChildren(loginLogo, [
          createBrandImage('img/marca-if-baiano-campus-guanambi-horizontal.jpg', 'IF Baiano')
        ]);
      }

      const loginNome = document.getElementById('loginUnidadeNome');
      const loginInfo = document.getElementById('loginUnidadeInfo');

      if (loginNome) {
        loginNome.textContent = 'Bem-vindo(a) ao IF Baiano';
      }

      if (loginInfo) {
        loginInfo.textContent = 'Sistema de Controle de Material';
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados da unidade:', error);
  }
}

export function setupEventListeners(app) {
  app.setupScreenNavigation();
  app.setupFileUploads();
  app.setupForms();
  app.setupItemManagement();
  app.setupReports();
  app.setupActionButtons();
}

export function setupScreenNavigation(app) {
  document.querySelectorAll('.menu-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      const targetScreen = e.currentTarget.dataset.screen;
      if (targetScreen) {
        app.showScreen(targetScreen);
      }
    });
  });

  document.querySelectorAll('.btn-back').forEach((btn) => {
    btn.addEventListener('click', () => {
      app.showScreen('homeScreen');
    });
  });

  document.getElementById('btnHome')?.addEventListener('click', () => {
    app.showScreen('homeScreen');
  });

  document.getElementById('btnConfig')?.addEventListener('click', () => {
    app.showScreen('configScreen');
  });

  app.setupTabs();

  document.getElementById('btnSair')?.addEventListener('click', () => {
    app.realizarLogout();
  });

  app.setupCriticalAuthListeners();

  window.addEventListener('singem:auth:logout', (event) => {
    const motivo = event?.detail?.reason;
    if (motivo === 'token_invalid') {
      const errorDiv = document.getElementById('loginError');
      if (errorDiv) {
        errorDiv.textContent = 'Sessao expirada. Faca login novamente.';
        errorDiv.classList.remove('hidden');
      }
      console.warn('[AUTH] Sessão expirada detectada (token inválido/expirado).');
    }
  });

  window.addEventListener('singem:auth:login', (event) => {
    const usuario = event?.detail?.usuario;
    if (!usuario) {
      return;
    }

    app.usuarioLogado = { ...usuario };
    renderSidebar(app.usuarioLogado);
    app.atualizarUsuarioHeader();
    app.showScreen('homeScreen');
    console.info('[AUTH] Login confirmado via evento global. Navegação para home aplicada.');
  });

  document.getElementById('consultasMenuItem')?.addEventListener('click', () => {
    console.log('🔍 Abrindo Consulte Compras.gov...');
    app.showScreen('consultasScreen');
  });

  document.getElementById('btnRecuperarSenha')?.addEventListener('click', (e) => {
    e.preventDefault();
    app.abrirModalRecuperacaoSenha();
  });

  const toggleSenhaBtn = document.getElementById('toggleLoginSenha');
  const senhaInput = document.getElementById('loginSenha');
  const toggleSenhaIcon = document.getElementById('toggleLoginSenhaIcon');

  toggleSenhaBtn?.addEventListener('click', () => {
    if (!senhaInput) {
      return;
    }

    const mostrarSenha = senhaInput.type === 'password';
    senhaInput.type = mostrarSenha ? 'text' : 'password';
    toggleSenhaBtn.setAttribute('aria-pressed', mostrarSenha ? 'true' : 'false');
    toggleSenhaBtn.setAttribute('aria-label', mostrarSenha ? 'Ocultar senha' : 'Mostrar senha');

    if (toggleSenhaIcon) {
      toggleSenhaIcon.textContent = mostrarSenha ? '🙈' : '👁';
    }
  });

  document.getElementById('btnClearRemember')?.addEventListener('click', async () => {
    await app.limparDadosLembrados();
  });

  document.querySelectorAll('[data-prevent-default="true"]').forEach((link) => {
    if (link.dataset.preventDefaultBound === '1') {
      return;
    }

    link.dataset.preventDefaultBound = '1';
    link.addEventListener('click', (event) => {
      event.preventDefault();
    });
  });

  document.getElementById('btnConsultarProcesso')?.addEventListener('click', () => {
    if (typeof window.consultarProcessoSuap === 'function') {
      window.consultarProcessoSuap();
    }
  });

  app.setupImageFallbacks();
}

export function setupImageFallbacks() {
  document.querySelectorAll('[data-image-fallback]').forEach((image) => {
    const applyFallback = () => {
      image.classList.add('hidden');
      const selector = String(image.dataset.imageFallback || '').trim();
      const fallback = selector ? image.parentElement?.querySelector(selector) : null;
      fallback?.classList.add('is-visible');
    };

    if (image.dataset.imageFallbackBound === '1') {
      if (image.complete && image.naturalWidth === 0) {
        applyFallback();
      }
      return;
    }

    image.dataset.imageFallbackBound = '1';
    image.addEventListener('error', applyFallback);

    if (image.complete && image.naturalWidth === 0) {
      applyFallback();
    }
  });
}

export async function restaurarDadosLembrados() {
  try {
    const { rememberUser, rememberPass, login, pass } = await authRemember.loadRememberOptions();
    const chkUser = document.getElementById('rememberUser');
    const chkPass = document.getElementById('rememberPass');
    const inputUser = document.getElementById('loginUsuario');
    const inputPass = document.getElementById('loginSenha');

    if (chkUser) {
      chkUser.checked = rememberUser;
    }
    if (chkPass) {
      chkPass.checked = rememberPass;
    }
    if (inputUser && rememberUser && login) {
      inputUser.value = login;
    }
    if (inputPass && rememberPass && pass) {
      inputPass.value = pass;
    }
  } catch (error) {
    console.warn('⚠️ Falha ao restaurar dados lembrados:', error);
  }
}

export async function salvarDadosLembradosPosLogin(app, usuario, senha) {
  const rememberUser = document.getElementById('rememberUser')?.checked;
  const rememberPass = document.getElementById('rememberPass')?.checked;

  if (rememberUser || rememberPass) {
    await authRemember.saveRememberOptions({ rememberUser, rememberPass, login: usuario, pass: senha });
  } else {
    await app.limparDadosLembrados();
  }
}

export async function limparDadosLembrados() {
  authRemember.clearRemembered();
  const chkUser = document.getElementById('rememberUser');
  const chkPass = document.getElementById('rememberPass');
  const inputUser = document.getElementById('loginUsuario');
  const inputPass = document.getElementById('loginSenha');
  if (chkUser) {
    chkUser.checked = false;
  }
  if (chkPass) {
    chkPass.checked = false;
  }
  if (inputUser) {
    inputUser.value = '';
  }
  if (inputPass) {
    inputPass.value = '';
  }
}

export function abrirModalRecuperacaoSenha() {
  const modal = document.getElementById('modalRecuperacaoSenha');
  if (modal) {
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden', 'false');
  } else {
    alert('Use o PIN de recuperação na tela dedicada de recuperação de acesso.');
  }
}
