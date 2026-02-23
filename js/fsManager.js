/**
 * File System Manager - VERSÃO CORRIGIDA
 * Módulo responsável por gerenciar pastas e arquivos locais usando File System Access API
 *
 * Funcionalidades:
 * - Seleção de pasta principal APENAS via botão do usuário (corrige SecurityError)
 * - Armazenamento persistente do handle no IndexedDB
 * - Verificação automática de permissões
 * - Fallback para download direto quando não há permissão
 * - Criação automática de subpastas por ano e tipo
 * - Logs claros de cada operação
 *
 * @author Sistema de Controle de Material - IF Baiano
 * @version 2.0 - Correção de SecurityError
 */

const DEBUG_FS = true;

/**
 * Detecta se está em modo servidor PostgreSQL
 */
function isServerMode() {
  return (
    window.CONFIG?.storage?.mode === 'server' ||
    window.dbManager?.db?.mode === 'server-postgres' ||
    window.dbManager?.mode === 'server-postgres' ||
    (window.dbManager?.db && typeof window.dbManager.db.transaction !== 'function')
  );
}

class FileSystemManager {
  constructor() {
    // Handle da pasta principal selecionada pelo usuário
    this.mainDirectoryHandle = null;

    // Cache de handles de pastas para melhor performance
    this.directoryCache = new Map();

    // Configurações padrão
    this.config = {
      folders: {
        empenhos: 'Empenhos',
        notasFiscais: 'NotasFiscais'
      },
      allowedExtensions: ['.pdf'],
      maxFileSize: 10 * 1024 * 1024 // 10MB
    };

    // Verificar suporte à File System Access API
    this.isSupported = 'showDirectoryPicker' in window;

    if (!this.isSupported) {
      console.warn('[FS] ⚠️ File System Access API não suportada neste navegador');
    }

    // Tentar restaurar pasta salva ao inicializar
    this.initializeAsync();
  }

  /**
   * Inicialização assíncrona para tentar restaurar pasta salva
   * @private
   */
  async initializeAsync() {
    console.log('[FS] 🔄 Inicializando FileSystemManager...');

    // Aguardar banco de dados estar pronto
    let retries = 0;
    const maxRetries = 50;

    while (retries < maxRetries) {
      if (window.dbManager?.db) {
        console.log('[FS] ✅ Banco de dados disponível');
        await this.restoreFolderReference();
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      retries++;
    }

    if (retries >= maxRetries) {
      console.warn('[FS] ⚠️ Timeout ao aguardar banco de dados');
    }
  }

  /**
   * Verifica se a File System Access API é suportada
   * @returns {boolean} True se suportada
   */
  isFileSystemAPISupported() {
    return this.isSupported;
  }

  /**
   * ⚠️ IMPORTANTE: Esta função DEVE ser chamada apenas via botão do usuário
   * Solicita ao usuário para selecionar a pasta principal onde os arquivos serão salvos
   * @returns {Promise<boolean>} True se a pasta foi selecionada com sucesso
   */
  async selectMainDirectory() {
    console.log('[FS] 🖱️ selectMainDirectory() chamada (via gesto do usuário)');

    if (!this.isSupported) {
      throw new Error('File System Access API não suportada neste navegador');
    }

    try {
      // ✅ showDirectoryPicker() APENAS aqui, chamado por botão do usuário
      console.log('[FS] 📂 Abrindo seletor de pasta...');
      this.mainDirectoryHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      console.log('[FS] ✅ Pasta selecionada:', this.mainDirectoryHandle.name);

      // Solicitar permissão explicitamente
      const permission = await this.mainDirectoryHandle.requestPermission({
        mode: 'readwrite'
      });

      if (permission !== 'granted') {
        console.error('[FS] ❌ Permissão de escrita negada');
        throw new Error('Permissão de escrita negada pelo usuário');
      }

      console.log('[FS] ✅ Permissão de escrita concedida');

      // Salvar referência da pasta no IndexedDB para uso futuro
      await this.saveFolderReference();

      // Executar teste automático de escrita
      await this.testWriteAccess();

      return true;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[FS] ℹ️ Usuário cancelou a seleção de pasta');
        return false;
      }
      console.error('[FS] ❌ Erro ao selecionar pasta principal:', error);
      throw error;
    }
  }

  /**
   * Testa a capacidade de escrita na pasta selecionada
   * Cria um arquivo de teste 'SINGEM_test.txt' para validar permissões
   * @returns {Promise<boolean>} True se o teste foi bem-sucedido
   */
  async testWriteAccess() {
    console.log('[FS] 🧪 Testando capacidade de escrita...');

    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não selecionada');
    }

