/**
 * RBAC - Role-Based Access Control - SINGEM
 * Controle de perfis e permissões
 *
 * Autenticação (quem é) vem do provider
 * Autorização (o que pode) é sempre do SINGEM
 */

const db = require('../../config/database');

/**
 * Perfis disponíveis no SINGEM
 */
const Perfis = {
  ADMIN: 'admin',
  GESTOR: 'gestor',
  OPERADOR: 'operador',
  AUDITOR: 'auditor',
  VISITANTE: 'visitante'
};

/**
 * Hierarquia de perfis (maior = mais permissões)
 */
const PerfilHierarquia = {
  [Perfis.ADMIN]: 100,
  [Perfis.GESTOR]: 80,
  [Perfis.OPERADOR]: 50,
  [Perfis.AUDITOR]: 40,
  [Perfis.VISITANTE]: 10
};

/**
 * Módulos do sistema
 */
const Modulos = {
  EMPENHOS: 'empenhos',
  NOTAS_FISCAIS: 'notas_fiscais',
  ESTOQUE: 'estoque',
  MATERIAIS: 'materiais',
  RELATORIOS: 'relatorios',
  CONFIGURACOES: 'configuracoes',
  USUARIOS: 'usuarios',
  AUDITORIA: 'auditoria',
  INTEGRACOES: 'integracoes'
};

/**
 * Ações possíveis
 */
const Acoes = {
  LER: 'ler',
  CRIAR: 'criar',
  EDITAR: 'editar',
  EXCLUIR: 'excluir',
  VALIDAR: 'validar',
  EXPORTAR: 'exportar',
  IMPORTAR: 'importar',
  CONFIGURAR: 'configurar'
};

/**
 * Matriz de permissões por perfil
 */
const PermissoesPorPerfil = {
  [Perfis.ADMIN]: {
    [Modulos.EMPENHOS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR, Acoes.EXCLUIR, Acoes.VALIDAR, Acoes.IMPORTAR],
    [Modulos.NOTAS_FISCAIS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR, Acoes.EXCLUIR, Acoes.IMPORTAR],
    [Modulos.ESTOQUE]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR, Acoes.EXCLUIR],
    [Modulos.MATERIAIS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR, Acoes.EXCLUIR, Acoes.IMPORTAR],
    [Modulos.RELATORIOS]: [Acoes.LER, Acoes.EXPORTAR],
    [Modulos.CONFIGURACOES]: [Acoes.LER, Acoes.EDITAR, Acoes.CONFIGURAR],
    [Modulos.USUARIOS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR, Acoes.EXCLUIR],
    [Modulos.AUDITORIA]: [Acoes.LER, Acoes.EXPORTAR],
    [Modulos.INTEGRACOES]: [Acoes.LER, Acoes.CONFIGURAR, Acoes.IMPORTAR]
  },

  [Perfis.GESTOR]: {
    [Modulos.EMPENHOS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR, Acoes.VALIDAR, Acoes.IMPORTAR],
    [Modulos.NOTAS_FISCAIS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR, Acoes.IMPORTAR],
    [Modulos.ESTOQUE]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR],
    [Modulos.MATERIAIS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR, Acoes.IMPORTAR],
    [Modulos.RELATORIOS]: [Acoes.LER, Acoes.EXPORTAR],
    [Modulos.CONFIGURACOES]: [Acoes.LER],
    [Modulos.USUARIOS]: [Acoes.LER],
    [Modulos.AUDITORIA]: [Acoes.LER],
    [Modulos.INTEGRACOES]: [Acoes.LER, Acoes.IMPORTAR]
  },

  [Perfis.OPERADOR]: {
    [Modulos.EMPENHOS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR],
    [Modulos.NOTAS_FISCAIS]: [Acoes.LER, Acoes.CRIAR, Acoes.EDITAR],
    [Modulos.ESTOQUE]: [Acoes.LER, Acoes.CRIAR],
    [Modulos.MATERIAIS]: [Acoes.LER],
    [Modulos.RELATORIOS]: [Acoes.LER],
    [Modulos.CONFIGURACOES]: [],
    [Modulos.USUARIOS]: [],
    [Modulos.AUDITORIA]: [],
    [Modulos.INTEGRACOES]: []
  },

  [Perfis.AUDITOR]: {
    [Modulos.EMPENHOS]: [Acoes.LER],
    [Modulos.NOTAS_FISCAIS]: [Acoes.LER],
    [Modulos.ESTOQUE]: [Acoes.LER],
    [Modulos.MATERIAIS]: [Acoes.LER],
    [Modulos.RELATORIOS]: [Acoes.LER, Acoes.EXPORTAR],
    [Modulos.CONFIGURACOES]: [Acoes.LER],
    [Modulos.USUARIOS]: [Acoes.LER],
    [Modulos.AUDITORIA]: [Acoes.LER, Acoes.EXPORTAR],
    [Modulos.INTEGRACOES]: [Acoes.LER]
  },

  [Perfis.VISITANTE]: {
    [Modulos.EMPENHOS]: [Acoes.LER],
    [Modulos.NOTAS_FISCAIS]: [],
    [Modulos.ESTOQUE]: [],
    [Modulos.MATERIAIS]: [Acoes.LER],
    [Modulos.RELATORIOS]: [],
    [Modulos.CONFIGURACOES]: [],
    [Modulos.USUARIOS]: [],
    [Modulos.AUDITORIA]: [],
    [Modulos.INTEGRACOES]: []
  }
};

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
  hasPermission(user, modulo, acao) {
    if (!user || !user.perfil) {
      return false;
    }

    const perfil = user.perfil.toLowerCase();
    const permissoes = PermissoesPorPerfil[perfil];

    if (!permissoes) {
      return false;
    }

    const acoesModulo = permissoes[modulo];
    if (!acoesModulo) {
      return false;
    }

    return acoesModulo.includes(acao);
  },

  /**
   * Verifica se é admin
   * @param {object} user
   * @returns {boolean}
   */
  isAdmin(user) {
    return user?.perfil?.toLowerCase() === Perfis.ADMIN;
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
    return PermissoesPorPerfil[perfil?.toLowerCase()] || {};
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

    const permissoes = PermissoesPorPerfil[user.perfil.toLowerCase()] || {};
    return Object.entries(permissoes)
      .filter(([_modulo, acoes]) => acoes.length > 0)
      .map(([modulo]) => modulo);
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
      await db.query(
        `INSERT INTO audit_log (
          user_id, action, module, entity_type, entity_id,
          changes, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [userId, action, moduleName, entityType, entityId, changes ? JSON.stringify(changes) : null, ip, userAgent]
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
        LEFT JOIN usuarios u ON u.id = al.user_id
        WHERE 1=1
      `;
      const params = [];
      let paramIdx = 1;

      if (filters.userId) {
        query += ` AND al.user_id = $${paramIdx++}`;
        params.push(filters.userId);
      }

      if (filters.module) {
        query += ` AND al.module = $${paramIdx++}`;
        params.push(filters.module);
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
  PerfilHierarquia
};

module.exports = rbac;
