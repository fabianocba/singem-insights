import { refreshPremiumShell } from '../../ui/premiumShell.js';

export async function realizarLogout(app) {
  const wasGovBr = app.authProvider === 'govbr';

  try {
    const apiClient = (await import('../../services/apiClient.js')).default;
    await apiClient.logout();
  } catch (error) {
    console.warn('⚠️ Falha ao encerrar sessão na API:', error?.message || error);
  }

  app.usuarioLogado = null;
  app.authProvider = null;

  const loginForm = document.getElementById('loginForm') || document.getElementById('formLogin');
  const usuarioInput = loginForm?.elements?.username || document.getElementById('loginUsuario');
  const senhaInput = loginForm?.elements?.password || document.getElementById('loginSenha');
  const errorDiv = document.getElementById('loginError');

  if (usuarioInput) {
    usuarioInput.value = '';
  }
  if (senhaInput) {
    senhaInput.value = '';
  }
  if (errorDiv) {
    errorDiv.classList.add('hidden');
  }

  const usuarioNome = document.getElementById('usuarioLogadoNome');
  const usuarioAvatar = document.getElementById('usuarioAvatar');
  const usuarioPerfil = document.getElementById('usuarioLogadoPerfil');
  if (usuarioNome) {
    usuarioNome.textContent = '';
  }
  if (usuarioAvatar) {
    usuarioAvatar.textContent = 'SG';
  }
  if (usuarioPerfil) {
    usuarioPerfil.textContent = 'Sessão encerrada';
  }

  app.showScreen('loginScreen');

  if (wasGovBr) {
    const base =
      window.__API_BASE_URL__ ||
      (window.CONFIG && window.CONFIG.api && window.CONFIG.api.baseUrl) ||
      window.location.origin;
    const normalizedBase = String(base).replace(/\/+$/, '');
    window.location.href =
      normalizedBase + '/api/auth/govbr/logout?redirect=' + encodeURIComponent(window.location.origin);
  }
}

export function atualizarUsuarioHeader(app) {
  const usuarioNome = document.getElementById('usuarioLogadoNome');
  const usuarioAvatar = document.getElementById('usuarioAvatar');
  const usuarioPerfil = document.getElementById('usuarioLogadoPerfil');

  if (usuarioNome && app.usuarioLogado) {
    const perfil = app.usuarioLogado.perfil === 'admin' ? 'Administrador' : 'Usuario';
    const nomeExibicao = app.usuarioLogado.nome || app.usuarioLogado.login;
    usuarioNome.textContent = `${perfil} ${nomeExibicao}`;

    if (usuarioAvatar) {
      const avatarBase = String(nomeExibicao || 'SG')
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((parte) => parte.charAt(0).toUpperCase())
        .join('');
      usuarioAvatar.textContent = avatarBase || 'SG';
    }

    if (usuarioPerfil) {
      usuarioPerfil.textContent =
        app.authProvider === 'govbr'
          ? 'Autenticação Gov.br'
          : app.usuarioLogado.perfil === 'admin'
            ? 'Acesso administrativo'
            : 'Sessão institucional';
    }

    console.log('✅ Header atualizado com usuário:', app.usuarioLogado.nome);
  }

  refreshPremiumShell(app);
}

export function abrirAbaUsuariosConfiguracao(app) {
  void app;
  try {
    const configIframe = document.getElementById('configIframe');

    if (configIframe && configIframe.contentWindow) {
      const tentarAbrirAba = () => {
        try {
          const iframeDoc = configIframe.contentWindow.document;
          const usuariosTab = iframeDoc.querySelector('[data-tab="usuarios"]');

          if (usuariosTab) {
            usuariosTab.click();
            console.log('✅ Aba de usuários aberta automaticamente');

            setTimeout(() => {
              const formNovoUsuario = iframeDoc.getElementById('formNovoUsuario');
              if (formNovoUsuario) {
                formNovoUsuario.scrollIntoView({
                  behavior: 'smooth',
                  block: 'start'
                });
              }
            }, 300);
          } else {
            console.warn('⚠️ Aba de usuários não encontrada no iframe');
          }
        } catch (error) {
          console.error('Erro ao acessar iframe:', error);
        }
      };

      if (configIframe.contentWindow.document.readyState === 'complete') {
        tentarAbrirAba();
      } else {
        configIframe.addEventListener('load', tentarAbrirAba, { once: true });
      }
    }
  } catch (error) {
    console.error('Erro ao abrir aba de usuários:', error);
  }
}
