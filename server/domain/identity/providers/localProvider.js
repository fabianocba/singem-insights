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

const SALT_ROUNDS = 12;

class LocalProvider {
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

    // Busca usuário por login ou email
    const result = await db.query('SELECT * FROM usuarios WHERE (login = $1 OR email = $1) AND ativo = true', [
      email.toLowerCase()
    ]);

    const user = result.rows[0];
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
