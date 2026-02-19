/**
 * User Link Service - SINGEM
 * Vincula contas externas (gov.br, LDAP, etc) a usuários internos
 *
 * Garante que identidades externas são mapeadas para o modelo interno
 * do SINGEM, mantendo controle de RBAC localmente.
 */

const db = require('../../config/database');

/**
 * Serviço de vinculação de contas
 */
const userLinkService = {
  /**
   * Vincula conta gov.br a usuário existente
   * @param {number} userId - ID do usuário interno
   * @param {object} govBrProfile - Perfil normalizado do gov.br
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async linkGovBr(userId, govBrProfile) {
    try {
      // Verifica se usuário existe
      const user = await db.findById('usuarios', userId);
      if (!user) {
        return { success: false, error: 'Usuário não encontrado' };
      }

      // Verifica se gov.br já está vinculado a outro usuário
      const existing = await db.query('SELECT id FROM usuarios WHERE govbr_sub = $1 AND id != $2', [
        govBrProfile.providerUserId,
        userId
      ]);

      if (existing.rows.length > 0) {
        return { success: false, error: 'Esta conta gov.br já está vinculada a outro usuário' };
      }

      // Atualiza usuário com dados gov.br
      await db.query(
        `UPDATE usuarios SET 
          govbr_sub = $1,
          govbr_cpf = $2,
          govbr_nome_social = $3,
          govbr_nivel_confiabilidade = $4,
          auth_provider = 'govbr',
          atualizado_em = NOW()
        WHERE id = $5`,
        [govBrProfile.providerUserId, govBrProfile.cpf, govBrProfile.name, govBrProfile.level || 'bronze', userId]
      );

      // Registra auditoria
      await this._logAuthEvent(userId, 'LINK_GOVBR', {
        cpf: govBrProfile.cpf?.slice(0, 3) + '***',
        level: govBrProfile.level
      });

      return { success: true };
    } catch (err) {
      console.error('[UserLinkService] Erro ao vincular gov.br:', err);
      return { success: false, error: 'Erro ao vincular conta gov.br' };
    }
  },

  /**
   * Remove vinculação gov.br de usuário
   * @param {number} userId - ID do usuário
   * @returns {Promise<{success: boolean}>}
   */
  async unlinkGovBr(userId) {
    try {
      await db.query(
        `UPDATE usuarios SET 
          govbr_sub = NULL,
          govbr_cpf = NULL,
          govbr_nome_social = NULL,
          govbr_nivel_confiabilidade = NULL,
          auth_provider = 'local',
          atualizado_em = NOW()
        WHERE id = $1`,
        [userId]
      );

      await this._logAuthEvent(userId, 'UNLINK_GOVBR');
      return { success: true };
    } catch (err) {
      console.error('[UserLinkService] Erro ao desvincular gov.br:', err);
      return { success: false, error: 'Erro ao desvincular conta gov.br' };
    }
  },

  /**
   * Encontra ou cria usuário a partir de perfil externo
   * @param {object} normalizedProfile - Perfil normalizado
   * @returns {Promise<{user: object, created: boolean}>}
   */
  async findOrCreateFromProfile(normalizedProfile) {
    try {
      // Tenta encontrar por providerUserId
      if (normalizedProfile.provider === 'govbr' && normalizedProfile.providerUserId) {
        const existing = await db.query('SELECT * FROM usuarios WHERE govbr_sub = $1', [
          normalizedProfile.providerUserId
        ]);

        if (existing.rows.length > 0) {
          return { user: existing.rows[0], created: false };
        }
      }

      // Tenta encontrar por CPF
      if (normalizedProfile.cpf) {
        const existing = await db.query('SELECT * FROM usuarios WHERE govbr_cpf = $1 OR cpf = $1', [
          normalizedProfile.cpf
        ]);

        if (existing.rows.length > 0) {
          // Atualiza vinculação
          await this.linkGovBr(existing.rows[0].id, normalizedProfile);
          return { user: existing.rows[0], created: false };
        }
      }

      // Tenta encontrar por email
      if (normalizedProfile.email) {
        const existing = await db.query('SELECT * FROM usuarios WHERE email = $1', [normalizedProfile.email]);

        if (existing.rows.length > 0) {
          // Atualiza vinculação
          await this.linkGovBr(existing.rows[0].id, normalizedProfile);
          return { user: existing.rows[0], created: false };
        }
      }

      // Cria novo usuário
      const newUser = await db.query(
        `INSERT INTO usuarios (
          login, nome, email, cpf, perfil, ativo,
          govbr_sub, govbr_cpf, govbr_nome_social, govbr_nivel_confiabilidade,
          auth_provider, criado_em, atualizado_em
        ) VALUES (
          $1, $2, $3, $4, 'operador', true,
          $5, $6, $7, $8,
          $9, NOW(), NOW()
        ) RETURNING *`,
        [
          normalizedProfile.email || normalizedProfile.cpf,
          normalizedProfile.name,
          normalizedProfile.email,
          normalizedProfile.cpf,
          normalizedProfile.providerUserId,
          normalizedProfile.cpf,
          normalizedProfile.name,
          normalizedProfile.level || 'bronze',
          normalizedProfile.provider
        ]
      );

      await this._logAuthEvent(newUser.rows[0].id, 'CREATE_FROM_EXTERNAL', {
        provider: normalizedProfile.provider
      });

      return { user: newUser.rows[0], created: true };
    } catch (err) {
      console.error('[UserLinkService] Erro ao encontrar/criar usuário:', err);
      throw new Error('Erro ao processar perfil externo');
    }
  },

  /**
   * Verifica se usuário tem conta externa vinculada
   * @param {number} userId - ID do usuário
   * @param {string} provider - Nome do provider (govbr, ldap, etc)
   * @returns {Promise<boolean>}
   */
  async hasLinkedAccount(userId, provider) {
    try {
      if (provider === 'govbr') {
        const result = await db.query('SELECT govbr_sub FROM usuarios WHERE id = $1', [userId]);
        return !!result.rows[0]?.govbr_sub;
      }
      return false;
    } catch (_err) {
      return false;
    }
  },

  /**
   * Registra evento de autenticação
   * @private
   */
  async _logAuthEvent(userId, action, details = null) {
    try {
      await db.query(
        `INSERT INTO auth_log (user_id, action, details, created_at)
         VALUES ($1, $2, $3, NOW())`,
        [userId, action, details ? JSON.stringify(details) : null]
      );
    } catch (err) {
      console.error('[UserLinkService] Erro ao registrar evento:', err);
    }
  }
};

module.exports = userLinkService;
