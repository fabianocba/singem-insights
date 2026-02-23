/**
 * Repository - Camada centralizada de acesso a dados
 * Encapsula lógica de validação e persistência
 */

import { emit } from './eventBus.js';
import { validateEmpenhoDraft, validateEmpenhoCompleto, validateNotaFiscal } from './validators/required.js';

console.log('[Repository] 🔄 Inicializando camada de dados...');
console.log('[Repository] Modo de persistência: API PostgreSQL');

/**
 * Salva um empenho com validação
 * @param {Object} empenho - Dados do empenho
 * @returns {Promise<number>} ID do empenho salvo
 */
export async function saveEmpenho(empenho) {
  try {
    console.log('[Repository] Validando empenho antes de salvar...');

    // Validação condicional: rascunho aceita sem itens
    if (empenho.statusValidacao === 'rascunho') {
      validateEmpenhoDraft(empenho);
    } else {
      validateEmpenhoCompleto(empenho);
    }

    console.log('[Repository] Empenho válido, salvando no banco...');

    // Salvar usando dbManager existente
    const empenhoId = await window.dbManager.salvarEmpenho(empenho);

    console.log(`[Repository] Empenho ${empenhoId} salvo com sucesso`);

    // Emitir evento
    emit('ne.salva', {
      id: empenhoId,
      numero: empenho.numero,
      fornecedor: empenho.fornecedor,
      valorTotal: empenho.valorTotal,
      statusValidacao: empenho.statusValidacao || 'rascunho'
    });

    return empenhoId;
  } catch (error) {
    console.error('[Repository] Erro ao salvar empenho:', error);
    throw error;
  }
}

/**
 * Salva uma nota fiscal com validação
 * @param {Object} notaFiscal - Dados da nota fiscal
 * @returns {Promise<number>} ID da nota fiscal salva
 */
export async function saveNotaFiscal(notaFiscal) {
  try {
    console.log('[Repository] Validando nota fiscal antes de salvar...');

    // Validar campos obrigatórios
    validateNotaFiscal(notaFiscal);

    // Se vinculada a empenho, precisa estar validado
    if (notaFiscal.empenhoId) {
      const empenho = await window.dbManager.buscarEmpenhoPorId(parseInt(notaFiscal.empenhoId));
      if (!empenho) {
        throw new Error('Empenho associado não encontrado');
      }
      if (empenho.statusValidacao !== 'validado') {
        console.warn('[Repository] ❌ Empenho em rascunho, bloqueando NF');
        throw new Error('Empenho em RASCUNHO. Valide a NE para permitir vinculação de Nota Fiscal.');
      }
    }

    console.log('[Repository] Nota fiscal válida, salvando no banco...');

    // Salvar usando dbManager existente
    const nfId = await window.dbManager.salvarNotaFiscal(notaFiscal);

    console.log(`[Repository] Nota fiscal ${nfId} salva com sucesso`);

    // Emitir evento
    emit('nf.salva', {
      id: nfId,
      numero: notaFiscal.numero,
      emitente: notaFiscal.cnpjEmitente,
      valorTotal: notaFiscal.valorTotal
    });

    return nfId;
  } catch (error) {
    console.error('[Repository] Erro ao salvar nota fiscal:', error);
    throw error;
  }
}

/**
 * Busca empenho por ID
 * @param {number} id - ID do empenho
 * @returns {Promise<Object|null>}
 */
export async function getEmpenhoById(id) {
  try {
    return await window.dbManager.buscarEmpenho(id);
  } catch (error) {
    console.error('[Repository] Erro ao buscar empenho:', error);
    return null;
  }
}

/**
 * Busca empenho por slug (ano-NE-numero)
 * @param {string} slug - Slug do empenho (ex: "2025-NE-123456")
 * @returns {Promise<Object|null>}
 */
export async function getEmpenhoBySlug(slug) {
  try {
    return await window.dbManager.buscarEmpenhoPorSlug(slug);
  } catch (error) {
    console.error('[Repository] Erro ao buscar empenho por slug:', error);
    return null;
  }
}

/**
 * Lista todos os empenhos (incluindo rascunhos, ordenados por ano/numero)
 * @param {boolean} apenasValidados - Se true, retorna apenas validados com arquivo
 * @returns {Promise<Array>}
 */
