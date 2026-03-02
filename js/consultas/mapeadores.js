/**
 * mapeadores.js
 * Normaliza dados brutos das APIs do Compras.gov.br para formato padronizado
 */

/**
 * Formata data ISO para dd/mm/yyyy
 * @param {string} isoDate - Data no formato ISO ou dd/mm/yyyy
 * @returns {string} Data formatada
 */
function formatarData(isoDate) {
  if (!isoDate) {
    return '-';
  }

  // Já está em formato brasileiro
  if (isoDate.includes('/')) {
    return isoDate;
  }

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return '-';
    }

    const dia = String(date.getDate()).padStart(2, '0');
    const mes = String(date.getMonth() + 1).padStart(2, '0');
    const ano = date.getFullYear();

    return `${dia}/${mes}/${ano}`;
  } catch {
    return '-';
  }
}

/**
 * Formata valor monetário para BRL
 * @param {number|string} valor - Valor numérico
 * @returns {string} Valor formatado (ex: "R$ 1.234,56")
 */
function formatarValor(valor) {
  if (valor === null || valor === undefined || valor === '') {
    return '-';
  }

  const num = typeof valor === 'string' ? parseFloat(valor.replace(',', '.')) : valor;

  if (isNaN(num)) {
    return '-';
  }

  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

/**
 * Mapeia status numérico para texto
 * @param {number|string} status - Status (0 ou 1)
 * @returns {string} "Ativo" ou "Inativo"
 */
function mapearStatus(status) {
  const normalized = String(status ?? '')
    .trim()
    .toLowerCase();

  if (['ativo', 'active', 'true'].includes(normalized)) {
    return 'Ativo';
  }

  if (['inativo', 'inactive', 'false'].includes(normalized)) {
    return 'Inativo';
  }

  if (status === 1 || status === '1' || status === true) {
    return 'Ativo';
  }
  if (status === 0 || status === '0' || status === false) {
    return 'Inativo';
  }
  return '-';
}

/**
 * Mapeia itens de Material para formato padronizado
 * @param {Array} itens - Array de itens brutos da API
 * @returns {Array} Array normalizado
 */
export function mapearMateriais(itens = []) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens.map((item) => ({
    codigo: item.codigo || item.id || '-',
    descricao: item.descricao || item.nome || item.descricaoItem || '-',
    unidade: item.unidadeFornecimento || item.unidade || '-',
    orgao: `Grupo: ${item.grupoMaterial?.codigo || item.codigoGrupo || item.id_grupo || '-'} | Classe: ${item.classeMaterial?.codigo || item.codigoClasse || item.id_classe || '-'}`,
    status: mapearStatus(item.status),
    dataAtualizacao: formatarData(item.dataAtualizacao || item.dataInclusao),
    valor: '-',
    extras: {
      codigoGrupo: item.grupoMaterial?.codigo || item.codigoGrupo || item.id_grupo,
      descricaoGrupo: item.grupoMaterial?.descricao || item.descricaoGrupo,
      codigoClasse: item.classeMaterial?.codigo || item.codigoClasse || item.id_classe,
      descricaoClasse: item.classeMaterial?.descricao || item.descricaoClasse,
      codigoPdm: item.pdm?.codigo,
      descricaoPdm: item.pdm?.descricao,
      sustentavel: item.sustentavel ? 'Sim' : 'Não'
    }
  }));
}

/**
 * Mapeia itens de Serviço para formato padronizado
 * @param {Array} itens - Array de itens brutos da API
 * @returns {Array} Array normalizado
 */
export function mapearServicos(itens = []) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens.map((item) => ({
    codigo: item.codigo || item.id || '-',
    descricao: item.descricao || item.nome || item.descricaoItem || '-',
    unidade: item.unidadeMedida || item.unidade || '-',
    orgao: `Grupo: ${item.grupoServico?.codigo || item.codigoGrupo || item.id_grupo || '-'} | Classe: ${item.classeServico?.codigo || item.codigoClasse || item.id_classe || '-'}`,
    status: mapearStatus(item.status),
    dataAtualizacao: formatarData(item.dataAtualizacao || item.dataInclusao),
    valor: '-',
    extras: {
      codigoGrupo: item.grupoServico?.codigo || item.codigoGrupo || item.id_grupo,
      descricaoGrupo: item.grupoServico?.descricao || item.descricaoGrupo,
      codigoClasse: item.classeServico?.codigo || item.codigoClasse || item.id_classe,
      descricaoClasse: item.classeServico?.descricao || item.descricaoClasse,
      tipoServico: item.tipoServico
    }
  }));
}

/**
 * Mapeia UASG para formato padronizado
 * @param {Array} itens - Array de itens brutos da API
 * @returns {Array} Array normalizado
 */
export function mapearUASG(itens = []) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens.map((item) => ({
    codigo: item.codigo || item.codigoUasg || '-',
    descricao: item.nome || item.descricao || '-',
    unidade: item.uf || '-',
    orgao: item.orgaoVinculado?.nome || item.nomeOrgao || '-',
    status: mapearStatus(item.status),
    dataAtualizacao: formatarData(item.dataAtualizacao),
    valor: '-',
    extras: {
      municipio: item.municipio?.nome || item.municipio,
      endereco: item.endereco,
      telefone: item.telefone,
      email: item.email,
      cnpj: item.cnpj
    }
  }));
}

/**
 * Mapeia itens de ARP para formato padronizado
 * @param {Array} itens - Array de itens brutos da API
 * @returns {Array} Array normalizado
 */
