'use strict';

const { priceIntelligenceService } = require('../price-intelligence.service');

module.exports = {
  query: (...args) => priceIntelligenceService.query(...args),
  exportQuery: (...args) => priceIntelligenceService.exportQuery(...args)
};
