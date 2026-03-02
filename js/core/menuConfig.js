/**
 * ============================================================================
 * SINGEM - Configuração Centralizada de Menus
 * ============================================================================
 *
 * Este arquivo define a estrutura de menus do sistema e aliases de ações
 * para garantir compatibilidade com código legado.
 *
 * REGRAS:
 * - Backup/Restore/Exportar/Importar ficam SOMENTE em Preferências
 * - Configurações de storage ficam em Preferências → Armazenamento
 * - Validação de empenho é independente de NF e saldo
 *
 * @version 1.0.0
 */

// Flag para debug de menu (console logs)
window.DEBUG_MENU = window.DEBUG_MENU === true;

/**
 * Configuração consolidada do menu principal
 * Estrutura hierárquica com ações mapeadas
 */
const MENU_CONFIG = {
  // ========================================
  // HEADER - Navegação principal
  // ========================================
  header: [
    {
      id: 'btnHome',
      label: '🏠 Início',
      action: 'nav:homeScreen',
      icon: '🏠'
    },
    {
      id: 'btnConfig',
      label: '⚙️ Configurações',
      action: 'nav:configScreen',
      icon: '⚙️'
    },
    {
      id: 'btnSair',
      label: '🚪 Sair',
      action: 'auth:logout',
      icon: '🚪'
    }
  ],

  // ========================================
  // HOME - Cards do menu principal
  // ========================================
  home: [
    {
      id: 'menuEmpenho',
      label: 'Cadastro de Empenho',
      description: 'Cadastre novas notas de empenho e faça upload dos PDFs',
      screen: 'empenhoScreen',
      icon: '📝',
      category: 'cadastros'
    },
    {
      id: 'menuEntrega',
      label: 'Entrada de Entrega',
      description: 'Registre recebimentos semanais de materiais',
      screen: 'entregaScreen',
      icon: '📦',
      category: 'controle'
    },
    {
      id: 'menuNotaFiscal',
      label: 'Entrada de Nota Fiscal',
      description: 'Cadastre notas fiscais e compare com empenhos',
      screen: 'notaFiscalScreen',
      icon: '📄',
      category: 'cadastros'
    },
    {
      id: 'menuRelatorios',
      label: 'Relatórios',
      description: 'Gere relatórios de conferência e análises',
      screen: 'relatoriosScreen',
      icon: '📊',
      category: 'controle'
    },
    {
      id: 'consultasMenuItem',
      label: 'Consulte Compras.gov',
      description: 'Acesse dados abertos do Compras.gov.br',
      screen: 'consultasScreen',
      icon: '🔍',
      category: 'consultas'
    }
  ],

  // ========================================
  // CONFIGURAÇÕES - Abas do iframe
  // ========================================
  config: [
    {
      id: 'tabUnidade',
      label: '🏢 Unidade Orçamentária',
      tab: 'unidade',
      category: 'cadastros'
    },
    {
      id: 'tabUsuarios',
      label: '👥 Usuários',
      tab: 'usuarios',
      category: 'cadastros',
      adminOnly: true
    },
    {
      id: 'tabArquivos',
      label: '📁 Arquivos',
      tab: 'arquivos',
      category: 'preferencias',
      description: 'Configuração de armazenamento e pastas'
    },
    {
      id: 'tabRede',
      label: '🌐 Rede/LAN',
      tab: 'rede',
      category: 'sistema',
      adminOnly: true
    },
    {
      id: 'tabPreferencias',
      label: '🎨 Preferências',
      tab: 'preferencias',
      category: 'preferencias',
      description: 'Backup, Restore, Importar, Exportar, Tema, Validações'
    },
    {
      id: 'tabDiagnostico',
      label: '🔍 Diagnóstico',
      tab: 'diagnostico',
      category: 'sistema'
    }
  ],

  // ========================================
  // EMPENHO - Sub-abas da tela de empenho
  // ========================================
  empenho: [
    {
      id: 'tabCadastro',
      label: '📝 Novo Cadastro',
      tab: 'cadastro'
    },
    {
      id: 'tabControleSaldos',
      label: '📊 Controle de Saldos',
      tab: 'controle-saldos'
    },
    {
      id: 'tabRelatorio',
      label: '📋 Relatório de Empenhos',
      tab: 'relatorio'
    }
  ]
};

