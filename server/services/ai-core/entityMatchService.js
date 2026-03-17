'use strict';

const aiCoreService = require('./aiCoreService');

async function conciliarEntidade(payload = {}, context = {}) {
  return aiCoreService.matchEntity(payload, context);
}

module.exports = {
  conciliarEntidade
};