export function mapearARP(itens = []) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens.map((item) => ({
    codigo: item.numeroItem || item.codigoItem || '-',
    descricao: item.descricaoItem || item.descricao || '-',
    unidade: item.unidadeMedida || '-',
    orgao: `Ata: ${item.numeroAta || '-'}/${item.anoAta || '-'} - UASG: ${item.codigoUasg || '-'}`,
    status: item.situacao || '-',
    dataAtualizacao: formatarData(item.dataPublicacao || item.dataVigenciaFim),
    valor: formatarValor(item.valorUnitario),
    extras: {
      numeroAta: item.numeroAta,
      anoAta: item.anoAta,
      fornecedor: item.fornecedor?.nome || item.razaoSocialFornecedor,
      cnpjFornecedor: item.fornecedor?.cnpj || item.cnpjFornecedor,
      quantidade: item.quantidade,
      valorTotal: formatarValor(item.valorTotal),
      dataVigenciaInicio: formatarData(item.dataVigenciaInicio),
      dataVigenciaFim: formatarData(item.dataVigenciaFim)
    }
  }));
}

/**
 * Mapeia contratações PNCP para formato padronizado
 * @param {Array} itens - Array de itens brutos da API
 * @returns {Array} Array normalizado
 */
export function mapearPNCP(itens = []) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens.map((item) => ({
    codigo: item.numeroControlePNCP || item.sequencialContratacao || '-',
    descricao: item.objetoContratacao || item.objeto || '-',
    unidade: item.uf || '-',
    orgao: item.nomeOrgao || item.orgaoEntidade?.razaoSocial || '-',
    status: item.situacaoContratacao || item.situacao || '-',
    dataAtualizacao: formatarData(item.dataPublicacaoPncp || item.dataInclusao),
    valor: formatarValor(item.valorTotalEstimado || item.valorInicial),
    extras: {
      cnpjOrgao: item.cnpjOrgao,
      modalidade: item.modalidadeContratacao,
      numeroProcesso: item.numeroProcesso,
      anoContratacao: item.anoContratacao,
      dataAbertura: formatarData(item.dataAberturaProposta),
      linkSistemaOrigem: item.linkSistemaOrigem
    }
  }));
}

/**
 * Mapeia licitações legado para formato padronizado
 * @param {Array} itens - Array de itens brutos da API
 * @returns {Array} Array normalizado
 */
export function mapearLegadoLicitacoes(itens = []) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens.map((item) => ({
    codigo: `${item.uasg || '-'}/${item.modalidade || '-'}/${item.numeroLicitacao || '-'}`,
    descricao: item.objeto || item.objetoLicitacao || '-',
    unidade: item.uf || '-',
    orgao: `UASG: ${item.uasg || '-'} - ${item.nomeOrgao || '-'}`,
    status: item.situacao || item.situacaoLicitacao || '-',
    dataAtualizacao: formatarData(item.dataPublicacao || item.dataAbertura),
    valor: formatarValor(item.valorEstimado),
    extras: {
      modalidade: item.modalidade,
      numeroLicitacao: item.numeroLicitacao,
      ano: item.ano,
      dataAbertura: formatarData(item.dataAbertura),
      dataHomologacao: formatarData(item.dataHomologacao),
      srp: item.srp ? 'Sim' : 'Não'
    }
  }));
}

/**
 * Mapeia itens de licitação legado para formato padronizado
 * @param {Array} itens - Array de itens brutos da API
 * @returns {Array} Array normalizado
 */
export function mapearLegadoItens(itens = []) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens.map((item) => ({
    codigo: item.numeroItem || item.item || '-',
    descricao: item.descricao || item.descricaoItem || '-',
    unidade: item.unidadeMedida || '-',
    orgao: `Licitação: ${item.numeroLicitacao || '-'} - UASG: ${item.uasg || '-'}`,
    status: item.situacao || '-',
    dataAtualizacao: '-',
    valor: formatarValor(item.valorUnitario || item.valorReferencia),
    extras: {
      quantidade: item.quantidade,
      valorTotal: formatarValor(item.valorTotal),
      codigoMaterial: item.codigoMaterial,
      fornecedor: item.fornecedor,
      marca: item.marca
    }
  }));
}

/**
 * Mapeia dados genéricos (fallback)
 * @param {Array} itens - Array de itens brutos
 * @returns {Array} Array normalizado
 */
export function mapearGenerico(itens = []) {
  if (!Array.isArray(itens)) {
    return [];
  }

  return itens.map((item) => ({
    codigo: item.codigo || item.id || item.numero || '-',
    descricao: item.descricao || item.nome || item.objeto || '-',
    unidade: item.unidade || item.uf || '-',
    orgao: item.orgao || item.uasg || item.fornecedor || '-',
    status: item.status || item.situacao || '-',
    dataAtualizacao: formatarData(item.dataAtualizacao || item.data),
    valor: formatarValor(item.valor || item.valorTotal),
    extras: { ...item }
  }));
}

/**
 * Seleciona mapeador adequado baseado no tipo de dataset
 * @param {string} dataset - Tipo do dataset
 * @param {Array} itens - Array de itens brutos
 * @returns {Array} Array normalizado
 */
export function mapear(dataset, itens) {
  switch (dataset) {
    case 'materiais':
      return mapearMateriais(itens);
    case 'servicos':
      return mapearServicos(itens);
    case 'uasg':
      return mapearUASG(itens);
    case 'arp':
      return mapearARP(itens);
    case 'pncp':
      return mapearPNCP(itens);
    case 'legado-licitacoes':
      return mapearLegadoLicitacoes(itens);
    case 'legado-itens':
      return mapearLegadoItens(itens);
    default:
      return mapearGenerico(itens);
  }
}
