import { showToast } from '../../shared/ui/toast.js';

export function notificarUsuarioSalvo() {
  showToast('Usuário salvo com sucesso.', 'success');
}

export function notificarUsuarioErro(mensagem) {
  showToast(mensagem, 'error');
}
