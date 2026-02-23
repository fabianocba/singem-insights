/**
 * Configurações → Arquivos
 * Gerencia estrutura de pastas e armazenamento de documentos
 */

class SettingsArquivos {
  constructor() {
    this.pastaConfigurada = false;
    this.estruturaCriada = false;
    this.configPastas = null;
    this.init();
  }

  /**
   * Garante que o dbManager está inicializado
   */
  async ensureDBReady() {
    if (!window.dbManager) {
      throw new Error('❌ dbManager não está disponível');
    }

    if (!window.dbManager.db) {
      console.warn('⚠️ Banco não inicializado, inicializando...');
      if (window.dbManager.initSafe) {
        await window.dbManager.initSafe();
      } else {
        await window.dbManager.init();
      }
    }
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Configurar pasta principal - CORRIGIDO: showDirectoryPicker IMEDIATO no clique
    document.getElementById('btnConfigurarPastaPrincipal')?.addEventListener('click', async () => {
      console.log('[Arquivos] 🖱️ Clique detectado - abrindo seletor AGORA');

      // Verifica suporte ANTES de qualquer await
      if (!('showDirectoryPicker' in window)) {
        alert(
          '❌ Seu navegador não suporta acesso ao sistema de arquivos.\n\n' +
            'Use Chrome, Edge ou Opera atualizado.\n\n' +
            'Versão mínima:\n' +
            '• Chrome 86+\n' +
            '• Edge 86+\n' +
            '• Opera 72+\n\n' +
            'Os dados do sistema permanecem no servidor PostgreSQL (VPS).'
        );
        return;
      }

      try {
        // ⚠️ CRÍTICO: showDirectoryPicker DEVE ser a primeira chamada async
        // Não pode haver nenhum await antes disso!
        const baseHandle = await window.showDirectoryPicker({
          mode: 'readwrite',
          startIn: 'documents'
        });

        console.log('[Arquivos] ✅ Handle obtido:', baseHandle.name);
        console.log('[Arquivos] 🔄 Criando estrutura...');

        // Agora sim pode usar awaits à vontade
        await this.configurarPastaPrincipalComHandle(baseHandle);
      } catch (error) {
        if (error.name === 'AbortError') {
          console.log('[Arquivos] ℹ️ Usuário cancelou a seleção de pasta');
          // Não mostrar erro - é comportamento normal
          return;
        }
        console.error('[Arquivos] ❌ Erro ao selecionar pasta:', error);
        alert('❌ Erro ao configurar pasta:\n\n' + error.message);
      }
    });

    // Criar estrutura de pastas
    document.getElementById('btnCriarEstrutura')?.addEventListener('click', async () => {
      await this.criarEstruturaCompleta();
    });

    // Validar estrutura existente
    document.getElementById('btnValidarEstrutura')?.addEventListener('click', async () => {
      await this.validarEstruturaExistente();
    });

    // Abrir pasta raiz
    document.getElementById('btnAbrirPastaRaiz')?.addEventListener('click', async () => {
      await this.abrirPastaRaiz();
    });

    // Resetar configuração
    document.getElementById('btnResetarConfigPastas')?.addEventListener('click', async () => {
      await this.resetarConfiguracao();
    });
  }

  /**
   * Carrega configurações salvas
   */
  async load() {
    try {
      await this.ensureDBReady();

      // Restaurar handle da pasta principal salva no fsManager
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;
      let handleRestaurado = false;

      if (fsManager && fsManager.restoreFolderReference && fsManager.isFileSystemAPISupported()) {
        try {
          handleRestaurado = await fsManager.restoreFolderReference();
          console.log('📁 Restauração de pasta:', handleRestaurado ? '✅ Sucesso' : 'ℹ️ Não encontrada');
        } catch (error) {
          console.warn('⚠️ Erro ao restaurar pasta:', error);
        }
      }

      const config = await window.dbManager.get('config', 'estruturaPastas');

      if (config) {
        this.configPastas = config;
        this.estruturaCriada = !!config.estruturaCriada;
      }

      // Atualizar flag baseado no handle real, não no config salvo
      this.pastaConfigurada = handleRestaurado && !!fsManager?.mainDirectoryHandle;

      console.log('📊 Status carregado:', {
        pastaConfigurada: this.pastaConfigurada,
        estruturaCriada: this.estruturaCriada,
        handleExiste: !!fsManager?.mainDirectoryHandle
      });

      this.atualizarStatus();
    } catch (error) {
      console.error('Erro ao carregar configurações de arquivos:', error);
    }
  }

