/* patterns.js
 * Dicionário de rótulos/sinônimos e utilitários de regex tolerantes a OCR/acentos
 * Export: patterns, labelRegex, flexibleNumberRegex
 */
(function (global) {
  const foldAccents = (s = '') => s.normalize('NFD').replace(/\p{Diacritic}/gu, '');

  const commonLabelVariants = {
    numero: ['numero', 'nº', 'n.', 'nr', 'n', 'no', 'numero:', 'nº:'],
    data: ['data', 'emissao', 'data de emissao', 'data de emissão', 'dt', 'dta'],
    cnpj: ['cnpj', 'cpf', 'cgc'],
    valorTotal: ['valor total', 'v. total', 'total', 'valor da nota', 'vnf', 'v. nf', 'valor'],
    chaveAcesso: ['chave de acesso', 'chave', 'chaveacesso'],
    notaEmpenho: ['nota de empenho', 'nota empenho', 'ne'],
    nfeDANFE: ['danfe', 'nota fiscal', 'nfe', 'nf-e', 'nf e'],
    nfce: ['nfce', 'nf-ce', 'nf ce', 'cupom fiscal', 'nfc-e']
  };

  // Gera regex alternation tolerante: remove acentos and allow some OCR substitutions
  function labelRegex(label) {
    const base = foldAccents(label).replace(/\s+/g, '\\s+');
    // allow common OCR swaps: O<->0, l<->1, I<->1
    const substitutions = base
      .replace(/[oO0]/g, '[oO0]')
      .replace(/[lI1]/g, '[lI1]')
      .replace(/a/g, '[a@áàãâ]')
      .replace(/e/g, '[eéèê]')
      .replace(/i/g, '[iíìî]')
      .replace(/o/g, '[oóòôõ0]')
      .replace(/u/g, '[uúùû]');
    return new RegExp(substitutions, 'i');
  }

  function buildAltRegexFromList(list) {
    const joined = list.map((s) => foldAccents(s).replace(/\s+/g, '\\s+')).join('|');
    return new RegExp('(?:' + joined + ')', 'i');
  }

  // Number regex that tolerates BR/US variants and OCR like 1.234,56 or 1,234.56 or 1234.56
  const flexibleNumberRegex = /[R$\s]*([+-]?\d{1,3}(?:[.,\s]\d{3})*(?:[.,]\d+)?|[+-]?\d+(?:[.,]\d+)?)/g;

  // Common patterns map (lowercase keys)
  const patterns = {
    labels: commonLabelVariants,
    labelRegex,
    buildAltRegexFromList,
    flexibleNumberRegex,
    foldAccents
  };

  global.refinePatterns = patterns;
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined') {
    module.exports = patterns;
  }
})(this);
