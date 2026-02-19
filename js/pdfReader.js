/**
 * Leitor de PDF para extrair dados de Notas de Empenho e Notas Fiscais
 * Sistema de Controle de Material - IF Baiano
 */

class PDFReader {
  constructor() {
    this.pdfData = null;
    this.textContent = '';

    // Configuração do PDF.js
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  /**
   * Lê um arquivo PDF e extrai o texto
   * @param {File} file - Arquivo PDF
   * @returns {Promise<string>} Texto extraído do PDF
   */
  async lerPDF(file) {
    try {
      const arrayBuffer = await this.fileToArrayBuffer(file);
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      let textoCompleto = '';

      // Extrai texto de todas as páginas com melhor preservação de estrutura
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();

        // Processa items preservando posicionamento vertical
        let lastY = null;
        const linhas = [];
        let linhaAtual = '';

        textContent.items.forEach((item) => {
          const currentY = item.transform[5]; // Posição Y (vertical)

          // Se mudou de linha (Y diferente), quebra linha
          if (lastY !== null && Math.abs(currentY - lastY) > 2) {
            if (linhaAtual.trim()) {
              linhas.push(linhaAtual.trim());
            }
            linhaAtual = item.str;
          } else {
            // Mesma linha, adiciona espaço se necessário
            if (linhaAtual && !linhaAtual.endsWith(' ') && !item.str.startsWith(' ')) {
              linhaAtual += ' ';
            }
            linhaAtual += item.str;
          }

          lastY = currentY;
        });

        // Adiciona última linha
        if (linhaAtual.trim()) {
          linhas.push(linhaAtual.trim());
        }

        // Junta linhas com quebra
        textoCompleto += linhas.join('\n') + '\n';
      }

      this.textContent = textoCompleto;
      console.log('PDF processado com sucesso');
      console.log(`📄 Total de linhas extraídas: ${textoCompleto.split('\n').length}`);
      return textoCompleto;
    } catch (error) {
      console.error('Erro ao processar PDF:', error);
      throw new Error('Erro ao processar PDF: ' + error.message);
    }
  }

