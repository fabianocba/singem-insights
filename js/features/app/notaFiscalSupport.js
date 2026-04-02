import * as dbGateway from '../../core/dbGateway.js';
import { confirmAction } from '../../shared/ui/modal.js';
import { focusField } from '../../shared/ui/formField.js';
import { escapeHTML } from '../../utils/sanitize.js';

export async function buscarEmpenhoCorrespondente(app, cnpj) {
  try {
    const empenhos = await dbGateway.buscarEmpenhosPorCNPJ(cnpj);
    const empenhoSelect = document.getElementById('empenhoAssociado');

    if (empenhos.length > 0) {
      empenhoSelect.innerHTML = '<option value="">Selecione um empenho...</option>';

      empenhos.forEach((empenho) => {
        const option = document.createElement('option');
        option.value = empenho.id;
        option.textContent = `${empenho.numero} - ${empenho.fornecedor}`;
        empenhoSelect.appendChild(option);
      });

      if (empenhos.length === 1) {
        empenhoSelect.value = empenhos[0].id;
        await verificarDivergencias(app, empenhos[0].id);
      }
    }
  } catch (error) {
    console.error('Erro ao buscar empenho correspondente:', error);
  }
}

export async function verificarDivergencias(app, empenhoId) {
  try {
    if (!app.currentNotaFiscal) {
      return;
    }

    const divergencias = await dbGateway.compararNotaFiscalComEmpenho(
      app.currentNotaFiscal.extractedData,
      parseInt(empenhoId)
    );

    const container = document.getElementById('divergenciasContainer');
    const lista = document.getElementById('listaDivergencias');

    if (divergencias.length > 0) {
      container.classList.remove('hidden');
      lista.innerHTML = '';

      divergencias.forEach((div) => {
        const divItem = document.createElement('div');
        divItem.className = 'divergencia-item';
        const tipo = escapeHTML(
          String(div.tipo || '')
            .replace('_', ' ')
            .toUpperCase()
        );
        const mensagem = escapeHTML(String(div.mensagem || ''));
        const valorNF = escapeHTML(String(div.valorNF || ''));
        const valorEmpenho = escapeHTML(String(div.valorEmpenho || ''));
        divItem.innerHTML = `
                      <strong>${tipo}:</strong>
                      <p>${mensagem}</p>
                      ${div.valorNF ? `<small>NF: ${valorNF} | Empenho: ${valorEmpenho}</small>` : ''}
                  `;
        lista.appendChild(divItem);
      });

      app.showWarning(`${divergencias.length} divergência(s) encontrada(s)`);
    } else {
      container.classList.add('hidden');
      app.showSuccess('Nenhuma divergência encontrada!');
    }
  } catch (error) {
    console.error('Erro ao verificar divergências:', error);
  }
}