  /**
   * Atualiza status visual e textos dos botões
   */
  atualizarStatus() {
    const statusDiv = document.getElementById('statusConfigPastas');
    const btnConfigurar = document.getElementById('btnConfigurarPastaPrincipal');
    const btnCriar = document.getElementById('btnCriarEstrutura');
    const btnAbrir = document.getElementById('btnAbrirPastaRaiz');

    if (!statusDiv) {
      console.warn('⚠️ Elemento statusConfigPastas não encontrado');
      return;
    }

    // Verificar se o handle realmente existe no fsManager
    const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;
    const handleExiste = !!(fsManager && fsManager.mainDirectoryHandle);

    console.log('🔄 Atualizando status UI:', {
      handleExiste,
      estruturaCriada: this.estruturaCriada,
      pastaConfigurada: this.pastaConfigurada
    });

    if (handleExiste && this.estruturaCriada) {
      const nomePasta = this.configPastas?.pastaRaiz || fsManager.mainDirectoryHandle.name;
      const dataCriacao = this.configPastas?.dataCriacao
        ? new Date(this.configPastas.dataCriacao).toLocaleDateString('pt-BR')
        : 'N/A';

      statusDiv.innerHTML = `
        <div class="alert alert-success">
          ✅ <strong>Configurado!</strong><br>
          Pasta: ${nomePasta}<br>
          Estrutura criada em: ${dataCriacao}
        </div>
      `;

      // Alterar textos dos botões quando configurado
      if (btnConfigurar) {
        btnConfigurar.innerHTML = '🔄 Alterar Pasta Principal';
        btnConfigurar.title = 'Alterar a configuração da pasta principal';
      }
      if (btnCriar) {
        btnCriar.innerHTML = '🔄 Alterar Estrutura de Pastas';
        btnCriar.title = 'Recriar ou alterar a estrutura de pastas';
        btnCriar.disabled = false;
      }
      if (btnAbrir) {
        btnAbrir.disabled = false;
      }
    } else if (handleExiste) {
      const nomePasta = fsManager.mainDirectoryHandle.name;
      statusDiv.innerHTML = `
        <div class="alert alert-warning">
          ⚠️ <strong>Configuração Parcial</strong><br>
          Pasta selecionada: ${nomePasta}<br>
          <small>Clique em "Criar Estrutura de Pastas" para finalizar</small>
        </div>
      `;

      // Alterar textos dos botões quando parcialmente configurado
      if (btnConfigurar) {
        btnConfigurar.innerHTML = '🔄 Alterar Pasta Principal';
        btnConfigurar.title = 'Alterar a pasta principal selecionada';
      }
      if (btnCriar) {
        btnCriar.innerHTML = '🏗️ Criar Estrutura de Pastas';
        btnCriar.title = 'Criar a estrutura de pastas necessária';
        btnCriar.disabled = false;
      }
      if (btnAbrir) {
        btnAbrir.disabled = false;
      }
    } else {
      statusDiv.innerHTML = `
        <div class="alert alert-info">
          ℹ️ <strong>Não Configurado</strong><br>
          <small>Clique em "Configurar Pasta Principal" para começar</small>
        </div>
      `;

      // Restaurar textos originais quando não configurado
      if (btnConfigurar) {
        btnConfigurar.innerHTML = '📂 Configurar Pasta Principal';
        btnConfigurar.title = 'Configurar a pasta onde os documentos serão salvos';
      }
      if (btnCriar) {
        btnCriar.innerHTML = '🏗️ Criar Estrutura de Pastas';
        btnCriar.title = 'Criar a estrutura de pastas necessária';
        btnCriar.disabled = true;
      }
      if (btnAbrir) {
        btnAbrir.disabled = true;
      }
    }

    // Atualizar flag interna com base no handle real
    this.pastaConfigurada = handleExiste;

    console.log('✅ Status UI atualizado');
  }

