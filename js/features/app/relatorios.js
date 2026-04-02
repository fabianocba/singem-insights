/**
 * Módulo de Relatórios e Controle de Saldos
 * Extraído de js/app.js — Fase 2 da modularização
 *
 * Todas as funções aceitam `app` (instância de ControleMaterialApp) como
 * primeiro argumento quando precisam de métodos de UI da classe.
 */

import * as FormatUtils from '../../core/format.js';
import * as dbGateway from '../../core/dbGateway.js';

// ============================================================================
// GERAÇÃO DE RELATÓRIOS
// ============================================================================

/**
 * Gera relatório pelo tipo solicitado
 * @param {object} app - Instância de ControleMaterialApp
 * @param {string} tipo - Tipo de relatório
 */
export async function gerarRelatorio(app, tipo) {
  try {
    app.showLoading('Gerando relatório...');

    let dados = null;
    let titulo = '';

    switch (tipo) {
      case 'conferencia':
        titulo = 'Relatório de Conferência';
        // TODO: Implementar lógica específica
        break;

      case 'saldos':
        titulo = 'Controle de Saldos de Empenhos';
        await exibirControleSaldos(app);
        return; // Usa visualização customizada

      case 'empenhos':
        titulo = 'Relatório de Empenhos';
        // buscarEmpenhos() agora já retorna apenas empenhos ativos
        dados = await dbGateway.buscarEmpenhos();
        break;

      case 'entregas':
        titulo = 'Relatório de Entregas';
        dados = await dbGateway.invokeIfAvailable('buscarEntregas');
        break;

      case 'divergencias':
        titulo = 'Relatório de Divergências';
        // TODO: Implementar lógica específica
        break;
    }

    exibirRelatorio(titulo, dados);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    app.showError('Erro ao gerar relatório: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

// ============================================================================
// CONTROLE DE SALDOS
// ============================================================================

/**
 * Exibe o controle de saldos de empenhos (formato planilha)
 * @param {object} app - Instância de ControleMaterialApp
 */
export async function exibirControleSaldos(app) {
  try {
    const reportContent = document.getElementById('reportContent');
    const reportTitle = document.getElementById('reportTitle');
    const reportData = document.getElementById('reportData');

    reportTitle.textContent = '📊 Controle de Saldos de Empenhos';
    reportContent.classList.remove('hidden');

    // Buscar empenhos COM arquivo válido
    const empenhos = await dbGateway.buscarEmpenhos();

    // Buscar TODOS (incluindo sem arquivo) para estatística
    const empenhosCompletos = await dbGateway.buscarEmpenhos(true);

    console.log(
      `📊 Controle de Saldos: ${empenhosCompletos.length} empenhos no total, ${empenhos.length} com arquivo válido`
    );

    if (empenhosCompletos.length > empenhos.length) {
      console.warn(`⚠️ ${empenhosCompletos.length - empenhos.length} empenho(s) sem arquivo ou deletado(s)`);
    }

    if (!empenhos || empenhos.length === 0) {
      reportData.innerHTML = `
        <div style="text-align: center; padding: 40px;">
          <p style="font-size: 18px; color: #666;">📭 Nenhum empenho com arquivo válido.</p>
          <p>Cadastre empenhos e salve os arquivos PDF para visualizar o controle de saldos.</p>
          ${
            empenhosCompletos.length > 0
              ? `
            <p style="margin-top: 20px; color: #999; font-size: 14px;">
              <em>Existem ${empenhosCompletos.length} empenho(s) no banco sem arquivo vinculado ou com arquivo deletado.<br>
              Execute a sincronização ou limpe registros órfãos em Configurações.</em>
            </p>
          `
              : ''
          }
        </div>
      `;
      return;
    }

    // Criar seletor de empenhos
    const html = `
      <div style="margin-bottom: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px;">
        <div style="display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 300px;">
            <label style="font-weight: bold; margin-right: 10px; display: block; margin-bottom: 5px;">Selecione o Empenho:</label>
            <select id="saldoEmpenhoSelect" style="width: 100%; padding: 8px; font-size: 14px; border-radius: 4px; border: 1px solid #ccc;">
              <option value="">-- Selecione um empenho --</option>
              ${empenhos
                .map(
                  (emp) => `
                <option value="${emp.id}">
                  NE ${emp.numero} - ${emp.fornecedor} - ${FormatUtils.formatCurrencyBR(emp.valorTotalEmpenho ?? emp.valorTotal ?? 0)}
                </option>
              `
                )
                .join('')}
            </select>
          </div>
          <button
            onclick="window.app.exibirControleSaldos()"
            style="padding: 10px 20px; background: #17a2b8; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold; white-space: nowrap;"
            title="Recarregar lista de empenhos">
            🔄 Atualizar Lista
          </button>
        </div>
        <p style="margin-top: 10px; font-size: 12px; color: #666;">
          💡 Se algum empenho ainda aparece após deletar o arquivo, clique em "Atualizar Lista" ou execute a sincronização em Configurações.
        </p>
      </div>
      <div id="saldoDetalhes" style="margin-top: 20px;"></div>
    `;

    reportData.innerHTML = html;

    // Adicionar evento ao select
    document.getElementById('saldoEmpenhoSelect').addEventListener('change', async (e) => {
      const empenhoId = parseInt(e.target.value);
      if (empenhoId) {
        await carregarSaldoEmpenho(app, empenhoId);
      } else {
        document.getElementById('saldoDetalhes').innerHTML = '';
      }
    });
  } catch (error) {
    console.error('Erro ao exibir controle de saldos:', error);
    app.showError('Erro ao carregar controle de saldos: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

/**
 * Carrega o controle de saldos na aba dedicada da tela principal
 * @param {object} app - Instância de ControleMaterialApp
 */
export async function carregarControleSaldosTab(app) {
  const container = document.getElementById('controleSaldosContainer');
  if (!container) {
    return;
  }

  try {
    const empenhosCompletos = await dbGateway.buscarEmpenhos(true);
    const empenhosComArquivo = await dbGateway.buscarEmpenhos();

    if (!empenhosCompletos || empenhosCompletos.length === 0) {
      container.innerHTML = `
          <div class="sg-empty-state">
            <p class="sg-empty-state__title">Nenhum empenho cadastrado.</p>
            <p class="sg-empty-state__text">Cadastre empenhos para visualizar o controle de saldos.</p>
          </div>
        `;
      return;
    }

    const optionsHtml = empenhosCompletos
      .map((emp) => {
        const numero = String(emp.numero || 'Sem número');
        const fornecedor = String(emp.fornecedor || 'Fornecedor não informado');
        const valorFormatado = FormatUtils.formatCurrencyBR(emp.valorTotalEmpenho ?? emp.valorTotal ?? 0);

        return `
            <option value="${emp.id}">
              NE ${numero} - ${fornecedor} - ${valorFormatado}
            </option>
          `;
      })
      .join('');

    container.innerHTML = `
        <section class="sg-section-shell sg-saldo-panel">
          <div class="sg-toolbar sg-saldo-toolbar">
            <div class="sg-saldo-toolbar__field">
              <label for="saldoEmpenhoSelectTab" class="sg-saldo-toolbar__label">Selecione o Empenho:</label>
              <select id="saldoEmpenhoSelectTab" class="sg-inline-select">
                <option value="">-- Selecione um empenho --</option>
                ${optionsHtml}
              </select>
            </div>
            <button
              type="button"
              id="btnAtualizarControleSaldos"
              class="btn btn-secondary inline-flex items-center gap-1 px-4 py-2 whitespace-nowrap"
              title="Recarregar lista de empenhos">
              Atualizar lista
            </button>
          </div>
          <p class="sg-info-note sg-saldo-toolbar__meta">
            Total: ${empenhosCompletos.length} empenho(s) | ${empenhosComArquivo.length} com arquivo PDF vinculado
          </p>
          <div id="saldoDetalhesTab" class="sg-saldo-details" aria-live="polite"></div>
        </section>
      `;

    document.getElementById('btnAtualizarControleSaldos')?.addEventListener('click', () => {
      app.carregarControleSaldos();
    });

    document.getElementById('saldoEmpenhoSelectTab')?.addEventListener('change', async (e) => {
      const empenhoId = parseInt(e.target.value, 10);
      if (empenhoId) {
        await app.carregarSaldoEmpenhoTab(empenhoId);
      } else {
        const details = document.getElementById('saldoDetalhesTab');
        if (details) {
          details.replaceChildren();
        }
      }
    });
  } catch (error) {
    console.error('Erro ao carregar controle de saldos:', error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'alert alert-danger';
    errorDiv.textContent = `Erro ao carregar: ${error.message || 'Erro desconhecido'}`;
    container.replaceChildren(errorDiv);
  }
}

/**
 * Carrega e exibe o saldo detalhado de um empenho específico
 * @param {object} app - Instância de ControleMaterialApp
 * @param {number} empenhoId - ID do empenho
 * @param {HTMLElement|null} container - Container opcional para o resultado
 */
export async function carregarSaldoEmpenho(app, empenhoId, container = null) {
  try {
    // Usar container fornecido ou o padrão
    const saldoDetalhes =
      container || document.getElementById('saldoDetalhes') || document.getElementById('saldoDetalhesTab');
    if (!saldoDetalhes) {
      return;
    }

    saldoDetalhes.innerHTML = '<p style="text-align: center;">⏳ Carregando saldo...</p>';

    // Primeiro, verificar se o empenho existe e não foi deletado
    const empenho = await dbGateway.buscarEmpenhoPorId(empenhoId);

    if (!empenho) {
      saldoDetalhes.innerHTML = `
        <div style="text-align: center; padding: 20px; background: #fed7d7; border-radius: 8px;">
          <p style="color: #742a2a;">❌ Empenho não encontrado no banco de dados.</p>
        </div>
      `;
      return;
    }

    // Verificar se o arquivo foi deletado
    if (empenho.arquivoDeletado) {
      saldoDetalhes.innerHTML = `
        <div style="text-align: center; padding: 20px; background: #fff5e6; border: 2px solid #ff9800; border-radius: 8px;">
          <h3 style="color: #e65100; margin-top: 0;">⚠️ Arquivo Deletado Externamente</h3>
          <p style="color: #666;">
            O arquivo PDF deste empenho foi deletado em:<br>
            <strong>${new Date(empenho.arquivoDeletadoEm).toLocaleString('pt-BR')}</strong>
          </p>
          <p style="color: #666;">
            O registro ainda existe no banco de dados, mas o arquivo físico não está mais disponível.
          </p>
          <div style="margin-top: 20px;">
            <button
              class="btn btn-danger"
              onclick="if(confirm('Deseja excluir permanentemente este registro do banco de dados?')) { window.app.excluirDocumento(${empenhoId}, 'empenho').then(() => window.app.gerarRelatorio('saldos')); }"
              style="margin-right: 10px;"
            >
              🗑️ Excluir Registro
            </button>
            <button
              class="btn btn-secondary"
              onclick="document.getElementById('saldoDetalhes').innerHTML = '';"
            >
              ← Voltar
            </button>
          </div>
        </div>
      `;
      return;
    }

    let saldo = await dbGateway.buscarSaldoEmpenho(empenhoId);

    // Se não existe controle de saldo, criar automaticamente
    if (!saldo) {
      console.log('⚠️ Saldo não encontrado. Criando controle automaticamente...');

      // Criar saldos para este empenho
      try {
        await dbGateway.criarSaldosEmpenho(empenhoId, empenho);
        console.log('✅ Controle de saldo criado com sucesso!');

        // Buscar novamente após criar
        saldo = await dbGateway.buscarSaldoEmpenho(empenhoId);
      } catch (error) {
        console.error('Erro ao criar saldos:', error);
        saldoDetalhes.innerHTML = `
          <div style="text-align: center; padding: 20px; background: #fed7d7; border-radius: 8px;">
            <p style="color: #742a2a;">❌ Erro ao criar controle de saldo: ${error.message}</p>
          </div>
        `;
        return;
      }
    }

    // Cabeçalho com informações do empenho
    let html = `
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0;">📋 Empenho Nº ${saldo.numeroEmpenho}</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; font-size: 14px;">
          <div>
            <strong>Fornecedor:</strong><br>${saldo.fornecedor}
          </div>
          <div>
            <strong>Data:</strong><br>${new Date(saldo.dataEmpenho).toLocaleDateString('pt-BR')}
          </div>
          <div>
            <strong>Status:</strong><br>
            <span style="background: ${getStatusColor(saldo.statusGeral)}; padding: 4px 12px; border-radius: 12px; font-weight: bold;">
              ${getStatusLabel(saldo.statusGeral)}
            </span>
          </div>
        </div>
      </div>
    `;

    // Coletar todas as NFs únicas com suas datas
    const nfsMap = new Map();
    saldo.itens.forEach((item) => {
      item.entradas.forEach((entrada) => {
        if (!nfsMap.has(entrada.notaFiscal)) {
          nfsMap.set(entrada.notaFiscal, entrada.data);
        }
      });
    });

    // Converter para array e ordenar
    const nfsOrdenadas = Array.from(nfsMap.keys()).sort();

    // Se não há entradas ainda, criar pelo menos 2 colunas vazias
    const numColunasEntrada = Math.max(nfsOrdenadas.length, 2);
    const colunasVazias = numColunasEntrada - nfsOrdenadas.length;

    // Tabela estilo planilha
    html += `
      <div style="overflow-x: auto; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <table style="width: 100%; border-collapse: collapse; background: white; font-size: 13px;">
          <thead>
            <tr style="background: linear-gradient(to bottom, #4a5568 0%, #2d3748 100%); color: white;">
              <th style="padding: 12px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">Seq</th>
              <th style="padding: 12px 8px; text-align: left; border-right: 1px solid rgba(255,255,255,0.1); min-width: 250px;">Produto</th>
              <th style="padding: 12px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1);">UN</th>
              <th style="padding: 12px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.1);">Qtd Emp.</th>
              <th style="padding: 12px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.1);">Vlr. Unit.</th>
              <th style="padding: 12px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.1);">Vlr. Total</th>
    `;

    // Cabeçalhos dinâmicos para cada NF
    nfsOrdenadas.forEach((nf) => {
      const dataNF = new Date(nfsMap.get(nf)).toLocaleDateString('pt-BR');
      html += `
              <th style="padding: 12px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); min-width: 130px; background: rgba(56, 178, 172, 0.2);">
                <div style="font-size: 11px; opacity: 0.8;">Entrada</div>
                <div style="font-weight: bold;">NF ${nf}</div>
                <div style="font-size: 10px; opacity: 0.7; margin-top: 2px;">${dataNF}</div>
              </th>
      `;
    });

    // Colunas vazias para futuras entradas
    for (let i = 0; i < colunasVazias; i++) {
      html += `
              <th style="padding: 12px 8px; text-align: center; border-right: 1px solid rgba(255,255,255,0.1); min-width: 120px; background: rgba(160, 174, 192, 0.1);">
                <div style="font-size: 11px; opacity: 0.6;">Entrada</div>
                <div style="font-weight: bold; opacity: 0.5;">--</div>
              </th>
      `;
    }

    html += `
              <th style="padding: 12px 8px; text-align: right; border-right: 1px solid rgba(255,255,255,0.1);">Saldo Qtd</th>
              <th style="padding: 12px 8px; text-align: right;">Saldo Valor</th>
            </tr>
          </thead>
          <tbody>
    `;

    // Linhas de itens
    saldo.itens.forEach((item, index) => {
      // Calcular percentual de saldo restante
      const percentualSaldo = (item.saldoQuantidade / item.quantidadeEmpenhada) * 100;

      // Definir cor da linha baseado no saldo
      let corLinha = '';
      let corTexto = '#2d3748';

      if (percentualSaldo === 0) {
        // Saldo zerado = verde
        corLinha = 'background: linear-gradient(to right, rgba(72, 187, 120, 0.15), rgba(72, 187, 120, 0.05));';
        corTexto = '#2d5016';
      } else if (percentualSaldo < 20) {
        // Saldo crítico (< 20%) = amarelo
        corLinha = 'background: linear-gradient(to right, rgba(237, 137, 54, 0.2), rgba(237, 137, 54, 0.08));';
        corTexto = '#744210';
      } else {
        // Saldo normal = vermelho claro
        corLinha = 'background: linear-gradient(to right, rgba(229, 62, 62, 0.12), rgba(229, 62, 62, 0.04));';
        corTexto = '#742a2a';
      }

      // Se for linha par, aplicar fundo zebrado leve
      if (index % 2 === 0) {
        corLinha = corLinha.replace('0.15', '0.18').replace('0.2', '0.23').replace('0.12', '0.15');
      }

      html += `
        <tr style="${corLinha}">
          <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${corTexto};">${item.itemSequencia}</td>
          <td style="padding: 10px 8px; text-align: left; border-bottom: 1px solid #e2e8f0;">
            <div style="font-weight: 500; color: ${corTexto};">${item.descricaoItem}</div>
            ${item.codigoItem ? `<div style="font-size: 11px; color: #718096;">Cód: ${item.codigoItem}</div>` : ''}
          </td>
          <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; color: ${corTexto};">${item.unidade}</td>
          <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: 500; color: ${corTexto};">${item.quantidadeEmpenhada.toFixed(2)}</td>
          <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; color: ${corTexto};">R$ ${item.valorUnitario.toFixed(2)}</td>
          <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; color: ${corTexto};">R$ ${item.valorTotalItem.toFixed(2)}</td>
      `;

      // Células de entrada para cada NF
      nfsOrdenadas.forEach((nf) => {
        const entrada = item.entradas.find((e) => e.notaFiscal === nf);
        if (entrada) {
          html += `
          <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; background: rgba(56, 178, 172, 0.08);">
            <div style="font-weight: bold; color: #2c7a7b; font-size: 15px;">${entrada.quantidade.toFixed(2)}</div>
          </td>
          `;
        } else {
          html += `
          <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0;">
            <span style="color: #cbd5e0; font-size: 18px;">-</span>
          </td>
          `;
        }
      });

      // Células vazias para futuras entradas
      for (let i = 0; i < colunasVazias; i++) {
        html += `
          <td style="padding: 10px 8px; text-align: center; border-bottom: 1px solid #e2e8f0; background: rgba(247, 250, 252, 0.5);">
            <span style="color: #e2e8f0; font-size: 18px;">-</span>
          </td>
        `;
      }

      html += `
          <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 14px; color: ${percentualSaldo === 0 ? '#38a169' : percentualSaldo < 20 ? '#d69e2e' : '#e53e3e'};">
            ${item.saldoQuantidade.toFixed(2)}
          </td>
          <td style="padding: 10px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-weight: bold; font-size: 14px; color: ${percentualSaldo === 0 ? '#38a169' : percentualSaldo < 20 ? '#d69e2e' : '#e53e3e'};">
            R$ ${item.saldoValor.toFixed(2)}
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
          <tfoot>
            <tr style="background: linear-gradient(to bottom, #2d3748 0%, #1a202c 100%); color: white; font-weight: bold;">
              <td colspan="5" style="padding: 15px 8px; text-align: right; font-size: 14px;">
                TOTAIS:
              </td>
              <td style="padding: 15px 8px; text-align: right; font-size: 14px;">
                R$ ${saldo.resumo.valorTotalEmpenhado.toFixed(2)}
              </td>
              <td colspan="${numColunasEntrada}" style="padding: 15px 8px; text-align: center; font-size: 12px; color: #a0aec0;">
                Recebido: R$ ${saldo.resumo.valorRecebido.toFixed(2)}
              </td>
              <td colspan="2" style="padding: 15px 8px; text-align: right; font-size: 16px; color: ${saldo.resumo.saldoValorTotal > 0 ? '#fc8181' : '#68d391'};">
                R$ ${saldo.resumo.saldoValorTotal.toFixed(2)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

    // Resumo visual
    const percentualRecebido = ((saldo.resumo.valorRecebido / saldo.resumo.valorTotalEmpenhado) * 100).toFixed(1);
    html += `
      <div style="margin-top: 20px; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
        <h4 style="margin: 0 0 15px 0; color: #2d3748;">📈 Resumo do Recebimento</h4>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div style="padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; opacity: 0.9;">Valor Empenhado</div>
            <div style="font-size: 24px; font-weight: bold; margin-top: 5px;">R$ ${saldo.resumo.valorTotalEmpenhado.toFixed(2)}</div>
          </div>
          <div style="padding: 15px; background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; opacity: 0.9;">Valor Recebido</div>
            <div style="font-size: 24px; font-weight: bold; margin-top: 5px;">R$ ${saldo.resumo.valorRecebido.toFixed(2)}</div>
            <div style="font-size: 11px; margin-top: 5px; opacity: 0.9;">(${percentualRecebido}%)</div>
          </div>
          <div style="padding: 15px; background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%); color: white; border-radius: 8px; text-align: center;">
            <div style="font-size: 12px; opacity: 0.9;">Saldo a Receber</div>
            <div style="font-size: 24px; font-weight: bold; margin-top: 5px;">R$ ${saldo.resumo.saldoValorTotal.toFixed(2)}</div>
          </div>
        </div>

        <!-- Barra de progresso -->
        <div style="margin-top: 15px;">
          <div style="background: #e2e8f0; height: 30px; border-radius: 15px; overflow: hidden; position: relative;">
            <div style="background: linear-gradient(90deg, #48bb78 0%, #38a169 100%); height: 100%; width: ${percentualRecebido}%; transition: width 0.3s ease; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 12px;">
              ${percentualRecebido > 15 ? percentualRecebido + '%' : ''}
            </div>
            ${percentualRecebido <= 15 ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-weight: bold; color: #4a5568;">${percentualRecebido}%</div>` : ''}
          </div>
        </div>
      </div>
    `;

    saldoDetalhes.innerHTML = html;
  } catch (error) {
    console.error('Erro ao carregar saldo do empenho:', error);
    document.getElementById('saldoDetalhes').innerHTML = `
      <div style="padding: 20px; background: #fed7d7; border-radius: 8px; color: #742a2a;">
        <strong>❌ Erro ao carregar saldo:</strong> ${error.message}
      </div>
    `;
  }
}

// ============================================================================
// HELPERS DE STATUS — funções puras
// ============================================================================

/**
 * Retorna cor do status geral de saldo
 * @param {string} status
 */
export function getStatusColor(status) {
  const cores = {
    pendente: 'rgba(237, 137, 54, 0.9)',
    parcial: 'rgba(66, 153, 225, 0.9)',
    completo: 'rgba(72, 187, 120, 0.9)'
  };
  return cores[status] || 'rgba(160, 174, 192, 0.9)';
}

/**
 * Retorna label traduzida do status
 * @param {string} status
 */
export function getStatusLabel(status) {
  const labels = {
    pendente: '⏳ Pendente',
    parcial: '🔄 Parcial',
    completo: '✅ Completo'
  };
  return labels[status] || status;
}

/**
 * Retorna cor do status do saldo do item
 * @param {string} status
 */
export function getSaldoStatusColor(status) {
  const cores = {
    pendente: '#ed8936',
    parcial: '#4299e1',
    completo: '#48bb78'
  };
  return cores[status] || '#a0aec0';
}

// ============================================================================
// EXIBIÇÃO DE RELATÓRIO GENÉRICO
// ============================================================================

/**
 * Exibe relatório na tela (função pura, sem dependência de `app`)
 * @param {string} titulo
 * @param {Array|null} dados
 */
export function exibirRelatorio(titulo, dados) {
  const reportContent = document.getElementById('reportContent');
  const reportTitle = document.getElementById('reportTitle');
  const reportData = document.getElementById('reportData');

  reportTitle.textContent = titulo;
  reportContent.classList.remove('hidden');

  // Gera conteúdo do relatório (implementação básica)
  if (dados && Array.isArray(dados)) {
    let html = `<p>Total de registros: ${dados.length}</p>`;
    html += '<table class="table"><thead><tr>';

    if (dados.length > 0) {
      Object.keys(dados[0]).forEach((key) => {
        if (!key.includes('pdf') && !key.includes('Data')) {
          html += `<th>${key}</th>`;
        }
      });
    }

    html += '</tr></thead><tbody>';

    dados.forEach((item) => {
      html += '<tr>';
      Object.entries(item).forEach(([key, value]) => {
        if (!key.includes('pdf') && !key.includes('Data')) {
          html += `<td>${value}</td>`;
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    reportData.innerHTML = html;
  } else {
    reportData.innerHTML = '<p>Nenhum dado encontrado.</p>';
  }
}

// ============================================================================
// EXPORTAÇÃO E FILTROS
// ============================================================================

/**
 * Exportar relatório em PDF
 * @param {object} app
 */
export function exportarRelatorioPDF(app) {
  // TODO: Implementar exportação em PDF
  app.showWarning('Funcionalidade de exportação em PDF será implementada em breve');
}

/**
 * Exportar relatório em CSV
 * @param {object} app
 */
export function exportarRelatorioCSV(app) {
  // TODO: Implementar exportação em CSV
  app.showWarning('Funcionalidade de exportação em CSV será implementada em breve');
}

/**
 * Aplicar filtros no relatório (stub)
 */
export function aplicarFiltrosRelatorio() {
  // TODO: Implementar filtros de relatório
  console.log('Aplicando filtros de relatório...');
}

// ============================================================================
// ESTATÍSTICAS DE ARQUIVOS
// ============================================================================

/**
 * Mostra estatísticas de arquivos
 * @param {object} app
 */
export async function mostrarEstatisticasArquivos(app) {
  try {
    app.showLoading('Coletando estatísticas...');

    const statsDisplay = document.getElementById('fileStatsDisplay');

    // Remover verificação de pastas - será tratado em outro local
    statsDisplay.innerHTML = `
      <div class="file-stats">
        <h4>📊 Estatísticas de Arquivos</h4>
        <p>Esta funcionalidade será implementada em breve.</p>
        <p class="text-muted">As estatísticas de uso de arquivos estarão disponíveis em uma próxima versão.</p>
      </div>
    `;
    statsDisplay.classList.remove('hidden');
  } catch (error) {
    console.error('Erro ao mostrar estatísticas:', error);
    app.showError('Erro ao mostrar estatísticas: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

/**
 * Atualiza estatísticas de arquivos se o painel estiver visível
 * @param {object} app
 */
export async function atualizarEstatisticasArquivos(app) {
  const statsDisplay = document.getElementById('fileStatsDisplay');
  if (statsDisplay && !statsDisplay.classList.contains('hidden')) {
    await mostrarEstatisticasArquivos(app);
  }
}
