/* header.js
 * Extrai campos do cabeçalho (NE e NF) usando patterns e heurísticas
 */
(function (global) {
  // eslint-disable-next-line no-unused-vars
  const _patterns = global.refinePatterns;
  const normalize = global.refineNormalize;

  function extractHeader(pageTexts, logger) {
    // pageTexts: array de {page, text}
    const raw = pageTexts.map((p) => p.text).join('\n\f\n');
    const header = {};
    try {
      // procura chave 44
      const chaveMatch = raw.match(/(\d{44})/);
      if (chaveMatch) {
        header.chaveAcesso = normalize.normalizeChave44(chaveMatch[1]);
      }
      // procura CNPJ/CPF
      const cnpjMatch = raw.match(/(?:CNPJ|CPF|CGC)[:\s]*([\d.\-/\s]{8,20})/i);
      if (cnpjMatch) {
        header.cnpj = normalize.maskedCnpjCpf(cnpjMatch[1]);
        if (logger) {
          logger.anchor(raw, 0, cnpjMatch.index, cnpjMatch.index + cnpjMatch[0].length);
        }
      }
      // número
      const numMatch = raw.match(/(?:(?:N(?:°|º|º|o|\.)?[:-]?\s*)(\d{1,10}))/i);
      if (numMatch) {
        header.numero = numMatch[1];
      }
      // data
      const dateMatch = raw.match(/(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/);
      if (dateMatch) {
        header.dataEmissao = normalize.normalizeDate(dateMatch[1]);
      }
      // naturezas/processo (para NE)
      const proc = raw.match(/processo[:\s]*([\w\-/.\s\d]{5,200})/i);
      if (proc) {
        header.processo = proc[1].trim();
      }
      const nat = raw.match(/natureza da despesa[:\s]*([\w\s\d\-/.]{3,200})/i);
      if (nat) {
        header.naturezaDespesa = nat[1].trim();
      }
    } catch (e) {
      if (logger) {
        logger.error('header.extract.err', { err: e.message });
      }
    }
    return { raw: header, textRaw: raw };
  }

  const refineExtractHeader = { extractHeader };
  global.refineExtractHeader = refineExtractHeader;
  if (typeof module !== 'undefined') {
    module.exports = refineExtractHeader;
  }
})(this);
