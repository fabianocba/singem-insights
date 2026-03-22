const ModuleCategories = Object.freeze({
  CENTRAL: 'central',
  SETORIAL: 'setorial',
  SOLICITACAO: 'solicitacao'
});

const ModuleKeys = Object.freeze({
  SINGEM_ADM: 'singem_adm',
  SINGEM_DEVTOOLS: 'singem_devtools',
  GESTAO_ALMOXARIFADO: 'gestao_almoxarifado',
  GESTAO_PATRIMONIO: 'gestao_patrimonio',
  GESTAO_VEICULOS: 'gestao_veiculos',
  GESTAO_SERVICOS_INTERNOS: 'gestao_servicos_internos',
  GESTAO_CONTRATOS: 'gestao_contratos',
  SOLICITACAO_ALMOXARIFADO: 'solicitacao_almoxarifado',
  SOLICITACAO_VEICULOS: 'solicitacao_veiculos',
  SOLICITACAO_SERVICOS_INTERNOS: 'solicitacao_servicos_internos'
});

const AccessActions = Object.freeze({
  VISUALIZAR: 'visualizar',
  CADASTRAR: 'cadastrar',
  EDITAR: 'editar',
  EXCLUIR: 'excluir',
  APROVAR: 'aprovar',
  ADMINISTRAR: 'administrar',
  IMPORTAR: 'importar',
  EXPORTAR: 'exportar',
  PROCESSAR: 'processar',
  REPROCESSAR: 'reprocessar'
});

const ActionAliases = Object.freeze({
  visualizar: AccessActions.VISUALIZAR,
  ler: AccessActions.VISUALIZAR,
  cadastrar: AccessActions.CADASTRAR,
  criar: AccessActions.CADASTRAR,
  editar: AccessActions.EDITAR,
  excluir: AccessActions.EXCLUIR,
  aprovar: AccessActions.APROVAR,
  validar: AccessActions.APROVAR,
  administrar: AccessActions.ADMINISTRAR,
  configurar: AccessActions.ADMINISTRAR,
  importar: AccessActions.IMPORTAR,
  exportar: AccessActions.EXPORTAR,
  processar: AccessActions.PROCESSAR,
  reprocessar: AccessActions.REPROCESSAR
});

const ProfileKeys = Object.freeze({
  ADMIN: 'admin',
  ADMIN_SUPERIOR: 'admin_superior',
  ADMIN_SETORIAL: 'admin_setorial',
  GESTOR: 'gestor',
  ALMOXARIFE: 'almoxarife',
  CONFERENTE: 'conferente',
  OPERADOR: 'operador',
  AUDITOR: 'auditor',
  SOLICITANTE: 'solicitante',
  VISUALIZADOR: 'visualizador',
  VISITANTE: 'visitante'
});

const ProfileHierarchy = Object.freeze({
  [ProfileKeys.ADMIN]: 100,
  [ProfileKeys.ADMIN_SUPERIOR]: 95,
  [ProfileKeys.GESTOR]: 85,
  [ProfileKeys.ADMIN_SETORIAL]: 80,
  [ProfileKeys.ALMOXARIFE]: 72,
  [ProfileKeys.CONFERENTE]: 65,
  [ProfileKeys.OPERADOR]: 55,
  [ProfileKeys.AUDITOR]: 45,
  [ProfileKeys.VISUALIZADOR]: 25,
  [ProfileKeys.SOLICITANTE]: 20,
  [ProfileKeys.VISITANTE]: 10
});

const AllActions = Object.freeze([...new Set(Object.values(AccessActions))]);

const managementActions = Object.freeze([...AllActions]);
const operationalActions = Object.freeze([
  AccessActions.VISUALIZAR,
  AccessActions.CADASTRAR,
  AccessActions.EDITAR,
  AccessActions.EXCLUIR,
  AccessActions.APROVAR,
  AccessActions.IMPORTAR,
  AccessActions.EXPORTAR,
  AccessActions.PROCESSAR,
  AccessActions.REPROCESSAR
]);
const reviewActions = Object.freeze([
  AccessActions.VISUALIZAR,
  AccessActions.EDITAR,
  AccessActions.APROVAR,
  AccessActions.IMPORTAR,
  AccessActions.PROCESSAR,
  AccessActions.REPROCESSAR
]);
const requestActions = Object.freeze([AccessActions.VISUALIZAR, AccessActions.CADASTRAR, AccessActions.EDITAR]);
const readOnlyActions = Object.freeze([AccessActions.VISUALIZAR, AccessActions.EXPORTAR]);
const visualizerActions = Object.freeze([AccessActions.VISUALIZAR]);

