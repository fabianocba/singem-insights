const db = require('../../db');

function runQuery(client, text, params) {
  if (client) {
    return client.query(text, params);
  }

  return db.query(text, params);
}

async function withTransaction(callback) {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function findUserByEmailOrLogin(emailOrLogin) {
  const result = await db.query('SELECT id FROM usuarios WHERE LOWER(email) = $1 OR LOWER(login) = $1 LIMIT 1', [
    String(emailOrLogin || '').toLowerCase()
  ]);

  return result.rows[0] || null;
}

async function findActiveUserByEmail(email) {
  const result = await db.query(
    `
      SELECT id, nome, email
      FROM usuarios
      WHERE LOWER(email) = $1
        AND ativo = true
        AND COALESCE(is_active, false) = true
      LIMIT 1
    `,
    [String(email || '').toLowerCase()]
  );

  return result.rows[0] || null;
}

async function createUser(data) {
  return db.insert('usuarios', data);
}

async function findUserById(id) {
  return db.findById('usuarios', id);
}

async function updateUserPasswordHash(userId, senhaHash, client) {
  await runQuery(client, 'UPDATE usuarios SET senha_hash = $1, updated_at = NOW() WHERE id = $2', [senhaHash, userId]);
}

async function activateUser(userId, client) {
  await runQuery(client, 'UPDATE usuarios SET ativo = true, is_active = true, updated_at = NOW() WHERE id = $1', [
    userId
  ]);
}

async function saveAuthToken(userId, type, tokenHash, expiresAt, client) {
  await runQuery(client, 'DELETE FROM auth_tokens WHERE user_id = $1 AND type = $2 AND used_at IS NULL', [
    userId,
    type
  ]);

  await runQuery(client, 'INSERT INTO auth_tokens (user_id, token_hash, type, expires_at) VALUES ($1, $2, $3, $4)', [
    userId,
    tokenHash,
    type,
    expiresAt
  ]);
}

async function findConsumableAuthToken(tokenHash, type, client) {
  const result = await runQuery(
    client,
    `
      SELECT id, user_id
      FROM auth_tokens
      WHERE token_hash = $1
        AND type = $2
        AND used_at IS NULL
        AND expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash, type]
  );

  return result.rows[0] || null;
}

async function markAuthTokenUsed(tokenId, client) {
  await runQuery(client, 'UPDATE auth_tokens SET used_at = NOW() WHERE id = $1', [tokenId]);
}

async function markAuthTokensByUserTypeUsed(userId, type, client) {
  await runQuery(
    client,
    'UPDATE auth_tokens SET used_at = NOW() WHERE user_id = $1 AND type = $2 AND used_at IS NULL',
    [userId, type]
  );
}

async function deleteRefreshTokensByUser(userId, client) {
  await runQuery(client, 'DELETE FROM refresh_tokens WHERE usuario_id = $1', [userId]);
}

module.exports = {
  withTransaction,
  findUserByEmailOrLogin,
  findActiveUserByEmail,
  createUser,
  findUserById,
  updateUserPasswordHash,
  activateUser,
  saveAuthToken,
  findConsumableAuthToken,
  markAuthTokenUsed,
  markAuthTokensByUserTypeUsed,
  deleteRefreshTokensByUser
};
