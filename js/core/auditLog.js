/**
 * 📝 Sistema de Audit Log - SINGEM
 *
 * Registra todas as ações sensíveis de autenticação e segurança.
 * Logs são armazenados localmente no IndexedDB.
 */

/**
 * Tipos de eventos de auditoria
 */
export const AUDIT_EVENT_TYPES = {
  // Autenticação normal
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed',
  LOGOUT: 'logout',

  // Recuperação de senha
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_SUCCESS: 'password_reset_success',
  PASSWORD_RESET_FAILED: 'password_reset_failed',

  // Modo de manutenção (DEV)
  MAINTENANCE_MODE_ACCESS: 'maintenance_mode_access',
  MAINTENANCE_TOKEN_FAILED: 'maintenance_token_failed',
  MAINTENANCE_MASTER_ENABLE: 'maintenance_master_enable',
  MAINTENANCE_USER_CREATE: 'maintenance_user_create',
  MAINTENANCE_PASSWORD_RESET: 'maintenance_password_reset',

  // Credenciais mestras
  MASTER_LOGIN_SUCCESS: 'master_login_success',
  MASTER_LOGIN_BLOCKED: 'master_login_blocked',

  // Usuários
  USER_CREATED: 'user_created',
  USER_DELETED: 'user_deleted',
  USER_UPDATED: 'user_updated'
};

/**
 * Classe de gerenciamento de audit logs
 */
class AuditLogger {
  constructor() {
    this.dbName = 'SINGEMDB';
    this.storeName = 'auditLogs';
    this.maxLogs = 10000; // Máximo de logs armazenados
    this.tempLogs = [];
  }

  /**
   * Registra um evento de auditoria
   * @param {string} eventType - Tipo do evento (use AUDIT_EVENT_TYPES)
   * @param {object} details - Detalhes do evento
   * @param {string} details.username - Usuário relacionado (opcional)
   * @param {string} details.action - Ação executada
   * @param {boolean} details.success - Sucesso ou falha
   * @param {string} details.message - Mensagem adicional
   * @param {object} details.metadata - Metadados extras (opcional)
   */
  async log(eventType, details = {}) {
    try {
      const logEntry = {
        id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        eventType,
        username: details.username || 'anonymous',
        action: details.action || eventType,
        success: details.success !== undefined ? details.success : true,
        message: details.message || '',
        metadata: details.metadata || {},
        userAgent: navigator.userAgent
        // Não armazenar IPs por privacidade
      };

      // Salvar no IndexedDB
      if (window.dbManager) {
        await window.dbManager.add(this.storeName, logEntry);
        console.log(`📝 Audit Log: ${eventType}`, logEntry);
      } else {
        this._saveTempLog(logEntry);
      }

      // Limpar logs antigos se exceder limite
      await this._cleanOldLogs();
    } catch (error) {
      console.error('❌ Erro ao registrar audit log:', error);
    }
  }

  /**
   * Salva log temporário em memória quando DB não está disponível
   * @private
   */
  _saveTempLog(logEntry) {
    try {
      this.tempLogs.push(logEntry);
      // Manter apenas últimos 100 logs temporários
      if (this.tempLogs.length > 100) {
        this.tempLogs.shift();
      }
      console.warn('⚠️ Audit log salvo temporariamente em memória');
    } catch (error) {
      console.error('❌ Erro ao salvar log temporário:', error);
    }
  }

  /**
   * Limpa logs antigos se exceder o limite
   * @private
   */
  async _cleanOldLogs() {
    try {
      if (!window.dbManager) {
        return;
      }

      const allLogs = await window.dbManager.getAll(this.storeName);
      if (allLogs.length > this.maxLogs) {
        // Ordenar por timestamp e remover os mais antigos
        const sorted = allLogs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        const toDelete = sorted.slice(0, allLogs.length - this.maxLogs);
        for (const log of toDelete) {
          await window.dbManager.delete(this.storeName, log.id);
        }

        console.log(`🧹 Limpeza de audit logs: ${toDelete.length} removidos`);
      }
    } catch (error) {
      console.error('❌ Erro ao limpar logs antigos:', error);
    }
  }

