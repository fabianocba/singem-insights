/**
 * ============================================================================
 * SINGEM - Controle de Escopo de Acesso (client-side)
 * ============================================================================
 *
 * Utilitário para verificar permissões e escopo do usuário logado
 * no lado do cliente. Trabalha com o accessContext hidratado pelo backend.
 *
 * @module accessScope
 */

// Mapeamento de ícone Lucide (backend) → emoji (frontend)
const ICON_MAP = {
  'settings-2': '⚙️',
  'flask-conical': '🧪',
  warehouse: '🏬',
  'building-2': '🏗️',
  'car-front': '🚗',
  'briefcase-business': '🔧',
  'file-signature': '📑',
  'clipboard-list': '📋',
  'car-taxi-front': '🚐',
  'notebook-tabs': '📝'
};

// Mapeamento de moduleKey → screenId do frontend (para módulos sem screenId no catálogo)
const MODULE_SCREEN_MAP = {
  singem_adm: 'configScreen',
  gestao_patrimonio: 'patrimonioScreen',
  gestao_veiculos: 'veiculosScreen',
  gestao_servicos_internos: 'servicosInternosScreen',
  gestao_contratos: 'contratosScreen',
  solicitacao_almoxarifado: 'solicitacaoAlmoxScreen',
  solicitacao_veiculos: 'solicitacaoVeiculosScreen',
  solicitacao_servicos_internos: 'solicitacaoServicosScreen'
};

// Sub-telas do módulo gestao_almoxarifado (que agrupa várias telas do app)
const ALMOXARIFADO_SUBITEMS = [
  { screenId: 'empenhoScreen', label: 'Empenhos', icon: '📝' },
  { screenId: 'notaFiscalScreen', label: 'Notas fiscais', icon: '📄' },
  { screenId: 'almoxarifadoScreen', label: 'Almoxarifado', icon: '🏬' },
  { screenId: 'entregaScreen', label: 'Entregas', icon: '📦' }
];

// Sub-telas do módulo singem_adm
const ADM_SUBITEMS = [
  { screenId: 'relatoriosScreen', label: 'Relatórios', icon: '📊' },
  { screenId: 'configScreen', label: 'Configurações', icon: '⚙️' }
];

// Sub-telas do módulo singem_devtools
const DEVTOOLS_SUBITEMS = [
  { screenId: 'consultasScreen', label: 'Inteligência de compras', icon: '🔍' },
  { screenId: 'catalogacaoScreen', label: 'Catalogação', icon: '📋' }
];

// Módulos que expandem em sub-telas
const MODULE_SUBITEMS = {
  gestao_almoxarifado: ALMOXARIFADO_SUBITEMS,
  singem_adm: ADM_SUBITEMS,
  singem_devtools: DEVTOOLS_SUBITEMS
};

function resolveIcon(mod) {
  return ICON_MAP[mod.icon] || mod.icon || '📌';
}

function resolveScreenId(mod) {
  return mod.screenId || MODULE_SCREEN_MAP[mod.key] || null;
}

/**
 * Verifica se o usuário tem permissão para um módulo/ação
 */
export function hasPermission(usuario, modulo, acao = null) {
  if (!usuario?.accessContext?.permissions) {
    return false;
  }

  const perms = usuario.accessContext.permissions;
  const modulePerms = perms[modulo];
  if (!modulePerms || !Array.isArray(modulePerms)) {
    return false;
  }

  if (!acao) {
    return modulePerms.length > 0;
  }

  return modulePerms.includes(String(acao).toUpperCase());
}

/**
 * Verifica se o usuário tem acesso ao escopo de dados (unidade/setor)
 */
export function hasScopeAccess(usuario, unitId = null, sectorId = null) {
  const scope = usuario?.escopoDados || usuario?.accessContext?.dataScope;
  if (!scope) {
    return false;
  }

  if (scope.allUnits && scope.allSectors) {
    return true;
  }

  if (unitId && !scope.allUnits) {
    if (!Array.isArray(scope.unitIds) || !scope.unitIds.includes(Number(unitId))) {
      return false;
    }
  }

  if (sectorId && !scope.allSectors) {
    if (!Array.isArray(scope.sectorIds) || !scope.sectorIds.includes(Number(sectorId))) {
      return false;
    }
  }

  return true;
}

/**
 * Retorna a lista de módulos acessíveis
 */
export function getModulosHabilitados(usuario) {
  return usuario?.modulosHabilitados || usuario?.accessContext?.modules?.map((m) => m.key) || [];
}

/**
 * Verifica se o perfil é admin (qualquer nível)
 */
export function isAdmin(usuario) {
  const perfil = String(usuario?.perfil || '').toLowerCase();
  return ['admin', 'admin_superior', 'admin_setorial'].includes(perfil);
}

/**
 * Constrói itens de navegação lateral baseados nos menusVisiveis do usuário.
 * Retorna array de { screenId?, href?, label, icon, disabled? }.
 */
