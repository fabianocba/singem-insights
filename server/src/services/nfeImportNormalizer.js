/**
 * Helpers puros de normalização para persistência de NF-e importada.
 */

function limparDocumento(doc) {
  if (!doc) {
    return null;
  }
  return String(doc).replace(/\D/g, '') || null;
}

function normalizarNumero(valor) {
  if (valor === null || valor === undefined) {
    return null;
  }
  const num = parseFloat(valor);
  return isNaN(num) ? null : Math.round(num * 100) / 100;
}

function normalizeImportData(dadosNfe, caminhoXml, foiPersistido) {
  return {
    // Identificação
    chaveAcesso: dadosNfe.chaveAcesso,
    versao: dadosNfe.versao,

    // Documento
    numero: dadosNfe.numero,
    serie: dadosNfe.serie,
    modelo: dadosNfe.modelo || '55',
    tipoNF: dadosNfe.tipoNF,
    tipoNFDescricao: dadosNfe.tipoNF === '0' ? 'Entrada' : dadosNfe.tipoNF === '1' ? 'Saída' : null,
    naturezaOperacao: dadosNfe.natOp,

    // Datas (normalizadas para ISO)
    dataEmissao: dadosNfe.dataEmissao,
    dataEmissaoOriginal: dadosNfe.dataEmissaoOriginal,
    dataSaidaEntrada: dadosNfe.dataSaidaEntrada,

    // Emitente
    emitente: dadosNfe.emitente
      ? {
          cnpj: limparDocumento(dadosNfe.emitente.cnpj),
          cpf: limparDocumento(dadosNfe.emitente.cpf),
          razaoSocial: dadosNfe.emitente.razaoSocial,
          nomeFantasia: dadosNfe.emitente.nomeFantasia,
          ie: dadosNfe.emitente.ie,
          crt: dadosNfe.emitente.crt,
          endereco: dadosNfe.emitente.endereco
        }
      : null,

    // Destinatário
    destinatario: dadosNfe.destinatario
      ? {
          cnpj: limparDocumento(dadosNfe.destinatario.cnpj),
          cpf: limparDocumento(dadosNfe.destinatario.cpf),
          razaoSocial: dadosNfe.destinatario.razaoSocial,
          ie: dadosNfe.destinatario.ie,
          email: dadosNfe.destinatario.email,
          endereco: dadosNfe.destinatario.endereco
        }
      : null,

    // Itens (normaliza números)
    itens: (dadosNfe.itens || []).map((item) => ({
      numero: item.numero,
      codigo: item.codigo,
      ean: item.ean,
      descricao: item.descricao,
      ncm: item.ncm,
      cfop: item.cfop,
      unidade: item.unidade,
      quantidade: normalizarNumero(item.quantidade),
      valorUnitario: normalizarNumero(item.valorUnitario),
      valorTotal: normalizarNumero(item.valorTotal),
      valorDesconto: normalizarNumero(item.valorDesconto),
      impostos: item.impostos
    })),

    // Totais
    totais: dadosNfe.totais
      ? {
          valorProdutos: normalizarNumero(dadosNfe.totais.valorProdutos),
          valorNF: normalizarNumero(dadosNfe.totais.valorNF),
          valorFrete: normalizarNumero(dadosNfe.totais.valorFrete),
          valorSeguro: normalizarNumero(dadosNfe.totais.valorSeguro),
          valorDesconto: normalizarNumero(dadosNfe.totais.valorDesconto),
          valorOutros: normalizarNumero(dadosNfe.totais.valorOutros),
          valorICMS: normalizarNumero(dadosNfe.totais.valorICMS),
          valorIPI: normalizarNumero(dadosNfe.totais.valorIPI),
          valorPIS: normalizarNumero(dadosNfe.totais.valorPIS),
          valorCOFINS: normalizarNumero(dadosNfe.totais.valorCOFINS),
          valorST: normalizarNumero(dadosNfe.totais.valorST),
          baseCalculoICMS: normalizarNumero(dadosNfe.totais.baseCalculoICMS)
        }
      : null,

    // Quantidade de itens
    quantidadeItens: (dadosNfe.itens || []).length,

    // Transporte
    transporte: dadosNfe.transporte,

    // Cobrança
    cobranca: dadosNfe.cobranca,

    // Informações adicionais
    infAdicionais: dadosNfe.infAdicionais,

    // Protocolo
    protocolo: dadosNfe.protocolo,

    // Metadados de importação
    caminhoXml,
    foiPersistido,
    dataImportacao: new Date().toISOString(),
    origem: 'UPLOAD_XML'
  };
}

module.exports = {
  normalizeImportData
};
