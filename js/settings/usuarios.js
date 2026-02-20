/**
 * Configurações → Usuários
 * Gerencia cadastro de usuários com autenticação
 */

// Importa módulos de segurança
import { generateRecoveryPin, hashPin, createPinDisplayMessage } from '../core/recoveryPin.js';
import { auditLogger, AUDIT_EVENT_TYPES } from '../core/auditLog.js';

class SettingsUsuarios {
  constructor() {
    this.usuarios = [];
    this.usuarioLogado = null;

    // ============================================================================
    // AGUARDA BOOTSTRAP - Não inicializa até window.repository estar disponível
    // ============================================================================
    this.waitForBootstrap()
      .then(() => {
        this.init();
      })
      .catch((error) => {
        console.error('❌ Erro ao aguardar bootstrap:', error);
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
      console.log('[SettingsUsuarios] ✅ Bootstrap já completo');
      return true;
    }

    // Fallback: se repository e db já existem, considera pronto
    if (window.repository && window.dbManager?.db) {
      console.log('[SettingsUsuarios] ✅ Bootstrap pronto (fallback: repository + db disponíveis)');
      window.__SINGEM_BOOTSTRAP_DONE__ = true;
      return true;
    }

    console.log('[SettingsUsuarios] ⏳ Aguardando bootstrap...');

    return new Promise((resolve, reject) => {
      let resolved = false;

      const timer = setTimeout(() => {
        if (resolved) {
          return;
        }
        // Última tentativa de fallback antes de falhar
        if (window.repository && window.dbManager?.db) {
          resolved = true;
          console.log('[SettingsUsuarios] ✅ Bootstrap pronto (fallback no timeout)');
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
          console.log('[SettingsUsuarios] ✅ Bootstrap completo (via evento)');
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
          console.log('[SettingsUsuarios] ✅ Bootstrap pronto (via polling)');
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

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Salvar novo usuário
    document.getElementById('formNovoUsuario')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.salvarNovoUsuario();
    });

    // Editar usuário
    document.getElementById('btnSalvarEdicaoUsuario')?.addEventListener('click', async () => {
      await this.salvarEdicaoUsuario();
    });

    // Excluir usuário
    document.getElementById('btnExcluirUsuario')?.addEventListener('click', async () => {
      await this.excluirUsuario();
    });

    // Cancelar edição
    document.getElementById('btnCancelarEdicao')?.addEventListener('click', () => {
      this.cancelarEdicao();
    });

    // Verificar força da senha
    document.getElementById('senhaNovoUsuario')?.addEventListener('input', (e) => {
      this.verificarForcaSenha(e.target.value);
    });
  }

  /**
   * Carrega lista de usuários
   */
  async load() {
    try {
      this.usuarios = await this.getUsuarios();
      this.renderizarLista();

      // Se não há usuários cadastrados, destaca o formulário
      if (this.usuarios.length === 0) {
        this.destacarFormularioPrimeiroUsuario();
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  }

  /**
   * Destaca formulário para primeiro usuário
   */
  destacarFormularioPrimeiroUsuario() {
    const panel = document.querySelector('#tabUsuarios .panel:first-child');
    if (panel) {
      // Adiciona destaque visual
      panel.style.border = '3px solid #ff9800';
      panel.style.boxShadow = '0 0 20px rgba(255, 152, 0, 0.3)';
      panel.style.animation = 'pulse 2s ease-in-out infinite';

      // Adiciona mensagem de destaque
      const header = panel.querySelector('.panel-header');
      if (header && !header.querySelector('.primeiro-acesso-badge')) {
        const badge = document.createElement('span');
        badge.className = 'primeiro-acesso-badge';
        badge.innerHTML = '⚠️ PRIMEIRO USUÁRIO - OBRIGATÓRIO';
        badge.style.cssText =
          'background: #ff9800; color: white; padding: 5px 10px; border-radius: 5px; margin-left: 10px; font-size: 0.9em; animation: blink 1.5s ease-in-out infinite;';
        header.appendChild(badge);
      }
    }
  }

  /**
   * Renderiza lista de usuários
   */
  renderizarLista() {
    const tbody = document.getElementById('listaUsuarios');
    if (!tbody) {
      return;
    }

    if (this.usuarios.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; color: #999;">
            Nenhum usuário cadastrado
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.usuarios
      .map(
        (user) => `
      <tr>
        <td>${user.nome}</td>
        <td>${user.login}</td>
        <td>
          <span class="badge badge-${user.perfil === 'admin' ? 'primary' : 'secondary'}">
            ${user.perfil === 'admin' ? 'Administrador' : 'Usuário'}
          </span>
        </td>
        <td>
          ${this.renderizarVinculoUnidade(user)}
        </td>
        <td>
          <button class="btn btn-sm btn-outline" onclick="settingsUsuarios.editarUsuario('${user.id}')">
            ✏️ Editar
          </button>
        </td>
      </tr>
    `
      )
      .join('');
  }

  /**
   * Renderiza informação de vínculo com unidade
   */
  renderizarVinculoUnidade(user) {
    if (user.unidadeOrcamentaria && user.unidadeOrcamentaria.razaoSocial) {
      // Usuário vinculado a uma unidade
      return `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #4caf50; font-size: 12px;">
            ✅ ${user.unidadeOrcamentaria.razaoSocial}
          </span>
          <button
            class="btn btn-xs btn-outline"
            onclick="settingsUsuarios.desvincularUnidade('${user.id}')"
            title="Desvincular usuário da unidade">
            🔓 Desvincular
          </button>
        </div>
      `;
    } else {
      // Usuário sem vínculo
      return `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #ff9800; font-size: 12px;">
            ⚠️ Não vinculado
          </span>
          <button
            class="btn btn-xs btn-primary"
            onclick="settingsUsuarios.vincularUnidade('${user.id}')"
            title="Vincular usuário a uma unidade">
            🔗 Vincular Unidade
          </button>
        </div>
      `;
    }
  }

  /**
   * Salva novo usuário
   */
  /**
   * Salva novo usuário
   */
  async salvarNovoUsuario() {
    try {
      // VALIDAÇÃO: Verifica se há unidade orçamentária cadastrada
      const unidade = await window.getUnidadeOrcamentaria();

      if (!unidade || !unidade.cnpj) {
        alert(
          '❌ UNIDADE ORÇAMENTÁRIA NÃO CADASTRADA!\n\n' +
            'Antes de cadastrar usuários, você deve:\n\n' +
            "1. Ir para a aba 'Unidade Orçamentária'\n" +
            '2. Cadastrar os dados da instituição\n' +
            '3. Salvar\n\n' +
            'Todos os usuários devem estar vinculados a uma unidade orçamentária.'
        );
        return;
      }

      const nome = document.getElementById('nomeNovoUsuario').value.trim();
      const login = document.getElementById('loginNovoUsuario').value.trim();
      const senha = document.getElementById('senhaNovoUsuario').value;
      const perfil = document.getElementById('perfilNovoUsuario').value;

      // Validações
      if (!nome || !login || !senha) {
        alert('❌ Preencha todos os campos obrigatórios!');
        return;
      }

      if (senha.length < 6) {
        alert('❌ A senha deve ter pelo menos 6 caracteres!');
        return;
      }

      // Verifica se login já existe
      const loginExiste = this.usuarios.some((u) => u.login === login);
      if (loginExiste) {
        alert('❌ Login já cadastrado! Escolha outro login.');
        return;
      }

      // Hash da senha
      const senhaHash = await this.hashPassword(senha);

      // 🔢 GERA PIN DE RECUPERAÇÃO automaticamente
      const recoveryPin = generateRecoveryPin();
      const recoveryPinHash = await hashPin(recoveryPin);

      const usuario = {
        id: this.gerarId(),
        nome: nome,
        login: login,
        senhaHash: senhaHash,
        recoveryPinHash: recoveryPinHash,
        perfil: perfil,
        ativo: true,
        unidadeOrcamentaria: {
          id: unidade.id || 'unidadeOrcamentaria',
          cnpj: unidade.cnpj,
          razaoSocial: unidade.razaoSocial
        },
        dataCriacao: new Date().toISOString()
      };

      // Adiciona à lista
      this.usuarios.push(usuario);

      // Salva usando repository com transação garantida
      try {
        await window.repository.saveUsuario(usuario);

        // Recarrega lista do banco após commit
        this.usuarios = await window.repository.listUsuarios();

        console.log('✅ Usuário salvo com commit garantido');
      } catch (error) {
        console.error('❌ Erro ao salvar usuário:', error);
        // Remove da lista local se falhou
        this.usuarios = this.usuarios.filter((u) => u.id !== usuario.id);
        throw new Error(`Falha ao salvar (transação abortada). ${error.message}`);
      }

      // Atualiza interface
      this.renderizarLista();

      // Limpa formulário
      document.getElementById('formNovoUsuario').reset();
      document.getElementById('indicadorForcaSenha').innerHTML = '';

      // 🔐 EXIBE PIN DE RECUPERAÇÃO (uma única vez)
      const pinMessage = createPinDisplayMessage(recoveryPin);
      alert(pinMessage);

      // 📝 Registra no audit log (sem expor o PIN)
      await auditLogger.log(AUDIT_EVENT_TYPES.USER_CREATED, {
        username: login,
        success: true,
        action: 'Cadastro de usuário',
        message: `Usuário ${nome} cadastrado com PIN de recuperação`,
        metadata: {
          perfil: perfil,
          unidade: unidade.razaoSocial
        }
      });

      // Mensagem de confirmação simples
      console.log(`✅ Usuário ${nome} cadastrado com sucesso`);
      console.log(`📋 Perfil: ${perfil === 'admin' ? 'Administrador' : 'Usuário'}`);
      console.log(`🏢 Unidade: ${unidade.razaoSocial}`);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
      alert('❌ Erro ao salvar: ' + error.message);
    }
  }

  /**
   * Editar usuário
   */
  editarUsuario(id) {
    const usuario = this.usuarios.find((u) => u.id === id);
    if (!usuario) {
      return;
    }

    // Preenche formulário de edição
    document.getElementById('idEdicaoUsuario').value = usuario.id;
    document.getElementById('nomeEdicaoUsuario').value = usuario.nome;
    document.getElementById('loginEdicaoUsuario').value = usuario.login;
    document.getElementById('perfilEdicaoUsuario').value = usuario.perfil;
    document.getElementById('ativoEdicaoUsuario').checked = usuario.ativo;

    // Mostra painel de edição
    document.getElementById('panelNovoUsuario').style.display = 'none';
    document.getElementById('panelEdicaoUsuario').style.display = 'block';
  }

  /**
   * Salva edição de usuário
   */
  async salvarEdicaoUsuario() {
    try {
      const id = document.getElementById('idEdicaoUsuario').value;
      const nome = document.getElementById('nomeEdicaoUsuario').value.trim();
      const login = document.getElementById('loginEdicaoUsuario').value.trim();
      const perfil = document.getElementById('perfilEdicaoUsuario').value;
      const ativo = document.getElementById('ativoEdicaoUsuario').checked;
      const novaSenha = document.getElementById('novaSenhaEdicao').value;

      const usuario = this.usuarios.find((u) => u.id === id);
      if (!usuario) {
        alert('❌ Usuário não encontrado!');
        return;
      }

      // Atualiza dados
      usuario.nome = nome;
      usuario.login = login;
      usuario.perfil = perfil;
      usuario.ativo = ativo;
      usuario.dataAtualizacao = new Date().toISOString();

      // Atualiza senha se fornecida
      if (novaSenha) {
        if (novaSenha.length < 6) {
          alert('❌ A nova senha deve ter pelo menos 6 caracteres!');
          return;
        }
        usuario.senhaHash = await this.hashPassword(novaSenha);
      }

      // ============================================================================
      // SALVA VIA REPOSITORY - Garante sincronia
      // ============================================================================
      console.log('[EDITAR_USUARIO] Salvando usuário editado via repository...');
      await window.repository.saveUsuario(usuario);
      console.log('[EDITAR_USUARIO] ✅ Usuário atualizado com sucesso');

      // Recarrega lista do banco para garantir sincronia
      await this.load();

      this.cancelarEdicao();

      alert('✅ Usuário atualizado com sucesso!');
    } catch (error) {
      console.error('[EDITAR_USUARIO] ❌ Erro ao atualizar usuário:', error);
      alert('❌ Erro ao atualizar: ' + error.message);
    }
  }

  /**
   * Excluir usuário
   */
  async excluirUsuario() {
    try {
      const id = document.getElementById('idEdicaoUsuario').value;

      if (!confirm('⚠️ Tem certeza que deseja excluir este usuário?')) {
        return;
      }

      // Remove do IndexedDB
      await this.deleteUsuario(id);

      // Remove da lista
      this.usuarios = this.usuarios.filter((u) => u.id !== id);
      this.renderizarLista();
      this.cancelarEdicao();

      alert('✅ Usuário excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      alert('❌ Erro ao excluir: ' + error.message);
    }
  }

  /**
   * Cancela edição
   */
  cancelarEdicao() {
    document.getElementById('panelNovoUsuario').style.display = 'block';
    document.getElementById('panelEdicaoUsuario').style.display = 'none';
    document.getElementById('novaSenhaEdicao').value = '';
  }

  /**
   * Verifica força da senha
   */
  verificarForcaSenha(senha) {
    const indicador = document.getElementById('indicadorForcaSenha');
    if (!indicador) {
      return;
    }

    if (senha.length < 6) {
      indicador.innerHTML = '<span style="color: #dc3545;">⚠️ Senha muito curta (mínimo 6 caracteres)</span>';
      return;
    }

    let forca = 0;
    if (senha.length >= 8) {
      forca++;
    }
    if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) {
      forca++;
    }
    if (/\d/.test(senha)) {
      forca++;
    }
    if (/[@$!%*?&#]/.test(senha)) {
      forca++;
    }

    const labels = ['Fraca', 'Média', 'Forte', 'Muito Forte'];
    const colors = ['#dc3545', '#ffc107', '#28a745', '#007bff'];

    indicador.innerHTML = `
      <span style="color: ${colors[forca]};">
        🔒 Senha ${labels[forca] || 'Fraca'}
      </span>
    `;
  }

  /**
   * Hash de senha usando Web Crypto API (PBKDF2)
   */
  async hashPassword(password) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);

      // Gera salt
      const salt = window.crypto.getRandomValues(new Uint8Array(16));

      // Importa senha como chave
      const keyMaterial = await window.crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);

      // Deriva hash
      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      // Converte para hex
      const hashArray = Array.from(new Uint8Array(derivedBits));
      const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      const saltHex = Array.from(salt)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      return `${saltHex}:${hashHex}`;
    } catch (error) {
      console.error('Erro ao gerar hash:', error);
      throw error;
    }
  }

  /**
   * Verifica senha
   */
  async verificarPassword(password, storedHash) {
    try {
      const [saltHex, hashHex] = storedHash.split(':');

      const salt = new Uint8Array(saltHex.match(/.{2}/g).map((byte) => parseInt(byte, 16)));

      const encoder = new TextEncoder();
      const data = encoder.encode(password);

      const keyMaterial = await window.crypto.subtle.importKey('raw', data, { name: 'PBKDF2' }, false, ['deriveBits']);

      const derivedBits = await window.crypto.subtle.deriveBits(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        256
      );

      const hashArray = Array.from(new Uint8Array(derivedBits));
      const newHashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

      return newHashHex === hashHex;
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  }

  /**
   * Autentica usuário com validação de ativo e sessão
   */
  async autenticar(login, senha) {
    try {
      // Busca usuário usando repository
      const usuario = await window.repository.getUsuarioByLogin(login);

      console.log('🔐 Tentando autenticar:', login);

      if (!usuario) {
        console.warn('❌ Usuário não encontrado:', login);
        return { sucesso: false, mensagem: 'Usuário inexistente ou inativo' };
      }

      if (!usuario.ativo) {
        console.warn('❌ Usuário inativo:', login);
        return { sucesso: false, mensagem: 'Usuário inexistente ou inativo' };
      }

      const senhaValida = await this.verificarPassword(senha, usuario.senhaHash);

      if (!senhaValida) {
        console.warn('❌ Senha inválida para:', login);
        return { sucesso: false, mensagem: 'Login ou senha incorretos' };
      }

      this.usuarioLogado = {
        id: usuario.id,
        nome: usuario.nome,
        login: usuario.login,
        perfil: usuario.perfil
      };

      console.log('✅ Usuário autenticado com sucesso:', usuario.nome);

      // Salva sessão em localStorage com token e expiração
      const token = this.gerarToken();
      const expiracao = Date.now() + 24 * 60 * 60 * 1000; // 24 horas

      localStorage.setItem(
        'session',
        JSON.stringify({
          login: usuario.login,
          token: token,
          exp: expiracao
        })
      );

      console.log('✅ Sessão criada (válida por 24h)');

      return { sucesso: true, usuario: this.usuarioLogado };
    } catch (error) {
      console.error('❌ Erro na autenticação:', error);
      return { sucesso: false, mensagem: 'Erro ao autenticar: ' + error.message };
    }
  }

  /**
   * Gera token simples para sessão
   */
  gerarToken() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Vincular unidade a um usuário
   */
  async vincularUnidade(userId) {
    try {
      // Carrega unidades disponíveis
      await this.ensureDBReady();

      const unidadesData = await window.dbManager.get('config', 'unidades');
      const unidades = unidadesData?.unidades || [];

      if (unidades.length === 0) {
        alert('❌ Nenhuma unidade cadastrada!\n\nPrimeiro cadastre uma unidade orçamentária.');
        return;
      }

      // Se há apenas uma unidade, vincular automaticamente
      if (unidades.length === 1) {
        const confirmar = confirm(
          `Vincular usuário à unidade:\n\n${unidades[0].razaoSocial}\nCNPJ: ${unidades[0].cnpj}?`
        );

        if (confirmar) {
          await this.executarVinculacao(userId, unidades[0]);
        }
        return;
      }

      // Múltiplas unidades - mostrar seleção
      const opcoes = unidades.map((u, i) => `${i + 1}. ${u.razaoSocial} (${u.cnpj})`).join('\n');

      const escolha = prompt(`Escolha a unidade para vincular:\n\n${opcoes}\n\nDigite o número:`);

      if (escolha) {
        const index = parseInt(escolha) - 1;
        if (index >= 0 && index < unidades.length) {
          await this.executarVinculacao(userId, unidades[index]);
        } else {
          alert('❌ Opção inválida!');
        }
      }
    } catch (error) {
      console.error('❌ Erro ao vincular unidade:', error);
      alert('❌ Erro ao vincular unidade: ' + error.message);
    }
  }

  /**
   * Executa a vinculação de usuário à unidade
   */
  async executarVinculacao(userId, unidade) {
    try {
      const usuario = this.usuarios.find((u) => u.id === userId);
      if (!usuario) {
        alert('❌ Usuário não encontrado!');
        return;
      }

      // Atualiza usuário com dados da unidade
      usuario.unidadeOrcamentaria = {
        id: unidade.id,
        cnpj: unidade.cnpj,
        razaoSocial: unidade.razaoSocial,
        ug: unidade.ug
      };

      // Salva no banco
      await this.saveUsuarios(this.usuarios);

      alert(`✅ Usuário vinculado com sucesso!\n\n${usuario.nome} → ${unidade.razaoSocial}`);

      // Atualiza a lista de usuários
      this.renderizarLista();

      // 🔄 ATUALIZA A LISTA DE UNIDADES TAMBÉM (se a tela estiver carregada)
      if (window.settingsUnidade && typeof window.settingsUnidade.renderizarLista === 'function') {
        console.log('🔄 Atualizando lista de unidades...');
        await window.settingsUnidade.renderizarLista();
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
   * Desvincular usuário da unidade
   */
  async desvincularUnidade(userId) {
    try {
      const usuario = this.usuarios.find((u) => u.id === userId);
      if (!usuario) {
        alert('❌ Usuário não encontrado!');
        return;
      }

      const confirmar = confirm(
        `Desvincular ${usuario.nome} da unidade ${usuario.unidadeOrcamentaria?.razaoSocial || ''}?`
      );

      if (!confirmar) {
        return;
      }

      // Remove vínculo
      delete usuario.unidadeOrcamentaria;

      // Salva no banco
      await this.saveUsuarios(this.usuarios);

      alert(`✅ Vínculo removido com sucesso!`);

      // Atualiza a lista de usuários
      this.renderizarLista();

      // 🔄 ATUALIZA A LISTA DE UNIDADES TAMBÉM (se a tela estiver carregada)
      if (window.settingsUnidade && typeof window.settingsUnidade.renderizarLista === 'function') {
        console.log('🔄 Atualizando lista de unidades...');
        await window.settingsUnidade.renderizarLista();
      }

      console.log('✅ Vínculo removido:', usuario.nome);
    } catch (error) {
      console.error('❌ Erro ao desvincular:', error);
      alert('❌ Erro ao desvincular: ' + error.message);
    }
  }

  /**
   * Gera ID único
   */
  gerarId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Obtém lista de usuários do IndexedDB
   */
  async getUsuarios() {
    try {
      // Garante inicialização do banco
      await this.ensureDBReady();

      const result = await window.dbManager.get('config', 'usuarios');
      return result ? result.usuarios : [];
    } catch (error) {
      console.error('Erro ao obter usuários:', error);
      return [];
    }
  }

  /**
   * Salva lista de usuários no IndexedDB
   */
  async saveUsuarios(usuarios) {
    try {
      // Garante inicialização do banco
      await this.ensureDBReady();

      await window.dbManager.update('config', {
        id: 'usuarios',
        usuarios: usuarios,
        dataAtualizacao: new Date().toISOString()
      });
      console.log('✅ Usuários salvos no IndexedDB');
    } catch (error) {
      console.error('Erro ao salvar usuários:', error);
      throw error;
    }
  }

  /**
   * Remove usuário do IndexedDB
   */
  async deleteUsuario(id) {
    try {
      const usuarios = await this.getUsuarios();
      const novosUsuarios = usuarios.filter((u) => u.id !== id);

      await this.saveUsuarios(novosUsuarios);
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      throw error;
    }
  }
}

// Instância global
window.settingsUsuarios = new SettingsUsuarios();
