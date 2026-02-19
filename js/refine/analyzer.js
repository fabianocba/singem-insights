/* analyzer.js
 * Pré-processamento, dehyphen, segmentação em cabeçalho/itens/totais
 */
(function (global) {
  // eslint-disable-next-line no-unused-vars
  const _patterns = global.refinePatterns;

  function dehyphen(text) {
    // remove hifenização de quebra de linha, ex: ALI-\nMEN-TAÇÃO -> ALIMENTAÇÃO
    return text.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2').replace(/-\s*\n\s*/g, '');
  }

  function normalizeWhitespace(text) {
    return text
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/\u00A0/g, ' ')
      .replace(/\s+$/gm, '')
      .replace(/[ \f\v]+/g, ' ')
      .replace(/\n{2,}/g, '\n');
  }

  function preprocessPages(pageMap) {
    // pageMap: [{page:1,text:'...'}]
    const out = pageMap.map((p) => ({ page: p.page, text: normalizeWhitespace(dehyphen(p.text || '')) }));
    return out;
  }

  function segmentSections(pageTexts) {
    // simples heurística: todo texto da primeira página => header; procure tabela de itens no meio; totales no final
    const headerPages = [pageTexts[0]];
    const tail = pageTexts.slice(1);
    const itemsCandidates = tail.length ? tail : pageTexts;
    const totalsCandidates = [pageTexts[pageTexts.length - 1]];
    return { headerPages, itemsCandidates, totalsCandidates };
  }

  const refineAnalyzer = { preprocessPages, segmentSections, dehyphen, normalizeWhitespace };
  global.refineAnalyzer = refineAnalyzer;
  if (typeof module !== 'undefined') {
    module.exports = refineAnalyzer;
  }
})(this);
