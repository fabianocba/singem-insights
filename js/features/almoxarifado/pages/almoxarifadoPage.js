import { escapeHTML } from '../../../utils/sanitize.js';
import {
  atualizarStatusSolicitacaoAlmoxarifado,
  carregarDashboardAlmoxarifado,
  carregarMetaAlmoxarifado,
  carregarResumoAlmoxarifado,
  criarContaContabilAlmoxarifado,
  criarItemAlmoxarifado,
  criarMovimentacaoAlmoxarifado,
  criarNotaEntradaAlmoxarifado,
  criarSolicitacaoAlmoxarifado,
  listarAuditoriaAlmoxarifado,
  listarItensAlmoxarifado,
  listarMovimentacoesAlmoxarifado,
  listarNotasEntradaAlmoxarifado,
  listarSolicitacoesAlmoxarifado
} from '../api.js';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat('pt-BR');
const dateFormatter = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' });
const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short'
});

function createDefaultMeta() {
  return {
    movement_types: [],
    solicitation_statuses: [],
    item_statuses: [],
    priority_levels: [],
    contas_contabeis: [],
    grupos: [],
    subgrupos: [],
    localizacoes: [],
    fornecedores: []
  };
}

function createEmptyList() {
  return {
    items: [],
    meta: {}
  };
}

function createInitialState(app) {
  return {
    initialized: false,
    loading: false,
    loadingMessage: 'Sincronizando operação do almoxarifado...',
    errorMessage: '',
    activeTab: 'visao-geral',
    busyForm: '',
    isAdmin: app?.usuarioLogado?.perfil === 'admin',
    meta: createDefaultMeta(),
    dashboard: {
      total_itens: 0,
      total_estoque: 0,
      valor_total_estoque: 0,
      itens_criticos: 0,
      itens_bloqueados: 0,
      entradas_hoje: 0,
      saidas_hoje: 0,
      solicitacoes_pendentes: 0,
      solicitacoes_em_separacao: 0
    },
    resumo: {
      movimentacoes: [],
      saldos_por_conta: [],
      itens_criticos: [],
      consumo_por_setor: []
    },
    itens: createEmptyList(),
    notas: createEmptyList(),
    movimentacoes: createEmptyList(),
    solicitacoes: createEmptyList(),
    auditoria: createEmptyList(),
    filters: {
      itens: {
        q: '',
        status: '',
        somenteCriticos: false
      },
      notas: {
        fornecedor: '',
        numero: ''
      },
      movimentacoes: {
        item_id: '',
        tipo: ''
      },
      solicitacoes: {
        status: '',
        prioridade: ''
      },
      auditoria: {
        acao: '',
        entidade_tipo: ''
      }
    }
  };
}

function safeText(value, fallback = '-') {
  if (value === undefined || value === null || value === '') {
    return escapeHTML(fallback);
  }

  return escapeHTML(String(value));
}

function safeAttr(value) {
  return escapeHTML(value === undefined || value === null ? '' : String(value));
}

function formatNumber(value) {
  return numberFormatter.format(Number(value || 0));
}

function formatCurrency(value) {
  return currencyFormatter.format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '--' : dateFormatter.format(parsed);
}

