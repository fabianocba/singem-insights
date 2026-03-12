/**
 * Local Provider - SINGEM
 *
 * Retorno padronizado (normalizado) para qualquer provider:
 * {
 *   provider: "local" | "govbr",
 *   providerUserId: "string",
 *   cpf: "00000000000" | null,
 *   name: "Nome",
 *   email: "email@x.com",
 *   level: null | "bronze|prata|ouro",
 * }
 */

const bcrypt = require('bcrypt');
const db = require('../../../config/database');
const { config } = require('../../../config');

const SALT_ROUNDS = 12;

class LocalProvider {
  _isNonProduction() {
    return String(config.env || 'development') !== 'production';
  }

  _buildCompatibleLogins(rawLogin) {
    const normalized = String(rawLogin || '')
      .trim()
      .toLowerCase();
    const configuredAdminLogin = String(config.admin?.login || 'admin')
      .trim()
      .toLowerCase();

    const candidates = new Set([normalized]);

    if (normalized === 'adm' || normalized === configuredAdminLogin) {
      candidates.add('adm');
      candidates.add(configuredAdminLogin);
    }

    return Array.from(candidates).filter(Boolean);
  }

  _isLegacyAdminCredential(rawLogin, password) {
    if (!this._isNonProduction()) {
      return false;
    }

    const normalized = String(rawLogin || '')
      .trim()
      .toLowerCase();
    const configuredAdminLogin = String(config.admin?.login || 'admin')
      .trim()
      .toLowerCase();
    const isAdminLogin = normalized === 'adm' || normalized === configuredAdminLogin;

    if (!isAdminLogin || !password) {
      return false;
    }

    const acceptedPasswords = [config.admin?.password];

    if (this._isNonProduction() && config.db?.password) {
      acceptedPasswords.push(config.db.password);
    }

    return acceptedPasswords.filter(Boolean).includes(password);
  }

  async _ensureDevAdmin(rawLogin, password) {
    const login = String(rawLogin || '')
      .trim()
      .toLowerCase();
    const compatibleLogins = this._buildCompatibleLogins(login);
    const email = String(config.admin?.email || 'admin@ifbaiano.edu.br')
      .trim()
      .toLowerCase();
    const nome = String(config.admin?.nome || 'Administrador SINGEM').trim();
    const senhaHash = await bcrypt.hash(String(password), SALT_ROUNDS);

    const existing = await db.query(
      `SELECT id
         FROM usuarios
        WHERE LOWER(login) = ANY($1)
           OR LOWER(email) = $2
        ORDER BY CASE WHEN LOWER(login) = $3 THEN 0 WHEN LOWER(email) = $2 THEN 1 ELSE 2 END
        LIMIT 1`,
      [compatibleLogins, email, login]
    );

    if (existing.rows[0]?.id) {
      await db.query(
        `UPDATE usuarios
            SET login = $2,
                email = $3,
                senha_hash = $4,
                nome = $5,
                perfil = 'admin',
                ativo = true,
                updated_at = NOW()
          WHERE id = $1`,
        [existing.rows[0].id, login, email, senhaHash, nome]
      );
      return;
    }

    await db.query(
      `INSERT INTO usuarios (login, email, senha_hash, nome, perfil, ativo)
       VALUES ($1, $2, $3, $4, 'admin', true)
       ON CONFLICT (login)
       DO UPDATE SET
         email = EXCLUDED.email,
         senha_hash = EXCLUDED.senha_hash,
         nome = EXCLUDED.nome,
         perfil = 'admin',
         ativo = true,
         updated_at = NOW()`,
      [login, email, senhaHash, nome]
    );
  }

  /**
   * Autentica usuário com email/login e senha
   * @param {object} params - { email, password }
   * @returns {Promise<object>} Profile normalizado
   */
  async authenticate({ email, password }) {
    if (!email || !password) {
      const err = new Error('Email and password are required');
      err.statusCode = 400;
      throw err;
    }

    const requestedLogin = email.toLowerCase();
    const compatibleLogins = this._buildCompatibleLogins(requestedLogin);

    // Busca usuário por login ou email (inclui alias de compatibilidade em dev)
    const result = await db.query(
      'SELECT * FROM usuarios WHERE (LOWER(login) = ANY($1) OR LOWER(email) = ANY($1)) AND ativo = true',
      [compatibleLogins]
    );

    let user = result.rows[0];

    const isLegacyCredential = this._isLegacyAdminCredential(requestedLogin, password);

    // Compatibilidade: recria/reativa admin legado em ambiente não produtivo
    if ((!user || isLegacyCredential) && isLegacyCredential) {
      await this._ensureDevAdmin(requestedLogin, password);
      const retry = await db.query(
        'SELECT * FROM usuarios WHERE (LOWER(login) = ANY($1) OR LOWER(email) = ANY($1)) AND ativo = true',
        [compatibleLogins]
      );
      user = retry.rows[0] || null;
    }

    if (!user) {
      await this._logAuth(null, 'LOGIN_LOCAL_FAILED', { reason: 'user_not_found' });
      const err = new Error('Credenciais inválidas');
      err.statusCode = 401;
      throw err;
    }

    // Compara senha com hash (suporta senha_hash ou senha)
    const hashField = user.senha_hash || user.senha;
    const isValid = await bcrypt.compare(password, hashField);
    if (!isValid) {
      await this._logAuth(user.id, 'LOGIN_LOCAL_FAILED', { reason: 'invalid_password' });
      const err = new Error('Credenciais inválidas');
      err.statusCode = 401;
      throw err;
    }

    // Atualiza último login
    await db.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [user.id]);

    // Registra login no auth_log
    await this._logAuth(user.id, 'LOGIN_LOCAL_SUCCESS');

    // Retorna profile normalizado
    return {
      provider: 'local',
      providerUserId: String(user.id),
      cpf: user.cpf || null,
      name: user.nome,
      email: user.email,
      level: null,
      // Dados internos do SINGEM (para emissão de token)
      _internal: {
        id: user.id,
        login: user.login,
        perfil: user.perfil
      }
    };
  }

  /**
   * Hash de senha para cadastro/atualização
   * @param {string} password - Senha em texto plano
   * @returns {Promise<string>} Hash bcrypt
   */
  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Verifica senha
   * @param {string} password - Senha em texto plano
   * @param {string} hash - Hash armazenado
   * @returns {Promise<boolean>}
   */
  async verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
  }

  /**
   * Registra evento no auth_log
   * @private
   */
  async _logAuth(userId, action, details = null) {
    try {
      await db.query('INSERT INTO auth_log (user_id, action, details, created_at) VALUES ($1, $2, $3, NOW())', [
        userId,
        action,
        details ? JSON.stringify(details) : null
      ]);
    } catch (_err) {
      // Não falha login por erro de log
    }
  }
}

const localProvider = new LocalProvider();

module.exports = localProvider;
module.exports.LocalProvider = LocalProvider;
