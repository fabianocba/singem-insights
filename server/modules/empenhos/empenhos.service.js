const baseEmpenhosService = require('../../src/services/empenhos.service');
const AppError = require('../../utils/appError');
const empenhosRepository = require('./empenhos.repository');

async function syncEmpenhos(operacoes, user) {
  if (!Array.isArray(operacoes)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Lista de operações é obrigatória', [
      { path: 'operacoes', message: 'Lista de operações é obrigatória', code: 'custom' }
    ]);
  }

  const resultados = [];

  for (const op of operacoes) {
    try {
      let resultado;

      switch (op.tipo) {
        case 'criar':
          resultado = await empenhosRepository.createSyncIfMissing({
            ...op.dados,
            createdBy: user.id
          });
          break;
        case 'atualizar':
          resultado = await empenhosRepository.updateSync(op.id, op.dados || {});
          break;
        case 'excluir':
          resultado = await empenhosRepository.removeSync(op.id);
          break;
        default:
          resultado = { id: op.id, status: 'operacao_desconhecida' };
      }

      resultados.push({ ...op, resultado });
    } catch (opError) {
      resultados.push({ ...op, resultado: { status: 'erro', mensagem: opError.message } });
    }
  }

  return {
    sucesso: true,
    processados: resultados.length,
    resultados
  };
}

module.exports = {
  listEmpenhos: baseEmpenhosService.listEmpenhos,
  getEmpenhoById: baseEmpenhosService.getEmpenhoById,
  getEmpenhoBySlug: baseEmpenhosService.getEmpenhoBySlug,
  createEmpenho: baseEmpenhosService.createEmpenho,
  updateEmpenho: baseEmpenhosService.updateEmpenho,
  deleteEmpenho: baseEmpenhosService.deleteEmpenho,
  syncEmpenhos
};
