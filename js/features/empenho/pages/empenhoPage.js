import { excluirEmpenho, listarEmpenhos } from '../api/empenhoApi.js';
import { anosEmpenhos, filtrarEmpenhosCadastro } from '../validators/empenhoValidators.js';
import { renderizarListaCadastroAgrupada } from '../ui/empenhoCadastroList.js';

export function createEmpenhoFeature(app) {
  return {
    async carregarListaCadastro() {
      const empenhos = await listarEmpenhos(true);
      return empenhos || [];
    },

    preencherFiltroAnos(filtroAno, empenhos) {
      if (!filtroAno) {
        return;
      }
      const anos = anosEmpenhos(empenhos);
      filtroAno.innerHTML =
        '<option value="">Todos os anos</option>' +
        anos.map((ano) => `<option value="${ano}">${ano}</option>`).join('');
    },

    renderLista(container, empenhos) {
      renderizarListaCadastroAgrupada(empenhos, container);
    },

    filtrarLista(empenhos, termoBusca, anoFiltro) {
      return filtrarEmpenhosCadastro(empenhos, termoBusca, anoFiltro);
    },

    async excluir(id) {
      await excluirEmpenho(id);
      app.showInfo('Empenho excluído com sucesso');
    }
  };
}
