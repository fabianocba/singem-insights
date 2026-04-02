export function renderItensEmpenho(app) {
  const container = document.getElementById('itensEmpenho');
  if (!container) {
    return;
  }
  container.innerHTML = '';

  (app.empenhoDraft.itens || []).forEach((item, index) => {
    const subelementoDisplay = item.subelementoCodigo
      ? `${item.subelementoCodigo} - ${item.subelementoNome || 'N/A'}`
      : '-';

    const row = document.createElement('div');
    row.classList.add('item-row');
    row.innerHTML = `
        <div class="item-row__content">
          <div class="item-row__info">
            <strong>${item.seq || index + 1}.</strong> ${item.descricao || ''}<br>
            <small>${item.unidade || 'UN'} | Qtd: ${window.formatarNumero(item.quantidade || 0)} | Vlr Un.: ${window.formatarNumero(item.valorUnitario || 0)} | Total: ${window.formatarNumero(item.valorTotal || 0)}</small><br>
            <small>Subelemento: ${subelementoDisplay} | Item Compra: ${item.itemCompra || '-'} | CATMAT: ${item.catmatCodigo || '-'} ${item.catmatDescricao ? ' - ' + item.catmatDescricao : ''}</small>
            ${item.observacao ? `<br><small>Obs: ${item.observacao}</small>` : ''}
          </div>
          <div class="item-row__actions">
            <button type="button" class="btn btn-sm btn-secondary" data-action="edit">Editar</button>
            <button type="button" class="btn btn-sm btn-danger" data-action="delete">Excluir</button>
          </div>
        </div>
  <input type="hidden" data-field="seq" value="${item.seq || index + 1}">
  <input type="hidden" data-field="codigo" value="${item.subelementoCodigo || ''}">
  <input type="hidden" data-field="descricao" value="${item.descricao || ''}">
        <input type="hidden" data-field="unidade" value="${item.unidade || 'UN'}">
        <input type="hidden" data-field="quantidade" value="${window.formatarNumero(item.quantidade || 0)}">
        <input type="hidden" data-field="valorUnitario" value="${window.formatarNumero(item.valorUnitario || 0)}">
        <input type="hidden" data-field="valorTotal" value="${window.formatarNumero(item.valorTotal || 0)}">
        <input type="hidden" data-field="itemCompra" value="${item.itemCompra || ''}">
        <input type="hidden" data-field="subelementoCodigo" value="${item.subelementoCodigo || ''}">
        <input type="hidden" data-field="subelementoNome" value="${item.subelementoNome || ''}">
        <input type="hidden" data-field="observacao" value="${item.observacao || ''}">
        <input type="hidden" data-field="catmatCodigo" value="${item.catmatCodigo || ''}">
        <input type="hidden" data-field="catmatDescricao" value="${item.catmatDescricao || ''}">
        <input type="hidden" data-field="catmatFonte" value="${item.catmatFonte || ''}">
      `;

    row.querySelector('[data-action="edit"]').addEventListener('click', () => app.abrirModalItemEmpenho({ index }));
    row.querySelector('[data-action="delete"]').addEventListener('click', () => app.excluirItemEmpenho(index));

    container.appendChild(row);
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