const ModuleCatalog = Object.freeze([
  {
    key: ModuleKeys.SINGEM_ADM,
    title: 'SINGEM ADM',
    shortTitle: 'ADM',
    description: 'Administração, cadastros gerais, governança e parâmetros globais.',
    category: ModuleCategories.CENTRAL,
    menuGroup: 'central',
    route: '/config/',
    screenId: 'configScreen',
    icon: 'settings-2',
    order: 10,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['configuracoes', 'usuarios', 'auditoria', 'integracoes', 'relatorios']
  },
  {
    key: ModuleKeys.SINGEM_DEVTOOLS,
    title: 'Ferramentas de Desenvolvimento',
    shortTitle: 'DevTools',
    description: 'Recursos técnicos restritos a ambiente de desenvolvimento.',
    category: ModuleCategories.CENTRAL,
    menuGroup: 'central',
    route: '/system-status/',
    screenId: null,
    icon: 'flask-conical',
    order: 15,
    enabledByDefault: true,
    devOnly: true,
    legacyAliases: ['system-status', 'system_status', 'ai', 'catalogacao', 'consultas']
  },
  {
    key: ModuleKeys.GESTAO_ALMOXARIFADO,
    title: 'Gestão de Almoxarifado',
    shortTitle: 'Almoxarifado',
    description: 'Entradas, saídas, saldos, requisições, etiquetas, inventário e NF-e.',
    category: ModuleCategories.SETORIAL,
    menuGroup: 'setorial',
    route: '/almoxarifado',
    screenId: 'almoxarifadoScreen',
    icon: 'warehouse',
    order: 20,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['almoxarifado', 'estoque', 'materiais', 'notas_fiscais', 'nfe', 'entrada_nf', 'empenhos']
  },
  {
    key: ModuleKeys.GESTAO_PATRIMONIO,
    title: 'Gestão de Patrimônio',
    shortTitle: 'Patrimônio',
    description: 'Tombamento, transferência, baixa, localização e inventário patrimonial.',
    category: ModuleCategories.SETORIAL,
    menuGroup: 'setorial',
    route: '/patrimonio',
    screenId: null,
    icon: 'building-2',
    order: 30,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['patrimonio']
  },
  {
    key: ModuleKeys.GESTAO_VEICULOS,
    title: 'Gestão de Veículos',
    shortTitle: 'Veículos',
    description: 'Frota, motoristas, reservas, abastecimentos, manutenção e relatórios.',
    category: ModuleCategories.SETORIAL,
    menuGroup: 'setorial',
    route: '/veiculos',
    screenId: null,
    icon: 'car-front',
    order: 40,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['veiculos', 'frota']
  },
  {
    key: ModuleKeys.GESTAO_SERVICOS_INTERNOS,
    title: 'Gestão de Serviços Internos',
    shortTitle: 'Serviços',
    description: 'Ordens de serviço, equipes, acompanhamento, encerramento e relatórios.',
    category: ModuleCategories.SETORIAL,
    menuGroup: 'setorial',
    route: '/servicos-internos',
    screenId: null,
    icon: 'briefcase-business',
    order: 50,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['servicos_internos', 'servicos-internos']
  },
  {
    key: ModuleKeys.GESTAO_CONTRATOS,
    title: 'Gestão de Contratos',
    shortTitle: 'Contratos',
    description: 'Vigência, fiscal, aditivos, documentos, alertas e relatórios contratuais.',
    category: ModuleCategories.SETORIAL,
    menuGroup: 'setorial',
    route: '/contratos',
    screenId: null,
    icon: 'file-signature',
    order: 60,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['contratos']
  },
  {
    key: ModuleKeys.SOLICITACAO_ALMOXARIFADO,
    title: 'Solicitação de Almoxarifado',
    shortTitle: 'Solicitação de Almox',
    description: 'Portal geral de requisição de materiais e acompanhamento.',
    category: ModuleCategories.SOLICITACAO,
    menuGroup: 'solicitacoes',
    route: '/solicitacoes/almoxarifado',
    screenId: null,
    icon: 'clipboard-list',
    order: 70,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['solicitacao_almoxarifado', 'requisicoes_almoxarifado']
  },
  {
    key: ModuleKeys.SOLICITACAO_VEICULOS,
    title: 'Solicitação de Veículos',
    shortTitle: 'Solicitação de Veículos',
    description: 'Portal geral de reservas, deslocamentos e acompanhamento de solicitações.',
    category: ModuleCategories.SOLICITACAO,
    menuGroup: 'solicitacoes',
    route: '/solicitacoes/veiculos',
    screenId: null,
    icon: 'car-taxi-front',
    order: 80,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['solicitacao_veiculos']
  },
  {
    key: ModuleKeys.SOLICITACAO_SERVICOS_INTERNOS,
    title: 'Solicitação de Serviços Internos',
    shortTitle: 'Solicitação de Serviços',
    description: 'Portal geral para ordens e demandas de serviços internos.',
    category: ModuleCategories.SOLICITACAO,
    menuGroup: 'solicitacoes',
    route: '/solicitacoes/servicos-internos',
    screenId: null,
    icon: 'notebook-tabs',
    order: 90,
    enabledByDefault: true,
    devOnly: false,
    legacyAliases: ['solicitacao_servicos_internos']
  }
]);

