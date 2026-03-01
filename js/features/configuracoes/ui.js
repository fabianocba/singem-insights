import { showToast } from '../../shared/ui/toast.js';

export function notificarConfiguracaoSalva() {
  showToast('Configurações salvas com sucesso.', 'success');
}

export function notificarConfiguracaoErro(mensagem) {
  showToast(mensagem, 'error');
}
