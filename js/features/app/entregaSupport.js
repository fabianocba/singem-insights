import * as dbGateway from '../../core/dbGateway.js';
import { escapeHTML } from '../../utils/sanitize.js';

/**
 * Salva entrega no banco de dados
 * @param {object} app - instância de ControleMaterialApp
 */
export async function salvarEntrega(app) {
  try {
    app.showLoading('Salvando entrega...');

    const formData = new FormData(document.getElementById('formEntrega'));
    const itensRecebidos = coletarItensRecebidos('itensEntrega');

    const entrega = {
      empenhoId: formData.get('empenhoSelect'),
      dataEntrega: formData.get('dataEntrega'),
      observacoes: formData.get('observacoesEntrega'),
      itensRecebidos: itensRecebidos
    };

    await dbGateway.salvarEntrega(entrega);

    app.showSuccess('Entrega registrada com sucesso!');
    app.limparFormulario('formEntrega');
  } catch (error) {
    console.error('Erro ao salvar entrega:', error);
    app.showError('Erro ao salvar entrega: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

/**
 * Coleta dados dos itens recebidos na entrega a partir do DOM
 * @param {string} containerId - ID do container HTML
 * @returns {Array} itens com quantidadeRecebida > 0
 */
export function coletarItensRecebidos(containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('[coletarItensRecebidos] Container não encontrado:', containerId);
    return [];
  }
  const itens = [];

  container.querySelectorAll('.item-row').forEach((row) => {
    const quantidadeRecebida = parseFloat(row.querySelector('[data-field="quantidadeRecebida"]')?.value) || 0;

    if (quantidadeRecebida > 0) {
      const item = {
        codigo: row.querySelector('[data-field="codigo"]')?.textContent || '',
        descricao: row.querySelector('[data-field="descricao"]')?.textContent || '',
        unidade: row.querySelector('[data-field="unidade"]')?.textContent || 'UN',
        valorUnitario: parseFloat(row.querySelector('[data-field="valorUnitario"]')?.textContent) || 0,
        quantidade: quantidadeRecebida
      };
      itens.push(item);
    }
  });

  return itens;
}

/**
 * Carrega itens de um empenho na tela de entrega
 * @param {number} empenhoId - ID do empenho
 */
export async function carregarItensEmpenho(empenhoId) {
  try {
    const empenho = await dbGateway.buscarEmpenhoPorId(empenhoId);
    if (!empenho) {
      return;
    }

    const container = document.getElementById('itensEntrega');
    container.innerHTML = '';

    empenho.itens.forEach((item) => {
      const itemRow = document.createElement('div');
      itemRow.className = 'item-row';
      itemRow.innerHTML = `
                    <div data-field="codigo">${escapeHTML(String(item.codigo ?? ''))}</div>
                    <div data-field="descricao">${escapeHTML(String(item.descricao ?? ''))}</div>
                    <div data-field="unidade">${escapeHTML(String(item.unidade ?? ''))}</div>
                    <div data-field="valorUnitario">${escapeHTML(String(item.valorUnitario ?? ''))}</div>
                    <input type="number" placeholder="Qtd. Recebida" data-field="quantidadeRecebida" step="0.01" max="${parseFloat(item.quantidade) || 0}">
                `;
      container.appendChild(itemRow);
    });
  } catch (error) {
    console.error('Erro ao carregar itens do empenho:', error);
  }
}

/**
 * Calcula valor total dos itens
 * @param {Array} itens - array de itens com { quantidade, valorUnitario }
 * @returns {number} valor total
 */
export function calcularValorTotalItens(itens) {
  return itens.reduce((total, item) => {
    return total + item.quantidade * item.valorUnitario;
  }, 0);
}