  /**
   * Converte arquivo para ArrayBuffer
   * @param {File} file - Arquivo
   * @returns {Promise<ArrayBuffer>}
   */
  fileToArrayBuffer(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Valida CNPJ usando algoritmo oficial
   * @param {string} cnpj - CNPJ a validar
   * @returns {boolean} true se válido
   */
  validarCNPJ(cnpj) {
    if (!cnpj) {
      return false;
    }

    // Remove formatação
    cnpj = cnpj.replace(/[^\d]/g, '');

    // Verifica se tem 14 dígitos
    if (cnpj.length !== 14) {
      return false;
    }

    // Elimina CNPJs inválidos conhecidos (todos dígitos iguais)
    if (/^(\d)\1+$/.test(cnpj)) {
      return false;
    }

    // Valida dígitos verificadores
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
    if (resultado !== digitos.charAt(0)) {
      return false;
    }

    tamanho = tamanho + 1;
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
    if (resultado !== digitos.charAt(1)) {
      return false;
    }

    return true;
  }

  /**
   * Extrai dados de uma Nota de Empenho do texto do PDF
   * @param {string} texto - Texto extraído do PDF
   * @returns {Object} Dados estruturados da Nota de Empenho
   */
  extrairDadosEmpenho(texto) {
    const dados = {
      numero: '',
      data: '',
      fornecedor: '',
      cnpj: '',
      valorTotal: 0,
      itens: []
    };

    try {
      console.log('Iniciando extração de dados de empenho...');

      // Padrões regex para extrair dados específicos - MELHORADOS
      const padroes = {
        // Número do empenho - várias variações
        numero: /(?:nota\s+de\s+empenho|empenho|n\.?\s*e\.?|ne)[\s\n:]*(?:n[ºº°]?\.?[\s]*)?(\d{4,})/i,
        numeroAlt: /(?:empenho|numero|número|n°)[\s]*(?::|-)[\s]*(\d{4,})/i,
        numeroAlt2: /(?:^|\n)\s*(\d{6,})\s*(?:\n|$)/m, // Número isolado com 6+ dígitos

        // Data - várias variações
        data: /(?:data|emissão|emitido\s+em)[\s]*:?[\s]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
        dataAlt: /(\d{1,2}\/\d{1,2}\/\d{4})/,

        // CNPJ
        cnpj: /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/,

        // Valor total - várias variações
        valorTotal:
          /(?:valor\s+total|total\s+geral|total|valor|vl\.?\s*total)[\s]*:?[\s]*r?\$?[\s]*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/i,

        // Fornecedor - várias variações
        fornecedor:
          /(?:fornecedor|razão\s+social|credor|empresa)[\s]*:?[\s]*([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ][^\n\r]{10,150})/i,
        fornecedorAlt: /(?:^|\n)\s*([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ\s&.-]{15,150})\s+(?:\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/m
      };

      // Extrai número do empenho com múltiplas tentativas
      let match = texto.match(padroes.numero);
      if (!match) {
        match = texto.match(padroes.numeroAlt);
      }
      if (!match) {
        match = texto.match(padroes.numeroAlt2);
      }

      if (match) {
        dados.numero = match[1].trim();
        console.log('Número do empenho encontrado:', dados.numero);
      } else {
        console.warn('Número do empenho não encontrado');
      }

      // Extrai data
      match = texto.match(padroes.data);
      if (match) {
        dados.data = this.formatarData(match[1]);
        console.log('Data encontrada:', dados.data);
      } else {
        // Tenta encontrar qualquer data no formato dd/mm/aaaa
        const datas = texto.match(/\d{1,2}\/\d{1,2}\/\d{4}/g);
        if (datas && datas.length > 0) {
          dados.data = this.formatarData(datas[0]);
          console.log('Data encontrada (alternativa):', dados.data);
        }
      }

      // Extrai CNPJ
      match = texto.match(padroes.cnpj);
      if (match) {
        dados.cnpj = this.formatarCNPJ(match[1]);
        console.log('CNPJ encontrado:', dados.cnpj);
      } else {
        console.warn('CNPJ não encontrado');
      }

      // Extrai fornecedor
      match = texto.match(padroes.fornecedor);
      if (!match) {
        match = texto.match(padroes.fornecedorAlt);
      }

      if (match) {
        // Limpa o nome do fornecedor
        dados.fornecedor = match[1].trim().replace(/\s+/g, ' ').replace(/\n/g, ' ').substring(0, 150);
        console.log('Fornecedor encontrado:', dados.fornecedor);
      } else {
        console.warn('Fornecedor não encontrado');
        // Tenta extrair texto próximo ao CNPJ
        if (dados.cnpj) {
          const indexCNPJ = texto.indexOf(dados.cnpj);
          if (indexCNPJ > 0) {
            const textoAntes = texto.substring(Math.max(0, indexCNPJ - 200), indexCNPJ);
            const linhas = textoAntes.split(/\n/);
            for (let i = linhas.length - 1; i >= 0; i--) {
              const linha = linhas[i].trim();
              if (linha.length > 10 && /[A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ]/.test(linha)) {
                dados.fornecedor = linha.substring(0, 150);
                console.log('Fornecedor extraído próximo ao CNPJ:', dados.fornecedor);
                break;
              }
            }
          }
        }
      }

      // Extrai valor total
      match = texto.match(padroes.valorTotal);
      if (match) {
        dados.valorTotal = this.converterValor(match[1]);
        console.log('Valor total encontrado:', dados.valorTotal);
      } else {
        console.warn('Valor total não encontrado');
      }

      // Extrai itens - MÉTODO APRIMORADO
      dados.itens = this.extrairItensEmpenho(texto);
      console.log(`${dados.itens.length} itens extraídos`);

      console.log('Dados extraídos do empenho:', dados);
      return dados;
    } catch (error) {
      console.error('Erro ao extrair dados do empenho:', error);
      return dados;
    }
  }

  /**
   * Extrai dados de uma Nota Fiscal do texto do PDF
   * @param {string} texto - Texto extraído do PDF
   * @returns {Object} Dados estruturados da Nota Fiscal
   */
  extrairDadosNotaFiscal(texto) {
    const dados = {
      numero: '',
      data: '',
      nomeFornecedor: '',
      cnpjEmitente: '',
      cnpjDestinatario: '',
      chaveAcesso: '',
      valorTotal: 0,
      itens: []
    };

    try {
      console.log('=== INICIANDO EXTRAÇÃO DE NOTA FISCAL ===');
      console.log('📋 REGRAS DE VALIDAÇÃO ATIVAS:');
      console.log('  ✓ Pré-processamento de texto (normalização de espaços, valores)');
      console.log('  ✓ Validação de CNPJ (algoritmo oficial + verificação de duplicação)');
      console.log('  ✓ Validação de data (consistência + range de 10 anos)');
      console.log('  ✓ Validação de itens (quantidade > 0, valores >= 0, cálculo qtd×unit)');
      console.log('  ✓ Correção automática de valor total (diferença > 50% = usa soma itens)');
      console.log('  ✓ 13 padrões de extração de valor total (super flexíveis)');
      console.log('================================================================================');

      // ========== PRÉ-PROCESSAMENTO DEFENSIVO ==========
      // Previne erros comuns de extração de PDF/OCR

      if (!texto || texto.trim().length === 0) {
        console.error('❌ Texto vazio ou inválido');
        return dados;
      }

      // 1. Normaliza espaços múltiplos (mas preserva quebras de linha)
      texto = texto.replace(/[ \t]+/g, ' ');

      // 2. Remove caracteres especiais invisíveis que atrapalham regex
      texto = texto.replace(/[\u200B-\u200D\uFEFF]/g, '');

      // 3. Normaliza aspas e apóstrofos
      texto = texto.replace(/['']/g, "'").replace(/[""]/g, '"');

      // 4. Corrige separadores de decimal com espaço: "0, 00" → "0,00"
      texto = texto.replace(/(\d+)\s*,\s*(\d+)/g, '$1,$2');

      // 5. Corrige separadores de milhar com espaço: "1 000,00" → "1.000,00"
      texto = texto.replace(/(\d)\s+(\d{3}),/g, '$1.$2,');

      console.log('✅ Texto pré-processado e normalizado');

      // Padrões regex aprimorados para extrair dados específicos
      const padroes = {
        // Número da NF-e - múltiplos padrões
        numero: [
          // NFS-e: "Nota 006422 / 375488" ou "NOTA FISCAL 375488"
          /nota\s+(?:fiscal\s+)?(?:\d+\s*\/\s*)?(\d{5,})/i,
          // NF-e Nº. 000.000.382 (formato com pontos)
          /nf-?e\s+n[ºº°]?\.?\s*(\d{3})\.(\d{3})\.(\d{3})/i,
          // NF-e Nº 000000382 ou similar (sem pontos)
          /nf-?e\s+n[ºº°]?\.?\s*(\d{6,9})/i,
          // Série XXX Nº 123456
          /s[ée]rie\s+\d+\s+n[ºº°]?\.?\s*(\d{6,})/i,
          // Número/Nº seguido de número
          /(?:n[úu]mero|n[ºº°])\s*(\d{6,})/i,
          // Nota fiscal eletrônica seguida de número
          /(?:nota fiscal eletr[ôo]nica)[\s\n]+n[ºº°]?\.?\s*(\d{3,})/i,
          // Padrão genérico: NF-e seguido de dígitos
          /nf-?e[\s:]+(\d{3,})/i,
          // "A 375488" (formato NFS-e)
          /^[A-Z]\s+(\d{5,})$/m
        ],

        // Data de emissão - múltiplos formatos
        data: /(?:data\s+de\s+emiss[ãa]o|emiss[ãa]o|data)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
        dataAlt: /(?:emitida\s+em|data)[\s:]*(\d{1,2}\/\d{1,2}\/\d{4})/i,
        dataNFSe: /^(\d{2}\/\d{2}\/\d{4})$/m, // Data sozinha em uma linha (NFS-e)

        // Nome do Fornecedor/Emitente
        nomeFornecedor: [
          // Seção completa "IDENTIFICAÇÃO DO EMITENTE" seguida do nome
          /identifica[çc][ãa]o\s+do\s+emitente[\s\n]+([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ\s&\-.]{5,}?)[\s\n]+(?:rua|av\.|avenida|r\.|estrada|rod\.|zona|piraja|\d)/i,
          // Padrão mais específico: nome completo antes de endereço
          /(?:^|\n)([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ\s&\-.]{15,100})[\s\n]+(?:av|avenida|rua|r\.|estrada|rod\.|zona|piraja)/im,
          // NFS-e: Nome seguido de número de inscrição
          /^([A-ZÀÁÂÃÄÅÇÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜ\s&\-.]{10,100})\s+\d{6,}$/m
        ],

        // CNPJ - identifica emitente e destinatário
        cnpjEmitente: [
          // CNPJ na seção "IDENTIFICAÇÃO DO EMITENTE" ou logo após "INSCRIÇÃO ESTADUAL DO SUBST. TRIBUT."
          /(?:inscrição\s+estadual\s+do\s+subst|identifica[çc][ãa]o\s+do\s+emitente)[\s\S]{0,150}?cnpj[\s\S]{0,50}?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/is,
          // CNPJ diretamente após contexto de emitente (antes da seção destinatário)
          /identifica[çc][ãa]o\s+do\s+emitente[\s\S]{0,300}?(?:cnpj|cpf)[\s\S]{0,50}?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})[\s\S]{0,100}?destinat/is
        ],
        cnpjDestinatario: [
          // CNPJ na seção "DESTINATÁRIO / REMETENTE" seguido de "CNPJ / CPF"
          /destinat[áa]rio\s*\/\s*remetente[\s\S]{0,300}?cnpj\s*\/\s*cpf[\s\n]+(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/is,
          // Padrão alternativo para destinatário
          /(?:destinat[áa]rio|tomador)[\s\S]{0,200}?cnpj[\s\S]{0,50}?(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/i
        ],
        cnpjGeral: /(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})/g,

        // Chave de Acesso - múltiplos formatos
        chaveAcesso:
          /(?:chave\s+de\s+acesso)[\s:]*(\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4}\s\d{4})/i,
        chaveAcessoSemEspaco: /(\d{44})/,
        chaveAcessoAlt:
          /(?:^|\n)(\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\s?\d{4})(?:\n|$)/m,

        // Valor Total da NF-e - MÚLTIPLAS VARIAÇÕES (ordem de prioridade)
        // ESTRATÉGIA: Padrões SIMPLES e DIRETOS primeiro, complexos depois
        valorTotal: [
          // ========== PADRÕES DIRETOS (PRIORIDADE MÁXIMA) ==========

          // 1. BUSCA DIRETA: "V. T OT AL DA NOT A" seguido de valor (ignora quebras de linha)
          // Captura "1298,72" depois de "V. T OT AL DA NOT A"
          /V\.\s*T\s*OT\s*AL\s*DA\s*NOT\s*A[\s\S]*?(\d{1,}(?:\.\d{3})*,\d{2})/i,

          // 2. BUSCA DIRETA: "V. T OT AL DE" seguido de "PRODUT OS" e valor
          /V\.\s*T\s*OT\s*AL\s*DE[\s\S]*?PRODUT\s*OS[\s\S]*?(\d{1,}(?:\.\d{3})*,\d{2})/i,

          // 3. Busca na seção CALCULO DO IMPOSTO por valor após TOTAL
          /CALCULO\s+DO\s+IMPOSTO[\s\S]{0,600}?TOTAL[\s\S]{0,100}?(\d{1,}(?:\.\d{3})*,\d{2})/i,

          // ========== PADRÕES FLEXÍVEIS ==========

          // Padrão genérico: V. TOTAL DA NOTA
          /v\.?\s*t\s*o?\s*t?\s*a?\s*l\s+d\s*a\s+n\s*o?\s*t?\s*a[\s\S]{0,50}?(\d{1,3}(?:\.\d{3})*,\d{2})/i,

          // V. TOTAL DE PRODUTOS
          /v\.?\s*t\s*o?\s*t?\s*a?\s*l\s+d\s*e[\s\S]{0,50}?p\s*r\s*o?\s*d?\s*u?\s*t?\s*o?\s*s?[\s\S]{0,50}?(\d{1,3}(?:\.\d{3})*,\d{2})/i,

          // VALOR TOTAL (com espaços entre letras)
          /v\s*a\s*l\s*o\s*r\s+t\s*o?\s*t?\s*a?\s*l[\s\S]{0,50}?(\d{1,3}(?:\.\d{3})*,\d{2})/i,

          // Busca valor após linha com "TOTAL" e "NOTA" juntos
          /(?:total|t\s*o\s*t\s*a\s*l)[\s\S]{0,20}?(?:nota|n\s*o\s*t\s*a)[\s\S]{0,50}?(\d{1,3}(?:\.\d{3})*,\d{2})/i,
          // Total da nota
          /total\s+da\s+nota[\s\S]{0,30}?(?<!\d)(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)/i,
          // VALOR TOTAL DOS PRODUTOS
          /valor\s+total\s+dos\s+produtos[\s\S]{0,30}?(?<!\d)(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)/i,
          // Total dos produtos
          /total\s+(?:dos\s+)?(?:produtos|mercadorias)[\s\S]{0,30}?(?<!\d)(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)/i,
          // Padrão genérico
          /(?:^|\n)\s*total[\s\S]{0,20}?(?<!\d)(\d{1,3}(?:\.\d{3})*,\d{2})(?!\d)/im
        ]
      };

      // Extrai número da NF com múltiplas tentativas
      let match;
      let numeroEncontrado = false;
      for (let i = 0; i < padroes.numero.length && !numeroEncontrado; i++) {
        match = texto.match(padroes.numero[i]);
        if (match) {
          // Se capturou formato com pontos (ex: 000.000.382), junta os grupos
          if (match.length > 3 && match[2] && match[3]) {
            dados.numero = (match[1] + match[2] + match[3]).replace(/^0+/, '') || match[1] + match[2] + match[3];
          } else {
            dados.numero = match[1].replace(/^0+/, '') || match[1];
          }
          console.log(`✅ Número da NF encontrado (padrão ${i + 1}):`, dados.numero);
          numeroEncontrado = true;
        }
      }

      if (!numeroEncontrado) {
        console.warn('⚠️  Número da NF não encontrado');
        // Tenta extrair da chave de acesso se disponível
        const chaveMatch = texto.match(/(\d{44})/);
        if (chaveMatch) {
          const chave = chaveMatch[1];
          const numeroChave = chave.substring(25, 34); // Posição do número na chave
          dados.numero = parseInt(numeroChave, 10).toString();
          console.log('ℹ️  Número extraído da chave de acesso:', dados.numero);
        }
      }

      // Extrai data
      match = texto.match(padroes.data);
      if (!match) {
        match = texto.match(padroes.dataAlt);
      }
      if (!match) {
        match = texto.match(padroes.dataNFSe);
      }

      if (match) {
        const dataExtraida = this.formatarData(match[1]);

        // VALIDAÇÃO: Verifica se data é válida e não é futura
        const partesData = dataExtraida.split('/');
        if (partesData.length === 3) {
          const dia = parseInt(partesData[0]);
          const mes = parseInt(partesData[1]);
          const ano = parseInt(partesData[2]);

          // Verifica se data é válida
          const dataObj = new Date(ano, mes - 1, dia);
          const dataValida =
            dataObj.getDate() === dia && dataObj.getMonth() === mes - 1 && dataObj.getFullYear() === ano;

          // Verifica se não é muito antiga (> 10 anos) ou futura (> 1 mês)
          const hoje = new Date();
          const umMesFuturo = new Date();
          umMesFuturo.setMonth(hoje.getMonth() + 1);
          const dezAnosAtras = new Date();
          dezAnosAtras.setFullYear(hoje.getFullYear() - 10);

          if (!dataValida) {
            console.warn('⚠️  Data extraída INVÁLIDA:', dataExtraida);
          } else if (dataObj > umMesFuturo) {
            console.warn('⚠️  Data FUTURA detectada:', dataExtraida);
          } else if (dataObj < dezAnosAtras) {
            console.warn('⚠️  Data muito ANTIGA detectada:', dataExtraida);
          } else {
            dados.data = dataExtraida;
            console.log('✅ Data VÁLIDA encontrada:', dados.data);
          }
        } else {
          dados.data = dataExtraida;
          console.log('✅ Data encontrada:', dados.data);
        }
      } else {
        console.warn('⚠️  Data não encontrada');
      }

      // Extrai Nome do Fornecedor
      let nomeFornecedorEncontrado = false;
      for (let i = 0; i < padroes.nomeFornecedor.length && !nomeFornecedorEncontrado; i++) {
        match = texto.match(padroes.nomeFornecedor[i]);
        if (match) {
          dados.nomeFornecedor = match[1].trim();
          console.log(`✅ Nome do fornecedor encontrado (padrão ${i + 1}):`, dados.nomeFornecedor);
          nomeFornecedorEncontrado = true;
        }
      }
      if (!nomeFornecedorEncontrado) {
        console.warn('⚠️  Nome do fornecedor não encontrado');
      }

      // === EXTRAI CHAVE DE ACESSO PRIMEIRO (para obter CNPJ confiável do emitente) ===
      match = texto.match(padroes.chaveAcesso);
      if (!match) {
        match = texto.match(padroes.chaveAcessoAlt);
      }
      if (!match) {
        // Busca sequência de 44 dígitos
        const allMatches = texto.match(/\d{44}/g);
        if (allMatches && allMatches.length > 0) {
          match = [null, allMatches[0]];
        }
      }

      let cnpjEmitenteDaChave = null;
      if (match) {
        dados.chaveAcesso = match[1].replace(/\s/g, '');
        console.log('✅ Chave de acesso encontrada:', dados.chaveAcesso);

        // Extrai CNPJ Emitente da chave (FONTE MAIS CONFIÁVEL)
        if (dados.chaveAcesso.length === 44) {
          const cnpjDaChave = dados.chaveAcesso.substring(6, 20); // Posições 6-19 = CNPJ do emitente
          cnpjEmitenteDaChave = this.formatarCNPJ(cnpjDaChave);
          console.log('🔑 CNPJ Emitente da chave de acesso:', cnpjEmitenteDaChave);
        }
      } else {
        console.warn('⚠️  Chave de acesso não encontrada');
      }

      // Extrai CNPJs (Emitente e Destinatário)
      let cnpjEmitMatch = null;
      let cnpjDestMatch = null;

      // Tenta encontrar CNPJ Emitente com múltiplos padrões
      for (let i = 0; i < padroes.cnpjEmitente.length && !cnpjEmitMatch; i++) {
        cnpjEmitMatch = texto.match(padroes.cnpjEmitente[i]);
        if (cnpjEmitMatch) {
          console.log(`🔍 CNPJ Emitente encontrado com padrão ${i + 1}`);
        }
      }

      // Tenta encontrar CNPJ Destinatário com múltiplos padrões
      for (let i = 0; i < padroes.cnpjDestinatario.length && !cnpjDestMatch; i++) {
        const matchDest = texto.match(padroes.cnpjDestinatario[i]);
        if (matchDest) {
          // Padrão 2 tem grupos extras, pega o último grupo que é o CNPJ
          cnpjDestMatch = matchDest.length > 2 ? [null, matchDest[matchDest.length - 1]] : matchDest;
          console.log(`🔍 CNPJ Destinatário encontrado com padrão ${i + 1}`);
        }
      }

      // Se não encontrou com contexto, pega os CNPJs do documento
      if (!cnpjEmitMatch || !cnpjDestMatch) {
        const todosCNPJs = texto.match(padroes.cnpjGeral);
        console.log(`🔍 Total de CNPJs encontrados no documento: ${todosCNPJs?.length || 0}`);

        if (todosCNPJs && todosCNPJs.length >= 2) {
          // Detecta se é NFS-e (Nota Fiscal de Serviço)
          const ehNFSe =
            /NOTA\s+FISCAL\s+DE\s+PRESTA[ÇC][ÃA]O\s+DE\s+SERVI[ÇC]OS/i.test(texto) ||
            /PRESTADOR\s+DO\s+SERVI[ÇC]O/i.test(texto);

          if (ehNFSe) {
            console.log('📋 NFS-e detectada - Ajustando ordem dos CNPJs');
            // Em NFS-e: geralmente o segundo CNPJ é o prestador (emitente)
            // e pode ter CNPJ da prefeitura antes
            const secaoPrestador = texto.match(/PRESTADOR\s+DO\s+SERVI[ÇC]O[\s\S]{0,500}?TOMADOR/i);
            const secaoTomador = texto.match(/TOMADOR\s+DO\s+SERVI[ÇC]O[\s\S]{0,500}?(?:VALOR|ITEM|DISCRIMINA)/i);

            if (secaoPrestador) {
              const cnpjPrestador = secaoPrestador[0].match(padroes.cnpjGeral);
              if (cnpjPrestador && cnpjPrestador.length > 0) {
                // Pega o último CNPJ da seção prestador
                cnpjEmitMatch = [null, cnpjPrestador[cnpjPrestador.length - 1]];
                console.log('ℹ️  CNPJ Emitente: extraído da seção PRESTADOR DO SERVIÇO');
              }
            }

            if (secaoTomador) {
              const cnpjTomador = secaoTomador[0].match(padroes.cnpjGeral);
              if (cnpjTomador && cnpjTomador.length > 0) {
                cnpjDestMatch = [null, cnpjTomador[0]];
                console.log('ℹ️  CNPJ Destinatário: extraído da seção TOMADOR DO SERVIÇO');
              }
            }
          } else {
            // Estratégia para NF-e: encontrar CNPJ na seção de emitente e destinatário
            // Divide o texto em seções
            const secaoEmitente = texto.match(/IDENTIFICA.*?EMITENTE[\s\S]{0,500}?DESTINAT/i);
            const secaoDestinatario = texto.match(/DESTINAT.*?REMETENTE[\s\S]{0,500}?(?:CNPJ|DATA)/i);

            if (secaoEmitente && !cnpjEmitMatch) {
              const cnpjNaSecaoEmit = secaoEmitente[0].match(padroes.cnpjGeral);
              if (cnpjNaSecaoEmit && cnpjNaSecaoEmit.length > 0) {
                // Pega o último CNPJ da seção emitente (geralmente é o correto)
                cnpjEmitMatch = [null, cnpjNaSecaoEmit[cnpjNaSecaoEmit.length - 1]];
                console.log('ℹ️  CNPJ Emitente: extraído da seção IDENTIFICAÇÃO DO EMITENTE');
              }
            }

            if (secaoDestinatario && !cnpjDestMatch) {
              const cnpjNaSecaoDest = secaoDestinatario[0].match(padroes.cnpjGeral);
              if (cnpjNaSecaoDest && cnpjNaSecaoDest.length > 0) {
                // Pega o primeiro CNPJ da seção destinatário
                const cnpjDest = cnpjNaSecaoDest[0];
                // Evita duplicação: se for igual ao emitente, pega o próximo (se houver)
                if (cnpjEmitMatch && cnpjDest === cnpjEmitMatch[1] && cnpjNaSecaoDest.length > 1) {
                  cnpjDestMatch = [null, cnpjNaSecaoDest[1]];
                  console.log('ℹ️  CNPJ Destinatário: usando segundo CNPJ da seção (evitou duplicação)');
                } else {
                  cnpjDestMatch = [null, cnpjDest];
                  console.log('ℹ️  CNPJ Destinatário: extraído da seção DESTINATÁRIO/REMETENTE');
                }
              }
            }
          }

          // Fallback: remove duplicados e usa primeiros diferentes
          if (!cnpjEmitMatch || !cnpjDestMatch) {
            const cnpjsUnicos = [...new Set(todosCNPJs)];

            if (cnpjsUnicos.length >= 2) {
              if (!cnpjEmitMatch) {
                cnpjEmitMatch = [null, cnpjsUnicos[0]];
                console.log('ℹ️  CNPJ Emitente: usando primeiro CNPJ único do documento');
              }
              if (!cnpjDestMatch) {
                cnpjDestMatch = [null, cnpjsUnicos[1]];
                console.log('ℹ️  CNPJ Destinatário: usando segundo CNPJ único do documento');
              }
            } else if (cnpjsUnicos.length === 1) {
              // Se só há um CNPJ único, pode ser emitente = destinatário
              if (!cnpjEmitMatch) {
                cnpjEmitMatch = [null, cnpjsUnicos[0]];
              }
              if (!cnpjDestMatch) {
                cnpjDestMatch = [null, cnpjsUnicos[0]];
              }
              console.warn('⚠️  Apenas um CNPJ único encontrado - Emitente = Destinatário');
            }
          }
        } else if (todosCNPJs && todosCNPJs.length >= 1) {
          if (!cnpjEmitMatch) {
            cnpjEmitMatch = [null, todosCNPJs[0]];
          }
        }
      }

      // === ATRIBUI CNPJs (priorizando chave de acesso para emitente) ===
      if (cnpjEmitenteDaChave) {
        // Usa SEMPRE o CNPJ da chave para emitente (mais confiável)
        dados.cnpjEmitente = cnpjEmitenteDaChave;

        // VALIDAÇÃO: Verifica se CNPJ é válido
        if (this.validarCNPJ(dados.cnpjEmitente)) {
          console.log('✅ CNPJ Emitente (da chave) VÁLIDO:', dados.cnpjEmitente);
        } else {
          console.warn('⚠️  CNPJ Emitente da chave INVÁLIDO:', dados.cnpjEmitente);
        }
      } else if (cnpjEmitMatch) {
        dados.cnpjEmitente = this.formatarCNPJ(cnpjEmitMatch[1]);

        // VALIDAÇÃO: Verifica se CNPJ é válido
        if (this.validarCNPJ(dados.cnpjEmitente)) {
          console.log('✅ CNPJ Emitente (do texto) VÁLIDO:', dados.cnpjEmitente);
        } else {
          console.warn('⚠️  CNPJ Emitente extraído INVÁLIDO:', dados.cnpjEmitente);
          // Tenta buscar outro CNPJ válido
          const todosCNPJs = texto.match(padroes.cnpjGeral);
          if (todosCNPJs) {
            const cnpjValido = todosCNPJs.map((c) => this.formatarCNPJ(c)).find((c) => this.validarCNPJ(c));
            if (cnpjValido) {
              dados.cnpjEmitente = cnpjValido;
              console.log('✅ CNPJ Emitente corrigido para:', cnpjValido);
            }
          }
        }
      } else {
        console.warn('⚠️  CNPJ Emitente não encontrado');
      }

      if (cnpjDestMatch) {
        const cnpjDest = this.formatarCNPJ(cnpjDestMatch[1]);

        // VALIDAÇÃO: Verifica se CNPJ destinatário é válido
        const cnpjDestValido = this.validarCNPJ(cnpjDest);

        // Verifica se não é duplicado do emitente
        if (cnpjDest === dados.cnpjEmitente) {
          console.warn('⚠️  CNPJ Destinatário igual ao emitente - buscando alternativa');
          // Busca todos CNPJs e pega um diferente E VÁLIDO
          const todosCNPJs = texto.match(padroes.cnpjGeral);
          if (todosCNPJs) {
            const cnpjsUnicos = [...new Set(todosCNPJs)].map((c) => this.formatarCNPJ(c));
            const cnpjDiferente = cnpjsUnicos.find((c) => c !== dados.cnpjEmitente && this.validarCNPJ(c));
            if (cnpjDiferente) {
              dados.cnpjDestinatario = cnpjDiferente;
              console.log('✅ CNPJ Destinatário (alternativo) VÁLIDO:', dados.cnpjDestinatario);
            } else {
              dados.cnpjDestinatario = cnpjDest;
              console.log('⚠️  CNPJ Destinatário (mesmo que emitente):', dados.cnpjDestinatario);
            }
          }
        } else if (!cnpjDestValido) {
          console.warn('⚠️  CNPJ Destinatário INVÁLIDO:', cnpjDest);
          // Busca CNPJ válido alternativo
          const todosCNPJs = texto.match(padroes.cnpjGeral);
          if (todosCNPJs) {
            const cnpjValido = [...new Set(todosCNPJs)]
              .map((c) => this.formatarCNPJ(c))
              .find((c) => c !== dados.cnpjEmitente && this.validarCNPJ(c));
            if (cnpjValido) {
              dados.cnpjDestinatario = cnpjValido;
              console.log('✅ CNPJ Destinatário corrigido para VÁLIDO:', cnpjValido);
            }
          }
        } else {
          dados.cnpjDestinatario = cnpjDest;
          console.log('✅ CNPJ Destinatário VÁLIDO:', dados.cnpjDestinatario);
        }
      } else {
        console.warn('⚠️  CNPJ Destinatário não encontrado');
      }

      // Extrai valor total com múltiplas tentativas
      let valorEncontrado = false;
      console.log(`🔍 Testando ${padroes.valorTotal.length} padrões de valor total...`);

      // DEBUG: Mostra a parte relevante do texto onde está o valor total
      const areaTotal = texto.match(/V\.\s*T\s*OT\s*AL[\s\S]{0,100}/i);
      if (areaTotal) {
        console.log("📄 Área do texto com 'V. TOTAL':", areaTotal[0].substring(0, 100));
      }

      for (let i = 0; i < padroes.valorTotal.length && !valorEncontrado; i++) {
        match = texto.match(padroes.valorTotal[i]);
        if (match) {
          dados.valorTotal = this.converterValor(match[1]);
          console.log(
            `✅ Valor total encontrado (padrão ${i + 1}):`,
            dados.valorTotal,
            `| Valor capturado: "${match[1]}"`
          );
          valorEncontrado = true;
        } else {
          console.log(`❌ Padrão ${i + 1} não encontrou match`);
        }
      }

      if (!valorEncontrado) {
        console.warn('⚠️  Valor total não encontrado no cabeçalho');
        console.log('📄 Amostra do texto para debug:', texto.substring(0, 500));
        // Última tentativa: procura o maior valor monetário no documento
        const todosValores = texto.match(/\d{1,3}(?:\.\d{3})*,\d{2}/g);
        if (todosValores && todosValores.length > 0) {
          const valoresNumericos = todosValores.map((v) => this.converterValor(v));
          const maiorValor = Math.max(...valoresNumericos);
          console.warn(`⚠️  Usando maior valor encontrado como total: R$ ${maiorValor.toFixed(2)}`);
          dados.valorTotal = maiorValor;
        }
      }

      // Extrai itens
      console.log('--- Iniciando extração de itens ---');
      dados.itens = this.extrairItensNotaFiscal(texto);
      console.log(`✅ Total de ${dados.itens.length} itens extraídos`);

      // Calcula soma dos itens para comparação
      const somaItens = dados.itens.reduce((acc, item) => acc + (item.valorTotal || 0), 0);
      console.log(`💰 Soma dos valores dos itens: R$ ${somaItens.toFixed(2)}`);

      // Se não encontrou valor total no cabeçalho, usa soma dos itens
      if (dados.valorTotal === 0 && somaItens > 0) {
        dados.valorTotal = somaItens;
        console.log('ℹ️  Valor total calculado a partir dos itens:', dados.valorTotal);
      }

      // Validação: compara valor total com soma dos itens
      if (dados.valorTotal > 0 && somaItens > 0) {
        const diferenca = Math.abs(dados.valorTotal - somaItens);
        const percentualDif = (diferenca / somaItens) * 100;

        if (diferenca > 0.01) {
          console.warn(
            `⚠️  ATENÇÃO: Diferença entre valor total (${dados.valorTotal.toFixed(
              2
            )}) e soma dos itens (${somaItens.toFixed(2)}): R$ ${diferenca.toFixed(2)} (${percentualDif.toFixed(2)}%)`
          );

          // IMPORTANTE: NÃO CORRIGIR AUTOMATICAMENTE!
          // O valor total do CABEÇALHO é a fonte de verdade (vem do XML da NF-e)
          // A diferença pode indicar que:
          // 1. Alguns itens não foram extraídos corretamente
          // 2. Há descontos/acréscimos não representados nos itens
          // 3. Erros de extração nos valores dos itens

          if (percentualDif > 50) {
            console.error(
              `❌ ERRO CRÍTICO: Diferença muito grande (${percentualDif.toFixed(2)}%)! ` +
                `Verifique a extração dos itens. Valor total mantido: ${dados.valorTotal.toFixed(2)}`
            );
          }
        } else {
          console.log('✅ Valor total confere com a soma dos itens!');
        }
      }

      console.log('=== EXTRAÇÃO CONCLUÍDA ===');
      console.log('Dados extraídos da nota fiscal:', dados);
      return dados;
    } catch (error) {
      console.error('❌ Erro ao extrair dados da nota fiscal:', error);
      return dados;
    }
  }

