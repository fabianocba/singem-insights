import { escapeHTML } from '../../utils/sanitize.js';

function formatNumeroSafe(value) {
  return window.formatarNumero(value || 0);
}

function buildSubelementoDisplay(item) {
  if (!item.subelementoCodigo) {
    return '-';
  }

  const codigo = escapeHTML(String(item.subelementoCodigo));
  const nome = escapeHTML(String(item.subelementoNome || 'N/A'));
  return `${codigo} - ${nome}`;
}

function buildCatmatDisplay(item) {
  const codigo = escapeHTML(String(item.catmatCodigo || '-'));
  const descricao = item.catmatDescricao ? ` - ${escapeHTML(String(item.catmatDescricao))}` : '';
  return `${codigo}${descricao}`;
}

function buildHiddenInput(field, value) {
  return `<input type="hidden" data-field="${field}" value="${escapeHTML(String(value ?? ''))}">`;
}

function buildItemRowMarkup(item, index) {
  const seq = item.seq || index + 1;
  const descricao = escapeHTML(String(item.descricao || ''));
  const unidade = escapeHTML(String(item.unidade || 'UN'));
  const itemCompra = escapeHTML(String(item.itemCompra || '-'));
  const observacao = item.observacao ? `<br><small>Obs: ${escapeHTML(String(item.observacao))}</small>` : '';
  const subelementoDisplay = buildSubelementoDisplay(item);
  const catmatDisplay = buildCatmatDisplay(item);

  const quantidadeFmt = formatNumeroSafe(item.quantidade);
  const valorUnitFmt = formatNumeroSafe(item.valorUnitario);
  const valorTotalFmt = formatNumeroSafe(item.valorTotal);

  return `
    <div class="item-row__content">
      <div class="item-row__info">
        <strong>${seq}.</strong> ${descricao}<br>
        <small>${unidade} | Qtd: ${quantidadeFmt} | Vlr Un.: ${valorUnitFmt} | Total: ${valorTotalFmt}</small><br>
        <small>Subelemento: ${subelementoDisplay} | Item Compra: ${itemCompra} | CATMAT: ${catmatDisplay}</small>
        ${observacao}
      </div>
      <div class="item-row__actions">
        <button type="button" class="btn btn-sm btn-secondary" data-action="edit">Editar</button>
        <button type="button" class="btn btn-sm btn-danger" data-action="delete">Excluir</button>
      </div>
    </div>
    ${buildHiddenInput('seq', seq)}
    ${buildHiddenInput('codigo', item.subelementoCodigo || '')}
    ${buildHiddenInput('descricao', item.descricao || '')}
    ${buildHiddenInput('unidade', item.unidade || 'UN')}
    ${buildHiddenInput('quantidade', quantidadeFmt)}
    ${buildHiddenInput('valorUnitario', valorUnitFmt)}
    ${buildHiddenInput('valorTotal', valorTotalFmt)}
    ${buildHiddenInput('itemCompra', item.itemCompra || '')}
    ${buildHiddenInput('subelementoCodigo', item.subelementoCodigo || '')}
    ${buildHiddenInput('subelementoNome', item.subelementoNome || '')}
    ${buildHiddenInput('observacao', item.observacao || '')}
    ${buildHiddenInput('catmatCodigo', item.catmatCodigo || '')}
    ${buildHiddenInput('catmatDescricao', item.catmatDescricao || '')}
    ${buildHiddenInput('catmatFonte', item.catmatFonte || '')}
  `;
}

function createItemRow(app, item, index) {
  const row = document.createElement('div');
  row.classList.add('item-row');
  row.innerHTML = buildItemRowMarkup(item, index);

  row.querySelector('[data-action="edit"]').addEventListener('click', () => app.abrirModalItemEmpenho({ index }));
  row.querySelector('[data-action="delete"]').addEventListener('click', () => app.excluirItemEmpenho(index));

  return row;
}

export function renderItensEmpenho(app) {
  const container = document.getElementById('itensEmpenho');
  if (!container) {
    return;
  }
  container.innerHTML = '';

  (app.empenhoDraft.itens || []).forEach((item, index) => {
    container.appendChild(createItemRow(app, item, index));
  });

  app.atualizarTotaisEmpenho();
  app.atualizarBadgeStatus();
  app.atualizarBotaoValidar();
}

export function calcularValorTotalEmpenho(app) {
  const container = document.getElementById('itensEmpenho');
  if (!container) {
    return;
  }

  let total = 0;
  container.querySelectorAll('.item-row').forEach((row) => {
    const valorTotalStr = row.querySelector('[data-field="valorTotal"]')?.value || '0';
    const valorTotal = window.converterMoedaParaNumero(valorTotalStr);
    total += valorTotal;
  });

  const valorTotalInput = document.getElementById('valorTotalEmpenho');
  if (valorTotalInput) {
    valorTotalInput.value = window.formatarNumero(total);
  }

  atualizarTotaisEmpenho(app);
}

export function atualizarTotaisEmpenho(app) {
  const totalItens = (app.empenhoDraft.itens || []).reduce((acc, item) => acc + (Number(item.valorTotal) || 0), 0);
  const campoValorTotal = document.getElementById('valorTotalEmpenho');
  const valorInformado = campoValorTotal ? app.parseNumero(campoValorTotal.value) : 0;

  const diffEl = document.getElementById('diferencaValor');
  const totalEl = document.getElementById('totalItensValor');

  if (totalEl) {
    totalEl.textContent = window.formatarNumero(totalItens);
  }

  if (diffEl) {
    const diff = valorInformado - totalItens;
    diffEl.textContent = window.formatarNumero(diff);
    diffEl.classList.toggle('text-danger', Math.abs(diff) > 0.01);
  }
}

export function excluirItemEmpenho(app, index) {
  if ((app.empenhoDraft.header?.statusValidacao || 'rascunho') === 'validado') {
    app.showToast('Empenho já validado. Não é possível excluir itens.', 'warning');
    return;
  }
  app.empenhoDraft.itens.splice(index, 1);
  reindexarSequenciaEmpenho(app);
  renderItensEmpenho(app);
}

export function reindexarSequenciaEmpenho(app) {
  app.empenhoDraft.itens = (app.empenhoDraft.itens || []).map((item, idx) => ({ ...item, seq: idx + 1 }));
}
