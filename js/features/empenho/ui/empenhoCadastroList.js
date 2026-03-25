import { renderRows } from '../../../shared/ui/table.js';

function renderizarItemCadastro(emp) {
  const status = emp.statusValidacao || 'rascunho';
  const badgeClass = status === 'validado' ? 'ativo' : status === 'concluido' ? 'concluido' : 'rascunho';
  const badgeText = status === 'validado' ? '✅ Ativo' : status === 'concluido' ? '🏁 Concluído' : '📝 Rascunho';
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
        <button class="btn-acao btn btn-outline btn-sm visualizar" data-id="${emp.id}" title="Visualizar empenho">Visualizar</button>
        <button class="btn-acao btn btn-danger btn-sm excluir" data-id="${emp.id}" title="Excluir empenho">Excluir</button>
      </div>
    </div>
  `;
}

export function renderizarListaCadastroAgrupada(empenhos, container) {
  if (!container) {
    return;
  }

  if (!empenhos?.length) {
    renderRows(
      container,
      [
        `
        <div class="empenhos-vazio">
          <div class="empenhos-vazio-icon">📭</div>
          <p>Nenhum empenho encontrado.</p>
        </div>
      `
      ],
      'Nenhum empenho encontrado.'
    );
    return;
  }

  const porAno = {};
  empenhos.forEach((emp) => {
    const ano = emp.ano || new Date(emp.dataCriacao).getFullYear();
    if (!porAno[ano]) {
      porAno[ano] = [];
    }
    porAno[ano].push(emp);
  });

  const anosOrdenados = Object.keys(porAno).sort((a, b) => b - a);

  const blocos = anosOrdenados.map((ano) => {
    const lista = porAno[ano].sort((a, b) => {
      const dataA = new Date(a.dataCriacao || 0).getTime() || a.id || 0;
      const dataB = new Date(b.dataCriacao || 0).getTime() || b.id || 0;
      if (dataB !== dataA) {
        return dataB - dataA;
      }
      return (parseInt(b.numero, 10) || 0) - (parseInt(a.numero, 10) || 0);
    });

    return `
      <div class="empenho-ano-grupo">
        <div class="empenho-ano-header" data-ano="${ano}">
          <span>📅 ${ano} · ${lista.length} empenho${lista.length > 1 ? 's' : ''}</span>
          <span class="ano-toggle">▼</span>
        </div>
        <div class="empenho-ano-lista" id="listaAno${ano}">
          ${lista.map((emp) => renderizarItemCadastro(emp)).join('')}
        </div>
      </div>
    `;
  });

  renderRows(container, blocos);
}
