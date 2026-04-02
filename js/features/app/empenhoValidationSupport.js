import * as dbGateway from '../../core/dbGateway.js';
import * as FormatUtils from '../../core/format.js';

/* eslint-disable complexity */
export async function validarEmpenho(app) {
  try {
    app.showLoading('Validando cadastro do empenho...');

    const unidadeGestora = await app._getUnidadeGestora();
    if (!unidadeGestora || !unidadeGestora.cnpj || !unidadeGestora.razaoSocial) {
      app._mostrarModalValidacao({
        sucesso: false,
        titulo: 'Configuração Incompleta',
        erros: ['Para validar, configure a Unidade Gestora (CNPJ e Razão Social) nas configurações.']
      });
      return;
    }

    const usuarioId = app.usuarioLogado?.login || app.usuarioLogado?.nome;
    console.log('[VALIDAR] Verificando usuário logado:', {
      usuarioLogado: app.usuarioLogado,
      usuarioId
    });

    if (!app.usuarioLogado || !usuarioId) {
      app._mostrarModalValidacao({
        sucesso: false,
        titulo: 'Usuário Não Logado',
        erros: ['Para validar, faça login no sistema.']
      });
      return;
    }

    app.syncFromFormToDraft();
    app.normalizeEmpenhoDraft();

    console.log('[VALIDAR] Draft após sync:', {
      itens: app.empenhoDraft.itens?.length,
      primeiroItem: app.empenhoDraft.itens?.[0]
    });

    const empenhoId = app.empenhoDraft.header.id;
    if (!empenhoId) {
      app.showError('Salve o empenho antes de validar.');
      return;
    }

    if (!app.empenhoDraft.header.ano || !app.empenhoDraft.header.numero) {
      console.log('[VALIDAR] ⚠️ Draft incompleto, recarregando do banco...');
      const empenhoDb = await dbGateway.getRecord('empenhos', empenhoId);
      if (empenhoDb) {
        app.empenhoDraft.header.ano = empenhoDb.ano;
        app.empenhoDraft.header.numero = empenhoDb.numero;
        app.empenhoDraft.header.valorTotalEmpenho = empenhoDb.valorTotalEmpenho || empenhoDb.valorTotal || 0;
        app.empenhoDraft.header.naturezaDespesa = empenhoDb.naturezaDespesa;
        app.empenhoDraft.header.fornecedorRazao = empenhoDb.fornecedor;
        app.empenhoDraft.header.cnpjDigits = empenhoDb.cnpjDigits || FormatUtils.onlyDigits(empenhoDb.cnpj || '');
        app.empenhoDraft.header.processoSuap = empenhoDb.processoSuap || empenhoDb.processo || '';
        app.empenhoDraft.header.statusValidacao = empenhoDb.statusValidacao || 'rascunho';
        app.empenhoDraft.itens = empenhoDb.itens || [];
        console.log('[VALIDAR] ✅ Dados recarregados do banco:', app.empenhoDraft.header);
      }
    }

    const errosCadastro = validarCadastroEmpenho(app);
    if (errosCadastro.length > 0) {
      app._mostrarModalValidacao({
        sucesso: false,
        titulo: 'Validação de Cadastro Falhou',
        erros: errosCadastro
      });
      return;
    }

    const agora = new Date().toISOString();
    const validadoPor = app.usuarioLogado.login || app.usuarioLogado.nome || 'sistema';

    app.empenhoDraft.header.statusValidacao = 'validado';
    app.empenhoDraft.header.validadoEm = agora;
    app.empenhoDraft.header.validadoPor = validadoPor;

    await app.salvarEmpenho();

    app.atualizarBadgeStatus();
    app.atualizarBotaoValidar();

    const draftHeader = app.empenhoDraft.header || {};
    const draftItens = app.empenhoDraft.itens || [];
    const valorTotal = draftHeader.valorTotalEmpenho ?? draftHeader.valorTotal ?? 0;
    const anoDisplay = draftHeader.ano ?? '????';
    const neDisplay = draftHeader.numero ?? draftHeader.neNumero ?? '???';
    const itensCount = draftItens.length;

    console.log('[VALIDACAO] empenho usado no resumo:', {
      ano: anoDisplay,
      numero: neDisplay,
      valorTotalEmpenho: valorTotal,
      itensLength: itensCount,
      validadoPor
    });

    app._mostrarModalValidacao({
      sucesso: true,
      titulo: 'Cadastro validado',
      mensagem: `O empenho ${anoDisplay} NE ${neDisplay} foi validado com sucesso.`,
      resumo: {
        valorEmpenho: valorTotal,
        qtdItens: itensCount,
        validadoPor
      }
    });
  } catch (error) {
    console.error('[VALIDAR] Erro:', error);
    app.showError('Erro ao validar empenho: ' + error.message);
  } finally {
    app.hideLoading();
  }
}
/* eslint-enable complexity */

