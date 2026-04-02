function shouldIncludeByFilters(dados = {}, filtros = {}) {
  if (filtros.cnpjEmitente && dados.emitente?.cnpj !== filtros.cnpjEmitente) {
    return false;
  }
  if (filtros.cnpjDestinatario && dados.destinatario?.cnpj !== filtros.cnpjDestinatario) {
    return false;
  }
  if (filtros.dataInicio && dados.dataEmissao < filtros.dataInicio) {
    return false;
  }
  if (filtros.dataFim && dados.dataEmissao > filtros.dataFim) {
    return false;
  }
  return true;
}

function mapToNfeSummary(dados = {}) {
  return {
    chaveAcesso: dados.chaveAcesso,
    numero: dados.numero,
    serie: dados.serie,
    dataEmissao: dados.dataEmissao,
    emitente: {
      cnpj: dados.emitente?.cnpj,
      razaoSocial: dados.emitente?.razaoSocial
    },
    destinatario: {
      cnpj: dados.destinatario?.cnpj,
      razaoSocial: dados.destinatario?.razaoSocial
    },
    valorTotal: dados.totais?.valorNF,
    quantidadeItens: dados.itens?.length || 0,
    status: dados.validacao?.status || 'OK',
    dataImportacao: dados.dataImportacao
  };
}

function sortByDataEmissaoDesc(nfes = []) {
  nfes.sort((a, b) => {
    const dataA = new Date(a.dataEmissao || 0);
    const dataB = new Date(b.dataEmissao || 0);
    return dataB - dataA;
  });
  return nfes;
}

module.exports = {
  shouldIncludeByFilters,
  mapToNfeSummary,
  sortByDataEmissaoDesc
};