export function buildSidebarItems(usuario) {
  const menus = usuario?.menusVisiveis || usuario?.accessContext?.menus || [];
  const items = [];
  const seen = new Set();

  // Painel executivo é sempre visível
  items.push({ screenId: 'homeScreen', label: 'Painel executivo', icon: '🏠' });
  seen.add('homeScreen');

  for (const group of menus) {
    const groupItems = Array.isArray(group.items) ? group.items : [];

    for (const mod of groupItems) {
      const subItems = MODULE_SUBITEMS[mod.key];

      if (subItems) {
        // Módulo expande em sub-telas
        for (const entry of subItems) {
          const key = entry.screenId || entry.href;
          if (!seen.has(key)) {
            seen.add(key);
            items.push({ ...entry });
          }
        }
      } else {
        // Módulo com tela própria
        const screenId = resolveScreenId(mod);
        const icon = resolveIcon(mod);
        const label = mod.shortTitle || mod.title;

        if (screenId && !seen.has(screenId)) {
          seen.add(screenId);
          items.push({ screenId, label, icon });
        } else if (mod.route && !seen.has(mod.route)) {
          seen.add(mod.route);
          items.push({ href: mod.route, label, icon });
        }
      }
    }
  }

  return items;
}

/**
 * Renderiza a navegação lateral no elemento <nav> do sidebar.
 * Exibe itens agrupados por categoria quando o backend retorna menus agrupados.
 * Preserva a mecânica de data-nav-screen usada pelo premiumShell.
 */
// Menus fallback quando o backend não retorna menusVisiveis (offline / dev)
const FALLBACK_MENUS = [
  {
    key: 'central',
    label: 'Central',
    items: [{ key: 'gestao_almoxarifado', title: 'Almoxarifado', icon: 'warehouse' }]
  },
  {
    key: 'ferramentas',
    label: 'Ferramentas',
    items: [
      { key: 'singem_devtools', title: 'DevTools', icon: 'flask-conical' },
      { key: 'singem_adm', title: 'Administração', icon: 'settings-2' }
    ]
  }
];

export function renderSidebar(usuario) {
  const nav = document.querySelector('.app-sidebar__nav');
  if (!nav) {
    return;
  }

  const rawMenus = usuario?.menusVisiveis || usuario?.accessContext?.menus || [];
  const menus = rawMenus.length > 0 ? rawMenus : FALLBACK_MENUS;
  const fragment = document.createDocumentFragment();
  const seen = new Set();

  // Painel executivo — sempre primeiro
  fragment.appendChild(createNavButton({ screenId: 'homeScreen', label: 'Painel executivo', icon: '🏠' }));
  seen.add('homeScreen');

  for (const group of menus) {
    const groupItems = Array.isArray(group.items) ? group.items : [];
    if (groupItems.length === 0) {
      continue;
    }

    // Separador de grupo
    const separator = document.createElement('div');
    separator.className = 'app-sidebar__group-label';
    separator.textContent = group.label || group.key;
    fragment.appendChild(separator);

    for (const mod of groupItems) {
      const subItems = MODULE_SUBITEMS[mod.key];

      if (subItems) {
        for (const entry of subItems) {
          const key = entry.screenId || entry.href;
          if (!seen.has(key)) {
            seen.add(key);
            fragment.appendChild(createNavButton(entry));
          }
        }
      } else {
        const screenId = resolveScreenId(mod);
        const icon = resolveIcon(mod);
        const label = mod.shortTitle || mod.title;

        if (screenId && !seen.has(screenId)) {
          seen.add(screenId);
          fragment.appendChild(createNavButton({ screenId, label, icon }));
        } else if (mod.route && !seen.has(mod.route)) {
          seen.add(mod.route);
          fragment.appendChild(createNavButton({ href: mod.route, label, icon }));
        }
      }
    }
  }

  nav.innerHTML = '';
  nav.appendChild(fragment);

  // Marca o item ativo (homeScreen por padrão após login)
  const activeBtn = nav.querySelector('[data-nav-screen="homeScreen"]');
  if (activeBtn) {
    activeBtn.classList.add('is-active');
  }
}

function createNavButton(item) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'app-sidebar__link';

  if (item.screenId) {
    btn.dataset.navScreen = item.screenId;
  } else if (item.href) {
    btn.dataset.navHref = item.href;
  }

  const iconSpan = document.createElement('span');
  iconSpan.setAttribute('aria-hidden', 'true');
  iconSpan.textContent = item.icon;

  const labelSpan = document.createElement('span');
  labelSpan.textContent = item.label;

  btn.appendChild(iconSpan);
  btn.appendChild(labelSpan);
  return btn;
}

export default {
  hasPermission,
  hasScopeAccess,
  getModulosHabilitados,
  isAdmin,
  buildSidebarItems,
  renderSidebar
};
