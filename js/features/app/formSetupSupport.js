export function setupForms(app) {
  document.getElementById('formEmpenho')?.addEventListener('submit', (event) => {
    event.preventDefault();
    app.salvarEmpenho();
  });

  document.getElementById('formEntrega')?.addEventListener('submit', (event) => {
    event.preventDefault();
    app.salvarEntrega();
  });

  document.getElementById('formNotaFiscal')?.addEventListener('submit', (event) => {
    event.preventDefault();
    app.salvarNotaFiscal();
  });

  const valorTotalNFInput = document.getElementById('valorTotalNF');
  if (valorTotalNFInput) {
    valorTotalNFInput.addEventListener('blur', () => {
      const v = app.money2(app.parseMoneyInputBR(valorTotalNFInput.value));
      if (v > 0) {
        valorTotalNFInput.value = window.formatarNumero(v);
      }
      app.calcularValorTotalNotaFiscal();
    });

    valorTotalNFInput.addEventListener('input', () => {
      app.calcularValorTotalNotaFiscal();
    });
  }

  document.getElementById('empenhoSelect')?.addEventListener('change', (event) => {
    if (event.target.value) {
      app.carregarItensEmpenho(parseInt(event.target.value, 10));
    }
  });

  document.getElementById('empenhoAssociado')?.addEventListener('change', async (event) => {
    if (event.target.value) {
      await app.onEmpenhoSelecionado(parseInt(event.target.value, 10));
    } else {
      app.limparInfoEmpenhoNF();
    }
  });

  document.getElementById('btnAddItemFromEmpenho')?.addEventListener('click', () => {
    app.mostrarSeletorItensEmpenho();
  });

  document.getElementById('cnpjFornecedor')?.addEventListener('input', app.formatarCNPJInput.bind(app));
  document.getElementById('cnpjEmitente')?.addEventListener('input', app.formatarCNPJInput.bind(app));
  document.getElementById('cnpjDestinatario')?.addEventListener('input', app.formatarCNPJInput.bind(app));

  document.getElementById('btnCadastrarEmpenho')?.addEventListener('click', () => {
    app.navegarParaCadastroEmpenho('notaFiscalScreen');
  });

  document.getElementById('btnCancelarEmpenho')?.addEventListener('click', () => {
    app.cancelarCadastroEmpenho();
  });

  document.getElementById('btnValidarNF')?.addEventListener('click', () => {
    app.executarValidacaoNF();
  });

  document.getElementById('btnFecharValidacaoNF')?.addEventListener('click', () => {
    document.getElementById('modalValidacaoNF')?.classList.add('hidden');
    document.getElementById('modalValidacaoNF')?.setAttribute('aria-hidden', 'true');
  });

  document.getElementById('btnFecharValidacaoNF2')?.addEventListener('click', () => {
    document.getElementById('modalValidacaoNF')?.classList.add('hidden');
    document.getElementById('modalValidacaoNF')?.setAttribute('aria-hidden', 'true');
  });
}
