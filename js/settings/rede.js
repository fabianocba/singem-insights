/**
 * Configurações → Rede/LAN
 * Gerencia configurações de rede para compartilhamento em LAN
 */

class SettingsRede {
  constructor() {
    this.config = null;
    this.servidorAtivo = false;
    this.healthCheckInterval = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Salvar configurações
    document.getElementById('formRede')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.salvar();
    });

    // Detectar IP
    document.getElementById('btnDetectarIP')?.addEventListener('click', () => {
      this.detectarIP();
    });

    // Testar conexão
    document.getElementById('btnTestarConexao')?.addEventListener('click', async () => {
      await this.testarConexao();
    });

    // Iniciar servidor
    document.getElementById('btnIniciarServidor')?.addEventListener('click', async () => {
      await this.iniciarServidor();
    });

    // Parar servidor
    document.getElementById('btnPararServidor')?.addEventListener('click', async () => {
      await this.pararServidor();
    });
  }

  /**
   * Carrega configurações
   */
  async load() {
    try {
      this.config = await this.getConfigRede();

      if (this.config) {
        document.getElementById('habilitarLAN').checked = this.config.habilitado || false;
        document.getElementById('ipServidor').value = this.config.ip || '';
        document.getElementById('portaServidor').value = this.config.porta || '3000';
        document.getElementById('intervaloSync').value = this.config.intervaloSync || '60';

        this.atualizarStatus();
      } else {
        this.detectarIP();
      }

      // Inicia health check se configurado
      if (this.config?.habilitado) {
        this.iniciarHealthCheck();
      }
    } catch (error) {
      console.error('Erro ao carregar configurações de rede:', error);
    }
  }

  /**
   * Salva configurações
   */
  async salvar() {
    try {
      const habilitado = document.getElementById('habilitarLAN').checked;
      const ip = document.getElementById('ipServidor').value.trim();
      const porta = document.getElementById('portaServidor').value.trim();
      const intervaloSync = document.getElementById('intervaloSync').value;

      // Validações
      if (habilitado && !ip) {
        alert('❌ Informe o IP do servidor!');
        return;
      }

      if (habilitado && !porta) {
        alert('❌ Informe a porta do servidor!');
        return;
      }

      // Valida IP
      if (habilitado && !this.validarIP(ip)) {
        alert('❌ IP inválido! Use o formato xxx.xxx.xxx.xxx');
        return;
      }

      const config = {
        habilitado: habilitado,
        ip: ip,
        porta: porta,
        intervaloSync: parseInt(intervaloSync),
        urlBase: `http://${ip}:${porta}`,
        dataAtualizacao: new Date().toISOString()
      };

      // Salva no IndexedDB
      await this.saveConfigRede(config);

      this.config = config;
      this.atualizarStatus();

      // Inicia/para health check
      if (habilitado) {
        this.iniciarHealthCheck();
      } else {
        this.pararHealthCheck();
      }

      alert('✅ Configurações de rede salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('❌ Erro ao salvar: ' + error.message);
    }
  }

  /**
   * Detecta IP local
   */
  detectarIP() {
    // Método 1: WebRTC (mais preciso)
    const rtcConfig = { iceServers: [] };
    const pc = new RTCPeerConnection(rtcConfig);

    pc.createDataChannel('');
    pc.createOffer().then((offer) => pc.setLocalDescription(offer));

    pc.onicecandidate = (ice) => {
      if (!ice || !ice.candidate || !ice.candidate.candidate) {
        return;
      }

      const ipRegex = /([0-9]{1,3}\.){3}[0-9]{1,3}/;
      const match = ipRegex.exec(ice.candidate.candidate);

      if (match) {
        const ip = match[0];
        // Ignora IPs públicos e loopback
        if (!ip.startsWith('127.') && ip.startsWith('192.168.')) {
          document.getElementById('ipServidor').value = ip;
          pc.close();
        }
      }
    };

    // Fallback após 2 segundos
    setTimeout(() => {
      pc.close();
      const ipInput = document.getElementById('ipServidor');
      if (!ipInput.value) {
        ipInput.value = '192.168.1.100'; // IP padrão sugerido
        alert(
          '⚠️ Não foi possível detectar o IP automaticamente.\n\nIP padrão sugerido: 192.168.1.100\n\nVerifique e ajuste conforme necessário.'
        );
      }
    }, 2000);
  }

  /**
   * Valida IP
   */
  validarIP(ip) {
    const regex =
      /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return regex.test(ip);
  }

  /**
   * Testa conexão com servidor
   */
  async testarConexao() {
    try {
      if (!this.config || !this.config.habilitado) {
        alert('⚠️ Configure e salve as configurações de rede primeiro!');
        return;
      }

      const url = `${this.config.urlBase}/health`;

      const statusDiv = document.getElementById('statusConexao');
      if (statusDiv) {
        statusDiv.innerHTML = '<div class="loading">🔄 Testando conexão...</div>';
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });

      if (response.ok) {
        const data = await response.json();
        this.servidorAtivo = true;
        this.atualizarStatus(true, data);
        alert(`✅ CONEXÃO OK!\n\nServidor: ${data.version || 'IFDESK Server'}\nStatus: ${data.status}`);
      } else {
        this.servidorAtivo = false;
        this.atualizarStatus(false);
        alert(`❌ CONEXÃO FALHOU!\n\nCódigo HTTP: ${response.status}\n\nVerifique se o servidor está rodando.`);
      }
    } catch (error) {
      this.servidorAtivo = false;
      this.atualizarStatus(false);
      alert(
        `❌ ERRO DE CONEXÃO!\n\n${error.message}\n\nVerifique:\n• Servidor está rodando?\n• IP e porta corretos?\n• Firewall liberado?`
      );
    }
  }

  /**
   * Inicia health check periódico
   */
  iniciarHealthCheck() {
    this.pararHealthCheck();

    this.healthCheckInterval = setInterval(async () => {
      if (!this.config?.habilitado) {
        this.pararHealthCheck();
        return;
      }

      try {
        const url = `${this.config.urlBase}/health`;
        const response = await fetch(url, { method: 'GET', timeout: 3000 });

        if (response.ok) {
          const data = await response.json();
          this.servidorAtivo = true;
          this.atualizarStatus(true, data);
        } else {
          this.servidorAtivo = false;
          this.atualizarStatus(false);
        }
      } catch (error) {
        this.servidorAtivo = false;
        this.atualizarStatus(false);
      }
    }, 30000); // Check a cada 30 segundos
  }

  /**
   * Para health check
   */
  pararHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * Atualiza status visual
   */
  atualizarStatus(online = false, serverInfo = null) {
    const statusDiv = document.getElementById('statusConexao');
    if (!statusDiv) {
      return;
    }

    if (!this.config?.habilitado) {
      statusDiv.innerHTML = `
        <div class="status-message warning">
          <strong>⚠️ LAN Desabilitada</strong><br>
          Habilite e configure para compartilhar dados em rede local.
        </div>
      `;
      return;
    }

    if (online && serverInfo) {
      statusDiv.innerHTML = `
        <div class="status-message success">
          <strong>✅ Servidor Online</strong><br>
          URL: ${this.config.urlBase}<br>
          Status: ${serverInfo.status || 'OK'}<br>
          Última verificação: ${new Date().toLocaleTimeString()}
        </div>
      `;
    } else {
      statusDiv.innerHTML = `
        <div class="status-message error">
          <strong>❌ Servidor Offline</strong><br>
          URL: ${this.config.urlBase}<br>
          Última verificação: ${new Date().toLocaleTimeString()}
        </div>
      `;
    }
  }

  /**
   * Inicia servidor Node.js (placeholder - requer implementação backend)
   */
  async iniciarServidor() {
    alert(
      `⚠️ FUNCIONALIDADE EM DESENVOLVIMENTO\n\nPara iniciar o servidor:\n\n1. Abra o terminal no diretório server/\n2. Execute: npm install\n3. Execute: npm start\n\nO servidor ficará disponível em:\n${
        this.config?.urlBase || 'http://localhost:3000'
      }`
    );
  }

  /**
   * Para servidor Node.js (placeholder)
   */
  async pararServidor() {
    alert('⚠️ Para parar o servidor, pressione Ctrl+C no terminal onde ele está rodando.');
  }

  /**
   * Obtém configurações do IndexedDB
   */
  async getConfigRede() {
    try {
      const result = await window.dbManager.get('config', 'rede');
      return result || null;
    } catch (error) {
      console.error('Erro ao buscar configurações de rede:', error);
      return null;
    }
  }

  /**
   * Salva configurações no IndexedDB
   */
  async saveConfigRede(config) {
    try {
      const data = {
        id: 'rede',
        ...config
      };
      await window.dbManager.update('config', data);
    } catch (error) {
      console.error('Erro ao salvar configurações de rede:', error);
      throw error;
    }
  }
}

// Instância global
window.settingsRede = new SettingsRede();