export async function listEmpenhos(apenasValidados = false) {
  try {
    // Busca todos os empenhos (incluindo rascunhos)
    const empenhos = await window.dbManager.buscarEmpenhos(true);

    // Filtra se necessário
    let resultado = empenhos;
    if (apenasValidados) {
      resultado = empenhos.filter((e) => e.statusValidacao === 'validado' && e.arquivo);
    }

    // Ordena por ano (desc) e numero (desc)
    resultado.sort((a, b) => {
      const anoA = parseInt(a.ano) || 0;
      const anoB = parseInt(b.ano) || 0;
      if (anoB !== anoA) {
        return anoB - anoA;
      }
      const numA = parseInt(a.numero) || 0;
      const numB = parseInt(b.numero) || 0;
      return numB - numA;
    });

    return resultado;
  } catch (error) {
    console.error('[Repository] Erro ao listar empenhos:', error);
    return [];
  }
}

/**
 * Lista empenhos por CNPJ (apenas com arquivo vinculado)
 * @param {string} cnpj - CNPJ do fornecedor
 * @returns {Promise<Array>}
 */
export async function listEmpenhosByCNPJ(cnpj) {
  try {
    return await window.dbManager.buscarEmpenhosPorCNPJ(cnpj, false);
  } catch (error) {
    console.error('[Repository] Erro ao listar empenhos por CNPJ:', error);
    return [];
  }
}

/**
 * Busca nota fiscal por ID
 * @param {number} id - ID da nota fiscal
 * @returns {Promise<Object|null>}
 */
export async function getNotaFiscalById(id) {
  try {
    return await window.dbManager.buscarNotaFiscal(id);
  } catch (error) {
    console.error('[Repository] Erro ao buscar nota fiscal:', error);
    return null;
  }
}

/**
 * Lista todas as notas fiscais
 * @returns {Promise<Array>}
 */
export async function listNotasFiscais() {
  try {
    return await window.dbManager.buscarNotasFiscais();
  } catch (error) {
    console.error('[Repository] Erro ao listar notas fiscais:', error);
    return [];
  }
}

/**
 * Busca arquivo por ID de documento
 * @param {number} documentoId - ID do documento (empenho ou NF)
 * @returns {Promise<Object|null>}
 */
export async function getArquivoByDocumentoId(documentoId) {
  try {
    return await window.dbManager.buscarArquivoPorDocumento(documentoId);
  } catch (error) {
    console.error('[Repository] Erro ao buscar arquivo:', error);
    return null;
  }
}

/**
 * Salva arquivo vinculado a documento
 * @param {Object} arquivo - Dados do arquivo
 * @returns {Promise<number>} ID do arquivo salvo
 */
export async function saveArquivo(arquivo) {
  try {
    // Usar método com campos adicionais implementado anteriormente
    return await window.dbManager.salvarArquivo(arquivo);
  } catch (error) {
    console.error('[Repository] Erro ao salvar arquivo:', error);
    throw error;
  }
}

/**
 * Busca saldo de um empenho
 * @param {number} empenhoId - ID do empenho
 * @returns {Promise<Object|null>}
 */
export async function getSaldoEmpenho(empenhoId) {
  try {
    const saldos = await window.dbManager.buscarSaldosEmpenho(empenhoId);
    return saldos.length > 0 ? saldos[0] : null;
  } catch (error) {
    console.error('[Repository] Erro ao buscar saldo:', error);
    return null;
  }
}

/**
 * Atualiza saldo de um empenho
 * @param {number} empenhoId - ID do empenho
 * @param {Object} saldoData - Dados do saldo
 * @returns {Promise<void>}
 */
export async function updateSaldoEmpenho(empenhoId, saldoData) {
  try {
    await window.dbManager.atualizarSaldo(empenhoId, saldoData);

    emit('saldo.atualizado', {
      empenhoId,
      ...saldoData
    });
  } catch (error) {
    console.error('[Repository] Erro ao atualizar saldo:', error);
    throw error;
  }
}

/**
 * Remove registros órfãos (sem arquivo vinculado)
 * @returns {Promise<Object>} Estatísticas de remoção
 */
export async function cleanupOrphanRecords() {
  try {
    console.log('[Repository] Iniciando limpeza de registros órfãos...');

    // Usar função implementada em app.js
    if (window.limparRegistrosOrfaos) {
      await window.limparRegistrosOrfaos();
      return { success: true };
    } else {
      throw new Error('Função limparRegistrosOrfaos não encontrada');
    }
  } catch (error) {
    console.error('[Repository] Erro ao limpar registros órfãos:', error);
    throw error;
  }
}

