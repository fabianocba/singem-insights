import * as dbGateway from '../../core/dbGateway.js';

export async function carregarDadosIniciais(app) {
  try {
    await app.carregarEmpenhosSelect();
    await app.carregarFornecedoresFiltro();
    console.log('[APP] ℹ️ Sincronização de diretórios externos desativada (modo banco/API).');
  } catch (error) {
    console.error('Erro ao carregar dados iniciais:', error);
  }
}

export async function carregarEmpenhosSelect() {
  try {
    const empenhos = await dbGateway.buscarEmpenhos(true);

    const empenhoSelect = document.getElementById('empenhoSelect');
    if (empenhoSelect) {
      empenhoSelect.innerHTML = '<option value="">Selecione um empenho...</option>';
      empenhos.forEach((empenho) => {
        const option = document.createElement('option');
        option.value = empenho.id;
        option.textContent = `${empenho.numero} - ${empenho.fornecedor}`;
        empenhoSelect.appendChild(option);
      });
    }

    const empenhoAssociadoSelect = document.getElementById('empenhoAssociado');
    if (empenhoAssociadoSelect) {
      empenhoAssociadoSelect.innerHTML = '<option value="">Selecione um empenho...</option>';

      if (empenhos.length === 0) {
        const optionVazio = document.createElement('option');
        optionVazio.value = '';
        optionVazio.textContent = 'Nenhum empenho cadastrado';
        optionVazio.disabled = true;
        empenhoAssociadoSelect.appendChild(optionVazio);
      } else {
        const empenhosOrdenados = [...empenhos].sort((a, b) => {
          const anoA = parseInt(a.ano) || 0;
          const anoB = parseInt(b.ano) || 0;
          if (anoB !== anoA) {
            return anoB - anoA;
          }
          return (parseInt(b.numero) || 0) - (parseInt(a.numero) || 0);
        });

        empenhosOrdenados.forEach((empenho) => {
          const option = document.createElement('option');
          option.value = empenho.id;
          const valorFormatado =
            typeof empenho.valorTotal === 'number'
              ? empenho.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : 'R$ 0,00';
          const fornecedorResumo = (empenho.fornecedor || 'N/D').toUpperCase().substring(0, 30);
          option.textContent = `${empenho.ano || ''} NE ${empenho.numero || ''} — ${fornecedorResumo} — ${valorFormatado}`;
          empenhoAssociadoSelect.appendChild(option);
        });
      }
    }
  } catch (error) {
    console.error('[carregarEmpenhosSelect] Erro ao carregar empenhos:', error);
  }
}

export async function carregarFornecedoresFiltro() {
  try {
    const fornecedores = await dbGateway.buscarFornecedores();
    const filtroSelect = document.getElementById('filtroFornecedor');

    if (filtroSelect && fornecedores.length > 0) {
      filtroSelect.innerHTML = '<option value="">Todos os fornecedores</option>';
      fornecedores.forEach((fornecedor) => {
        const option = document.createElement('option');
        option.value = fornecedor.cnpj;
        option.textContent = fornecedor.nome;
        filtroSelect.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Erro ao carregar fornecedores:', error);
  }
}
