export function limparInfoEmpenhoNF(app) {
  app.empenhoVinculadoNF = null;

  const infoEmpenho = document.getElementById('infoEmpenhoSelecionado');
  const itensHint = document.getElementById('nfItensHint');
  const btnAddFromEmpenho = document.getElementById('btnAddItemFromEmpenho');
  const datalist = document.getElementById('datalistItensEmpenho');

  if (infoEmpenho) {
    infoEmpenho.style.display = 'none';
  }
  if (itensHint) {
    itensHint.textContent = 'Selecione um empenho para sugestões de itens';
    itensHint.style.color = '#1976d2';
  }
  if (btnAddFromEmpenho) {
    btnAddFromEmpenho.style.display = 'none';
  }
  if (datalist) {
    datalist.innerHTML = '';
  }
}

export function criarDatalistItensEmpenho(app, itens) {
  const datalist = document.getElementById('datalistItensEmpenho');
  if (!datalist || !itens) {
    return;
  }

  datalist.innerHTML = '';

  itens.forEach((item, idx) => {
    const option = document.createElement('option');
    const descricao = (item.descricao || item.material || '').toUpperCase();
    const unidade = item.unidade || 'UN';
    const vlrUnit = item.valorUnitario ? app.formatarMoeda(item.valorUnitario) : 'R$ 0,00';
    const itemCompra = item.itemCompra || item.codigo || String(idx + 1).padStart(3, '0');

    option.value = descricao;
    option.dataset.unidade = unidade;
    option.dataset.valorUnitario = item.valorUnitario || 0;
    option.dataset.itemCompra = itemCompra;
    option.textContent = `${descricao} | ${unidade} | ${vlrUnit}`;

    datalist.appendChild(option);
  });

  console.log(`[NF] Datalist criado com ${itens.length} itens`);
}
