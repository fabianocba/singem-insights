import InputValidator from '../../core/inputValidator.js';
import * as FormatUtils from '../../core/format.js';

export async function processarPDF(app, file, callback) {
  try {
    app.showLoading('Processando PDF...');

    const textContent = await window.pdfReader.lerPDF(file);

    let extractedData = {};
    let usedNeParser = false;

    if (window.pdfReader.validarNotaEmpenho(textContent)) {
      if (window.neParserReady) {
        try {
          await window.neParserReady;
        } catch (e) {
          console.warn('Módulo neParser não carregou corretamente, usando parser genérico');
        }
      }

      if (window.neParser && typeof window.neParser.parseEmpenhoPdf === 'function') {
        try {
          console.log('🎯 Tentando parser especializado de Nota de Empenho...');
          const neData = await window.neParser.parseEmpenhoPdf(file);

          if (neData && neData.cabecalho && neData.cabecalho.numero) {
            extractedData = {
              ano: neData.cabecalho.ano,
              numero: neData.cabecalho.numero,
              data: neData.cabecalho.dataEmissao || (neData.cabecalho.ano ? `${neData.cabecalho.ano}-01-01` : ''),
              naturezaDespesa: neData.cabecalho.naturezaDespesa || '',
              processo: neData.cabecalho.processo || '',
              fornecedor: neData.cabecalho.fornecedor,
              cnpj: neData.cabecalho.cnpj,
              valorTotal: neData.cabecalho.valorTotal,
              itens: neData.itens.map((item) => ({
                seq: item.seq,
                codigo: item.seq,
                descricao: item.descricao,
                unidade: item.unidade,
                quantidade: item.quantidade,
                valorUnitario: item.valorUnitario,
                valorTotal: item.valorTotal,
                subElemento: item.subElemento
              })),
              _neData: neData
            };

            usedNeParser = true;
          } else {
            throw new Error('Parser NE não retornou dados válidos');
          }
        } catch (neError) {
          extractedData = window.pdfReader.extrairDadosEmpenho(textContent);
        }
      } else {
        extractedData = window.pdfReader.extrairDadosEmpenho(textContent);
      }
    } else if (window.pdfReader.validarNotaFiscal(textContent)) {
      extractedData = window.pdfReader.extrairDadosNotaFiscal(textContent);
    }

    extractedData._usedNeParser = usedNeParser;
    callback(file, textContent, extractedData);
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    app.showError('Erro ao processar PDF: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

export function preencherFormularioEmpenho(app, extractedData) {
  if (extractedData.numero) {
    document.getElementById('numeroEmpenho').value = extractedData.numero;
  }
  if (extractedData.data) {
    document.getElementById('dataEmpenho').value = extractedData.data;
  }
  if (extractedData.processo) {
    const migrado = FormatUtils.migrarProcesso(extractedData.processo);
    const inputProcesso = document.getElementById('processoSuapEmpenho');
    if (inputProcesso) {
      inputProcesso.value = migrado.processoSuap || '';
    }
  }
  if (extractedData.fornecedor) {
    document.getElementById('fornecedorEmpenho').value = extractedData.fornecedor;
  }
  if (extractedData.cnpj) {
    const cnpjDigits = FormatUtils.onlyDigits(extractedData.cnpj);
    document.getElementById('cnpjFornecedor').value = FormatUtils.formatCNPJ(cnpjDigits);
  }
  if (extractedData.valorTotal) {
    document.getElementById('valorTotalEmpenho').value = FormatUtils.formatMoneyBR(extractedData.valorTotal);
  }
  app.adicionarItensExtraidos('itensEmpenho', extractedData.itens);
}

export async function salvarArquivoEmpenho(app, file, _textContent, extractedData) {
  console.log('[APP] 💾 Registrando arquivo de empenho para persistência em banco...');

  try {
    const metadados = {
      numero: extractedData.numero,
      fornecedor: extractedData.fornecedor,
      data: extractedData.data
    };

    console.log('[APP] 📋 Metadados:', metadados);

    const ano = extractedData?.ano || new Date().getFullYear();
    const numero = String(extractedData?.numero || 'SEM_NUMERO').replace(/\D/g, '') || 'SEM_NUMERO';

    const result = {
      originalName: file?.name || `NE_${ano}_${numero}.pdf`,
      savedName: file?.name || `NE_${ano}_${numero}.pdf`,
      folderType: 'empenhos',
      year: parseInt(ano, 10) || new Date().getFullYear(),
      size: file?.size || 0,
      timestamp: new Date().toISOString(),
      path: `db://empenhos/${ano}/${numero}`,
      method: 'database'
    };

    console.log('[APP] ✅ Registro preparado para banco:', result.method);
    return result;
  } catch (error) {
    console.error('[APP] ❌ Erro ao salvar arquivo:', error);

    app.showError(
      'Não foi possível salvar o arquivo de empenho.\n\n' +
        'Por favor, copie esta mensagem e os detalhes técnicos abaixo.',
      error
    );

    return null;
  }
}

export function gerarMensagemResumoEmpenho(extractedData, arquivoInfo) {
  let mensagem = 'PDF processado com sucesso!\n\n';

  if (extractedData._usedNeParser) {
    mensagem += '🎯 Parser Especializado de NE utilizado!\n\n';

    if (extractedData._neData) {
      const neData = extractedData._neData;
      mensagem += 'Dados do Cabeçalho:\n';
      mensagem += neData.cabecalho.ano ? `✓ Ano: ${neData.cabecalho.ano}\n` : '';
      mensagem += neData.cabecalho.numero ? `✓ NE Nº: ${neData.cabecalho.numero}\n` : '';
      mensagem += neData.cabecalho.processo ? `✓ Processo: ${neData.cabecalho.processo}\n` : '';
      mensagem += neData.cabecalho.naturezaDespesa ? `✓ Natureza: ${neData.cabecalho.naturezaDespesa}\n` : '';
      mensagem += neData.cabecalho.fornecedor ? `✓ Fornecedor: ${neData.cabecalho.fornecedor}\n` : '';
      mensagem += neData.cabecalho.cnpj ? `✓ CNPJ: ${neData.cabecalho.cnpj}\n` : '';
      mensagem += neData.cabecalho.valorTotal ? `✓ Valor Total: R$ ${neData.cabecalho.valorTotal.toFixed(2)}\n` : '';
      mensagem += `\n✓ ${neData.itens.length} itens extraídos\n`;

      if (neData.itens.length > 0) {
        mensagem += '\nPrimeiros itens:\n';
        neData.itens.slice(0, 3).forEach((item) => {
          mensagem += `  • ${item.seq} - ${item.descricao_resumida}\n`;
        });
        if (neData.itens.length > 3) {
          mensagem += `  ... e mais ${neData.itens.length - 3} itens\n`;
        }
      }
    }
  } else {
    mensagem += 'Dados extraídos:\n';
    mensagem += extractedData.numero ? `✓ Número: ${extractedData.numero}\n` : '✗ Número não encontrado\n';
    mensagem += extractedData.data ? `✓ Data: ${extractedData.data}\n` : '✗ Data não encontrada\n';
    mensagem += extractedData.fornecedor ? `✓ Fornecedor: ${extractedData.fornecedor}\n` : '✗ Fornecedor não encontrado\n';
    mensagem += extractedData.cnpj ? `✓ CNPJ: ${extractedData.cnpj}\n` : '✗ CNPJ não encontrado\n';
    mensagem +=
      extractedData.itens && extractedData.itens.length > 0
        ? `✓ ${extractedData.itens.length} itens encontrados\n`
        : '✗ Nenhum item encontrado\n';
    mensagem += extractedData.valorTotal ? `✓ Valor Total: R$ ${extractedData.valorTotal.toFixed(2)}\n` : '';
  }

  if (arquivoInfo) {
    mensagem += `\nArquivo salvo em: ${arquivoInfo.path}`;
  }

  mensagem += '\n\nVerifique os dados e corrija se necessário.';
  return mensagem;
}

export async function processarEmpenhoUpload(app, file, textContent, extractedData) {
  try {
    console.log('[APP] 📥 Processando upload de empenho...');
    console.log('[APP] 📄 ExtractedData recebido:', extractedData);

    const fileValidation = InputValidator.validatePDFFile(file);
    if (!fileValidation.valid) {
      alert(`Arquivo invalido: ${fileValidation.error}`);
      return;
    }

    app._atualizarDraftFromParser(extractedData);
    app.normalizeEmpenhoDraft();
    await app.syncFromDraftToForm();

    const arquivoInfo = await app._salvarArquivoEmpenho(file, textContent, extractedData);

    app.currentEmpenho = {
      file: file,
      textContent: textContent,
      extractedData: extractedData,
      arquivoInfo: arquivoInfo
    };

    const mensagem = app._gerarMensagemResumoEmpenho(extractedData, arquivoInfo);
    app.showSuccess(mensagem);

    console.log('[APP] ✅ Upload de empenho processado com sucesso');
    console.log('[APP] 📊 Draft final:', app.empenhoDraft);
  } catch (error) {
    console.error('[APP] ❌ Erro ao processar upload de empenho:', error);
    app.showError('Erro ao processar PDF: ' + error.message, error);
  }
}

export function atualizarDraftFromParser(app, extractedData) {
  console.log('[State] 📝 Atualizando draft from parser...');

  const processoSuap = extractedData.processo || '';

  app.empenhoDraft = {
    header: {
      ano: null,
      numero: null,
      dataEmissaoISO: null,
      naturezaDespesa: null,
      processoSuap: '',
      valorTotalEmpenho: 0,
      fornecedorRazao: null,
      cnpjDigits: '',
      telefoneDigits: '',
      emailFornecedor: ''
    },
    itens: []
  };

  app.empenhoDraft.header.ano = extractedData.ano || new Date().getFullYear().toString();
  app.empenhoDraft.header.numero = extractedData.numero || '';

  if (extractedData.data) {
    if (extractedData.data.includes('/')) {
      app.empenhoDraft.header.dataEmissaoISO = app.dataBRtoISO(extractedData.data);
    } else {
      app.empenhoDraft.header.dataEmissaoISO = extractedData.data;
    }
  }

  app.empenhoDraft.header.naturezaDespesa = extractedData.naturezaDespesa || '';
  app.empenhoDraft.header.processoSuap = processoSuap;
  app.empenhoDraft.header.valorTotalEmpenho = extractedData.valorTotal || 0;
  app.empenhoDraft.header.fornecedorRazao = extractedData.fornecedor || '';
  app.empenhoDraft.header.cnpjDigits = FormatUtils.onlyDigits(extractedData.cnpj || '');

  if (extractedData.itens && Array.isArray(extractedData.itens)) {
    const itensUnicos = [];
    const seqVistas = new Set();

    extractedData.itens.forEach((item) => {
      const seq = item.seq || item.item || itensUnicos.length + 1;

      if (seqVistas.has(seq)) {
        console.warn(`[State] ⚠️ Item duplicado seq=${seq} ignorado`);
        return;
      }

      seqVistas.add(seq);

      itensUnicos.push({
        seq: seq,
        descricao: item.descricao || item.material || '',
        unidade: item.unidade || 'UN',
        quantidade: app.parseNumero(item.quantidade || 0),
        valorUnitario: app.parseNumero(item.valorUnitario || item.valorUnit || 0),
        valorTotal: app.parseNumero(item.valorTotal || 0),
        subElemento: item.subElemento || null
      });
    });

    app.empenhoDraft.itens = itensUnicos;
    console.log(`[State] ✅ ${itensUnicos.length} itens únicos adicionados ao draft`);
  }

  console.log('[State] ✅ Draft atualizado from parser');
  console.log('[State] 📊 Header:', app.empenhoDraft.header);
  console.log('[State] 📦 Itens:', app.empenhoDraft.itens.length);
}