  /**
   * Configura pasta principal COM handle já selecionado pelo usuário
   * IMPORTANTE: Esta função é chamada APÓS o showDirectoryPicker
   * @param {FileSystemDirectoryHandle} baseHandle - Handle da pasta base selecionada
   */
  async configurarPastaPrincipalComHandle(baseHandle) {
    try {
      console.log('[Arquivos] 🔧 Configurando pasta com handle:', baseHandle.name);

      // Tenta acessar fsManager
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;

      if (!fsManager) {
        throw new Error('Módulo de arquivos não encontrado. Recarregue a página.');
      }

      // Obtém dados da unidade para nome da pasta (opcional)
      const unidade = await this.obterDadosUnidade();
      const nomeUnidade = unidade.abreviacao !== 'INST' ? unidade.abreviacao : null;

      console.log('[Arquivos] 📋 Unidade:', nomeUnidade || '(sem unidade definida)');

      // Usar a função que recebe o handle
      const resultado = await fsManager.configurarPastaPrincipalComHandle(baseHandle, nomeUnidade);

      if (!resultado.success) {
        throw new Error(resultado.error || 'Falha na configuração');
      }

      console.log('[Arquivos] ✅ Estrutura criada:', resultado);

      // Atualizar configuração local
      this.configPastas = {
        pastaRaiz: resultado.pastaBase,
        pastaSINGEM: resultado.pastaSINGEM,
        unidade: unidade,
        estrutura: resultado.estrutura,
        dataConfiguracao: new Date().toISOString(),
        estruturaCriada: true,
        versaoEstrutura: 'v2'
      };

      await this.salvarConfiguracao(this.configPastas);

      this.pastaConfigurada = true;
      this.estruturaCriada = true;

      this.atualizarStatus();

      // Mostrar toast de sucesso
      alert(
        `✅ Pasta configurada com sucesso!\n\n` +
          `📁 Caminho: ${resultado.caminhoCompleto}\n\n` +
          `📂 Estrutura criada:\n` +
          `   • 00_CONFIG (configurações)\n` +
          `   • 01_EMPENHOS (notas de empenho)\n` +
          `   • 02_NOTAS_FISCAIS (notas fiscais)\n` +
          `   • 03_RELATORIOS (relatórios)\n` +
          `   • 04_BACKUPS (backups automáticos)\n` +
          `   • 05_ANEXOS (arquivos diversos)\n\n` +
          `🔐 Permissão: Concedida`
      );
    } catch (error) {
      console.error('[Arquivos] ❌ Erro ao configurar:', error);
      alert('❌ Erro ao configurar pasta:\n\n' + error.message);
    }
  }

