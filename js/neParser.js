/**
 * Parser especializado para Notas de Empenho (NE) - Padrão IF Baiano
 * Extrai dados estruturados de PDFs de Nota de Empenho
 */

/**
 * Lê um arquivo PDF de Nota de Empenho e extrai dados estruturados
 * @param {File} file - Arquivo PDF da Nota de Empenho
 * @returns {Promise<Object>} Dados estruturados da NE
 */
export async function parseEmpenhoPdf(file) {
  try {
    console.log('Iniciando parse de Nota de Empenho:', file.name);

    // Lê o PDF e extrai texto
    const rawText = await extractTextFromPDF(file);
    console.log('Texto extraído do PDF (primeiros 500 chars):', rawText.substring(0, 500));

    // Normaliza whitespaces
    const normalizedText = normalizeWhitespace(rawText);

    // Extrai cabeçalho
    const cabecalho = extractCabecalho(normalizedText);
    console.log('Cabeçalho extraído:', cabecalho);

    // Extrai itens
    const itens = extractItens(normalizedText);
    console.log(`${itens.length} itens extraídos`);

    return {
      cabecalho,
      itens,
      rawText
    };
  } catch (error) {
    console.error('Erro ao fazer parse da Nota de Empenho:', error);
    throw new Error('Erro ao processar PDF: ' + error.message);
  }
}

/**
 * Extrai texto de todas as páginas do PDF
 * @param {File} file - Arquivo PDF
 * @returns {Promise<string>} Texto concatenado
 */
async function extractTextFromPDF(file) {
  const arrayBuffer = await fileToArrayBuffer(file);
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Concatena todos os itens de texto da página
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}

/**
 * Converte File para ArrayBuffer
 * @param {File} file - Arquivo
 * @returns {Promise<ArrayBuffer>}
 */