export async function executarValidacaoNF(app) {
  const DEBUG_NF = false;

  if (DEBUG_NF) {
    console.log('[NF] executarValidacaoNF iniciado');
  }

  try {
    if (!window.NFValidator) {
      app.showError('Modulo NFValidator nao carregado. Recarregue a pagina.');
      return;
    }

    const formData = new FormData(document.getElementById('formNotaFiscal'));
    const itens = app.coletarItens('itensNotaFiscal');
    const empenhoId = formData.get('empenhoAssociado');

    if (DEBUG_NF) {
      console.log('[NF] Dados coletados:', { empenhoId, itensCount: itens.length });
    }

    const nf = {
      numero: formData.get('numeroNotaFiscal'),
      dataNotaFiscal: formData.get('dataNotaFiscal'),
      cnpjEmitente: formData.get('cnpjEmitente'),
      cnpjDestinatario: formData.get('cnpjDestinatario'),
      chaveAcesso: formData.get('chaveAcesso'),
      valorTotal: app.calcularValorTotalItens(itens),
      itens
    };

    let empenho = null;
    if (empenhoId) {
      empenho = await dbGateway.buscarEmpenhoPorId(parseInt(empenhoId));
      if (DEBUG_NF) {
        console.log('[NF] Empenho carregado:', empenho?.numero);
      }
    }

    const resultado = window.NFValidator.validateNF(nf, empenho);
    window.NFValidator.logValidationResult(resultado);
    const htmlRelatorio = window.NFValidator.generateValidationReport(resultado);

    const tituloModal = document.getElementById('modalValidacaoTitulo');
    if (tituloModal) {
      tituloModal.textContent = resultado.ok ? 'Validacao concluida' : 'Divergencias encontradas';
      tituloModal.classList.remove(
        'sg-modal-heading--success',
        'sg-modal-heading--danger',
        'sg-modal-heading--primary'
      );
      tituloModal.classList.add(resultado.ok ? 'sg-modal-heading--success' : 'sg-modal-heading--danger');
    }

    const conteudo = document.getElementById('validacaoNFConteudo');
    if (conteudo) {
      conteudo.innerHTML = htmlRelatorio;
    }

    const modal = document.getElementById('modalValidacaoNF');
    if (modal) {
      modal.classList.remove('hidden');
      modal.style.display = 'flex';
    }
  } catch (error) {
    console.error('Erro ao executar validação NF:', error);
    app.showError('Erro ao validar nota fiscal: ' + error.message);
  }
}

export async function validarCNPJDestinatarioContraUnidade(app, cnpjDestinatario) {
  if (typeof window.getUnidadeOrcamentaria !== 'function') {
    return true;
  }

  const unidade = await window.getUnidadeOrcamentaria();

  if (unidade && unidade.cnpjNumeros && cnpjDestinatario) {
    const cnpjDestinatarioLimpo = cnpjDestinatario.replace(/\D/g, '');

    if (cnpjDestinatarioLimpo !== unidade.cnpjNumeros) {
      alert(
        'CNPJ DO DESTINATARIO INVALIDO\n\n' +
          'O CNPJ do Destinatário/Beneficiário da Nota Fiscal é diferente ' +
          'do CNPJ da Unidade Orçamentária vinculada ao seu usuário.\n\n' +
          `CNPJ da Unidade: ${unidade.cnpj}\n` +
          `Unidade: ${unidade.razaoSocial}\n\n` +
          `CNPJ Destinatário NF: ${cnpjDestinatario}\n\n` +
          'Notas Fiscais com CNPJ de destinatario diferente da unidade ' +
          'logada NÃO podem ser cadastradas.\n\n' +
          'Verifique:\n' +
          '1. Se a NF é realmente para esta unidade\n' +
          '2. Se há outra unidade cadastrada com este CNPJ\n' +
          '3. Se você precisa vincular outra unidade ao seu usuário'
      );
      return false;
    }
  } else if (!unidade || !unidade.cnpjNumeros) {
    alert(
      'UNIDADE ORCAMENTARIA NAO CONFIGURADA\n\n' +
        'Não é possível cadastrar Notas Fiscais sem uma Unidade Orçamentária ' +
        'vinculada ao seu usuário.\n\n' +
        'Por favor:\n' +
        '1. Acesse: Configurações → Unidade Orçamentária\n' +
        '2. Cadastre a unidade (se não existir)\n' +
        "3. Clique em 'Vincular ao Usuário' na unidade desejada\n" +
        '4. Tente novamente cadastrar a Nota Fiscal'
    );
    return false;
  }

  return true;
}