  /**
   * Configura pasta principal onde os documentos serão salvos
   * @deprecated Use o evento de clique que chama configurarPastaPrincipalComHandle
   */
  async configurarPastaPrincipal() {
    try {
      console.log('🔧 Iniciando configuração de pasta principal (nova versão)...');

      // Tenta acessar fsManager do contexto atual ou do pai (iframe)
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;

      if (!fsManager) {
        console.error('❌ fsManager não encontrado');
        alert('❌ Módulo de arquivos não encontrado.\n\n' + 'Recarregue a página (Ctrl+Shift+R) e tente novamente.');
        return;
      }

      // Verifica suporte do navegador
      if (!fsManager.isFileSystemAPISupported || !fsManager.isFileSystemAPISupported()) {
        console.error('❌ File System API não suportada');
        alert(
          '❌ Seu navegador não suporta acesso ao sistema de arquivos.\n\n' +
            'Use Chrome, Edge ou Opera atualizado.\n\n' +
            'Versão mínima:\n' +
            '• Chrome 86+\n' +
            '• Edge 86+\n' +
            '• Opera 72+\n\n' +
            'Os dados do sistema permanecem no servidor PostgreSQL (VPS).'
        );
        return;
      }

      // Obtém dados da unidade para nome da pasta (opcional)
      const unidade = await this.obterDadosUnidade();
      const nomeUnidade = unidade.abreviacao !== 'INST' ? unidade.abreviacao : null;

      console.log('📋 Unidade:', nomeUnidade || '(sem unidade definida)');

      // Mostrar instruções ao usuário
      const confirmar = confirm(
        '📂 CONFIGURAR PASTA PRINCIPAL\n\n' +
          '1. Selecione a pasta base onde deseja salvar os arquivos\n' +
          '   (ex: D:\\ ou pasta de rede compartilhada)\n\n' +
          '2. O sistema criará automaticamente a estrutura:\n' +
          '   SINGEM/\n' +
          '     ├── 00_CONFIG/\n' +
          '     ├── 01_EMPENHOS/\n' +
          '     ├── 02_NOTAS_FISCAIS/\n' +
          '     ├── 03_RELATORIOS/\n' +
          '     ├── 04_BACKUPS/\n' +
          '     └── 05_ANEXOS/\n\n' +
          (nomeUnidade ? `📍 Unidade: ${nomeUnidade}\n\n` : '') +
          'Deseja continuar?'
      );

      if (!confirmar) {
        console.log('ℹ️ Usuário cancelou configuração');
        return;
      }

      // Usar a nova função que cria tudo automaticamente
      console.log('📂 Chamando configurarPastaPrincipalComEstrutura...');
      const resultado = await fsManager.configurarPastaPrincipalComEstrutura(nomeUnidade);

      if (!resultado.success) {
        if (resultado.cancelled) {
          console.log('ℹ️ Usuário cancelou seleção de pasta');
          return;
        }
        throw new Error('Falha na configuração');
      }

      console.log('✅ Estrutura criada:', resultado);

      // Atualizar configuração local
      this.configPastas = {
        pastaRaiz: resultado.pastaBase,
        pastaSINGEM: resultado.pastaSINGEM,
        unidade: unidade,
        estrutura: resultado.estrutura,
        dataConfiguracao: new Date().toISOString(),
        estruturaCriada: true,
        versaoEstrutura: 'v2'
      };

      await this.salvarConfiguracao(this.configPastas);

      this.pastaConfigurada = true;
      this.estruturaCriada = true;

      this.atualizarStatus();

      // Mostrar toast de sucesso
      const mensagemSucesso =
        `✅ Pasta configurada com sucesso!\n\n` +
        `📁 Caminho: ${resultado.caminhoCompleto}\n\n` +
        `📂 Estrutura criada:\n` +
        `   • 00_CONFIG (configurações)\n` +
        `   • 01_EMPENHOS (notas de empenho)\n` +
        `   • 02_NOTAS_FISCAIS (notas fiscais)\n` +
        `   • 03_RELATORIOS (relatórios)\n` +
        `   • 04_BACKUPS (backups automáticos)\n` +
        `   • 05_ANEXOS (arquivos diversos)\n\n` +
        `🔐 Permissão: Concedida`;

      alert(mensagemSucesso);
    } catch (error) {
      console.error('❌ Erro ao configurar pasta:', error);
      alert('❌ Erro ao configurar pasta:\n\n' + error.message);
    }
  }

  /**
   * Obtém dados da unidade orçamentária
   */
  async obterDadosUnidade() {
    try {
      await this.ensureDBReady();
      const result = await window.dbManager.get('config', 'unidadeOrcamentaria');

      if (result) {
        return {
          razaoSocial: result.razaoSocial || 'Instituicao',
          cnpj: result.cnpj || '',
          ug: result.ug || '',
          abreviacao: this.gerarAbreviacao(result.razaoSocial || 'Instituicao')
        };
      }

      // Se não tem unidade cadastrada, retorna padrão
      return {
        razaoSocial: 'Instituicao',
        abreviacao: 'INST',
        cnpj: '',
        ug: ''
      };
    } catch (error) {
      console.error('Erro ao obter dados da unidade:', error);
      return {
        razaoSocial: 'Instituicao',
        abreviacao: 'INST',
        cnpj: '',
        ug: ''
      };
    }
  }

