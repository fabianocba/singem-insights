const db = require('../../config/database');
const {
  ModuleKeys,
  AccessActions,
  ProfileKeys,
  ProfileHierarchy,
  DefaultProfileModuleGrants,
  normalizeActionKey,
  normalizeModuleKey
} = require('./moduleCatalog');

const Perfis = Object.freeze({
  ADMIN: ProfileKeys.ADMIN,
  ADMIN_SUPERIOR: ProfileKeys.ADMIN_SUPERIOR,
  ADMIN_SETORIAL: ProfileKeys.ADMIN_SETORIAL,
  GESTOR: ProfileKeys.GESTOR,
  ALMOXARIFE: ProfileKeys.ALMOXARIFE,
  CONFERENTE: ProfileKeys.CONFERENTE,
  OPERADOR: ProfileKeys.OPERADOR,
  AUDITOR: ProfileKeys.AUDITOR,
  SOLICITANTE: ProfileKeys.SOLICITANTE,
  VISUALIZADOR: ProfileKeys.VISUALIZADOR,
  VISITANTE: ProfileKeys.VISITANTE
});

const PerfilHierarquia = { ...ProfileHierarchy };

const Modulos = Object.freeze({
  SINGEM_ADM: ModuleKeys.SINGEM_ADM,
  SINGEM_DEVTOOLS: ModuleKeys.SINGEM_DEVTOOLS,
  GESTAO_ALMOXARIFADO: ModuleKeys.GESTAO_ALMOXARIFADO,
  GESTAO_PATRIMONIO: ModuleKeys.GESTAO_PATRIMONIO,
  GESTAO_VEICULOS: ModuleKeys.GESTAO_VEICULOS,
  GESTAO_SERVICOS_INTERNOS: ModuleKeys.GESTAO_SERVICOS_INTERNOS,
  GESTAO_CONTRATOS: ModuleKeys.GESTAO_CONTRATOS,
  SOLICITACAO_ALMOXARIFADO: ModuleKeys.SOLICITACAO_ALMOXARIFADO,
  SOLICITACAO_VEICULOS: ModuleKeys.SOLICITACAO_VEICULOS,
  SOLICITACAO_SERVICOS_INTERNOS: ModuleKeys.SOLICITACAO_SERVICOS_INTERNOS,
  EMPENHOS: ModuleKeys.GESTAO_ALMOXARIFADO,
  NOTAS_FISCAIS: ModuleKeys.GESTAO_ALMOXARIFADO,
  ESTOQUE: ModuleKeys.GESTAO_ALMOXARIFADO,
  MATERIAIS: ModuleKeys.GESTAO_ALMOXARIFADO,
  ALMOXARIFADO: ModuleKeys.GESTAO_ALMOXARIFADO,
  RELATORIOS: ModuleKeys.SINGEM_ADM,
  CONFIGURACOES: ModuleKeys.SINGEM_ADM,
  USUARIOS: ModuleKeys.SINGEM_ADM,
  AUDITORIA: ModuleKeys.SINGEM_ADM,
  INTEGRACOES: ModuleKeys.SINGEM_ADM
});

const Acoes = Object.freeze({
  VISUALIZAR: AccessActions.VISUALIZAR,
  LER: AccessActions.VISUALIZAR,
  CADASTRAR: AccessActions.CADASTRAR,
  CRIAR: AccessActions.CADASTRAR,
  EDITAR: AccessActions.EDITAR,
  EXCLUIR: AccessActions.EXCLUIR,
  APROVAR: AccessActions.APROVAR,
  VALIDAR: AccessActions.APROVAR,
  ADMINISTRAR: AccessActions.ADMINISTRAR,
  CONFIGURAR: AccessActions.ADMINISTRAR,
  IMPORTAR: AccessActions.IMPORTAR,
  EXPORTAR: AccessActions.EXPORTAR,
  PROCESSAR: AccessActions.PROCESSAR,
  REPROCESSAR: AccessActions.REPROCESSAR
});

function getFallbackPermissions(perfil) {
  return DefaultProfileModuleGrants[String(perfil || '').toLowerCase()] || {};
}

function getResolvedPermissions(user) {
  if (user?.accessContext?.permissions && typeof user.accessContext.permissions === 'object') {
    return user.accessContext.permissions;
  }

  return getFallbackPermissions(user?.perfil);
}

function getResolvedModulePermissions(user, moduleName) {
  const permissions = getResolvedPermissions(user);
  const canonicalModule = normalizeModuleKey(moduleName);
  return Array.isArray(permissions[canonicalModule])
    ? permissions[canonicalModule].map(normalizeActionKey).filter(Boolean)
    : [];
}

function hasScopeAccess(user, moduleName, scope = null) {
  if (!scope || (!scope.unitId && !scope.sectorId)) {
    return true;
  }

  if (user?.accessContext?.overrideMode === 'development-open-access') {
    return true;
  }

  const canonicalModule = normalizeModuleKey(moduleName);
  const moduleAccess = Array.isArray(user?.accessContext?.modules)
    ? user.accessContext.modules.find((module) => module.key === canonicalModule)
    : null;

  if (!moduleAccess) {
    return false;
  }

  if (moduleAccess.scopeLevel === 'global') {
    return true;
  }

  const globalScope = user?.accessContext?.dataScope || {};

  if (scope.sectorId) {
    if (globalScope.allSectors) {
      return true;
    }

    const sectorIds = moduleAccess.sectorIds?.length ? moduleAccess.sectorIds : globalScope.sectorIds || [];
    return sectorIds.map(Number).includes(Number(scope.sectorId));
  }

  if (scope.unitId) {
    if (globalScope.allUnits) {
      return true;
    }

    const unitIds = moduleAccess.unitIds?.length ? moduleAccess.unitIds : globalScope.unitIds || [];
    return unitIds.map(Number).includes(Number(scope.unitId));
  }

  return true;
}

