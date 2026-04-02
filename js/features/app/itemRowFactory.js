export function criarItemRow(
  app,
  tipo = 'empenho',
  seq = null,
  descricao = '',
  unidade = 'UN',
  quantidade = null,
  valorUnitario = null,
  subelemento = '',
  itemCompra = '',
  refEmpenho = null
) {
  if (seq === null) {
    const container =
      tipo === 'empenho' ? document.getElementById('itensEmpenho') : document.getElementById('itensNotaFiscal');
    const selector = tipo === 'notaFiscal' ? 'tr.nf-row' : '.item-row';
    seq = (container?.querySelectorAll(selector).length || 0) + 1;
  }

  const valorTotal = quantidade !== null && valorUnitario !== null ? quantidade * valorUnitario : 0;

  if (tipo === 'notaFiscal') {
    const tr = document.createElement('tr');
    const itemKey = `nf-item-${Date.now()}-${seq}`;

    const refQtdMax = refEmpenho?.quantidade || refEmpenho?.qtd || 0;
    const refVlrUnit = refEmpenho?.valorUnitario || 0;

    tr.className = 'nf-row nf-row-ok';
    tr.dataset.itemkey = itemKey;
    tr.dataset.refqtdmax = refQtdMax;
    tr.dataset.refvlrunit = refVlrUnit;

    tr.innerHTML = `
        <td class="col-seq"><span class="seq-badge">${seq}</span></td>
        <td class="col-sub"><input type="text" class="nf-subelemento" data-field="subelemento" value="${subelemento}" placeholder="Subelem." title="Subelemento de despesa"></td>
        <td class="col-item"><input type="text" class="nf-itemcompra" data-field="itemCompra" value="${itemCompra}" placeholder="Item"></td>
        <td class="col-desc"><input type="text" class="nf-descricao" data-field="descricao" value="${descricao}" placeholder="Descrição do item"></td>
        <td class="col-un"><input type="text" class="nf-unidade" data-field="unidade" value="${unidade}" placeholder="UN"></td>
        <td class="col-qtd"><input type="text" class="nf-qtd input-num" data-field="quantidade" value="${quantidade !== null ? window.formatarNumero(quantidade) : ''}" placeholder="0"></td>
        <td class="col-vlr"><input type="text" class="nf-vunit input-num" data-field="valorUnitario" value="${valorUnitario !== null ? window.formatarNumero(valorUnitario) : ''}" placeholder="0,00"></td>
        <td class="col-total"><input type="text" class="nf-vtotal input-num" data-field="valorTotal" value="${valorTotal > 0 ? window.formatarNumero(valorTotal) : ''}" placeholder="0,00" readonly></td>
        <td class="col-actions"><button type="button" class="btn-remove" title="Remover item">×</button></td>
      `;

    const qtdInput = tr.querySelector('.nf-qtd');
    const vlrUnitInput = tr.querySelector('.nf-vunit');
    const vlrTotalInput = tr.querySelector('.nf-vtotal');
    const btnRemove = tr.querySelector('.btn-remove');

    const calcularTotalEAtualizar = () => {
      const qtd = window.converterMoedaParaNumero(qtdInput.value) || 0;
      const vlrUnit = window.converterMoedaParaNumero(vlrUnitInput.value) || 0;
      const total = app.money2(qtd * vlrUnit);
      vlrTotalInput.value = window.formatarNumero(total);

      app.atualizarStatusLinhaItem(tr);
      app.calcularValorTotalNotaFiscal();
    };

    const formatarCampo = (input) => {
      input.addEventListener('blur', () => {
        if (input.value) {
          const valor = window.converterMoedaParaNumero(input.value);
          input.value = window.formatarNumero(valor);
        }
      });
    };

    const flashInput = (el) => {
      el.classList.remove('changed');
      void el.offsetWidth;
      el.classList.add('changed');
      setTimeout(() => el.classList.remove('changed'), 700);
    };

    formatarCampo(qtdInput);
    formatarCampo(vlrUnitInput);

    qtdInput.addEventListener('input', () => {
      flashInput(qtdInput);
      calcularTotalEAtualizar();
    });
    qtdInput.addEventListener('blur', calcularTotalEAtualizar);

    vlrUnitInput.addEventListener('input', () => {
      flashInput(vlrUnitInput);
      calcularTotalEAtualizar();
    });
    vlrUnitInput.addEventListener('blur', calcularTotalEAtualizar);

    btnRemove.addEventListener('click', () => {
      tr.remove();
      app.calcularValorTotalNotaFiscal();
    });

    return tr;
  }

  const itemRow = document.createElement('div');
  itemRow.className = 'item-row';

  itemRow.innerHTML = `
            <span class="item-seq">${seq}</span>
            <input type="text" class="item-subelemento" placeholder="Subelem." data-field="subelemento" value="${subelemento}" title="Subelemento de despesa">
            <input type="text" class="item-compra" placeholder="Item Cpr." data-field="itemCompra" value="${itemCompra}" title="Item de compra">
            <input type="text" class="item-descricao" placeholder="Descrição" data-field="descricao" value="${descricao}">
            <input type="text" class="item-unidade" placeholder="UN" data-field="unidade" value="${unidade}">
            <input type="text" class="item-quantidade" placeholder="Qtd" data-field="quantidade" value="${quantidade !== null ? window.formatarNumero(quantidade) : ''}">
            <input type="text" class="item-valor" placeholder="Vlr Unit." data-field="valorUnitario" value="${valorUnitario !== null ? window.formatarNumero(valorUnitario) : ''}">
            <input type="text" class="item-valor-total" placeholder="Vlr Total" data-field="valorTotal" value="${valorTotal > 0 ? window.formatarNumero(valorTotal) : ''}" readonly>
            <button type="button" class="btn-remove" onclick="this.parentElement.remove(); window.app.calcularValorTotalEmpenho(); window.app.calcularValorTotalNotaFiscal();">×</button>
        `;

  const qtdInput = itemRow.querySelector('[data-field="quantidade"]');
  const vlrUnitInput = itemRow.querySelector('[data-field="valorUnitario"]');
  const vlrTotalInput = itemRow.querySelector('[data-field="valorTotal"]');

  const calcularTotal = () => {
    const qtd = window.converterMoedaParaNumero(qtdInput.value) || 0;
    const vlrUnit = window.converterMoedaParaNumero(vlrUnitInput.value) || 0;
    const total = qtd * vlrUnit;

    vlrTotalInput.value = window.formatarNumero(total);

    if (tipo === 'empenho') {
      app.calcularValorTotalEmpenho();
    } else if (tipo === 'notaFiscal') {
      app.calcularValorTotalNotaFiscal();
    }
  };

  const formatarCampo = (input) => {
    input.addEventListener('blur', () => {
      if (input.value) {
        const valor = window.converterMoedaParaNumero(input.value);
        input.value = window.formatarNumero(valor);
      }
    });
  };

  formatarCampo(qtdInput);
  formatarCampo(vlrUnitInput);

  qtdInput.addEventListener('input', calcularTotal);
  qtdInput.addEventListener('blur', calcularTotal);
  vlrUnitInput.addEventListener('input', calcularTotal);
  vlrUnitInput.addEventListener('blur', calcularTotal);

  return itemRow;
}

export function atualizarStatusLinhaItem(app, tr) {
  if (!tr) {
    return;
  }

  const qtd = window.converterMoedaParaNumero(tr.querySelector('.nf-qtd')?.value) || 0;
  const vlrUnit = window.converterMoedaParaNumero(tr.querySelector('.nf-vunit')?.value) || 0;
  const refQtdMax = parseFloat(tr.dataset.refqtdmax) || 0;
  const refVlrUnit = parseFloat(tr.dataset.refvlrunit) || 0;

  const tolAbs = 0.01;
  const tolPct = 0.01;

  let status = 'ok';

  if (refQtdMax > 0 && qtd > refQtdMax) {
    status = 'bad';
  } else if (refVlrUnit > 0) {
    const diffAbs = Math.abs(vlrUnit - refVlrUnit);
    const diffPct = diffAbs / refVlrUnit;
    if (diffAbs > tolAbs && diffPct > tolPct) {
      status = 'warn';
    }
  }

  tr.classList.remove('nf-row-ok', 'nf-row-warn', 'nf-row-bad');
  tr.classList.add(`nf-row-${status}`);
}
