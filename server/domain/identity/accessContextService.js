const db = require('../../db');
const { config } = require('../../config');
const {
  ModuleCatalog,
  ModuleKeys,
  AllActions,
  DefaultProfileModuleGrants,
  ProfileKeys,
  normalizeActionKey,
  normalizeModuleKey,
  listMenuGroups
} = require('./moduleCatalog');

const REQUIRED_TABLES = [
  'system_modules',
  'unidades_organizacionais',
  'setores_organizacionais',
  'usuario_escopos_acesso',
  'perfil_modulo_acessos',
  'usuario_modulo_acessos'
];

let schemaCache = {
  checkedAt: 0,
  ready: false
};

function isDevelopmentMode() {
  return String(config.env || process.env.NODE_ENV || 'development').toLowerCase() !== 'production';
}

function normalizeActions(actions = []) {
  return [...new Set((Array.isArray(actions) ? actions : []).map(normalizeActionKey).filter(Boolean))].sort();
}

async function hasModularAccessSchema() {
  const now = Date.now();
  if (now - schemaCache.checkedAt < 60_000) {
    return schemaCache.ready;
  }

  const result = await db.query(
    `SELECT table_name
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)`,
    [REQUIRED_TABLES]
  );

  const found = new Set(result.rows.map((row) => row.table_name));
  schemaCache = {
    checkedAt: now,
    ready: REQUIRED_TABLES.every((tableName) => found.has(tableName))
  };

  return schemaCache.ready;
}

async function resolveBaseUser(userOrId) {
  if (userOrId && typeof userOrId === 'object' && userOrId.id) {
    return {
      id: userOrId.id,
      login: userOrId.login || null,
      nome: userOrId.nome || null,
      email: userOrId.email || null,
      perfil: String(userOrId.perfil || ProfileKeys.OPERADOR).toLowerCase(),
      authProvider: userOrId.authProvider || userOrId.auth_provider || 'local'
    };
  }

  const result = await db.query(
    `SELECT id, login, nome, email, perfil, auth_provider
       FROM usuarios
      WHERE id = $1
      LIMIT 1`,
    [userOrId]
  );

  const user = result.rows[0];
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    login: user.login,
    nome: user.nome,
    email: user.email,
    perfil: String(user.perfil || ProfileKeys.OPERADOR).toLowerCase(),
    authProvider: user.auth_provider || 'local'
  };
}

function buildCatalogIndex(catalogRows) {
  const dbMap = new Map(
    (catalogRows || []).map((row) => [
      row.chave,
      {
        key: row.chave,
        title: row.nome_exibicao,
        shortTitle: row.nome_exibicao,
        description: row.descricao || '',
        category: row.categoria,
        menuGroup: row.categoria === 'solicitacao' ? 'solicitacoes' : row.categoria,
        route: row.rota || null,
        screenId: row.screen_id || null,
        icon: row.icone || null,
        order: Number(row.ordem_menu || 100),
        enabledByDefault: row.habilitado !== false,
        enabled: row.habilitado !== false,
        devOnly: row.oculto_em_producao === true,
        legacyAliases: []
      }
    ])
  );

  return ModuleCatalog.map((module) => {
    const override = dbMap.get(module.key);
    return {
      ...module,
      enabled: override ? override.enabled : module.enabledByDefault,
      title: override?.title || module.title,
      description: override?.description || module.description,
      route: override?.route || module.route,
      screenId: override?.screenId || module.screenId,
      icon: override?.icon || module.icon,
      order: override?.order || module.order,
      devOnly: override ? override.devOnly : module.devOnly
    };
  });
}

function buildDefaultGrantRows(profile) {
  const grants = DefaultProfileModuleGrants[String(profile || '').toLowerCase()] || {};
  return Object.entries(grants).map(([moduleKey, actions]) => ({
    moduleKey,
    actions,
    scopeLevel: [ProfileKeys.ADMIN, ProfileKeys.ADMIN_SUPERIOR].includes(String(profile || '').toLowerCase())
      ? 'global'
      : 'setor',
    source: 'fallback-profile'
  }));
}

function mergeGrant(aggregate, grant, defaultUnitIds, defaultSectorIds) {
  const moduleKey = normalizeModuleKey(grant.moduleKey);
  if (!moduleKey) {
    return;
  }

  if (!aggregate.has(moduleKey)) {
    aggregate.set(moduleKey, {
      actions: new Set(),
      source: new Set(),
      unitIds: new Set(),
      sectorIds: new Set(),
      scopeLevel: grant.scopeLevel || 'setor'
    });
  }

  const current = aggregate.get(moduleKey);
  const actions = normalizeActions(grant.actions);
  const ruleType = grant.ruleType || 'grant';

  if (ruleType === 'revoke') {
    for (const action of actions) {
      current.actions.delete(action);
    }
  } else {
    for (const action of actions) {
      current.actions.add(action);
    }
  }

  for (const source of [grant.source || 'database']) {
    current.source.add(source);
  }

  const unitIds = (grant.unitIds && grant.unitIds.length ? grant.unitIds : defaultUnitIds) || [];
  const sectorIds = (grant.sectorIds && grant.sectorIds.length ? grant.sectorIds : defaultSectorIds) || [];

  for (const unitId of unitIds) {
    if (unitId) {
      current.unitIds.add(Number(unitId));
    }
  }

  for (const sectorId of sectorIds) {
    if (sectorId) {
      current.sectorIds.add(Number(sectorId));
    }
  }

  if (grant.scopeLevel === 'global') {
    current.scopeLevel = 'global';
  }
}