  /**
   * Gera abreviação da unidade
   * Exemplo: "Instituto Federal Baiano - Campus Guanambi" → "IF Guanambi"
   */
  gerarAbreviacao(razaoSocial) {
    // Remove pontuação e normaliza
    const texto = razaoSocial
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .toUpperCase();

    // Padrões conhecidos
    const padroes = [
      { regex: /INSTITUTO\s+FEDERAL.*?CAMPUS\s+(\w+)/i, formato: (m) => `IF ${m[1]}` },
      { regex: /IF\s+BAIANO.*?CAMPUS\s+(\w+)/i, formato: (m) => `IF ${m[1]}` },
      { regex: /UNIVERSIDADE\s+FEDERAL.*?(\w+)$/i, formato: (m) => `UF ${m[1]}` },
      { regex: /PREFEITURA\s+MUNICIPAL\s+DE\s+(\w+)/i, formato: (m) => `PM ${m[1]}` }
    ];

    for (const padrao of padroes) {
      const match = texto.match(padrao.regex);
      if (match) {
        return padrao.formato(match);
      }
    }

    // Se não identificou padrão, pega primeiras letras significativas
    const palavras = texto.split(/\s+/).filter((p) => p.length > 2);
    if (palavras.length >= 2) {
      return (
        palavras
          .slice(0, 2)
          .map((p) => p[0])
          .join('') +
        ' ' +
        palavras[palavras.length - 1]
      );
    }

    return texto.substring(0, 10);
  }

  /**
   * Cria estrutura completa de pastas
   * NOVA VERSÃO: Usa estrutura padronizada SINGEM
   */
  async criarEstruturaCompleta() {
    try {
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;

      if (!fsManager?.mainDirectoryHandle) {
        // Se não tem pasta configurada, chama a função completa
        alert('⚠️ Pasta principal não configurada.\n\nClique em "Configurar Pasta Principal" primeiro.');
        return;
      }

      // Se já tem estrutura nova (v2), perguntar se quer recriar
      if (this.configPastas?.versaoEstrutura === 'v2') {
        const recriar = confirm(
          '⚠️ Estrutura já configurada!\n\n' +
            'Deseja recriar a estrutura de pastas?\n\n' +
            'Isso NÃO excluirá arquivos existentes.'
        );
        if (!recriar) {
          return;
        }
      }

      // Obtém dados da unidade
      const unidade = await this.obterDadosUnidade();
      const nomeUnidade = unidade.abreviacao !== 'INST' ? unidade.abreviacao : null;

      // Criar estrutura usando função do fsManager
      const estrutura = await fsManager.ensureFullStructure(fsManager.mainDirectoryHandle, nomeUnidade);

      // Salvar metadados
      await fsManager.salvarMetadadosEstrutura({
        pastaBase: fsManager.mainDirectoryHandle.name,
        pastaSINGEM: 'SINGEM',
        unidade: nomeUnidade,
        unidadePasta: estrutura.unidadePasta,
        estrutura: estrutura,
        dataConfiguracao: new Date().toISOString(),
        permissao: 'granted'
      });

      // Atualizar config local
      this.configPastas = {
        ...this.configPastas,
        estrutura: estrutura,
        estruturaCriada: true,
        versaoEstrutura: 'v2',
        dataCriacao: new Date().toISOString()
      };

      await this.salvarConfiguracao(this.configPastas);

      this.estruturaCriada = true;
      this.atualizarStatus();

      alert(
        `✅ Estrutura criada com sucesso!\n\n` +
          `📂 Pastas criadas:\n` +
          `   • 00_CONFIG\n` +
          `   • 01_EMPENHOS\n` +
          `   • 02_NOTAS_FISCAIS\n` +
          `   • 03_RELATORIOS\n` +
          `   • 04_BACKUPS\n` +
          `   • 05_ANEXOS\n\n` +
          `Anos iniciais: ${estrutura.anos.join(', ')}`
      );
    } catch (error) {
      console.error('Erro ao criar estrutura:', error);
      alert('❌ Erro ao criar estrutura: ' + error.message);
    }
  }

