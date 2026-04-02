import * as dbGateway from '../../core/dbGateway.js';
import { mapearDraftEmpenho } from './empenhoDraftMapper.js';

export async function abrirEmpenhoParaEdicao(app, empenhoId, modoVisualizacao = false) {
  try {
    app.showLoading(modoVisualizacao ? 'Carregando empenho...' : 'Carregando empenho para edição...');

    const empenho = await dbGateway.buscarEmpenhoPorId(empenhoId);
    if (!empenho) {
      app.showError('Empenho não encontrado');
      return;
    }

    console.log('[EDIT] empenho carregado:', empenho);
    console.log('[EDIT] valorTotalEmpenho:', empenho?.valorTotalEmpenho ?? empenho?.valorTotal);
    console.log('[EDIT] telefone:', empenho?.telefoneDigits ?? empenho?.telefoneFornecedor);
    console.log('[EDIT] email:', empenho?.emailFornecedor);

    app.listagemState.ultimoEditado = empenhoId;
    app.empenhoDraft = mapearDraftEmpenho(empenho);

    await app.syncFromDraftToForm();
    app.renderItensEmpenho();

    if (window.AnexarPdfNE?.atualizarStatusAnexoUI) {
      window.AnexarPdfNE.atualizarStatusAnexoUI(empenho);
    }

    app._aplicarModoVisualizacao(Boolean(modoVisualizacao));
    app.showInfo(`${modoVisualizacao ? 'Visualizando' : 'Editando'}: ${empenho.ano} NE ${empenho.numero}`);

    document.querySelectorAll('.screen').forEach((screen) => screen.classList.remove('active'));
    document.getElementById('empenhoScreen')?.classList.add('active');
  } catch (error) {
    console.error('[APP] Erro ao abrir empenho:', error);
    app.showError('Erro ao abrir empenho: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

export function aplicarModoVisualizacao(app, visualizacao) {
  const form = document.getElementById('formEmpenho');
  if (!form) {
    return;
  }

  const campos = form.querySelectorAll('input, select, textarea');
  const botoesAcao = form.querySelectorAll(
    '.btn-acao, .btn-secondary:not(#btnCancelarEmpenho):not(#btnHabilitarEdicao), #btnAddItem, #btnValidarEmpenho'
  );
  const btnSalvar = form.querySelector('button[type="submit"]');
  const btnAnexarPdf = document.getElementById('btnAnexarPdfNE');
  const formActions = form.querySelector('.form-actions');
  const botoesExcluirItem = form.querySelectorAll('[data-action="delete"]');
  let btnEditarEmpenho = document.getElementById('btnHabilitarEdicao');

  const setElementHidden = (element, isHidden) => {
    if (element) {
      element.hidden = isHidden;
    }
  };

  const setCollectionHidden = (elements, isHidden) => {
    Array.from(elements || []).forEach((element) => {
      setElementHidden(element, isHidden);
    });
  };

  if (visualizacao) {
    campos.forEach((campo) => {
      campo.disabled = true;
      campo.classList.add('campo-visualizacao');
    });

    setCollectionHidden(botoesAcao, true);
    setCollectionHidden(botoesExcluirItem, true);
    setElementHidden(btnSalvar, true);
    setElementHidden(btnAnexarPdf, true);

    if (!btnEditarEmpenho && formActions) {
      btnEditarEmpenho = document.createElement('button');
      btnEditarEmpenho.type = 'button';
      btnEditarEmpenho.id = 'btnHabilitarEdicao';
      btnEditarEmpenho.className = 'btn btn-primary inline-flex items-center gap-1.5';
      btnEditarEmpenho.textContent = 'Editar empenho';

      const btnCancelar = formActions.querySelector('#btnCancelarEmpenho');
      if (btnCancelar) {
        btnCancelar.after(btnEditarEmpenho);
      } else {
        formActions.appendChild(btnEditarEmpenho);
      }

      btnEditarEmpenho.addEventListener('click', () => {
        app._aplicarModoVisualizacao(false);
        app.showInfo('Modo edição ativado');
      });
    } else if (btnEditarEmpenho) {
      setElementHidden(btnEditarEmpenho, false);
    }

    console.log('[APP] 👁️ Modo visualização ativado');
    return;
  }

  campos.forEach((campo) => {
    campo.disabled = false;
    campo.classList.remove('campo-visualizacao');
  });

  setCollectionHidden(botoesAcao, false);
  setCollectionHidden(botoesExcluirItem, false);
  setElementHidden(btnSalvar, false);
  setElementHidden(btnAnexarPdf, false);

  if (btnEditarEmpenho) {
    setElementHidden(btnEditarEmpenho, true);
  }

  console.log('[APP] ✏️ Modo edição ativado');
}