/**
 * Mapa de aliases de ações para compatibilidade
 * Redireciona ações antigas para novas localizações
 *
 * IMPORTANTE: Nunca remova um alias - apenas adicione redirecionamentos
 */
const ACTION_ALIASES = {
  // ========================================
  // BACKUP & EXPORT (agora em Preferências)
  // ========================================
  // Botão "Exportar" do header antigo -> abre modal de exportação
  'export:header': 'preferences:export',
  'btnExportar:click': 'preferences:export',
  export_home: 'preferences:export',

  // Backup na aba Config -> redireciona para Preferências
  config_backup: 'preferences:backup',
  'tabBackup:click': 'preferences:backup',
  btnIrParaBackup: 'preferences:backup',
  btnIrParaBackupTab: 'preferences:backup',

  // Export específico de CSV (ainda funciona, mas via Preferências)
  'export:csv:nf': 'preferences:export:csv:nf',
  'export:csv:empenhos': 'preferences:export:csv:empenhos',

  // ========================================
  // NAVEGAÇÃO
  // ========================================
  'nav:home': 'nav:homeScreen',
  'nav:config': 'nav:configScreen',
  'nav:empenho': 'nav:empenhoScreen',
  'nav:nf': 'nav:notaFiscalScreen',
  'nav:entrega': 'nav:entregaScreen',
  'nav:relatorios': 'nav:relatoriosScreen',
  'nav:consultas': 'nav:consultasScreen'
};

/**
 * Resolve um alias de ação para a ação real
 * @param {string} action - Ação original
 * @returns {string} Ação resolvida (pode ser a mesma se não houver alias)
 */
function resolveAction(action) {
  const resolved = ACTION_ALIASES[action] || action;

  if (window.DEBUG_MENU && resolved !== action) {
    console.log(`[Menu] Alias resolvido: ${action} -> ${resolved}`);
  }

  return resolved;
}

/**
 * Executa uma ação do menu
 * @param {string} action - Ação a executar
 * @param {object} context - Contexto adicional (opcional)
 */
function executeMenuAction(action, context = {}) {
  const resolved = resolveAction(action);

  if (window.DEBUG_MENU) {
    console.log(`[Menu] Executando ação: ${resolved}`, context);
  }

  // Navegação para telas
  if (resolved.startsWith('nav:')) {
    const screen = resolved.replace('nav:', '');
    if (window.app?.showScreen) {
      window.app.showScreen(screen);
    }
    return;
  }

  // Ações de preferências (backup, export, etc)
  if (resolved.startsWith('preferences:')) {
    const subAction = resolved.replace('preferences:', '');
    handlePreferencesAction(subAction, context);
    return;
  }

  // Autenticação
  if (resolved === 'auth:logout') {
    if (window.app?.realizarLogout) {
      window.app.realizarLogout();
    }
    return;
  }

  console.warn(`[Menu] Ação não reconhecida: ${resolved}`);
}

/**
 * Trata ações relacionadas a Preferências
 * @param {string} action - Sub-ação de preferências
 * @param {object} context - Contexto adicional
 */