const nonDevModules = ModuleCatalog.filter((module) => !module.devOnly).map((module) => module.key);

const DefaultProfileModuleGrants = Object.freeze({
  [ProfileKeys.ADMIN]: Object.fromEntries(ModuleCatalog.map((module) => [module.key, [...managementActions]])),
  [ProfileKeys.ADMIN_SUPERIOR]: Object.fromEntries(ModuleCatalog.map((module) => [module.key, [...managementActions]])),
  [ProfileKeys.ADMIN_SETORIAL]: {
    [ModuleKeys.SINGEM_ADM]: [...managementActions],
    [ModuleKeys.GESTAO_ALMOXARIFADO]: [...operationalActions],
    [ModuleKeys.GESTAO_PATRIMONIO]: [...operationalActions],
    [ModuleKeys.GESTAO_VEICULOS]: [...operationalActions],
    [ModuleKeys.GESTAO_SERVICOS_INTERNOS]: [...operationalActions],
    [ModuleKeys.GESTAO_CONTRATOS]: [...operationalActions],
    [ModuleKeys.SOLICITACAO_ALMOXARIFADO]: [...operationalActions],
    [ModuleKeys.SOLICITACAO_VEICULOS]: [...operationalActions],
    [ModuleKeys.SOLICITACAO_SERVICOS_INTERNOS]: [...operationalActions]
  },
  [ProfileKeys.GESTOR]: {
    [ModuleKeys.SINGEM_ADM]: [AccessActions.VISUALIZAR],
    [ModuleKeys.GESTAO_ALMOXARIFADO]: [...operationalActions],
    [ModuleKeys.GESTAO_PATRIMONIO]: [...operationalActions],
    [ModuleKeys.GESTAO_VEICULOS]: [...operationalActions],
    [ModuleKeys.GESTAO_SERVICOS_INTERNOS]: [...operationalActions],
    [ModuleKeys.GESTAO_CONTRATOS]: [...operationalActions],
    [ModuleKeys.SOLICITACAO_ALMOXARIFADO]: [AccessActions.VISUALIZAR, AccessActions.APROVAR, AccessActions.EXPORTAR],
    [ModuleKeys.SOLICITACAO_VEICULOS]: [AccessActions.VISUALIZAR, AccessActions.APROVAR, AccessActions.EXPORTAR],
    [ModuleKeys.SOLICITACAO_SERVICOS_INTERNOS]: [
      AccessActions.VISUALIZAR,
      AccessActions.APROVAR,
      AccessActions.EXPORTAR
    ]
  },
  [ProfileKeys.ALMOXARIFE]: {
    [ModuleKeys.GESTAO_ALMOXARIFADO]: [...operationalActions],
    [ModuleKeys.SOLICITACAO_ALMOXARIFADO]: [AccessActions.VISUALIZAR, AccessActions.APROVAR, AccessActions.EXPORTAR]
  },
  [ProfileKeys.CONFERENTE]: {
    [ModuleKeys.GESTAO_ALMOXARIFADO]: [...reviewActions],
    [ModuleKeys.SOLICITACAO_ALMOXARIFADO]: [AccessActions.VISUALIZAR, AccessActions.APROVAR]
  },
  [ProfileKeys.OPERADOR]: {
    [ModuleKeys.GESTAO_ALMOXARIFADO]: [
      AccessActions.VISUALIZAR,
      AccessActions.CADASTRAR,
      AccessActions.EDITAR,
      AccessActions.IMPORTAR,
      AccessActions.PROCESSAR
    ],
    [ModuleKeys.GESTAO_PATRIMONIO]: [AccessActions.VISUALIZAR, AccessActions.CADASTRAR, AccessActions.EDITAR],
    [ModuleKeys.GESTAO_VEICULOS]: [AccessActions.VISUALIZAR, AccessActions.CADASTRAR, AccessActions.EDITAR],
    [ModuleKeys.GESTAO_SERVICOS_INTERNOS]: [AccessActions.VISUALIZAR, AccessActions.CADASTRAR, AccessActions.EDITAR],
    [ModuleKeys.GESTAO_CONTRATOS]: [AccessActions.VISUALIZAR, AccessActions.CADASTRAR, AccessActions.EDITAR],
    [ModuleKeys.SOLICITACAO_ALMOXARIFADO]: [...requestActions],
    [ModuleKeys.SOLICITACAO_VEICULOS]: [...requestActions],
    [ModuleKeys.SOLICITACAO_SERVICOS_INTERNOS]: [...requestActions]
  },
  [ProfileKeys.AUDITOR]: Object.fromEntries(nonDevModules.map((moduleKey) => [moduleKey, [...readOnlyActions]])),
  [ProfileKeys.SOLICITANTE]: {
    [ModuleKeys.SOLICITACAO_ALMOXARIFADO]: [...requestActions],
    [ModuleKeys.SOLICITACAO_VEICULOS]: [...requestActions],
    [ModuleKeys.SOLICITACAO_SERVICOS_INTERNOS]: [...requestActions]
  },
  [ProfileKeys.VISUALIZADOR]: Object.fromEntries(nonDevModules.map((moduleKey) => [moduleKey, [...visualizerActions]])),
  [ProfileKeys.VISITANTE]: {}
});

