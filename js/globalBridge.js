(function () {
  function escapeHtml(value) {
    const div = document.createElement('div');
    div.textContent = String(value ?? '');
    return div.innerHTML;
  }

  function removeLoader() {
    const loader = document.getElementById('consultas-loader');
    if (loader) {
      loader.remove();
    }
  }

  window.ConsultasModule = window.ConsultasModule || {
    UIConsultas: null,
    initialized: false,
    loading: false
  };

  window.ConsultasErros = Array.isArray(window.ConsultasErros) ? window.ConsultasErros : [];

  if (!window.__SINGEM_CONSULTAS_ERROR_BRIDGE__) {
    const originalConsoleError = console.error;

    console.error = function (...args) {
      window.ConsultasErros.push(args.map((arg) => String(arg)).join(' '));
      originalConsoleError.apply(console, args);
    };

    window.__SINGEM_CONSULTAS_ERROR_BRIDGE__ = true;
  }

  window.mostrarErroCopivel = function (titulo, mensagem, detalhes = '') {
    const erroAnterior = document.getElementById('erro-copivel');
    if (erroAnterior) {
      erroAnterior.remove();
    }

    const conteudoCompleto = `${titulo}\n\n${mensagem}${detalhes ? `\n\nDetalhes:\n${detalhes}` : ''}`;
    const conteudoDetalhes = `${mensagem}${detalhes ? `\n\nDetalhes:\n${detalhes}` : ''}`;

    const divErro = document.createElement('div');
    divErro.id = 'erro-copivel';
    divErro.className = 'sg-error-dialog';
    divErro.innerHTML = `
      <div class="sg-error-dialog__header">
        <div class="sg-error-dialog__icon">❌</div>
        <h3 class="sg-error-dialog__title">${escapeHtml(titulo)}</h3>
      </div>
      <div class="sg-error-dialog__details">${escapeHtml(conteudoDetalhes)}</div>
      <div class="sg-error-dialog__actions">
        <button id="btn-copiar-erro" class="sg-error-dialog__button sg-error-dialog__button--primary">
          📋 COPIAR ERRO
        </button>
        <button id="btn-fechar-erro" class="sg-error-dialog__button sg-error-dialog__button--secondary">
          ✖️ FECHAR
        </button>
      </div>
    `;

    document.body.appendChild(divErro);

    const btnCopiar = document.getElementById('btn-copiar-erro');
    const btnFechar = document.getElementById('btn-fechar-erro');

    btnCopiar?.addEventListener('click', () => {
      navigator.clipboard
        .writeText(conteudoCompleto)
        .then(() => {
          btnCopiar.innerHTML = '✅ COPIADO!';
          btnCopiar.style.background = '#28a745';

          window.setTimeout(() => {
            btnCopiar.innerHTML = '📋 COPIAR ERRO';
            btnCopiar.style.background = '#007bff';
          }, 2000);
        })
        .catch(() => {
          alert('Não foi possível copiar. Selecione o texto e copie manualmente (Ctrl+C).');
        });
    });

    btnFechar?.addEventListener('click', () => {
      divErro.remove();
    });
  };

  function aguardarModulo(callback, tentativas = 0) {
    const MAX_TENTATIVAS = 50;

    if (window.ConsultasModule.UIConsultas) {
      callback();
      return;
    }

    if (tentativas < MAX_TENTATIVAS) {
      if (tentativas === 0) {
        let loader = document.getElementById('consultas-loader');

        if (!loader) {
          loader = document.createElement('div');
          loader.id = 'consultas-loader';
          loader.style.cssText = [
            'position: fixed',
            'top: 50%',
            'left: 50%',
            'transform: translate(-50%, -50%)',
            'background: rgba(0,0,0,0.8)',
            'color: white',
            'padding: 20px 40px',
            'border-radius: 8px',
            'font-size: 18px',
            'z-index: 9999',
            'font-family: Arial, sans-serif'
          ].join(';');
          loader.innerHTML = '⏳ Carregando módulo...';
          document.body.appendChild(loader);
        }
      }

      window.setTimeout(() => {
        aguardarModulo(callback, tentativas + 1);
      }, 100);
      return;
    }

    removeLoader();

    const errosConsole =
      window.ConsultasErros.length > 0
        ? '\n\nERROS DO CONSOLE:\n' + window.ConsultasErros.join('\n')
        : '\n\nNenhum erro foi capturado no console.';

    window.mostrarErroCopivel(
      'TIMEOUT - Módulo não carregou',
      'O módulo Consulte Compras.gov não foi carregado após 5 segundos.',
      'Possíveis causas:\n' +
        '1. Erro ao carregar arquivos JavaScript\n' +
        '2. Bloqueio de scripts no navegador\n' +
        '3. Erro de sintaxe nos módulos ES6\n' +
        '4. Caminho incorreto dos arquivos\n' +
        errosConsole +
        '\n\nIMPORTANTE: Pressione F12 e vá na aba Console para ver todos os erros!'
    );
  }

  window.abrirConsulta = function (dataset) {
    aguardarModulo(() => {
      removeLoader();

      try {
        if (typeof window.ConsultasModule.UIConsultas.showConsulta !== 'function') {
          window.mostrarErroCopivel(
            'Função não encontrada',
            'A função showConsulta não foi encontrada no módulo carregado.',
            'window.ConsultasModule.UIConsultas.showConsulta = ' +
              typeof window.ConsultasModule.UIConsultas.showConsulta
          );
          return;
        }

        window.ConsultasModule.UIConsultas.showConsulta(dataset);
      } catch (error) {
        window.mostrarErroCopivel(
          'Erro ao executar showConsulta',
          error.message,
          'Stack trace:\n' + (error.stack || 'Não disponível')
        );
      }
    });
  };

  window.abrirConsultaPrecosPraticados = function (codigoOuParametros, opcoes = {}) {
    const parametros =
      codigoOuParametros && typeof codigoOuParametros === 'object'
        ? codigoOuParametros
        : { codigo: codigoOuParametros, ...opcoes };

    aguardarModulo(() => {
      removeLoader();

      try {
        const ui = window.ConsultasModule.UIConsultas;

        if (typeof ui.openPriceIntelligence === 'function') {
          ui.openPriceIntelligence({
            ...parametros,
            autoSearch: parametros.autoSearch !== false
          });
          return;
        }

        if (typeof ui.showConsulta === 'function') {
          ui.showConsulta('precos-praticados');
          return;
        }

        window.mostrarErroCopivel(
          'Função não encontrada',
          'Não foi possível abrir o Módulo 3 de preços praticados.',
          'window.ConsultasModule.UIConsultas.openPriceIntelligence indisponível.'
        );
      } catch (error) {
        window.mostrarErroCopivel(
          'Erro ao abrir Módulo 3',
          error.message,
          'Stack trace:\n' + (error.stack || 'Não disponível')
        );
      }
    });
  };
})();