function fileToArrayBuffer(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Normaliza whitespaces no texto
 * @param {string} text - Texto original
 * @returns {string} Texto normalizado
 */
function normalizeWhitespace(text) {
  return text
    .replace(/\s+/g, ' ') // Múltiplos espaços -> um espaço
    .replace(/\n\s+/g, '\n') // Remove espaços no início de linhas
    .trim();
}

/**
 * Extrai dados do cabeçalho da Nota de Empenho
 * @param {string} text - Texto normalizado
 * @returns {Object} Dados do cabeçalho
 */
function extractCabecalho(text) {
  const cabecalho = {
    ano: '',
    numero: '',
    naturezaDespesa: '',
    processo: '',
    dataEmissao: '', // ← NOVO: data completa
    valorTotal: 0,
    cnpj: '',
    cnpj_num: '',
    fornecedor: ''
  };

  try {
    // ========================================
    // EXTRAI DATA DE EMISSÃO (PRIORIDADE)
    // ========================================
    // Formato: "Emissão 01/02/2024" ou "Data: 01/02/2024" ou "01/02/2024"
    let dataMatch = text.match(/(?:Emissão|Data|Dt\.?\s+Emissão)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);
    if (!dataMatch) {
      // Busca padrão DD/MM/YYYY próximo ao início do documento
      const datasEncontradas = text.substring(0, 2000).match(/\b(\d{2}\/\d{2}\/20\d{2})\b/g);
      if (datasEncontradas && datasEncontradas.length > 0) {
        dataMatch = [null, datasEncontradas[0]];
      }
    }
    if (dataMatch) {
      const [dia, mes, ano] = dataMatch[1].split('/');
      cabecalho.dataEmissao = `${ano}-${mes}-${dia}`; // Formato ISO
      cabecalho.ano = ano; // Mantém ano separado para compatibilidade
      console.log('Data de emissão encontrada:', cabecalho.dataEmissao);
    }

    // Extrai Ano (fallback se data não foi encontrada)
    if (!cabecalho.ano) {
      let anoMatch = text.match(/REAL\s*[-–]\s*\(R\$\)\s+(20\d{2})\s+NE/i);
      if (!anoMatch) {
        anoMatch = text.match(/\b(20\d{2})\s+NE\s+\d+/i);
      }
      if (!anoMatch) {
        anoMatch = text.match(/Ano\s+Tipo\s+Número[^\d]+\d+[^\d]+(20\d{2})/i);
      }
      if (anoMatch) {
        cabecalho.ano = anoMatch[1];
        // Se não tem data completa, usa 01/01/ano como fallback
        if (!cabecalho.dataEmissao) {
          cabecalho.dataEmissao = `${cabecalho.ano}-01-01`;
        }
        console.log('Ano encontrado:', cabecalho.ano);
      }
    }

    // Extrai Número da NE - Formato: "2024 NE 48"
    let numeroMatch = text.match(/\b20\d{2}\s+NE\s+(\d{1,6})/i);
    if (!numeroMatch) {
      numeroMatch = text.match(/\bNE\b\s+(\d{1,6})/i);
    }
    if (!numeroMatch) {
      numeroMatch = text.match(/\bNúmero\b\s*[:−-]?\s*(\d{1,6})/i);
    }
    if (numeroMatch) {
      cabecalho.numero = numeroMatch[1];
      console.log('Número da NE encontrado:', cabecalho.numero);
    }

    // Extrai Natureza da Despesa - Busca "1 231548 1000000000 339030"
    let naturezaMatch = text.match(/\b1\s+\d{6}\s+\d{10}\s+(\d{6})\s+\d{6}/i);
    if (!naturezaMatch) {
      naturezaMatch = text.match(/Natureza da Despesa[^\d]+(\d{6})/i);
    }
    if (naturezaMatch) {
      cabecalho.naturezaDespesa = naturezaMatch[1];
      console.log('Natureza da Despesa encontrada:', cabecalho.naturezaDespesa);
    }

    // Extrai Processo - Formato: "Global 23330.250275.2024-31"
    let processoMatch = text.match(/Global\s+(\d{2,5}\.\d{6,12}\.\d{4}-\d{2})/i);
    if (!processoMatch) {
      processoMatch = text.match(/Processo\s+(\d{2,5}\.\d{6,12}\.\d{4}-\d{2})/i);
    }
    if (!processoMatch) {
      processoMatch = text.match(/\b(\d{5}\.\d{9}\.\d{4}-\d{2})\b/);
    }
    if (processoMatch) {
      cabecalho.processo = processoMatch[1].trim();
      console.log('Processo encontrado:', cabecalho.processo);
    }

    // Extrai Valor Total - Procura "Valor ... 238.294,40"
    let valorMatch = text.match(/\bValor\b[^\d]+(\d{1,3}(?:\.\d{3})+,\d{2})/i);
    if (!valorMatch) {
      // Tenta encontrar valor grande próximo ao início (valor total do empenho)
      const valoresGrandes = text.match(/\b(\d{1,3}(?:\.\d{3})+,\d{2})\b/g);
      if (valoresGrandes && valoresGrandes.length > 0) {
        valorMatch = [null, valoresGrandes[0]];
      }
    }
    if (valorMatch) {
      cabecalho.valorTotal = toNumberBR(valorMatch[1]);
      console.log('Valor Total encontrado:', cabecalho.valorTotal);
    }

    // Extrai CNPJ e Fornecedor - Lógica corrigida
    // Padrão no PDF: "238.294,40 35.513.111/0001-86 GGV COMERCIO DE FRUTAS E VERDURAS LTDA"
    // O CNPJ do fornecedor é o que vem JUNTO com o nome da empresa
    // "CNPJ 10.724.903/0004-11" que aparece depois é do EMITENTE (não usar!)

    // Encontra o par CNPJ + Nome da empresa (este é o fornecedor)
    const cnpjNomeMatch = text.match(
      /(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\s+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ][A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ\s.&,-]{10,100}?(?:LTDA|EIRELI|ME|S\.?A\.?|EPP))/i
    );

    if (cnpjNomeMatch) {
      // Usa o CNPJ que vem junto com o nome (CORRETO - do fornecedor)
      cabecalho.cnpj = cnpjNomeMatch[1].trim();
      cabecalho.cnpj_num = cabecalho.cnpj.replace(/\D/g, '');
      cabecalho.fornecedor = cnpjNomeMatch[2].trim();

      console.log('CNPJ do fornecedor encontrado:', cabecalho.cnpj);
      console.log('Fornecedor encontrado:', cabecalho.fornecedor);
    } else {
      // Fallback: busca qualquer CNPJ
      const cnpjMatch = text.match(/\b(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})\b/);
      if (cnpjMatch) {
        cabecalho.cnpj = cnpjMatch[1].trim();
        cabecalho.cnpj_num = cabecalho.cnpj.replace(/\D/g, '');
        console.log('CNPJ (fallback) encontrado:', cabecalho.cnpj);
      }
    }
  } catch (error) {
    console.error('Erro ao extrair cabeçalho:', error);
  }

  return cabecalho;
}

