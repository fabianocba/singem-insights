import * as dbGateway from '../../core/dbGateway.js';
import * as FormatUtils from '../../core/format.js';
import * as NaturezaSubelementos from '../../data/naturezaSubelementos.js';
import { escapeHTML } from '../../utils/sanitize.js';

export async function carregarRelatorioEmpenhosLegacy(app) {
  const container = document.getElementById('relatorioEmpenhosContainer');
  if (!container) {
    return;
  }

  try {
    container.innerHTML = `
        <div class="empenhos-loading">
          <span>Carregando empenhos...</span>
        </div>
      `;

    app.listagemState.modoVisualizacao = true;

    const dados = await dbGateway.buscarEmpenhos(true);
    app.listagemState.empenhos = normalizarEmpenhosListagem(app, dados || []);

    console.log('[APP] 📊 Empenhos carregados:', app.listagemState.empenhos.length);

    renderizarEstruturaListagem(app, container);
    setupEventosListagem(app, container);
    renderizarListaEmpenhos(app);
  } catch (error) {
    console.error('Erro ao carregar relatório:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = `Erro ao carregar: ${error.message || 'Erro desconhecido'}`;
    container.innerHTML = '';
    container.appendChild(errorDiv);
  }
}

export function renderizarEstruturaListagem(app, container) {
  const total = app.listagemState.empenhos.length;
  const termoBusca = escapeHTML(String(app.listagemState.termoBusca || ''));

  container.innerHTML = `
      <div class="listagem-empenhos">
        <div class="listagem-header">
          <h3>Notas de empenho</h3>
          <span class="listagem-contador" id="contadorEmpenhos">
            ${total} empenho(s) cadastrado(s)
          </span>
        </div>

        <div class="listagem-busca">
          <input
            type="text"
            id="buscaEmpenho"
            class="busca-input"
            placeholder="Buscar empenho (ano, numero, fornecedor, processo...)"
            value="${termoBusca}"
          />
        </div>

        <div class="listagem-controles">
          <div class="filtros-chips">
            <button class="chip ${app.listagemState.filtroStatus === 'todos' ? 'chip-ativo' : ''}" data-filtro="todos">
              Todos
            </button>
            <button class="chip ${app.listagemState.filtroStatus === 'rascunho' ? 'chip-ativo' : ''}" data-filtro="rascunho">
              Rascunhos
            </button>
            <button class="chip ${app.listagemState.filtroStatus === 'validado' ? 'chip-ativo' : ''}" data-filtro="validado">
              Validados
            </button>
          </div>
          <div class="ordenacao-container">
            <label for="ordenacaoEmpenho">Ordenar por:</label>
            <select id="ordenacaoEmpenho" class="ordenacao-select">
              <option value="ano-numero" ${app.listagemState.ordenacao === 'ano-numero' ? 'selected' : ''}>Ano/Número</option>
              <option value="data" ${app.listagemState.ordenacao === 'data' ? 'selected' : ''}>Data de Emissão</option>
              <option value="fornecedor" ${app.listagemState.ordenacao === 'fornecedor' ? 'selected' : ''}>Fornecedor</option>
              <option value="valor" ${app.listagemState.ordenacao === 'valor' ? 'selected' : ''}>Valor Total</option>
            </select>
          </div>
        </div>

        <div class="empenhos-lista" id="listaEmpenhosContainer"></div>

        <div class="listagem-footer" id="footerListagem">
          <span id="totalExibido">Total exibido: ${total}</span>
        </div>
      </div>
    `;
}

export function setupEventosListagem(app, container) {
  const inputBusca = container.querySelector('#buscaEmpenho');
  if (inputBusca) {
    inputBusca.addEventListener('input', (e) => {
      clearTimeout(app.listagemState.debounceTimer);
      app.listagemState.debounceTimer = setTimeout(() => {
        app.listagemState.termoBusca = e.target.value;
        renderizarListaEmpenhos(app);
      }, 300);
    });
  }

  container.querySelectorAll('.chip[data-filtro]').forEach((chip) => {
    chip.addEventListener('click', (e) => {
      app.listagemState.filtroStatus = e.target.dataset.filtro;
      container.querySelectorAll('.chip[data-filtro]').forEach((button) => button.classList.remove('chip-ativo'));
      e.target.classList.add('chip-ativo');
      renderizarListaEmpenhos(app);
    });
  });

  const selectOrdenacao = container.querySelector('#ordenacaoEmpenho');
  if (selectOrdenacao) {
    selectOrdenacao.addEventListener('change', (e) => {
      app.listagemState.ordenacao = e.target.value;
      renderizarListaEmpenhos(app);
    });
  }
}

export function filtrarEOrdenarEmpenhos(app) {
  let resultado = [...app.listagemState.empenhos];

  if (app.listagemState.filtroStatus !== 'todos') {
    resultado = resultado.filter((emp) => {
      const status = emp.statusValidacao || 'rascunho';
      return status === app.listagemState.filtroStatus;
    });
  }

  const termo = app.listagemState.termoBusca.toLowerCase().trim();
  if (termo) {
    resultado = resultado.filter((emp) => {
      const searchKey = emp.searchKey || buildEmpenhoSearchKey(emp);
      return searchKey.includes(termo);
    });
  }

  resultado.sort((a, b) => {
    switch (app.listagemState.ordenacao) {
      case 'data':
        return new Date(b.dataEmpenho || b.dataCriacao || 0) - new Date(a.dataEmpenho || a.dataCriacao || 0);
      case 'fornecedor':
        return (a.fornecedor || '').localeCompare(b.fornecedor || '');
      case 'valor':
        return (b.valorTotalEmpenho ?? b.valorTotal ?? 0) - (a.valorTotalEmpenho ?? a.valorTotal ?? 0);
      case 'ano-numero':
      default: {
        const anoA = parseInt(a.ano, 10) || 0;
        const anoB = parseInt(b.ano, 10) || 0;
        if (anoB !== anoA) {
          return anoB - anoA;
        }
        return (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0);
      }
    }
  });

  return resultado;
}

export function normalizarEmpenhosListagem(app, empenhos) {
  return empenhos.map((emp) => {
    if (emp.searchKey) {
      return emp;
    }

    return {
      ...emp,
      searchKey: buildEmpenhoSearchKey(emp)
    };
  });
}

export function buildEmpenhoSearchKey(emp) {
  const processo = emp.processoSuap || emp.codigoReferencia || emp.processoNumero || emp.processo || '';
  const cnpj = emp.cnpjDigits || emp.cnpjFornecedor || '';

  return [
    String(emp.ano || ''),
    String(emp.numero || ''),
    String(emp.fornecedor || ''),
    String(processo),
    String(emp.statusValidacao || 'rascunho'),
    String(cnpj)
  ]
    .join(' ')
    .toLowerCase();
}

export function renderizarListaEmpenhos(app) {
  const listaContainer = document.getElementById('listaEmpenhosContainer');
  const totalExibido = document.getElementById('totalExibido');
  const contador = document.getElementById('contadorEmpenhos');

  if (!listaContainer) {
    return;
  }

  const empenhosFiltrados = filtrarEOrdenarEmpenhos(app);

  if (totalExibido) {
    const textoTotalExibido = `Total exibido: ${empenhosFiltrados.length}`;
    if (totalExibido.textContent !== textoTotalExibido) {
      totalExibido.textContent = textoTotalExibido;
    }
  }

  if (contador) {
    const textoContador = `${empenhosFiltrados.length} de ${app.listagemState.empenhos.length} empenho(s)`;
    if (contador.textContent !== textoContador) {
      contador.textContent = textoContador;
    }
  }

  if (empenhosFiltrados.length === 0) {
    listaContainer.innerHTML = `
        <div class="empenhos-vazio">
          <p>Nenhum empenho encontrado.</p>
          ${app.listagemState.termoBusca ? '<p><small>Tente ajustar os termos da busca.</small></p>' : ''}
        </div>
      `;
    return;
  }

  const modoVis = app.listagemState.modoVisualizacao === true;
  listaContainer.innerHTML = empenhosFiltrados.map((emp) => renderizarCardEmpenho(app, emp, modoVis)).join('');

  setupEventosCards(app, listaContainer);
}

export function renderizarCardEmpenho(app, emp, somenteVisualizacao = false) {
  const ano = emp.ano || new Date(emp.dataEmpenho || emp.dataCriacao).getFullYear();
  const numero = emp.numero || '000000';
  const titulo = escapeHTML(`${ano} NE ${numero}`);
  const status = emp.statusValidacao || 'rascunho';
  const badgeClass = status === 'validado' ? 'badge-success' : 'badge-warning';
  const badgeText = status === 'validado' ? 'VALIDADO' : 'RASCUNHO';
  const qtdItens = emp.itens?.length || 0;
  const fornecedor = escapeHTML(String(emp.fornecedor || 'Fornecedor não informado'));

  const processoSuap = emp.processoSuap || emp.codigoReferencia || emp.processoNumero || emp.processo || '';
  const processoExibicao = processoSuap ? `Proc: ${escapeHTML(String(processoSuap).substring(0, 20))}...` : '';

  const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
  const valor = escapeHTML(FormatUtils.formatCurrencyBR(valorEmpenho));
  const slug = escapeHTML(String(emp.slug || ''));

  const isDestaque = app.listagemState.ultimoEditado === emp.id;

  let botoesAcoes = '';
  if (somenteVisualizacao) {
    botoesAcoes = `
        <button class="btn-acao" data-action="ver-detalhes" data-id="${emp.id}" title="Ver detalhes">Detalhes</button>
      `;
  } else {
    botoesAcoes = `
        <button class="btn-acao" data-action="editar" data-id="${emp.id}" title="Editar empenho">Editar</button>
        <button class="btn-acao" data-action="adicionar-item" data-id="${emp.id}" title="Adicionar item">Adicionar item</button>
        <button class="btn-acao" data-action="ver-detalhes" data-id="${emp.id}" title="Ver detalhes">Detalhes</button>
      `;
  }

  return `
      <div class="empenho-card ${isDestaque ? 'card-destaque' : ''}" data-id="${emp.id}" data-slug="${slug}">
        <div class="empenho-card__header">
          <span class="empenho-card__titulo">${titulo}</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="empenho-card__body">
          <span class="empenho-card__descricao">
            ${fornecedor} ${processoExibicao ? `— ${processoExibicao}` : ''} — Total: ${valor}
          </span>
          <div class="empenho-card__meta">
            <span class="empenho-card__info">
              ${qtdItens} item(ns)
            </span>
            <div class="empenho-card__acoes">
              ${botoesAcoes}
            </div>
          </div>
        </div>
      </div>
    `;
}

export function setupEventosCards(app, container) {
  if (!container || container.dataset.cardsDelegacaoBound === '1') {
    return;
  }

  container.dataset.cardsDelegacaoBound = '1';

  container.addEventListener('click', async (event) => {
    const actionEl = event.target.closest('[data-action]');
    if (!actionEl || !container.contains(actionEl)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const action = actionEl.dataset.action;
    const card = actionEl.closest('.empenho-card');
    const rawId = actionEl.dataset.id || card?.dataset.id || '';
    const empenhoId = Number.parseInt(rawId, 10);

    if (!Number.isFinite(empenhoId)) {
      return;
    }

    if (action === 'ver-detalhes') {
      mostrarDetalhesEmpenhoPrivado(app, empenhoId);
      return;
    }

    if (app.listagemState.modoVisualizacao === true) {
      return;
    }

    if (action === 'editar') {
      app.abrirEmpenhoParaEdicao(empenhoId);
      return;
    }

    if (action === 'adicionar-item') {
      await app.abrirEmpenhoParaEdicao(empenhoId);
      setTimeout(() => app.abrirModalItemEmpenho(), 300);
    }
  });

  container.addEventListener('dblclick', (event) => {
    if (app.listagemState.modoVisualizacao === true) {
      return;
    }

    const card = event.target.closest('.empenho-card');
    if (!card || !container.contains(card)) {
      return;
    }

    const empenhoId = Number.parseInt(card.dataset.id || '', 10);
    if (Number.isFinite(empenhoId)) {
      app.abrirEmpenhoParaEdicao(empenhoId);
    }
  });
}

export async function mostrarDetalhesEmpenho(app, empenhoId) {
  const id = typeof empenhoId === 'string' ? parseInt(empenhoId, 10) : empenhoId;
  return mostrarDetalhesEmpenhoPrivado(app, id);
}

export async function mostrarDetalhesEmpenhoPrivado(app, empenhoId) {
  let emp = app.listagemState.empenhos?.find((item) => item.id === empenhoId);
  if (!emp) {
    emp = await dbGateway.buscarEmpenhoPorId(empenhoId);
  }
  if (!emp) {
    app.showError('Empenho não encontrado');
    return;
  }

  const ano = emp.ano || '';
  const numero = emp.numero || '';
  const fornecedor = emp.fornecedor || 'Não informado';

  const naturezaCodigo = emp.naturezaDespesa || '';
  const naturezaNome = naturezaCodigo ? NaturezaSubelementos.getNaturezaNome(naturezaCodigo) : '';
  const naturezaExibicao = naturezaCodigo ? `${naturezaCodigo} - ${naturezaNome}` : 'Não informada';

  const cnpjDigits = emp.cnpjDigits || FormatUtils.onlyDigits(emp.cnpjFornecedor || '');
  const cnpjFormatado = cnpjDigits ? FormatUtils.formatCNPJ(cnpjDigits) : 'Não informado';

  const telefoneDigits = emp.telefoneDigits || FormatUtils.onlyDigits(emp.telefoneFornecedor || '');
  const telefoneFormatado = telefoneDigits ? FormatUtils.formatPhone(telefoneDigits) : 'Não informado';

  const email = emp.emailFornecedor || 'Não informado';

  const processoExibicao = emp.processoSuap || emp.codigoReferencia || emp.processoNumero || emp.processo || 'Não informado';

  const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
  const valorFormatado = FormatUtils.formatCurrencyBR(valorEmpenho);

  const status = emp.statusValidacao || 'rascunho';
  const qtdItens = emp.itens?.length || 0;
  const dataEmpenho = emp.dataEmpenho ? new Date(emp.dataEmpenho).toLocaleDateString('pt-BR') : 'Não informada';

  removerModalDetalhesEmpenho();

  const overlay = document.createElement('div');
  overlay.id = 'modalDetalhesEmpenhoOverlay';
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
      <div class="modal-card modal-detalhes">
        <div class="modal-header">
          <h4>${ano} NE ${numero}</h4>
          <button type="button" class="btn-fechar" id="btnFecharDetalhesX" title="Fechar">✕</button>
        </div>
        <div class="modal-body">
          <div class="detalhes-grid">
            <div class="detalhe-item"><strong>Natureza:</strong> ${naturezaExibicao}</div>
            <div class="detalhe-item"><strong>Fornecedor:</strong> ${fornecedor}</div>
            <div class="detalhe-item"><strong>CNPJ:</strong> ${cnpjFormatado}</div>
            <div class="detalhe-item"><strong>Telefone:</strong> ${telefoneFormatado}</div>
            <div class="detalhe-item"><strong>E-mail:</strong> ${email}</div>
            <div class="detalhe-item"><strong>Processo (SUAP):</strong> ${processoExibicao}</div>
            <div class="detalhe-item"><strong>Data:</strong> ${dataEmpenho}</div>
            <div class="detalhe-item"><strong>Valor Total:</strong> ${valorFormatado}</div>
            <div class="detalhe-item"><strong>Itens:</strong> ${qtdItens}</div>
            <div class="detalhe-item"><strong>Status:</strong> ${status.toUpperCase()}</div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="btnFecharDetalhes">Fechar</button>
          <button class="btn btn-primary" id="btnEditarDetalhes" data-id="${empenhoId}">Editar</button>
        </div>
      </div>
    `;

  overlay.addEventListener('click', (event) => {
    const btnFechar = event.target.closest('#btnFecharDetalhes, #btnFecharDetalhesX');
    if (btnFechar) {
      removerModalDetalhesEmpenho();
      return;
    }

    const btnEditar = event.target.closest('#btnEditarDetalhes');
    if (btnEditar) {
      removerModalDetalhesEmpenho();
      app.abrirEmpenhoParaEdicao(empenhoId);
      return;
    }

    if (event.target === overlay) {
      removerModalDetalhesEmpenho();
    }
  });

  document.body.appendChild(overlay);
}

export function removerModalDetalhesEmpenho() {
  const overlayAtual = document.getElementById('modalDetalhesEmpenhoOverlay');
  if (overlayAtual) {
    overlayAtual.remove();
  }
}