  /**
   * Cria fisicamente a estrutura de pastas (mantido para compatibilidade)
   */
  async criarEstruturaPastas(abreviacaoUnidade, ano) {
    // Tenta acessar fsManager do contexto atual ou do pai (iframe)
    const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;
    const raiz = fsManager?.mainDirectoryHandle;

    if (!raiz) {
      throw new Error('Pasta raiz não encontrada');
    }

    try {
      // 1. Cria pasta da unidade (ex: "IF Guanambi")
      const pastaUnidade = await raiz.getDirectoryHandle(abreviacaoUnidade, { create: true });
      console.log(`✅ Pasta criada: ${abreviacaoUnidade}`);

      // 2. Cria pasta do ano (ex: "2024")
      const pastaAno = await pastaUnidade.getDirectoryHandle(ano.toString(), { create: true });
      console.log(`✅ Pasta criada: ${abreviacaoUnidade}/${ano}`);

      // 3. Cria pasta "Notas de Empenho"
      await pastaAno.getDirectoryHandle('Notas de Empenho', { create: true });
      console.log(`✅ Pasta criada: ${abreviacaoUnidade}/${ano}/Notas de Empenho`);

      // 4. Cria pasta "Notas Fiscais"
      await pastaAno.getDirectoryHandle('Notas Fiscais', { create: true });
      console.log(`✅ Pasta criada: ${abreviacaoUnidade}/${ano}/Notas Fiscais`);

      return {
        abreviacaoUnidade,
        ano,
        caminhoBase: `${abreviacaoUnidade}/${ano}`,
        pastas: {
          notasEmpenho: `${abreviacaoUnidade}/${ano}/Notas de Empenho`,
          notasFiscais: `${abreviacaoUnidade}/${ano}/Notas Fiscais`
        }
      };
    } catch (error) {
      console.error('Erro ao criar estrutura física:', error);
      throw error;
    }
  }

  /**
   * Valida e detecta estrutura de pastas existente
   * Permite usar pastas já criadas manualmente
   */
  async validarEstruturaExistente() {
    try {
      console.log('🔍 Iniciando validação de estrutura existente...');

      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;

      if (!fsManager?.mainDirectoryHandle) {
        alert('❌ Configure a pasta principal primeiro!');
        return;
      }

      // Escanear pasta raiz
      const estruturasEncontradas = await this.escanearPastaRaiz();

      if (estruturasEncontradas.length === 0) {
        alert(
          'ℹ️ Nenhuma estrutura compatível encontrada.\n\n' +
            "Clique em 'Criar Estrutura de Pastas' para criar uma nova estrutura."
        );
        return;
      }

      // Mostrar estruturas encontradas e permitir seleção
      const opcoes = estruturasEncontradas
        .map((e, i) => `${i + 1}. ${e.abreviacao}/ (${e.anos.length} ano(s): ${e.anos.join(', ')})`)
        .join('\n');

      const escolha = prompt(
        `✅ Estrutura(s) encontrada(s)!\n\n` +
          `${opcoes}\n\n` +
          `Digite o número da estrutura a utilizar (ou 0 para cancelar):`
      );

      const indice = parseInt(escolha) - 1;

      if (indice >= 0 && indice < estruturasEncontradas.length) {
        await this.adotarEstruturaExistente(estruturasEncontradas[indice]);
      } else {
        console.log('ℹ️ Validação cancelada pelo usuário');
      }
    } catch (error) {
      console.error('❌ Erro ao validar estrutura existente:', error);
      alert('❌ Erro ao validar estrutura: ' + error.message);
    }
  }

  /**
   * Escaneia a pasta raiz procurando estruturas válidas
   */
  async escanearPastaRaiz() {
    const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;
    const raiz = fsManager?.mainDirectoryHandle;
    const estruturas = [];

    try {
      // Iterar pelas pastas de primeiro nível (possíveis abreviações de unidades)
      for await (const [nome, handle] of raiz.entries()) {
        if (handle.kind === 'directory') {
          console.log(`📁 Analisando: ${nome}`);

          const anos = [];
          let temNotasEmpenho = false;
          let temNotasFiscais = false;

          // Verificar se tem pastas de anos
          for await (const [nomeAno, handleAno] of handle.entries()) {
            if (handleAno.kind === 'directory' && /^\d{4}$/.test(nomeAno)) {
              anos.push(nomeAno);

              // Verificar se tem as subpastas necessárias
              try {
                for await (const [nomeSub] of handleAno.entries()) {
                  if (nomeSub === 'Notas de Empenho' || nomeSub === 'Notas Empenho') {
                    temNotasEmpenho = true;
                  }
                  if (nomeSub === 'Notas Fiscais' || nomeSub === 'Notas Fiscal') {
                    temNotasFiscais = true;
                  }
                }
              } catch (e) {
                console.warn(`⚠️ Erro ao ler ano ${nomeAno}:`, e);
              }
            }
          }

          // Se tem pelo menos um ano e uma das pastas de documentos
          if (anos.length > 0 && (temNotasEmpenho || temNotasFiscais)) {
            estruturas.push({
              abreviacao: nome,
              anos: anos.sort(),
              temNotasEmpenho,
              temNotasFiscais,
              handle
            });
            console.log(`✅ Estrutura válida encontrada: ${nome}`);
          }
        }
      }

      return estruturas;
    } catch (error) {
      console.error('Erro ao escanear pasta raiz:', error);
      return [];
    }
  }

