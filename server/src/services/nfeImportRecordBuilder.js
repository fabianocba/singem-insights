/**
 * Monta o registro persistível de uma NF-e processada.
 * Mantém o formato esperado pelos consumidores atuais do serviço.
 */
function buildImportRecord({ chaveAcesso, dadosNfe, xmlPath, pdfPath, origem }) {
  return {
    chaveAcesso,
    numero: dadosNfe.numero,
    serie: dadosNfe.serie,
    dataEmissao: dadosNfe.dataEmissao,
    emitente: {
      cnpj: dadosNfe.emitente?.cnpj,
      razaoSocial: dadosNfe.emitente?.razaoSocial
    },
    destinatario: {
      cnpj: dadosNfe.destinatario?.cnpj,
      cpf: dadosNfe.destinatario?.cpf,
      razaoSocial: dadosNfe.destinatario?.razaoSocial
    },
    valorTotal: dadosNfe.totais?.valorNF,
    quantidadeItens: dadosNfe.itens?.length || 0,
    arquivos: {
      xml: xmlPath,
      pdf: pdfPath
    },
    dataImportacao: new Date().toISOString(),
    origem
  };
}

module.exports = {
  buildImportRecord
};