/**
 * Extrai lista de itens da Nota de Empenho
 * @param {string} text - Texto normalizado
 * @returns {Array} Lista de itens
 */
function extractItens(text) {
  const itens = [];
  let currentSubElemento = '';

  try {
    // Divide o texto em linhas para processamento
    const linhas = text.split(/\n+/);

    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();

      // Detecta Sub-Elemento
      const subElementoMatch = linha.match(
        /\b(?:Sub-?\s*Elemento|Subelemento)\w*\b[^0-9]*?(\d{2}\s*[-–]\s*[^\n]+?)(?:\s|$)/i
      );
      if (subElementoMatch) {
        currentSubElemento = subElementoMatch[1].trim();
        console.log('Sub-elemento detectado:', currentSubElemento);
        continue;
      }

      // Detecta início de item (seq)
      const seqMatch = linha.match(/^\s*(?:seq|item)?\s*(\d{3})\b/i);
      if (!seqMatch && linha.match(/^\s*(\d{3})\s*[-–]/)) {
        // Alternativa: número de 3 dígitos seguido de hífen
        const altSeqMatch = linha.match(/^\s*(\d{3})\s*[-–]/);
        if (altSeqMatch) {
          const item = parseItem(altSeqMatch[1], linha, linhas, i, currentSubElemento);
          if (item) {
            itens.push(item);
            console.log(`Item ${item.seq} extraído:`, item.descricao_resumida);
          }
        }
      } else if (seqMatch) {
        const item = parseItem(seqMatch[1], linha, linhas, i, currentSubElemento);
        if (item) {
          itens.push(item);
          console.log(`Item ${item.seq} extraído:`, item.descricao_resumida);
        }
      }
    }

    // Se não encontrou itens pelo método acima, tenta método alternativo
    if (itens.length === 0) {
      console.log('Tentando método alternativo de extração de itens...');
      return extractItensAlternativo(text);
    }
  } catch (error) {
    console.error('Erro ao extrair itens:', error);
  }

  return itens;
}

/**
 * Faz parse de um item individual
 * @param {string} seq - Sequência do item
 * @param {string} linha - Linha atual
 * @param {Array} linhas - Todas as linhas
 * @param {number} index - Índice da linha atual
 * @param {string} subElemento - Sub-elemento atual
 * @returns {Object|null} Item parseado ou null
 */
