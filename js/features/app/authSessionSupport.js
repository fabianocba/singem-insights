import InputValidator from '../../core/inputValidator.js';
import { renderSidebar } from '../../core/accessScope.js';

export async function realizarLogin(app, event) {
  console.log('[AUTH] Tentando login...');
  const form =
    event?.currentTarget instanceof HTMLFormElement
      ? event.currentTarget
      : document.getElementById('loginForm') || document.getElementById('formLogin');
  const usuario = form?.elements?.username?.value?.trim() || document.getElementById('loginUsuario')?.value.trim();
  const senha = form?.elements?.password?.value || document.getElementById('loginSenha')?.value;
  const errorDiv = document.getElementById('loginError');
  const btnLogin = document.getElementById('btnLogin');

  console.log('[AUTH] Usuário:', usuario ? '✓ preenchido' : '❌ vazio');
  console.log('[AUTH] Senha:', senha ? '✓ preenchida' : '❌ vazia');

  if (errorDiv) {
    errorDiv.classList.add('hidden');
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
    errorDiv.setAttribute('aria-hidden', 'true');
  }

  const validation = InputValidator.validateCredentials(usuario, senha);
  if (!validation.valid) {
    app.showLoginError(validation.errors.join(', '));
    return;
  }

  if (btnLogin) {
    btnLogin.disabled = true;
    btnLogin.textContent = 'Autenticando...';
  }

  try {
    const apiClient = (await import('../../services/apiClient.js')).default;
    const resultadoAPI = await apiClient.login(usuario, senha);

    const usuarioApi = resultadoAPI?.usuario || resultadoAPI?.dados?.usuario || apiClient.getUser?.();
    if (!usuarioApi) {
      throw new Error('Resposta de autenticação inválida.');
    }

    app.usuarioLogado = {
      ...usuarioApi,
      login: usuarioApi.login || usuario
    };
    app.authProvider = usuarioApi.authProvider || 'local';

    if (window.settingsUsuarios) {
      window.settingsUsuarios.usuarioLogado = { ...app.usuarioLogado };
    }

    await app.salvarDadosLembradosPosLogin(usuario, '');

    if (form?.elements?.username) {
      form.elements.username.value = '';
    } else if (document.getElementById('loginUsuario')) {
      document.getElementById('loginUsuario').value = '';
    }

    if (form?.elements?.password) {
      form.elements.password.value = '';
    } else if (document.getElementById('loginSenha')) {
      document.getElementById('loginSenha').value = '';
    }

    await app.carregarDadosIniciais();
    renderSidebar(app.usuarioLogado);
    app.atualizarUsuarioHeader();
    app.showScreen('homeScreen');

    window.setTimeout(() => {
      if (app.usuarioLogado && app.currentScreen === 'loginScreen') {
        app.showScreen('homeScreen');
      }
    }, 0);

    if (btnLogin) {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Entrar';
    }
    return;
  } catch (error) {
    console.error('❌ Erro no login:', {
      message: error?.message,
      status: error?.status,
      endpoint: error?.endpoint,
      requestUrl: error?.requestUrl,
      data: error?.data
    });
    const mensagemErroLogin = app.formatarMensagemErroLogin(error);
    console.warn('[AUTH][LOGIN] Falha de autenticação:', mensagemErroLogin);

    app.showLoginError(mensagemErroLogin);

    if (btnLogin) {
      btnLogin.disabled = false;
      btnLogin.textContent = 'Entrar';
    }
  }
}
