export function selecionarOpcaoEntrada(app, opcao) {
  const precisaRefresh =
    !Array.isArray(app.notaFiscalUIState.opcaoCards) || !Array.isArray(app.notaFiscalUIState.entradaContents);
  if (precisaRefresh) {
    app._refreshNotaFiscalOptionRefs();
  }

  const opcaoCards = app.notaFiscalUIState.opcaoCards || [];
  const entradaContents = app.notaFiscalUIState.entradaContents || [];

  opcaoCards.forEach((card) => {
    card.classList.remove('active');
  });

  entradaContents.forEach((content) => {
    content.classList.add('hidden');
  });

  document.querySelector(`[data-opcao="${opcao}"]`).classList.add('active');
  document.getElementById(`content${opcao.charAt(0).toUpperCase() + opcao.slice(1)}`).classList.remove('hidden');
}