  /**
   * Adota uma estrutura existente encontrada
   */
  async adotarEstruturaExistente(estrutura) {
    try {
      console.log('📥 Adotando estrutura existente:', estrutura);

      // Verificar fsManager
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;

      if (!fsManager?.mainDirectoryHandle) {
        throw new Error('Pasta principal não configurada');
      }

      const unidade = await this.obterDadosUnidade();

      // Atualizar abreviação com a encontrada
      unidade.abreviacao = estrutura.abreviacao;

      // Salvar configuração
      const configData = {
        pastaRaiz: fsManager.mainDirectoryHandle.name,
        unidade: unidade,
        dataConfiguracao: new Date().toISOString(),
        estruturaCriada: true,
        estrutura: {
          abreviacaoUnidade: estrutura.abreviacao,
          anos: estrutura.anos,
          caminhoBase: estrutura.abreviacao,
          pastas: {
            notasEmpenho: `${estrutura.abreviacao}/${estrutura.anos[estrutura.anos.length - 1]}/Notas de Empenho`,
            notasFiscais: `${estrutura.abreviacao}/${estrutura.anos[estrutura.anos.length - 1]}/Notas Fiscais`
          },
          validada: true,
          dataValidacao: new Date().toISOString()
        },
        dataCriacao: new Date().toISOString()
      };

      await this.salvarConfiguracao(configData);

      this.pastaConfigurada = true;
      this.estruturaCriada = true;
      this.atualizarStatus();

      alert(
        `✅ Estrutura existente adotada com sucesso!\n\n` +
          `📁 Abreviação: ${estrutura.abreviacao}\n` +
          `📅 Anos encontrados: ${estrutura.anos.join(', ')}\n` +
          `📝 Notas de Empenho: ${estrutura.temNotasEmpenho ? 'Sim' : 'Não'}\n` +
          `📄 Notas Fiscais: ${estrutura.temNotasFiscais ? 'Sim' : 'Não'}\n\n` +
          `O sistema usará esta estrutura para salvar novos documentos.`
      );
    } catch (error) {
      console.error('❌ Erro ao adotar estrutura:', error);
      alert('❌ Erro ao adotar estrutura: ' + error.message);
    }
  }

  /**
   * Salva ou cria pasta para um ano específico (sob demanda)
   * @param {number} ano - Ano fiscal do documento
   * @param {string} tipo - "empenho" ou "notaFiscal"
   */
  async obterPastaDocumento(ano, tipo) {
    try {
      if (!this.configPastas?.estrutura) {
        throw new Error('Estrutura não configurada');
      }

      const abreviacao = this.configPastas.unidade.abreviacao;

      // Tenta acessar fsManager do contexto atual ou do pai (iframe)
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;
      const raiz = fsManager?.mainDirectoryHandle;

      if (!raiz) {
        throw new Error('Pasta raiz não encontrada');
      }

      // Navega/cria: Raiz → Unidade → Ano → Tipo
      const pastaUnidade = await raiz.getDirectoryHandle(abreviacao, { create: true });
      const pastaAno = await pastaUnidade.getDirectoryHandle(ano.toString(), { create: true });

      const nomePasta = tipo === 'empenho' ? 'Notas de Empenho' : 'Notas Fiscais';
      const pastaTipo = await pastaAno.getDirectoryHandle(nomePasta, { create: true });

      console.log(`📁 Pasta obtida: ${abreviacao}/${ano}/${nomePasta}`);

      return {
        handle: pastaTipo,
        caminho: `${abreviacao}/${ano}/${nomePasta}`
      };
    } catch (error) {
      console.error('Erro ao obter pasta:', error);
      throw error;
    }
  }

