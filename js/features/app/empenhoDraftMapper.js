import * as FormatUtils from '../../core/format.js';

function mapearIdentificadoresEmpenho(empenho) {
  let cnpjDigits = empenho.cnpjDigits || '';
  if (!cnpjDigits && empenho.cnpjFornecedor) {
    cnpjDigits = FormatUtils.onlyDigits(empenho.cnpjFornecedor);
  }

  let telefoneDigits = empenho.telefoneDigits || '';
  if (!telefoneDigits && empenho.telefoneFornecedor) {
    telefoneDigits = FormatUtils.onlyDigits(empenho.telefoneFornecedor);
  }

  return { cnpjDigits, telefoneDigits };
}

function mapearValorTotalEmpenho(empenho) {
  let valorTotalEmpenho = empenho.valorTotalEmpenho;
  if (valorTotalEmpenho === undefined || valorTotalEmpenho === null) {
    valorTotalEmpenho = empenho.valorTotal || 0;
  }
  return valorTotalEmpenho;
}

function mapearItensEmpenho(itens = []) {
  return itens.map((item, idx) => ({
    seq: item.seq || idx + 1,
    descricao: item.descricao || '',
    unidade: item.unidade || 'UN',
    quantidade: item.quantidade || 0,
    valorUnitario: item.valorUnitario || 0,
    valorTotal: item.valorTotal || 0,
    subelementoCodigo: item.subelementoCodigo || item.subelemento || '',
    subelementoNome: item.subelementoNome || '',
    itemCompra: item.itemCompra || '',
    catmatCodigo: item.catmatCodigo || '',
    catmatDescricao: item.catmatDescricao || '',
    catmatFonte: item.catmatFonte || '',
    observacao: item.observacao || ''
  }));
}

export function mapearDraftEmpenho(empenho) {
  const { cnpjDigits, telefoneDigits } = mapearIdentificadoresEmpenho(empenho);
  const valorTotalEmpenho = mapearValorTotalEmpenho(empenho);
  const processoSuap = FormatUtils.migrarParaProcessoSuap(empenho);

  console.log('[EDIT] Migração:', {
    cnpjDigits,
    telefoneDigits,
    valorTotalEmpenho,
    processoSuap
  });

  return {
    header: {
      id: empenho.id,
      naturezaDespesa: empenho.naturezaDespesa || '',
      ano: empenho.ano,
      numero: empenho.numero,
      dataEmissaoISO: empenho.dataEmpenho,
      processoSuap,
      valorTotalEmpenho,
      fornecedorRazao: empenho.fornecedor || '',
      cnpjDigits,
      telefoneDigits,
      emailFornecedor: empenho.emailFornecedor || '',
      statusValidacao: empenho.statusValidacao || 'rascunho',
      validadoEm: empenho.validadoEm || null,
      validadoPor: empenho.validadoPor || null
    },
    itens: mapearItensEmpenho(empenho.itens || [])
  };
}