function buildScopeSummary(user, scopeRows) {
  const unitsMap = new Map();
  const sectorsMap = new Map();

  for (const row of scopeRows) {
    if (row.unidade_id && !unitsMap.has(row.unidade_id)) {
      unitsMap.set(row.unidade_id, {
        id: row.unidade_id,
        codigo: row.unidade_codigo || null,
        nome: row.unidade_nome || null,
        sigla: row.unidade_sigla || null,
        principal: row.principal === true
      });
    }

    if (row.setor_id && !sectorsMap.has(row.setor_id)) {
      sectorsMap.set(row.setor_id, {
        id: row.setor_id,
        unidade_id: row.unidade_id || null,
        codigo: row.setor_codigo || null,
        nome: row.setor_nome || null,
        sigla: row.setor_sigla || null,
        principal: row.principal === true,
        nivel_escopo: row.nivel_escopo || 'setor',
        perfil_escopo: row.perfil_escopo || 'membro'
      });
    }
  }

  const units = Array.from(unitsMap.values());
  const sectors = Array.from(sectorsMap.values());
  const isGlobalProfile = [ProfileKeys.ADMIN, ProfileKeys.ADMIN_SUPERIOR].includes(String(user.perfil || '').toLowerCase());

  return {
    units,
    sectors,
    dataScope: {
      allUnits: isGlobalProfile,
      allSectors: isGlobalProfile,
      unitIds: units.map((unit) => unit.id),
      sectorIds: sectors.map((sector) => sector.id)
    }
  };
}

function buildMenuEntries(moduleContexts) {
  return listMenuGroups(moduleContexts.map((module) => ({
    ...module,
    order: module.order,
    devOnly: module.devOnly
  })), {
    isProduction: !isDevelopmentMode()
  });
}

function buildContextPayload(user, catalog, scopeRows, profileGrants, userGrants, overrideMode = null) {
  const scopeSummary = buildScopeSummary(user, scopeRows);
  const aggregate = new Map();
  const defaultUnitIds = scopeSummary.dataScope.unitIds;
  const defaultSectorIds = scopeSummary.dataScope.sectorIds;

  for (const grant of profileGrants) {
    mergeGrant(aggregate, grant, defaultUnitIds, defaultSectorIds);
  }

  for (const grant of userGrants) {
    mergeGrant(aggregate, grant, defaultUnitIds, defaultSectorIds);
  }

  const modules = catalog
    .filter((module) => module.enabled)
    .map((module) => {
      const grant = aggregate.get(module.key);
      if (!grant || grant.actions.size === 0) {
        return null;
      }

      return {
        key: module.key,
        title: module.title,
        shortTitle: module.shortTitle,
        description: module.description,
        category: module.category,
        menuGroup: module.menuGroup,
        route: module.route,
        screenId: module.screenId,
        icon: module.icon,
        order: module.order,
        devOnly: module.devOnly,
        actions: [...grant.actions].sort(),
        scopeLevel: grant.scopeLevel,
        unitIds: [...grant.unitIds].sort((left, right) => left - right),
        sectorIds: [...grant.sectorIds].sort((left, right) => left - right),
        source: [...grant.source]
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.order - right.order);

  const permissions = modules.reduce((accumulator, module) => {
    accumulator[module.key] = [...module.actions];
    return accumulator;
  }, {});

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    overrideMode,
    profile: user.perfil,
    units: scopeSummary.units,
    sectors: scopeSummary.sectors,
    modules,
    permissions,
    menus: buildMenuEntries(modules),
    dataScope: scopeSummary.dataScope
  };
}

function buildDevelopmentContext(user) {
  const modules = ModuleCatalog.map((module) => ({
    key: module.key,
    title: module.title,
    shortTitle: module.shortTitle,
    description: module.description,
    category: module.category,
    menuGroup: module.menuGroup,
    route: module.route,
    screenId: module.screenId,
    icon: module.icon,
    order: module.order,
    devOnly: module.devOnly,
    actions: [...AllActions],
    scopeLevel: 'global',
    unitIds: [],
    sectorIds: [],
    source: ['development-open-access']
  }));

  const permissions = modules.reduce((accumulator, module) => {
    accumulator[module.key] = [...module.actions];
    return accumulator;
  }, {});

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    overrideMode: 'development-open-access',
    profile: user.perfil,
    units: [],
    sectors: [],
    modules,
    permissions,
    menus: buildMenuEntries(modules),
    dataScope: {
      allUnits: true,
      allSectors: true,
      unitIds: [],
      sectorIds: []
    }
  };
}

