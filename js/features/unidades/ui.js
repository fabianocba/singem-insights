import { showToast } from '../../shared/ui/toast.js';

export function notificarUnidadeSalva() {
  showToast('Unidade salva com sucesso.', 'success');
}

export function notificarUnidadeErro(mensagem) {
  showToast(mensagem, 'error');
}
