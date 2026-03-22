/**
 * Configurações → Unidade Orçamentária
 * Gerencia cadastro de unidades orçamentárias do IF Baiano
 */

class SettingsUnidade {
  constructor() {
    this.unidades = [];
    this.unidadeAtual = null;
    this.editandoId = null;
    this.carregado = false;

    // ============================================================================
    // AGUARDA BOOTSTRAP - Não inicializa até window.repository estar disponível
    // ============================================================================
    this.waitForBootstrap().then(() => {
      // Inicializa de forma assíncrona APÓS bootstrap
      this.init().catch((error) => {
        console.error('❌ Erro ao inicializar módulo de unidades:', error);
      });
    });
  }

  /**
   * Aguarda o bootstrap da aplicação completar
   * Usa evento 'SINGEM:bootstrap:done' ou flag window.__SINGEM_BOOTSTRAP_DONE__
   * Fallback: considera pronto se window.repository e window.dbManager.db já existirem
   * @param {number} timeoutMs - Timeout em milissegundos (padrão: 20000)
   * @returns {Promise<boolean>}
   */
  async waitForBootstrap(timeoutMs = 20000) {
    // Se já completou, retorna imediatamente
    if (window.__SINGEM_BOOTSTRAP_DONE__) {
      console.log('[SettingsUnidade] ✅ Bootstrap já completo');
      return true;
    }

    // Fallback: se repository e db já existem, considera pronto
    if (window.repository && window.dbManager?.db) {
      console.log('[SettingsUnidade] ✅ Bootstrap pronto (fallback: repository + db disponíveis)');
      window.__SINGEM_BOOTSTRAP_DONE__ = true;
      return true;
    }

    console.log('[SettingsUnidade] ⏳ Aguardando bootstrap da aplicação...');

    return new Promise((resolve, reject) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (resolved) {
          return;
        }
        // Última tentativa de fallback antes de falhar
        if (window.repository && window.dbManager?.db) {
          resolved = true;
          console.log('[SettingsUnidade] ✅ Bootstrap pronto (fallback no timeout)');
          window.__SINGEM_BOOTSTRAP_DONE__ = true;
          resolve(true);
          return;
        }
        reject(
          new Error(
            'Timeout: Bootstrap não completou. repository=' + !!window.repository + ', db=' + !!window.dbManager?.db
          )
        );
      }, timeoutMs);

      window.addEventListener(
        'SINGEM:bootstrap:done',
        () => {
          if (resolved) {
            return;
          }
          resolved = true;
          clearTimeout(timer);
          console.log('[SettingsUnidade] ✅ Bootstrap completo (via evento)');
          resolve(true);
        },
        { once: true }
      );

