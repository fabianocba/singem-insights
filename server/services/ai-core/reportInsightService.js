'use strict';

const aiCoreService = require('./aiCoreService');

async function gerarInsight(payload = {}, context = {}) {
  return aiCoreService.generateReportInsight(payload, context);
}

module.exports = {
  gerarInsight
};
