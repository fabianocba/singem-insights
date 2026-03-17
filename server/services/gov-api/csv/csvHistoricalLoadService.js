'use strict';

function buildLoadPlan({ domain, sourceFile, rowCount }) {
  return {
    domain,
    sourceFile,
    rowCount: Number(rowCount || 0),
    targetTable: `staging_${String(domain || 'comprasgov').toLowerCase()}`,
    strategy: 'append-then-normalize'
  };
}

module.exports = {
  buildLoadPlan
};
