'use strict';

const aiCoreService = require('./aiCoreService');
const { buyerIntelligenceService } = require('../buyer-intelligence.service');

async function enriquecerComprador(payload = {}, context = {}) {
  return aiCoreService.matchEntity(
    {
      entity_type: 'buyer',
      ...payload
    },
    context
  );
}

async function query(payload = {}, context = {}) {
  return buyerIntelligenceService.query(payload, context);
}

async function exportQuery(payload = {}, format = 'csv', context = {}) {
  return buyerIntelligenceService.exportQuery(payload, format, context);
}

async function lookupUasgProfiles(codes = [], context = {}) {
  return buyerIntelligenceService.lookupUasgProfiles(codes, context);
}

module.exports = {
  enriquecerComprador,
  query,
  exportQuery,
  lookupUasgProfiles
};