function parseItem(seq, linha, linhas, index, subElemento) {
  try {
    const item = {
      subElemento: subElemento || '',
      seq: seq.padStart(3, '0'),
      descricao: '',
      descricao_resumida: '',
      unidade: '',
      quantidade: 0,
      valorUnitario: 0,
      valorTotal: 0
    };

    // Extrai descrição (pode estar na mesma linha ou nas próximas)
    let descricaoCompleta = linha.replace(/^\s*(?:seq|item)?\s*\d{3}\s*[-–]?\s*/i, '');

    // Se a descrição está muito curta, pega das próximas linhas
    let nextLineIndex = index + 1;
    while (nextLineIndex < linhas.length && descricaoCompleta.length < 20) {
      const nextLine = linhas[nextLineIndex].trim();

      // Para se encontrar números ou nova seq
      if (/^\d{3}\s*[-–]/.test(nextLine) || /\bquantidade\b/i.test(nextLine)) {
        break;
      }

      descricaoCompleta += ' ' + nextLine;
      nextLineIndex++;
    }

    // Limpa a descrição
    descricaoCompleta = descricaoCompleta
      .replace(/\s+/g, ' ')
      .replace(/\d{1,3}[.,]\d{3}[.,]\d{2}/g, '') // Remove valores monetários
      .trim();

    // Procura por valores na linha e próximas linhas
    const contexto = linhas.slice(index, Math.min(index + 5, linhas.length)).join(' ');

    // Extrai Quantidade
    const qtdMatch = contexto.match(/\bquantidade\b[^0-9]*?([0-9.,]+)/i);
    if (qtdMatch) {
      item.quantidade = toNumberBR(qtdMatch[1]);
    } else {
      // Tenta encontrar padrão de quantidade (número grande seguido de unidade)
      const qtdAltMatch = contexto.match(/\b(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})?)\s*(?:kg|un|cx|lt|m|g)/i);
      if (qtdAltMatch) {
        item.quantidade = toNumberBR(qtdAltMatch[1]);
      }
    }

    // Extrai Valor Unitário
    const vlrUnitMatch = contexto.match(/\bvalor\s+unit[aá]rio\b[^0-9]*?R?\$?\s*([0-9.,]+)/i);
    if (vlrUnitMatch) {
      item.valorUnitario = toNumberBR(vlrUnitMatch[1]);
    } else {
      // Busca padrão de valor monetário
      const valores = contexto.match(/R?\$?\s*([0-9]{1,3}(?:[.,]\d{3})*,[.,]\d{2})/g);
      if (valores && valores.length >= 2) {
        item.valorUnitario = toNumberBR(valores[0]);
        item.valorTotal = toNumberBR(valores[1]);
      }
    }

    // Extrai Valor Total
    const vlrTotalMatch = contexto.match(/\bvalor\s+total\b[^0-9]*?R?\$?\s*([0-9.,]+)/i);
    if (vlrTotalMatch) {
      item.valorTotal = toNumberBR(vlrTotalMatch[1]);
    }

    // Se não encontrou valor total mas tem qtd e vlr unitário, calcula
    if (item.valorTotal === 0 && item.quantidade > 0 && item.valorUnitario > 0) {
      item.valorTotal = item.quantidade * item.valorUnitario;
    }

    // Tenta inferir unidade da descrição
    const unidadeMatch = descricaoCompleta.match(/\b(kg|un|cx|lt|m|g|pç|pc|par|dz|sc|fd)\b/i);
    if (unidadeMatch) {
      item.unidade = unidadeMatch[1].toLowerCase();
    } else {
      item.unidade = 'un'; // padrão
    }

    // Define descrição
    item.descricao = descricaoCompleta.substring(0, 200);
    item.descricao_resumida = normalizeDescResumida(descricaoCompleta);

    // Valida item
    if (item.descricao.length > 3) {
      return item;
    }
  } catch (error) {
    console.error(`Erro ao parsear item ${seq}:`, error);
  }

  return null;
}

/**
 * Método alternativo de extração de itens (quando padrão falha)
 * @param {string} text - Texto completo
 * @returns {Array} Lista de itens
 */