function formatDateTime(value) {
  if (!value) {
    return '--';
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '--' : dateTimeFormatter.format(parsed);
}

function slugifyStatus(value) {
  return String(value || 'neutro')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function renderStatusBadge(value) {
  const slug = slugifyStatus(value);
  return `<span class="almox-badge almox-badge--${slug}">${safeText(value, 'indefinido')}</span>`;
}

function renderOptions(items, getLabel, placeholder = 'Selecione') {
  const options = Array.isArray(items)
    ? items
        .map((item) => {
          const label = getLabel(item);
          return `<option value="${safeAttr(item.id)}">${safeText(label)}</option>`;
        })
        .join('')
    : '';

  return `<option value="">${safeText(placeholder)}</option>${options}`;
}

function renderMetricCard(label, value, description, accent = 'brand') {
  return `
    <article class="almox-metric-card almox-metric-card--${accent}">
      <span class="almox-metric-card__label">${safeText(label)}</span>
      <strong class="almox-metric-card__value">${safeText(value)}</strong>
      <p class="almox-metric-card__detail">${safeText(description)}</p>
    </article>
  `;
}

function renderListSummary(listState, label) {
  const total = Number(listState?.meta?.total || listState?.items?.length || 0);
  const visible = Array.isArray(listState?.items) ? listState.items.length : 0;
  return `${safeText(label)}: ${formatNumber(visible)} visivel(is) de ${formatNumber(total)} total.`;
}

function renderEmptyRow(message, colspan = 6) {
  return `
    <tr>
      <td colspan="${colspan}" class="almox-table__empty">${safeText(message)}</td>
    </tr>
  `;
}

function getMovimentacaoTypes(meta) {
  return (meta?.movement_types || []).filter((entry) => entry !== 'saida');
}

function getSelectableItems(state) {
  return Array.isArray(state.itens?.items) ? state.itens.items : [];
}

function getSelectableContas(state) {
  return Array.isArray(state.meta?.contas_contabeis) ? state.meta.contas_contabeis : [];
}

function buildSolicitacaoStatusPayload(solicitacao, status) {
  const payload = { status };

  if (['atendida', 'parcial', 'parcialmente_atendida'].includes(status)) {
    payload.itens = (solicitacao.itens || []).map((item) => ({
      item_id: item.item_id,
      quantidade_atendida: Number(item.quantidade || 0)
    }));
  }

  return payload;
}

function getSolicitacaoActions(solicitacao) {
  switch (solicitacao.status) {
    case 'enviada':
      return [
        { label: 'Em analise', status: 'em_analise' },
        { label: 'Aprovar', status: 'aprovada' }
      ];
    case 'em_analise':
      return [{ label: 'Aprovar', status: 'aprovada' }];
    case 'aprovada':
      return [{ label: 'Separar', status: 'em_separacao' }];
    case 'em_separacao':
    case 'parcial':
    case 'parcialmente_atendida':
      return [{ label: 'Atender', status: 'atendida' }];
    default:
      return [];
  }
}

function createFeatureContext(app) {
  const state = createInitialState(app);
  let root = null;

  function render() {
    if (!root) {
      return;
    }

    const contas = getSelectableContas(state);
    const items = getSelectableItems(state);
    const itensRows = state.itens.items.length
      ? state.itens.items
          .map(
            (item) => `
              <tr>
                <td>
                  <strong>${safeText(item.codigo_interno || item.id)}</strong>
                  <div class="almox-table__sub">${safeText(item.catmat_codigo, 'CATMAT pendente')}</div>
                </td>
                <td>
                  <strong>${safeText(item.descricao)}</strong>
                  <div class="almox-table__sub">${safeText(item.descricao_resumida || item.catmat_descricao || '')}</div>
                </td>
                <td>${renderStatusBadge(item.status)}</td>
                <td>
                  <strong>${formatNumber(item.estoque?.saldo)}</strong>
                  <div class="almox-table__sub">min ${formatNumber(item.estoque?.estoque_minimo)}</div>
                </td>
                <td>${safeText(item.grupo || 'Sem grupo')}</td>
                <td>${safeText(item.localizacao || 'Nao definida')}</td>
              </tr>
            `
          )
          .join('')
      : renderEmptyRow('Nenhum item encontrado para os filtros atuais.');

    const notasRows = state.notas.items.length
      ? state.notas.items
          .map(
            (nota) => `
              <tr>
                <td>
                  <strong>NF ${safeText(nota.numero)}</strong>
                  <div class="almox-table__sub">serie ${safeText(nota.serie || '1')}</div>
                </td>
                <td>${safeText(nota.fornecedor || 'Fornecedor nao informado')}</td>
                <td>${safeText(nota.cnpj_fornecedor || '-')}</td>
                <td>${formatDate(nota.data_entrada || nota.data_emissao)}</td>
                <td>${formatCurrency(nota.valor_total)}</td>
                <td>${formatNumber(nota.itens_count)}</td>
              </tr>
            `
          )
          .join('')
      : renderEmptyRow('Nenhuma nota de entrada registrada ainda.');

    const movimentacoesRows = state.movimentacoes.items.length
      ? state.movimentacoes.items
          .map(
            (movimento) => `
              <tr>
                <td>${renderStatusBadge(movimento.tipo)}</td>
                <td>
                  <strong>${safeText(movimento.item?.descricao || 'Item removido')}</strong>
                  <div class="almox-table__sub">${safeText(movimento.item?.codigo_interno || movimento.item_id)}</div>
                </td>
                <td>${formatNumber(movimento.quantidade)}</td>
                <td>${formatCurrency(movimento.valor_total || movimento.valor_unitario || 0)}</td>
                <td>${safeText(movimento.origem || 'manual')}</td>
                <td>${formatDateTime(movimento.created_at)}</td>
              </tr>
            `
          )
          .join('')
      : renderEmptyRow('Nenhuma movimentacao encontrada.', 6);

    const solicitacoesRows = state.solicitacoes.items.length
      ? state.solicitacoes.items
          .map((solicitacao) => {
            const actions = getSolicitacaoActions(solicitacao)
              .map(
                (action) => `
                  <button
                    type="button"
                    class="almox-inline-action"
                    data-almox-action="avancar-solicitacao"
                    data-solicitacao-id="${safeAttr(solicitacao.id)}"
                    data-next-status="${safeAttr(action.status)}"
                  >
                    ${safeText(action.label)}
                  </button>
                `
              )
              .join('');

            return `
              <tr>
                <td>
                  <strong>#${safeText(solicitacao.id)}</strong>
                  <div class="almox-table__sub">${safeText(solicitacao.setor)}</div>
                </td>
                <td>${safeText(solicitacao.solicitante)}</td>
                <td>${renderStatusBadge(solicitacao.status)}</td>
                <td>${renderStatusBadge(solicitacao.prioridade)}</td>
                <td>${formatNumber((solicitacao.itens || []).length)}</td>
                <td>
                  <div class="almox-inline-actions">${actions || '<span class="almox-table__sub">Sem acao rapida</span>'}</div>
                </td>
              </tr>
            `;
          })
          .join('')
      : renderEmptyRow('Nenhuma solicitacao aberta neste recorte.');

    const auditoriaRows = state.auditoria.items.length
      ? state.auditoria.items
          .map(
            (entry) => `
              <tr>
                <td>${safeText(entry.acao)}</td>
                <td>${safeText(entry.entidade_tipo)}</td>
                <td>${safeText(entry.entidade_id)}</td>
                <td>${safeText(entry.usuario?.nome || 'Sistema')}</td>
                <td>${formatDateTime(entry.created_at)}</td>
              </tr>
            `
          )
          .join('')
      : renderEmptyRow('Nenhum evento de auditoria disponivel.', 5);

    const visaoGeralPanel = `
      <section class="almox-tab-panel" ${state.activeTab === 'visao-geral' ? '' : 'hidden'}>
        <div class="almox-metrics-grid">
          ${renderMetricCard('Itens ativos', formatNumber(state.dashboard.total_itens), 'Catalogo ativo do almoxarifado', 'brand')}
          ${renderMetricCard('Saldo total', formatNumber(state.dashboard.total_estoque), 'Quantidade consolidada em estoque', 'info')}
          ${renderMetricCard('Valor em estoque', formatCurrency(state.dashboard.valor_total_estoque), 'Base valorizada do almoxarifado', 'warning')}
          ${renderMetricCard('Criticos', formatNumber(state.dashboard.itens_criticos), 'Itens em ponto de reposicao', 'danger')}
          ${renderMetricCard('Pendencias', formatNumber(state.dashboard.solicitacoes_pendentes), 'Solicitacoes aguardando fluxo', 'success')}
          ${renderMetricCard('Separacao', formatNumber(state.dashboard.solicitacoes_em_separacao), 'Ordens em preparacao', 'neutral')}
        </div>

        <div class="almox-analytics-grid">
          <article class="almox-panel">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Radar financeiro</span>
                <h3>Saldos por conta contabil</h3>
              </div>
              <span class="almox-panel__meta">${formatNumber(state.resumo.saldos_por_conta.length)} conta(s)</span>
            </div>
            <div class="almox-stat-list">
              ${
                state.resumo.saldos_por_conta.length
                  ? state.resumo.saldos_por_conta
                      .slice(0, 6)
                      .map(
                        (conta) => `
                        <div class="almox-stat-list__row">
                          <div>
                            <strong>${safeText(conta.codigo)}</strong>
                            <span>${safeText(conta.descricao)}</span>
                          </div>
                          <strong>${formatCurrency(conta.valor_total)}</strong>
                        </div>
                      `
                      )
                      .join('')
                  : '<p class="almox-empty-note">Nenhuma conta valorizada para exibir.</p>'
              }
            </div>
          </article>

          <article class="almox-panel">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Consumo institucional</span>
                <h3>Atendimento por setor</h3>
              </div>
              <span class="almox-panel__meta">${formatNumber(state.resumo.consumo_por_setor.length)} setor(es)</span>
            </div>
            <div class="almox-stat-list">
              ${
                state.resumo.consumo_por_setor.length
                  ? state.resumo.consumo_por_setor
                      .slice(0, 6)
                      .map(
                        (row) => `
                        <div class="almox-stat-list__row">
                          <div>
                            <strong>${safeText(row.setor)}</strong>
                            <span>Itens atendidos</span>
                          </div>
                          <strong>${formatNumber(row.quantidade_atendida)}</strong>
                        </div>
                      `
                      )
                      .join('')
                  : '<p class="almox-empty-note">Nenhum consumo atendido para o periodo atual.</p>'
              }
            </div>
          </article>

          <article class="almox-panel">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Reposicao</span>
                <h3>Itens em criticidade</h3>
              </div>
              <span class="almox-panel__meta">${formatNumber(state.resumo.itens_criticos.length)} item(ns)</span>
            </div>
            <div class="almox-stat-list">
              ${
                state.resumo.itens_criticos.length
                  ? state.resumo.itens_criticos
                      .slice(0, 6)
                      .map(
                        (row) => `
                        <div class="almox-stat-list__row">
                          <div>
                            <strong>${safeText(row.codigo_interno || row.id)}</strong>
                            <span>${safeText(row.descricao)}</span>
                          </div>
                          <strong>${formatNumber(row.saldo)}</strong>
                        </div>
                      `
                      )
                      .join('')
                  : '<p class="almox-empty-note">Nenhum item em criticidade no momento.</p>'
              }
            </div>
          </article>
        </div>

        <div class="almox-forms-grid">
          <article class="almox-panel almox-panel--form">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Bootstrap local</span>
                <h3>Conta contabil rapida</h3>
              </div>
            </div>
            <form data-almox-form="conta" class="almox-form-grid">
              <label>
                <span>Codigo</span>
                <input name="codigo" type="text" required placeholder="339030" />
              </label>
              <label class="almox-form-grid__span-2">
                <span>Descricao</span>
                <input name="descricao" type="text" required placeholder="Material de consumo" />
              </label>
              <label>
                <span>Categoria</span>
                <input name="categoria" type="text" placeholder="consumo" />
              </label>
              <button type="submit" class="btn btn-secondary">Criar conta</button>
            </form>
          </article>

          <article class="almox-panel almox-panel--form">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Catalogo</span>
                <h3>Novo item</h3>
              </div>
              <span class="almox-panel__meta">${contas.length ? formatNumber(contas.length) + ' conta(s)' : 'crie uma conta primeiro'}</span>
            </div>
            <form data-almox-form="item" class="almox-form-grid">
              <label class="almox-form-grid__span-2">
                <span>Descricao</span>
                <input name="descricao" type="text" required placeholder="Caneta esferografica azul" ${contas.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Codigo interno</span>
                <input name="codigo_interno" type="text" placeholder="ALM-001" ${contas.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Unidade</span>
                <input name="unidade" type="text" placeholder="UN" ${contas.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>CATMAT</span>
                <input name="catmat_codigo" type="text" required placeholder="123456" ${contas.length ? '' : 'disabled'} />
              </label>
              <label class="almox-form-grid__span-2">
                <span>Descricao CATMAT</span>
                <input name="catmat_descricao" type="text" required placeholder="Material de expediente" ${contas.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Conta contabil</span>
                <select name="conta_contabil_id" required ${contas.length ? '' : 'disabled'}>
                  ${renderOptions(contas, (item) => `${item.codigo} · ${item.descricao}`, 'Selecione a conta')}
                </select>
              </label>
              <label>
                <span>Grupo</span>
                <input name="grupo" type="text" placeholder="Expediente" ${contas.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Subgrupo</span>
                <input name="subgrupo" type="text" placeholder="Escritorio" ${contas.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Localizacao</span>
                <input name="localizacao" type="text" placeholder="Almox A-01" ${contas.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Estoque minimo</span>
                <input name="estoque_minimo" type="number" min="0" step="1" placeholder="10" ${contas.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Ponto reposicao</span>
                <input name="ponto_reposicao" type="number" min="0" step="1" placeholder="15" ${contas.length ? '' : 'disabled'} />
              </label>
              <button type="submit" class="btn btn-secondary" ${contas.length ? '' : 'disabled'}>Cadastrar item</button>
            </form>
          </article>

          <article class="almox-panel almox-panel--form">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Entrada documental</span>
                <h3>NF de entrada</h3>
              </div>
              <span class="almox-panel__meta">${items.length ? formatNumber(items.length) + ' item(ns)' : 'cadastre item antes'}</span>
            </div>
            <form data-almox-form="nota" class="almox-form-grid">
              <label>
                <span>Numero</span>
                <input name="numero" type="text" required placeholder="1001" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Serie</span>
                <input name="serie" type="text" placeholder="1" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Emissao</span>
                <input name="data_emissao" type="date" required ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Entrada</span>
                <input name="data_entrada" type="date" ${items.length ? '' : 'disabled'} />
              </label>
              <label class="almox-form-grid__span-2">
                <span>Fornecedor</span>
                <input name="fornecedor" type="text" required placeholder="Fornecedor local" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>CNPJ</span>
                <input name="cnpj_fornecedor" type="text" placeholder="12345678000190" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Valor total</span>
                <input name="valor_total" type="number" min="0" step="0.01" required placeholder="150.00" ${items.length ? '' : 'disabled'} />
              </label>
              <label class="almox-form-grid__span-2">
                <span>Item</span>
                <select name="material_id" required ${items.length ? '' : 'disabled'}>
                  ${renderOptions(items, (item) => `${item.codigo_interno || item.id} · ${item.descricao}`, 'Selecione o item')}
                </select>
              </label>
              <label class="almox-form-grid__span-2">
                <span>Descricao na NF</span>
                <input name="descricao_nf" type="text" required placeholder="Descricao do item na nota" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Quantidade</span>
                <input name="quantidade" type="number" min="0.01" step="0.01" required placeholder="10" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Valor unitario</span>
                <input name="valor_unitario" type="number" min="0.01" step="0.01" required placeholder="15" ${items.length ? '' : 'disabled'} />
              </label>
              <button type="submit" class="btn btn-secondary" ${items.length ? '' : 'disabled'}>Registrar NF</button>
            </form>
          </article>

          <article class="almox-panel almox-panel--form">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Operacao manual</span>
                <h3>Movimentacao</h3>
              </div>
            </div>
            <form data-almox-form="movimentacao" class="almox-form-grid">
              <label class="almox-form-grid__span-2">
                <span>Item</span>
                <select name="item_id" required ${items.length ? '' : 'disabled'}>
                  ${renderOptions(items, (item) => `${item.codigo_interno || item.id} · ${item.descricao}`, 'Selecione o item')}
                </select>
              </label>
              <label>
                <span>Tipo</span>
                <select name="tipo" required ${items.length ? '' : 'disabled'}>
                  ${renderOptions(
                    getMovimentacaoTypes(state.meta).map((entry, index) => ({ id: entry || index, label: entry })),
                    (item) => item.label,
                    'Selecione'
                  )}
                </select>
              </label>
              <label>
                <span>Quantidade</span>
                <input name="quantidade" type="number" min="0.01" step="0.01" required placeholder="1" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Valor unitario</span>
                <input name="valor_unitario" type="number" min="0" step="0.01" placeholder="0.00" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Documento</span>
                <input name="documento" type="text" placeholder="AJ-2026-001" ${items.length ? '' : 'disabled'} />
              </label>
              <label class="almox-form-grid__span-2">
                <span>Justificativa</span>
                <input name="justificativa" type="text" placeholder="Obrigatoria para ajuste" ${items.length ? '' : 'disabled'} />
              </label>
              <label class="almox-form-grid__span-2">
                <span>Localizacao destino</span>
                <input name="localizacao_destino" type="text" placeholder="Obrigatoria para transferencia" ${items.length ? '' : 'disabled'} />
              </label>
              <button type="submit" class="btn btn-secondary" ${items.length ? '' : 'disabled'}>Registrar movimentacao</button>
            </form>
          </article>

          <article class="almox-panel almox-panel--form">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Atendimento interno</span>
                <h3>Nova solicitacao</h3>
              </div>
            </div>
            <form data-almox-form="solicitacao" class="almox-form-grid">
              <label>
                <span>Setor</span>
                <input name="setor" type="text" required placeholder="Tecnologia" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Solicitante</span>
                <input name="solicitante" type="text" required placeholder="Servidor responsavel" ${items.length ? '' : 'disabled'} />
              </label>
              <label>
                <span>Prioridade</span>
                <select name="prioridade" ${items.length ? '' : 'disabled'}>
                  ${renderOptions(
                    (state.meta.priority_levels || []).map((entry, index) => ({ id: entry || index, label: entry })),
                    (item) => item.label,
                    'normal'
                  )}
                </select>
              </label>
              <label>
                <span>Centro de custo</span>
                <input name="centro_custo" type="text" placeholder="CC-ALMOX-01" ${items.length ? '' : 'disabled'} />
              </label>
              <label class="almox-form-grid__span-2">
                <span>Item</span>
                <select name="item_id" required ${items.length ? '' : 'disabled'}>
                  ${renderOptions(items, (item) => `${item.codigo_interno || item.id} · ${item.descricao}`, 'Selecione o item')}
                </select>
              </label>
              <label>
                <span>Quantidade</span>
                <input name="quantidade" type="number" min="0.01" step="0.01" required placeholder="2" ${items.length ? '' : 'disabled'} />
              </label>
              <label class="almox-form-grid__span-2">
                <span>Observacoes</span>
                <input name="observacoes" type="text" placeholder="Reposicao de rotina" ${items.length ? '' : 'disabled'} />
              </label>
              <button type="submit" class="btn btn-secondary" ${items.length ? '' : 'disabled'}>Abrir solicitacao</button>
            </form>
          </article>
        </div>
      </section>
    `;

    root.innerHTML = `
      <div class="almox-page-shell">
        <section class="almox-hero">
          <div>
            <span class="almox-hero__eyebrow">SINGEM Almoxarifado</span>
            <h2>Entrada, estoque, atendimento interno e trilha auditavel no mesmo cockpit.</h2>
            <p>
              Operacao orientada por saldo, criticidade, contas contabeis e fluxo de solicitacoes,
              com apoio direto ao contrato dos endpoints ja disponiveis no backend.
            </p>
          </div>
          <div class="almox-hero__actions">
            <button type="button" class="btn btn-secondary" data-almox-action="refresh">Atualizar dados</button>
            <button type="button" class="btn btn-outline" data-almox-action="focus-tab" data-tab-target="itens">Ir para itens</button>
          </div>
        </section>

        ${state.errorMessage ? `<div class="almox-alert">${safeText(state.errorMessage)}</div>` : ''}

        <div class="almox-tab-strip" role="tablist" aria-label="Modulos do almoxarifado">
          <button type="button" class="almox-tab ${state.activeTab === 'visao-geral' ? 'is-active' : ''}" data-almox-tab="visao-geral">Visao geral</button>
          <button type="button" class="almox-tab ${state.activeTab === 'itens' ? 'is-active' : ''}" data-almox-tab="itens">Itens</button>
          <button type="button" class="almox-tab ${state.activeTab === 'fluxo' ? 'is-active' : ''}" data-almox-tab="fluxo">Entradas e movimentos</button>
          <button type="button" class="almox-tab ${state.activeTab === 'solicitacoes' ? 'is-active' : ''}" data-almox-tab="solicitacoes">Solicitacoes</button>
          <button type="button" class="almox-tab ${state.activeTab === 'auditoria' ? 'is-active' : ''}" data-almox-tab="auditoria">Auditoria</button>
        </div>

        ${state.loading ? `<div class="almox-loading-bar">${safeText(state.loadingMessage)}</div>` : ''}

        ${visaoGeralPanel}

        <section class="almox-tab-panel" ${state.activeTab === 'itens' ? '' : 'hidden'}>
          <article class="almox-panel">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Catalogo operacional</span>
                <h3>Itens e niveis de estoque</h3>
              </div>
              <span class="almox-panel__meta">${renderListSummary(state.itens, 'Itens')}</span>
            </div>

            <form data-almox-form="filtro-itens" class="almox-filter-row">
              <input name="q" type="search" value="${safeAttr(state.filters.itens.q)}" placeholder="Buscar por descricao, CATMAT ou codigo" />
              <select name="status">
                <option value="">Todos os status</option>
                ${(state.meta.item_statuses || [])
                  .map(
                    (status) =>
                      `<option value="${safeAttr(status)}" ${state.filters.itens.status === status ? 'selected' : ''}>${safeText(status)}</option>`
                  )
                  .join('')}
              </select>
              <label class="almox-checkbox-inline">
                <input type="checkbox" name="somenteCriticos" ${state.filters.itens.somenteCriticos ? 'checked' : ''} />
                <span>Somente criticos</span>
              </label>
              <button type="submit" class="btn btn-outline">Aplicar</button>
            </form>

            <div class="almox-table-wrapper">
              <table class="almox-table">
                <thead>
                  <tr>
                    <th>Codigo</th>
                    <th>Descricao</th>
                    <th>Status</th>
                    <th>Saldo</th>
                    <th>Grupo</th>
                    <th>Localizacao</th>
                  </tr>
                </thead>
                <tbody>${itensRows}</tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="almox-tab-panel" ${state.activeTab === 'fluxo' ? '' : 'hidden'}>
          <div class="almox-two-column-grid">
            <article class="almox-panel">
              <div class="almox-panel__header">
                <div>
                  <span class="almox-panel__eyebrow">Notas fiscais</span>
                  <h3>Entradas registradas</h3>
                </div>
                <span class="almox-panel__meta">${renderListSummary(state.notas, 'Notas')}</span>
              </div>

              <form data-almox-form="filtro-notas" class="almox-filter-row">
                <input name="fornecedor" type="search" value="${safeAttr(state.filters.notas.fornecedor)}" placeholder="Fornecedor" />
                <input name="numero" type="search" value="${safeAttr(state.filters.notas.numero)}" placeholder="Numero da NF" />
                <button type="submit" class="btn btn-outline">Aplicar</button>
              </form>

              <div class="almox-table-wrapper">
                <table class="almox-table">
                  <thead>
                    <tr>
                      <th>Documento</th>
                      <th>Fornecedor</th>
                      <th>CNPJ</th>
                      <th>Entrada</th>
                      <th>Valor</th>
                      <th>Itens</th>
                    </tr>
                  </thead>
                  <tbody>${notasRows}</tbody>
                </table>
              </div>
            </article>

            <article class="almox-panel">
              <div class="almox-panel__header">
                <div>
                  <span class="almox-panel__eyebrow">Trilha de estoque</span>
                  <h3>Movimentacoes recentes</h3>
                </div>
                <span class="almox-panel__meta">${renderListSummary(state.movimentacoes, 'Movimentos')}</span>
              </div>

              <form data-almox-form="filtro-movimentacoes" class="almox-filter-row">
                <select name="item_id">
                  <option value="">Todos os itens</option>
                  ${items
                    .map(
                      (item) =>
                        `<option value="${safeAttr(item.id)}" ${String(state.filters.movimentacoes.item_id) === String(item.id) ? 'selected' : ''}>${safeText(item.codigo_interno || item.id)} · ${safeText(item.descricao)}</option>`
                    )
                    .join('')}
                </select>
                <select name="tipo">
                  <option value="">Todos os tipos</option>
                  ${(state.meta.movement_types || [])
                    .map(
                      (tipo) =>
                        `<option value="${safeAttr(tipo)}" ${state.filters.movimentacoes.tipo === tipo ? 'selected' : ''}>${safeText(tipo)}</option>`
                    )
                    .join('')}
                </select>
                <button type="submit" class="btn btn-outline">Aplicar</button>
              </form>

              <div class="almox-table-wrapper">
                <table class="almox-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Item</th>
                      <th>Quantidade</th>
                      <th>Valor</th>
                      <th>Origem</th>
                      <th>Data</th>
                    </tr>
                  </thead>
                  <tbody>${movimentacoesRows}</tbody>
                </table>
              </div>
            </article>
          </div>
        </section>

        <section class="almox-tab-panel" ${state.activeTab === 'solicitacoes' ? '' : 'hidden'}>
          <article class="almox-panel">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Fluxo interno</span>
                <h3>Solicitacoes e atendimento</h3>
              </div>
              <span class="almox-panel__meta">${renderListSummary(state.solicitacoes, 'Solicitacoes')}</span>
            </div>

            <form data-almox-form="filtro-solicitacoes" class="almox-filter-row">
              <select name="status">
                <option value="">Todos os status</option>
                ${(state.meta.solicitation_statuses || [])
                  .map(
                    (status) =>
                      `<option value="${safeAttr(status)}" ${state.filters.solicitacoes.status === status ? 'selected' : ''}>${safeText(status)}</option>`
                  )
                  .join('')}
              </select>
              <select name="prioridade">
                <option value="">Todas as prioridades</option>
                ${(state.meta.priority_levels || [])
                  .map(
                    (prioridade) =>
                      `<option value="${safeAttr(prioridade)}" ${state.filters.solicitacoes.prioridade === prioridade ? 'selected' : ''}>${safeText(prioridade)}</option>`
                  )
                  .join('')}
              </select>
              <button type="submit" class="btn btn-outline">Aplicar</button>
            </form>

            <div class="almox-table-wrapper">
              <table class="almox-table">
                <thead>
                  <tr>
                    <th>Solicitacao</th>
                    <th>Solicitante</th>
                    <th>Status</th>
                    <th>Prioridade</th>
                    <th>Itens</th>
                    <th>Acoes</th>
                  </tr>
                </thead>
                <tbody>${solicitacoesRows}</tbody>
              </table>
            </div>
          </article>
        </section>

        <section class="almox-tab-panel" ${state.activeTab === 'auditoria' ? '' : 'hidden'}>
          <article class="almox-panel">
            <div class="almox-panel__header">
              <div>
                <span class="almox-panel__eyebrow">Compliance</span>
                <h3>Log de auditoria do almoxarifado</h3>
              </div>
              <span class="almox-panel__meta">${state.isAdmin ? renderListSummary(state.auditoria, 'Eventos') : 'Restrito a administradores'}</span>
            </div>

            ${
              state.isAdmin
                ? `
                <form data-almox-form="filtro-auditoria" class="almox-filter-row">
                  <input name="acao" type="search" value="${safeAttr(state.filters.auditoria.acao)}" placeholder="Filtrar por acao" />
                  <input name="entidade_tipo" type="search" value="${safeAttr(state.filters.auditoria.entidade_tipo)}" placeholder="Filtrar por entidade" />
                  <button type="submit" class="btn btn-outline">Aplicar</button>
                </form>

                <div class="almox-table-wrapper">
                  <table class="almox-table">
                    <thead>
                      <tr>
                        <th>Acao</th>
                        <th>Entidade</th>
                        <th>ID</th>
                        <th>Usuario</th>
                        <th>Data</th>
                      </tr>
                    </thead>
                    <tbody>${auditoriaRows}</tbody>
                  </table>
                </div>
              `
                : '<p class="almox-empty-note">Seu perfil atual pode usar o modulo, mas a trilha dedicada de auditoria fica disponivel apenas para administradores.</p>'
            }
          </article>
        </section>
      </div>
    `;

    if (state.busyForm) {
      root.querySelectorAll('[data-almox-form] button[type="submit"]').forEach((button) => {
        button.disabled = true;
      });
    }
  }

  async function refreshAll({ silent = false } = {}) {
    state.loading = true;
    state.loadingMessage = silent ? 'Atualizando dados...' : 'Sincronizando operacao do almoxarifado...';
    render();

    const tasks = {
      meta: carregarMetaAlmoxarifado(),
      dashboard: carregarDashboardAlmoxarifado(),
      resumo: carregarResumoAlmoxarifado(),
      itens: listarItensAlmoxarifado(state.filters.itens),
      notas: listarNotasEntradaAlmoxarifado(state.filters.notas),
      movimentacoes: listarMovimentacoesAlmoxarifado(state.filters.movimentacoes),
      solicitacoes: listarSolicitacoesAlmoxarifado(state.filters.solicitacoes),
      auditoria: state.isAdmin
        ? listarAuditoriaAlmoxarifado(state.filters.auditoria)
        : Promise.resolve(createEmptyList())
    };

    const entries = Object.entries(tasks);
    const settled = await Promise.allSettled(entries.map(([, promise]) => promise));
    const failures = [];

    settled.forEach((result, index) => {
      const key = entries[index][0];
      if (result.status === 'fulfilled') {
        state[key] = result.value;
      } else {
        failures.push(`${key}: ${result.reason?.message || 'falha de leitura'}`);
      }
    });

    state.loading = false;
    state.errorMessage = failures.length
      ? `Alguns paines do almoxarifado nao puderam ser atualizados agora. ${failures.join(' | ')}`
      : '';
    render();
  }

  function readNumber(value) {
    if (value === '' || value === null || value === undefined) {
      return undefined;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function submitConta(form) {
    const formData = new FormData(form);
    await criarContaContabilAlmoxarifado({
      codigo: String(formData.get('codigo') || '').trim(),
      descricao: String(formData.get('descricao') || '').trim(),
      categoria: String(formData.get('categoria') || '').trim() || undefined
    });
    form.reset();
    app.showSuccess('Conta contabil criada no almoxarifado.');
    await refreshAll({ silent: true });
  }

  async function submitItem(form) {
    const formData = new FormData(form);
    await criarItemAlmoxarifado({
      descricao: String(formData.get('descricao') || '').trim(),
      codigo_interno: String(formData.get('codigo_interno') || '').trim() || undefined,
      unidade: String(formData.get('unidade') || '').trim() || 'UN',
      catmat_codigo: String(formData.get('catmat_codigo') || '').trim(),
      catmat_descricao: String(formData.get('catmat_descricao') || '').trim(),
      conta_contabil_id: readNumber(formData.get('conta_contabil_id')),
      grupo: String(formData.get('grupo') || '').trim() || undefined,
      subgrupo: String(formData.get('subgrupo') || '').trim() || undefined,
      localizacao: String(formData.get('localizacao') || '').trim() || undefined,
      estoque_minimo: readNumber(formData.get('estoque_minimo')),
      ponto_reposicao: readNumber(formData.get('ponto_reposicao')),
      imagens: []
    });
    form.reset();
    state.activeTab = 'itens';
    app.showSuccess('Item cadastrado no almoxarifado.');
    await refreshAll({ silent: true });
  }

  async function submitNota(form) {
    const formData = new FormData(form);
    const materialId = readNumber(formData.get('material_id'));
    const selectedItem = getSelectableItems(state).find((item) => item.id === materialId);

    await criarNotaEntradaAlmoxarifado({
      numero: String(formData.get('numero') || '').trim(),
      serie: String(formData.get('serie') || '').trim() || undefined,
      data_emissao: String(formData.get('data_emissao') || '').trim(),
      data_entrada: String(formData.get('data_entrada') || '').trim() || undefined,
      fornecedor: String(formData.get('fornecedor') || '').trim(),
      cnpj_fornecedor: String(formData.get('cnpj_fornecedor') || '').replace(/\D/g, '') || undefined,
      valor_total: readNumber(formData.get('valor_total')),
      tipo: 'entrada',
      itens: [
        {
          material_id: materialId,
          item_numero: 1,
          descricao_nf: String(formData.get('descricao_nf') || '').trim() || selectedItem?.descricao || 'Item NF',
          quantidade: readNumber(formData.get('quantidade')),
          valor_unitario: readNumber(formData.get('valor_unitario')),
          conta_contabil_id: selectedItem?.conta_contabil?.id || undefined
        }
      ]
    });
    form.reset();
    state.activeTab = 'fluxo';
    app.showSuccess('Nota de entrada registrada com sucesso.');
    await refreshAll({ silent: true });
  }

  async function submitMovimentacao(form) {
    const formData = new FormData(form);
    await criarMovimentacaoAlmoxarifado({
      item_id: readNumber(formData.get('item_id')),
      tipo: String(formData.get('tipo') || '').trim(),
      quantidade: readNumber(formData.get('quantidade')),
      valor_unitario: readNumber(formData.get('valor_unitario')),
      documento: String(formData.get('documento') || '').trim() || undefined,
      justificativa: String(formData.get('justificativa') || '').trim() || undefined,
      localizacao_destino: String(formData.get('localizacao_destino') || '').trim() || undefined
    });
    form.reset();
    state.activeTab = 'fluxo';
    app.showSuccess('Movimentacao registrada.');
    await refreshAll({ silent: true });
  }

  async function submitSolicitacao(form) {
    const formData = new FormData(form);
    await criarSolicitacaoAlmoxarifado({
      setor: String(formData.get('setor') || '').trim(),
      solicitante: String(formData.get('solicitante') || '').trim(),
      prioridade: String(formData.get('prioridade') || '').trim() || 'normal',
      centro_custo: String(formData.get('centro_custo') || '').trim() || undefined,
      observacoes: String(formData.get('observacoes') || '').trim() || undefined,
      itens: [
        {
          item_id: readNumber(formData.get('item_id')),
          quantidade: readNumber(formData.get('quantidade'))
        }
      ]
    });
    form.reset();
    state.activeTab = 'solicitacoes';
    app.showSuccess('Solicitacao aberta no fluxo do almoxarifado.');
    await refreshAll({ silent: true });
  }

  async function submitFilters(formName, form) {
    const formData = new FormData(form);

    if (formName === 'filtro-itens') {
      state.filters.itens = {
        q: String(formData.get('q') || '').trim(),
        status: String(formData.get('status') || '').trim(),
        somenteCriticos: formData.get('somenteCriticos') === 'on'
      };
      state.itens = await listarItensAlmoxarifado(state.filters.itens);
      state.activeTab = 'itens';
    }

    if (formName === 'filtro-notas') {
      state.filters.notas = {
        fornecedor: String(formData.get('fornecedor') || '').trim(),
        numero: String(formData.get('numero') || '').trim()
      };
      state.notas = await listarNotasEntradaAlmoxarifado(state.filters.notas);
      state.activeTab = 'fluxo';
    }

    if (formName === 'filtro-movimentacoes') {
      state.filters.movimentacoes = {
        item_id: String(formData.get('item_id') || '').trim(),
        tipo: String(formData.get('tipo') || '').trim()
      };
      state.movimentacoes = await listarMovimentacoesAlmoxarifado(state.filters.movimentacoes);
      state.activeTab = 'fluxo';
    }

    if (formName === 'filtro-solicitacoes') {
      state.filters.solicitacoes = {
        status: String(formData.get('status') || '').trim(),
        prioridade: String(formData.get('prioridade') || '').trim()
      };
      state.solicitacoes = await listarSolicitacoesAlmoxarifado(state.filters.solicitacoes);
      state.activeTab = 'solicitacoes';
    }

    if (formName === 'filtro-auditoria') {
      state.filters.auditoria = {
        acao: String(formData.get('acao') || '').trim(),
        entidade_tipo: String(formData.get('entidade_tipo') || '').trim()
      };
      state.auditoria = state.isAdmin ? await listarAuditoriaAlmoxarifado(state.filters.auditoria) : createEmptyList();
      state.activeTab = 'auditoria';
    }

    render();
  }

  async function handleSubmit(event) {
    const form = event.target.closest('[data-almox-form]');
    if (!form) {
      return;
    }

    event.preventDefault();
    const formName = form.dataset.almoxForm;

    try {
      state.busyForm = formName;
      render();

      if (formName === 'conta') {
        await submitConta(form);
      } else if (formName === 'item') {
        await submitItem(form);
      } else if (formName === 'nota') {
        await submitNota(form);
      } else if (formName === 'movimentacao') {
        await submitMovimentacao(form);
      } else if (formName === 'solicitacao') {
        await submitSolicitacao(form);
      } else {
        await submitFilters(formName, form);
      }
    } catch (error) {
      app.showError(`Falha no fluxo do almoxarifado: ${error.message}`, error);
    } finally {
      state.busyForm = '';
      render();
    }
  }

  async function handleClick(event) {
    const tabButton = event.target.closest('[data-almox-tab]');
    if (tabButton) {
      state.activeTab = tabButton.dataset.almoxTab;
      render();
      return;
    }

    const actionButton = event.target.closest('[data-almox-action]');
    if (!actionButton) {
      return;
    }

    const action = actionButton.dataset.almoxAction;

    try {
      if (action === 'refresh') {
        await refreshAll({ silent: true });
        return;
      }

      if (action === 'focus-tab') {
        state.activeTab = actionButton.dataset.tabTarget || 'visao-geral';
        render();
        return;
      }

      if (action === 'avancar-solicitacao') {
        const solicitacaoId = Number(actionButton.dataset.solicitacaoId || 0);
        const nextStatus = actionButton.dataset.nextStatus || '';
        const solicitacao = state.solicitacoes.items.find((entry) => entry.id === solicitacaoId);

        if (!solicitacao || !nextStatus) {
          return;
        }

        const confirmed = window.confirm(`Atualizar solicitacao #${solicitacaoId} para o status "${nextStatus}"?`);

        if (!confirmed) {
          return;
        }

        await atualizarStatusSolicitacaoAlmoxarifado(
          solicitacaoId,
          buildSolicitacaoStatusPayload(solicitacao, nextStatus)
        );
        app.showSuccess(`Solicitacao #${solicitacaoId} atualizada para ${nextStatus}.`);
        await refreshAll({ silent: true });
      }
    } catch (error) {
      app.showError(`Falha na acao do almoxarifado: ${error.message}`, error);
    }
  }

  function ensureRoot() {
    if (!root) {
      root = document.getElementById('almoxarifadoPageRoot');
    }

    return root;
  }

  function bind() {
    if (!ensureRoot() || root.dataset.bound === '1') {
      return;
    }

    root.dataset.bound = '1';
    root.addEventListener('submit', handleSubmit);
    root.addEventListener('click', (event) => {
      handleClick(event).catch((error) => {
        app.showError(`Falha na interacao do almoxarifado: ${error.message}`, error);
      });
    });
  }

  return {
    async activate() {
      if (!ensureRoot()) {
        return;
      }

      bind();
      if (!state.initialized) {
        state.initialized = true;
      }
      await refreshAll({ silent: false });
    },
    render,
    getState() {
      return state;
    }
  };
}

export function createAlmoxarifadoFeature(app) {
  return createFeatureContext(app);
}
