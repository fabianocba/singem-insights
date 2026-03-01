import { showToast } from '../../shared/ui/toast.js';

export function notificarFornecedorErro(mensagem) {
  showToast(mensagem, 'error');
}