  /**
   * Busca logs por filtros
   * @param {object} filters - Filtros de busca
   * @param {string} filters.username - Filtrar por usuário
   * @param {string} filters.eventType - Filtrar por tipo de evento
   * @param {Date} filters.startDate - Data inicial
   * @param {Date} filters.endDate - Data final
   * @param {number} filters.limit - Limite de resultados
   * @returns {Promise<Array>} Logs encontrados
   */
  async getLogs(filters = {}) {
    try {
      if (!window.dbManager) {
        console.warn('⚠️ DB não disponível, retornando logs temporários');
        return this._applyFilters(this.tempLogs, filters);
      }

      let logs = await window.dbManager.getAll(this.storeName);
      logs = this._applyFilters(logs, filters);

      // Ordenar por data decrescente (mais recentes primeiro)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return logs;
    } catch (error) {
      console.error('❌ Erro ao buscar audit logs:', error);
      return [];
    }
  }

  /**
   * Aplica filtros aos logs
   * @private
   */
  _applyFilters(logs, filters) {
    let filtered = logs;

    if (filters.username) {
      filtered = filtered.filter((log) => log.username.toLowerCase().includes(filters.username.toLowerCase()));
    }

    if (filters.eventType) {
      filtered = filtered.filter((log) => log.eventType === filters.eventType);
    }

    if (filters.startDate) {
      filtered = filtered.filter((log) => new Date(log.timestamp) >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter((log) => new Date(log.timestamp) <= filters.endDate);
    }

    if (filters.limit) {
      filtered = filtered.slice(0, filters.limit);
    }

    return filtered;
  }

  /**
   * Exporta logs para análise
   * @param {object} filters - Filtros de busca
   * @returns {Promise<string>} JSON dos logs
   */
  async exportLogs(filters = {}) {
    const logs = await this.getLogs(filters);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Retorna estatísticas dos logs
   * @returns {Promise<object>} Estatísticas
   */
  async getStatistics() {
    try {
      const logs = await this.getLogs();

      const stats = {
        total: logs.length,
        byType: {},
        byUser: {},
        successRate: 0,
        recentActivity: []
      };

      logs.forEach((log) => {
        // Por tipo
        stats.byType[log.eventType] = (stats.byType[log.eventType] || 0) + 1;

        // Por usuário
        stats.byUser[log.username] = (stats.byUser[log.username] || 0) + 1;
      });

      // Taxa de sucesso
      const successLogs = logs.filter((log) => log.success).length;
      stats.successRate = logs.length > 0 ? ((successLogs / logs.length) * 100).toFixed(2) : 0;

      // Atividade recente (últimas 24h)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      stats.recentActivity = logs.filter((log) => new Date(log.timestamp) >= oneDayAgo);

      return stats;
    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      return null;
    }
  }
}

// Instância global do audit logger
export const auditLogger = new AuditLogger();

// Atalhos para logs comuns
export const logLogin = (username, success, message = '') => {
  return auditLogger.log(success ? AUDIT_EVENT_TYPES.LOGIN_SUCCESS : AUDIT_EVENT_TYPES.LOGIN_FAILED, {
    username,
    success,
    message,
    action: 'Login'
  });
};

export const logLogout = (username) => {
  return auditLogger.log(AUDIT_EVENT_TYPES.LOGOUT, {
    username,
    action: 'Logout',
    message: 'Usuário saiu do sistema'
  });
};

export const logPasswordReset = (username, success, message = '') => {
  return auditLogger.log(success ? AUDIT_EVENT_TYPES.PASSWORD_RESET_SUCCESS : AUDIT_EVENT_TYPES.PASSWORD_RESET_FAILED, {
    username,
    success,
    message,
    action: 'Reset de Senha'
  });
};

export const logMaintenanceAccess = (action, success, details = {}) => {
  return auditLogger.log(AUDIT_EVENT_TYPES.MAINTENANCE_MODE_ACCESS, {
    username: 'maintenance',
    success,
    action,
    message: details.message || 'Acesso ao modo de manutenção',
    metadata: details
  });
};

console.log('📝 Audit Logger inicializado');
