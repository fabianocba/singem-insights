'use strict';

const path = require('path');
const { normalizeRecord } = require('./csvHistoricalNormalizer');
const { buildLoadPlan } = require('./csvHistoricalLoadService');

function detectDomainFromFile(filePath) {
  const normalized = String(path.basename(filePath || '')).toLowerCase();
  if (normalized.includes('pncp')) {
    return 'pncp';
  }

  if (normalized.includes('contrato')) {
    return 'contratos';
  }

  if (normalized.includes('arp')) {
    return 'arp';
  }

  if (normalized.includes('fornecedor')) {
    return 'fornecedor';
  }

  return 'comprasgov';
}

function prepareCsvImport(records = [], filePath = '') {
  const normalizedRecords = records.map((record) => normalizeRecord(record));
  const domain = detectDomainFromFile(filePath);

  return {
    domain,
    records: normalizedRecords,
    loadPlan: buildLoadPlan({
      domain,
      sourceFile: filePath,
      rowCount: normalizedRecords.length
    })
  };
}

module.exports = {
  detectDomainFromFile,
  prepareCsvImport
};
