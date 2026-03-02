/**
 * Módulo de Exportação CSV
 * Exporta dados do sistema em formato CSV
 *
 * @author Sistema de Controle de Material - IF Baiano
 * @version 1.0
 */

class CSVExporter {
  /**
   * Converte array de objetos para CSV
   * @param {Array} data - Array de objetos
   * @param {Array} columns - Colunas a serem exportadas (opcional)
   * @returns {string} Conteúdo CSV
   */
  static arrayToCSV(data, columns = null) {
    if (!data || data.length === 0) {
      return '';
    }

    // Se não especificou colunas, usa todas as chaves do primeiro objeto
    const keys = columns || Object.keys(data[0]);

    // Cabeçalho
    const header = keys.map((key) => this.escapeCSV(key)).join(';');

    // Linhas de dados
    const rows = data.map((item) => {
      return keys
        .map((key) => {
          const value = item[key];
          return this.escapeCSV(this.formatValue(value));
        })
        .join(';');
    });

    return [header, ...rows].join('\n');
  }

  /**
   * Escapa valor para CSV (lida com vírgulas, aspas, quebras de linha)
   * @param {string} value - Valor a ser escapado
   * @returns {string} Valor escapado
   */
  static escapeCSV(value) {
    if (value === null || value === undefined) {
      return '';
    }

    const stringValue = String(value);

    // Se contém ponto-e-vírgula, aspas ou quebra de linha, envolve em aspas
    if (stringValue.includes(';') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
  }

  /**
   * Formata valor para exibição
   * @param {*} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  static formatValue(value) {
    if (value === null || value === undefined) {
      return '';
    }

    // Data
    if (value instanceof Date) {
      return value.toLocaleDateString('pt-BR');
    }

    // Array
    if (Array.isArray(value)) {
      return value.join(', ');
    }

    // Objeto
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  }

  /**
   * Download do arquivo CSV
   * @param {string} csvContent - Conteúdo CSV
   * @param {string} filename - Nome do arquivo
   */
  static download(csvContent, filename = 'exportacao.csv') {
    // Adiciona BOM UTF-8 para Excel reconhecer acentuação
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  /**
   * Exporta notas fiscais
   * @param {Array} notasFiscais - Array de notas fiscais
   */
  static async exportarNotasFiscais(notasFiscais) {
    if (!notasFiscais || notasFiscais.length === 0) {
      alert('Nenhuma nota fiscal para exportar');
      return;
    }

    const dados = notasFiscais.map((nf) => ({
      'Número NF': nf.numeroNF,
      'Data Emissão': nf.dataEmissao,
      Fornecedor: nf.nomeFornecedor,
      'CNPJ Emitente': nf.cnpjEmitente,
      'Chave de Acesso': nf.chaveAcesso,
      'Valor Total': nf.valorTotal,
      'Total de Itens': nf.itens?.length || 0,
      'Empenho Associado': nf.empenhoAssociado || 'Não associado',
      'Data Cadastro': nf.dataCadastro
    }));

    const csv = this.arrayToCSV(dados);
    const filename = `notas-fiscais-${this.getDateString()}.csv`;
    this.download(csv, filename);
  }

  /**
   * Exporta empenhos
   * @param {Array} empenhos - Array de empenhos
   */
  static async exportarEmpenhos(empenhos) {
    if (!empenhos || empenhos.length === 0) {
      alert('Nenhum empenho para exportar');
      return;
    }

    const dados = empenhos.map((emp) => ({
      Número: emp.numero,
      Ano: emp.ano,
      Fornecedor: emp.fornecedor,
      CNPJ: emp.cnpj,
      'Valor Total': emp.valorTotal,
      'Total de Itens': emp.itens?.length || 0,
      Processo: emp.processo || '',
      'Data Empenho': emp.dataEmpenho || '',
      'Natureza Despesa': emp.naturezaDespesa || ''
    }));

    const csv = this.arrayToCSV(dados);
    const filename = `empenhos-${this.getDateString()}.csv`;
    this.download(csv, filename);
  }

  /**
   * Exporta itens de uma nota fiscal ou empenho
   * @param {Array} itens - Array de itens
   * @param {string} tipo - 'nf' ou 'empenho'
   */
  static async exportarItens(itens, tipo = 'itens') {
    if (!itens || itens.length === 0) {
      alert('Nenhum item para exportar');
      return;
    }

    const dados = itens.map((item, index) => ({
      Seq: item.seq || index + 1,
      Descrição: item.descricao || item.descricao_resumida || '',
      Quantidade: item.quantidade || 0,
      Unidade: item.unidade || '',
      'Valor Unitário': item.valorUnitario || 0,
      'Valor Total': item.valorTotal || 0,
      'CATMAT/CATSER': item.catmat || item.catser || ''
    }));

    const csv = this.arrayToCSV(dados);
    const filename = `${tipo}-itens-${this.getDateString()}.csv`;
    this.download(csv, filename);
  }

  /**
   * Exporta resultados de consulta (módulo Consulte Compras.gov)
   * @param {Array} resultados - Array de resultados
   * @param {string} tipoConsulta - Tipo da consulta
   */
  static async exportarConsulta(resultados, tipoConsulta) {
    if (!resultados || resultados.length === 0) {
      alert('Nenhum resultado para exportar');
      return;
    }

    const csv = this.arrayToCSV(resultados);
    const filename = `consulta-${tipoConsulta}-${this.getDateString()}.csv`;
    this.download(csv, filename);
  }

  /**
   * Retorna string de data atual (YYYY-MM-DD)
   * @returns {string}
   */
  static getDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

// Exporta para uso global
window.CSVExporter = CSVExporter;
