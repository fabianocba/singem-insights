export function setupTabs(app) {
  const tabButtons = document.querySelectorAll('.tab-btn');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const tabName = button.dataset.tab;
      app.switchTab(tabName);
    });
  });
}

export function switchTab(app, tabName) {
  document.querySelectorAll('.tab-btn').forEach((btn) => btn.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach((content) => content.classList.remove('active'));

  const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (activeButton) {
    activeButton.classList.add('active');
  }

  let contentId = '';
  switch (tabName) {
    case 'cadastro':
      contentId = 'tabCadastro';
      app.carregarEmpenhosNovoCadastro();
      break;
    case 'controle-saldos':
      contentId = 'tabControleSaldos';
      app.carregarControleSaldos();
      break;
    case 'relatorio':
      contentId = 'tabRelatorio';
      app.carregarRelatorioEmpenhos();
      break;
  }

  const activeContent = document.getElementById(contentId);
  if (activeContent) {
    activeContent.classList.add('active');
  }
}

export async function carregarEmpenhosNovoCadastro(app) {
  const container = document.getElementById('empenhosPorAnoCadastro');
  const filtroAno = document.getElementById('filtroAnoCadastro');
  const buscaInput = document.getElementById('buscaEmpenhoCadastro');
  const btnNovo = document.getElementById('btnNovoEmpenho');

  if (!container) {
    return;
  }

  try {
    const empenhos = await app.features.empenho.carregarListaCadastro();
    app.cadastroEmpenhoState.empenhos = empenhos;

    app.features.empenho.preencherFiltroAnos(filtroAno, empenhos);
    app.features.empenho.renderLista(container, empenhos);
    bindCadastroListaDelegation(app, container);

    if (!app.cadastroEmpenhoState.handlersBound) {
      if (buscaInput) {
        buscaInput.addEventListener('input', () => {
          filtrarListaCadastro(app, app.cadastroEmpenhoState.empenhos, container, buscaInput.value, filtroAno?.value);
        });
      }

      if (filtroAno) {
        filtroAno.addEventListener('change', () => {
          filtrarListaCadastro(
            app,
            app.cadastroEmpenhoState.empenhos,
            container,
            buscaInput?.value || '',
            filtroAno.value
          );
        });
      }

      if (btnNovo) {
        btnNovo.addEventListener('click', () => {
          app.limparFormulario('formEmpenho');
          app._resetarDraftEmpenho();
          window.scrollTo({ top: document.querySelector('.form-container')?.offsetTop || 0, behavior: 'smooth' });
        });
      }

      app.cadastroEmpenhoState.handlersBound = true;
    }
  } catch (error) {
    console.error('[APP] Erro ao carregar lista cadastro:', error);
    container.innerHTML = `<p style="padding: 20px; color: #c00;">Erro ao carregar: ${error.message}</p>`;
  }
}

export function filtrarListaCadastro(app, empenhos, container, termoBusca, anoFiltro) {
  const filtrados = app.features.empenho.filtrarLista(empenhos, termoBusca, anoFiltro);
  renderizarListaCadastro(app, filtrados, container);
}

export function renderizarListaCadastro(app, empenhos, container) {
  app.features.empenho.renderLista(container, empenhos);
}

export function renderizarItemCadastro(emp) {
  const status = emp.statusValidacao || 'rascunho';
  const badgeClass = status === 'validado' ? 'ativo' : status === 'concluido' ? 'concluido' : 'rascunho';
  const badgeText = status === 'validado' ? 'Ativo' : status === 'concluido' ? 'Concluido' : 'Rascunho';
  const fornecedor = emp.fornecedor || 'Fornecedor não informado';
  const qtdItens = emp.itens?.length || 0;

  return `
      <div class="empenho-item">
        <div class="empenho-item-info">
          <span class="empenho-item-titulo">${emp.ano} NE ${emp.numero}</span>
          <div class="empenho-item-meta">
            <span>${fornecedor}</span>
            <span>• ${qtdItens} item(ns)</span>
            <span class="badge-status ${badgeClass}">${badgeText}</span>
          </div>
        </div>
        <div class="empenho-item-acoes">
          <button class="btn-acao visualizar" data-id="${emp.id}" title="Visualizar empenho">Visualizar</button>
          <button class="btn-acao excluir" data-id="${emp.id}" title="Excluir empenho">Excluir</button>
        </div>
      </div>
    `;
}

export function bindCadastroListaDelegation(app, container) {
  if (!container || app.cadastroEmpenhoState.listDelegationBound) {
    return;
  }

  container.addEventListener('click', async (event) => {
    const header = event.target.closest('.empenho-ano-header');
    if (header && container.contains(header)) {
      const ano = header.dataset.ano;
      const lista = document.getElementById(`listaAno${ano}`);
      if (lista) {
        lista.classList.toggle('collapsed');
        header.classList.toggle('collapsed');
      }
      return;
    }

    const btnVisualizar = event.target.closest('.btn-acao.visualizar');
    if (btnVisualizar && container.contains(btnVisualizar)) {
      event.stopPropagation();
      const id = Number.parseInt(btnVisualizar.dataset.id, 10);
      if (Number.isFinite(id)) {
        app.abrirEmpenhoParaEdicao(id, true);
      }
      return;
    }

    const btnExcluir = event.target.closest('.btn-acao.excluir');
    if (btnExcluir && container.contains(btnExcluir)) {
      event.stopPropagation();
      const id = Number.parseInt(btnExcluir.dataset.id, 10);
      if (Number.isFinite(id) && confirm('Tem certeza que deseja excluir este empenho?')) {
        await excluirEmpenho(app, id);
        await app.carregarEmpenhosNovoCadastro();
      }
    }
  });

  app.cadastroEmpenhoState.listDelegationBound = true;
}

export async function excluirEmpenho(app, id) {
  try {
    await app.features.empenho.excluir(id);
  } catch (error) {
    console.error('[APP] Erro ao excluir empenho:', error);
    app.showError('Erro ao excluir empenho: ' + error.message);
  }
}
