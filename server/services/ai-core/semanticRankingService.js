'use strict';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function tokenize(value) {
  return normalizeText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function uniqueTokens(value) {
  return [...new Set(tokenize(value))];
}

function matchRatio(queryTokens, candidateTokens) {
  if (!Array.isArray(queryTokens) || queryTokens.length === 0) {
    return 0;
  }

  const candidateSet = new Set(candidateTokens || []);
  const matched = queryTokens.filter((token) => candidateSet.has(token)).length;
  return matched / queryTokens.length;
}

function containsAllTokens(queryTokens, candidateTokens) {
  if (!Array.isArray(queryTokens) || queryTokens.length === 0) {
    return false;
  }

  const candidateSet = new Set(candidateTokens || []);
  return queryTokens.every((token) => candidateSet.has(token));
}

function isNumericQuery(value) {
  return /^\d+$/.test(normalizeText(value));
}

function buildItemTexts(item = {}) {
  return {
    description: normalizeText(item.descricaoItem || item.descricao || item.nome || ''),
    groupText: normalizeText(item.descricaoGrupo || item.nomeGrupo || item.grupoMaterial?.descricao || ''),
    classText: normalizeText(item.descricaoClasse || item.nomeClasse || item.classeMaterial?.descricao || ''),
    pdmText: normalizeText(item.descricaoPdm || item.nomePdm || item.pdm?.descricao || ''),
    codeText: normalizeText(item.codigoItem || item.codigo || '')
  };
}

function buildTokenSignals(queryTokens, texts) {
  const descriptionTokens = uniqueTokens(texts.description);
  const pdmTokens = uniqueTokens(texts.pdmText);
  const contextTokens = uniqueTokens([texts.groupText, texts.classText].join(' '));
  const allTokens = [...new Set([...descriptionTokens, ...pdmTokens, ...contextTokens])];

  return {
    descriptionTokens,
    pdmTokens,
    contextTokens,
    descriptionCoverage: matchRatio(queryTokens, descriptionTokens),
    pdmCoverage: matchRatio(queryTokens, pdmTokens),
    contextCoverage: matchRatio(queryTokens, contextTokens),
    exactDescriptionTokens: containsAllTokens(queryTokens, descriptionTokens) ? 1 : 0,
    exactAllTokens: containsAllTokens(queryTokens, allTokens) ? 1 : 0
  };
}

function buildPhraseSignals(normalizedQuery, texts) {
  return {
    prefixScore: texts.description.startsWith(normalizedQuery) ? 1 : 0,
    exactPhraseScore: texts.description.includes(normalizedQuery) ? 1 : 0,
    pdmPhraseScore: texts.pdmText.includes(normalizedQuery) ? 1 : 0,
    contextPhraseScore: [texts.groupText, texts.classText].some((text) => text.includes(normalizedQuery)) ? 1 : 0,
    fuzzyScore: Math.max(
      diceCoefficient(normalizedQuery, texts.description),
      diceCoefficient(normalizedQuery, texts.pdmText),
      diceCoefficient(normalizedQuery, texts.groupText)
    )
  };
}

function buildPenaltySignals(queryTokens, tokens, texts) {
  return {
    descriptionLengthPenalty: Math.max(0, tokens.descriptionTokens.length - queryTokens.length - 5) * 0.008,
    genericPdmPenalty:
      texts.pdmText && tokens.pdmCoverage === 0 && tokens.descriptionCoverage < 0.5 && tokens.contextCoverage < 0.5
        ? 0.05
        : 0,
    outOfContextPenalty:
      tokens.descriptionCoverage === 0 && tokens.pdmCoverage === 0 && tokens.contextCoverage > 0 ? 0.03 : 0
  };
}

function scoreNumericMatch(normalizedQuery, codeText, descriptionCoverage) {
  const exactCodeScore = codeText === normalizedQuery ? 1 : 0;
  const codePrefixScore = exactCodeScore === 0 && codeText.startsWith(normalizedQuery) ? 1 : 0;

  return exactCodeScore * 0.92 + codePrefixScore * 0.12 + descriptionCoverage * 0.04;
}

function scoreTextMatch(tokens, phrases, penalties, codeText, normalizedQuery) {
  const codePrefixScore = codeText === normalizedQuery ? 0 : codeText.startsWith(normalizedQuery) ? 1 : 0;

  return (
    phrases.prefixScore * 0.24 +
    phrases.exactPhraseScore * 0.18 +
    tokens.exactDescriptionTokens * 0.16 +
    tokens.descriptionCoverage * 0.16 +
    tokens.exactAllTokens * 0.08 +
    tokens.pdmCoverage * 0.1 +
    phrases.pdmPhraseScore * 0.05 +
    tokens.contextCoverage * 0.05 +
    phrases.contextPhraseScore * 0.03 +
    phrases.fuzzyScore * 0.07 +
    codePrefixScore * 0.03 -
    penalties.descriptionLengthPenalty -
    penalties.genericPdmPenalty -
    penalties.outOfContextPenalty
  );
}

function diceCoefficient(left, right) {
  const a = normalizeText(left);
  const b = normalizeText(right);
  if (!a || !b) {
    return 0;
  }
  if (a === b) {
    return 1;
  }
  if (a.length < 2 || b.length < 2) {
    return 0;
  }

  const pairs = new Map();
  for (let index = 0; index < a.length - 1; index += 1) {
    const pair = a.slice(index, index + 2);
    pairs.set(pair, (pairs.get(pair) || 0) + 1);
  }

  let intersection = 0;
  for (let index = 0; index < b.length - 1; index += 1) {
    const pair = b.slice(index, index + 2);
    const count = pairs.get(pair) || 0;
    if (count > 0) {
      pairs.set(pair, count - 1);
      intersection += 1;
    }
  }

  return (2 * intersection) / (a.length + b.length - 2);
}

function scoreItem(query, item = {}) {
  const normalizedQuery = normalizeText(query);

  if (!normalizedQuery) {
    return 0;
  }

  const texts = buildItemTexts(item);
  const queryTokens = uniqueTokens(normalizedQuery);
  const tokenSignals = buildTokenSignals(queryTokens, texts);
  const phraseSignals = buildPhraseSignals(normalizedQuery, texts);
  const penaltySignals = buildPenaltySignals(queryTokens, tokenSignals, texts);

  const finalScore = isNumericQuery(normalizedQuery)
    ? scoreNumericMatch(normalizedQuery, texts.codeText, tokenSignals.descriptionCoverage)
    : scoreTextMatch(tokenSignals, phraseSignals, penaltySignals, texts.codeText, normalizedQuery);

  return Number(Math.max(0, Math.min(1.5, finalScore)).toFixed(4));
}

function rankItems(query, items = []) {
  return [...items]
    .map((item) => ({
      item,
      score: scoreItem(query, item)
    }))
    .sort((left, right) => right.score - left.score);
}

module.exports = {
  normalizeText,
  tokenize,
  scoreItem,
  rankItems
};
