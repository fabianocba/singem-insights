/**
 * Catálogo de Naturezas de Despesa e Subelementos
 * IF Baiano - Sistema de Controle de Empenhos
 *
 * Baseado na classificação da STN (Secretaria do Tesouro Nacional)
 * Portaria Conjunta STN/SOF nº 163/2001 e atualizações
 *
 * @version 1.0.0
 * @date 2026-02-03
 */

/**
 * Lista de Naturezas de Despesa disponíveis no sistema
 * Cada natureza define quais subelementos podem ser usados
 */
export const NATUREZAS = [
  { codigo: '339030', nome: 'Material de Consumo' },
  { codigo: '449052', nome: 'Equipamentos e Material Permanente' }
];

/**
 * Subelementos organizados por Natureza de Despesa
 * Chave = código da natureza (339030 ou 449052)
 * Valor = array de subelementos com código e nome
 */
export const SUBELEMENTOS = {
  339030: [
    { codigo: '01', nome: 'Combustíveis e Lubrificantes Automotivos' },
    { codigo: '02', nome: 'Combustíveis e Lubrificantes de Aviação' },
    { codigo: '03', nome: 'Combustíveis e Lubrificantes para Outras Finalidades' },
    { codigo: '04', nome: 'Gás Engarrafado' },
    { codigo: '05', nome: 'Lubrificantes de Uso Industrial' },
    { codigo: '06', nome: 'Material de Limpeza e Produtos de Higienização' },
    { codigo: '07', nome: 'Gêneros de Alimentação' },
    { codigo: '08', nome: 'Material de Expediente' },
    { codigo: '09', nome: 'Material de Copa e Cozinha' },
    { codigo: '10', nome: 'Material de Consumo de Informática' },
    { codigo: '11', nome: 'Material de Acondicionamento e Embalagem' },
    { codigo: '12', nome: 'Material Educativo e Esportivo' },
    { codigo: '13', nome: 'Material de Proteção e Segurança' },
    { codigo: '14', nome: 'Material Médico-Hospitalar, Odontológico e Laboratorial' },
    { codigo: '15', nome: 'Material Farmacológico' },
    { codigo: '16', nome: 'Material de Construção' },
    { codigo: '17', nome: 'Material Elétrico e Eletrônico' },
    { codigo: '18', nome: 'Material para Manutenção de Bens Imóveis' },
    { codigo: '19', nome: 'Material para Manutenção de Bens Móveis' },
    { codigo: '20', nome: 'Material de Processamento de Dados' },
    { codigo: '21', nome: 'Material Gráfico' },
    { codigo: '22', nome: 'Material de Cama, Mesa e Banho' },
    { codigo: '23', nome: 'Uniformes, Tecidos e Aviamentos' },
    { codigo: '24', nome: 'Material para Festividades e Homenagens' },
    { codigo: '25', nome: 'Material para Fotografia e Filmagem' },
    { codigo: '26', nome: 'Material de Sinalização Visual e Outros' },
    { codigo: '99', nome: 'Outros Materiais de Consumo' }
  ],

  449052: [
    { codigo: '01', nome: 'Aparelhos e Equipamentos de Comunicação' },
    { codigo: '02', nome: 'Aparelhos e Equipamentos de Processamento de Dados' },
    { codigo: '03', nome: 'Aparelhos e Equipamentos para Áudio, Vídeo e Foto' },
    { codigo: '04', nome: 'Aparelhos e Equipamentos de Medição e Orientação' },
    { codigo: '05', nome: 'Aparelhos e Equipamentos Médicos, Odontológicos e Hospitalares' },
    { codigo: '06', nome: 'Aparelhos e Equipamentos para Esporte e Recreação' },
    { codigo: '07', nome: 'Máquinas e Equipamentos Agrícolas' },
    { codigo: '08', nome: 'Máquinas e Equipamentos Industriais' },
    { codigo: '09', nome: 'Máquinas e Equipamentos Energéticos' },
    { codigo: '10', nome: 'Máquinas e Equipamentos Gráficos' },
    { codigo: '11', nome: 'Máquinas, Ferramentas e Utensílios de Oficina' },
    { codigo: '12', nome: 'Mobiliário em Geral' },
    { codigo: '13', nome: 'Veículos de Tração Mecânica' },
    { codigo: '14', nome: 'Veículos Diversos' },
    { codigo: '15', nome: 'Equipamentos de Proteção, Segurança e Socorro' },
    { codigo: '16', nome: 'Coleções e Materiais Bibliográficos' },
    { codigo: '17', nome: 'Semoventes e Equipamentos de Montaria' },
    { codigo: '18', nome: 'Obras de Arte e Peças para Exposição' },
    { codigo: '19', nome: 'Equipamentos para Laboratório' },
    { codigo: '20', nome: 'Outros Materiais Permanentes' }
  ]
};

/**
 * Retorna o nome da natureza pelo código
 * @param {string} codigo - Código da natureza (ex: '339030')
 * @returns {string} Nome da natureza ou string vazia
 */
export function getNaturezaNome(codigo) {
  const natureza = NATUREZAS.find((n) => n.codigo === codigo);
  return natureza ? natureza.nome : '';
}

/**
 * Retorna os subelementos disponíveis para uma natureza
 * @param {string} codigoNatureza - Código da natureza (ex: '339030')
 * @returns {Array} Array de subelementos ou array vazio
 */
export function getSubelementosPorNatureza(codigoNatureza) {
  return SUBELEMENTOS[codigoNatureza] || [];
}

/**
 * Retorna o nome do subelemento pelo código
 * @param {string} codigoNatureza - Código da natureza
 * @param {string} codigoSubelemento - Código do subelemento
 * @returns {string} Nome do subelemento ou string vazia
 */
export function getSubelementoNome(codigoNatureza, codigoSubelemento) {
  const lista = SUBELEMENTOS[codigoNatureza] || [];
  const sub = lista.find((s) => s.codigo === codigoSubelemento);
  return sub ? sub.nome : '';
}

/**
 * Gera opções HTML para select de naturezas
 * @param {string} valorSelecionado - Valor atual selecionado
 * @returns {string} HTML das opções
 */
export function gerarOpcoesNatureza(valorSelecionado = '') {
  let html = '<option value="">-- Selecione --</option>';
  NATUREZAS.forEach((nat) => {
    const selected = valorSelecionado === nat.codigo ? 'selected' : '';
    html += `<option value="${nat.codigo}" ${selected}>${nat.codigo} - ${nat.nome}</option>`;
  });
  return html;
}

/**
 * Gera opções HTML para select de subelementos
 * @param {string} codigoNatureza - Código da natureza para filtrar
 * @param {string} valorSelecionado - Valor atual selecionado
 * @returns {string} HTML das opções
 */
export function gerarOpcoesSubelemento(codigoNatureza, valorSelecionado = '') {
  if (!codigoNatureza) {
    return '<option value="">-- Selecione a Natureza primeiro --</option>';
  }

  const lista = SUBELEMENTOS[codigoNatureza] || [];
  if (lista.length === 0) {
    return '<option value="">-- Nenhum subelemento disponível --</option>';
  }

  let html = '<option value="">-- Selecione --</option>';
  lista.forEach((sub) => {
    const selected = valorSelecionado === sub.codigo ? 'selected' : '';
    html += `<option value="${sub.codigo}" ${selected}>${sub.codigo} - ${sub.nome}</option>`;
  });
  return html;
}
