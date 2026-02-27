/**
 * Gerador de DANFE (Documento Auxiliar da NF-e)
 * Gera PDF do DANFE a partir dos dados do XML
 *
 * @description Utiliza PDFKit para gerar o documento
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');

class DanfeGenerator {
  constructor() {
    this.pageWidth = 595.28; // A4
    this.pageHeight = 841.89;
    this.margin = 20;
    this.fontSize = {
      title: 12,
      header: 9,
      normal: 8,
      small: 7
    };
  }

  /**
   * Gera PDF do DANFE
   * @param {Object} dadosNfe - Dados parseados da NF-e
   * @param {string} outputPath - Caminho de saída do PDF
   * @returns {Promise<string>} Caminho do arquivo gerado
   */
  async gerar(dadosNfe, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.margin
        });

        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        // Desenha o DANFE
        this._desenharCabecalho(doc, dadosNfe);
        this._desenharEmitente(doc, dadosNfe);
        this._desenharDestinatario(doc, dadosNfe);
        this._desenharItens(doc, dadosNfe);
        this._desenharTotais(doc, dadosNfe);
        this._desenharTransporte(doc, dadosNfe);
        this._desenharInformacoesAdicionais(doc, dadosNfe);

        doc.end();

        writeStream.on('finish', () => {
          resolve(outputPath);
        });

        writeStream.on('error', (err) => {
          reject(err);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Desenha cabeçalho do DANFE
   * @private
   */
  _desenharCabecalho(doc, dados) {
    const startY = this.margin;
    const boxHeight = 80;

    // Borda externa
    doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, boxHeight).stroke();

    // Título DANFE
    doc
      .fontSize(this.fontSize.title)
      .font('Helvetica-Bold')
      .text('DANFE', this.margin + 5, startY + 5);

    doc
      .fontSize(this.fontSize.small)
      .font('Helvetica')
      .text('Documento Auxiliar da', this.margin + 5, startY + 20)
      .text('Nota Fiscal Eletrônica', this.margin + 5, startY + 28);

    // Tipo de operação
    const tipoNF = dados.tipoNF === '0' ? 'ENTRADA' : 'SAÍDA';
    doc
      .fontSize(this.fontSize.header)
      .text(`${tipoNF === 'ENTRADA' ? '0' : '1'} - ${tipoNF}`, this.margin + 5, startY + 45);

    // Número e série
    doc
      .fontSize(this.fontSize.title)
      .font('Helvetica-Bold')
      .text(`Nº ${dados.numero || ''}`, 200, startY + 10)
      .text(`SÉRIE ${dados.serie || ''}`, 200, startY + 25);

    // Chave de acesso
    doc
      .fontSize(this.fontSize.small)
      .font('Helvetica')
      .text('CHAVE DE ACESSO', 350, startY + 5);

    doc
      .fontSize(this.fontSize.normal)
      .font('Helvetica-Bold')
      .text(this._formatarChaveAcesso(dados.chaveAcesso), 350, startY + 15, {
        width: 200
      });

    // Protocolo
    if (dados.protocolo) {
      doc
        .fontSize(this.fontSize.small)
        .font('Helvetica')
        .text('PROTOCOLO DE AUTORIZAÇÃO', 350, startY + 50);

      doc
        .fontSize(this.fontSize.normal)
        .text(`${dados.protocolo.numero} - ${this._formatarData(dados.protocolo.dataHora)}`, 350, startY + 60);
    }

    return startY + boxHeight + 5;
  }

  /**
   * Desenha dados do emitente
   * @private
   */
  _desenharEmitente(doc, dados) {
    const startY = 105;
    const boxHeight = 70;
    const emit = dados.emitente || {};

    // Borda
    doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, boxHeight).stroke();

    // Título
    doc
      .fontSize(this.fontSize.small)
      .font('Helvetica-Bold')
      .text('EMITENTE', this.margin + 5, startY + 3);

    // Razão Social
    doc
      .fontSize(this.fontSize.header)
      .font('Helvetica-Bold')
      .text(emit.razaoSocial || '', this.margin + 5, startY + 15);

    // Endereço
    const endereco = emit.endereco || {};
    const enderecoCompleto = [endereco.logradouro, endereco.numero, endereco.bairro, endereco.municipio, endereco.uf]
      .filter(Boolean)
      .join(', ');

    doc
      .fontSize(this.fontSize.normal)
      .font('Helvetica')
      .text(enderecoCompleto, this.margin + 5, startY + 30, { width: 300 });

    // CNPJ/IE
    doc
      .fontSize(this.fontSize.normal)
      .text(`CNPJ: ${this._formatarCNPJ(emit.cnpj)}`, 350, startY + 15)
      .text(`IE: ${emit.ie || ''}`, 350, startY + 30);

    return startY + boxHeight + 5;
  }

  /**
   * Desenha dados do destinatário
   * @private
   */
  _desenharDestinatario(doc, dados) {
    const startY = 180;
    const boxHeight = 60;
    const dest = dados.destinatario || {};

    // Borda
    doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, boxHeight).stroke();

    // Título
    doc
      .fontSize(this.fontSize.small)
      .font('Helvetica-Bold')
      .text('DESTINATÁRIO/REMETENTE', this.margin + 5, startY + 3);

    // Razão Social
    doc
      .fontSize(this.fontSize.header)
      .font('Helvetica-Bold')
      .text(dest.razaoSocial || '', this.margin + 5, startY + 15);

    // CNPJ/CPF
    const docDest = dest.cnpj ? this._formatarCNPJ(dest.cnpj) : dest.cpf || '';
    doc
      .fontSize(this.fontSize.normal)
      .font('Helvetica')
      .text(`CNPJ/CPF: ${docDest}`, this.margin + 5, startY + 30);

    // Endereço
    const endereco = dest.endereco || {};
    doc.text(`${endereco.municipio || ''} - ${endereco.uf || ''}`, this.margin + 5, startY + 42);

    // IE
    doc.text(`IE: ${dest.ie || 'ISENTO'}`, 350, startY + 30);

    return startY + boxHeight + 5;
  }

  /**
   * Desenha itens da NF-e
   * @private
   */
  _desenharItens(doc, dados) {
    const startY = 250;
    const itens = dados.itens || [];
    const headerHeight = 20;
    const lineHeight = 15;
    const maxItens = Math.min(itens.length, 20); // Limita a 20 itens por página

    // Cabeçalho da tabela
    doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, headerHeight).stroke();

    doc.fontSize(this.fontSize.small).font('Helvetica-Bold');

    const cols = [
      { label: 'CÓDIGO', x: this.margin + 5, width: 60 },
      { label: 'DESCRIÇÃO', x: 85, width: 200 },
      { label: 'UN', x: 290, width: 30 },
      { label: 'QTD', x: 325, width: 50 },
      { label: 'V.UNIT', x: 380, width: 60 },
      { label: 'V.TOTAL', x: 445, width: 60 },
      { label: 'BC ICMS', x: 510, width: 55 }
    ];

    cols.forEach((col) => {
      doc.text(col.label, col.x, startY + 5, { width: col.width });
    });

    // Linhas de itens
    let currentY = startY + headerHeight;

    doc.fontSize(this.fontSize.small).font('Helvetica');

    itens.slice(0, maxItens).forEach((item, _index) => {
      // Borda da linha
      doc.rect(this.margin, currentY, this.pageWidth - 2 * this.margin, lineHeight).stroke();

      doc.text(item.codigo || '', cols[0].x, currentY + 3, { width: cols[0].width });
      doc.text((item.descricao || '').substring(0, 35), cols[1].x, currentY + 3, { width: cols[1].width });
      doc.text(item.unidade || '', cols[2].x, currentY + 3, { width: cols[2].width });
      doc.text(this._formatarNumero(item.quantidade, 4), cols[3].x, currentY + 3, { width: cols[3].width });
      doc.text(this._formatarMoeda(item.valorUnitario), cols[4].x, currentY + 3, { width: cols[4].width });
      doc.text(this._formatarMoeda(item.valorTotal), cols[5].x, currentY + 3, { width: cols[5].width });
      doc.text(this._formatarMoeda(item.impostos?.icms?.baseCalculo || 0), cols[6].x, currentY + 3, {
        width: cols[6].width
      });

      currentY += lineHeight;
    });

    return currentY + 5;
  }

  /**
   * Desenha totais
   * @private
   */
  _desenharTotais(doc, dados) {
    const startY = 580;
    const boxHeight = 50;
    const totais = dados.totais || {};

    // Borda
    doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, boxHeight).stroke();

    // Título
    doc
      .fontSize(this.fontSize.small)
      .font('Helvetica-Bold')
      .text('CÁLCULO DO IMPOSTO', this.margin + 5, startY + 3);

    // Valores
    doc.fontSize(this.fontSize.normal).font('Helvetica');

    const colWidth = 90;
    const valores = [
      { label: 'BC ICMS', valor: totais.baseCalculoICMS },
      { label: 'ICMS', valor: totais.valorICMS },
      { label: 'BC ICMS ST', valor: totais.baseCalculoST },
      { label: 'ICMS ST', valor: totais.valorST },
      { label: 'TOTAL PROD', valor: totais.valorProdutos },
      { label: 'TOTAL NF', valor: totais.valorNF }
    ];

    valores.forEach((v, _i) => {
      const x = this.margin + 5 + _i * colWidth;
      doc.text(v.label, x, startY + 18);
      doc.font('Helvetica-Bold').text(this._formatarMoeda(v.valor), x, startY + 30);
      doc.font('Helvetica');
    });

    return startY + boxHeight + 5;
  }

  /**
   * Desenha dados de transporte
   * @private
   */
  _desenharTransporte(doc, dados) {
    const startY = 640;
    const boxHeight = 40;
    const transp = dados.transporte || {};

    // Borda
    doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, boxHeight).stroke();

    // Título
    doc
      .fontSize(this.fontSize.small)
      .font('Helvetica-Bold')
      .text('TRANSPORTADOR/VOLUMES', this.margin + 5, startY + 3);

    // Modalidade de frete
    const modalidades = {
      0: 'Por conta do emitente',
      1: 'Por conta do destinatário',
      2: 'Por conta de terceiros',
      9: 'Sem frete'
    };
    const modFrete = modalidades[transp.modalidadeFrete] || 'N/D';

    doc
      .fontSize(this.fontSize.normal)
      .font('Helvetica')
      .text(`Frete: ${modFrete}`, this.margin + 5, startY + 18);

    if (transp.transportadora) {
      doc.text(`Transportadora: ${transp.transportadora.razaoSocial || ''}`, this.margin + 150, startY + 18);
      doc.text(`CNPJ: ${this._formatarCNPJ(transp.transportadora.cnpj)}`, this.margin + 400, startY + 18);
    }

    return startY + boxHeight + 5;
  }

  /**
   * Desenha informações adicionais
   * @private
   */
  _desenharInformacoesAdicionais(doc, dados) {
    const startY = 690;
    const boxHeight = 100;
    const infAdic = dados.infAdicionais || {};

    // Borda
    doc.rect(this.margin, startY, this.pageWidth - 2 * this.margin, boxHeight).stroke();

    // Título
    doc
      .fontSize(this.fontSize.small)
      .font('Helvetica-Bold')
      .text('INFORMAÇÕES COMPLEMENTARES', this.margin + 5, startY + 3);

    // Texto
    doc
      .fontSize(this.fontSize.small)
      .font('Helvetica')
      .text(infAdic.infCpl || '', this.margin + 5, startY + 15, {
        width: this.pageWidth - 2 * this.margin - 10,
        height: boxHeight - 20
      });

    return startY + boxHeight + 5;
  }

  // ==========================================
  // HELPERS DE FORMATAÇÃO
  // ==========================================

  _formatarChaveAcesso(chave) {
    if (!chave) {
      return '';
    }
    // Formata em grupos de 4 dígitos
    return chave.match(/.{1,4}/g)?.join(' ') || chave;
  }

  _formatarCNPJ(cnpj) {
    if (!cnpj) {
      return '';
    }
    const limpo = cnpj.replace(/\D/g, '');
    if (limpo.length === 14) {
      return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return cnpj;
  }

  _formatarData(dataISO) {
    if (!dataISO) {
      return '';
    }
    try {
      const date = new Date(dataISO);
      return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR');
    } catch {
      return dataISO;
    }
  }

  _formatarMoeda(valor) {
    if (typeof valor !== 'number') {
      valor = parseFloat(valor) || 0;
    }
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  _formatarNumero(valor, casas = 2) {
    if (typeof valor !== 'number') {
      valor = parseFloat(valor) || 0;
    }
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
}

module.exports = DanfeGenerator;