/**
 * Serviço RBAC
 */
const rbac = {
  /**
   * Verifica se usuário tem permissão
   * @param {object} user - Usuário (deve ter perfil)
   * @param {string} modulo - Módulo do sistema
   * @param {string} acao - Ação a verificar
   * @returns {boolean}
   */
  hasPermission(user, modulo, acao, scope = null) {
    if (!user || !user.perfil) {
      return false;
    }

    if (user?.accessContext?.overrideMode === 'development-open-access') {
      return true;
    }

    const normalizedAction = normalizeActionKey(acao);
    if (!normalizedAction) {
      return false;
    }

    const actions = getResolvedModulePermissions(user, modulo);
    if (!actions.includes(normalizedAction)) {
      return false;
    }

    return hasScopeAccess(user, modulo, scope);
  },

  /**
   * Verifica se é admin
   * @param {object} user
   * @returns {boolean}
   */
  isAdmin(user) {
    return [Perfis.ADMIN, Perfis.ADMIN_SUPERIOR, Perfis.ADMIN_SETORIAL].includes(
      String(user?.perfil || '').toLowerCase()
    );
  },

  /**
   * Verifica se perfil A é superior a perfil B
   * @param {string} perfilA
   * @param {string} perfilB
   * @returns {boolean}
   */
  isHigherThan(perfilA, perfilB) {
    const nivelA = PerfilHierarquia[perfilA?.toLowerCase()] || 0;
    const nivelB = PerfilHierarquia[perfilB?.toLowerCase()] || 0;
    return nivelA > nivelB;
  },

  /**
   * Retorna todas as permissões de um perfil
   * @param {string} perfil
   * @returns {object}
   */
  getPermissions(perfil) {
    if (perfil && typeof perfil === 'object') {
      return getResolvedPermissions(perfil);
    }

    return getFallbackPermissions(perfil);
  },

  /**
   * Retorna módulos que usuário pode acessar
   * @param {object} user
   * @returns {string[]}
   */
  getAccessibleModules(user) {
    if (!user?.perfil) {
      return [];
    }

    const permissoes = getResolvedPermissions(user);
    return Object.entries(permissoes)
      .filter(([_modulo, acoes]) => acoes.length > 0)
      .map(([modulo]) => normalizeModuleKey(modulo));
  },

  /**
   * Registra ação de auditoria
   * @param {object} options
   * @param {number} options.userId - ID do usuário
   * @param {string} options.action - Ação realizada
   * @param {string} options.module - Módulo afetado
   * @param {string} options.entityType - Tipo da entidade (empenho, nf, etc)
   * @param {number|string} options.entityId - ID da entidade
   * @param {object} options.changes - Alterações realizadas
   * @param {string} options.ip - IP do cliente
   * @param {string} options.userAgent - User-Agent
   */
  async logAudit({ userId, action, module: moduleName, entityType, entityId, changes, ip, userAgent }) {
    try {
      const normalizedModule = normalizeModuleKey(moduleName) || 'sistema';
      const normalizedEntityId = Number.isFinite(Number(entityId)) ? Number(entityId) : null;
      const payload = {
        modulo: normalizedModule,
        entidade_tipo: entityType || null,
        entidade_id_raw: entityId ?? null,
        alteracoes: changes || null
      };

      await db.query(
        `INSERT INTO audit_log (
          usuario_id, usuario_nome, acao, entidade, entidade_id,
          dados_depois, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [userId, null, action, normalizedModule, normalizedEntityId, JSON.stringify(payload), ip, userAgent]
      );
    } catch (err) {
      console.error('[RBAC] Erro ao registrar auditoria:', err);
    }
  },

  /**
   * Consulta log de auditoria
   * @param {object} filters
   * @returns {Promise<object[]>}
   */
  async queryAuditLog(filters = {}) {
    try {
      let query = `
        SELECT al.*, u.nome as user_name, u.login as user_login
        FROM audit_log al
        LEFT JOIN usuarios u ON u.id = al.usuario_id
        WHERE 1=1
      `;
      const params = [];
      let paramIdx = 1;

      if (filters.userId) {
        query += ` AND al.usuario_id = $${paramIdx++}`;
        params.push(filters.userId);
      }

      if (filters.module) {
        query += ` AND (al.entidade = $${paramIdx++} OR al.dados_depois->>'modulo' = $${paramIdx - 1})`;
        params.push(normalizeModuleKey(filters.module));
      }

      if (filters.action) {
        query += ` AND al.action = $${paramIdx++}`;
        params.push(filters.action);
      }

      if (filters.startDate) {
        query += ` AND al.created_at >= $${paramIdx++}`;
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        query += ` AND al.created_at <= $${paramIdx++}`;
        params.push(filters.endDate);
      }

      query += ' ORDER BY al.created_at DESC';

      if (filters.limit) {
        query += ` LIMIT $${paramIdx++}`;
        params.push(filters.limit);
      }

      const result = await db.query(query, params);
      return result.rows;
    } catch (err) {
      console.error('[RBAC] Erro ao consultar auditoria:', err);
      return [];
    }
  },

  // Exporta constantes
  Perfis,
  Modulos,
  Acoes,
  PerfilHierarquia,
  normalizeModuleKey,
  normalizeActionKey,
  hasScopeAccess
};

module.exports = rbac;