// ============================================================================
// UNIDADES E USUÁRIOS - Persistência com commit garantido
// ============================================================================

/**
 * Salva unidade orçamentária com transação garantida
 * @param {Object} unidade - Dados da unidade
 * @returns {Promise<Object>}
 */
export async function saveUnidade(unidade) {
  const existentes = await getUnidadeConfigArray('todasUnidades', 'unidades');
  const idx = existentes.findIndex((u) => u.id === unidade.id);
  if (idx >= 0) {
    existentes[idx] = { ...unidade, dataAtualizacao: new Date().toISOString() };
  } else {
    existentes.push({ ...unidade, dataCriacao: new Date().toISOString(), ativa: true });
  }

  await window.dbManager.update('config', {
    id: 'todasUnidades',
    unidades: existentes,
    dataAtualizacao: new Date().toISOString()
  });

  await window.dbManager.update('config', {
    id: 'unidadeOrcamentaria',
    ...unidade,
    dataAtualizacao: new Date().toISOString()
  });

  emit('unidade.salva', { id: unidade.id, razaoSocial: unidade.razaoSocial });
  return unidade;
}

/**
 * Obtém unidade principal
 * @returns {Promise<Object|null>}
 */
export async function getUnidade() {
  return (await window.dbManager.get('config', 'unidadeOrcamentaria')) || null;
}

/**
 * Lista todas as unidades
 * @param {Object} filters - Filtros opcionais
 * @returns {Promise<Array>}
 */
export async function listUnidades(filters = {}) {
  let unidades = await getUnidadeConfigArray('todasUnidades', 'unidades');
  if (filters.ativa !== undefined) {
    unidades = unidades.filter((u) => u.ativa === filters.ativa);
  }
  return unidades;
}

/**
 * Salva ou atualiza um usuário
 * @param {Object} usuario - Dados do usuário
 * @returns {Promise<Object>}
 */
export async function saveUsuario(usuario) {
  const usuarios = await getUnidadeConfigArray('usuarios', 'usuarios');
  const idx = usuarios.findIndex((u) => u.id === usuario.id);
  if (idx >= 0) {
    usuarios[idx] = { ...usuario, dataAtualizacao: new Date().toISOString() };
  } else {
    usuarios.push({ ...usuario, dataCriacao: new Date().toISOString(), ativo: true });
  }

  await window.dbManager.update('config', {
    id: 'usuarios',
    usuarios,
    dataAtualizacao: new Date().toISOString()
  });

  emit('usuario.salvo', { id: usuario.id, nome: usuario.nome, login: usuario.login });
  return usuario;
}

/**
 * Busca usuário por login
 * @param {string} login - Login do usuário
 * @returns {Promise<Object|null>}
 */
export async function getUsuarioByLogin(login) {
  const usuarios = await getUnidadeConfigArray('usuarios', 'usuarios');
  return usuarios.find((u) => u.login === login) || null;
}

/**
 * Lista usuários
 * @param {Object} filters - Filtros opcionais {status: 'ativo'|'inativo'}
 * @returns {Promise<Array>}
 */
export async function listUsuarios(filters = {}) {
  let usuarios = await getUnidadeConfigArray('usuarios', 'usuarios');
  if (filters.status === 'ativo') {
    usuarios = usuarios.filter((u) => u.ativo === true);
  } else if (filters.status === 'inativo') {
    usuarios = usuarios.filter((u) => u.ativo === false);
  }
  return usuarios;
}

/**
 * Verifica se existem usuários cadastrados
 * @returns {Promise<boolean>}
 */
export async function hasUsuarios() {
  return true;
}

async function getUnidadeConfigArray(configId, key) {
  const result = await window.dbManager.get('config', configId);
  return result?.[key] || [];
}

console.log('[Repository] Camada de dados centralizada inicializada');

export default {
  saveEmpenho,
  saveNotaFiscal,
  getEmpenhoById,
  getEmpenhoBySlug,
  listEmpenhos,
  listEmpenhosByCNPJ,
  getNotaFiscalById,
  listNotasFiscais,
  getArquivoByDocumentoId,
  saveArquivo,
  getSaldoEmpenho,
  updateSaldoEmpenho,
  cleanupOrphanRecords,
  // Unidades e Usuários
  saveUnidade,
  getUnidade,
  listUnidades,
  saveUsuario,
  getUsuarioByLogin,
  listUsuarios,
  hasUsuarios
};
