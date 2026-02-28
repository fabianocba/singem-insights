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

async function listMateriais(filters) {
  const rows = await estoqueRepository.listMateriais({
    busca: filters.busca,
    natureza: filters.natureza,
    limite: Number.parseInt(filters.limite, 10) || 200,
    offset: Number.parseInt(filters.offset, 10) || 0
  });

  return { dados: rows };
}

async function createMaterial(data) {
  const { codigo, descricao, unidade, natureza_despesa, subelemento } = data;

  if (!descricao) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Descrição é obrigatória');
  }

  if (codigo) {
    const existente = await estoqueRepository.findMaterialByCodigo(codigo);
    if (existente) {
      throw new AppError(409, 'CONFLICT', 'Código já cadastrado');
    }
  }

  const material = await estoqueRepository.createMaterial({
    codigo: codigo || null,
    descricao,
    unidade: unidade || 'UN',
    natureza_despesa: natureza_despesa || null,
    subelemento: subelemento || null
  });

  return { dados: material };
}

async function updateMaterial(id, data) {
  const updateData = {};
  if (data.codigo !== undefined) {
    updateData.codigo = data.codigo;
  }
  if (data.descricao !== undefined) {
    updateData.descricao = data.descricao;
  }
  if (data.unidade !== undefined) {
    updateData.unidade = data.unidade;
  }
  if (data.natureza_despesa !== undefined) {
    updateData.natureza_despesa = data.natureza_despesa;
  }
  if (data.subelemento !== undefined) {
    updateData.subelemento = data.subelemento;
  }
  if (data.ativo !== undefined) {
    updateData.ativo = data.ativo;
  }

  if (Object.keys(updateData).length === 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nenhum campo para atualizar');
  }

  const material = await estoqueRepository.updateMaterial(id, updateData);
  if (!material) {
    throw new AppError(404, 'NOT_FOUND', 'Material não encontrado');
  }

  return { dados: material };
}

module.exports = {
  listSaldos,
  getSaldoByMaterial,
  listMovimentos,
  createMovimento,
  listMateriais,
  createMaterial,
  updateMaterial
};
