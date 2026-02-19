/* detectors.js
 * Detecta tipo do documento com scores: NE, NFe55, NFCe65, NFSe, Avulsa, Desconhecida
 */
(function (global) {
  // eslint-disable-next-line no-unused-vars
  const _patterns = global.refinePatterns;

  function detectType(pageTexts, logger) {
    const raw = pageTexts
      .map((p) => p.text)
      .join('\n')
      .toLowerCase();
    const scores = { NE: 0, NFe55: 0, NFCe65: 0, NFSe: 0, Avulsa: 0 };
    if (/nota\s*de\s*empenho|nota\s*empenho|processo\W|natureza\s+da\s+despesa/i.test(raw)) {
      scores.NE += 0.8;
    }
    if (/danfe|chave\s*de\s*acesso|chave\s*acesso|chaveacesso|\d{44}/i.test(raw)) {
      scores.NFe55 += 0.9;
    }
    if (/nfc[-\s]*e|cupom\s*fiscal|qr[-\s]*code|qrcode/i.test(raw)) {
      scores.NFCe65 += 0.9;
    }
    if (/nfs[-\s]*e|rps|issqn|prestador|tomador/i.test(raw)) {
      scores.NFSe += 0.9;
    }
    // avulsa: ausência de padrões
    const anyStrong = Math.max(scores.NE, scores.NFe55, scores.NFCe65, scores.NFSe);
    if (anyStrong < 0.5) {
      scores.Avulsa = 0.6;
    }
    // normalize into single best
    let best = 'Desconhecida';
    let bestScore = 0;
    for (const k of Object.keys(scores)) {
      if (scores[k] > bestScore) {
        best = k;
        bestScore = scores[k];
      }
    }
    const detectorScore = { type: best, scores };
    if (logger) {
      logger.infof('detectors', detectorScore);
    }
    return detectorScore;
  }

  const refineDetectors = { detectType };
  global.refineDetectors = refineDetectors;
  if (typeof module !== 'undefined') {
    module.exports = refineDetectors;
  }
})(this);
