const AppError = require('../utils/appError');
const catmatRepository = require('../repositories/catmat.repository');

async function search(query) {
  if (!query.q || query.q.length < 3) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Termo de busca deve ter pelo menos 3 caracteres');
  }

  const result = await catmatRepository.search(query.q, {
    limite: Math.min(Number.parseInt(query.limite, 10) || 20, 100),
    offset: Number.parseInt(query.offset, 10) || 0,
    apenasAtivos: query.ativos !== 'false',
    codigoPdm: query.codigoPdm || undefined,
    detalhar: query.detalhar === 'true'
  });

  return {
    sucesso: true,
    ...result,
    aviso: result.aviso || null,
    fonte: result.fonte || 'api_oficial_compras'
  };
}

async function stats() {
  return catmatRepository.getStats();
}

async function getByCodigo(codigo) {
  const material = await catmatRepository.findByCodigo(codigo);
  if (!material) {
    throw new AppError(404, 'NOT_FOUND', 'Material CATMAT não encontrado');
  }

  return {
    sucesso: true,
    dados: material
  };
}

module.exports = {
  search,
  stats,
  getByCodigo
};