async function loadCatalogRows() {
  const result = await db.query(
    `SELECT chave, nome_exibicao, descricao, categoria, rota, screen_id, icone,
            ordem_menu, habilitado, oculto_em_producao
       FROM system_modules
      ORDER BY ordem_menu ASC, nome_exibicao ASC`
  );

  return result.rows;
}

async function loadScopeRows(userId) {
  const result = await db.query(
    `SELECT ua.unidade_id,
            u.codigo AS unidade_codigo,
            u.nome AS unidade_nome,
            u.sigla AS unidade_sigla,
            ua.setor_id,
            s.codigo AS setor_codigo,
            s.nome AS setor_nome,
            s.sigla AS setor_sigla,
            ua.nivel_escopo,
            ua.perfil_escopo,
            ua.principal
       FROM usuario_escopos_acesso ua
       LEFT JOIN unidades_organizacionais u ON u.id = ua.unidade_id
       LEFT JOIN setores_organizacionais s ON s.id = ua.setor_id
      WHERE ua.usuario_id = $1
        AND ua.ativo = true
      ORDER BY ua.principal DESC, u.nome ASC NULLS LAST, s.nome ASC NULLS LAST`,
    [userId]
  );

  return result.rows;
}

async function loadProfileGrants(profile) {
  const result = await db.query(
    `SELECT modulo_key, acoes, nivel_escopo
       FROM perfil_modulo_acessos
      WHERE perfil = $1
        AND ativo = true`,
    [String(profile || '').toLowerCase()]
  );

  return result.rows.map((row) => ({
    moduleKey: row.modulo_key,
    actions: row.acoes,
    scopeLevel: row.nivel_escopo || 'setor',
    source: 'database-profile'
  }));
}

async function loadUserGrants(userId) {
  const result = await db.query(
    `SELECT modulo_key, acoes, nivel_escopo, unidade_id, setor_id, tipo_regra
       FROM usuario_modulo_acessos
      WHERE usuario_id = $1
        AND ativo = true`,
    [userId]
  );

  return result.rows.map((row) => ({
    moduleKey: row.modulo_key,
    actions: row.acoes,
    scopeLevel: row.nivel_escopo || 'setor',
    unitIds: row.unidade_id ? [row.unidade_id] : [],
    sectorIds: row.setor_id ? [row.setor_id] : [],
    ruleType: row.tipo_regra || 'grant',
    source: 'database-user'
  }));
}

async function getAccessContext(userOrId) {
  const user = await resolveBaseUser(userOrId);
  if (!user) {
    return null;
  }

  if (isDevelopmentMode()) {
    return buildDevelopmentContext(user);
  }

  try {
    const schemaReady = await hasModularAccessSchema();
    if (!schemaReady) {
      return buildContextPayload(user, ModuleCatalog, [], buildDefaultGrantRows(user.perfil), [], null);
    }

    const [catalogRows, scopeRows, profileGrants, userGrants] = await Promise.all([
      loadCatalogRows(),
      loadScopeRows(user.id),
      loadProfileGrants(user.perfil),
      loadUserGrants(user.id)
    ]);

    return buildContextPayload(
      user,
      buildCatalogIndex(catalogRows),
      scopeRows,
      profileGrants.length ? profileGrants : buildDefaultGrantRows(user.perfil),
      userGrants,
      null
    );
  } catch (error) {
    if (error?.code === '42P01' || error?.code === '42703') {
      return buildContextPayload(user, ModuleCatalog, [], buildDefaultGrantRows(user.perfil), [], null);
    }

    throw error;
  }
}

async function hydrateAuthenticatedUser(userOrId) {
  const user = await resolveBaseUser(userOrId);
  if (!user) {
    return null;
  }

  const accessContext = await getAccessContext(user);

  return {
    id: user.id,
    login: user.login,
    nome: user.nome,
    email: user.email,
    perfil: user.perfil,
    authProvider: user.authProvider,
    accessContext,
    modulosHabilitados: accessContext?.modules?.map((module) => module.key) || [],
    permissoes: accessContext?.permissions || {},
    menusVisiveis: accessContext?.menus || [],
    unidadesVinculadas: accessContext?.units || [],
    setoresVinculados: accessContext?.sectors || [],
    escopoDados: accessContext?.dataScope || {
      allUnits: false,
      allSectors: false,
      unitIds: [],
      sectorIds: []
    }
  };
}

module.exports = {
  isDevelopmentMode,
  hasModularAccessSchema,
  getAccessContext,
  hydrateAuthenticatedUser,
  ModuleKeys
};
