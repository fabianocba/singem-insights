import * as dbGateway from '../../core/dbGateway.js';
import * as FormatUtils from '../../core/format.js';

export function onlyDigits(str) {
  if (!str) {
    return '';
  }
  return String(str).replace(/\D/g, '');
}

export function dataBRtoISO(dataBR) {
  if (!dataBR) {
    return null;
  }
  const match = String(dataBR).match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!match) {
    return null;
  }
  const [, dia, mes, ano] = match;
  return `${ano}-${mes}-${dia}`;
}

export function parseNumero(valor) {
  if (typeof valor === 'number') {
    return valor;
  }
  if (!valor) {
    return 0;
  }

  const str = String(valor).trim();
  if (str.includes(',')) {
    const semPontos = str.replace(/\./g, '');
    const comPonto = semPontos.replace(',', '.');
    return parseFloat(comPonto) || 0;
  }

  return parseFloat(str) || 0;
}

export function validarCNPJ(cnpj) {
  if (!cnpj || cnpj.length !== 14) {
    return false;
  }

  if (/^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  let tamanho = cnpj.length - 2;
  let numeros = cnpj.substring(0, tamanho);
  const digitos = cnpj.substring(tamanho);
  let soma = 0;
  let pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  if (resultado !== parseInt(digitos.charAt(0))) {
    return false;
  }

  tamanho += 1;
  numeros = cnpj.substring(0, tamanho);
  soma = 0;
  pos = tamanho - 7;

  for (let i = tamanho; i >= 1; i--) {
    soma += numeros.charAt(tamanho - i) * pos--;
    if (pos < 2) {
      pos = 9;
    }
  }

  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
  return resultado === parseInt(digitos.charAt(1));
}

export async function validarCNPJFornecedorContraUnidade(app, cnpjFornecedor) {
  const unidade = await app._getUnidadeGestora();

  if (unidade && unidade.cnpjNumeros && cnpjFornecedor) {
    const cnpjFornecedorLimpo = cnpjFornecedor.replace(/\D/g, '');

    if (cnpjFornecedorLimpo === unidade.cnpjNumeros) {
      return confirm(
        'ATENCAO!\n\n' +
          'O CNPJ do Fornecedor é igual ao CNPJ da Unidade Orçamentária cadastrada:\n\n' +
          `CNPJ: ${unidade.cnpj}\n` +
          `Unidade: ${unidade.razaoSocial}\n\n` +
          'Isso pode indicar um erro. Deseja continuar mesmo assim?'
      );
    }
  } else if (!unidade || !unidade.cnpjNumeros) {
    return confirm(
      'UNIDADE ORCAMENTARIA NAO CONFIGURADA\n\n' +
        'Não foi possível validar o CNPJ pois nenhuma Unidade Orçamentária ' +
        'está cadastrada no sistema.\n\n' +
        'Recomenda-se cadastrar a Unidade em: Configurações → Unidade Orçamentária\n\n' +
        'Deseja continuar mesmo assim?'
    );
  }

  return true;
}

export function detectarPendencias(app) {
  const pendencias = [];
  const { header, itens } = app.empenhoDraft;

  if (!header.dataEmissaoISO) {
    pendencias.push('Data de emissão não informada');
  }

  if (!header.processoSuap || header.processoSuap.trim().length === 0) {
    pendencias.push('Processo SUAP não informado');
  }

  if (!header.valorTotalEmpenho || header.valorTotalEmpenho <= 0) {
    pendencias.push('Valor total do empenho não informado');
  }

  if (!itens || itens.length === 0) {
    pendencias.push('Nenhum item cadastrado');
  } else {
    const itensSemSub = itens.filter((item) => !item.subelementoCodigo);
    if (itensSemSub.length > 0) {
      pendencias.push(`${itensSemSub.length} item(ns) sem subelemento`);
    }

    if (header.valorTotalEmpenho > 0) {
      const somaItens = itens.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
      const diferenca = Math.abs(somaItens - header.valorTotalEmpenho);
      if (diferenca > 0.01) {
        pendencias.push(`Soma dos itens difere do valor total (diferença: R$ ${diferenca.toFixed(2)})`);
      }
    }
  }

  return pendencias;
}

export function validateEmpenhoDraft(app) {
  console.log('[Validation] 🔍 Validando empenhoDraft (para salvar)...');
  const erros = [];
  const { header } = app.empenhoDraft;

  if (!header.naturezaDespesa) {
    erros.push('• Natureza da Despesa é obrigatória');
  } else if (!['339030', '449052'].includes(header.naturezaDespesa)) {
    erros.push('• Natureza da Despesa deve ser 339030 ou 449052');
  }

  if (!header.ano || !/^\d{4}$/.test(String(header.ano))) {
    erros.push('• Ano do empenho é obrigatório (4 dígitos)');
  }

  if (!header.numero || header.numero.length === 0) {
    erros.push('• Número da NE é obrigatório');
  } else if (!/^\d+$/.test(header.numero)) {
    erros.push('• Número da NE deve conter apenas dígitos');
  }

  if (!header.fornecedorRazao || header.fornecedorRazao.length < 3) {
    erros.push('• Nome do fornecedor deve ter pelo menos 3 caracteres');
  }

  if (!header.cnpjDigits || header.cnpjDigits.length !== 14) {
    erros.push('• CNPJ do fornecedor deve ter 14 dígitos');
  } else if (!validarCNPJ(header.cnpjDigits)) {
    erros.push('• CNPJ do fornecedor inválido (DV incorreto)');
  }

  console.log('[Validation]', erros.length === 0 ? '✅ Válido para salvar' : `❌ ${erros.length} erros`);
  return erros;
}

export function normalizeEmpenhoDraft(app) {
  console.log('[State] 🔧 Normalizando empenhoDraft...');

  const { header, itens } = app.empenhoDraft;

  if (header.numero) {
    header.numero = onlyDigits(header.numero);
    console.log('[State] 📝 Número NE normalizado:', header.numero);
  }

  if (header.cnpjDigits) {
    header.cnpjDigits = FormatUtils.onlyDigits(header.cnpjDigits);
    console.log('[State] 📝 CNPJ normalizado:', header.cnpjDigits);
  }

  if (header.telefoneDigits) {
    header.telefoneDigits = FormatUtils.onlyDigits(header.telefoneDigits);
    console.log('[State] 📝 Telefone normalizado:', header.telefoneDigits);
  }

  if (header.dataEmissaoISO && header.dataEmissaoISO.includes('/')) {
    header.dataEmissaoISO = dataBRtoISO(header.dataEmissaoISO);
    console.log('[State] 📅 Data convertida para ISO:', header.dataEmissaoISO);
  }

  itens.forEach((item, idx) => {
    item.seq = parseInt(item.seq) || idx + 1;
    item.quantidade = parseNumero(item.quantidade);
    item.valorUnitario = parseNumero(item.valorUnitario);
    item.valorTotal = parseNumero(item.valorTotal);

    const valorCalculado = item.quantidade * item.valorUnitario;
    if (Math.abs(item.valorTotal - valorCalculado) > 0.01) {
      console.warn(`[State] ⚠️ Item ${item.seq}: valorTotal inconsistente. Recalculando...`);
      item.valorTotal = valorCalculado;
    }

    item.subelementoCodigo = item.subelementoCodigo || '';
    item.subelementoNome = item.subelementoNome || '';

    if (header.naturezaDespesa && !item.naturezaDespesa) {
      item.naturezaDespesa = header.naturezaDespesa;
    }

    console.log(`[State] ✅ Item ${item.seq} normalizado:`, {
      qtd: item.quantidade,
      vu: item.valorUnitario,
      vtot: item.valorTotal,
      subCod: item.subelementoCodigo,
      subNome: item.subelementoNome?.substring(0, 20)
    });
  });

  const somaItens = itens.reduce((acc, item) => acc + item.valorTotal, 0);
  console.log('[State] 📊 Soma dos itens:', somaItens.toFixed(2));
  console.log('[State] 📊 Valor do empenho (fixo):', (header.valorTotalEmpenho || 0).toFixed(2));
  console.log('[State] ✅ Normalização concluída');
}

export function syncFromFormToDraft(app) {
  console.log('[State] 🔄 Sincronizando formulário → draft...');
  console.log('[State] 🔍 Debug elementos:', {
    anoEmpenho: document.getElementById('anoEmpenho'),
    numeroEmpenho: document.getElementById('numeroEmpenho'),
    valorTotalEmpenho: document.getElementById('valorTotalEmpenho'),
    itensEmpenho: document.getElementById('itensEmpenho')
  });

  app.empenhoDraft.header.naturezaDespesa = document.getElementById('naturezaDespesa')?.value || null;

  const anoValor = document.getElementById('anoEmpenho')?.value;
  if (anoValor && anoValor.trim() !== '') {
    app.empenhoDraft.header.ano = parseInt(anoValor);
  }

  const numeroValor = document.getElementById('numeroEmpenho')?.value;
  if (numeroValor && numeroValor.trim() !== '') {
    app.empenhoDraft.header.numero = numeroValor.trim();
  }

  app.empenhoDraft.header.dataEmissaoISO =
    document.getElementById('dataEmpenho')?.value || app.empenhoDraft.header.dataEmissaoISO;

  const processoSuapValor = document.getElementById('processoSuapEmpenho')?.value?.trim();
  if (processoSuapValor !== undefined) {
    app.empenhoDraft.header.processoSuap = processoSuapValor || '';
  }

  const fornecedorValor = document.getElementById('fornecedorEmpenho')?.value;
  if (fornecedorValor && fornecedorValor.trim() !== '') {
    app.empenhoDraft.header.fornecedorRazao = fornecedorValor.trim();
  }

  const cnpjInput = document.getElementById('cnpjFornecedor')?.value || '';
  if (cnpjInput) {
    app.empenhoDraft.header.cnpjDigits = FormatUtils.onlyDigits(cnpjInput);
  }

  const telefoneInput = document.getElementById('telefoneFornecedor')?.value || '';
  if (telefoneInput) {
    app.empenhoDraft.header.telefoneDigits = FormatUtils.onlyDigits(telefoneInput);
  }

  const emailValor = document.getElementById('emailFornecedor')?.value;
  if (emailValor && emailValor.trim() !== '') {
    app.empenhoDraft.header.emailFornecedor = emailValor.trim();
  }
  app.empenhoDraft.header.statusValidacao = app.empenhoDraft.header.statusValidacao || 'rascunho';

  const valorTotalStr = document.getElementById('valorTotalEmpenho')?.value;
  if (valorTotalStr && valorTotalStr.trim() !== '' && valorTotalStr.trim() !== '0,00') {
    app.empenhoDraft.header.valorTotalEmpenho = FormatUtils.parseMoneyBR(valorTotalStr);
  }

  console.log('[State] 🔍 Debug valores lidos:', {
    ano: app.empenhoDraft.header.ano,
    numero: app.empenhoDraft.header.numero,
    valorTotal: app.empenhoDraft.header.valorTotalEmpenho
  });

  const container = document.getElementById('itensEmpenho');
  const linhas = container?.querySelectorAll('.item-row') || [];
  const itensAtualizados = [];

  linhas.forEach((linha, idx) => {
    const seq = parseInt(linha.querySelector('[data-field="seq"]')?.value) || idx + 1;
    const itemExistente = app.empenhoDraft.itens?.find((item) => item.seq === seq) || {};

    const item = {
      ...itemExistente,
      seq,
      descricao: linha.querySelector('[data-field="descricao"]')?.value || itemExistente.descricao || '',
      unidade: linha.querySelector('[data-field="unidade"]')?.value || itemExistente.unidade || 'UN',
      quantidade: parseNumero(linha.querySelector('[data-field="quantidade"]')?.value || '0'),
      valorUnitario: parseNumero(linha.querySelector('[data-field="valorUnitario"]')?.value || '0'),
      catmatCodigo: linha.querySelector('[data-field="catmatCodigo"]')?.value || itemExistente.catmatCodigo || '',
      catmatDescricao:
        linha.querySelector('[data-field="catmatDescricao"]')?.value || itemExistente.catmatDescricao || '',
      catmatFonte: linha.querySelector('[data-field="catmatFonte"]')?.value || itemExistente.catmatFonte || '',
      observacao: linha.querySelector('[data-field="observacao"]')?.value || itemExistente.observacao || '',
      itemCompra: linha.querySelector('[data-field="itemCompra"]')?.value || itemExistente.itemCompra || '',
      subelementoCodigo:
        linha.querySelector('[data-field="subelementoCodigo"]')?.value || itemExistente.subelementoCodigo || '',
      subelementoNome:
        linha.querySelector('[data-field="subelementoNome"]')?.value || itemExistente.subelementoNome || ''
    };

    item.valorTotal = item.quantidade * item.valorUnitario;
    itensAtualizados.push(item);
  });

  app.empenhoDraft.itens = itensAtualizados;

  console.log('[State] ✅ Sincronização concluída');
  console.log('[State] 📊 Draft atualizado:', app.empenhoDraft.itens.length, 'itens');
  if (app.empenhoDraft.itens.length > 0) {
    console.log(
      '[State] 🔍 Primeiro item subelemento:',
      app.empenhoDraft.itens[0].subelementoCodigo,
      app.empenhoDraft.itens[0].subelementoNome
    );
  }
}

export async function syncFromDraftToForm(app) {
  console.log('[State] 🔄 Sincronizando draft → formulário...');

  const { header, itens } = app.empenhoDraft;
  console.log('[State] 📊 Header a sincronizar:', header);
  console.log('[State] 📦 Itens a sincronizar:', itens.length);

  if (document.getElementById('naturezaDespesa')) {
    document.getElementById('naturezaDespesa').value = header.naturezaDespesa || '';
    console.log('[State] ✅ naturezaDespesa:', header.naturezaDespesa);
  }

  if (document.getElementById('numeroEmpenho')) {
    document.getElementById('numeroEmpenho').value = header.numero || '';
    console.log('[State] ✅ numeroEmpenho:', header.numero);
  }
  if (document.getElementById('dataEmpenho')) {
    document.getElementById('dataEmpenho').value = header.dataEmissaoISO || '';
    console.log('[State] ✅ dataEmpenho:', header.dataEmissaoISO);
  }

  if (document.getElementById('processoSuapEmpenho')) {
    document.getElementById('processoSuapEmpenho').value = header.processoSuap || '';
    console.log('[State] ✅ processoSuapEmpenho:', header.processoSuap);
  }

  if (document.getElementById('fornecedorEmpenho')) {
    document.getElementById('fornecedorEmpenho').value = header.fornecedorRazao || '';
    console.log('[State] ✅ fornecedorEmpenho:', header.fornecedorRazao);
  }

  if (document.getElementById('cnpjFornecedor')) {
    const cnpjFormatado = FormatUtils.formatCNPJ(header.cnpjDigits || '');
    document.getElementById('cnpjFornecedor').value = cnpjFormatado;
    console.log('[State] ✅ cnpjFornecedor:', header.cnpjDigits, '→', cnpjFormatado);
  }

  if (document.getElementById('telefoneFornecedor')) {
    const telefoneFormatado = FormatUtils.formatPhone(header.telefoneDigits || '');
    document.getElementById('telefoneFornecedor').value = telefoneFormatado;
    console.log('[State] ✅ telefoneFornecedor:', header.telefoneDigits, '→', telefoneFormatado);
  }

  if (document.getElementById('emailFornecedor')) {
    document.getElementById('emailFornecedor').value = header.emailFornecedor || '';
    console.log('[State] ✅ emailFornecedor:', header.emailFornecedor);
  }

  if (document.getElementById('valorTotalEmpenho')) {
    const valorFormatado = FormatUtils.formatMoneyBR(header.valorTotalEmpenho || 0);
    document.getElementById('valorTotalEmpenho').value = valorFormatado;
    console.log('[State] ✅ valorTotalEmpenho:', header.valorTotalEmpenho, '→', valorFormatado);
  }

  if (document.getElementById('anoEmpenho')) {
    document.getElementById('anoEmpenho').value = header.ano || '';
  }
  if (document.getElementById('statusEmpenho')) {
    document.getElementById('statusEmpenho').value = header.statusValidacao || 'rascunho';
  }

  app.renderItensEmpenho();
  await atualizarExibicaoTotais(app);

  console.log('[State] ✅ Formulário atualizado com', itens.length, 'itens');
}

export async function atualizarExibicaoTotais(app) {
  const somaItens = app.empenhoDraft.itens.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
  const valorEmpenho = app.empenhoDraft.header.valorTotalEmpenho || 0;

  let valorEntregue = 0;
  const empenhoId = app.empenhoDraft.header.id;
  if (empenhoId && dbGateway.hasMethod('buscarNotasFiscaisPorEmpenho')) {
    try {
      const notasFiscais = await dbGateway.buscarNotasFiscaisPorEmpenho(empenhoId);
      valorEntregue = (notasFiscais || []).reduce((acc, nf) => acc + (nf.valorTotal || 0), 0);
    } catch (error) {
      console.warn('[State] Não foi possível buscar NFs:', error.message);
    }
  }

  const saldoEmpenho = valorEmpenho - valorEntregue;
  const totalItensEl = document.getElementById('totalItensValor');
  const saldoEl = document.getElementById('diferencaValor');

  if (totalItensEl) {
    totalItensEl.textContent = FormatUtils.formatCurrencyBR(somaItens);
  }

  if (saldoEl) {
    saldoEl.textContent = FormatUtils.formatCurrencyBR(saldoEmpenho);
    if (saldoEmpenho > 0) {
      saldoEl.style.color = '#28a745';
      saldoEl.title = `Saldo disponível: ${FormatUtils.formatCurrencyBR(saldoEmpenho)}`;
    } else if (saldoEmpenho === 0) {
      saldoEl.style.color = '#6c757d';
      saldoEl.title = 'Empenho totalmente utilizado';
    } else {
      saldoEl.style.color = '#dc3545';
      saldoEl.title = 'Atenção: Valor entregue excede o empenho!';
    }
  }

  console.log(
    '[State] 📊 Totais - Empenho:',
    valorEmpenho,
    'Itens:',
    somaItens,
    'Entregue:',
    valorEntregue,
    'Saldo:',
    saldoEmpenho
  );
}

/* eslint-disable complexity */
export async function salvarEmpenho(app) {
  try {
    console.log('[APP] 💾 Salvando empenho...');
    app.showLoading('Salvando empenho...');

    if (!dbGateway.hasDbManager()) {
      throw new Error('Banco de dados não está pronto');
    }

    syncFromFormToDraft(app);
    normalizeEmpenhoDraft(app);

    console.log('[APP] 📊 Draft antes da validação:');
    console.table([app.empenhoDraft.header]);
    console.table(
      app.empenhoDraft.itens.map((item) => ({
        seq: item.seq,
        desc: item.descricao?.substring(0, 30),
        qtd: item.quantidade,
        vu: item.valorUnitario,
        vtot: item.valorTotal
      }))
    );

    const erros = validateEmpenhoDraft(app);
    if (erros.length > 0) {
      app.hideLoading();
      const mensagemErros = 'Dados minimos obrigatorios:\n\n' + erros.join('\n');
      console.error('[APP] ❌ Validação mínima falhou:', erros);
      alert(mensagemErros);
      return;
    }

    console.log('[APP] ✅ Validação mínima passou!');

    const cnpjValido = await validarCNPJFornecedorContraUnidade(app, app.empenhoDraft.header.cnpjDigits);
    if (!cnpjValido) {
      app.hideLoading();
      return;
    }

    const pendencias = detectarPendencias(app);
    let statusValidacao = app.empenhoDraft.header.statusValidacao || 'rascunho';
    if (statusValidacao !== 'validado') {
      statusValidacao = 'rascunho';
    }

    const empenho = {
      naturezaDespesa: app.empenhoDraft.header.naturezaDespesa || null,
      ano: app.empenhoDraft.header.ano,
      numero: app.empenhoDraft.header.numero,
      dataEmpenho: app.empenhoDraft.header.dataEmissaoISO,
      processoSuap: app.empenhoDraft.header.processoSuap || '',
      fornecedor: app.empenhoDraft.header.fornecedorRazao,
      cnpjDigits: app.empenhoDraft.header.cnpjDigits,
      telefoneDigits: app.empenhoDraft.header.telefoneDigits || '',
      emailFornecedor: app.empenhoDraft.header.emailFornecedor || '',
      valorTotalEmpenho: app.empenhoDraft.header.valorTotalEmpenho || 0,
      statusValidacao,
      validadoEm: app.empenhoDraft.header.validadoEm || null,
      validadoPor: app.empenhoDraft.header.validadoPor || null,
      pendencias: pendencias.length > 0 ? pendencias : null,
      itens: app.empenhoDraft.itens.map((item) => ({
        seq: item.seq,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        valorUnitario: item.valorUnitario,
        valorTotal: item.valorTotal,
        subelementoCodigo: item.subelementoCodigo || '',
        subelementoNome: item.subelementoNome || '',
        itemCompra: item.itemCompra || ''
      })),
      pdfData: app.currentEmpenho ? await app.fileToBase64(app.currentEmpenho.file) : null
    };

    if (app._anexoPdfNEPendente) {
      empenho.pdfFileName = app._anexoPdfNEPendente.savedName;
      empenho.pdfAttachedAt = Date.now();
      empenho.pdfPath = app._anexoPdfNEPendente.path;
      empenho.pdfData = app._anexoPdfNEPendente.pdfData || null;
      empenho.pdfMimeType = app._anexoPdfNEPendente.mimeType || 'application/pdf';
      empenho.pdfOriginalName = app._anexoPdfNEPendente.originalName || app._anexoPdfNEPendente.savedName;
      empenho.pdfSize = app._anexoPdfNEPendente.size || 0;
      console.log('[APP] 📎 PDF anexado incluído:', empenho.pdfFileName);
    } else if (app.empenhoDraft.header.id) {
      const empenhoExistente = await dbGateway.buscarEmpenhoPorId(app.empenhoDraft.header.id);
      if (empenhoExistente?.pdfFileName) {
        empenho.pdfFileName = empenhoExistente.pdfFileName;
        empenho.pdfAttachedAt = empenhoExistente.pdfAttachedAt;
        empenho.pdfPath = empenhoExistente.pdfPath;
        empenho.pdfData = empenhoExistente.pdfData;
        empenho.pdfMimeType = empenhoExistente.pdfMimeType;
        empenho.pdfOriginalName = empenhoExistente.pdfOriginalName;
        empenho.pdfSize = empenhoExistente.pdfSize;
        console.log('[APP] 📎 PDF existente mantido:', empenho.pdfFileName);
      }
    }

    console.log('[APP] 💾 Salvando no banco:', empenho);

    const id = await dbGateway.salvarEmpenho(empenho);
    console.log('[APP] ✅ Empenho salvo com ID:', id);

    try {
      await dbGateway.criarSaldosEmpenho(id, empenho);
      console.log('[APP] ✅ Saldos de empenho criados com sucesso');
    } catch (saldoError) {
      console.warn('[APP] ⚠️ Erro ao criar saldos (empenho foi salvo):', saldoError);
    }

    if (app.currentEmpenho && app.currentEmpenho.arquivoInfo) {
      try {
        const arquivoInfo = app.currentEmpenho.arquivoInfo;
        arquivoInfo.documentoId = id;
        const arquivoId = await dbGateway.salvarArquivo(arquivoInfo);
        console.log('[APP] ✅ Informações do arquivo salvas:', arquivoId);
      } catch (error) {
        console.warn('[APP] ⚠️ Erro ao salvar informações do arquivo:', error);
      }
    }

    if (pendencias.length > 0) {
      app.showInfo(`Empenho salvo como rascunho. Pendências: ${pendencias.length}`);
    } else {
      app.showSuccess('Empenho salvo com sucesso!');
    }

    app.limparFormulario('formEmpenho');
    app.currentEmpenho = null;
    app._anexoPdfNEPendente = null;
    app._resetarDraftEmpenho();

    await app.carregarEmpenhosSelect();
    await app.carregarEmpenhosNovoCadastro();
    if (window.RelatoriosEmpenhos?.carregar) {
      window.RelatoriosEmpenhos.carregar();
    }

    if (app.telaAntesCadastroEmpenho === 'notaFiscalScreen') {
      setTimeout(() => {
        document.querySelectorAll('.screen').forEach((screen) => {
          screen.classList.remove('active');
        });
        document.getElementById('notaFiscalScreen').classList.add('active');
        app.telaAntesCadastroEmpenho = null;
        app.showInfo('Empenho salvo! Agora você pode associá-lo à nota fiscal.');
      }, 1500);
    }
  } catch (error) {
    console.error('[APP] ❌ Erro ao salvar empenho:', error);
    app.showError('Erro ao salvar empenho: ' + error.message, error);
  } finally {
    app.hideLoading();
  }
}
/* eslint-enable complexity */