  /**
   * Abre pasta raiz no explorador
   */
  async abrirPastaRaiz() {
    try {
      // Tenta acessar fsManager do contexto atual ou do pai (iframe)
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;

      if (!fsManager?.mainDirectoryHandle) {
        alert('❌ Pasta principal não configurada!');
        return;
      }

      // Método 1: Tentar abrir o seletor apontando para a pasta configurada
      // Isso abrirá o explorador de arquivos com a pasta já selecionada
      try {
        const dirHandle = await window.showDirectoryPicker({
          id: 'SINGEM-main-folder',
          mode: 'readwrite',
          startIn: fsManager.mainDirectoryHandle
        });

        // Se o usuário selecionou uma pasta (pode ser a mesma ou diferente)
        if (dirHandle) {
          fsManager.mainDirectoryHandle = dirHandle;
          await fsManager.saveFolderReference();
          console.log('📁 Pasta acessada:', dirHandle.name);
        }
      } catch (pickerError) {
        // Se usuário cancelou (AbortError), tudo bem
        if (pickerError.name === 'AbortError') {
          console.log('Usuário fechou o seletor de pasta');
          return;
        }

        // Se houve outro erro, tentar método alternativo
        throw pickerError;
      }
    } catch (error) {
      console.error('Erro ao abrir pasta:', error);

      // Método alternativo: mostrar informações da pasta
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;
      if (fsManager?.mainDirectoryHandle) {
        alert(
          `📁 Pasta configurada:\n\n${fsManager.mainDirectoryHandle.name}\n\n` +
            `💡 Dica: Use o explorador de arquivos do seu sistema para navegar até esta pasta.`
        );
      } else {
        alert('❌ Erro ao abrir pasta: ' + error.message);
      }
    }
  }

  /**
   * Reseta configuração (remove tudo)
   */
  async resetarConfiguracao() {
    try {
      const confirmar = confirm(
        `⚠️ ATENÇÃO!\n\n` +
          `Isso irá remover APENAS as configurações salvas no sistema.\n` +
          `As pastas físicas no seu computador NÃO serão excluídas.\n\n` +
          `Deseja continuar?`
      );

      if (!confirmar) {
        return;
      }

      console.log('🗑️ Iniciando reset da configuração...');

      await this.ensureDBReady();

      // Remover configuração de estrutura de pastas
      await window.dbManager.delete('config', 'estruturaPastas');
      console.log('✅ Configuração de estrutura removida');

      // Limpar referência da pasta principal no fsManager
      const fsManager = window.fsManager || window.parent?.fsManager || window.top?.fsManager;
      if (fsManager && fsManager.clearFolderReference) {
        await fsManager.clearFolderReference();
        console.log('✅ Referência da pasta principal removida');
      } else if (fsManager) {
        // Fallback: limpar manualmente
        fsManager.mainDirectoryHandle = null;
        console.log('⚠️ Referência da pasta limpa manualmente (fallback)');
      }

      // Limpar estado local
      this.configPastas = null;
      this.pastaConfigurada = false;
      this.estruturaCriada = false;

      this.atualizarStatus();

      console.log('✅ Reset completo realizado');
      alert('✅ Configuração resetada com sucesso!');
    } catch (error) {
      console.error('❌ Erro ao resetar configuração:', error);
      alert('❌ Erro ao resetar: ' + error.message);
    }
  }

  /**
   * Salva configuração no IndexedDB
   */
  async salvarConfiguracao(config) {
    try {
      console.log('💾 Iniciando salvamento da configuração...');
      console.log('📋 Dados a salvar:', config);

      await this.ensureDBReady();

      const dataToSave = {
        id: 'estruturaPastas',
        ...config,
        dataAtualizacao: new Date().toISOString()
      };

      console.log('💾 Salvando no IndexedDB:', dataToSave);

      await window.dbManager.update('config', dataToSave);

      this.configPastas = config;
      console.log('✅ Configuração salva com sucesso no IndexedDB');

      // Verificar se realmente foi salvo
      const verificacao = await window.dbManager.get('config', 'estruturaPastas');
      console.log('🔍 Verificação de salvamento:', verificacao);
    } catch (error) {
      console.error('❌ Erro ao salvar configuração:', error);
      throw error;
    }
  }
}

// Expõe globalmente
window.settingsArquivos = new SettingsArquivos();
