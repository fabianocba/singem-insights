export function showLoginError(app, message) {
  const errorDiv = document.getElementById('loginError');
  const mensagem = String(message || 'Falha ao autenticar. Tente novamente.');

  if (errorDiv) {
    errorDiv.textContent = mensagem;
    errorDiv.classList.remove('hidden');
    errorDiv.style.display = 'block';
    errorDiv.setAttribute('role', 'alert');
    errorDiv.setAttribute('aria-live', 'assertive');
    errorDiv.setAttribute('aria-hidden', 'false');
    errorDiv.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return;
  }

  app.showToast(mensagem, 'error');
}

export function formatarMensagemErroLogin(error) {
  const mensagemOriginal = String(error?.message || '').toLowerCase();
  const status = Number(error?.status || 0);

  if (status === 401) {
    if (mensagemOriginal.includes('sessão expirada') || mensagemOriginal.includes('sessao expirada')) {
      return 'Sessao expirada. Faca login novamente.';
    }

    return 'Usuario ou senha invalidos. Verifique e tente novamente.';
  }

  if (status === 405) {
    return 'Metodo nao permitido no endpoint de login. Atualize o deploy e valide o proxy /api/auth/login.';
  }

  if (status >= 500) {
    return 'Erro interno no servidor ao autenticar. Verifique logs do backend/proxy.';
  }

  if (mensagemOriginal.includes('failed to fetch') || mensagemOriginal.includes('timeout')) {
    return 'Nao foi possivel conectar ao servidor. Verifique se o backend esta ativo.';
  }

  return error?.message || 'Erro ao realizar login. Tente novamente.';
}
