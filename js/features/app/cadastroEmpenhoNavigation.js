export function navegarParaCadastroEmpenho(app, telaOrigem = null) {
  app.telaAntesCadastroEmpenho = telaOrigem;

  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.remove('active');
  });

  document.getElementById('empenhoScreen')?.classList.add('active');

  const formEmpenho = document.getElementById('formEmpenho');
  if (formEmpenho) {
    formEmpenho.reset();
  }

  if (telaOrigem === 'notaFiscalScreen') {
    app.showInfo('Cadastre o empenho e depois retorne para associa-lo a nota fiscal');
  }
}

export function cancelarCadastroEmpenho(app) {
  const formEmpenho = document.getElementById('formEmpenho');
  if (formEmpenho) {
    formEmpenho.reset();
  }

  const telaDestino = app.telaAntesCadastroEmpenho || 'inicioScreen';

  document.querySelectorAll('.screen').forEach((screen) => {
    screen.classList.remove('active');
  });

  document.getElementById(telaDestino)?.classList.add('active');

  if (telaDestino === 'notaFiscalScreen') {
    app.carregarEmpenhosSelect();
  }

  app.telaAntesCadastroEmpenho = null;
}
