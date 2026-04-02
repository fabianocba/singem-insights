/**
 * Helpers de formulário e estado transitório do cadastro principal.
 */

/**
 * Limpa formulário e restaura estado inicial dos campos visualização
 * @param {string} formId - ID do formulário HTML
 */
export function limparFormulario(formId) {
  const form = document.getElementById(formId);
  if (form) {
    form.reset();

    const containers = form.querySelectorAll('.items-list');
    containers.forEach((container) => {
      container.innerHTML = '';
    });

    const btnEditarEmpenho = document.getElementById('btnHabilitarEdicao');
    if (btnEditarEmpenho) {
      btnEditarEmpenho.remove();
    }

    const campos = form.querySelectorAll('input, select, textarea');
    campos.forEach((campo) => {
      campo.disabled = false;
      campo.classList.remove('campo-visualizacao');
    });

    const botoesOcultos = form.querySelectorAll('.btn-acao, #btnAddItem, #btnValidarEmpenho, button[type="submit"]');
    botoesOcultos.forEach((btn) => {
      btn.style.display = '';
    });

    const btnAnexarPdf = document.getElementById('btnAnexarPdfNE');
    if (btnAnexarPdf) {
      btnAnexarPdf.style.display = '';
    }
  }

  if (window.AnexarPdfNE?.resetarStatusAnexoUI) {
    window.AnexarPdfNE.resetarStatusAnexoUI();
  }
}

/**
 * Reseta o draft de empenho para estado inicial
 * @param {object} app - instância de ControleMaterialApp
 */
export function resetarDraftEmpenho(app) {
  app.empenhoDraft = {
    header: {
      id: null,
      ano: null,
      numero: null,
      dataEmissaoISO: null,
      naturezaDespesa: null,
      processoSuap: '',
      valorTotalEmpenho: 0,
      fornecedorRazao: null,
      cnpjDigits: '',
      telefoneDigits: '',
      emailFornecedor: '',
      statusValidacao: 'rascunho',
      validadoEm: null,
      validadoPor: null
    },
    itens: []
  };
  app.itemCounter = 0;
  console.log('[APP] 🧹 Draft de empenho resetado');
}

/**
 * Converte arquivo para Base64
 * @param {File} file
 * @returns {Promise<string>}
 */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