const categoryOrder = {
  [ModuleCategories.CENTRAL]: 10,
  [ModuleCategories.SETORIAL]: 20,
  [ModuleCategories.SOLICITACAO]: 30
};

const menuLabels = {
  central: 'Núcleo Administrativo',
  setorial: 'Módulos Setoriais',
  solicitacoes: 'Solicitações Gerais'
};

const moduleByKey = new Map(ModuleCatalog.map((module) => [module.key, module]));
const moduleAliasMap = ModuleCatalog.reduce((accumulator, module) => {
  accumulator[module.key] = module.key;
  for (const alias of module.legacyAliases || []) {
    accumulator[String(alias).trim().toLowerCase()] = module.key;
  }
  return accumulator;
}, {});

function cloneModule(module) {
  return module
    ? {
        ...module,
        legacyAliases: [...(module.legacyAliases || [])]
      }
    : null;
}

function normalizeModuleKey(moduleKey) {
  const normalized = String(moduleKey || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return '';
  }

  return moduleAliasMap[normalized] || normalized;
}

function normalizeActionKey(action) {
  const normalized = String(action || '')
    .trim()
    .toLowerCase();

  if (!normalized) {
    return '';
  }

  return ActionAliases[normalized] || normalized;
}

function getModuleDefinition(moduleKey) {
  const canonicalKey = normalizeModuleKey(moduleKey);
  return cloneModule(moduleByKey.get(canonicalKey));
}

function listModules({ includeDev = true } = {}) {
  return ModuleCatalog.filter((module) => includeDev || !module.devOnly)
    .slice()
    .sort((left, right) => left.order - right.order)
    .map(cloneModule);
}

function listMenuGroups(modules, { isProduction = false } = {}) {
  const moduleList = Array.isArray(modules) ? modules : [];
  const grouped = new Map();

  for (const module of moduleList) {
    if (!module) {
      continue;
    }

    if (isProduction && module.devOnly) {
      continue;
    }

    const groupKey = module.menuGroup || module.category || ModuleCategories.CENTRAL;
    if (!grouped.has(groupKey)) {
      grouped.set(groupKey, []);
    }

    grouped.get(groupKey).push(cloneModule(module));
  }

  return Array.from(grouped.entries())
    .sort(([leftGroup], [rightGroup]) => {
      const leftCategory = ModuleCatalog.find((module) => module.menuGroup === leftGroup)?.category || leftGroup;
      const rightCategory = ModuleCatalog.find((module) => module.menuGroup === rightGroup)?.category || rightGroup;
      return (categoryOrder[leftCategory] || 99) - (categoryOrder[rightCategory] || 99);
    })
    .map(([groupKey, items]) => ({
      key: groupKey,
      label: menuLabels[groupKey] || groupKey,
      items: items.sort((left, right) => left.order - right.order)
    }));
}

module.exports = {
  ModuleCategories,
  ModuleKeys,
  AccessActions,
  ActionAliases,
  ProfileKeys,
  ProfileHierarchy,
  AllActions,
  ModuleCatalog,
  DefaultProfileModuleGrants,
  normalizeModuleKey,
  normalizeActionKey,
  getModuleDefinition,
  listModules,
  listMenuGroups
};
