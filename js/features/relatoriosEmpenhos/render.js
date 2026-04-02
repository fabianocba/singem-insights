import { estadoRelatorio } from './state.js';
import { filtrarEmpenhos } from './selectors.js';

function formatCurrency(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
}

export async function renderizarResumoRelatorio() {
  const container = document.getElementById('resumoRelatorio');
  if (!container) {
    return;
  }

  const empenhosFiltrados = filtrarEmpenhos();
  const totalEmpenhos = empenhosFiltrados.length;
  const valorTotal = empenhosFiltrados.reduce((acc, e) => acc + (e.valorTotalEmpenho ?? e.valorTotal ?? 0), 0);
  const valorUtilizado = empenhosFiltrados.reduce((acc, e) => acc + (e.valorUtilizado ?? 0), 0);
  const saldoTotal = valorTotal - valorUtilizado;

  const comSaldo = empenhosFiltrados.filter((e) => e.saldoDisponivel > 0).length;
  const semSaldo = empenhosFiltrados.filter((e) => e.saldoDisponivel <= 0).length;
  const rascunhos = empenhosFiltrados.filter((e) => e.statusValidacao === 'rascunho' || !e.statusValidacao).length;
  const validados = empenhosFiltrados.filter((e) => e.statusValidacao === 'validado').length;

  container.innerHTML = `
    <div class="resumo-card destaque-azul">
      <div class="valor">${totalEmpenhos}</div>
      <div class="label">Total de Empenhos</div>
    </div>
    <div class="resumo-card">
      <div class="valor" style="font-size: 16px;">${formatCurrency(valorTotal)}</div>
      <div class="label">Valor Total Empenhado</div>
    </div>
    <div class="resumo-card destaque-verde">
      <div class="valor" style="font-size: 16px;">${formatCurrency(saldoTotal)}</div>
      <div class="label">Saldo Disponível</div>
    </div>
    <div class="resumo-card destaque-verde">
      <div class="valor">${comSaldo}</div>
      <div class="label">Com Saldo</div>
    </div>
    <div class="resumo-card destaque-vermelho">
      <div class="valor">${semSaldo}</div>
      <div class="label">Sem Saldo</div>
    </div>
    <div class="resumo-card destaque-amarelo">
      <div class="valor">${rascunhos}</div>
      <div class="label">Em Cadastro</div>
    </div>
    <div class="resumo-card destaque-azul">
      <div class="valor">${validados}</div>
      <div class="label">Validados</div>
    </div>
  `;
}

export async function renderizarListaRelatorio() {
  const container = document.getElementById('relatorioEmpenhosContainer');
  if (!container) {
    return;
  }

  const empenhosFiltrados = filtrarEmpenhos();
  await renderizarResumoRelatorio();

  if (empenhosFiltrados.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: #666;">
        <p>📭 Nenhum empenho encontrado com os filtros selecionados.</p>
        ${estadoRelatorio.filtros.busca ? '<p><small>Tente ajustar os termos da busca.</small></p>' : ''}
      </div>
    `;
    return;
  }

  const cardsHTML = empenhosFiltrados
    .map((emp) => {
      const valorEmpenho = emp.valorTotalEmpenho ?? emp.valorTotal ?? 0;
      const saldo = emp.saldoDisponivel ?? 0;
      const percentual = emp.percentualUtilizado ?? 0;
      const status = emp.statusValidacao || 'rascunho';

      let saldoCor = '#28a745';
      if (saldo <= 0) {
        saldoCor = '#dc3545';
      } else if (percentual >= 80) {
        saldoCor = '#ffc107';
      }

      const badgeClass = status === 'validado' ? 'badge-success' : 'badge-warning';
      const badgeText = status === 'validado' ? '✅ Validado' : '📝 Rascunho';

      return `
      <div class="empenho-card" data-empenho-id="${emp.id}" style="margin-bottom: 12px;">
        <div class="empenho-card__header">
          <span class="empenho-card__titulo">NE ${emp.ano}/${emp.numero}</span>
          <span class="badge ${badgeClass}">${badgeText}</span>
        </div>
        <div class="empenho-card__body">
          <div class="empenho-card__descricao" data-action="ver" data-id="${emp.id}" style="cursor: pointer;">
            ${emp.fornecedor || 'Fornecedor não informado'}
          </div>
          <div class="empenho-card__meta">
            <div class="empenho-card__info">
              <strong>Valor:</strong> ${formatCurrency(valorEmpenho)}
              <span style="margin-left: 16px; color: ${saldoCor}; font-weight: bold;">
                Saldo: ${formatCurrency(saldo)}
              </span>
              ${percentual > 0 ? `<span style="margin-left: 8px; color: #666; font-size: 12px;">(${percentual.toFixed(0)}% utilizado)</span>` : ''}
            </div>
            <div class="empenho-card__acoes">
              <button class="btn-acao" data-action="ver" data-id="${emp.id}" title="Visualizar">
                👁️ Ver
              </button>
              <button class="btn-acao" data-action="detalhes" data-id="${emp.id}" title="Detalhes">
                📋 Detalhes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    })
    .join('');

  container.innerHTML = `
    <div class="empenhos-lista">
      ${cardsHTML}
    </div>
    <div style="margin-top: 16px; padding-top: 12px; border-top: 1px solid #eee; font-size: 13px; color: #666;">
      📊 Exibindo ${empenhosFiltrados.length} de ${estadoRelatorio.empenhosComSaldo.length} empenho(s)
    </div>
  `;
}
