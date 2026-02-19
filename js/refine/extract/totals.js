/* totals.js
 * Extrai totais/impostos básicos
 */
(function (global) {
  const patterns = global.refinePatterns;
  const normalize = global.refineNormalize;

  function extractTotals(pageTexts, logger) {
    const raw = pageTexts.map((p) => p.text).join('\n');
    const totals = {};
    try {
      // procurar vProd, vNF, descontos, frete
      const vprod = raw.match(/(?:valor dos produtos|v\.prod|vprod|valor dos itens)[:\s]*([\d.,\sR$]+)/i);
      const vnf = raw.match(/(?:valor total da nota|valor total|v\.nf|vnf|total)[:\s]*([\d.,\sR$]+)/i);
      const desc = raw.match(/(?:desconto|descontos)[:\s]*([\d.,\sR$]+)/i);
      const frete = raw.match(/(?:frete)[:\s]*([\d.,\sR$]+)/i);
      if (vprod) {
        totals.vProd = normalize.parseNumber(vprod[1]);
      }
      if (vnf) {
        totals.vNF = normalize.parseNumber(vnf[1]);
      }
      if (desc) {
        totals.desconto = normalize.parseNumber(desc[1]);
      }
      if (frete) {
        totals.frete = normalize.parseNumber(frete[1]);
      }
      // fallback: last number in document as total
      if (!totals.vNF) {
        const allNums = Array.from(raw.matchAll(patterns.flexibleNumberRegex)).map((m) => m[1]);
        if (allNums.length) {
          totals.vNF = normalize.parseNumber(allNums[allNums.length - 1]);
        }
      }
    } catch (e) {
      if (logger) {
        logger.error('totals.extract.err', { err: e.message });
      }
    }
    return totals;
  }

  const refineExtractTotals = { extractTotals };
  global.refineExtractTotals = refineExtractTotals;
  if (typeof module !== 'undefined') {
    module.exports = refineExtractTotals;
  }
})(this);
