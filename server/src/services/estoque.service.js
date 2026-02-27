const AppError = require('../utils/appError');
const estoqueRepository = require('../repositories/estoque.repository');

async function listSaldos(filters) {
  const rows = await estoqueRepository.listSaldos({
    busca: filters.busca,
    limite: Number.parseInt(filters.limite, 10) || 100,
    offset: Number.parseInt(filters.offset, 10) || 0
  });

  return { sucesso: true, dados: rows };
}

async function getSaldoByMaterial(materialId) {
  const saldo = await estoqueRepository.getSaldoByMaterial(materialId);
  if (!saldo) {
    return {
      sucesso: true,
      dados: { material_id: materialId, quantidade: 0, valor_total: 0 }
    };
  }

  return { sucesso: true, dados: saldo };
}

async function listMovimentos(filters) {
  const rows = await estoqueRepository.listMovimentos({
    material_id: filters.material_id,
    tipo: filters.tipo,
    data_inicio: filters.data_inicio,
    data_fim: filters.data_fim,
    limite: Number.parseInt(filters.limite, 10) || 100,
    offset: Number.parseInt(filters.offset, 10) || 0
  });

  return { sucesso: true, dados: rows };
}

async function createMovimento(data, user) {
  if (!data.material_id || !data.tipo || data.quantidade === undefined) {
    throw new AppError(400, 'VALIDATION_ERROR', 'material_id, tipo e quantidade são obrigatórios');
  }

  try {
    const movimento = await estoqueRepository.createMovimento(data, user.id);

    await estoqueRepository.insertAudit({
      usuario_id: user.id,
      usuario_nome: user.nome,
      acao: 'criar',
      entidade: 'stock_movements',
      entidade_id: movimento.id,
      dados_depois: JSON.stringify(movimento)
    });

    return { sucesso: true, dados: movimento };
  } catch (error) {
    if (error.statusCode) {
      throw new AppError(error.statusCode, error.code || 'REQUEST_ERROR', error.message, error.details);
    }
    throw error;
  }
}

module.exports = {
  listSaldos,
  getSaldoByMaterial,
  listMovimentos,
  createMovimento
};