export function validarCadastroEmpenho(app) {
  const erros = [];
  const { header, itens } = app.empenhoDraft;

  if (!header.naturezaDespesa) {
    erros.push('Natureza da Despesa é obrigatória.');
  } else if (!['339030', '449052'].includes(header.naturezaDespesa)) {
    erros.push('Natureza da Despesa deve ser 339030 ou 449052.');
  }

  if (!header.ano || !/^\d{4}$/.test(String(header.ano))) {
    erros.push('Ano do empenho é obrigatório (4 dígitos).');
  }

  if (!header.numero || header.numero.length === 0) {
    erros.push('Número da NE é obrigatório.');
  } else if (!/^\d+$/.test(header.numero)) {
    erros.push('Número da NE deve conter apenas dígitos.');
  }

  if (!header.dataEmissaoISO || !app.isValidDate(header.dataEmissaoISO)) {
    erros.push('Data de emissão é obrigatória e deve ser válida.');
  }

  if (!header.processoSuap || header.processoSuap.trim().length === 0) {
    erros.push('Processo SUAP é obrigatório.');
  }

  if (!header.fornecedorRazao || header.fornecedorRazao.length < 3) {
    erros.push('Nome do fornecedor deve ter pelo menos 3 caracteres.');
  }

  if (!header.cnpjDigits || header.cnpjDigits.length !== 14) {
    erros.push('CNPJ do fornecedor deve ter 14 dígitos.');
  } else if (!app.validarCNPJ(header.cnpjDigits)) {
    erros.push('CNPJ do fornecedor inválido (dígito verificador incorreto).');
  }

  const valorTotalEmpenho = header.valorTotalEmpenho || 0;
  if (valorTotalEmpenho <= 0) {
    erros.push('Valor total do empenho deve ser maior que zero.');
  }

  if (!itens || itens.length === 0) {
    erros.push('O empenho deve ter pelo menos 1 item.');
    return erros;
  }

  itens.forEach((item, idx) => {
    const seq = item.seq || idx + 1;

    if (!item.descricao || item.descricao.trim().length === 0) {
      erros.push(`Item ${seq}: descrição é obrigatória.`);
    }
    if (!item.quantidade || item.quantidade <= 0) {
      erros.push(`Item ${seq}: quantidade deve ser maior que zero.`);
    }
    if (item.valorUnitario === undefined || item.valorUnitario < 0) {
      erros.push(`Item ${seq}: valor unitário não pode ser negativo.`);
    }
    if (!item.valorTotal || item.valorTotal <= 0) {
      erros.push(`Item ${seq}: valor total deve ser maior que zero.`);
    }
    if (!item.subelementoCodigo) {
      erros.push(`Item ${seq}: subelemento é obrigatório.`);
    }
    if (!item.subelementoNome) {
      erros.push(`Item ${seq}: nome do subelemento é obrigatório.`);
    }
  });

  if (itens.length > 0 && valorTotalEmpenho > 0) {
    const somaItens = itens.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
    const diferenca = Math.abs(somaItens - valorTotalEmpenho);

    if (diferenca > 0.01) {
      erros.push(
        `Soma dos itens (${FormatUtils.formatCurrencyBR(somaItens)}) difere do valor do empenho (${FormatUtils.formatCurrencyBR(valorTotalEmpenho)}). Diferença: ${FormatUtils.formatCurrencyBR(diferenca)}`
      );
    }
  }

  return erros;
}

export function mostrarModalValidacao(resultado) {
  const { sucesso, titulo, mensagem, erros = [], resumo } = resultado;

  let html = `
      <div class="modal-card modal-validacao" style="max-width: 600px;">
        <div class="modal-header" style="background: ${sucesso ? '#d4edda' : '#f8d7da'};">
          <h4 style="color: ${sucesso ? '#155724' : '#721c24'};">${titulo}</h4>
          <button type="button" class="btn-fechar" id="fecharValidacao">✕</button>
        </div>
        <div class="modal-body">
    `;

  if (mensagem) {
    html += `<p style="margin-bottom: 16px;">${mensagem}</p>`;
  }

  if (resumo) {
    html += `
        <div style="background: #f8f9fa; padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <strong>Resumo do Cadastro:</strong>
          <ul style="margin: 8px 0 0 20px;">
            <li>Valor do Empenho: ${FormatUtils.formatCurrencyBR(resumo.valorEmpenho)}</li>
            <li>Itens cadastrados: ${resumo.qtdItens}</li>
            ${resumo.validadoPor ? `<li>Validado por: ${resumo.validadoPor}</li>` : ''}
          </ul>
        </div>
      `;
  }

  if (erros.length > 0) {
    html += `
        <div style="background: #f8d7da; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <strong style="color: #721c24;">Erros de cadastro:</strong>
          <ul style="margin: 8px 0 0 20px; color: #721c24;">
            ${erros.map((e) => `<li>${e}</li>`).join('')}
          </ul>
        </div>
      `;
  }

  html += `
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="btnOkValidacao">OK</button>
        </div>
      </div>
    `;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = html;

  overlay.querySelector('#fecharValidacao').addEventListener('click', () => overlay.remove());
  overlay.querySelector('#btnOkValidacao').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  document.body.appendChild(overlay);
}

export function atualizarBadgeStatus(app) {
  const badge = document.getElementById('badgeStatusEmpenho');
  if (!badge) {
    return;
  }

  const status = app.empenhoDraft.header?.statusValidacao || 'rascunho';
  badge.textContent = status === 'validado' ? 'VALIDADO' : 'RASCUNHO';
  badge.className = `badge-status badge-${status === 'validado' ? 'success' : 'warning'}`;
}

export function atualizarBotaoValidar(app) {
  const btn = document.getElementById('btnValidarEmpenho');
  if (!btn) {
    return;
  }
  const status = app.empenhoDraft.header?.statusValidacao || 'rascunho';
  const temItens = (app.empenhoDraft.itens || []).length > 0;
  btn.disabled = status === 'validado' || !temItens;
}