export async function salvarArquivoNotaFiscal(app, id, notaFiscal) {
  if (!app.currentNotaFiscal || !app.currentNotaFiscal.file) {
    return;
  }

  try {
    const fornecedor =
      app.currentNotaFiscal.extractedData?.fornecedor ||
      app.currentNotaFiscal.extractedData?.emitente ||
      'FORNECEDOR';

    const metadados = {
      numero: notaFiscal.numero,
      fornecedor,
      data: notaFiscal.dataNotaFiscal
    };

    const anoNota = String(notaFiscal.dataNotaFiscal || '').slice(0, 4) || new Date().getFullYear();
    const numeroNota = String(notaFiscal.numero || 'SEM_NUMERO').replace(/\D/g, '') || 'SEM_NUMERO';
    const arquivoInfo = {
      originalName: app.currentNotaFiscal.file.name,
      savedName: app.currentNotaFiscal.file.name,
      folderType: 'notasFiscais',
      year: parseInt(anoNota, 10) || new Date().getFullYear(),
      size: app.currentNotaFiscal.file.size || 0,
      timestamp: new Date().toISOString(),
      path: `db://notasFiscais/${anoNota}/${numeroNota}`,
      metadados
    };

    arquivoInfo.documentoId = id;
    await dbGateway.salvarArquivo(arquivoInfo);
    console.log('✅ Arquivo de Nota Fiscal registrado no banco:', arquivoInfo);
  } catch (fileError) {
    console.warn('⚠️ Erro ao registrar metadados do arquivo de NF no banco:', fileError);
  }
}

export async function atualizarSaldosEmpenhoComNF(app, notaFiscal, itens) {
  if (!notaFiscal.empenhoId) {
    return;
  }

  try {
    const resultados = await dbGateway.atualizarSaldosComNotaFiscal(
      parseInt(notaFiscal.empenhoId),
      notaFiscal.numero,
      itens,
      notaFiscal.dataNotaFiscal
    );

    if (resultados) {
      let mensagem = `Nota Fiscal ${notaFiscal.numero} salva com sucesso.\n\n`;

      if (resultados.encontrados.length > 0) {
        mensagem += `Itens correspondidos (${resultados.encontrados.length}):\n`;
        resultados.encontrados.forEach((item) => {
          mensagem += `  • ${item.itemNF}\n    ↔ ${item.itemEmpenho} (${item.score}% match)\n\n`;
        });
      }

      if (resultados.naoEncontrados.length > 0) {
        mensagem += `Itens nao correspondidos (${resultados.naoEncontrados.length}):\n`;
        resultados.naoEncontrados.forEach((item) => {
          mensagem += `  • ${item.codigo} - ${item.descricao}\n`;
        });
        mensagem += `\nEsses itens nao atualizaram o saldo do empenho.`;
      }

      alert(mensagem);
    }

    console.log('✅ Saldos do empenho atualizados com a NF', notaFiscal.numero);
  } catch (saldoError) {
    console.warn('⚠️ Erro ao atualizar saldos (NF foi salva):', saldoError);
  }
}