  /**
   * Extrai itens de um empenho (implementação aprimorada)
   * @param {string} texto - Texto do PDF
   * @returns {Array} Lista de itens
   */
  extrairItensEmpenho(texto) {
    const itens = [];

    try {
      console.log('Iniciando extração de itens do empenho...');

      // Divide o texto em linhas para análise
      const linhas = texto.split('\n');
      let dentroTabela = false;

      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        const linhaLower = linha.toLowerCase();

        // Identifica início da tabela de itens procurando por cabeçalhos
        if (
          !dentroTabela &&
          (linhaLower.includes('item') || linhaLower.includes('código')) &&
          (linhaLower.includes('descrição') || linhaLower.includes('descricao')) &&
          (linhaLower.includes('qtd') || linhaLower.includes('quant'))
        ) {
          dentroTabela = true;
          console.log(`Cabeçalho da tabela encontrado na linha ${i}: ${linha}`);

          // Tenta identificar posições das colunas baseado no cabeçalho
          this.identificarColunasTabela(linha);
          continue;
        }

        // Processa itens se estiver dentro da tabela
        if (dentroTabela && linha.length > 5) {
          // Verifica se chegou ao fim da tabela
          if (
            linhaLower.includes('total geral') ||
            linhaLower.includes('subtotal') ||
            linhaLower.includes('valor total') ||
            linhaLower.includes('observações') ||
            linhaLower.includes('observacoes')
          ) {
            console.log(`Fim da tabela detectado na linha ${i}`);
            break;
          }

          const item = this.processarLinhaItemEmpenho(linha, linhas[i + 1] || '');
          if (item && item.descricao && item.descricao.length > 3) {
            itens.push(item);
            console.log(`Item ${itens.length} extraído:`, item);
          }
        }
      }

      // Se não encontrou itens pela primeira estratégia, tenta método alternativo
      if (itens.length === 0) {
        console.log('Tentando método alternativo de extração...');
        return this.extrairItensAlternativo(texto);
      }

      console.log(`Total de ${itens.length} itens extraídos com sucesso`);
      return itens;
    } catch (error) {
      console.error('Erro ao extrair itens:', error);
      return itens;
    }
  }

  /**
   * Identifica posições das colunas na tabela
   * @param {string} cabecalho - Linha de cabeçalho
   * @returns {Object} Mapa de posições
   */
  identificarColunasTabela(cabecalho) {
    const colunas = {};
    const cabecalhoLower = cabecalho.toLowerCase();

    // Identifica palavras-chave e suas posições
    const palavrasChave = [
      'item',
      'código',
      'codigo',
      'descricao',
      'descrição',
      'unid',
      'un',
      'qtd',
      'quant',
      'quantidade',
      'vl',
      'valor',
      'unitário',
      'unitario',
      'total'
    ];

    palavrasChave.forEach((palavra) => {
      const pos = cabecalhoLower.indexOf(palavra);
      if (pos !== -1) {
        colunas[palavra] = pos;
      }
    });

    return colunas;
  }

  /**
   * Processa uma linha que pode conter dados de item de empenho
   * @param {string} linha - Linha de texto
   * @param {string} proximaLinha - Próxima linha (para descrições longas)
   * @returns {Object|null} Dados do item ou null
   */
  processarLinhaItemEmpenho(linha, proximaLinha = '') {
    try {
      // Remove espaços múltiplos e normaliza
      linha = linha.replace(/\s+/g, ' ').trim();

      // Tenta identificar padrões comuns em linhas de itens
      // Padrão 1: Item | Código | Descrição | Unidade | Qtd | Valor Unit | Valor Total
      // Padrão 2: Código Descrição Unidade Qtd ValorUnit ValorTotal

      // Separa por múltiplos espaços (2 ou mais) ou tabulações
      const partes = linha.split(/\s{2,}|\t/).filter((p) => p.trim());

      if (partes.length < 3) {
        // Tenta separação por posições fixas ou padrões específicos
        return this.extrairItemPorPadrao(linha, proximaLinha);
      }

      const item = {
        codigo: '',
        descricao: '',
        unidade: 'UN',
        quantidade: 0,
        valorUnitario: 0,
        valorTotal: 0
      };

      // Identifica cada parte
      for (let i = 0; i < partes.length; i++) {
        const parte = partes[i].trim();

        // Se começa com dígito e tem menos de 10 chars, provavelmente é código do item
        if (i === 0 && /^\d+/.test(parte) && parte.length < 10) {
          item.codigo = parte;
          continue;
        }

        // Se parece ser uma unidade de medida
        if (/^(UN|UND|UNID|KG|G|MG|L|ML|M|CM|MM|M2|M3|PCT|CX|PC|CJ|PAR|DZ|LT)$/i.test(parte)) {
          item.unidade = parte.toUpperCase();
          continue;
        }

        // Se é um número (quantidade ou valor)
        if (/^\d{1,}[,.]?\d*$/.test(parte.replace(/\./g, ''))) {
          const valor = this.converterValor(parte);

          if (item.quantidade === 0 && valor < 10000) {
            item.quantidade = valor;
          } else if (item.valorUnitario === 0) {
            item.valorUnitario = valor;
          } else if (item.valorTotal === 0) {
            item.valorTotal = valor;
          }
          continue;
        }

        // Se não é nenhum dos anteriores e tem texto, provavelmente é descrição
        if (parte.length > 3 && !item.descricao) {
          item.descricao = parte;
        } else if (parte.length > 3 && item.descricao) {
          // Adiciona à descrição existente
          item.descricao += ' ' + parte;
        }
      }

      // Limita tamanho da descrição
      if (item.descricao) {
        item.descricao = item.descricao.substring(0, 200).trim();
      }

      // Calcula valor total se não foi encontrado
      if (item.valorTotal === 0 && item.quantidade > 0 && item.valorUnitario > 0) {
        item.valorTotal = item.quantidade * item.valorUnitario;
      }

      // Valida se tem dados mínimos
      if (item.descricao && item.descricao.length > 3) {
        return item;
      }
    } catch (error) {
      console.error('Erro ao processar linha de item:', error);
    }

    return null;
  }

  /**
   * Extrai item por padrões específicos quando separação padrão falha
   * @param {string} linha - Linha de texto
   * @param {string} _proximaLinha - Próxima linha (reservado para uso futuro)
   * @returns {Object|null} Item ou null
   */
  extrairItemPorPadrao(linha, _proximaLinha) {
    try {
      // Padrão: números no início e fim da linha
      const padraoCompleto =
        /^(\d+)\s+(.+?)\s+(UN|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T)\s+(\d+[,.]?\d*)\s+(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)\s+(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)$/i;
      const match = linha.match(padraoCompleto);

      if (match) {
        return {
          codigo: match[1],
          descricao: match[2].trim(),
          unidade: match[3].toUpperCase(),
          quantidade: this.converterValor(match[4]),
          valorUnitario: this.converterValor(match[5]),
          valorTotal: this.converterValor(match[6])
        };
      }

      // Padrão alternativo: busca valores monetários e quantidade
      const valores = linha.match(/\d{1,3}(?:\.\d{3})*(?:,\d{2})/g);
      const quantidade = linha.match(/(?:^|\s)(\d{1,5})(?:\s|$)/);

      if (valores && valores.length >= 2) {
        // Extrai descrição (texto entre código e valores)
        const descricao = linha
          .replace(/^\d+\s*/, '') // Remove código do início
          .replace(/\s+(UN|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T)\s+/i, ' ') // Remove unidade
          .replace(/\d{1,3}(?:\.\d{3})*(?:,\d{2})/g, '') // Remove valores
          .replace(/\s+\d{1,5}\s+/g, ' ') // Remove quantidade
          .trim();

        if (descricao.length > 3) {
          return {
            codigo: linha.match(/^\d+/) ? linha.match(/^\d+/)[0] : '',
            descricao: descricao.substring(0, 200),
            unidade: (linha.match(
              /\b(UN|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T)\b/i
            ) || ['', 'UN'])[1],
            quantidade: quantidade ? parseFloat(quantidade[1]) : 0,
            valorUnitario: this.converterValor(valores[0]),
            valorTotal: valores.length > 1 ? this.converterValor(valores[1]) : 0
          };
        }
      }
    } catch (error) {
      console.error('Erro ao extrair item por padrão:', error);
    }

    return null;
  }

  /**
   * Método alternativo de extração quando o padrão normal falha
   * @param {string} texto - Texto completo
   * @returns {Array} Lista de itens
   */
  extrairItensAlternativo(texto) {
    const itens = [];

    try {
      // Procura por blocos que parecem itens
      // Formato alternativo: procura por linhas com valores monetários
      const linhas = texto.split('\n');

      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();

        // Se linha tem pelo menos um valor monetário (formato brasileiro)
        if (/\d{1,3}(?:\.\d{3})*,\d{2}/.test(linha) && linha.length > 20) {
          const item = this.extrairItemPorPadrao(linha, linhas[i + 1] || '');
          if (item && item.descricao && item.descricao.length > 3) {
            itens.push(item);
          }
        }
      }

      console.log(`Método alternativo encontrou ${itens.length} itens`);
    } catch (error) {
      console.error('Erro no método alternativo:', error);
    }

    return itens;
  }

  /**
   * Extrai itens de uma nota fiscal (implementação aprimorada)
   * @param {string} texto - Texto do PDF
   * @returns {Array} Lista de itens
   */
  extrairItensNotaFiscal(texto) {
    const itens = [];

    try {
      console.log('🔍 Iniciando extração de itens de nota fiscal...');
      console.log('📄 Tamanho do texto:', texto.length, 'caracteres');

      // Divide o texto em linhas para análise
      const linhas = texto.split(/\r?\n/);
      console.log('📋 Total de linhas:', linhas.length);

      let dentroTabela = false;
      let numeroItem = 0;

      // Padrões para identificar cabeçalho da tabela
      const padroesCabecalho = [
        /dados\s+dos?\s+produtos?/i,
        /produtos?\s+\/\s+servi/i,
        /descri.*produto/i,
        /(?:código|codigo).*produto.*ncm/i,
        /produto.*(?:qtd|quant).*valor/i,
        /(?:cod|c[óo]digo).*descri.*unid.*qtd/i
      ];

      // Padrões para identificar linhas que NÃO são itens (cabeçalho DANFE)
      const padroesIgnorar = [
        /recebemos\s+de/i,
        /nota\s+fiscal\s+eletr[ôo]nica/i,
        /^nf-?e\s+n/i,
        /identifica.*emitente/i,
        /identifica.*recebedor/i,
        /data\s+de\s+recebimento/i,
        /produtos?\s+e\/?ou\s+servi[çc]os/i,
        /constantes\s+da\s+nota/i,
        /^p[iI]cmsst.*b[cC]icmsst.*v[iI]cmsst/i // Linhas com informações fiscais (pIcmsSt, BcIcmsSt, vIcmsSt)
      ];

      // Padrões para identificar fim da tabela
      const padroesFim = [
        /dados\s+adicionais/i,
        /informa.*complementares/i,
        /reservado\s+ao\s+fisco/i,
        /base\s+de\s+c[áa]lculo/i,
        /valor\s+dos\s+tributos/i,
        /valor\s+aproximado/i,
        /c[áa]lculo\s+do\s+imposto/i
      ];

      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();
        const linhaLower = linha.toLowerCase();

        // Pula linhas muito curtas
        if (linha.length < 5) {
          continue;
        }

        // Ignora linhas do cabeçalho DANFE (não são itens)
        const deveIgnorar = padroesIgnorar.some((padrao) => padrao.test(linhaLower));
        if (deveIgnorar) {
          console.log(`⏭️  Ignorando linha ${i} (cabeçalho DANFE): "${linha.substring(0, 50)}..."`);
          continue;
        }

        // Identifica início da tabela de produtos
        if (!dentroTabela) {
          const encontrouCabecalho = padroesCabecalho.some((padrao) => padrao.test(linhaLower));

          if (encontrouCabecalho) {
            dentroTabela = true;
            console.log(`📋 Cabeçalho encontrado na linha ${i}: "${linha.substring(0, 60)}..."`);
            continue;
          }
        }

        // Processa itens se estiver dentro da tabela
        if (dentroTabela) {
          // Debug: mostrar TODAS as linhas sendo analisadas após o cabeçalho
          if (i >= 102 && i <= 110) {
            console.log(`   🔍 ANALISANDO linha ${i + 1}: "${linha.substring(0, 100)}"`);
          }

          // Verifica se chegou ao fim da tabela
          const encontrouFim = padroesFim.some((padrao) => padrao.test(linhaLower));

          if (encontrouFim) {
            console.log(`🛑 Fim da tabela na linha ${i}: "${linha.substring(0, 60)}..."`);
            break;
          }

          // Tenta extrair item da linha atual
          // Primeiro, verifica se a próxima linha é continuação (item quebrado)
          let linhaCompleta = linha;
          const proximaLinha = linhas[i + 1] || '';

          // Se a linha atual começa com código mas não tem NCM (8 dígitos),
          // pode ser item quebrado - tenta juntar com próximas linhas
          if (/^\d+\s+[A-Z]/.test(linha) && !/\d{8}/.test(linha)) {
            // Pula linhas fiscais intermediárias
            let offset = 1;
            while (i + offset < linhas.length && offset <= 3) {
              const linhaProx = linhas[i + offset].trim();
              // Se encontrou linha fiscal, pula
              if (/^p[iI]cmsst.*b[cC]icmsst.*v[iI]cmsst/i.test(linhaProx)) {
                offset++;
                continue;
              }
              // Se encontrou NCM (8 dígitos), junta as linhas
              if (/\d{8}/.test(linhaProx)) {
                linhaCompleta = linha + ' ' + linhaProx;
                i += offset; // Avança o índice para não processar a linha novamente
                break;
              }
              offset++;
            }
          }

          // Tenta extrair item da linha (completa ou simples)
          const item = this.processarLinhaItemNotaFiscal(linhaCompleta, proximaLinha, ++numeroItem);

          if (item && item.descricao && item.descricao.length > 2) {
            // ========== VALIDAÇÃO DE ITEM ==========
            let itemValido = true;

            // 1. Valida quantidade (deve ser > 0)
            if (item.quantidade <= 0) {
              console.warn(`⚠️  Item ${numeroItem} com quantidade INVÁLIDA: ${item.quantidade}`);
              itemValido = false;
            }

            // 2. Valida valor unitário (não deve ser negativo)
            if (item.valorUnitario < 0) {
              console.warn(`⚠️  Item ${numeroItem} com valor unitário NEGATIVO: ${item.valorUnitario}`);
              itemValido = false;
            }

            // 3. Valida valor total (não deve ser negativo)
            if (item.valorTotal < 0) {
              console.warn(`⚠️  Item ${numeroItem} com valor total NEGATIVO: ${item.valorTotal}`);
              itemValido = false;
            }

            // 4. Valida cálculo: Qtd × Vl Unit ≈ Vl Total (tolerância 1%)
            const calculado = item.quantidade * item.valorUnitario;
            const diferenca = Math.abs(calculado - item.valorTotal);
            const tolerancia = calculado * 0.01; // 1%

            if (diferenca > tolerancia && diferenca > 0.01) {
              console.warn(
                `⚠️  Item ${numeroItem}: Cálculo inconsistente | ` +
                  `Qtd(${item.quantidade}) × Unit(${
                    item.valorUnitario
                  }) = ${calculado.toFixed(2)} ≠ Total(${item.valorTotal})`
              );
              // Recalcula valor total baseado em qtd × unit
              const novoTotal = Math.round(calculado * 100) / 100;
              console.log(`🔧 Corrigindo valor total de ${item.valorTotal} para ${novoTotal}`);
              item.valorTotal = novoTotal;
            }

            // 5. Valida descrição (não deve conter apenas números ou caracteres especiais)
            if (/^[\d\s\W]+$/.test(item.descricao)) {
              console.warn(`⚠️  Item ${numeroItem} com descrição SUSPEITA: "${item.descricao}"`);
              itemValido = false;
            }

            if (itemValido) {
              itens.push(item);
              console.log(
                `  ✓ Item ${itens.length}: ${item.descricao.substring(0, 40)}... | ` +
                  `Qtd: ${item.quantidade} | Vl Unit: R$ ${(item.valorUnitario || 0).toFixed(2)} | ` +
                  `Total: R$ ${(item.valorTotal || 0).toFixed(2)}`
              );
            } else {
              console.warn(`❌ Item ${numeroItem} REJEITADO por falhas de validação`);
            }
          }
        }
      }

      // Se não encontrou itens pela primeira estratégia, tenta método alternativo
      if (itens.length === 0) {
        console.log('⚠️  Nenhum item encontrado com método padrão.');
        console.log('🔄 Tentando método alternativo (busca por valores monetários)...');
        return this.extrairItensNotaFiscalAlternativo(texto);
      }

      console.log(`✅ Total de ${itens.length} itens extraídos com sucesso`);
      return itens;
    } catch (error) {
      console.error('❌ Erro ao extrair itens:', error);
      return itens;
    }
  }

  /**
   * Processa uma linha que pode conter dados de item de nota fiscal
   * @param {string} linha - Linha de texto
   * @param {string} _proximaLinha - Próxima linha (reservado para uso futuro)
   * @param {number} numeroSequencia - Número sequencial do item
   * @returns {Object|null} Dados do item ou null
   */
  processarLinhaItemNotaFiscal(linha, _proximaLinha = '', numeroSequencia = 0) {
    try {
      // Normaliza espaços entre vírgula e zeros (ex: "0, 00" → "0,00")
      linha = linha.replace(/(\d),\s+(\d)/g, '$1,$2');

      // Remove espaços múltiplos e normaliza
      linha = linha.replace(/\s+/g, ' ').trim();

      // CRÍTICO: PDF.js às vezes remove espaços entre valores monetários
      // Transforma "2,000.229,99.459,98" → "2,000 229,99 459,98"
      // Padrão: número com vírgula seguido de PONTO e outro número (sem espaço)
      linha = linha.replace(/(\d,\d{2,5})\.(\d+(?:\.\d{3})*,\d{2})/g, '$1 $2');

      // Aplica múltiplas vezes para separar TODOS os valores grudados
      // Ex: "2,000.229,99.459,98" → "2,000 229,99.459,98" → "2,000 229,99 459,98"
      linha = linha.replace(/(\d,\d{2})\.(\d+(?:\.\d{3})*,\d{2})/g, '$1 $2');

      // Debug: mostra linha após pré-processamento
      if (numeroSequencia >= 11 && numeroSequencia <= 14) {
        console.log(`   🔧 Linha PRÉ-PROCESSADA ${numeroSequencia}: "${linha}"`);
      }

      // Padrão específico para DANFE com formato completo em uma linha
      // Formato: CODIGO DESCRICAO_QUALQUER NCM(8dígitos) CST/CSOSN(3-4dígitos) CFOP(4dígitos) UNID QUANT VL_UNIT VL_TOTAL [outros campos...]
      // A descrição pode conter unidades de medida, então usamos NCM como âncora
      // IMPORTANTE: Aceita QUALQUER COISA depois dos 3 valores (BC ICMS, VLR ICMS, etc)

      // PADRÃO 1: Quantidade com separador de milhar (5.608,0000) - NF 382 CGSM
      // IMPORTANTE: Valores unit e total podem OU NÃO ter separador de milhar
      // Aceita até 5 decimais para quantidade e valor unitário
      const padraoComMilhar =
        /^(\d+)\s+(.+?)\s+(\d{8})\s+(\d{3,4})\s+(\d{4})\s+(UN|UNI|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T|MOL|MÇ|MAÇO|MCO|RL|ROL|ROLO)\s+(\d{1,3}(?:\.\d{3})+,\d{2,5})\s+(\d+(?:\.\d{3})*,\d{2,5})\s+(\d+(?:\.\d{3})*,\d{2})/i;

      const matchComMilhar = linha.match(padraoComMilhar);

      // PADRÃO 1B: Quantidade com 4 decimais SEM separador de milhar (100,0000) - NF 382 UVA PASSAS
      const padraoQuatroDecimais =
        /^(\d+)\s+(.+?)\s+(\d{8})\s+(\d{3,4})\s+(\d{4})\s+(UN|UNI|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T|MOL|MÇ|MAÇO|MCO|RL|ROL|ROLO)\s+(\d+,\d{4})\s+(\d+(?:\.\d{3})*,\d{2,5})\s+(\d+(?:\.\d{3})*,\d{2})/i;

      const matchQuatroDecimais = linha.match(padraoQuatroDecimais);

      // PADRÃO 2: Quantidade SEM separador de milhar (2,000) - NF 9 LRM
      const padraoCompleto =
        /^(\d+)\s+(.+?)\s+(\d{8})\s+(\d{3,4})\s+(\d{4})\s+(UN|UNI|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T|MOL|MÇ|MAÇO|MCO|RL|ROL|ROLO)\s+(\d+,\d{2,5})\s+(\d+(?:\.\d{3})*,\d{2})\s+(\d+(?:\.\d{3})*,\d{2})/i;

      const matchCompleto = linha.match(padraoCompleto);

      // PADRÃO 3: Código curto (1-2 dígitos) seguido de descrição - NF 12619025 DIEGO
      // Formato: "1 BANANA PRATA 08039000 040 5102 1 kg 1,0000 4.500,0000 4.500,00"
      // Unidade pode vir como "1 kg" (número + unidade) ou apenas "kg"
      const padraoCodigoCurto =
        /^(\d{1,2})\s+(.+?)\s+(\d{8})\s+(\d{3,4})\s+(\d{4})\s+(?:\d+\s+)?(UN|UNI|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T|MOL|MÇ|MAÇO|MCO|RL|ROL|ROLO)\s+(\d+,\d{2,5})\s+(\d+(?:\.\d{3})*,\d{2,5})\s+(\d+(?:\.\d{3})*,\d{2})/i;

      const matchCodigoCurto = linha.match(padraoCodigoCurto);

      // Padrão alternativo: sem código no início OU texto grudado (ex: "CFOP6108 DESCRICAO...")
      // Formato: QUALQUER_TEXTO DESCRICAO NCM(8dígitos) CST/CSOSN(3-4dígitos) CFOP(4dígitos) UNID QUANT VL_UNIT VL_TOTAL [outros campos...]
      const padraoSemCodigo =
        /^(\w+)\s+(.+?)\s+(\d{8})\s+(\d{3,4})\s+(\d{4})\s+(UN|UNI|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T|MOL|MÇ|MAÇO|MCO|RL|ROL|ROLO)\s+(\d+,\d{2,5})\s+(\d+(?:\.\d{3})*,\d{2})\s+(\d+(?:\.\d{3})*,\d{2})/i;

      // PRIORIDADE 1: Testa padrão com separador de milhar PRIMEIRO
      if (matchComMilhar) {
        const qtd = this.converterValor(matchComMilhar[7]);
        const vlUnit = this.converterValor(matchComMilhar[8]);
        const vlTotal = this.converterValor(matchComMilhar[9]);

        console.log(
          `   📦 Item ${numeroSequencia}: ${matchComMilhar[2].trim()} | Qtd: ${qtd} | Unit: R$ ${vlUnit.toFixed(
            2
          )} | Total: R$ ${vlTotal.toFixed(2)}`
        );

        // Debug detalhado para entender por que não está capturando
        if (numeroSequencia >= 11 && numeroSequencia <= 14) {
          console.log(`   🔍 DEBUG Item ${numeroSequencia} (COM MILHAR):`, {
            codigo: matchComMilhar[1],
            descricao: matchComMilhar[2].substring(0, 30),
            ncm: matchComMilhar[3],
            unid: matchComMilhar[6],
            qtdString: matchComMilhar[7],
            qtdConvertida: qtd,
            vlUnitString: matchComMilhar[8],
            vlUnitConvertido: vlUnit,
            vlTotalString: matchComMilhar[9],
            vlTotalConvertido: vlTotal
          });
        }

        return {
          sequencia: numeroSequencia,
          codigo: matchComMilhar[1].trim(),
          descricao: matchComMilhar[2].trim(),
          ncm: matchComMilhar[3].trim(),
          csosn: matchComMilhar[4].trim(),
          cfop: matchComMilhar[5].trim(),
          unidade: matchComMilhar[6].trim(),
          quantidade: qtd,
          valorUnitario: vlUnit,
          valorTotal: vlTotal
        };
      }

      // PRIORIDADE 2: Testa padrão com 4 decimais SEM separador de milhar
      if (matchQuatroDecimais) {
        const qtd = this.converterValor(matchQuatroDecimais[7]);
        const vlUnit = this.converterValor(matchQuatroDecimais[8]);
        const vlTotal = this.converterValor(matchQuatroDecimais[9]);

        console.log(
          `   📦 Item ${numeroSequencia}: ${matchQuatroDecimais[2].trim()} | Qtd: ${qtd} | Unit: R$ ${vlUnit.toFixed(
            2
          )} | Total: R$ ${vlTotal.toFixed(2)}`
        );

        if (numeroSequencia >= 11 && numeroSequencia <= 14) {
          console.log(`   🔍 DEBUG Item ${numeroSequencia} (4 DECIMAIS):`, {
            codigo: matchQuatroDecimais[1],
            descricao: matchQuatroDecimais[2].substring(0, 30),
            ncm: matchQuatroDecimais[3],
            unid: matchQuatroDecimais[6],
            qtdString: matchQuatroDecimais[7],
            qtdConvertida: qtd,
            vlUnitString: matchQuatroDecimais[8],
            vlUnitConvertido: vlUnit,
            vlTotalString: matchQuatroDecimais[9],
            vlTotalConvertido: vlTotal
          });
        }

        return {
          sequencia: numeroSequencia,
          codigo: matchQuatroDecimais[1].trim(),
          descricao: matchQuatroDecimais[2].trim(),
          ncm: matchQuatroDecimais[3].trim(),
          csosn: matchQuatroDecimais[4].trim(),
          cfop: matchQuatroDecimais[5].trim(),
          unidade: matchQuatroDecimais[6].trim(),
          quantidade: qtd,
          valorUnitario: vlUnit,
          valorTotal: vlTotal
        };
      }

      // PRIORIDADE 3: Testa padrão com código curto (1-2 dígitos)
      if (matchCodigoCurto) {
        const qtd = this.converterValor(matchCodigoCurto[7]);
        const vlUnit = this.converterValor(matchCodigoCurto[8]);
        const vlTotal = this.converterValor(matchCodigoCurto[9]);

        console.log(
          `   📦 Item ${numeroSequencia}: ${matchCodigoCurto[2].trim()} | Qtd: ${qtd} | Unit: R$ ${vlUnit.toFixed(
            2
          )} | Total: R$ ${vlTotal.toFixed(2)}`
        );

        if (numeroSequencia >= 11 && numeroSequencia <= 14) {
          console.log(`   🔍 DEBUG Item ${numeroSequencia} (CÓDIGO CURTO):`, {
            codigo: matchCodigoCurto[1],
            descricao: matchCodigoCurto[2].substring(0, 30),
            ncm: matchCodigoCurto[3],
            unid: matchCodigoCurto[6],
            qtdString: matchCodigoCurto[7],
            qtdConvertida: qtd,
            vlUnitString: matchCodigoCurto[8],
            vlUnitConvertido: vlUnit,
            vlTotalString: matchCodigoCurto[9],
            vlTotalConvertido: vlTotal
          });
        }

        return {
          sequencia: numeroSequencia,
          codigo: matchCodigoCurto[1].trim(),
          descricao: matchCodigoCurto[2].trim(),
          ncm: matchCodigoCurto[3].trim(),
          csosn: matchCodigoCurto[4].trim(),
          cfop: matchCodigoCurto[5].trim(),
          unidade: matchCodigoCurto[6].trim(),
          quantidade: qtd,
          valorUnitario: vlUnit,
          valorTotal: vlTotal
        };
      }

      if (matchCompleto) {
        const qtd = this.converterValor(matchCompleto[7]);
        const vlUnit = this.converterValor(matchCompleto[8]);
        const vlTotal = this.converterValor(matchCompleto[9]);

        console.log(
          `   📦 Item ${numeroSequencia}: ${matchCompleto[2].trim()} | Qtd: ${qtd} | Unit: R$ ${vlUnit.toFixed(
            2
          )} | Total: R$ ${vlTotal.toFixed(2)}`
        );

        // Debug detalhado para entender por que não está capturando
        if (numeroSequencia <= 5) {
          console.log(`   🔍 DEBUG Item ${numeroSequencia}:`, {
            codigo: matchCompleto[1],
            ncm: matchCompleto[3],
            unid: matchCompleto[6],
            qtdString: matchCompleto[7],
            qtdConvertida: qtd,
            vlUnitString: matchCompleto[8],
            vlUnitConvertido: vlUnit,
            vlTotalString: matchCompleto[9],
            vlTotalConvertido: vlTotal
          });
        }

        return {
          sequencia: numeroSequencia,
          codigo: matchCompleto[1],
          descricao: matchCompleto[2].trim(),
          ncm: matchCompleto[3],
          unidade: matchCompleto[6].toUpperCase(),
          quantidade: qtd,
          valorUnitario: vlUnit,
          valorTotal: vlTotal
        };
      } else {
        // Tenta padrão alternativo SEM código inicial
        const matchSemCodigo = linha.match(padraoSemCodigo);
        if (matchSemCodigo) {
          console.log('✅ Usando padraoSemCodigo para linha:', linha);

          const qtd = parseFloat(matchSemCodigo[7].replace(/\./g, '').replace(',', '.')) || 0;
          const vlUnit = parseFloat(matchSemCodigo[8].replace(/\./g, '').replace(',', '.')) || 0;
          const vlTotal = parseFloat(matchSemCodigo[9].replace(/\./g, '').replace(',', '.')) || 0;

          console.log('Extraído SEM CÓDIGO:', {
            descricao: matchSemCodigo[2],
            quantidade: qtd,
            valorUnitario: vlUnit,
            valorTotal: vlTotal
          });

          return {
            sequencia: numeroSequencia,
            codigo: '', // Sem código neste formato
            descricao: matchSemCodigo[2].trim(),
            ncm: matchSemCodigo[3],
            unidade: matchSemCodigo[6].toUpperCase(),
            quantidade: qtd,
            valorUnitario: vlUnit,
            valorTotal: vlTotal
          };
        }
      }

      // Padrões específicos para NF-e (método original)
      // Formato típico: Código | Descrição | NCM/SH | CST | CFOP | UN | QTDE | VL UNIT | VL TOTAL | etc

      // Log: Nenhum padrão principal funcionou
      if (numeroSequencia >= 11 && numeroSequencia <= 14) {
        console.log(`   ⚠️ Item ${numeroSequencia}: NENHUM padrão matchou! Tentando fallback...`);
        console.log(`   📄 Linha completa: "${linha}"`);
      }

      // Tenta identificar valores monetários na linha (formato brasileiro)
      const valoresMonetarios = linha.match(/\d{1,3}(?:\.\d{3})*,\d{2,5}/g) || [];

      // Se não tem pelo menos 2 valores monetários, provavelmente não é linha de item
      if (valoresMonetarios.length < 2) {
        if (numeroSequencia >= 11 && numeroSequencia <= 14) {
          console.log(
            `   ❌ Item ${numeroSequencia}: Valores monetários encontrados: ${valoresMonetarios.length} (precisa >= 2)`
          );
        }
        return null;
      }

      const item = {
        sequencia: numeroSequencia,
        codigo: '',
        descricao: '',
        ncm: '',
        unidade: 'UN',
        quantidade: 0,
        valorUnitario: 0,
        valorTotal: 0
      };

      // Separa por múltiplos espaços (2 ou mais)
      const partes = linha.split(/\s{2,}/).filter((p) => p.trim());

      // Se tem muitas partes, é mais fácil identificar cada campo
      if (partes.length >= 4) {
        for (let i = 0; i < partes.length; i++) {
          const parte = partes[i].trim();

          // Código do produto (geralmente numérico ou alfanumérico curto no início)
          if (i === 0 && !item.codigo && parte.length < 20 && /^[\w.-]+$/.test(parte)) {
            item.codigo = parte;
            continue;
          }

          // Descrição (texto longo, geralmente primeira string grande)
          if (
            !item.descricao &&
            parte.length > 5 &&
            !/^\d+$/.test(parte) &&
            !this.isUnidadeMedida(parte) &&
            !/\d{1,3}(?:\.\d{3})*,\d{2}/.test(parte)
          ) {
            item.descricao = parte;
            continue;
          }

          // NCM (8 dígitos, geralmente após descrição)
          if (!item.ncm && /^\d{8}$/.test(parte.replace(/[.-]/g, ''))) {
            item.ncm = parte;
            continue;
          }

          // Unidade de medida
          if (!item.unidade || item.unidade === 'UN') {
            if (this.isUnidadeMedida(parte)) {
              item.unidade = parte.toUpperCase();
              continue;
            }
          }

          // Quantidade (número com até 5 decimais)
          if (item.quantidade === 0 && /^\d{1,}(?:[,.]\d{1,5})?$/.test(parte)) {
            const qtd = this.converterValor(parte);
            if (qtd < 100000) {
              // Quantidade razoável
              item.quantidade = qtd;
              continue;
            }
          }

          // Valor unitário (formato monetário)
          if (item.valorUnitario === 0 && /\d{1,3}(?:\.\d{3})*,\d{2,5}/.test(parte)) {
            item.valorUnitario = this.converterValor(parte);
            continue;
          }

          // Valor total (último valor monetário relevante)
          if (item.valorTotal === 0 && /\d{1,3}(?:\.\d{3})*,\d{2,5}/.test(parte)) {
            const valorPotencial = this.converterValor(parte);
            // Valor total geralmente é maior que unitário
            if (item.valorUnitario > 0 && valorPotencial >= item.valorUnitario) {
              item.valorTotal = valorPotencial;
              continue;
            } else if (item.valorUnitario === 0) {
              // Pode ser que encontramos total antes do unitário
              item.valorTotal = valorPotencial;
            }
          }
        }
      } else {
        // Método alternativo: busca por regex direto na linha
        return this.extrairItemNotaFiscalPorRegex(linha, numeroSequencia);
      }

      // Validações e cálculos finais
      if (item.valorTotal === 0 && item.quantidade > 0 && item.valorUnitario > 0) {
        item.valorTotal = parseFloat((item.quantidade * item.valorUnitario).toFixed(2));
      }

      // Valida se tem dados mínimos (descrição é obrigatória)
      if (item.descricao && item.descricao.length > 2) {
        // Limita tamanho da descrição
        item.descricao = item.descricao.substring(0, 200).trim();
        return item;
      }
    } catch (error) {
      console.error('❌ Erro ao processar linha de item NF:', error);
    }

    return null;
  }

  /**
   * Verifica se string é uma unidade de medida válida
   * @param {string} str - String para verificar
   * @returns {boolean} True se for unidade de medida
   */
  isUnidadeMedida(str) {
    const unidades = [
      'UN',
      'UND',
      'UNID',
      'PC',
      'PÇ',
      'PCT',
      'PAC',
      'KG',
      'G',
      'MG',
      'T',
      'L',
      'ML',
      'M',
      'CM',
      'MM',
      'KM',
      'M2',
      'M3',
      'CX',
      'CJ',
      'PAR',
      'DZ',
      'LT',
      'FD',
      'SC'
    ];
    return unidades.includes(str.toUpperCase());
  }

  /**
   * Extrai item por regex quando separação por espaços falha
   * @param {string} linha - Linha de texto
   * @param {number} numeroSequencia - Número do item
   * @returns {Object|null} Item ou null
   */
  extrairItemNotaFiscalPorRegex(linha, numeroSequencia) {
    try {
      // Padrão para NFS-e: ITEM QTD UNIT TOTAL DESCRIÇÃO
      // Exemplo: "1 1 310,20 310,20 IMPRESSÃO DE BACKROP..."
      const padraoNFSe = /^(\d+)\s+(\d+(?:[,.]\d+)?)\s+([\d.,]+)\s+([\d.,]+)\s+(.+)$/;
      const matchNFSe = linha.match(padraoNFSe);

      if (matchNFSe) {
        // Extrai apenas os primeiros valores (antes da descrição)
        const item = matchNFSe[1];
        const quantidade = this.converterValor(matchNFSe[2]);
        const valorUnitario = this.converterValor(matchNFSe[3]);
        const valorTotal = this.converterValor(matchNFSe[4]);
        let descricao = matchNFSe[5].trim();

        // Remove valores monetários que possam estar no final da descrição
        descricao = descricao.replace(/\s+\d{1,3}(?:\.\d{3})*,\d{2,5}$/g, '').trim();

        if (descricao.length > 3) {
          return {
            sequencia: numeroSequencia,
            codigo: item,
            descricao: descricao.substring(0, 200),
            unidade: (linha.match(
              /\b(UN|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T)\b/i
            ) || ['', 'UN'])[1],
            quantidade: quantidade,
            valorUnitario: valorUnitario,
            valorTotal: valorTotal
          };
        }
      }

      // Padrão para NF-e: geralmente tem valores monetários no final
      // Exemplo: "CODIGO DESCRICAO DO PRODUTO NCM CST CFOP UN 10,00 150,00 1.500,00"

      // Busca todos os valores monetários
      const valores = linha.match(/\d{1,3}(?:\.\d{3})*,\d{2,5}/g) || [];

      if (valores.length < 2) {
        return null;
      }

      // Último valor geralmente é o total
      const valorTotal = this.converterValor(valores[valores.length - 1]);

      // Penúltimo geralmente é o unitário
      const valorUnitario = valores.length > 1 ? this.converterValor(valores[valores.length - 2]) : 0;

      // Busca quantidade (número antes dos valores monetários)
      const quantidade = linha.match(/(?:^|\s)(\d{1,}(?:[,.]\d{1,5})?)(?=\s+\d{1,3}(?:\.\d{3})*,\d{2})/);

      // Remove valores e quantidade para isolar descrição
      let descricao = linha;
      valores.forEach((v) => {
        descricao = descricao.replace(v, '');
      });
      if (quantidade) {
        descricao = descricao.replace(quantidade[0], '');
      }

      // Remove códigos, NCM, CST, CFOP, unidades
      descricao = descricao
        .replace(/^\s*[\w.-]{1,15}\s+/, '') // Remove código do início
        .replace(/\b\d{8}\b/g, '') // Remove NCM
        .replace(/\b\d{3,4}\b/g, '') // Remove CST/CFOP
        .replace(
          /\b(UN|UNI|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T|MOL|MÇ|MAÇO|MCO|RL|ROL|ROLO)\b/gi,
          ''
        ) // Remove unidades
        .replace(/\s+/g, ' ')
        .trim();

      if (descricao.length > 3) {
        return {
          sequencia: numeroSequencia,
          codigo: '',
          descricao: descricao.substring(0, 200),
          unidade: (linha.match(
            /\b(UN|UNI|UND|UNID|KG|L|LT|M|MT|PCT|PACT|CX|PC|PÇ|CJ|PAR|DZ|DUZ|SC|GL|ML|GR|G|TON|T|MOL|MÇ|MAÇO|MCO|RL|ROL|ROLO)\b/i
          ) || ['', 'UN'])[1],
          quantidade: quantidade ? this.converterValor(quantidade[1]) : 0,
          valorUnitario: valorUnitario,
          valorTotal: valorTotal
        };
      }
    } catch (error) {
      console.error('❌ Erro ao extrair item por regex:', error);
    }

    return null;
  }

  /**
   * Método alternativo de extração de itens de NF-e
   * @param {string} texto - Texto completo
   * @returns {Array} Lista de itens
   */
  extrairItensNotaFiscalAlternativo(texto) {
    const itens = [];
    let numeroItem = 0;

    try {
      console.log('🔄 Usando método alternativo de extração...');

      const linhas = texto.split('\n');

      for (let i = 0; i < linhas.length; i++) {
        const linha = linhas[i].trim();

        // Procura linhas que tenham características de item de NF
        // Deve ter pelo menos 2 valores monetários
        const valoresMonetarios = linha.match(/\d{1,3}(?:\.\d{3})*,\d{2,5}/g) || [];

        if (valoresMonetarios.length >= 2 && linha.length > 30) {
          const item = this.extrairItemNotaFiscalPorRegex(linha, ++numeroItem);

          if (item && item.descricao && item.descricao.length > 3) {
            itens.push(item);
            console.log(`  ✓ Item ${itens.length}: ${item.descricao.substring(0, 40)}...`);
          }
        }
      }

      console.log(`📦 Método alternativo encontrou ${itens.length} itens`);
    } catch (error) {
      console.error('❌ Erro no método alternativo:', error);
    }

    return itens;
  }

  /**
   * Formata data para o padrão YYYY-MM-DD
   * @param {string} data - Data no formato DD/MM/YYYY
   * @returns {string} Data formatada
   */
  formatarData(data) {
    try {
      const partes = data.split('/');
      if (partes.length === 3) {
        const dia = partes[0].padStart(2, '0');
        const mes = partes[1].padStart(2, '0');
        const ano = partes[2];
        // Formato brasileiro: dd/mm/yyyy
        return `${dia}/${mes}/${ano}`;
      }
    } catch (error) {
      console.error('Erro ao formatar data:', error);
    }
    return '';
  }

  /**
   * Formata CNPJ para o padrão XX.XXX.XXX/XXXX-XX
   * @param {string} cnpj - CNPJ sem formatação
   * @returns {string} CNPJ formatado
   */
  formatarCNPJ(cnpj) {
    try {
      const numerosCNPJ = cnpj.replace(/\D/g, '');
      if (numerosCNPJ.length === 14) {
        return numerosCNPJ.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
      }
    } catch (error) {
      console.error('Erro ao formatar CNPJ:', error);
    }
    return cnpj;
  }

  /**
   * Converte string de valor monetário para número
   * @param {string} valor - Valor como string (ex: "1.250,50")
   * @returns {number} Valor numérico
   */
  converterValor(valor) {
    try {
      if (typeof valor === 'number') {
        return valor;
      }

      // Remove espaços e caracteres não numéricos exceto vírgula, ponto e hífen
      let valorLimpo = valor.toString().replace(/[^\d,.-]/g, '');

      // Converte vírgula decimal para ponto (padrão brasileiro para americano)
      if (valorLimpo.includes(',') && valorLimpo.includes('.')) {
        // Se tem ambos, vírgula é separador decimal
        valorLimpo = valorLimpo.replace(/\./g, '').replace(',', '.');
      } else if (valorLimpo.includes(',')) {
        valorLimpo = valorLimpo.replace(',', '.');
      }

      const numero = parseFloat(valorLimpo);
      return isNaN(numero) ? 0 : numero;
    } catch (error) {
      console.error('Erro ao converter valor:', error);
      return 0;
    }
  }

  /**
   * Formata número para valor monetário brasileiro (R$ 1.234,56)
   * @param {number} valor - Valor numérico
   * @returns {string} Valor formatado
   */
  formatarValor(valor) {
    try {
      if (typeof valor === 'string') {
        valor = parseFloat(valor);
      }
      if (isNaN(valor)) {
        return 'R$ 0,00';
      }

      return valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    } catch (error) {
      console.error('Erro ao formatar valor:', error);
      return 'R$ 0,00';
    }
  }

  /**
   * Valida se o texto extraído parece ser de uma Nota de Empenho
   * @param {string} texto - Texto extraído
   * @returns {boolean} True se parece ser uma NE
   */
  validarNotaEmpenho(texto) {
    const textoLower = texto.toLowerCase();
    const indicadores = ['nota de empenho', 'empenho', 'dotação orçamentária', 'programa de trabalho'];

    return indicadores.some((indicador) => textoLower.includes(indicador));
  }

  /**
   * Valida se o texto extraído parece ser de uma Nota Fiscal
   * @param {string} texto - Texto extraído
   * @returns {boolean} True se parece ser uma NF
   */
  validarNotaFiscal(texto) {
    const textoLower = texto.toLowerCase();
    const indicadores = ['nota fiscal', 'nf-e', 'danfe', 'chave de acesso', 'documento auxiliar'];

    return indicadores.some((indicador) => textoLower.includes(indicador));
  }

  /**
   * Extrai informações da chave de acesso NF-e (44 dígitos)
   * @param {string} chave - Chave de 44 dígitos
   * @returns {Object} Informações extraídas
   */
  extrairInfoChaveAcesso(chave) {
    if (!chave || chave.length !== 44) {
      return null;
    }

    return {
      uf: chave.substring(0, 2),
      anoMes: chave.substring(2, 6), // AAMM
      cnpj: chave.substring(6, 20), // CNPJ do emitente
      modelo: chave.substring(20, 22), // 55=NF-e, 65=NFC-e
      serie: chave.substring(22, 25),
      numero: parseInt(chave.substring(25, 34), 10).toString(),
      tipoEmissao: chave.substring(34, 35),
      codigoNumerico: chave.substring(35, 43),
      dv: chave.substring(43, 44)
    };
  }

  /**
   * Limpa os dados internos do leitor
   */
  limpar() {
    this.pdfData = null;
    this.textContent = '';
  }
}

// Instância global do leitor de PDF
window.pdfReader = new PDFReader();