function extractItensAlternativo(text) {
  const itens = [];

  try {
    // Detecta sub-elemento da lista
    let currentSubElemento = '';
    const subMatch = text.match(/Subelemento\s+(\d{2})\s*[-–]\s*([^\n]+)/i);
    if (subMatch) {
      currentSubElemento = subMatch[1];
      console.log(`Sub-elemento encontrado: ${currentSubElemento} - ${subMatch[2]}`);
    }

    // Padrão 1: "Seq. Descrição Valor do Item" seguido de "Item compra: XXXXX"
    // Exemplo: "001 6.336,00 Item compra: 00001 - FRUTA, TIPO ABACAXI..."
    const pattern1 =
      /(\d{3})\s+([0-9.]+,\d{2})\s+Item\s+compra:\s+\d+\s*[-–]\s*([^\n]+?)(?=Data\s+Operação|Seq\.|$)/gis;

    let match;
    while ((match = pattern1.exec(text)) !== null) {
      const seq = match[1];
      const valorTotal = toNumberBR(match[2]);
      const descricao = match[3].trim();

      // Procura dados de quantidade e valor unitário nas linhas seguintes
      const posMatch = match.index + match[0].length;
      const proximasLinhas = text.substring(posMatch, posMatch + 300);

      // Procura: "Data Operação Quantidade Valor Unitário Valor Total"
      // Seguido de: "24/04/2024 Inclusão 2.880,00000 2,2000 6.336,00"
      // Captura quantidade com separador de milhar (2.880,00000)
      const dadosMatch = proximasLinhas.match(
        /(\d{1,2}\.\d{3},\d{5}|\d{1,5},\d{5})\s+(\d{1,3},\d{4})\s+(\d{1,3}(?:\.\d{3})*,\d{2})/
      );

      let quantidade = 0;
      let valorUnitario = 0;

      if (dadosMatch) {
        quantidade = toNumberBR(dadosMatch[1]);
        valorUnitario = toNumberBR(dadosMatch[2]);
        console.log(
          `Item ${seq} - Qtd: ${dadosMatch[1]} -> ${quantidade}, VlrUnit: ${dadosMatch[2]} -> ${valorUnitario}`
        );
      } else {
        // Se não encontrou, calcula unitário = total / quantidade estimada
        if (valorTotal > 0) {
          // Tenta inferir quantidade de algum padrão na descrição
          const qtdInferida = 1;
          quantidade = qtdInferida;
          valorUnitario = valorTotal / quantidade;
        }
      }

      // Detecta unidade da descrição
      let unidade = 'UN';
      if (/\bkg\b/i.test(descricao)) {
        unidade = 'KG';
      } else if (/\blitro|lt\b/i.test(descricao)) {
        unidade = 'LT';
      } else if (/\bcaixa|cx\b/i.test(descricao)) {
        unidade = 'CX';
      } else if (/\bmetro|m\b/i.test(descricao)) {
        unidade = 'M';
      } else if (/\bgrama|g\b/i.test(descricao)) {
        unidade = 'G';
      }

      const item = {
        subElemento: currentSubElemento,
        seq: seq,
        descricao: descricao.substring(0, 200),
        descricao_resumida: normalizeDescResumida(descricao),
        unidade: unidade,
        quantidade: quantidade,
        valorUnitario: valorUnitario,
        valorTotal: valorTotal
      };

      itens.push(item);
      console.log(`Item ${seq} extraído (alt): ${item.descricao_resumida} - R$ ${valorTotal.toFixed(2)}`);
    }

    // Se ainda não encontrou, tenta padrão mais simples
    if (itens.length === 0) {
      console.log('Tentando padrão alternativo 2...');

      // Procura por padrões de tabela com valores monetários
      const linhas = text.split(/\n+/);

      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();

        // Busca linhas com padrão de 3 dígitos no início seguido de valor
        const itemMatch = linha.match(/^(\d{3})\s+([0-9.]+,\d{2})/);
        if (itemMatch) {
          const seq = itemMatch[1];
          const valorTotal = toNumberBR(itemMatch[2]);

          // Procura descrição nas próximas linhas
          let descricao = '';
          for (let j = i + 1; j < Math.min(i + 5, linhas.length); j++) {
            const nextLine = linhas[j].trim();
            if (/Item\s+compra:/i.test(nextLine)) {
              const descMatch = nextLine.match(/Item\s+compra:\s+\d+\s*[-–]\s*(.+)/i);
              if (descMatch) {
                descricao = descMatch[1].trim();
                break;
              }
            }
          }

          if (descricao) {
            // Procura quantidade e valor unitário
            let quantidade = 0;
            let valorUnitario = 0;

            for (let j = i + 1; j < Math.min(i + 10, linhas.length); j++) {
              const dataLine = linhas[j].trim();
              const dadosMatch = dataLine.match(/(\d{1,5}(?:[.,]\d+)?)\s+([0-9.,]+)\s+([0-9.]+,\d{2})/);

              if (dadosMatch) {
                quantidade = toNumberBR(dadosMatch[1]);
                valorUnitario = toNumberBR(dadosMatch[2]);
                break;
              }
            }

            const item = {
              subElemento: currentSubElemento,
              seq: seq,
              descricao: descricao.substring(0, 200),
              descricao_resumida: normalizeDescResumida(descricao),
              unidade: 'UN',
              quantidade: quantidade,
              valorUnitario: valorUnitario,
              valorTotal: valorTotal
            };

            itens.push(item);
            console.log(`Item ${seq} extraído (alt2): ${item.descricao_resumida}`);
          }
        }
      }
    }
  } catch (error) {
    console.error('Erro no método alternativo:', error);
  }

  // Remove duplicados (baseado em seq + valorTotal + descrição)
  const itensUnicos = [];
  const chaves = new Set();

  for (const item of itens) {
    // Chave única: seq + valorTotal (arredondado para evitar problemas de precisão)
    const chave = `${item.seq}-${item.valorTotal.toFixed(2)}`;
    if (!chaves.has(chave)) {
      chaves.add(chave);
      itensUnicos.push(item);
    } else {
      console.log(`✂️ Item duplicado removido: ${item.seq} - R$ ${item.valorTotal.toFixed(2)}`);
    }
  }

  console.log(`📦 Total após deduplicação: ${itensUnicos.length} itens únicos`);
  return itensUnicos;
}

