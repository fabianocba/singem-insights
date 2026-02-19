/**
 * CATMAT Mapper - SINGEM
 * Converte dados do formato CATMAT para modelo interno
 *
 * O domínio do SINGEM não conhece detalhes do CATMAT.
 * Este mapper normaliza os dados para o formato interno.
 */

/**
 * Formato interno de material (usado pelo domínio SINGEM)
 * @typedef {Object} MaterialInterno
 * @property {string} codigo - Código único do material
 * @property {string} descricao - Descrição do material
 * @property {string} unidade - Unidade de medida (UN, KG, etc)
 * @property {string|null} codigoExterno - ID no sistema externo (CATMAT)
 * @property {string|null} fonteExterna - Nome do sistema externo
 * @property {string|null} grupo - Grupo/categoria
 * @property {string|null} classe - Classe/subcategoria
 * @property {boolean} sustentavel - Indicador de sustentabilidade
 * @property {Date} atualizadoEm - Data da última atualização
 * @property {object} metadados - Dados adicionais do sistema externo
 */

/**
 * Mapeia item CATMAT para formato interno de material
 * @param {object} catmatItem - Item no formato CATMAT
 * @returns {MaterialInterno}
 */
function toInternal(catmatItem) {
  if (!catmatItem) {
    throw new Error('Item CATMAT inválido');
  }

  const codigo = String(catmatItem.id || catmatItem.codigo || '').padStart(9, '0');

  if (!codigo || codigo === '000000000') {
    throw new Error('Código CATMAT obrigatório');
  }

  return {
    codigo,
    descricao: catmatItem.descricao || catmatItem.descricaoPadrao || '',
    unidade: normalizeUnidade(catmatItem.unidadeFornecimento || catmatItem.unidade),
    codigoExterno: catmatItem.id ? String(catmatItem.id) : null,
    fonteExterna: 'CATMAT',
    grupo: catmatItem.grupoDescricao || catmatItem.grupo || null,
    classe: catmatItem.classeDescricao || catmatItem.classe || null,
    sustentavel: Boolean(catmatItem.sustentavel),
    atualizadoEm: new Date(),
    metadados: {
      catmatId: catmatItem.id,
      catmatGrupo: catmatItem.grupo,
      catmatClasse: catmatItem.classe,
      catmatStatus: catmatItem.status,
      descricaoPadrao: catmatItem.descricaoPadrao
    }
  };
}

/**
 * Mapeia material interno para formato de banco (tabela materials)
 * @param {MaterialInterno} material - Material no formato interno
 * @returns {object} - Objeto pronto para INSERT/UPDATE
 */
function toDatabase(material) {
  return {
    codigo: material.codigo,
    descricao: material.descricao,
    unidade: material.unidade,
    catmat_id: material.metadados?.catmatId || null,
    catmat_grupo: material.grupo,
    catmat_classe: material.classe,
    catmat_padrao_desc: material.metadados?.descricaoPadrao || null,
    catmat_sustentavel: material.sustentavel,
    catmat_atualizado_em: material.atualizadoEm,
    ativo: true
  };
}

/**
 * Mapeia lote de itens CATMAT para formato interno
 * @param {object[]} catmatItems - Array de itens CATMAT
 * @returns {{materials: MaterialInterno[], errors: object[]}}
 */
function batchToInternal(catmatItems) {
  const materials = [];
  const errors = [];

  for (let i = 0; i < catmatItems.length; i++) {
    try {
      const material = toInternal(catmatItems[i]);
      materials.push(material);
    } catch (err) {
      errors.push({
        index: i,
        item: catmatItems[i],
        error: err.message
      });
    }
  }

  return { materials, errors };
}

/**
 * Normaliza unidade de medida
 * @param {string} unidade - Unidade original
 * @returns {string}
 */
function normalizeUnidade(unidade) {
  if (!unidade) {
    return 'UN';
  }

  const normalizada = String(unidade).toUpperCase().trim();

  // Mapeamento de variações comuns
  const mapa = {
    UNIDADE: 'UN',
    UND: 'UN',
    QUILOGRAMA: 'KG',
    QUILO: 'KG',
    LITRO: 'L',
    LT: 'L',
    METRO: 'M',
    MT: 'M',
    PACOTE: 'PCT',
    CAIXA: 'CX',
    FRASCO: 'FR',
    RESMA: 'RS'
  };

  return mapa[normalizada] || normalizada;
}

module.exports = {
  toInternal,
  toDatabase,
  batchToInternal,
  normalizeUnidade
};