    try {
      // Criar arquivo de teste
      const testFileName = 'SINGEM_test.txt';
      const testContent = `SINGEM - Teste de Escrita
Data: ${new Date().toLocaleString('pt-BR')}
Status: OK

Este é um arquivo de teste criado automaticamente pelo sistema SINGEM.
Ele pode ser excluído com segurança.`;

      const fileHandle = await this.mainDirectoryHandle.getFileHandle(testFileName, {
        create: true
      });

      const writable = await fileHandle.createWritable();
      await writable.write(testContent);
      await writable.close();

      console.log('[FS] ✅ Teste de escrita bem-sucedido - arquivo criado:', testFileName);

      // Tentar ler o arquivo para validar
      const file = await fileHandle.getFile();
      const content = await file.text();

      if (content === testContent) {
        console.log('[FS] ✅ Teste de leitura bem-sucedido - conteúdo validado');
        return true;
      } else {
        console.warn('[FS] ⚠️ Conteúdo do arquivo não corresponde ao esperado');
        return false;
      }
    } catch (error) {
      console.error('[FS] ❌ Erro no teste de escrita:', error);
      throw new Error(`Falha ao testar escrita: ${error.message}`);
    }
  }

  /**
   * Salva a referência da pasta principal no IndexedDB
   * @private
   */
  async saveFolderReference() {
    try {
      console.log('[FS] 💾 Salvando referência da pasta no IndexedDB...');

      // Em modo servidor, não usar IndexedDB
      if (isServerMode()) {
        console.info('[FS] Modo servidor: saveFolderReference ignorado');
        return;
      }

      // Verificar se o banco de dados está disponível
      if (!window.dbManager || !window.dbManager.db) {
        console.error('[FS] ❌ Banco de dados não inicializado');
        return;
      }

      // Usar IndexedDB para salvar a referência da pasta
      const transaction = window.dbManager.db.transaction(['config'], 'readwrite');
      const store = transaction.objectStore('config');

      await new Promise((resolve, reject) => {
        const request = store.put({
          id: 'mainDirectory',
          handle: this.mainDirectoryHandle,
          name: this.mainDirectoryHandle.name,
          timestamp: new Date().toISOString()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('[FS] ✅ Referência da pasta salva:', this.mainDirectoryHandle.name);
    } catch (error) {
      console.error('[FS] ❌ Erro ao salvar referência da pasta:', error);
    }
  }

  /**
   * Recupera a referência da pasta principal salva anteriormente
   * NÃO chama showDirectoryPicker() - apenas tenta reutilizar handle salvo
   * @returns {Promise<boolean>} True se recuperou com sucesso
   */
  async restoreFolderReference() {
    try {
      console.log('[FS] 🔄 Tentando restaurar pasta salva...');

      // Em modo servidor PostgreSQL, não usar IndexedDB para handles de pasta
      if (isServerMode()) {
        console.info('[FS] Modo servidor: restoreFolderReference ignorado');
        return null;
      }

      // Verificar se o banco de dados está disponível
      if (!window.dbManager || !window.dbManager.db) {
        console.warn('[FS] ⚠️ Banco de dados não disponível ainda');
        return false;
      }

      const transaction = window.dbManager.db.transaction(['config'], 'readonly');
      const store = transaction.objectStore('config');

      // Usar Promise para aguardar o resultado
      const result = await new Promise((resolve, reject) => {
        const request = store.get('mainDirectory');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (!result || !result.handle) {
        console.log('[FS] ℹ️ Nenhuma pasta salva anteriormente');
        return false;
      }

      this.mainDirectoryHandle = result.handle;
      console.log('[FS] 📂 Handle restaurado:', this.mainDirectoryHandle.name);

      // Verificar se ainda temos permissão para acessar a pasta
      try {
        const permission = await this.mainDirectoryHandle.queryPermission({ mode: 'readwrite' });
        if (DEBUG_FS) {
          console.log('[FS] queryPermission:', permission);
        }

        if (permission === 'granted') {
          console.log('[FS] ✅ Permissão válida - pasta restaurada com sucesso');
          return true;
        }

        // Se o estado for 'prompt', podemos tentar solicitar permissão UMA vez no startup
        if (permission === 'prompt') {
          if (DEBUG_FS) {
            console.log('[FS] permission is prompt - requesting once');
          }
          try {
            const requested = await this.mainDirectoryHandle.requestPermission({ mode: 'readwrite' });
            if (DEBUG_FS) {
              console.log('[FS] requestPermission:', requested);
            }
            if (requested === 'granted') {
              console.log('[FS] ✅ Permissão concedida após requestPermission');
              return true;
            }
            console.warn('[FS] ⚠️ requestPermission não concedida');
          } catch (reqErr) {
            console.warn('[FS] ⚠️ Falha ao solicitar permissão:', reqErr);
          }
        }

        // Se chegamos aqui, não há permissão
        console.warn('[FS] ⚠️ Permissão não disponível - será necessário configurar manualmente');
        this.mainDirectoryHandle = null;
        return false;
      } catch (permErr) {
        console.warn('[FS] ⚠️ Erro ao checar permissão:', permErr);
        this.mainDirectoryHandle = null;
        return false;
      }
    } catch (error) {
      console.error('[FS] ❌ Erro ao restaurar referência da pasta:', error);
      this.mainDirectoryHandle = null;
      return false;
    }
  }

  /**
   * Verifica se há pasta principal configurada e com permissão válida
   * @returns {Promise<boolean>} True se pasta disponível
   */
  async hasFolderWithPermission() {
    if (!this.mainDirectoryHandle) {
      console.log('[FS] ℹ️ Nenhuma pasta configurada');
      return false;
    }

    try {
      const permission = await this.mainDirectoryHandle.queryPermission({
        mode: 'readwrite'
      });

      const hasPermission = permission === 'granted';
      console.log('[FS] 🔐 Status da permissão:', permission, hasPermission ? '✅' : '❌');
      return hasPermission;
    } catch (error) {
      console.error('[FS] ❌ Erro ao verificar permissão:', error);
      return false;
    }
  }

  /**
   * Cria ou obtém handle de uma subpasta com estrutura hierárquica
   * ATUALIZADO: Detecta automaticamente qual estrutura usar (v1 ou v2)
   * @param {string} folderType - Tipo da pasta ('empenhos' ou 'notasFiscais')
   * @param {number} year - Ano fiscal
   * @returns {Promise<FileSystemDirectoryHandle>} Handle da pasta
   */
  async getOrCreateSubfolder(folderType, year) {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não selecionada');
    }

    try {
      // Verificar se está usando nova estrutura (v2)
      const metadados = await this.obterMetadadosEstrutura();

      if (metadados?.pastaSINGEM === 'SINGEM' || metadados?.versaoEstrutura === 'v2') {
        // Usar nova estrutura SINGEM
        return await this.getOrCreateSubfolderV2(folderType, year, metadados);
      }

      // Fallback: estrutura antiga
      return await this.getOrCreateSubfolderLegacy(folderType, year);
    } catch (error) {
      console.error('[FS] ❌ Erro ao obter/criar subpasta:', error);
      throw error;
    }
  }

  /**
   * NOVA ESTRUTURA V2: Usa pastas padronizadas SINGEM
   * Estrutura: SINGEM/[UNIDADE]/01_EMPENHOS/<ANO>/
   */
  async getOrCreateSubfolderV2(folderType, year, metadados) {
    const STRUCTURE = FileSystemManager.FOLDER_STRUCTURE;

    let pastaPrincipal;
    switch (folderType) {
      case 'empenhos':
        pastaPrincipal = STRUCTURE.EMPENHOS;
        break;
      case 'notasFiscais':
      case 'notas_fiscais':
        pastaPrincipal = STRUCTURE.NOTAS_FISCAIS;
        break;
      default:
        throw new Error(`Tipo de pasta desconhecido: ${folderType}`);
    }

    // Cache key
    const unidadePasta = metadados?.unidadePasta || '';
    const cacheKey = `v2:${unidadePasta}/${pastaPrincipal}/${year}`;

    if (this.directoryCache.has(cacheKey)) {
      console.log('[FS] 📦 Usando pasta do cache (v2):', cacheKey);
      return this.directoryCache.get(cacheKey);
    }

    console.log('[FS] 📁 Criando estrutura v2:', cacheKey);

    // Navegar até a raiz correta
    let rootHandle = this.mainDirectoryHandle;

    if (unidadePasta) {
      rootHandle = await this.mainDirectoryHandle.getDirectoryHandle(unidadePasta, { create: true });
    }

    // Obter pasta principal (01_EMPENHOS ou 02_NOTAS_FISCAIS)
    const tipoHandle = await rootHandle.getDirectoryHandle(pastaPrincipal, { create: true });

    // Obter pasta do ano
    const anoHandle = await tipoHandle.getDirectoryHandle(year.toString(), { create: true });

    // Salvar no cache
    this.directoryCache.set(cacheKey, anoHandle);
    console.log('[FS] ✅ Estrutura v2 pronta:', cacheKey);

    return anoHandle;
  }

  /**
   * ESTRUTURA LEGADO: Mantida para compatibilidade
   * Estrutura: [Raiz]/[Abreviação Unidade]/[Ano]/[Tipo Documento]
   */
  async getOrCreateSubfolderLegacy(folderType, year) {
    // Obter configuração da estrutura de pastas
    const configPastas = await this.obterConfigEstrutura();

    // Usar valores padrão se não houver configuração
    let abreviacaoUnidade = 'SINGEM';
    if (configPastas && configPastas.unidade && configPastas.unidade.abreviacao) {
      abreviacaoUnidade = configPastas.unidade.abreviacao;
    } else {
      console.warn('[FS] ⚠️ Estrutura de pastas não configurada - usando padrão:', abreviacaoUnidade);
    }

    const nomeTipoPasta = folderType === 'empenhos' ? 'Notas de Empenho' : 'Notas Fiscais';

    // Verificar no cache primeiro
    const cacheKey = `legacy:${abreviacaoUnidade}/${year}/${nomeTipoPasta}`;
    if (this.directoryCache.has(cacheKey)) {
      console.log('[FS] 📦 Usando pasta do cache (legacy):', cacheKey);
      return this.directoryCache.get(cacheKey);
    }

    console.log('[FS] 📁 Criando estrutura legacy:', cacheKey);

    try {
      // 1. Criar/obter pasta da unidade (ex: "IF Guanambi")
      let pastaUnidade;
      try {
        pastaUnidade = await this.mainDirectoryHandle.getDirectoryHandle(abreviacaoUnidade);
        console.log('[FS] ✅ Pasta unidade encontrada:', abreviacaoUnidade);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          pastaUnidade = await this.mainDirectoryHandle.getDirectoryHandle(abreviacaoUnidade, { create: true });
          console.log('[FS] ✅ Pasta unidade criada:', abreviacaoUnidade);
        } else {
          throw error;
        }
      }

      // 2. Criar/obter pasta do ano dentro da pasta da unidade
      let pastaAno;
      const yearStr = year.toString();
      try {
        pastaAno = await pastaUnidade.getDirectoryHandle(yearStr);
        console.log('[FS] ✅ Pasta ano encontrada:', yearStr);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          pastaAno = await pastaUnidade.getDirectoryHandle(yearStr, {
            create: true
          });
          console.log('[FS] ✅ Pasta ano criada:', yearStr);
        } else {
          throw error;
        }
      }

      // 3. Criar/obter pasta do tipo de documento
      let pastaTipo;
      try {
        pastaTipo = await pastaAno.getDirectoryHandle(nomeTipoPasta);
        console.log('[FS] ✅ Pasta tipo encontrada:', nomeTipoPasta);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          pastaTipo = await pastaAno.getDirectoryHandle(nomeTipoPasta, {
            create: true
          });
          console.log('[FS] ✅ Pasta tipo criada:', nomeTipoPasta);
        } else {
          throw error;
        }
      }

      // Salvar no cache
      this.directoryCache.set(cacheKey, pastaTipo);
      console.log('[FS] ✅ Estrutura completa criada:', cacheKey);

      return pastaTipo;
    } catch (error) {
      console.error('[FS] ❌ Erro ao criar/obter estrutura de pastas:', error);
      throw error;
    }
  }

  /**
   * Obtém configuração da estrutura de pastas do IndexedDB
   * @returns {Promise<Object|null>} Configuração ou null
   */
  async obterConfigEstrutura() {
    try {
      if (!window.dbManager || !window.dbManager.db) {
        console.warn('⚠️ dbManager não disponível');
        return null;
      }

      const config = await window.dbManager.get('config', 'estruturaPastas');
      return config;
    } catch (error) {
      console.error('Erro ao obter configuração:', error);
      return null;
    }
  }

  /**
   * Extrai o ano de um arquivo PDF ou solicita ao usuário
   * @param {File} file - Arquivo PDF
   * @param {string} extractedText - Texto extraído do PDF (opcional)
   * @returns {Promise<number>} Ano fiscal
   */
  async extractOrRequestYear(file, extractedText = '') {
    let year = null;

    // Tentar extrair ano do nome do arquivo
    const fileNameMatch = file.name.match(/20(\d{2})/);
    if (fileNameMatch) {
      year = parseInt('20' + fileNameMatch[1]);
    }

    // Tentar extrair ano do conteúdo do PDF
    if (!year && extractedText) {
      const datePatterns = [
        /(\d{2})\/(\d{2})\/(20\d{2})/g, // DD/MM/YYYY
        /(20\d{2})-(\d{2})-(\d{2})/g, // YYYY-MM-DD
        /Data.*?(\d{2})\/(\d{2})\/(20\d{2})/g // Data: DD/MM/YYYY
      ];

      for (const pattern of datePatterns) {
        const matches = [...extractedText.matchAll(pattern)];
        if (matches.length > 0) {
          // Pegar o ano da primeira data encontrada
          const match = matches[0];
          year = parseInt(match[3] || match[1]); // Dependendo do padrão
          break;
        }
      }
    }

    // Se não conseguiu extrair, solicitar ao usuário
    if (!year) {
      const currentYear = new Date().getFullYear();
      const userInput = prompt(
        `Não foi possível determinar o ano fiscal automaticamente.\n` + `Por favor, informe o ano fiscal do documento:`,
        currentYear.toString()
      );

      if (userInput) {
        const inputYear = parseInt(userInput);
        if (inputYear >= 2000 && inputYear <= currentYear + 10) {
          year = inputYear;
        } else {
          throw new Error('Ano fiscal inválido');
        }
      } else {
        throw new Error('Ano fiscal é obrigatório');
      }
    }

    return year;
  }

  /**
   * Salva um arquivo PDF na pasta correspondente
   * @param {File} file - Arquivo PDF a ser salvo
   * @param {string} folderType - Tipo da pasta ('empenhos' ou 'notasFiscais')
   * @param {string} extractedText - Texto extraído do PDF (para determinar ano)
   * @returns {Promise<Object>} Informações do arquivo salvo
   */
  /**
   * Gera nome padronizado para arquivo de NE ou NF
   * @param {string} tipo - Tipo do documento ('empenhos' ou 'notasFiscais')
   * @param {string} numero - Número do documento
   * @param {string} fornecedor - Nome do fornecedor
   * @returns {string} Nome do arquivo padronizado
   */
  gerarNomeArquivoPadronizado(tipo, numero, fornecedor) {
    // Define prefixo baseado no tipo
    const prefixo = tipo === 'empenhos' ? 'NE' : 'NF';

    // Limpa e normaliza o número (remove zeros à esquerda, mas mantém formato)
    const numeroLimpo = numero ? numero.toString().trim() : 'SEM_NUMERO';

    // Processa o fornecedor
    let fornecedorPadronizado = 'FORNECEDOR';
    if (fornecedor && typeof fornecedor === 'string') {
      // Remove acentos
      const semAcentos = fornecedor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

      // Remove caracteres especiais, mantém apenas letras, números e espaços
      const somenteValidos = semAcentos.replace(/[^a-zA-Z0-9\s]/g, ' ');

      // Remove espaços múltiplos
      const espacosNormalizados = somenteValidos.replace(/\s+/g, ' ').trim();

      // Pega os dois primeiros nomes
      const palavras = espacosNormalizados.split(' ');
      const doisPrimeiros = palavras.slice(0, 2).join(' ');

      // Converte para maiúsculas
      fornecedorPadronizado = doisPrimeiros.toUpperCase() || 'FORNECEDOR';
    }

    // Monta o nome final
    const nomeArquivo = `${prefixo} ${numeroLimpo} ${fornecedorPadronizado}.pdf`;

    console.log(`📝 Nome padronizado gerado: ${nomeArquivo}`);
    return nomeArquivo;
  }

  /**
   * Salva arquivo PDF na estrutura de pastas local
   * @param {File} file - Arquivo a ser salvo
   * @param {string} folderType - Tipo da pasta ('empenhos' ou 'notasFiscais')
   * @param {string} extractedText - Texto extraído do PDF (para determinar ano)
   * @param {Object} metadados - Metadados do documento (numero, fornecedor, etc.)
   * @returns {Promise<Object>} Informações do arquivo salvo
   */
  async saveFile(file, folderType, extractedText = '', metadados = {}) {
    console.log('[FS] 📝 saveFile() iniciado');
    console.log('[FS] 📄 Arquivo:', file.name);
    console.log('[FS] 📋 Metadados:', metadados);

    if (!this.isSupported) {
      throw new Error('File System Access API não suportada');
    }

    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não selecionada');
    }

    // Validar arquivo
    this.validateFile(file);

    try {
      // Determinar o ano fiscal
      console.log('[FS] 📅 Determinando ano fiscal...');
      const year = await this.extractOrRequestYear(file, extractedText);
      console.log('[FS] ✅ Ano fiscal:', year);

      // Obter/criar a pasta de destino
      console.log('[FS] 📁 Obtendo/criando pasta de destino...');
      const targetFolder = await this.getOrCreateSubfolder(folderType, year);
      console.log('[FS] ✅ Pasta de destino obtida');

      // Gerar nome padronizado do arquivo
      let fileName = file.name; // Nome padrão (fallback)

      // Se temos metadados, gerar nome padronizado
      if (metadados && metadados.numero && metadados.fornecedor) {
        fileName = this.gerarNomeArquivoPadronizado(folderType, metadados.numero, metadados.fornecedor);
        console.log('[FS] 📝 Nome padronizado:', fileName);
      } else {
        console.log('[FS] ⚠️ Sem metadados - usando nome original:', fileName);
      }

      // Verificar se arquivo já existe e gerar nome único
      let finalFileName = fileName;
      let counter = 1;

      console.log('[FS] 🔍 Verificando se arquivo já existe...');
      while (await this.fileExists(targetFolder, finalFileName)) {
        const nameWithoutExt = fileName.replace(/\.pdf$/i, '');
        finalFileName = `${nameWithoutExt}_${counter}.pdf`;
        counter++;
        console.log('[FS] ⚠️ Arquivo existe - tentando:', finalFileName);
      }
      console.log('[FS] ✅ Nome final:', finalFileName);

      // Criar o arquivo na pasta
      console.log('[FS] ✍️ Criando arquivo...');
      const fileHandle = await targetFolder.getFileHandle(finalFileName, {
        create: true
      });
      console.log('[FS] ✅ FileHandle obtido');

      console.log('[FS] 📝 Abrindo writable...');
      const writable = await fileHandle.createWritable();
      console.log('[FS] ✅ Writable aberto');

      // Escrever o conteúdo do arquivo
      console.log('[FS] 💾 Escrevendo conteúdo...');
      await writable.write(file);
      console.log('[FS] ✅ Conteúdo escrito');

      console.log('[FS] 🔒 Fechando arquivo...');
      await writable.close();
      console.log('[FS] ✅ Arquivo fechado com sucesso!');

      // Obter configuração para caminho completo
      const configPastas = await this.obterConfigEstrutura();
      const unidade = configPastas?.unidade?.abreviacao || 'SINGEM';
      const tipoPasta = folderType === 'empenhos' ? 'Notas de Empenho' : 'Notas Fiscais';

      // Informações do arquivo salvo
      const fileInfo = {
        originalName: file.name,
        savedName: finalFileName,
        folderType: folderType,
        year: year,
        size: file.size,
        timestamp: new Date().toISOString(),
        path: `${this.config.folders[folderType]}/${year}/${finalFileName}`,
        caminhoRelativo: `${unidade}/${year}/${tipoPasta}/${finalFileName}`
      };

      // Log detalhado
      console.log('[FS] ✅✅✅ ARQUIVO SALVO COM SUCESSO! ✅✅✅');
      console.log('[FS] 📝 Nome salvo:', finalFileName);
      console.log('[FS] 📁 Caminho:', fileInfo.caminhoRelativo);

      return fileInfo;
    } catch (error) {
      console.error('[FS] ❌❌❌ ERRO AO SALVAR:', error);
      console.error('[FS] 📚 Stack:', error.stack);
      throw error;
    }
  }

  /**
   * Verifica se um arquivo já existe na pasta
   * @param {FileSystemDirectoryHandle} directoryHandle - Handle da pasta
   * @param {string} fileName - Nome do arquivo
   * @returns {Promise<boolean>} True se o arquivo existe
   */
  async fileExists(directoryHandle, fileName) {
    try {
      await directoryHandle.getFileHandle(fileName);
      return true;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return false;
      }
      throw error;
    }
  }

  /**
   * ✅ NOVA FUNÇÃO: Salva arquivo com fallback automático
   *
   * Esta função resolve o SecurityError implementando 3 estratégias:
   * 1. Tenta salvar na pasta configurada (se permissão válida)
   * 2. Se não tiver permissão, mostra mensagem pedindo para clicar no botão
   * 3. Se falhar ou não tiver pasta, faz download automático
   *
   * @param {File} file - Arquivo a ser salvo
   * @param {string} folderType - Tipo da pasta ('empenhos' ou 'notasFiscais')
   * @param {string} extractedText - Texto extraído do PDF
   * @param {Object} metadados - Metadados (numero, fornecedor, etc.)
   * @returns {Promise<Object>} Resultado da operação
   */
  async saveFileWithFallback(file, folderType, extractedText = '', metadados = {}) {
    console.log('[FS] 💾 Iniciando salvamento com fallback...');
    console.log('[FS] 📄 Arquivo:', file.name, '|', (file.size / 1024).toFixed(2), 'KB');

    // Validar arquivo primeiro
    try {
      this.validateFile(file);
    } catch (error) {
      console.error('[FS] ❌ Arquivo inválido:', error.message);
      throw error;
    }

    // Estratégia 1: Tentar salvar na pasta configurada
    if (this.isSupported && this.mainDirectoryHandle) {
      console.log('[FS] 🔍 Verificando permissão da pasta configurada...');

      const hasPermission = await this.hasFolderWithPermission();

      if (hasPermission) {
        console.log('[FS] ✅ Permissão válida - salvando na pasta local...');
        try {
          const result = await this.saveFile(file, folderType, extractedText, metadados);
          console.log('[FS] ✅ Arquivo salvo com sucesso na pasta local!');
          return {
            success: true,
            method: 'local',
            message: 'Arquivo salvo na pasta local configurada',
            ...result
          };
        } catch (error) {
          console.error('[FS] ❌ Erro ao salvar na pasta local:', error);
          // Continua para fallback
        }
      } else {
        console.warn('[FS] ⚠️ Sem permissão válida para a pasta');
      }
    }

    // Estratégia 2: Mostrar mensagem para usuário configurar pasta
    if (this.isSupported && !this.mainDirectoryHandle) {
      console.log('[FS] ℹ️ Pasta não configurada - mostrando mensagem ao usuário');
      this.showConfigureFolderMessage();
    }

    // Estratégia 3: Fallback - Download automático
    console.log('[FS] 🔄 Fazendo fallback para download automático...');
    const downloadResult = await this.downloadFile(file, folderType, metadados);

    console.log('[FS] ✅ Download automático concluído');
    return {
      success: true,
      method: 'download',
      message: 'Arquivo baixado automaticamente (pasta não configurada ou sem permissão)',
      ...downloadResult
    };
  }

  /**
   * Mostra mensagem orientando usuário a configurar pasta
   * @private
   */
  showConfigureFolderMessage() {
    const message = document.getElementById('fs-config-message');
    if (message) {
      message.style.display = 'block';
      console.log('[FS] 💬 Mensagem de configuração exibida');

      // Ocultar após 10 segundos
      setTimeout(() => {
        message.style.display = 'none';
      }, 10000);
    }
  }

  /**
   * Faz download direto do arquivo (fallback)
   * @param {File} file - Arquivo a ser baixado
   * @param {string} folderType - Tipo da pasta
   * @param {Object} metadados - Metadados para nome do arquivo
   * @returns {Promise<Object>} Informações do download
   */
  async downloadFile(file, folderType, metadados = {}) {
    console.log('[FS] 📥 Iniciando download direto...');

    // Gerar nome padronizado se temos metadados
    let fileName = file.name;
    if (metadados && metadados.numero && metadados.fornecedor) {
      fileName = this.gerarNomeArquivoPadronizado(folderType, metadados.numero, metadados.fornecedor);
    }

    console.log('[FS] 📝 Nome do arquivo:', fileName);

    // Criar URL do blob
    const url = URL.createObjectURL(file);

    // Criar link temporário e clicar
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();

    // Limpar
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);

    console.log('[FS] ✅ Download iniciado:', fileName);

    return {
      fileName: fileName,
      originalName: file.name,
      size: file.size,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Valida se o arquivo atende aos critérios
   * @param {File} file - Arquivo a ser validado
   * @throws {Error} Se o arquivo não for válido
   */
  validateFile(file) {
    // Verificar extensão
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!this.config.allowedExtensions.includes(extension)) {
      throw new Error(`Tipo de arquivo não permitido. Use: ${this.config.allowedExtensions.join(', ')}`);
    }

    // Verificar tamanho
    if (file.size > this.config.maxFileSize) {
      const maxSizeMB = this.config.maxFileSize / (1024 * 1024);
      throw new Error(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
    }

    // Verificar se não está vazio
    if (file.size === 0) {
      throw new Error('Arquivo vazio não é permitido');
    }
  } /**
   * Abre a pasta correspondente no explorador do sistema
   * @param {string} folderType - Tipo da pasta ('empenhos' ou 'notasFiscais')
   * @param {number} year - Ano fiscal (opcional, abre pasta raiz do tipo se não especificado)
   */
  async openFolder(folderType, year = null) {
    if (!this.isSupported) {
      throw new Error('File System Access API não suportada');
    }

    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não selecionada');
    }

    try {
      if (year) {
        // Abrir pasta específica do ano usando estrutura hierárquica
        await this.getOrCreateSubfolder(folderType, year);
      } else {
        // Sem ano especificado, usar ano atual
        const currentYear = new Date().getFullYear();
        await this.getOrCreateSubfolder(folderType, currentYear);
      }

      // Nota: A File System Access API não tem método direto para abrir no explorador
      // Esta funcionalidade precisaria de uma extensão ou ser implementada diferentemente
      console.log('Pasta acessível via estrutura hierárquica');

      // Alternativa: mostrar modal com instruções para o usuário
      this.showFolderInstructions(folderType, year);
    } catch (error) {
      console.error('Erro ao abrir pasta:', error);
      throw error;
    }
  }

  /**
   * Mostra instruções para o usuário encontrar a pasta
   * @param {string} folderType - Tipo da pasta
   * @param {number} year - Ano (opcional)
   */
  async showFolderInstructions(folderType, year = null) {
    try {
      const configPastas = await this.obterConfigEstrutura();
      const unidade = configPastas?.unidade?.abreviacao || 'Unidade';
      const anoAtual = year || new Date().getFullYear();
      const nomeTipoPasta = folderType === 'empenhos' ? 'Notas de Empenho' : 'Notas Fiscais';

      const path = `${unidade}/${anoAtual}/${nomeTipoPasta}`;

      alert(
        `Para acessar os arquivos:\n\n` +
          `1. Abra o explorador de arquivos\n` +
          `2. Navegue até a pasta: "${this.mainDirectoryHandle.name}"\n` +
          `3. Entre na pasta: "${path}"\n\n` +
          `Os arquivos PDF estão salvos nesta localização.`
      );
    } catch (error) {
      console.error('Erro ao mostrar instruções:', error);
    }
  }

  /**
   * Obtém informações sobre o uso do sistema de arquivos
   * @returns {Promise<Object>} Estatísticas de uso
   */
  async getStorageStats() {
    if (!this.mainDirectoryHandle) {
      return null;
    }

    try {
      const configPastas = await this.obterConfigEstrutura();
      const unidade = configPastas?.unidade?.abreviacao;

      if (!unidade) {
        console.warn('⚠️ Estrutura não configurada');
        return null;
      }

      const stats = {
        mainFolder: this.mainDirectoryHandle.name,
        unidade: unidade,
        folders: {
          empenhos: { name: 'Notas de Empenho', years: {}, totalFiles: 0 },
          notasFiscais: { name: 'Notas Fiscais', years: {}, totalFiles: 0 }
        },
        totalFiles: 0
      };

      // Navegar pela estrutura hierárquica: Unidade > Ano > Tipo
      try {
        const pastaUnidade = await this.mainDirectoryHandle.getDirectoryHandle(unidade);

        // Iterar pelos anos
        for await (const [anoNome, anoHandle] of pastaUnidade.entries()) {
          if (anoHandle.kind === 'directory') {
            // Dentro de cada ano, verificar as pastas de tipos
            for await (const [tipoPasta, tipoHandle] of anoHandle.entries()) {
              if (tipoHandle.kind === 'directory') {
                const fileCount = await this.countFilesInDirectory(tipoHandle);

                // Identificar o tipo
                let tipo = null;
                if (tipoPasta === 'Notas de Empenho' || tipoPasta === 'Empenhos') {
                  tipo = 'empenhos';
                } else if (tipoPasta === 'Notas Fiscais' || tipoPasta === 'NotasFiscais') {
                  tipo = 'notasFiscais';
                }

                if (tipo) {
                  stats.folders[tipo].years[anoNome] = fileCount;
                  stats.folders[tipo].totalFiles += fileCount;
                  stats.totalFiles += fileCount;
                }
              }
            }
          }
        }
      } catch (error) {
        console.log(`Pasta da unidade ${unidade} ainda não existe`);
      }

      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas:', error);
      return null;
    }
  }

  /**
   * Conta arquivos em um diretório
   * @param {FileSystemDirectoryHandle} directoryHandle - Handle do diretório
   * @returns {Promise<number>} Número de arquivos
   */
  async countFilesInDirectory(directoryHandle) {
    let count = 0;

    try {
      for await (const [_name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'file') {
          count++;
        }
      }
    } catch (error) {
      console.error('Erro ao contar arquivos:', error);
    }

    return count;
  }

  /**
   * Remove a configuração de pasta principal
   */
  async clearFolderReference() {
    try {
      // Em modo servidor, não usar IndexedDB
      if (isServerMode()) {
        console.info('[FS] Modo servidor: clearFolderReference ignorado');
        this.mainDirectoryHandle = null;
        this.directoryCache.clear();
        return;
      }

      if (!window.dbManager || !window.dbManager.db) {
        console.error('Banco de dados não inicializado');
        return;
      }

      const transaction = window.dbManager.db.transaction(['config'], 'readwrite');
      const store = transaction.objectStore('config');

      await new Promise((resolve, reject) => {
        const request = store.delete('mainDirectory');
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      this.mainDirectoryHandle = null;
      this.directoryCache.clear();

      console.log('✅ Referência de pasta removida');
    } catch (error) {
      console.error('Erro ao remover referência de pasta:', error);
    }
  }

  /**
   * Verifica se um arquivo ainda existe no sistema de arquivos
   * @param {string} caminhoRelativo - Caminho relativo do arquivo
   * @returns {Promise<boolean>} True se o arquivo existe
   */
  async verificarArquivoExiste(caminhoRelativo) {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não configurada');
    }

    try {
      const partes = caminhoRelativo.split('/');
      let currentHandle = this.mainDirectoryHandle;

      // Navegar até o arquivo
      for (let i = 0; i < partes.length - 1; i++) {
        currentHandle = await currentHandle.getDirectoryHandle(partes[i]);
      }

      // Verificar se o arquivo existe
      const nomeArquivo = partes[partes.length - 1];
      await currentHandle.getFileHandle(nomeArquivo);
      return true;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        return false;
      }
      throw error;
    }
  }

  /**
   * Exclui um arquivo do sistema de arquivos E do banco de dados
   * @param {number} documentoId - ID do documento no banco (empenho ou NF)
   * @param {string} tipo - Tipo do documento ('empenho' ou 'notaFiscal')
   * @returns {Promise<Object>} Resultado da exclusão
   */
  async excluirDocumento(documentoId, tipo) {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não configurada');
    }

    try {
      // 1. Buscar informações do arquivo no banco
      const arquivo = await window.dbManager.buscarArquivoPorDocumento(documentoId, tipo);

      if (!arquivo) {
        // Se não tem arquivo vinculado, só excluir o registro do banco
        if (tipo === 'empenho') {
          await window.dbManager.delete('empenhos', documentoId);
          // Excluir saldos relacionados
          const saldos = await window.dbManager.getByIndex('saldosEmpenhos', 'empenhoId', documentoId);
          for (const saldo of saldos) {
            await window.dbManager.delete('saldosEmpenhos', saldo.id);
          }
        } else if (tipo === 'notaFiscal') {
          await window.dbManager.delete('notasFiscais', documentoId);
        }

        return {
          sucesso: true,
          arquivoExcluido: false,
          mensagem: 'Registro excluído do banco de dados'
        };
      }

      // 2. Excluir arquivo físico
      let arquivoExcluido = false;
      try {
        const partes = arquivo.caminhoRelativo.split('/');
        let currentHandle = this.mainDirectoryHandle;

        // Navegar até a pasta do arquivo
        for (let i = 0; i < partes.length - 1; i++) {
          currentHandle = await currentHandle.getDirectoryHandle(partes[i]);
        }

        // Excluir o arquivo
        const nomeArquivo = partes[partes.length - 1];
        await currentHandle.removeEntry(nomeArquivo);
        arquivoExcluido = true;
        console.log(`✅ Arquivo físico excluído: ${arquivo.caminhoRelativo}`);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          console.warn('Arquivo já foi excluído externamente');
        } else {
          console.error('Erro ao excluir arquivo físico:', error);
          throw error;
        }
      }

      // 3. Excluir registro do arquivo no banco
      await window.dbManager.delete('arquivos', arquivo.id);

      // 4. Excluir registro do documento
      if (tipo === 'empenho') {
        await window.dbManager.delete('empenhos', documentoId);
        // Excluir saldos relacionados
        const saldos = await window.dbManager.getByIndex('saldosEmpenhos', 'empenhoId', documentoId);
        for (const saldo of saldos) {
          await window.dbManager.delete('saldosEmpenhos', saldo.id);
        }
      } else if (tipo === 'notaFiscal') {
        await window.dbManager.delete('notasFiscais', documentoId);
      }

      return {
        sucesso: true,
        arquivoExcluido: arquivoExcluido,
        caminhoArquivo: arquivo.caminhoRelativo,
        mensagem: 'Documento excluído com sucesso'
      };
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      throw error;
    }
  }

  /**
   * Sincroniza banco de dados com sistema de arquivos
   * Remove registros de arquivos que foram deletados externamente
   * @returns {Promise<Object>} Relatório de sincronização
   */
  async sincronizarArquivos() {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não configurada');
    }

    try {
      const resultado = {
        empenhos: { verificados: 0, removidos: 0, arquivos: [] },
        notasFiscais: { verificados: 0, removidos: 0, arquivos: [] }
      };

      // Buscar todos os arquivos registrados
      const arquivos = await window.dbManager.getAll('arquivos');

      for (const arquivo of arquivos) {
        const tipo = arquivo.tipoDocumento === 'empenho' ? 'empenhos' : 'notasFiscais';
        resultado[tipo].verificados++;

        // Verificar se o arquivo ainda existe
        const existe = await this.verificarArquivoExiste(arquivo.caminhoRelativo);

        if (!existe) {
          // Arquivo foi deletado externamente - remover do banco
          await window.dbManager.delete('arquivos', arquivo.id);

          // Marcar documento como "sem arquivo"
          const documento =
            arquivo.tipoDocumento === 'empenho'
              ? await window.dbManager.buscarEmpenhoPorId(arquivo.documentoId)
              : await window.dbManager.get('notasFiscais', arquivo.documentoId);

          if (documento) {
            console.log(
              `[SYNC] Marcando como deletado: ${arquivo.tipoDocumento} ID ${arquivo.documentoId} - Número ${documento.numero}`
            );

            documento.arquivoDeletado = true;
            documento.arquivoDeletadoEm = new Date().toISOString();

            if (arquivo.tipoDocumento === 'empenho') {
              await window.dbManager.salvarEmpenho(documento);
              console.log(`[SYNC] ✅ Empenho ${documento.numero} atualizado com arquivoDeletado=true`);
            } else {
              await window.dbManager.salvarNotaFiscal(documento);
            }
          }

          resultado[tipo].removidos++;
          resultado[tipo].arquivos.push({
            id: arquivo.documentoId,
            numero: documento?.numero || 'Desconhecido',
            caminho: arquivo.caminhoRelativo
          });

          console.warn(`⚠️ Arquivo deletado externamente: ${arquivo.caminhoRelativo}`);
        }
      }

      return resultado;
    } catch (error) {
      console.error('Erro ao sincronizar arquivos:', error);
      throw error;
    }
  }

  /**
   * Impede exclusão de pastas configuradas (proteção)
   * Verifica integridade das pastas principais
   * @returns {Promise<Object>} Status das pastas
   */
  async verificarIntegridadePastas() {
    if (!this.mainDirectoryHandle) {
      return { erro: 'Pasta principal não configurada' };
    }

    try {
      const configPastas = await this.obterConfigEstrutura();
      const unidade = configPastas?.unidade?.abreviacao;

      if (!unidade) {
        return { erro: 'Estrutura de pastas não configurada' };
      }

      const status = {
        pastaPrincipal: this.mainDirectoryHandle.name,
        unidade: unidade,
        pastaUnidadeExiste: false,
        anos: {}
      };

      // Verificar se a pasta da unidade existe
      try {
        const pastaUnidade = await this.mainDirectoryHandle.getDirectoryHandle(unidade);
        status.pastaUnidadeExiste = true;

        // Verificar anos e suas subpastas
        for await (const [anoNome, anoHandle] of pastaUnidade.entries()) {
          if (anoHandle.kind === 'directory') {
            status.anos[anoNome] = {
              existe: true,
              subpastas: {}
            };

            // Verificar subpastas dentro do ano
            for await (const [tipoPasta, tipoHandle] of anoHandle.entries()) {
              if (tipoHandle.kind === 'directory') {
                const arquivos = await this.countFilesInDirectory(tipoHandle);
                status.anos[anoNome].subpastas[tipoPasta] = {
                  existe: true,
                  quantidadeArquivos: arquivos
                };
              }
            }
          }
        }
      } catch (error) {
        if (error.name === 'NotFoundError') {
          status.pastaUnidadeExiste = false;
          status.erro = `Pasta da unidade "${unidade}" foi deletada externamente`;
        } else {
          throw error;
        }
      }

      return status;
    } catch (error) {
      console.error('Erro ao verificar integridade:', error);
      throw error;
    }
  }

  /**
   * Reconstroi pastas que foram deletadas externamente
   * @returns {Promise<Array>} Lista de pastas recriadas
   */
  async repararEstruturaPastas() {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não configurada');
    }

    const pastasRecriadas = [];

    try {
      const configPastas = await this.obterConfigEstrutura();
      const unidade = configPastas?.unidade?.abreviacao;

      if (!unidade) {
        throw new Error('Estrutura não configurada. Configure em Arquivos primeiro.');
      }

      // 1. Verificar/criar pasta da unidade
      let pastaUnidade;
      try {
        pastaUnidade = await this.mainDirectoryHandle.getDirectoryHandle(unidade);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          pastaUnidade = await this.mainDirectoryHandle.getDirectoryHandle(unidade, { create: true });
          pastasRecriadas.push(unidade);
          console.log(`✅ Pasta da unidade recriada: ${unidade}`);
        } else {
          throw error;
        }
      }

      // 2. Verificar/criar pasta do ano atual
      const anoAtual = new Date().getFullYear().toString();
      let pastaAno;
      try {
        pastaAno = await pastaUnidade.getDirectoryHandle(anoAtual);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          pastaAno = await pastaUnidade.getDirectoryHandle(anoAtual, { create: true });
          pastasRecriadas.push(`${unidade}/${anoAtual}`);
          console.log(`✅ Pasta do ano recriada: ${unidade}/${anoAtual}`);
        } else {
          throw error;
        }
      }

      // 3. Verificar/criar pastas de tipos de documentos
      const tiposDocumento = ['Notas de Empenho', 'Notas Fiscais'];
      for (const tipoPasta of tiposDocumento) {
        try {
          await pastaAno.getDirectoryHandle(tipoPasta);
        } catch (error) {
          if (error.name === 'NotFoundError') {
            await pastaAno.getDirectoryHandle(tipoPasta, { create: true });
            pastasRecriadas.push(`${unidade}/${anoAtual}/${tipoPasta}`);
            console.log(`✅ Pasta recriada: ${unidade}/${anoAtual}/${tipoPasta}`);
          }
        }
      }

      return pastasRecriadas;
    } catch (error) {
      console.error('Erro ao reparar estrutura:', error);
      throw error;
    }
  }

  // ==================== NOVAS FUNCIONALIDADES: PROTEÇÃO E LIXEIRA ====================

  /**
   * Seleciona pasta raiz única (com persistência)
   */
  async selectRootOnce() {
    const hasRoot = await this.restoreFolderReference();

    if (hasRoot) {
      console.log('✅ Root já configurado');

      if (navigator.storage && navigator.storage.persist) {
        const isPersisted = await navigator.storage.persist();
        if (isPersisted) {
          console.log('✅ Storage persistente concedido');
        }
      }

      return true;
    }

    const selected = await this.selectMainDirectory();

    if (selected && navigator.storage && navigator.storage.persist) {
      await navigator.storage.persist();
    }

    return selected;
  }

  /**
   * Garante pastas do ano (Empenhos, NotasFiscais, Relatorios, Lixeira)
   */
  async ensureYearFolders(year) {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta raiz não selecionada. Use selectRootOnce()');
    }

    const yearStr = year.toString();
    const types = ['Empenhos', 'NotasFiscais', 'Relatorios', 'Lixeira'];
    const created = [];

    // Pasta do ano
    let yearFolder;
    try {
      yearFolder = await this.mainDirectoryHandle.getDirectoryHandle(yearStr);
    } catch (error) {
      if (error.name === 'NotFoundError') {
        yearFolder = await this.mainDirectoryHandle.getDirectoryHandle(yearStr, { create: true });
        created.push(yearStr);
        console.log(`📁 Pasta criada: ${yearStr}`);
      } else {
        throw error;
      }
    }

    // Subpastas de tipos
    for (const type of types) {
      try {
        await yearFolder.getDirectoryHandle(type);
      } catch (error) {
        if (error.name === 'NotFoundError') {
          const typeFolder = await yearFolder.getDirectoryHandle(type, { create: true });
          created.push(`${yearStr}/${type}`);
          console.log(`📁 Pasta criada: ${yearStr}/${type}`);

          if (window.integrityManager) {
            await window.integrityManager.updateManifest(typeFolder);
            await window.integrityManager.createLockFile(typeFolder);
          }
        } else {
          throw error;
        }
      }
    }

    return created;
  }

  /**
   * Obtém handle de pasta (tipo + ano)
   */
  async getFolderHandle(type, year) {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta raiz não selecionada');
    }

    const yearStr = year.toString();
    const cacheKey = `${yearStr}/${type}`;

    if (this.directoryCache.has(cacheKey)) {
      return this.directoryCache.get(cacheKey);
    }

    try {
      const yearFolder = await this.mainDirectoryHandle.getDirectoryHandle(yearStr);
      const typeFolder = await yearFolder.getDirectoryHandle(type);

      this.directoryCache.set(cacheKey, typeFolder);

      return typeFolder;
    } catch (error) {
      if (error.name === 'NotFoundError') {
        await this.ensureYearFolders(year);
        return this.getFolderHandle(type, year);
      }
      throw error;
    }
  }

  /**
   * Salva PDF na pasta correta e atualiza manifesto
   */
  async savePdf(type, year, file, fileName) {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta raiz não selecionada');
    }

    await this.ensureYearFolders(year);
    const folderHandle = await this.getFolderHandle(type, year);
    const sanitizedName = this.sanitizeFileName(fileName);

    const fileHandle = await folderHandle.getFileHandle(sanitizedName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(file);
    await writable.close();

    console.log(`✅ Arquivo salvo: ${year}/${type}/${sanitizedName}`);

    if (window.integrityManager) {
      await window.integrityManager.updateManifest(folderHandle, sanitizedName);
    }

    return {
      success: true,
      path: `${year}/${type}/${sanitizedName}`,
      fileName: sanitizedName,
      size: file.size
    };
  }

  /**
   * Move arquivo para lixeira - delegated to TrashManager
   */
  async moveToTrash(type, year, fileName) {
    if (window.trashManager) {
      return await window.trashManager.moveToTrash(type, year, fileName);
    }
    throw new Error('TrashManager não disponível');
  }

  /**
   * Exclui permanentemente da lixeira - delegated to TrashManager
   */
  async hardDeleteFromTrash(year, trashFileName, skipLog = false) {
    if (window.trashManager) {
      return await window.trashManager.hardDeleteFromTrash(year, trashFileName, skipLog);
    }
    throw new Error('TrashManager não disponível');
  }

  /**
   * Restaura arquivo da lixeira - delegated to TrashManager
   */
  async restoreFromTrash(year, trashFileName, targetType) {
    if (window.trashManager) {
      return await window.trashManager.restoreFromTrash(year, trashFileName, targetType);
    }
    throw new Error('TrashManager não disponível');
  }

  /**
   * Lista itens da lixeira - delegated to TrashManager
   */
  async listTrashItems(year = null) {
    if (window.trashManager) {
      return await window.trashManager.listTrashItems(year);
    }
    return [];
  }

  /**
   * Lista anos disponíveis
   */
  async listYears() {
    if (!this.mainDirectoryHandle) {
      return [];
    }

    const years = [];
    for await (const entry of this.mainDirectoryHandle.values()) {
      if (entry.kind === 'directory' && /^\d{4}$/.test(entry.name)) {
        years.push(parseInt(entry.name));
      }
    }
    return years.sort((a, b) => b - a);
  }

  /**
   * Sanitiza nome de arquivo
   */
  sanitizeFileName(fileName) {
    return fileName
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/[^\x20-\x7E\u00C0-\u00FF]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // ============================================================================
  // NOVA ESTRUTURA DE PASTAS SINGEM
  // ============================================================================

  /**
   * Estrutura padrão do SINGEM
   */
  static get FOLDER_STRUCTURE() {
    return {
      CONFIG: '00_CONFIG',
      EMPENHOS: '01_EMPENHOS',
      NOTAS_FISCAIS: '02_NOTAS_FISCAIS',
      RELATORIOS: '03_RELATORIOS',
      BACKUPS: '04_BACKUPS',
      ANEXOS: '05_ANEXOS'
    };
  }

  /**
   * Subpastas de cada pasta principal
   */
  static get SUBFOLDERS() {
    return {
      CONFIG: ['logs'],
      BACKUPS: ['daily', 'manual', 'restore_points'],
      ANEXOS: ['contratos', 'comprovantes', 'outros']
    };
  }

  /**
   * ✅ VERSÃO CORRIGIDA: Recebe handle já selecionado pelo usuário
   * Configura pasta principal e cria estrutura SINGEM completa
   *
   * IMPORTANTE: Esta função NÃO chama showDirectoryPicker!
   * O handle deve ser obtido diretamente no event listener do clique.
   *
   * @param {FileSystemDirectoryHandle} baseHandle - Handle da pasta base (já selecionada)
   * @param {string} unidadeNome - Nome da unidade (opcional, ex: "IF GUANAMBI")
   * @returns {Promise<Object>} Resultado da configuração
   */
  async configurarPastaPrincipalComHandle(baseHandle, unidadeNome = null) {
    console.log('[FS] 🚀 Configurando pasta com handle recebido:', baseHandle?.name);

    if (!baseHandle) {
      throw new Error('Handle da pasta não fornecido');
    }

    try {
      // 1. Solicitar permissão explícita
      console.log('[FS] 🔐 Solicitando permissão de escrita...');
      const permission = await baseHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        throw new Error('Permissão de escrita negada pelo usuário');
      }
      console.log('[FS] ✅ Permissão concedida');

      // 2. Criar pasta SINGEM dentro da pasta selecionada
      console.log('[FS] 📁 Criando pasta SINGEM...');
      const SINGEMHandle = await this.ensureAppRootDir(baseHandle);

      // 3. Criar estrutura completa dentro de SINGEM
      console.log('[FS] 🏗️ Criando estrutura de pastas...');
      const estrutura = await this.ensureFullStructure(SINGEMHandle, unidadeNome);

      // 4. Validar permissão com teste real de escrita
      console.log('[FS] 🧪 Testando escrita...');
      await this.testWriteAccessInFolder(SINGEMHandle);

      // 5. Salvar configuração
      this.mainDirectoryHandle = SINGEMHandle;
      await this.saveFolderReference();

      // 6. Salvar metadados da estrutura
      await this.salvarMetadadosEstrutura({
        pastaBase: baseHandle.name,
        pastaSINGEM: 'SINGEM',
        unidade: unidadeNome,
        unidadePasta: estrutura.unidadePasta,
        estrutura: estrutura,
        dataConfiguracao: new Date().toISOString(),
        permissao: 'granted',
        versaoEstrutura: 'v2'
      });

      console.log('[FS] ✅✅✅ Estrutura SINGEM criada com sucesso!');

      return {
        success: true,
        pastaBase: baseHandle.name,
        pastaSINGEM: 'SINGEM',
        estrutura: estrutura,
        caminhoCompleto: `${baseHandle.name}/SINGEM`
      };
    } catch (error) {
      console.error('[FS] ❌ Erro ao configurar pasta:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * @deprecated Use configurarPastaPrincipalComHandle em vez disso
   * Configura pasta principal e cria estrutura SINGEM completa
   * Este é o ÚNICO ponto de entrada para configuração (via gesto do usuário)
   * @param {string} unidadeNome - Nome da unidade (opcional, ex: "IF GUANAMBI")
   * @returns {Promise<Object>} Resultado da configuração
   */
  async configurarPastaPrincipalComEstrutura(unidadeNome = null) {
    console.log('[FS] ⚠️ AVISO: configurarPastaPrincipalComEstrutura está deprecada');
    console.log('[FS] ⚠️ Use configurarPastaPrincipalComHandle em vez disso');
    console.log('[FS] 🚀 Iniciando configuração de pasta principal com estrutura SINGEM...');

    if (!this.isSupported) {
      throw new Error(
        'Seu navegador não suporta acesso ao sistema de arquivos.\n\n' + 'Use Chrome 86+, Edge 86+ ou Opera 72+.'
      );
    }

    try {
      // 1. Solicitar ao usuário selecionar a pasta base (raiz do disco ou servidor)
      console.log('[FS] 📂 Abrindo seletor de pasta...');
      const baseHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      console.log('[FS] ✅ Pasta base selecionada:', baseHandle.name);

      // 2. Solicitar permissão explícita
      const permission = await baseHandle.requestPermission({ mode: 'readwrite' });
      if (permission !== 'granted') {
        throw new Error('Permissão de escrita negada pelo usuário');
      }

      // 3. Criar pasta SINGEM dentro da pasta selecionada
      const SINGEMHandle = await this.ensureAppRootDir(baseHandle);

      // 4. Criar estrutura completa dentro de SINGEM
      const estrutura = await this.ensureFullStructure(SINGEMHandle, unidadeNome);

      // 5. Validar permissão com teste real de escrita
      await this.testWriteAccessInFolder(SINGEMHandle);

      // 6. Salvar configuração
      this.mainDirectoryHandle = SINGEMHandle;
      await this.saveFolderReference();

      // 7. Salvar metadados da estrutura
      await this.salvarMetadadosEstrutura({
        pastaBase: baseHandle.name,
        pastaSINGEM: 'SINGEM',
        unidade: unidadeNome,
        estrutura: estrutura,
        dataConfiguracao: new Date().toISOString(),
        permissao: 'granted'
      });

      console.log('[FS] ✅✅✅ Estrutura SINGEM criada com sucesso!');

      return {
        success: true,
        pastaBase: baseHandle.name,
        pastaSINGEM: 'SINGEM',
        estrutura: estrutura,
        caminhoCompleto: `${baseHandle.name}/SINGEM`
      };
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('[FS] ℹ️ Usuário cancelou a seleção');
        return { success: false, cancelled: true };
      }
      console.error('[FS] ❌ Erro ao configurar pasta:', error);
      throw error;
    }
  }

  /**
   * Cria ou obtém a pasta raiz "SINGEM" dentro da pasta base
   * @param {FileSystemDirectoryHandle} baseHandle - Handle da pasta base
   * @returns {Promise<FileSystemDirectoryHandle>} Handle da pasta SINGEM
   */
  async ensureAppRootDir(baseHandle) {
    console.log('[FS] 📁 Criando/obtendo pasta SINGEM...');

    try {
      const SINGEMHandle = await baseHandle.getDirectoryHandle('SINGEM', { create: true });
      console.log('[FS] ✅ Pasta SINGEM pronta');
      return SINGEMHandle;
    } catch (error) {
      console.error('[FS] ❌ Erro ao criar pasta SINGEM:', error);
      throw new Error(`Não foi possível criar a pasta SINGEM: ${error.message}`);
    }
  }

  /**
   * Cria estrutura completa de pastas dentro de SINGEM
   * @param {FileSystemDirectoryHandle} SINGEMHandle - Handle da pasta SINGEM
   * @param {string} unidadeNome - Nome da unidade (opcional)
   * @returns {Promise<Object>} Detalhes da estrutura criada
   */
  async ensureFullStructure(SINGEMHandle, unidadeNome = null) {
    console.log('[FS] 🏗️ Criando estrutura completa de pastas...');

    const estrutura = {
      pastas: [],
      unidade: unidadeNome,
      anos: []
    };

    const anoAtual = new Date().getFullYear();
    const anosIniciais = [anoAtual - 1, anoAtual, anoAtual + 1]; // Ano anterior, atual e próximo

    // Se tiver unidade, criar nível adicional
    let rootHandle = SINGEMHandle;
    if (unidadeNome) {
      const unidadeSanitizada = this.sanitizeFolderName(unidadeNome);
      rootHandle = await SINGEMHandle.getDirectoryHandle(unidadeSanitizada, { create: true });
      estrutura.unidadePasta = unidadeSanitizada;
      console.log(`[FS] ✅ Pasta da unidade criada: ${unidadeSanitizada}`);
    }

    const STRUCTURE = FileSystemManager.FOLDER_STRUCTURE;
    const SUBS = FileSystemManager.SUBFOLDERS;

    // 1. Criar 00_CONFIG
    const configHandle = await rootHandle.getDirectoryHandle(STRUCTURE.CONFIG, { create: true });
    estrutura.pastas.push(STRUCTURE.CONFIG);
    console.log(`[FS] ✅ Criada: ${STRUCTURE.CONFIG}`);

    // Criar subpastas de CONFIG
    for (const sub of SUBS.CONFIG) {
      await configHandle.getDirectoryHandle(sub, { create: true });
      console.log(`[FS]   ✅ Criada: ${STRUCTURE.CONFIG}/${sub}`);
    }

    // Criar app-config.json inicial
    await this.createInitialConfigFile(configHandle);

    // 2. Criar 01_EMPENHOS com anos
    const empenhosHandle = await rootHandle.getDirectoryHandle(STRUCTURE.EMPENHOS, { create: true });
    estrutura.pastas.push(STRUCTURE.EMPENHOS);
    console.log(`[FS] ✅ Criada: ${STRUCTURE.EMPENHOS}`);

    for (const ano of anosIniciais) {
      await empenhosHandle.getDirectoryHandle(ano.toString(), { create: true });
      estrutura.anos.push(ano);
      console.log(`[FS]   ✅ Criada: ${STRUCTURE.EMPENHOS}/${ano}`);
    }

    // 3. Criar 02_NOTAS_FISCAIS com anos
    const nfHandle = await rootHandle.getDirectoryHandle(STRUCTURE.NOTAS_FISCAIS, { create: true });
    estrutura.pastas.push(STRUCTURE.NOTAS_FISCAIS);
    console.log(`[FS] ✅ Criada: ${STRUCTURE.NOTAS_FISCAIS}`);

    for (const ano of anosIniciais) {
      await nfHandle.getDirectoryHandle(ano.toString(), { create: true });
      console.log(`[FS]   ✅ Criada: ${STRUCTURE.NOTAS_FISCAIS}/${ano}`);
    }

    // 4. Criar 03_RELATORIOS com anos
    const relatoriosHandle = await rootHandle.getDirectoryHandle(STRUCTURE.RELATORIOS, { create: true });
    estrutura.pastas.push(STRUCTURE.RELATORIOS);
    console.log(`[FS] ✅ Criada: ${STRUCTURE.RELATORIOS}`);

    for (const ano of anosIniciais) {
      await relatoriosHandle.getDirectoryHandle(ano.toString(), { create: true });
      console.log(`[FS]   ✅ Criada: ${STRUCTURE.RELATORIOS}/${ano}`);
    }

    // 5. Criar 04_BACKUPS com subpastas
    const backupsHandle = await rootHandle.getDirectoryHandle(STRUCTURE.BACKUPS, { create: true });
    estrutura.pastas.push(STRUCTURE.BACKUPS);
    console.log(`[FS] ✅ Criada: ${STRUCTURE.BACKUPS}`);

    for (const sub of SUBS.BACKUPS) {
      await backupsHandle.getDirectoryHandle(sub, { create: true });
      console.log(`[FS]   ✅ Criada: ${STRUCTURE.BACKUPS}/${sub}`);
    }

    // 6. Criar 05_ANEXOS com subpastas
    const anexosHandle = await rootHandle.getDirectoryHandle(STRUCTURE.ANEXOS, { create: true });
    estrutura.pastas.push(STRUCTURE.ANEXOS);
    console.log(`[FS] ✅ Criada: ${STRUCTURE.ANEXOS}`);

    for (const sub of SUBS.ANEXOS) {
      await anexosHandle.getDirectoryHandle(sub, { create: true });
      console.log(`[FS]   ✅ Criada: ${STRUCTURE.ANEXOS}/${sub}`);
    }

    console.log('[FS] ✅ Estrutura completa criada!');
    return estrutura;
  }

  /**
   * Cria arquivo de configuração inicial
   * @param {FileSystemDirectoryHandle} configHandle - Handle da pasta CONFIG
   */
  async createInitialConfigFile(configHandle) {
    try {
      const configData = {
        versao: '1.0.0',
        dataCriacao: new Date().toISOString(),
        app: 'SINGEM',
        estrutura: 'v2',
        configuracoes: {
          autoBackup: true,
          backupIntervalo: 'daily',
          manterHistorico: 30
        }
      };

      const fileHandle = await configHandle.getFileHandle('app-config.json', { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(JSON.stringify(configData, null, 2));
      await writable.close();

      console.log('[FS] ✅ Arquivo app-config.json criado');
    } catch (error) {
      console.warn('[FS] ⚠️ Não foi possível criar app-config.json:', error.message);
    }
  }

  /**
   * Garante que a pasta do ano existe (cria sob demanda)
   * @param {string} tipo - Tipo de pasta (empenhos, notas_fiscais, relatorios)
   * @param {number} ano - Ano
   * @returns {Promise<FileSystemDirectoryHandle>} Handle da pasta do ano
   */
  async ensureYearFolder(tipo, ano) {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não configurada');
    }

    const STRUCTURE = FileSystemManager.FOLDER_STRUCTURE;
    let pastaPrincipal;

    switch (tipo) {
      case 'empenhos':
        pastaPrincipal = STRUCTURE.EMPENHOS;
        break;
      case 'notas_fiscais':
      case 'notasFiscais':
        pastaPrincipal = STRUCTURE.NOTAS_FISCAIS;
        break;
      case 'relatorios':
        pastaPrincipal = STRUCTURE.RELATORIOS;
        break;
      default:
        throw new Error(`Tipo de pasta desconhecido: ${tipo}`);
    }

    // Verificar se há unidade configurada
    const metadados = await this.obterMetadadosEstrutura();
    let rootHandle = this.mainDirectoryHandle;

    if (metadados?.unidadePasta) {
      rootHandle = await this.mainDirectoryHandle.getDirectoryHandle(metadados.unidadePasta, { create: true });
    }

    // Obter pasta principal
    const pastaHandle = await rootHandle.getDirectoryHandle(pastaPrincipal, { create: true });

    // Criar pasta do ano se não existir
    const anoHandle = await pastaHandle.getDirectoryHandle(ano.toString(), { create: true });

    console.log(`[FS] ✅ Pasta do ano garantida: ${pastaPrincipal}/${ano}`);
    return anoHandle;
  }

  /**
   * Testa escrita em uma pasta específica
   * @param {FileSystemDirectoryHandle} folderHandle - Handle da pasta
   */
  async testWriteAccessInFolder(folderHandle) {
    console.log('[FS] 🧪 Testando capacidade de escrita...');

    const testFileName = '.SINGEM_write_test';
    const testContent = `SINGEM Write Test - ${new Date().toISOString()}`;

    try {
      // Criar arquivo de teste
      const fileHandle = await folderHandle.getFileHandle(testFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(testContent);
      await writable.close();

      // Ler para validar
      const file = await fileHandle.getFile();
      const content = await file.text();

      if (content !== testContent) {
        throw new Error('Conteúdo do arquivo de teste não corresponde');
      }

      // Excluir arquivo de teste
      await folderHandle.removeEntry(testFileName);

      console.log('[FS] ✅ Teste de escrita bem-sucedido');
      return true;
    } catch (error) {
      console.error('[FS] ❌ Falha no teste de escrita:', error);
      throw new Error(`Sem permissão de escrita: ${error.message}`);
    }
  }

  /**
   * Salva metadados da estrutura no IndexedDB
   * @param {Object} metadados - Metadados da estrutura
   */
  async salvarMetadadosEstrutura(metadados) {
    try {
      // Em modo servidor, não usar IndexedDB
      if (isServerMode()) {
        console.info('[FS] Modo servidor: salvarMetadadosEstrutura ignorado');
        return;
      }

      if (!window.dbManager?.db) {
        console.warn('[FS] ⚠️ DB não disponível para salvar metadados');
        return;
      }

      const transaction = window.dbManager.db.transaction(['config'], 'readwrite');
      const store = transaction.objectStore('config');

      await new Promise((resolve, reject) => {
        const request = store.put({
          id: 'estruturaPastas',
          ...metadados
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });

      console.log('[FS] ✅ Metadados da estrutura salvos');
    } catch (error) {
      console.error('[FS] ❌ Erro ao salvar metadados:', error);
    }
  }

  /**
   * Obtém metadados da estrutura do IndexedDB
   * @returns {Promise<Object|null>} Metadados ou null
   */
  async obterMetadadosEstrutura() {
    try {
      // Em modo servidor, não usar IndexedDB
      if (isServerMode()) {
        return null;
      }

      if (!window.dbManager?.db) {
        return null;
      }

      const transaction = window.dbManager.db.transaction(['config'], 'readonly');
      const store = transaction.objectStore('config');

      return await new Promise((resolve, reject) => {
        const request = store.get('estruturaPastas');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('[FS] ❌ Erro ao obter metadados:', error);
      return null;
    }
  }

  /**
   * Sanitiza nome de pasta (remove caracteres inválidos)
   * @param {string} name - Nome original
   * @returns {string} Nome sanitizado
   */
  sanitizeFolderName(name) {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[<>:"/\\|?*]/g, '') // Remove caracteres inválidos
      .replace(/\s+/g, ' ') // Normaliza espaços
      .trim()
      .toUpperCase();
  }

  /**
   * Obtém handle de pasta para salvar arquivo
   * @param {string} tipo - Tipo de documento (empenhos, notas_fiscais, relatorios, backups, anexos)
   * @param {number} ano - Ano (opcional, para pastas com ano)
   * @param {string} subtipo - Subtipo (para backups e anexos)
   * @returns {Promise<FileSystemDirectoryHandle>} Handle da pasta
   */
  async getFolderForSave(tipo, ano = null, subtipo = null) {
    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não configurada. Clique em "Configurar Pasta Principal".');
    }

    const STRUCTURE = FileSystemManager.FOLDER_STRUCTURE;
    const metadados = await this.obterMetadadosEstrutura();

    // Navegar até a raiz correta (com ou sem unidade)
    let rootHandle = this.mainDirectoryHandle;
    if (metadados?.unidadePasta) {
      rootHandle = await this.mainDirectoryHandle.getDirectoryHandle(metadados.unidadePasta, { create: true });
    }

    let pastaPrincipal;
    let precisaAno = false;

    switch (tipo) {
      case 'empenhos':
        pastaPrincipal = STRUCTURE.EMPENHOS;
        precisaAno = true;
        break;
      case 'notas_fiscais':
      case 'notasFiscais':
        pastaPrincipal = STRUCTURE.NOTAS_FISCAIS;
        precisaAno = true;
        break;
      case 'relatorios':
        pastaPrincipal = STRUCTURE.RELATORIOS;
        precisaAno = true;
        break;
      case 'backups':
        pastaPrincipal = STRUCTURE.BACKUPS;
        break;
      case 'anexos':
        pastaPrincipal = STRUCTURE.ANEXOS;
        break;
      case 'config':
        pastaPrincipal = STRUCTURE.CONFIG;
        break;
      default:
        throw new Error(`Tipo desconhecido: ${tipo}`);
    }

    // Obter pasta principal
    let targetHandle = await rootHandle.getDirectoryHandle(pastaPrincipal, { create: true });

    // Se precisa de ano
    if (precisaAno) {
      const anoFinal = ano || new Date().getFullYear();
      targetHandle = await targetHandle.getDirectoryHandle(anoFinal.toString(), { create: true });
    }

    // Se tem subtipo (para backups e anexos)
    if (subtipo) {
      targetHandle = await targetHandle.getDirectoryHandle(subtipo, { create: true });
    }

    return targetHandle;
  }

  /**
   * Salva arquivo na nova estrutura SINGEM
   * @param {File|Blob} file - Arquivo a ser salvo
   * @param {string} tipo - Tipo (empenhos, notas_fiscais, relatorios, backups, anexos)
   * @param {Object} opcoes - Opções adicionais
   * @returns {Promise<Object>} Informações do arquivo salvo
   */
  async salvarArquivoNaEstrutura(file, tipo, opcoes = {}) {
    const { ano = new Date().getFullYear(), subtipo = null, nomeArquivo = null, metadados = {} } = opcoes;

    console.log(`[FS] 💾 Salvando arquivo na estrutura: tipo=${tipo}, ano=${ano}`);

    if (!this.mainDirectoryHandle) {
      throw new Error('Pasta principal não configurada');
    }

    // Verificar permissão
    const hasPermission = await this.hasFolderWithPermission();
    if (!hasPermission) {
      throw new Error('Sem permissão de escrita. Reconfigure a pasta principal.');
    }

    try {
      // Obter pasta de destino
      const targetFolder = await this.getFolderForSave(tipo, ano, subtipo);

      // Gerar nome do arquivo
      let fileName = nomeArquivo || file.name;

      if (metadados.numero && metadados.fornecedor) {
        fileName = this.gerarNomeArquivoPadronizado(tipo, metadados.numero, metadados.fornecedor);
      }

      // Verificar duplicatas e gerar nome único
      let finalFileName = fileName;
      let counter = 1;
      while (await this.fileExists(targetFolder, finalFileName)) {
        const ext = fileName.match(/\.[^.]+$/)?.[0] || '';
        const nameWithoutExt = fileName.replace(/\.[^.]+$/, '');
        finalFileName = `${nameWithoutExt}_${counter}${ext}`;
        counter++;
      }

      // Criar e escrever arquivo
      const fileHandle = await targetFolder.getFileHandle(finalFileName, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(file);
      await writable.close();

      // Montar caminho relativo
      const STRUCTURE = FileSystemManager.FOLDER_STRUCTURE;
      const metadadosEstrutura = await this.obterMetadadosEstrutura();
      let caminhoRelativo = '';

      if (metadadosEstrutura?.unidadePasta) {
        caminhoRelativo = `${metadadosEstrutura.unidadePasta}/`;
      }

      const pastaPrincipal = {
        empenhos: STRUCTURE.EMPENHOS,
        notas_fiscais: STRUCTURE.NOTAS_FISCAIS,
        notasFiscais: STRUCTURE.NOTAS_FISCAIS,
        relatorios: STRUCTURE.RELATORIOS,
        backups: STRUCTURE.BACKUPS,
        anexos: STRUCTURE.ANEXOS,
        config: STRUCTURE.CONFIG
      }[tipo];

      caminhoRelativo += pastaPrincipal;
      if (['empenhos', 'notas_fiscais', 'notasFiscais', 'relatorios'].includes(tipo)) {
        caminhoRelativo += `/${ano}`;
      }
      if (subtipo) {
        caminhoRelativo += `/${subtipo}`;
      }
      caminhoRelativo += `/${finalFileName}`;

      console.log(`[FS] ✅ Arquivo salvo: ${caminhoRelativo}`);

      return {
        success: true,
        originalName: file.name,
        savedName: finalFileName,
        path: caminhoRelativo,
        tipo,
        ano,
        subtipo,
        size: file.size,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('[FS] ❌ Erro ao salvar arquivo:', error);
      throw error;
    }
  }

  /**
   * Verifica se a estrutura SINGEM está configurada
   * @returns {Promise<Object>} Status da configuração
   */
  async verificarEstruturaConfigurada() {
    const resultado = {
      configurada: false,
      pastaDisponivel: false,
      permissaoValida: false,
      estruturaCompleta: false,
      detalhes: {}
    };

    if (!this.mainDirectoryHandle) {
      return resultado;
    }

    resultado.pastaDisponivel = true;

    // Verificar permissão
    try {
      const permission = await this.mainDirectoryHandle.queryPermission({ mode: 'readwrite' });
      resultado.permissaoValida = permission === 'granted';
    } catch (error) {
      resultado.permissaoValida = false;
    }

    if (!resultado.permissaoValida) {
      return resultado;
    }

    // Verificar estrutura
    const metadados = await this.obterMetadadosEstrutura();
    if (metadados) {
      resultado.detalhes = metadados;
      resultado.configurada = true;

      // Verificar se pastas principais existem
      try {
        const STRUCTURE = FileSystemManager.FOLDER_STRUCTURE;
        let rootHandle = this.mainDirectoryHandle;

        if (metadados.unidadePasta) {
          rootHandle = await this.mainDirectoryHandle.getDirectoryHandle(metadados.unidadePasta);
        }

        let pastasOk = 0;
        for (const pasta of Object.values(STRUCTURE)) {
          try {
            await rootHandle.getDirectoryHandle(pasta);
            pastasOk++;
          } catch {
            // Pasta não existe
          }
        }

        resultado.estruturaCompleta = pastasOk === Object.keys(STRUCTURE).length;
      } catch (error) {
        resultado.estruturaCompleta = false;
      }
    }

    return resultado;
  }
}

// Instância global do gerenciador de arquivos
window.fsManager = new FileSystemManager();

// Inicializar TrashManager após FSManager
document.addEventListener('DOMContentLoaded', async () => {
  // Tentar restaurar pasta principal previamente selecionada
  if (window.fsManager.isFileSystemAPISupported()) {
    try {
      const restored = await window.fsManager.restoreFolderReference();
      // Mostrar mensagem de configuração se não restaurado
      try {
        const el = document.getElementById('fs-config-message');
        if (!restored) {
          if (el) {
            el.style.display = 'block';
          }
        } else {
          if (el) {
            el.style.display = 'none';
          }
        }
      } catch (uiErr) {
        if (DEBUG_FS) {
          console.log('[FS] não conseguiu atualizar UI de configuração:', uiErr);
        }
      }
    } catch (error) {
      console.log('Não foi possível restaurar pasta principal:', error.message);
    }
  }

  // Inicializar TrashManager
  if (window.TrashManager) {
    window.trashManager = new window.TrashManager(window.fsManager);
    console.log('✅ TrashManager inicializado');
  }
});