function handlePreferencesAction(action, _context = {}) {
  if (window.DEBUG_MENU) {
    console.log(`[Menu] Preferências: ${action}`);
  }

  // Navega para Configurações e abre aba Preferências
  const navigateToPreferences = () => {
    // Se estamos no index.html principal
    if (window.app?.showScreen) {
      window.app.showScreen('configScreen');

      // Aguarda iframe carregar e clica na aba
      setTimeout(() => {
        const iframe = document.getElementById('configIframe');
        if (iframe?.contentDocument) {
          const tabBtn = iframe.contentDocument.querySelector('[data-tab="preferencias"]');
          if (tabBtn) {
            tabBtn.click();
          }
        }
      }, 300);
    }
    // Se estamos dentro do iframe de configurações
    else {
      const tabBtn = document.querySelector('[data-tab="preferencias"]');
      if (tabBtn) {
        tabBtn.click();
      }
    }
  };

  switch (action) {
    case 'backup':
    case 'export':
      navigateToPreferences();
      break;

    case 'export:csv:nf':
      // Abre modal de exportação CSV de NFs
      navigateToPreferences();
      // TODO: trigger específico para exportar NF
      break;

    case 'export:csv:empenhos':
      // Abre modal de exportação CSV de empenhos
      navigateToPreferences();
      // TODO: trigger específico para exportar empenhos
      break;

    default:
      console.warn(`[Menu] Ação de preferências não implementada: ${action}`);
  }
}

/**
 * Gera relatório de auditoria do menu no console
 * Ativado quando DEBUG_MENU = true
 */
function auditMenuStructure() {
  if (!window.DEBUG_MENU) {
    console.log('ℹ️ Para ver o relatório de auditoria, execute:');
    console.log('   window.DEBUG_MENU = true; location.reload();');
    return;
  }

  console.group('📋 AUDITORIA DE MENUS - SINGEM');

  // Header
  console.group('🔝 Header Navigation');
  MENU_CONFIG.header.forEach((item) => {
    console.log(`  [${item.id}] ${item.label} -> ${item.action}`);
  });
  console.groupEnd();

  // Home
  console.group('🏠 Menu Principal (Home)');
  MENU_CONFIG.home.forEach((item) => {
    console.log(`  [${item.id}] ${item.label} -> screen:${item.screen} (${item.category})`);
  });
  console.groupEnd();

  // Config tabs
  console.group('⚙️ Abas de Configurações');
  MENU_CONFIG.config.forEach((item) => {
    const admin = item.adminOnly ? ' [ADMIN]' : '';
    console.log(`  [${item.id}] ${item.label} -> tab:${item.tab}${admin}`);
  });
  console.groupEnd();

  // Aliases
  console.group('🔄 Action Aliases (Compatibilidade)');
  Object.entries(ACTION_ALIASES).forEach(([from, to]) => {
    console.log(`  ${from} -> ${to}`);
  });
  console.groupEnd();

  // Detecção de duplicidades
  console.group('⚠️ Verificação de Duplicidades');
  const backupLocations = [];

  // Procura elementos de backup no DOM
  const backupElements = document.querySelectorAll('[id*="backup" i], [id*="Backup" i]');
  backupElements.forEach((el) => {
    backupLocations.push({
      id: el.id,
      tagName: el.tagName,
      text: el.textContent?.substring(0, 50)
    });
  });

  if (backupLocations.length > 0) {
    console.log('  Elementos relacionados a backup encontrados:');
    backupLocations.forEach((loc) => {
      console.log(`    #${loc.id} (${loc.tagName}): "${loc.text}..."`);
    });
  }

  // Verifica tab Backup separada
  const tabBackup = document.querySelector('[data-tab="backup"]');
  if (tabBackup) {
    console.warn('  ⚠️ Tab "Backup" separada encontrada - deveria estar em Preferências!');
  }

  console.groupEnd();

  console.groupEnd();
}

// Exporta para uso global
window.MENU_CONFIG = MENU_CONFIG;
window.ACTION_ALIASES = ACTION_ALIASES;
window.resolveAction = resolveAction;
window.executeMenuAction = executeMenuAction;
window.auditMenuStructure = auditMenuStructure;

// Auto-executa auditoria se DEBUG_MENU estiver ativo
if (window.DEBUG_MENU) {
  // Aguarda DOM carregar
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', auditMenuStructure);
  } else {
    setTimeout(auditMenuStructure, 500);
  }
}

console.log('[MenuConfig] ✅ Configuração de menus carregada');