/**
 * Converte string de número no formato brasileiro para número decimal
 * @param {string} str - String no formato 1.234,56
 * @returns {number} Número decimal
 */
function toNumberBR(str) {
  if (typeof str === 'number') {
    return str;
  }

  try {
    // Remove R$, espaços e outros caracteres
    let cleaned = str.toString().replace(/[R$\s]/g, '');

    // Se tem ponto e vírgula, ponto é separador de milhar
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Se tem só vírgula, é separador decimal
    else if (cleaned.includes(',')) {
      cleaned = cleaned.replace(',', '.');
    }

    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  } catch (error) {
    console.error('Erro ao converter número:', str, error);
    return 0;
  }
}

/**
 * Normaliza descrição para resumida (primeira palavra significativa)
 * @param {string} desc - Descrição completa
 * @returns {string} Descrição resumida sem acentos
 */
function normalizeDescResumida(desc) {
  try {
    // Remove tudo após vírgula, hífen, parênteses
    let resumida = desc.split(/[,–\-(]/)[0].trim();

    // Pega primeira palavra significativa (> 2 caracteres)
    const palavras = resumida.split(/\s+/);
    for (const palavra of palavras) {
      if (palavra.length > 2 && !/^\d+$/.test(palavra)) {
        resumida = palavra;
        break;
      }
    }

    // Remove acentos
    resumida = resumida
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    return resumida;
  } catch (error) {
    console.error('Erro ao normalizar descrição:', error);
    return desc.substring(0, 20);
  }
}

// Exporta funções auxiliares para testes
export { toNumberBR, normalizeDescResumida, extractTextFromPDF };
