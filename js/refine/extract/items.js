/* items.js
 * Extrai itens via detecção de tabela ou linhas corridas
 */
(function (global) {
  const patterns = global.refinePatterns;
  const normalize = global.refineNormalize;

  function extractItems(pageTexts, logger) {
    // Simples heurística: procurar linhas que contenham quantidade e preço
    const items = [];
    const lines = pageTexts
      .map((p) => p.text)
      .join('\n')
      .split(/\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    let seq = 1;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i];
      // tentativa de detectar 'qtde' + 'unitário' + 'total'
      const numMatches = Array.from(L.matchAll(patterns.flexibleNumberRegex)).map((m) => m[1]);
      if (numMatches.length >= 2) {
        // heurística: último número é total do item, penúltimo unitário, antepenúlt qtd
        const total = normalize.parseNumber(numMatches[numMatches.length - 1]);
        const vu = normalize.parseNumber(numMatches[numMatches.length - 2]);
        let qtd = null;
        if (numMatches.length >= 3) {
          qtd = normalize.parseNumber(numMatches[numMatches.length - 3]);
        }
        const descr = L.replace(/R\$?\s*[\d.,\s]+/g, '').slice(0, 200);
        items.push({
          seq: String(seq).padStart(3, '0'),
          descricao: descr,
          un: null,
          quantidade: qtd,
          valorUnitario: vu,
          valorTotal: total,
          rawLine: L
        });
        if (logger) {
          logger.anchor(L, 0, 0, Math.min(200, L.length));
        }
        seq++;
      }
    }
    return items;
  }

  const refineExtractItems = { extractItems };
  global.refineExtractItems = refineExtractItems;
  if (typeof module !== 'undefined') {
    module.exports = refineExtractItems;
  }
})(this);