export async function salvarNotaFiscal(app) {
  try {
    app.showLoading('Validando nota fiscal...');

    const formData = new FormData(document.getElementById('formNotaFiscal'));
    const itens = app.coletarItens('itensNotaFiscal');
    const cnpjDestinatario = formData.get('cnpjDestinatario');
    const empenhoId = document.getElementById('empenhoAssociado')?.value;

    const valorTotalNFInput = document.getElementById('valorTotalNF');
    const validacaoEntrada = app.features.notaFiscal.validarEntrada({
      empenhoId,
      valorTotalNFInput: valorTotalNFInput?.value,
      formData,
      itens
    });
    if (!validacaoEntrada.valid) {
      app.hideLoading();
      alert('Dados invalidos:\n\n' + validacaoEntrada.errors.join('\n'));
      if (!empenhoId) {
        focusField('empenhoAssociado');
      } else {
        focusField('valorTotalNF');
      }
      return;
    }

    const totalNFManual = app.money2(app.parseMoneyInputBR(valorTotalNFInput?.value));
    const somaItens = app.calcularValorTotalItens(itens);
    const diferencaTotalItens = app.money2(somaItens - totalNFManual);
    const toleranciaTotal = 0.05;

    if (Math.abs(diferencaTotalItens) > toleranciaTotal) {
      app.hideLoading();
      const confirmar = confirmAction(
        `DIVERGENCIA ENTRE TOTAL E SOMA DOS ITENS:\n\n` +
          `• Valor Total da NF: R$ ${app.fmtMoneyBR(totalNFManual)}\n` +
          `• Soma dos Itens: R$ ${app.fmtMoneyBR(somaItens)}\n` +
          `• Diferença: R$ ${app.fmtMoneyBR(diferencaTotalItens)}\n\n` +
          `Deseja salvar mesmo assim?\n\n` +
          `[OK] = Salvar com divergência\n[Cancelar] = Corrigir antes de salvar`
      );
      if (!confirmar) {
        return;
      }
    }

    const cnpjValido = await validarCNPJDestinatarioContraUnidade(app, cnpjDestinatario);
    if (!cnpjValido) {
      app.hideLoading();
      return;
    }

    const validacaoEmpenho = await app.features.notaFiscal.validarContraEmpenhoComNFValidator({
      empenhoId,
      formData,
      itens
    });
    if (!validacaoEmpenho.ok) {
      app.hideLoading();
      return;
    }

    app.showLoading('Salvando nota fiscal...');

    const notaFiscal = await app.features.notaFiscal.montarNotaFiscal({
      formData,
      itens,
      cnpjDestinatario,
      empenhoId,
      currentNotaFiscal: app.currentNotaFiscal
    });

    const id = await app.features.notaFiscal.salvarNotaFiscalCompleta(notaFiscal);
    await salvarArquivoNotaFiscal(app, id, notaFiscal);
    await atualizarSaldosEmpenhoComNF(app, notaFiscal, itens);

    app.showSuccess('Nota fiscal salva com sucesso!');
    app.limparFormulario('formNotaFiscal');
    app.currentNotaFiscal = null;
  } catch (error) {
    console.error('Erro ao salvar nota fiscal:', error);
    app.showError('Erro ao salvar nota fiscal: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

export async function onEmpenhoSelecionado(app, empenhoId) {
  try {
    const empenho = await dbGateway.buscarEmpenhoPorId(empenhoId);
    if (!empenho) {
      app.limparInfoEmpenhoNF();
      return;
    }

    app.empenhoVinculadoNF = empenho;

    const cnpjEmitente = document.getElementById('cnpjEmitente');
    const infoEmpenho = document.getElementById('infoEmpenhoSelecionado');
    const fornecedorInfo = document.getElementById('nfFornecedorInfo');
    const cnpjInfo = document.getElementById('nfCnpjInfo');
    const itensInfo = document.getElementById('nfItensInfo');
    const itensHint = document.getElementById('nfItensHint');
    const btnAddFromEmpenho = document.getElementById('btnAddItemFromEmpenho');

    if (cnpjEmitente && empenho.cnpjFornecedor) {
      const cnpjFormatado = app.formatarCNPJ(empenho.cnpjFornecedor);
      cnpjEmitente.value = cnpjFormatado;
    }

    if (infoEmpenho) {
      infoEmpenho.style.display = 'block';
      if (fornecedorInfo) {
        fornecedorInfo.textContent = empenho.fornecedor || '-';
      }
      if (cnpjInfo) {
        cnpjInfo.textContent = app.formatarCNPJ(empenho.cnpjFornecedor) || '-';
      }
      if (itensInfo) {
        itensInfo.textContent = empenho.itens?.length || 0;
      }
    }

    if (itensHint) {
      itensHint.textContent = `💡 ${empenho.itens?.length || 0} itens disponíveis no empenho`;
      itensHint.style.color = '#28a745';
    }

    if (btnAddFromEmpenho && empenho.itens?.length > 0) {
      btnAddFromEmpenho.style.display = 'inline-flex';
    }

    app.criarDatalistItensEmpenho(empenho.itens);
    app.verificarDivergencias(empenhoId);

    console.log(`[NF] Empenho ${empenho.numero} selecionado, ${empenho.itens?.length} itens disponíveis`);
  } catch (error) {
    console.error('[NF] Erro ao carregar empenho:', error);
    app.limparInfoEmpenhoNF();
  }
}
