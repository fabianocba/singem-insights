/* eslint-disable max-lines */
/**
 * Gerenciador de Banco de Dados Local - IndexedDB
 * Sistema de Controle de Material - IF Baiano
 */

class DatabaseManager {
  constructor() {
    this.dbName = 'ControleMaterialDB';
    this.dbVersion = 6; // v6: adiciona slug único para empenhos (ano-NE-numero)
    this.db = null;

    // Estrutura das tabelas/stores
    this.stores = {
      empenhos: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'numero', keyPath: 'numero', unique: true },
          { name: 'cnpjFornecedor', keyPath: 'cnpjFornecedor', unique: false },
          { name: 'dataEmpenho', keyPath: 'dataEmpenho', unique: false },
          { name: 'anoNumero', keyPath: ['ano', 'numero'], unique: false },
          { name: 'statusValidacao', keyPath: 'statusValidacao', unique: false },
          { name: 'slug', keyPath: 'slug', unique: true }
        ]
      },
      entregas: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'empenhoId', keyPath: 'empenhoId', unique: false },
          { name: 'dataEntrega', keyPath: 'dataEntrega', unique: false }
        ]
      },
      notasFiscais: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'numero', keyPath: 'numero', unique: true },
          { name: 'cnpjFornecedor', keyPath: 'cnpjFornecedor', unique: false },
          { name: 'empenhoId', keyPath: 'empenhoId', unique: false },
          { name: 'chaveAcesso', keyPath: 'chaveAcesso', unique: true }
        ]
      },
      configuracoes: {
        keyPath: 'chave',
        indexes: []
      },
      config: {
        keyPath: 'id',
        indexes: []
      },
      arquivos: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'tipo', keyPath: 'tipo', unique: false },
          { name: 'ano', keyPath: 'ano', unique: false },
          { name: 'documentoId', keyPath: 'documentoId', unique: false },
          { name: 'path', keyPath: 'path', unique: false }
        ]
      },
      saldosEmpenhos: {
        keyPath: 'id',
        autoIncrement: true,
        indexes: [
          { name: 'empenhoId', keyPath: 'empenhoId', unique: false },
          { name: 'itemSequencia', keyPath: 'itemSequencia', unique: false },
          { name: 'status', keyPath: 'status', unique: false }
        ]
      },
      auditLogs: {
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'eventType', keyPath: 'eventType', unique: false },
          { name: 'username', keyPath: 'username', unique: false }
        ]
      }
    };
  }

  /**
   * Inicializa o banco de dados
   * @returns {Promise<boolean>} True se inicializado com sucesso
   */
  async init() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        console.error('IndexedDB não é suportado neste navegador');
        reject(new Error('IndexedDB não suportado'));
        return;
      }

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('Erro ao abrir banco de dados:', request.error);
        reject(request.error);
      };

      request.onsuccess = async () => {
        this.db = request.result;
        console.log('Banco de dados inicializado com sucesso');

        // Migrações pós-upgrade (camada de dados já aberta)
        try {
          await this.migrarEmpenhosV5();
          await this.migrarEmpenhosV6();
        } catch (migErr) {
          console.warn('⚠️ Migração falhou (continuando mesmo assim):', migErr);
        }

        resolve(true);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const tx = event.target.transaction;
        this.createStores(db, tx);
      };
    });
  }

  /**
   * Cria as stores (tabelas) no banco de dados
   * @param {IDBDatabase} db - Instância do banco de dados
   */
  createStores(db, upgradeTransaction) {
    Object.entries(this.stores).forEach(([storeName, config]) => {
      let store;

      if (!db.objectStoreNames.contains(storeName)) {
        store = db.createObjectStore(storeName, {
          keyPath: config.keyPath,
          autoIncrement: config.autoIncrement || false
        });
        console.log(`Store '${storeName}' criada com sucesso`);
      } else if (upgradeTransaction) {
        // Em onupgradeneeded conseguimos acessar a store existente
        store = upgradeTransaction.objectStore(storeName);
      }

      // Garante índices existentes e cria os que faltam
      if (store) {
        const existingIndexes = Array.from(store.indexNames || []);
        config.indexes.forEach((index) => {
          if (!existingIndexes.includes(index.name)) {
            store.createIndex(index.name, index.keyPath, {
              unique: index.unique || false
            });
            console.log(`Índice '${index.name}' criado em '${storeName}'`);
          }
        });
      }
    });
  }

  /**
   * Salva um empenho no banco de dados
   * @param {Object} empenho - Dados do empenho
   * @returns {Promise<number>} ID do empenho salvo
   */
  /* eslint-disable complexity */
  async salvarEmpenho(empenho) {
    // Garantir que DB está inicializado
    if (!this.db) {
      throw new Error('[DB] Banco de dados não inicializado. Chame await dbManager.init() antes.');
    }

    const anoInferido = empenho.ano || (empenho.dataEmpenho ? new Date(empenho.dataEmpenho).getFullYear() : null);
    const numeroNormalizado = empenho.numero ? String(empenho.numero).replace(/\D/g, '') : '';
    const statusValidacao = empenho.statusValidacao || 'rascunho';
    const slug = anoInferido && numeroNormalizado ? `${anoInferido}-NE-${numeroNormalizado}` : null;

    const empenhoData = {
      ...empenho,
      numero: numeroNormalizado,
      ano: anoInferido,
      slug,
      dataEmpenho: empenho.dataEmpenho,
      fornecedor: empenho.fornecedor,
      cnpjFornecedor: empenho.cnpjFornecedor,
      valorTotal: parseFloat(empenho.valorTotal) || 0,
      itens: (empenho.itens || []).map((item) => ({
        ...item,
        catmatCodigo: item.catmatCodigo || '',
        catmatDescricao: item.catmatDescricao || '',
        catmatFonte: item.catmatFonte || null
      })),
      pdfData: empenho.pdfData || null,
      statusValidacao,
      validadoEm: empenho.validadoEm || null,
      validadoPor: empenho.validadoPor || null,
      status: 'ativo',
      dataCriacao: empenho.dataCriacao || new Date().toISOString(),
      dataAtualizacao: new Date().toISOString()
    };

    // Upsert por slug (sem alterar keyPath numérico existente)
    if (slug) {
      const existente = await this.buscarEmpenhoPorSlug(slug);
      if (existente && existente.id) {
        empenhoData.id = existente.id;
        return this.update('empenhos', empenhoData);
      }
    }

    return this.add('empenhos', empenhoData);
  }
  /* eslint-enable complexity */

  /**
   * Busca empenho pelo slug único (ano-NE-numero)
   * @param {string} slug - Slug do empenho (ex: "2024-NE-123456")
   * @returns {Promise<Object|null>} Empenho encontrado ou null
   */
  async buscarEmpenhoPorSlug(slug) {
    if (!slug) {
      return null;
    }
    try {
      const resultados = await this.getByIndex('empenhos', 'slug', slug);
      // getByIndex retorna array, pegamos o primeiro
      return Array.isArray(resultados) ? resultados[0] || null : resultados;
    } catch (error) {
      console.warn('[DB] Erro ao buscar por slug (índice pode não existir):', error.message);
      return null;
    }
  }

  async atualizarEmpenho(empenho) {
    return this.update('empenhos', empenho);
  }

  /**
   * Salva uma entrega no banco de dados
   * @param {Object} entrega - Dados da entrega
   * @returns {Promise<number>} ID da entrega salva
   */
  async salvarEntrega(entrega) {
    const entregaData = {
      empenhoId: parseInt(entrega.empenhoId),
      dataEntrega: entrega.dataEntrega,
      itensRecebidos: entrega.itensRecebidos || [],
      observacoes: entrega.observacoes || '',
      status: 'recebido',
      dataCriacao: new Date().toISOString()
    };

    return this.add('entregas', entregaData);
  }

  /**
   * Salva uma nota fiscal no banco de dados
   * @param {Object} notaFiscal - Dados da nota fiscal
   * @returns {Promise<number>} ID da nota fiscal salva
   */
  async salvarNotaFiscal(notaFiscal) {
    // Normaliza CNPJ: aceita cnpjFornecedor OU cnpjEmitente (fallback)
    const cnpjNormalizado = (notaFiscal.cnpjFornecedor || notaFiscal.cnpjEmitente || '').replace(/\D/g, '');

    const notaFiscalData = {
      numero: notaFiscal.numero,
      dataNotaFiscal: notaFiscal.dataNotaFiscal,
      cnpjFornecedor: cnpjNormalizado, // Campo canônico para comparação com empenho
      chaveAcesso: notaFiscal.chaveAcesso || null,
      empenhoId: notaFiscal.empenhoId ? parseInt(notaFiscal.empenhoId) : null,
      itens: notaFiscal.itens || [],
      valorTotal: parseFloat(notaFiscal.valorTotal) || 0,
      divergencias: notaFiscal.divergencias || [],
      pdfData: notaFiscal.pdfData || null,
      status: notaFiscal.status || 'ativa',
      // Campos extras para referência (opcionais)
      serie: notaFiscal.serie || null,
      razaoSocialEmitente: notaFiscal.razaoSocialEmitente || null,
      cnpjDestinatario: (notaFiscal.cnpjDestinatario || '').replace(/\D/g, '') || null,
      razaoSocialDestinatario: notaFiscal.razaoSocialDestinatario || null,
      empenhoNumero: notaFiscal.empenhoNumero || null,
      empenhoAno: notaFiscal.empenhoAno || null,
      dataCriacao: notaFiscal.dataCriacao || new Date().toISOString(),
      dataAtualizacao: new Date().toISOString()
    };

    return this.add('notasFiscais', notaFiscalData);
  }

  /**
   * Busca todos os empenhos
   * @returns {Promise<Array>} Lista de empenhos
   */
  /**
   * Busca todos os empenhos ATIVOS que têm arquivo vinculado
   * @param {boolean} incluirSemArquivo - Se true, retorna todos incluindo sem arquivo
   * @returns {Promise<Array>} Lista de empenhos com arquivo válido
   */
  async buscarEmpenhos(incluirSemArquivo = false) {
    const todosEmpenhos = await this.getAll('empenhos');
    const todosArquivos = await this.getAll('arquivos');

    console.log(
      `[DB] buscarEmpenhos: ${todosEmpenhos.length} empenhos no banco, ${todosArquivos.length} arquivos registrados`
    );

    if (incluirSemArquivo) {
      console.log(`[DB] Retornando TODOS os empenhos (incluindo sem arquivo)`);
      return todosEmpenhos;
    }

    // Criar mapa de documentoId -> arquivo para acesso rápido
    const mapaArquivos = new Map();
    todosArquivos.forEach((arquivo) => {
      if (arquivo.tipoDocumento === 'empenho') {
        mapaArquivos.set(arquivo.documentoId, arquivo);
      }
    });

    // Filtrar apenas empenhos que têm arquivo vinculado E não estão marcados como deletados
    const empenhosComArquivo = todosEmpenhos.filter((emp) => {
      const temArquivo = mapaArquivos.has(emp.id);
      const naoEstaDeletado = !emp.arquivoDeletado;
      return temArquivo && naoEstaDeletado;
    });

    const empenhosSemArquivo = todosEmpenhos.filter((emp) => !mapaArquivos.has(emp.id));
    const empenhosDeletados = todosEmpenhos.filter((emp) => emp.arquivoDeletado);

    console.log(
      `[DB] ${empenhosComArquivo.length} com arquivo válido, ${empenhosSemArquivo.length} sem arquivo, ${empenhosDeletados.length} deletados`
    );

    if (empenhosSemArquivo.length > 0) {
      console.warn(
        `[DB] Empenhos SEM arquivo vinculado:`,
        empenhosSemArquivo.map((e) => ({
          id: e.id,
          numero: e.numero,
          fornecedor: e.fornecedor
        }))
      );
    }

    if (empenhosDeletados.length > 0) {
      console.warn(
        `[DB] Empenhos com arquivo DELETADO:`,
        empenhosDeletados.map((e) => ({
          id: e.id,
          numero: e.numero,
          arquivoDeletadoEm: e.arquivoDeletadoEm
        }))
      );
    }

    return empenhosComArquivo;
  }

  /**
   * Busca um empenho por ID
   * @param {number} id - ID do empenho
   * @returns {Promise<Object>} Dados do empenho
   */
  async buscarEmpenhoPorId(id) {
    return this.get('empenhos', id);
  }

  /**
   * Busca empenhos por CNPJ do fornecedor que têm arquivo vinculado
   * @param {string} cnpj - CNPJ do fornecedor
   * @param {boolean} incluirSemArquivo - Se true, retorna todos incluindo sem arquivo
   * @returns {Promise<Array>} Lista de empenhos do fornecedor com arquivo válido
   */
  async buscarEmpenhosPorCNPJ(cnpj, incluirSemArquivo = false) {
    const todosEmpenhos = await this.getByIndex('empenhos', 'cnpjFornecedor', cnpj);

    if (incluirSemArquivo) {
      return todosEmpenhos;
    }

    // Buscar arquivos para validar
    const todosArquivos = await this.getAll('arquivos');
    const mapaArquivos = new Map();
    todosArquivos.forEach((arquivo) => {
      if (arquivo.tipoDocumento === 'empenho') {
        mapaArquivos.set(arquivo.documentoId, arquivo);
      }
    });

    // Filtrar apenas empenhos que têm arquivo vinculado E não estão deletados
    return todosEmpenhos.filter((emp) => {
      const temArquivo = mapaArquivos.has(emp.id);
      const naoEstaDeletado = !emp.arquivoDeletado;
      return temArquivo && naoEstaDeletado;
    });
  }

  /**
   * Busca empenhos por número
   * @param {string} numero - Número do empenho
   * @returns {Promise<Array>} Lista de empenhos com esse número (normalmente 0 ou 1)
   */
  async buscarEmpenhosPorNumero(numero) {
    try {
      const empenho = await this.getByIndex('empenhos', 'numero', numero);
      // getByIndex pode retornar um objeto único ou array, padronizar para array
      if (!empenho) {
        return [];
      }
      return Array.isArray(empenho) ? empenho : [empenho];
    } catch (error) {
      console.error('[DB] Erro ao buscar empenho por número:', error);
      return [];
    }
  }

  /**
   * Busca todas as entregas
   * @returns {Promise<Array>} Lista de entregas
   */
  async buscarEntregas() {
    return this.getAll('entregas');
  }

  /**
   * Busca entregas por ID do empenho
   * @param {number} empenhoId - ID do empenho
   * @returns {Promise<Array>} Lista de entregas do empenho
   */
  async buscarEntregasPorEmpenho(empenhoId) {
    return this.getByIndex('entregas', 'empenhoId', empenhoId);
  }

  /**
   * Busca todas as notas fiscais
   * @returns {Promise<Array>} Lista de notas fiscais
   */
  async buscarNotasFiscais() {
    return this.getAll('notasFiscais');
  }

  /**
   * Busca nota fiscal por número
   * @param {string} numero - Número da nota fiscal
   * @returns {Promise<Object>} Dados da nota fiscal
   */
  async buscarNotaFiscalPorNumero(numero) {
    return this.getByIndex('notasFiscais', 'numero', numero);
  }

  /**
   * Busca notas fiscais vinculadas a um empenho
   * @param {number} empenhoId - ID do empenho
   * @returns {Promise<Array>} Lista de notas fiscais do empenho
   */
  async buscarNotasFiscaisPorEmpenho(empenhoId) {
    return this.getByIndex('notasFiscais', 'empenhoId', empenhoId);
  }

  /**
   * Busca lista de fornecedores únicos
   * @returns {Promise<Array>} Lista de fornecedores
   */
  async buscarFornecedores() {
    const empenhos = await this.buscarEmpenhos();
    const fornecedores = [];
    const cnpjsVistos = new Set();

    empenhos.forEach((empenho) => {
      if (!cnpjsVistos.has(empenho.cnpjFornecedor)) {
        fornecedores.push({
          cnpj: empenho.cnpjFornecedor,
          nome: empenho.fornecedor
        });
        cnpjsVistos.add(empenho.cnpjFornecedor);
      }
    });

    return fornecedores.sort((a, b) => a.nome.localeCompare(b.nome));
  }

  /**
   * Gera relatório de conferência para um empenho
   * @param {number} empenhoId - ID do empenho
   * @returns {Promise<Object>} Dados do relatório
   */
  async gerarRelatorioConferencia(empenhoId) {
    const empenho = await this.buscarEmpenhoPorId(empenhoId);
    const entregas = await this.buscarEntregasPorEmpenho(empenhoId);

    if (!empenho) {
      throw new Error('Empenho não encontrado');
    }

    // Consolida os itens recebidos por entrega
    const itensConsolidados = {};

    entregas.forEach((entrega) => {
      entrega.itensRecebidos.forEach((item) => {
        const chave = `${item.codigo}_${item.descricao}`;
        if (!itensConsolidados[chave]) {
          itensConsolidados[chave] = {
            codigo: item.codigo,
            descricao: item.descricao,
            unidade: item.unidade,
            valorUnitario: item.valorUnitario,
            quantidadeEmpenhada: 0,
            quantidadeRecebida: 0,
            saldo: 0
          };
        }
        itensConsolidados[chave].quantidadeRecebida += parseFloat(item.quantidade) || 0;
      });
    });

    // Adiciona informações do empenho
    empenho.itens.forEach((item) => {
      const chave = `${item.codigo}_${item.descricao}`;
      if (itensConsolidados[chave]) {
        itensConsolidados[chave].quantidadeEmpenhada = parseFloat(item.quantidade) || 0;
      } else {
        itensConsolidados[chave] = {
          codigo: item.codigo,
          descricao: item.descricao,
          unidade: item.unidade,
          valorUnitario: item.valorUnitario,
          quantidadeEmpenhada: parseFloat(item.quantidade) || 0,
          quantidadeRecebida: 0,
          saldo: 0
        };
      }
    });

    // Calcula saldos
    Object.values(itensConsolidados).forEach((item) => {
      item.saldo = item.quantidadeEmpenhada - item.quantidadeRecebida;
    });

    return {
      empenho,
      entregas,
      itensConsolidados: Object.values(itensConsolidados),
      totalEntregas: entregas.length,
      dataRelatorio: new Date().toISOString()
    };
  }

  /**
   * Compara nota fiscal com empenho e identifica divergências
   * @param {Object} notaFiscal - Dados da nota fiscal
   * @param {number} empenhoId - ID do empenho para comparar
   * @returns {Promise<Array>} Lista de divergências encontradas
   */
  async compararNotaFiscalComEmpenho(notaFiscal, empenhoId) {
    const empenho = await this.buscarEmpenhoPorId(empenhoId);
    const divergencias = [];

    if (!empenho) {
      divergencias.push({
        tipo: 'erro',
        campo: 'empenho',
        mensagem: 'Empenho não encontrado'
      });
      return divergencias;
    }

    // Obtém tolerâncias configuradas
    let toleranciaValor = 0.01; // Padrão: 1 centavo
    let toleranciaQuantidade = 0; // Padrão: exato

    if (typeof window.getToleranciaValor === 'function') {
      try {
        toleranciaValor = await window.getToleranciaValor();
      } catch (e) {
        console.warn('Erro ao obter tolerância de valor, usando padrão:', e);
      }
    }

    if (typeof window.getToleranciaQuantidade === 'function') {
      try {
        toleranciaQuantidade = await window.getToleranciaQuantidade();
      } catch (e) {
        console.warn('Erro ao obter tolerância de quantidade, usando padrão:', e);
      }
    }

    // Verifica CNPJ
    if (notaFiscal.cnpjFornecedor !== empenho.cnpjFornecedor) {
      divergencias.push({
        tipo: 'cnpj',
        campo: 'cnpjFornecedor',
        mensagem: 'CNPJ da NF diferente do empenho',
        valorNF: notaFiscal.cnpjFornecedor,
        valorEmpenho: empenho.cnpjFornecedor
      });
    }

    // Compara itens
    const itensEmpenho = new Map();
    empenho.itens.forEach((item) => {
      const chave = `${item.codigo}`;
      itensEmpenho.set(chave, item);
    });

    notaFiscal.itens.forEach((itemNF) => {
      const itemEmpenho = itensEmpenho.get(itemNF.codigo);

      if (!itemEmpenho) {
        divergencias.push({
          tipo: 'item_nao_encontrado',
          campo: 'item',
          mensagem: `Item ${itemNF.codigo} - ${itemNF.descricao} não consta no empenho`,
          valorNF: itemNF
        });
      } else {
        // Verifica valor unitário com tolerância configurada
        const valorNF = parseFloat(itemNF.valorUnitario) || 0;
        const valorEmpenho = parseFloat(itemEmpenho.valorUnitario) || 0;
        const diferencaValor = Math.abs(valorNF - valorEmpenho);

        if (diferencaValor > toleranciaValor) {
          divergencias.push({
            tipo: 'valor_divergente',
            campo: 'valorUnitario',
            mensagem: `Valor unitário divergente para item ${
              itemNF.codigo
            } (tolerância: R$ ${toleranciaValor.toFixed(2)})`,
            valorNF: valorNF,
            valorEmpenho: valorEmpenho,
            diferenca: diferencaValor,
            item: itemNF.descricao
          });
        }

        // Verifica quantidade com tolerância configurada
        const qtdNF = parseFloat(itemNF.quantidade) || 0;
        const qtdEmpenho = parseFloat(itemEmpenho.quantidade) || 0;
        const diferencaQtd = Math.abs(qtdNF - qtdEmpenho);

        if (diferencaQtd > toleranciaQuantidade) {
          divergencias.push({
            tipo: 'quantidade_divergente',
            campo: 'quantidade',
            mensagem: `Quantidade divergente para item ${itemNF.codigo} (tolerância: ${toleranciaQuantidade})`,
            valorNF: qtdNF,
            valorEmpenho: qtdEmpenho,
            diferenca: diferencaQtd,
            item: itemNF.descricao
          });
        }

        // Verifica descrição
        if (itemNF.descricao.toLowerCase() !== itemEmpenho.descricao.toLowerCase()) {
          divergencias.push({
            tipo: 'descricao_divergente',
            campo: 'descricao',
            mensagem: `Descrição divergente para item ${itemNF.codigo}`,
            valorNF: itemNF.descricao,
            valorEmpenho: itemEmpenho.descricao
          });
        }
      }
    });

    return divergencias;
  }

  // ========== Métodos genéricos para IndexedDB ==========

  /**
   * Adiciona um registro a uma store
   * @param {string} storeName - Nome da store
   * @param {Object} data - Dados a serem salvos
   * @returns {Promise<number>} ID do registro adicionado
   */
  add(storeName, data) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.add(data);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca um registro por ID
   * @param {string} storeName - Nome da store
   * @param {number} id - ID do registro
   * @returns {Promise<Object>} Dados do registro
   */
  get(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca todos os registros de uma store
   * @param {string} storeName - Nome da store
   * @returns {Promise<Array>} Lista de registros
   */
  getAll(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Busca registros por índice
   * @param {string} storeName - Nome da store
   * @param {string} indexName - Nome do índice
   * @param {*} value - Valor a buscar
   * @returns {Promise<Array>} Lista de registros encontrados
   */
  getByIndex(storeName, indexName, value) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Atualiza um registro
   * @param {string} storeName - Nome da store
   * @param {Object} data - Dados atualizados (deve conter o ID)
   * @returns {Promise<*>} Resultado da operação
   */
  update(storeName, data) {
    return new Promise((resolve, reject) => {
      // Validação crítica
      if (!this.db) {
        const erro = new Error('❌ Banco de dados não está inicializado! Chame dbManager.init() primeiro.');
        console.error('❌ ERRO em update():', erro);
        console.error('   - this.db:', this.db);
        console.error('   - storeName:', storeName);
        console.error('   - data:', data);
        reject(erro);
        return;
      }

      try {
        data.dataAtualizacao = new Date().toISOString();

        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => {
          console.log(`✅ Registro salvo em '${storeName}':`, data.id || data);
          resolve(request.result);
        };
        request.onerror = () => {
          console.error(`❌ Erro ao salvar em '${storeName}':`, request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error(`❌ Exceção em update('${storeName}'):`, error);
        reject(error);
      }
    });
  }

  /**
   * Remove um registro
   * @param {string} storeName - Nome da store
   * @param {number} id - ID do registro a remover
   * @returns {Promise<void>}
   */
  delete(storeName, id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpa todos os dados de uma store
   * @param {string} storeName - Nome da store
   * @returns {Promise<void>}
   */
  clear(storeName) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Salva informações de um arquivo no banco de dados
   * @param {Object} arquivo - Dados do arquivo
   * @returns {Promise<number>} ID do arquivo salvo
   */
  async salvarArquivo(arquivo) {
    const arquivoData = {
      originalName: arquivo.originalName,
      savedName: arquivo.savedName,
      tipo: arquivo.folderType, // 'empenhos' ou 'notasFiscais'
      tipoDocumento: arquivo.folderType === 'empenhos' ? 'empenho' : 'notaFiscal', // 'empenho' ou 'notaFiscal'
      ano: arquivo.year,
      size: arquivo.size,
      path: arquivo.path,
      caminhoRelativo: arquivo.caminhoRelativo || arquivo.path, // Caminho relativo para verificação
      documentoId: arquivo.documentoId || null, // ID do empenho ou nota fiscal relacionado
      timestamp: arquivo.timestamp || new Date().toISOString(),
      dataCriacao: new Date().toISOString()
    };

    return this.add('arquivos', arquivoData);
  }

  /**
   * Busca arquivos por tipo e ano
   * @param {string} tipo - Tipo do arquivo ('empenhos' ou 'notasFiscais')
   * @param {number} ano - Ano dos arquivos (opcional)
   * @returns {Promise<Array>} Lista de arquivos
   */
  async buscarArquivos(tipo, ano = null) {
    if (ano) {
      // Buscar por tipo e ano
      const arquivosPorTipo = await this.getByIndex('arquivos', 'tipo', tipo);
      return arquivosPorTipo.filter((arquivo) => arquivo.ano === ano);
    } else {
      // Buscar apenas por tipo
      return this.getByIndex('arquivos', 'tipo', tipo);
    }
  }

  /**
   * Busca arquivo por documento relacionado
   * @param {string} tipo - Tipo do arquivo
   * @param {number} documentoId - ID do documento (empenho ou nota fiscal)
   * @returns {Promise<Object|null>} Dados do arquivo ou null se não encontrado
   */
  async buscarArquivoPorDocumento(tipo, documentoId) {
    const arquivos = await this.getByIndex('arquivos', 'documentoId', documentoId);
    return arquivos.find((arquivo) => arquivo.tipo === tipo) || null;
  }

  /**
   * Atualiza o ID do documento relacionado a um arquivo
   * @param {number} arquivoId - ID do arquivo
   * @param {number} documentoId - ID do documento
   * @returns {Promise<void>}
   */
  async vincularArquivoAoDocumento(arquivoId, documentoId) {
    const arquivo = await this.get('arquivos', arquivoId);
    if (arquivo) {
      arquivo.documentoId = documentoId;
      arquivo.dataAtualizacao = new Date().toISOString();
      return this.update('arquivos', arquivo);
    }

    return null;
  }

  /**
   * Remove um arquivo do banco de dados
   * @param {number} arquivoId - ID do arquivo
   * @returns {Promise<void>}
   */
  async removerArquivo(arquivoId) {
    return this.delete('arquivos', arquivoId);
  }

  /**
   * Exclui um empenho do banco de dados
   * @param {number} empenhoId - ID do empenho
   * @returns {Promise<void>}
   */
  async deletarEmpenho(empenhoId) {
    return this.delete('empenhos', empenhoId);
  }

  // ==========================================
  // MÉTODOS DE SUGESTÕES E UX
  // ==========================================

  /**
   * Obtém sugestões de itens salvos
   * @returns {Promise<string[]>} Lista de descrições de itens
   */
  async getItensSugestoes() {
    try {
      const data = await this.get('config', 'item_suggestions');
      return data?.items || [];
    } catch (e) {
      console.warn('[DB] Erro ao obter sugestões de itens:', e);
      return [];
    }
  }

  /**
   * Adiciona uma descrição de item às sugestões
   * @param {string} descricao - Descrição do item (será normalizado para maiúsculo)
   * @returns {Promise<void>}
   */
  async addItemSugestao(descricao) {
    try {
      const desc = String(descricao || '')
        .trim()
        .toUpperCase();
      if (!desc || desc.length < 3) {
        return;
      }

      const data = (await this.get('config', 'item_suggestions')) || { id: 'item_suggestions', items: [] };
      const items = data.items || [];

      // Evitar duplicados
      if (!items.includes(desc)) {
        items.unshift(desc); // Adicionar no início
        // Limitar a 200 itens
        if (items.length > 200) {
          items.length = 200;
        }
        data.items = items;
        data.lastUpdatedAt = Date.now();
        await this.put('config', data);
      }
    } catch (e) {
      console.warn('[DB] Erro ao salvar sugestão de item:', e);
    }
  }

  /**
   * Obtém configurações de unidades (lista e última usada)
   * @returns {Promise<{list: string[], last: string}>}
   */
  async getUnidadesConfig() {
    try {
      const data = await this.get('config', 'unidades_config');
      return {
        list: data?.list || ['UN', 'KG', 'CX', 'PCT', 'L', 'M', 'M2', 'M3'],
        last: data?.last || 'UN'
      };
    } catch (e) {
      console.warn('[DB] Erro ao obter config de unidades:', e);
      return { list: ['UN', 'KG', 'CX', 'PCT', 'L', 'M', 'M2', 'M3'], last: 'UN' };
    }
  }

  /**
   * Salva configuração de unidades
   * @param {string} unidade - Unidade a adicionar e definir como última
   * @returns {Promise<void>}
   */
  async saveUnidadeConfig(unidade) {
    try {
      const u = String(unidade || '')
        .trim()
        .toUpperCase();
      if (!u) {
        return;
      }

      const data = (await this.get('config', 'unidades_config')) || {
        id: 'unidades_config',
        list: ['UN', 'KG', 'CX', 'PCT', 'L', 'M', 'M2', 'M3'],
        last: 'UN'
      };

      // Adicionar à lista se não existir
      if (!data.list.includes(u)) {
        data.list.unshift(u);
        if (data.list.length > 50) {
          data.list.length = 50;
        }
      }

      data.last = u;
      data.lastUpdatedAt = Date.now();
      await this.put('config', data);
    } catch (e) {
      console.warn('[DB] Erro ao salvar config de unidade:', e);
    }
  }

  /**
   * Busca todos os arquivos
   * @returns {Promise<Array>} Lista de todos os arquivos
   */
  async buscarTodosArquivos() {
    return this.getAll('arquivos');
  }

  // ==========================================
  // MÉTODOS DE CONTROLE DE SALDO DE EMPENHOS
  // ==========================================

  /**
   * Cria registros de saldo para cada item do empenho
   * @param {number} empenhoId - ID do empenho
   * @param {Object} empenho - Dados do empenho
   * @returns {Promise<void>}
   */
  async criarSaldosEmpenho(empenhoId, empenho) {
    try {
      // ═══════════════════════════════════════════════════════════════
      // ⚠️ VERIFICAR SE JÁ EXISTEM SALDOS PARA ESTE EMPENHO
      // Evita duplicação quando empenho é salvo múltiplas vezes
      // ═══════════════════════════════════════════════════════════════
      const saldosExistentes = await this.getByIndex('saldosEmpenhos', 'empenhoId', empenhoId);
      if (saldosExistentes && saldosExistentes.length > 0) {
        console.log(
          `[SALDO] ⚠️ Saldos já existem para empenho ${empenhoId} (${saldosExistentes.length} itens). Pulando criação.`
        );
        return;
      }

      console.log('[SALDO] itens origem:', empenho.itens?.length || 0);

      // Para cada item do empenho, criar um registro de saldo
      const promises = empenho.itens.map((item, index) => {
        const saldo = {
          empenhoId: empenhoId,
          numeroEmpenho: empenho.numero,
          fornecedor: empenho.fornecedor,
          cnpjFornecedor: empenho.cnpjFornecedor,
          dataEmpenho: empenho.dataEmpenho,
          itemSequencia: index + 1,
          codigoItem: item.codigo,
          descricaoItem: item.descricao,
          unidade: item.unidade,
          quantidadeEmpenhada: parseFloat(item.quantidade) || 0,
          valorUnitario: parseFloat(item.valorUnitario) || 0,
          valorTotalItem: (parseFloat(item.quantidade) || 0) * (parseFloat(item.valorUnitario) || 0),
          quantidadeRecebida: 0,
          saldoQuantidade: parseFloat(item.quantidade) || 0,
          saldoValor: (parseFloat(item.quantidade) || 0) * (parseFloat(item.valorUnitario) || 0),
          entradas: [], // Array de {notaFiscal, quantidade, data}
          status: 'pendente', // pendente, parcial, completo
          dataCriacao: new Date().toISOString(),
          dataAtualizacao: new Date().toISOString()
        };

        return this.add('saldosEmpenhos', saldo);
      });

      await Promise.all(promises);
      console.log(`[SALDO] rows geradas: ${empenho.itens.length}`);
      console.log(`✅ Saldos criados para ${empenho.itens.length} itens do empenho ${empenho.numero}`);
    } catch (error) {
      console.error('Erro ao criar saldos do empenho:', error);
      throw error;
    }
  }

  /**
   * Calcula similaridade entre duas strings usando palavras-chave
   * @param {string} str1 - Primeira string
   * @param {string} str2 - Segunda string
   * @returns {number} Score de similaridade (0-100)
   */
  calcularSimilaridade(str1, str2) {
    if (!str1 || !str2) {
      return 0;
    }

    // Normalizar: remover acentos, converter para minúsculas, remover pontuação
    const normalizar = (str) =>
      str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .trim();

    const texto1 = normalizar(str1);
    const texto2 = normalizar(str2);

    // Dividir em palavras (mínimo 3 caracteres para evitar ruído)
    const palavras1 = new Set(texto1.split(/\s+/).filter((p) => p.length >= 3));
    const palavras2 = new Set(texto2.split(/\s+/).filter((p) => p.length >= 3));

    if (palavras1.size === 0 || palavras2.size === 0) {
      return 0;
    }

    // Contar palavras em comum
    let comuns = 0;
    palavras1.forEach((p1) => {
      palavras2.forEach((p2) => {
        // Correspondência exata ou uma contém a outra (para variações)
        if (p1 === p2 || p1.includes(p2) || p2.includes(p1)) {
          comuns++;
        }
      });
    });

    // Calcular score (Jaccard modificado)
    const total = palavras1.size + palavras2.size;
    return ((comuns * 2) / total) * 100;
  }

  /**
   * Encontra o melhor match de item da NF com item do empenho
   * @param {Object} itemNF - Item da nota fiscal
   * @param {Array} saldos - Array de saldos do empenho
   * @returns {Object|null} Melhor saldo correspondente ou null
   */
  encontrarItemCorrespondente(itemNF, saldos) {
    const valorNF = parseFloat(itemNF.valorUnitario) || 0;
    const codigoNF = itemNF.codigo?.trim().toUpperCase();
    const descricaoNF = itemNF.descricao?.trim();

    let melhorMatch = null;
    let melhorScore = 0;

    for (const saldo of saldos) {
      let score = 0;
      const codigoEmpenho = saldo.codigoItem?.trim().toUpperCase();
      const valorEmpenho = saldo.valorUnitario;

      // 1. Correspondência de código (peso 40%)
      if (codigoNF && codigoEmpenho && codigoNF === codigoEmpenho) {
        score += 40;
      }

      // 2. Similaridade de descrição (peso 40%)
      const similDescricao = this.calcularSimilaridade(descricaoNF, saldo.descricaoItem);
      score += similDescricao * 0.4;

      // 3. Proximidade de valor unitário (peso 20%)
      if (valorNF > 0 && valorEmpenho > 0) {
        const diferencaPercentual = (Math.abs(valorNF - valorEmpenho) / valorEmpenho) * 100;
        if (diferencaPercentual <= 5) {
          score += 20; // Valores muito próximos (até 5% de diferença)
        } else if (diferencaPercentual <= 15) {
          score += 10; // Valores razoavelmente próximos (até 15% de diferença)
        }
      }

      // 4. Verificar se ainda há saldo disponível (peso bonus)
      if (saldo.saldoQuantidade > 0) {
        score += 5;
      }

      // Atualizar melhor match
      if (score > melhorScore) {
        melhorScore = score;
        melhorMatch = saldo;
      }
    }

    // Só aceitar se score for razoável (mínimo 30%)
    return melhorScore >= 30 ? { saldo: melhorMatch, score: melhorScore } : null;
  }

  /**
   * Atualiza o saldo de um item ao registrar uma nota fiscal
   * @param {number} empenhoId - ID do empenho
   * @param {string} numeroNF - Número da nota fiscal
   * @param {Array} itensNF - Itens da nota fiscal
   * @returns {Promise<void>}
   */
  async atualizarSaldosComNotaFiscal(empenhoId, numeroNF, itensNF, dataNF) {
    try {
      // Buscar todos os saldos deste empenho
      const saldos = await this.getByIndex('saldosEmpenhos', 'empenhoId', empenhoId);

      const resultados = {
        encontrados: [],
        naoEncontrados: []
      };

      // Para cada item da nota fiscal, atualizar o saldo correspondente
      for (const itemNF of itensNF) {
        // Usar algoritmo inteligente de correspondência
        const match = this.encontrarItemCorrespondente(itemNF, saldos);

        if (match) {
          const { saldo, score } = match;

          // Adicionar entrada ao histórico
          const entrada = {
            notaFiscal: numeroNF,
            quantidade: parseFloat(itemNF.quantidade) || 0,
            data: dataNF || new Date().toISOString(),
            scoreCorrespondencia: score.toFixed(1)
          };

          saldo.entradas.push(entrada);

          // Atualizar quantidades
          saldo.quantidadeRecebida += parseFloat(itemNF.quantidade) || 0;
          saldo.saldoQuantidade = saldo.quantidadeEmpenhada - saldo.quantidadeRecebida;
          saldo.saldoValor = saldo.saldoQuantidade * saldo.valorUnitario;

          // Atualizar status
          if (saldo.saldoQuantidade <= 0) {
            saldo.status = 'completo';
          } else if (saldo.quantidadeRecebida > 0) {
            saldo.status = 'parcial';
          }

          saldo.dataAtualizacao = new Date().toISOString();

          // Salvar alterações
          await this.update('saldosEmpenhos', saldo);

          resultados.encontrados.push({
            itemNF: `${itemNF.codigo} - ${itemNF.descricao}`,
            itemEmpenho: `${saldo.codigoItem} - ${saldo.descricaoItem}`,
            score: score.toFixed(1)
          });

          console.log(
            `✅ Match encontrado (${score.toFixed(1)}%) - NF: ${itemNF.descricao} ↔ Empenho: ${saldo.descricaoItem}`
          );
        } else {
          resultados.naoEncontrados.push({
            codigo: itemNF.codigo,
            descricao: itemNF.descricao,
            valor: itemNF.valorUnitario
          });
          console.warn(`⚠️ Item da NF não encontrou correspondência: ${itemNF.codigo} - ${itemNF.descricao}`);
        }
      }

      // Retornar resumo para exibir ao usuário
      return resultados;
    } catch (error) {
      console.error('Erro ao atualizar saldos com nota fiscal:', error);
      throw error;
    }
  }

  /**
   * Busca o saldo completo de um empenho
   * @param {number} empenhoId - ID do empenho
   * @returns {Promise<Object>} Objeto com dados do saldo consolidado
   */
  async buscarSaldoEmpenho(empenhoId) {
    try {
      const saldosRaw = await this.getByIndex('saldosEmpenhos', 'empenhoId', empenhoId);

      if (!saldosRaw || saldosRaw.length === 0) {
        return null;
      }

      // ═══════════════════════════════════════════════════════════════
      // ⚠️ DEDUPLICAÇÃO: remove itens duplicados por chave estável
      // Chave: empenhoId + itemSequencia
      // ═══════════════════════════════════════════════════════════════
      const saldosMap = new Map();
      saldosRaw.forEach((item) => {
        const chave = `${item.empenhoId}:${item.itemSequencia}`;
        // Se já existe, mantém o primeiro (mais antigo) ou o com mais dados
        if (!saldosMap.has(chave)) {
          saldosMap.set(chave, item);
        }
      });
      const saldos = Array.from(saldosMap.values());

      console.log('[SALDO] itens origem:', saldosRaw.length, '| rows final (dedup):', saldos.length);

      // Calcular totais
      const saldoTotal = saldos.reduce(
        (acc, item) => {
          acc.valorTotalEmpenhado += item.valorTotalItem;
          acc.valorRecebido += item.quantidadeRecebida * item.valorUnitario;
          acc.saldoValorTotal += item.saldoValor;
          return acc;
        },
        {
          valorTotalEmpenhado: 0,
          valorRecebido: 0,
          saldoValorTotal: 0
        }
      );

      return {
        empenhoId: empenhoId,
        numeroEmpenho: saldos[0].numeroEmpenho,
        fornecedor: saldos[0].fornecedor,
        dataEmpenho: saldos[0].dataEmpenho,
        itens: saldos,
        resumo: saldoTotal,
        statusGeral: this.calcularStatusGeral(saldos)
      };
    } catch (error) {
      console.error('Erro ao buscar saldo do empenho:', error);
      throw error;
    }
  }

  /**
   * Calcula o status geral do empenho
   * @param {Array} saldos - Array de saldos dos itens
   * @returns {string} Status geral (pendente, parcial, completo)
   */
  calcularStatusGeral(saldos) {
    const completos = saldos.filter((s) => s.status === 'completo').length;
    const pendentes = saldos.filter((s) => s.status === 'pendente').length;

    if (completos === saldos.length) {
      return 'completo';
    }
    if (pendentes === saldos.length) {
      return 'pendente';
    }
    return 'parcial';
  }

  /**
   * Busca todos os saldos de empenhos (para relatório geral)
   * @returns {Promise<Array>} Lista de todos os saldos
   */
  async buscarTodosSaldos() {
    return this.getAll('saldosEmpenhos');
  }

  /**
   * Busca saldos por status
   * @param {string} status - Status desejado (pendente, parcial, completo)
   * @returns {Promise<Array>} Lista de saldos com o status especificado
   */
  async buscarSaldosPorStatus(status) {
    return this.getByIndex('saldosEmpenhos', 'status', status);
  }

  /**
   * Migra registros antigos para o schema v5 (statusValidacao e campos CATMAT)
   */
  async migrarEmpenhosV5() {
    if (!this.db) {
      return;
    }

    const transaction = this.db.transaction(['empenhos'], 'readwrite');
    const store = transaction.objectStore('empenhos');

    const todos = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    let atualizados = 0;

    for (const emp of todos) {
      let mudou = false;

      if (!emp.statusValidacao) {
        emp.statusValidacao = 'validado'; // assume legado já estava concluído
        mudou = true;
      }

      if (emp.validadoEm === undefined) {
        emp.validadoEm = null;
        mudou = true;
      }

      if (emp.validadoPor === undefined) {
        emp.validadoPor = null;
        mudou = true;
      }

      if (!emp.ano) {
        const ano = emp.dataEmpenho ? new Date(emp.dataEmpenho).getFullYear() : null;
        if (ano) {
          emp.ano = ano;
          mudou = true;
        }
      }

      if (Array.isArray(emp.itens)) {
        const itensAtualizados = emp.itens.map((i) => ({
          ...i,
          catmatCodigo: i.catmatCodigo || '',
          catmatDescricao: i.catmatDescricao || '',
          catmatFonte: i.catmatFonte || null
        }));
        // Verifica se houve mudança
        const precisaAtualizarItens = itensAtualizados.some((i, idx) => {
          const orig = emp.itens[idx];
          return (
            orig.catmatCodigo !== i.catmatCodigo ||
            orig.catmatDescricao !== i.catmatDescricao ||
            orig.catmatFonte !== i.catmatFonte
          );
        });
        if (precisaAtualizarItens) {
          emp.itens = itensAtualizados;
          mudou = true;
        }
      }

      if (mudou) {
        await new Promise((resolve, reject) => {
          const req = store.put({ ...emp, dataAtualizacao: new Date().toISOString() });
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        atualizados += 1;
      }
    }

    if (atualizados > 0) {
      console.log(`🔄 Migração v5: ${atualizados} empenho(s) atualizados com statusValidacao/ano/CATMAT`);
    } else {
      console.log('ℹ️ Migração v5: nada para atualizar');
    }
  }

  async migrarEmpenhosV6() {
    if (!this.db) {
      return;
    }

    const transaction = this.db.transaction(['empenhos'], 'readwrite');
    const store = transaction.objectStore('empenhos');

    const todos = await new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    let atualizados = 0;

    for (const emp of todos) {
      const numeroNormalizado = emp.numero ? String(emp.numero).replace(/\D/g, '') : '';
      const anoInferido = emp.ano || (emp.dataEmpenho ? new Date(emp.dataEmpenho).getFullYear() : null);
      const slug = anoInferido && numeroNormalizado ? `${anoInferido}-NE-${numeroNormalizado}` : null;

      if (!emp.slug && slug) {
        emp.slug = slug;
        emp.dataAtualizacao = new Date().toISOString();
        await new Promise((resolve, reject) => {
          const req = store.put(emp);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        });
        atualizados++;
      }
    }

    if (atualizados > 0) {
      console.log(`🔄 Migração v6: ${atualizados} empenho(s) atualizados com slug`);
    } else {
      console.log('ℹ️ Migração v6: nada para atualizar');
    }
  }

  // ===========================================================================
  // IMPORTAÇÃO DE BACKUP
  // ===========================================================================

  /**
   * Importa dados de um backup diretamente no IndexedDB
   * @param {Object} backupData - Dados do backup (pode ter várias estruturas)
   * @param {string} mode - 'merge' (upsert) ou 'replace' (limpa antes)
   * @returns {Promise<Object>} Resultado da importação
   */
  async importBackup(backupData, mode = 'merge') {
    console.log('[DB.importBackup] 🚀 Iniciando importação...');
    console.log('[DB.importBackup] Modo:', mode);
    console.log('[DB.importBackup] Chaves do backup:', Object.keys(backupData));

    const result = {
      success: true,
      imported: {},
      errors: [],
      total: 0,
      storage: null
    };

    // Normalizar estrutura do backup (aceitar várias fontes)
    const dados = this._normalizarBackupData(backupData);

    console.log('[DB.importBackup] 📊 Dados normalizados:');
    console.log('  - Empenhos:', dados.empenhos?.length || 0);
    console.log('  - Notas Fiscais:', dados.notasFiscais?.length || 0);
    console.log('  - Entregas:', dados.entregas?.length || 0);
    console.log('  - Arquivos:', dados.arquivos?.length || 0);
    console.log('  - Config:', dados.config?.length || 0);
    console.log('  - Unidades:', dados.unidades?.length || 0);
    console.log('  - Usuários:', dados.usuarios?.length || 0);

    if (!this.db) {
      console.error('[DB.importBackup] ❌ Banco de dados não inicializado!');
      result.success = false;
      result.errors.push('Banco de dados não inicializado');
      return result;
    }

    // Importar cada store
    const storeMapping = [
      { key: 'empenhos', store: 'empenhos' },
      { key: 'notasFiscais', store: 'notasFiscais' },
      { key: 'entregas', store: 'entregas' },
      { key: 'arquivos', store: 'arquivos' },
      { key: 'saldosEmpenhos', store: 'saldosEmpenhos' },
      { key: 'config', store: 'config' },
      { key: 'configuracoes', store: 'configuracoes' },
      { key: 'auditLogs', store: 'auditLogs' }
    ];

    for (const { key, store } of storeMapping) {
      const records = dados[key];
      if (!Array.isArray(records) || records.length === 0) {
        continue;
      }

      try {
        console.log(`[DB.importBackup] 📥 Importando ${records.length} registros para '${store}'...`);
        const count = await this._importToStore(store, records, mode);
        result.imported[store] = count;
        result.total += count;
        console.log(`[DB.importBackup] ✅ ${store}: ${count} registros importados`);
      } catch (error) {
        console.error(`[DB.importBackup] ❌ Erro ao importar '${store}':`, error);
        result.errors.push(`${store}: ${error.message}`);
      }
    }

    // Importar unidades e usuários separadamente (podem vir em data.unidades ou config)
    await this._importarUnidadesUsuarios(dados, result);

    // Verificação pós-importação
    console.log('[DB.importBackup] 🔍 Verificando dados persistidos...');
    const verificacao = await this._verificarDadosImportados();
    console.log('[DB.importBackup] 📊 Verificação pós-import:', verificacao);

    if (verificacao.empenhos === 0 && dados.empenhos?.length > 0) {
      console.error('[DB.importBackup] ❌ ALERTA: Empenhos não persistiram!');
      result.errors.push('Empenhos não persistiram na store');
    }

    // Processar configurações de storage (se existir no backup)
    if (backupData.storage) {
      result.storage = backupData.storage;
      console.log('[DB.importBackup] 📁 Configurações de storage detectadas:', backupData.storage);
    }

    console.log('[DB.importBackup] ✅ Importação concluída:', result);
    return result;
  }

  /**
   * Importa unidades e usuários para a config store
   */
  async _importarUnidadesUsuarios(dados, result) {
    try {
      // Importar unidades
      if (dados.unidades && dados.unidades.length > 0) {
        console.log(`[DB.importBackup] 📥 Importando ${dados.unidades.length} unidades...`);
        await this._importToStore(
          'config',
          [
            {
              id: 'todasUnidades',
              unidades: dados.unidades,
              dataAtualizacao: new Date().toISOString()
            }
          ],
          'merge'
        );
        result.imported.unidades = dados.unidades.length;
      }

      // Importar usuários
      if (dados.usuarios && dados.usuarios.length > 0) {
        console.log(`[DB.importBackup] 📥 Importando ${dados.usuarios.length} usuários...`);
        await this._importToStore(
          'config',
          [
            {
              id: 'usuarios',
              usuarios: dados.usuarios,
              dataAtualizacao: new Date().toISOString()
            }
          ],
          'merge'
        );
        result.imported.usuarios = dados.usuarios.length;
      }
    } catch (error) {
      console.warn('[DB.importBackup] ⚠️ Erro ao importar unidades/usuários:', error);
    }
  }

  /**
   * Normaliza dados do backup para estrutura padrão
   */
  _normalizarBackupData(backup) {
    const dados = {
      empenhos: [],
      notasFiscais: [],
      entregas: [],
      arquivos: [],
      saldosEmpenhos: [],
      config: [],
      configuracoes: [],
      auditLogs: [],
      unidades: [],
      usuarios: []
    };

    // Estrutura 1: backup.indexedDB.empenhos (storageAdapter)
    if (backup.indexedDB) {
      console.log('[DB.importBackup] Detectado formato: indexedDB');
      Object.keys(dados).forEach((key) => {
        if (Array.isArray(backup.indexedDB[key])) {
          dados[key] = backup.indexedDB[key];
        }
      });
    }

    // Estrutura 2: backup.data.empenhos (novo formato completo)
    if (backup.data) {
      console.log('[DB.importBackup] Detectado formato: data');
      Object.keys(dados).forEach((key) => {
        if (Array.isArray(backup.data[key])) {
          dados[key] = backup.data[key];
        }
      });
    }

    // Estrutura 3: backup.stores.empenhos (outro formato)
    if (backup.stores) {
      console.log('[DB.importBackup] Detectado formato: stores');
      Object.keys(dados).forEach((key) => {
        if (Array.isArray(backup.stores[key])) {
          dados[key] = backup.stores[key];
        }
      });
    }

    // Estrutura 4: backup.empenhos diretamente
    Object.keys(dados).forEach((key) => {
      if (Array.isArray(backup[key]) && dados[key].length === 0) {
        console.log(`[DB.importBackup] Detectado formato direto: ${key}`);
        dados[key] = backup[key];
      }
    });

    // Extrair unidades/usuários da config se não vieram separados
    if (dados.unidades.length === 0 && dados.config.length > 0) {
      const unidadesConfig = dados.config.find((c) => c.id === 'todasUnidades');
      if (unidadesConfig?.unidades) {
        dados.unidades = unidadesConfig.unidades;
        console.log('[DB.importBackup] Extraído unidades da config:', dados.unidades.length);
      }
    }

    if (dados.usuarios.length === 0 && dados.config.length > 0) {
      const usuariosConfig = dados.config.find((c) => c.id === 'usuarios');
      if (usuariosConfig?.usuarios) {
        dados.usuarios = usuariosConfig.usuarios;
        console.log('[DB.importBackup] Extraído usuários da config:', dados.usuarios.length);
      }
    }

    return dados;
  }

  /**
   * Importa registros para uma store específica
   */
  async _importToStore(storeName, records, mode) {
    return new Promise((resolve, reject) => {
      if (!this.db.objectStoreNames.contains(storeName)) {
        console.warn(`[DB.importBackup] Store '${storeName}' não existe`);
        resolve(0);
        return;
      }

      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      let importedCount = 0;
      let errorCount = 0;

      // Limpar store se modo replace
      if (mode === 'replace') {
        console.log(`[DB.importBackup] Limpando store '${storeName}'...`);
        store.clear();
      }

      // Inserir cada registro
      for (const record of records) {
        try {
          // Garantir que o registro tenha estrutura válida
          const cleanRecord = this._prepararRegistro(storeName, record);

          const request = store.put(cleanRecord);
          request.onsuccess = () => {
            importedCount++;
          };
          request.onerror = (e) => {
            errorCount++;
            console.warn(`[DB.importBackup] Erro ao inserir em ${storeName}:`, e.target.error);
          };
        } catch (err) {
          errorCount++;
          console.warn(`[DB.importBackup] Erro ao processar registro:`, err);
        }
      }

      tx.oncomplete = () => {
        console.log(`[DB.importBackup] Transação ${storeName} completa: ${importedCount} ok, ${errorCount} erros`);
        resolve(importedCount);
      };

      tx.onerror = (e) => {
        console.error(`[DB.importBackup] Transação ${storeName} falhou:`, e.target.error);
        reject(e.target.error);
      };

      tx.onabort = (e) => {
        console.error(`[DB.importBackup] Transação ${storeName} abortada:`, e.target.error);
        reject(new Error('Transação abortada: ' + (e.target.error?.message || 'unknown')));
      };
    });
  }

  /**
   * Prepara registro para inserção, garantindo campos obrigatórios
   */
  _prepararRegistro(storeName, record) {
    const prepared = { ...record };

    // Stores com autoIncrement precisam de id válido ou remover id
    if (
      storeName === 'empenhos' ||
      storeName === 'notasFiscais' ||
      storeName === 'entregas' ||
      storeName === 'arquivos' ||
      storeName === 'saldosEmpenhos'
    ) {
      // Se não tem id ou id é inválido, remover para auto-gerar
      if (!prepared.id || typeof prepared.id !== 'number') {
        delete prepared.id;
      }
    }

    // Config usa 'id' como string
    if (storeName === 'config' && !prepared.id) {
      prepared.id = 'config_' + Date.now();
    }

    // Configuracoes usa 'chave' como keyPath
    if (storeName === 'configuracoes' && !prepared.chave) {
      prepared.chave = 'config_' + Date.now();
    }

    return prepared;
  }

  /**
   * Verifica dados importados lendo diretamente do banco
   */
  async _verificarDadosImportados() {
    const resultado = {
      empenhos: 0,
      notasFiscais: 0,
      entregas: 0,
      arquivos: 0
    };

    try {
      resultado.empenhos = (await this.getAll('empenhos')).length;
      resultado.notasFiscais = (await this.getAll('notasFiscais')).length;
      resultado.entregas = (await this.getAll('entregas')).length;
      resultado.arquivos = (await this.getAll('arquivos')).length;
    } catch (err) {
      console.error('[DB.importBackup] Erro na verificação:', err);
    }

    return resultado;
  }

  // ===========================================================================
  // EXPORTAÇÃO DE BACKUP COMPLETO
  // ===========================================================================

  /**
   * Exporta todos os dados do sistema para backup
   * Inclui: dados, configurações e informações de storage
   * @returns {Promise<Object>} Objeto de backup completo
   */
  async exportBackup() {
    console.log('[DB.exportBackup] 🚀 Iniciando exportação completa...');

    const backup = {
      meta: {
        appName: 'SINGEM',
        appVersion: window.APP_VERSION || '1.4.0',
        dataVersion: this.dbVersion,
        exportedAt: new Date().toISOString(),
        environment: window.location.hostname === 'localhost' ? 'DEV' : 'PROD'
      },
      storage: await this._getStorageConfig(),
      data: {}
    };

    // Exportar todas as stores
    const storeNames = [
      'empenhos',
      'notasFiscais',
      'entregas',
      'arquivos',
      'saldosEmpenhos',
      'config',
      'configuracoes',
      'auditLogs'
    ];

    for (const storeName of storeNames) {
      try {
        const records = await this.getAll(storeName);
        backup.data[storeName] = records;
        console.log(`[DB.exportBackup] ✅ ${storeName}: ${records.length} registros`);
      } catch (err) {
        console.warn(`[DB.exportBackup] ⚠️ Erro ao exportar ${storeName}:`, err);
        backup.data[storeName] = [];
      }
    }

    // Extrair unidades e usuários da config
    try {
      const configRecords = backup.data.config || [];
      const unidadesConfig = configRecords.find((c) => c.id === 'todasUnidades');
      const usuariosConfig = configRecords.find((c) => c.id === 'usuarios');

      backup.data.unidades = unidadesConfig?.unidades || [];
      backup.data.usuarios = usuariosConfig?.usuarios || [];

      console.log(`[DB.exportBackup] 📊 Unidades: ${backup.data.unidades.length}`);
      console.log(`[DB.exportBackup] 📊 Usuários: ${backup.data.usuarios.length}`);
    } catch (err) {
      console.warn('[DB.exportBackup] ⚠️ Erro ao extrair unidades/usuários:', err);
      backup.data.unidades = [];
      backup.data.usuarios = [];
    }

    // Estatísticas
    backup.meta.stats = {
      empenhos: backup.data.empenhos?.length || 0,
      notasFiscais: backup.data.notasFiscais?.length || 0,
      entregas: backup.data.entregas?.length || 0,
      arquivos: backup.data.arquivos?.length || 0,
      unidades: backup.data.unidades?.length || 0,
      usuarios: backup.data.usuarios?.length || 0
    };

    console.log('[DB.exportBackup] ✅ Backup completo gerado:', backup.meta.stats);
    return backup;
  }

  /**
   * Obtém configurações de storage para incluir no backup
   */
  async _getStorageConfig() {
    const storage = {
      type: 'indexeddb',
      rootFolderName: 'SINGEM',
      baseHint: null,
      unidade: null,
      paths: {
        EMPENHOS: '01_EMPENHOS',
        NOTAS_FISCAIS: '02_NOTAS_FISCAIS',
        RELATORIOS: '03_RELATORIOS',
        BACKUPS: '04_BACKUPS',
        ANEXOS: '05_ANEXOS',
        CONFIG: '00_CONFIG'
      },
      handleMeta: {
        exists: false,
        lastGrantedAt: null,
        permissionState: 'prompt'
      }
    };

    try {
      // Verificar se há pasta configurada via File System Access
      if (window.fsManager?.mainDirectoryHandle) {
        storage.type = 'fs-access';
        storage.rootFolderName = window.fsManager.mainDirectoryHandle.name;

        // Verificar permissão atual
        try {
          const permission = await window.fsManager.mainDirectoryHandle.queryPermission({ mode: 'readwrite' });
          storage.handleMeta.permissionState = permission;
          storage.handleMeta.exists = true;
        } catch (e) {
          console.warn('[DB.exportBackup] Não foi possível verificar permissão:', e);
        }
      }

      // Buscar unidade ativa
      const configRecords = await this.getAll('config');
      const unidadeAtiva = configRecords.find((c) => c.id === 'unidadeAtiva');
      const mainDirConfig = configRecords.find((c) => c.id === 'mainDirectory');

      if (unidadeAtiva?.nome) {
        storage.unidade = unidadeAtiva.nome;
      }

      if (mainDirConfig) {
        storage.handleMeta.lastGrantedAt = mainDirConfig.timestamp;
        storage.handleMeta.exists = true;
      }
    } catch (err) {
      console.warn('[DB.exportBackup] ⚠️ Erro ao obter config de storage:', err);
    }

    return storage;
  }

  /**
   * Gera nome padronizado para arquivo de backup
   */
  generateBackupFilename() {
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').substring(0, 16);
    const unidade = this._sanitizeFilename(window.unidadeAtiva?.nome || 'GERAL');
    return `BKUP_SINGEM_${unidade}_${timestamp}_v${this.dbVersion}.json`;
  }

  /**
   * Sanitiza nome para usar em arquivo
   */
  _sanitizeFilename(name) {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 30);
  }
}

function applyServerDatabaseAdapter() {
  const serverMode = window.CONFIG?.storage?.mode === 'server';
  if (!serverMode || !window.dbManager) {
    return;
  }

  const manager = window.dbManager;
  manager._serverConfigStore = manager._serverConfigStore || new Map();

  const getApiBase = () => window.CONFIG?.api?.baseUrl || 'http://localhost:3000';
  const getToken = () => window.__SINGEM_AUTH?.accessToken || null;

  const normalizeEmpenho = (item = {}) => ({
    ...item,
    dataEmpenho: item.dataEmpenho || item.data_empenho || null,
    cnpjFornecedor: item.cnpjFornecedor || item.cnpj_fornecedor || null,
    valorTotal: item.valorTotal ?? item.valor_total ?? 0,
    naturezaDespesa: item.naturezaDespesa || item.natureza_despesa || null,
    processoSuap: item.processoSuap || item.processo_suap || null,
    statusValidacao: item.statusValidacao || item.status_validacao || 'rascunho'
  });

  const normalizeNF = (item = {}) => ({
    ...item,
    empenhoId: item.empenhoId || item.empenho_id || null,
    dataNotaFiscal: item.dataNotaFiscal || item.data_emissao || null,
    cnpjFornecedor: item.cnpjFornecedor || item.cnpj_fornecedor || null,
    valorTotal: item.valorTotal ?? item.valor_total ?? 0,
    chaveAcesso: item.chaveAcesso || item.chave_acesso || null
  });

  async function apiRequest(path, options = {}) {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${getApiBase()}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.erro || data.message || `HTTP ${response.status}`);
    }

    return data;
  }

  manager.init = async function initServerMode() {
    this.db = { mode: 'server-postgres' };
    return true;
  };

  manager.buscarEmpenhos = async function buscarEmpenhos(_incluirRascunhos = true) {
    const result = await apiRequest('/api/empenhos?limite=1000&offset=0');
    return (result.dados || []).map(normalizeEmpenho);
  };

  manager.buscarEmpenhoPorId = async function buscarEmpenhoPorId(id) {
    const result = await apiRequest(`/api/empenhos/${id}`);
    return normalizeEmpenho(result.dados || result);
  };

  manager.buscarEmpenho = manager.buscarEmpenhoPorId;

  manager.buscarEmpenhoPorSlug = async function buscarEmpenhoPorSlug(slug) {
    const result = await apiRequest(`/api/empenhos/slug/${encodeURIComponent(slug)}`);
    return normalizeEmpenho(result.dados || result);
  };

  manager.buscarEmpenhosPorCNPJ = async function buscarEmpenhosPorCNPJ(cnpj) {
    const result = await apiRequest(
      `/api/empenhos?cnpj=${encodeURIComponent(String(cnpj || '').replace(/\D/g, ''))}&limite=1000&offset=0`
    );
    return (result.dados || []).map(normalizeEmpenho);
  };

  manager.salvarEmpenho = async function salvarEmpenho(empenho) {
    const hasId = !!empenho?.id;
    const result = await apiRequest(hasId ? `/api/empenhos/${empenho.id}` : '/api/empenhos', {
      method: hasId ? 'PUT' : 'POST',
      body: empenho
    });
    return result?.dados?.id || empenho?.id;
  };

  manager.deletarEmpenho = async function deletarEmpenho(id) {
    await apiRequest(`/api/empenhos/${id}`, { method: 'DELETE' });
    return true;
  };

  manager.buscarNotasFiscais = async function buscarNotasFiscais() {
    const result = await apiRequest('/api/notas-fiscais?limite=1000&offset=0');
    return (result.dados || []).map(normalizeNF);
  };

  manager.listarNotasFiscais = manager.buscarNotasFiscais;

  manager.buscarNotaFiscal = async function buscarNotaFiscal(id) {
    const result = await apiRequest(`/api/notas-fiscais/${id}`);
    return normalizeNF(result.dados || result);
  };

  manager.salvarNotaFiscal = async function salvarNotaFiscal(nf) {
    const hasId = !!nf?.id;
    const payload = {
      ...nf,
      empenho_id: nf.empenhoId || nf.empenho_id || null,
      data_emissao: nf.dataNotaFiscal || nf.data_emissao || null,
      cnpj_fornecedor: nf.cnpjFornecedor || nf.cnpj_fornecedor || null,
      valor_total: nf.valorTotal ?? nf.valor_total ?? 0,
      chave_acesso: nf.chaveAcesso || nf.chave_acesso || null
    };
    const result = await apiRequest(hasId ? `/api/notas-fiscais/${nf.id}` : '/api/notas-fiscais', {
      method: hasId ? 'PUT' : 'POST',
      body: payload
    });
    return result?.dados?.id || nf?.id;
  };

  manager.buscarNotasFiscaisPorEmpenho = async function buscarNotasFiscaisPorEmpenho(empenhoId) {
    const result = await apiRequest(
      `/api/notas-fiscais?empenho_id=${encodeURIComponent(empenhoId)}&limite=1000&offset=0`
    );
    return (result.dados || []).map(normalizeNF);
  };

  manager.salvarEntrega = async function salvarEntrega(_entrega) {
    throw new Error('Salvar entrega local foi desativado. Use endpoint de estoque no backend PostgreSQL.');
  };

  manager.criarSaldosEmpenho = async function criarSaldosEmpenho() {
    return [];
  };

  manager.buscarSaldosEmpenho = async function buscarSaldosEmpenho() {
    return [];
  };

  manager.atualizarSaldo = async function atualizarSaldo() {
    return true;
  };

  manager.compararNotaFiscalComEmpenho = async function compararNotaFiscalComEmpenho() {
    return [];
  };

  manager.salvarArquivo = async function salvarArquivo() {
    throw new Error('Salvamento local de arquivos foi desativado no modo PostgreSQL/VPS.');
  };

  manager.buscarArquivoPorDocumento = async function buscarArquivoPorDocumento() {
    return null;
  };

  manager.get = async function get(storeName, key) {
    if (storeName !== 'config') {
      return null;
    }
    return this._serverConfigStore.get(key) || null;
  };

  manager.update = async function update(storeName, data) {
    if (storeName !== 'config') {
      return data;
    }
    if (data?.id) {
      this._serverConfigStore.set(data.id, data);
    }
    return data;
  };

  manager.getAll = async function getAll(storeName) {
    if (storeName !== 'config') {
      return [];
    }
    return Array.from(this._serverConfigStore.values());
  };

  manager.add = async function add(storeName, data) {
    if (storeName === 'config' && data?.id) {
      this._serverConfigStore.set(data.id, data);
      return data.id;
    }
    return data?.id || null;
  };

  manager.delete = async function removeById(storeName, id) {
    if (storeName === 'config') {
      this._serverConfigStore.delete(id);
      return true;
    }
    return true;
  };

  manager.remove = async function remove(storeName, id) {
    return this.delete(storeName, id);
  };

  manager.exportBackup = async function exportBackup() {
    throw new Error('Exportação de backup local desativada no modo PostgreSQL/VPS. Use rotina de backup do servidor.');
  };

  manager.importBackup = async function importBackup() {
    throw new Error(
      'Importação de backup local desativada no modo PostgreSQL/VPS. Use rotina de restauração do servidor.'
    );
  };

  manager.clear = async function clear() {
    return true;
  };

  console.warn(
    '[DB] Modo servidor PostgreSQL ativo: persistência local IndexedDB foi desativada para entidades de negócio.'
  );
}

// Instância global do gerenciador de banco de dados
if (!window.dbManager) {
  window.dbManager = new DatabaseManager();
  console.log('✅ DatabaseManager criado e anexado a window.dbManager');
}

applyServerDatabaseAdapter();

// Auto-inicializar se estiver sendo carregado como módulo
(async () => {
  try {
    if (window.dbManager && !window.dbManager.db) {
      console.log('🔄 Auto-inicializando dbManager...');
      await window.dbManager.init();
      console.log('✅ dbManager auto-inicializado com sucesso!');
    }
  } catch (error) {
    console.error('❌ Erro na auto-inicialização do dbManager:', error);
  }
})();