      // Polling de fallback a cada 500ms
      const pollInterval = setInterval(() => {
        if (resolved) {
          clearInterval(pollInterval);
          return;
        }
        if (window.repository && window.dbManager?.db) {
          resolved = true;
          clearTimeout(timer);
          clearInterval(pollInterval);
          console.log('[SettingsUnidade] ✅ Bootstrap pronto (via polling)');
          window.__SINGEM_BOOTSTRAP_DONE__ = true;
          resolve(true);
        }
      }, 500);
    });
  }

  /**
   * Garante que o dbManager está inicializado antes de operações
   * @returns {Promise<void>}
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

  async init() {
    console.log('🏢 Inicializando módulo de unidades...');
    this.setupEventListeners();

    // Carrega dados das unidades automaticamente
    await this.load();
    console.log('✅ Módulo de unidades inicializado');
  }

  setupEventListeners() {
    // Salvar unidade
    document.getElementById('formUnidade')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.salvar();
    });

    // Formatar CNPJ ao digitar
    document.getElementById('cnpjUnidade')?.addEventListener('input', (e) => {
      e.target.value = this.formatarCNPJ(e.target.value);
    });

    // Upload de logomarca
    document.getElementById('logomarcaUnidade')?.addEventListener('change', (e) => {
      this.handleLogomarcaUpload(e);
    });

    // Remover logomarca
    document.getElementById('btnRemoverLogomarca')?.addEventListener('click', () => {
      this.removerLogomarca();
    });
  }

  /**
   * Carrega dados das unidades
   */
  async load() {
    try {
      console.log('📥 Carregando unidades do banco...');

      this.unidades = await this.getTodasUnidades();

      // Carrega unidade principal (para compatibilidade)
      this.unidadeAtual = await this.getUnidadeOrcamentaria();

      console.log(`✅ ${this.unidades.length} unidade(s) carregada(s)`);

      // Se há apenas uma unidade, preenche o formulário
      if (this.unidades.length === 1) {
        const unidade = this.unidades[0];
        this.preencherFormulario(unidade);
        this.atualizarStatus(true, unidade.cnpj);
      } else if (this.unidades.length === 0) {
        this.atualizarStatus(false);
      } else {
        this.atualizarStatus(true, 'Múltiplas unidades');
      }

      this.renderizarLista();
      this.carregado = true;
    } catch (error) {
      console.error('❌ Erro ao carregar unidades:', error);
    }
  }

  /**
   * Preenche formulário com dados da unidade
   */
  preencherFormulario(unidade) {
    document.getElementById('razaoSocialUnidade').value = unidade.razaoSocial || '';
    document.getElementById('cnpjUnidade').value = unidade.cnpj || '';
    document.getElementById('ugUnidade').value = unidade.ug || '';
    document.getElementById('enderecoUnidade').value = unidade.endereco || '';
    document.getElementById('municipioUnidade').value = unidade.municipio || '';
    document.getElementById('ufUnidade').value = unidade.uf || '';

    // Carrega logomarca se existir
    if (unidade.logomarca) {
      this.mostrarPreviewLogomarca(unidade.logomarca);
    }
  }

  /**
   * Limpa formulário
   */
  limparFormulario() {
    document.getElementById('formUnidade').reset();
    this.editandoId = null;
    this.removerLogomarca();
  }

  /**
   * Manipula upload de logomarca
   */
  async handleLogomarcaUpload(event) {
    const file = event.target.files[0];
    if (!file) {
      return;
    }

    // Valida tipo de arquivo
    const tiposPermitidos = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!tiposPermitidos.includes(file.type)) {
      alert('❌ Formato não permitido! Use PNG, JPG ou SVG.');
      event.target.value = '';
      return;
    }

    // Valida tamanho (2MB)
    const tamanhoMaximo = 2 * 1024 * 1024; // 2MB em bytes
    if (file.size > tamanhoMaximo) {
      alert('❌ Arquivo muito grande! Tamanho máximo: 2MB');
      event.target.value = '';
      return;
    }

    try {
      // Converte para base64
      const base64 = await this.fileToBase64(file);
      this.mostrarPreviewLogomarca(base64);
    } catch (error) {
      console.error('Erro ao processar logomarca:', error);
      alert('❌ Erro ao processar imagem');
    }
  }

  /**
   * Converte arquivo para base64
   */
  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Mostra preview da logomarca
   */
  mostrarPreviewLogomarca(base64) {
    const preview = document.getElementById('previewLogomarca');
    const img = document.getElementById('imgPreviewLogomarca');

    if (preview && img) {
      img.src = base64;
      preview.classList.remove('hidden');
    }
  }

  /**
   * Remove logomarca
   */
  removerLogomarca() {
    const input = document.getElementById('logomarcaUnidade');
    const preview = document.getElementById('previewLogomarca');
    const img = document.getElementById('imgPreviewLogomarca');

    if (input) {
      input.value = '';
    }
    if (img) {
      img.src = '';
    }
    if (preview) {
      preview.classList.add('hidden');
    }
  }

  /**
   * Salva dados da unidade
   */
  async salvar() {
    try {
      // ============================================================================
      // VERIFICAÇÕES DE SEGURANÇA - Garantir que módulos estão disponíveis
      // ============================================================================
      if (!window.dbManager) {
        alert('❌ Erro: Banco de dados não inicializado! Recarregue a página.');
        console.error('[SAVE_UNIDADE] dbManager não está disponível');
        return;
      }

      if (!window.repository) {
        alert('❌ Erro: Módulo de repositório não carregado! Recarregue a página.');
        console.error('[SAVE_UNIDADE] window.repository não está disponível');
        console.error('[SAVE_UNIDADE] Tipo:', typeof window.repository);
        return;
      }

      if (typeof window.repository.saveUnidade !== 'function') {
        alert('❌ Erro: Método saveUnidade não encontrado! Recarregue a página.');
        console.error('[SAVE_UNIDADE] saveUnidade não é uma função');
        console.error('[SAVE_UNIDADE] repository:', window.repository);
        return;
      }

      const razaoSocial = document.getElementById('razaoSocialUnidade').value.trim();
      const cnpj = document.getElementById('cnpjUnidade').value.trim();

      // Validações
      if (!razaoSocial) {
        alert('❌ Razão Social é obrigatória!');
        return;
      }

      if (!cnpj) {
        alert('❌ CNPJ é obrigatório!');
        return;
      }

      // Valida CNPJ
      const cnpjNumeros = cnpj.replace(/\D/g, '');
      if (!this.validarCNPJAlgoritmo(cnpjNumeros)) {
        alert('❌ CNPJ inválido! Verifique os dígitos verificadores.');
        return;
      }

      // Verifica se CNPJ já existe (exceto se estiver editando)
      const cnpjExistente = this.unidades.find((u) => u.cnpjNumeros === cnpjNumeros && u.id !== this.editandoId);

      if (cnpjExistente) {
        alert('❌ Já existe uma unidade cadastrada com este CNPJ!');
        return;
      }

      // Pega logomarca se houver
      const imgPreview = document.getElementById('imgPreviewLogomarca');
      const logomarca = imgPreview && imgPreview.src && imgPreview.src.startsWith('data:') ? imgPreview.src : null;

      const unidade = {
        id: this.editandoId || this.gerarId(),
        razaoSocial: razaoSocial,
        cnpj: cnpj,
        cnpjNumeros: cnpjNumeros,
        ug: document.getElementById('ugUnidade').value.trim(),
        endereco: document.getElementById('enderecoUnidade').value.trim(),
        municipio: document.getElementById('municipioUnidade').value.trim(),
        uf: document.getElementById('ufUnidade').value.trim(),
        logomarca: logomarca,
        dataAtualizacao: new Date().toISOString(),
        ativa: true
      };

      // ============================================================================
      // SALVAR COM RETRY E FEEDBACK MELHORADO
      // ============================================================================
      try {
        // Aguarda repository estar pronto (com retry)
        const maxRetries = 3;
        let saved = false;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            console.log(`[SAVE_UNIDADE] Tentativa ${attempt}/${maxRetries}...`);

            await window.repository.saveUnidade(unidade);

            // Recarrega lista do banco após commit
            this.unidades = await window.repository.listUnidades();

            saved = true;
            console.log('[SAVE_UNIDADE] ✅ Unidade salva com sucesso');
            break; // Sucesso, sai do loop
          } catch (error) {
            console.error(`[SAVE_UNIDADE] Tentativa ${attempt} falhou:`, error);

            if (attempt >= maxRetries) {
              throw error; // Último retry, propaga erro
            }

            // Aguarda antes de retry
            const delay = 300 * attempt;
            console.log(`[SAVE_UNIDADE] ⏳ Aguardando ${delay}ms antes de retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }

        if (saved) {
          const acao = this.editandoId ? 'atualizada' : 'cadastrada';
          alert(`✅ Unidade ${acao} com sucesso!`);
        }
      } catch (error) {
        console.error('[SAVE_UNIDADE] ❌ Erro final ao salvar unidade:', error);
        throw new Error(`Falha ao salvar (transação abortada). ${error.message}`);
      }

      // Se for a primeira unidade, define como principal
      if (this.unidades.length === 1) {
        await this.saveUnidadeOrcamentaria(unidade);
      }

      // Limpa formulário e recarrega lista
      this.limparFormulario();
      this.renderizarLista();
      this.atualizarStatus(true, this.unidades.length > 1 ? 'Múltiplas unidades' : cnpj);
    } catch (error) {
      console.error('Erro ao salvar unidade:', error);
      alert('❌ Erro ao salvar: ' + error.message);
    }
  }

  /**
   * Renderiza lista de unidades
   */
  async renderizarLista() {
    const tbody = document.getElementById('listaUnidades');
    if (!tbody) {
      return;
    }

    if (this.unidades.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="table-empty-message">
            Nenhuma unidade cadastrada
          </td>
        </tr>
      `;
      return;
    }

    // Carrega usuários para verificar vínculos
    const usuarios = await this.getUsuariosVinculados();

    tbody.innerHTML = this.unidades
      .map((unidade) => {
        const usuariosVinculados = usuarios.filter(
          (u) => u.unidadeOrcamentaria && u.unidadeOrcamentaria.id === unidade.id
        );

        return `
      <tr>
        <td>
          ${unidade.logomarca ? `<img src="${unidade.logomarca}" alt="Logo" class="settings-logo-thumb">` : '🏛️'}
        </td>
        <td><strong>${unidade.razaoSocial}</strong></td>
        <td>${unidade.cnpj}</td>
        <td>${unidade.ug || '-'}</td>
        <td>
          ${this.renderizarUsuariosVinculados(unidade.id, usuariosVinculados)}
        </td>
        <td>
          <button
            class="btn btn-sm btn-outline"
            onclick="settingsUnidade.editarUnidade('${unidade.id}')">
            ✏️ Editar
          </button>
          <button
            class="btn btn-sm btn-outline"
            onclick="settingsUnidade.vincularUnidadeAoUsuario('${unidade.id}')">
            🔗 Vincular ao Usuário
          </button>
          <button
            class="btn btn-sm btn-danger"
            onclick="settingsUnidade.excluirUnidade('${unidade.id}')">
            🗑️ Excluir
          </button>
        </td>
      </tr>
    `;
      })
      .join('');
  }

  /**
   * Renderiza lista de usuários vinculados à unidade
   */
  renderizarUsuariosVinculados(unidadeId, usuarios) {
    if (usuarios.length === 0) {
      return `
        <div class="settings-user-unit">
          <span class="settings-user-unit__status settings-user-unit__status--unlinked">
            ⚠️ Nenhum usuário vinculado
          </span>
          <button
            class="btn btn-xs btn-primary"
            onclick="settingsUnidade.vincularUsuarioAUnidade('${unidadeId}')"
            title="Vincular um usuário a esta unidade">
            🔗 Vincular Usuário
          </button>
        </div>
      `;
    }

    // Lista de usuários vinculados
    const listaUsuarios = usuarios
      .map((u) => {
        const icone = u.perfil === 'admin' ? '👑' : '👤';
        return `${icone} ${u.nome}`;
      })
      .join(', ');

    return `
      <div class="settings-user-unit">
        <span class="settings-user-unit__status settings-user-unit__status--linked">
          ✅ ${listaUsuarios}
        </span>
        <button
          class="btn btn-xs btn-outline"
          onclick="settingsUnidade.vincularUsuarioAUnidade('${unidadeId}')"
          title="Adicionar mais usuários">
          ➕ Adicionar
        </button>
      </div>
    `;
  }

  /**
   * Obtém lista de usuários com vínculos
   */
  async getUsuariosVinculados() {
    try {
      await this.ensureDBReady();

      // ============================================================================
      // USA REPOSITORY - Garante sincronia com salvamentos
      // ============================================================================
      return await window.repository.listUsuarios();
    } catch (error) {
      console.error('Erro ao obter usuários:', error);
      return [];
    }
  }

  /**
   * Editar unidade
   */
  editarUnidade(id) {
    const unidade = this.unidades.find((u) => u.id === id);
    if (!unidade) {
      return;
    }

    this.editandoId = id;
    this.preencherFormulario(unidade);

    // Scroll para o topo do formulário
    document.getElementById('formUnidade').scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Vincular unidade ao usuário logado
   */
  async vincularUnidadeAoUsuario(unidadeId) {
    try {
      // Garante que banco está pronto
      await this.ensureDBReady();

      // Carrega unidades do banco se necessário
      if (!this.unidades || this.unidades.length === 0) {
        console.log('📥 Carregando unidades do banco...');
        await this.load();
      }

      const unidade = this.unidades.find((u) => u.id === unidadeId);
      if (!unidade) {
        alert('❌ Unidade não encontrada!');
        return;
      }

      // Verifica se há usuário logado
      console.log('🔍 Verificando usuário logado...');

      // Tenta acessar window.app do contexto atual ou do pai (se estiver em iframe)
      const app = window.app || window.parent?.app || window.top?.app;

      console.log('🔍 app existe?', !!app);
      console.log('🔍 app.usuarioLogado:', app?.usuarioLogado);

      if (!app || !app.usuarioLogado) {
        console.warn('⚠️ Nenhum usuário logado detectado!');
        alert('⚠️ Nenhum usuário logado no momento.\n\nPara vincular uma unidade, faça logout e login novamente.');
        return;
      }

      const usuarioLogado = app.usuarioLogado;

      const confirma = confirm(
        `Deseja vincular a unidade:\n\n` +
          `🏢 ${unidade.razaoSocial}\n` +
          `📋 CNPJ: ${unidade.cnpj}\n\n` +
          `ao usuário:\n👤 ${usuarioLogado.nome || usuarioLogado.login}?\n\n` +
          `Esta será a unidade padrão para validação de NE e NF.`
      );

      if (!confirma) {
        return;
      }

      // Salva como unidade principal
      await this.saveUnidadeOrcamentaria(unidade);
      this.unidadeAtual = unidade;

      // Atualiza status
      this.atualizarStatus(true, unidade.cnpj);

      alert(
        `✅ Unidade vinculada com sucesso!\n\n` +
          `A partir de agora, todas as Notas de Empenho e Notas Fiscais ` +
          `serão validadas usando o CNPJ:\n${unidade.cnpj}`
      );

      // Atualiza dados na tela de login (se existir)
      if (window.app && typeof window.app.carregarDadosUnidade === 'function') {
        await window.app.carregarDadosUnidade();
      }
    } catch (error) {
      console.error('Erro ao vincular unidade:', error);
      alert('❌ Erro ao vincular unidade: ' + error.message);
    }
  }

  /**
   * Vincular usuário a esta unidade
   */
  async vincularUsuarioAUnidade(unidadeId) {
    try {
      await this.ensureDBReady();

      const unidade = this.unidades.find((u) => u.id === unidadeId);
      if (!unidade) {
        alert('❌ Unidade não encontrada!');
        return;
      }

      // ============================================================================
      // CARREGA USUÁRIOS VIA REPOSITORY - Garante sincronia
      // ============================================================================
      console.log('[VINCULAR_USUARIO] Carregando usuários via repository...');
      const usuarios = await window.repository.listUsuarios();
      console.log(`[VINCULAR_USUARIO] ${usuarios.length} usuário(s) encontrado(s)`);

      if (usuarios.length === 0) {
        alert('❌ Nenhum usuário cadastrado!\n\nPrimeiro cadastre usuários.');
        return;
      }

      // Filtra usuários não vinculados a esta unidade
      const usuariosDisponiveis = usuarios.filter(
        (u) => !u.unidadeOrcamentaria || u.unidadeOrcamentaria.id !== unidadeId
      );

      if (usuariosDisponiveis.length === 0) {
        alert('ℹ️ Todos os usuários já estão vinculados a esta unidade!');
        return;
      }

      // Se há apenas um usuário disponível
      if (usuariosDisponiveis.length === 1) {
        const user = usuariosDisponiveis[0];
        const confirmar = confirm(
          `Vincular usuário:\n\n👤 ${user.nome} (${user.login})\n\nà unidade:\n\n🏢 ${unidade.razaoSocial}?`
        );

        if (confirmar) {
          await this.executarVinculacaoUsuario(user, unidade, usuarios);
        }
        return;
      }

      // Múltiplos usuários - mostrar seleção
      const opcoes = usuariosDisponiveis
        .map((u, i) => {
          const icone = u.perfil === 'admin' ? '👑' : '👤';
          return `${i + 1}. ${icone} ${u.nome} (${u.login})`;
        })
        .join('\n');

      const escolha = prompt(
        `Escolha o usuário para vincular à unidade:\n${unidade.razaoSocial}\n\n${opcoes}\n\nDigite o número:`
      );

      if (escolha) {
        const index = parseInt(escolha) - 1;
        if (index >= 0 && index < usuariosDisponiveis.length) {
          await this.executarVinculacaoUsuario(usuariosDisponiveis[index], unidade, usuarios);
        } else {
          alert('❌ Opção inválida!');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao vincular usuário:', error);
      alert('❌ Erro ao vincular usuário: ' + error.message);
    }
  }

  /**
   * Executa a vinculação de usuário à unidade
   */
  async executarVinculacaoUsuario(usuario, unidade, _todosUsuarios) {
    try {
      // Atualiza usuário com dados da unidade
      usuario.unidadeOrcamentaria = {
        id: unidade.id,
        cnpj: unidade.cnpj,
        razaoSocial: unidade.razaoSocial,
        ug: unidade.ug
      };

      // ============================================================================
      // SALVA USANDO REPOSITORY - Garante sincronia com listUsuarios()
      // ============================================================================
      console.log('[VINCULAR_USUARIO] Salvando usuário atualizado via repository...');

      await window.repository.saveUsuario(usuario);

      console.log('[VINCULAR_USUARIO] ✅ Usuário salvo com sucesso');

      alert(`✅ Usuário vinculado com sucesso!\n\n${usuario.nome} → ${unidade.razaoSocial}`);

      // Atualiza a lista de unidades
      await this.renderizarLista();

      // 🔄 ATUALIZA A LISTA DE USUÁRIOS TAMBÉM (se a tela estiver carregada)
      if (window.settingsUsuarios && typeof window.settingsUsuarios.load === 'function') {
        console.log('🔄 Recarregando lista de usuários do banco...');
        await window.settingsUsuarios.load();
      }

      console.log('✅ Vínculo criado:', {
        usuario: usuario.nome,
        unidade: unidade.razaoSocial
      });
    } catch (error) {
      console.error('❌ Erro ao executar vinculação:', error);
      throw error;
    }
  } /**
   * Excluir unidade
   */
  async excluirUnidade(id) {
    try {
      const unidade = this.unidades.find((u) => u.id === id);
      if (!unidade) {
        return;
      }

      const confirma = confirm(
        `⚠️ ATENÇÃO!\n\n` +
          `Deseja realmente excluir a unidade:\n\n` +
          `${unidade.razaoSocial}\n` +
          `CNPJ: ${unidade.cnpj}\n\n` +
          `Esta ação NÃO pode ser desfeita!`
      );

      if (!confirma) {
        return;
      }

      await this.removerUnidade(id);

      // Se era a unidade principal, limpa
      if (this.unidadeAtual && this.unidadeAtual.id === id) {
        await this.saveUnidadeOrcamentaria(null);
        this.unidadeAtual = null;
      }

      alert('✅ Unidade excluída com sucesso!');
      await this.load();
    } catch (error) {
      console.error('Erro ao excluir unidade:', error);
      alert('❌ Erro ao excluir: ' + error.message);
    }
  }

  /**
   * Gera ID único
   */
  gerarId() {
    return 'unidade_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Valida CNPJ usando algoritmo oficial da Receita Federal
   */
  validarCNPJAlgoritmo(cnpj) {
    if (!cnpj || cnpj.length !== 14) {
      return false;
    }

    // Elimina CNPJs inválidos conhecidos
    if (/^(\d)\1+$/.test(cnpj)) {
      return false;
    }

    // Valida DVs
    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    const digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }

    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(0))) {
      return false;
    }

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) {
        pos = 9;
      }
    }

    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== parseInt(digitos.charAt(1))) {
      return false;
    }

    return true;
  }

  /**
   * Formata CNPJ para exibição
   */
  formatarCNPJ(cnpj) {
    const numeros = cnpj.replace(/\D/g, '');
    if (numeros.length <= 14) {
      return numeros
        .replace(/^(\d{2})(\d)/, '$1.$2')
        .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
        .replace(/\.(\d{3})(\d)/, '.$1/$2')
        .replace(/(\d{4})(\d)/, '$1-$2');
    }
    return cnpj;
  }

  /**
   * Atualiza status visual
   */
  atualizarStatus(configurado, cnpj = '') {
    const statusDiv = document.getElementById('statusUnidade');
    if (!statusDiv) {
      return;
    }

    if (configurado) {
      statusDiv.innerHTML = `
        <div class="status-message success">
          <strong>✅ CNPJ Configurado:</strong> ${cnpj}
        </div>
      `;
    } else {
      statusDiv.innerHTML = `
        <div class="status-message warning">
          <strong>⚠️ CNPJ não configurado</strong><br>
          Configure a Unidade Orçamentária para validar Notas de Empenho e Notas Fiscais.
        </div>
      `;
    }
  }

  /**
   * Obtém unidade orçamentária principal da base de configuração
   */
  async getUnidadeOrcamentaria() {
    try {
      // Garante inicialização do banco
      await this.ensureDBReady();

      const result = await window.dbManager.get('config', 'unidadeOrcamentaria');
      return result || null;
    } catch (error) {
      console.error('Erro ao buscar unidade:', error);
      return null;
    }
  }

  /**
   * Obtém todas as unidades cadastradas
   */
  async getTodasUnidades() {
    try {
      // Garante inicialização do banco
      await this.ensureDBReady();

      const result = await window.dbManager.get('config', 'todasUnidades');
      return result ? result.unidades : [];
    } catch (error) {
      console.error('Erro ao buscar unidades:', error);
      return [];
    }
  }

  /**
   * Adiciona nova unidade
   */
  async adicionarUnidade(unidade) {
    try {
      this.unidades.push(unidade);
      await this.salvarTodasUnidades();
    } catch (error) {
      console.error('Erro ao adicionar unidade:', error);
      throw error;
    }
  }

  /**
   * Atualiza unidade existente
   */
  async atualizarUnidade(unidade) {
    try {
      const index = this.unidades.findIndex((u) => u.id === unidade.id);
      if (index !== -1) {
        this.unidades[index] = unidade;
        await this.salvarTodasUnidades();
      }
    } catch (error) {
      console.error('Erro ao atualizar unidade:', error);
      throw error;
    }
  }

  /**
   * Remove unidade
   */
  async removerUnidade(id) {
    try {
      this.unidades = this.unidades.filter((u) => u.id !== id);
      await this.salvarTodasUnidades();
    } catch (error) {
      console.error('Erro ao remover unidade:', error);
      throw error;
    }
  }

  /**
   * Salva todas as unidades na base de configuração
   */
  async salvarTodasUnidades() {
    try {
      // Garante inicialização do banco
      await this.ensureDBReady();

      const data = {
        id: 'todasUnidades',
        unidades: this.unidades,
        dataAtualizacao: new Date().toISOString()
      };
      await window.dbManager.update('config', data);
      console.log('✅ Todas as unidades salvas na base de configuração');
    } catch (error) {
      console.error('❌ Erro ao salvar unidades:', error);
      throw new Error(`Falha ao salvar unidades: ${error.message}`);
    }
  }

  /**
   * Salva a unidade principal (principal)
   */
  async saveUnidadeOrcamentaria(unidade) {
    try {
      // Garante inicialização do banco
      await this.ensureDBReady();

      // IMPORTANTE: Sempre força id: "unidadeOrcamentaria" para compatibilidade
      const data = {
        ...(unidade || {}),
        id: 'unidadeOrcamentaria' // ID fixo para leitura global
      };
      await window.dbManager.update('config', data);
      console.log('✅ Unidade principal salva na base de configuração');
    } catch (error) {
      console.error('❌ Erro ao salvar unidade principal:', error);
      throw new Error(`Falha ao salvar unidade principal: ${error.message}`);
    }
  }
}

// Função global para outros módulos acessarem
window.getUnidadeOrcamentaria = async function () {
  try {
    // Garante inicialização do banco
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

    const result = await window.dbManager.get('config', 'unidadeOrcamentaria');
    return result || null;
  } catch (error) {
    console.error('Erro ao obter unidade orçamentária:', error);
    return null;
  }
};

// Instância global
window.settingsUnidade = new SettingsUnidade();
