import { showToast } from '../../shared/ui/toast.js';

export function notificarAuthSucesso(mensagem) {
  showToast(mensagem, 'success');
}

export function notificarAuthErro(mensagem) {
  showToast(mensagem, 'error');
}
