/**
 * Configuração do PostgreSQL - SINGEM
 * Pool de conexões + Migrations automáticas
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Carrega variáveis de ambiente
require('dotenv').config();

// ============================================================================
// POOL DE CONEXÕES
// ============================================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Fallback para variáveis individuais
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'singem',
  user: process.env.DB_USER || 'singem_user',
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Teste de conexão
pool.on('connect', () => {
  console.log('[DB] 🔌 Nova conexão estabelecida');
});

pool.on('error', (err) => {
  console.error('[DB] ❌ Erro no pool:', err.message);
});

// ============================================================================
// MIGRATIONS - Executa arquivo SQL
// ============================================================================

/**
 * Executa migrations do arquivo SQL
 */
async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('[DB] 🔄 Verificando migrations...');

    // Garante que a tabela de migrations existe
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Busca migrations já aplicadas
    const { rows } = await client.query('SELECT id FROM _migrations');
    const applied = new Set(rows.map((r) => r.id));

    // Migration principal: schema completo
    const migrationId = '001_schema_completo';

    if (!applied.has(migrationId)) {
      console.log(`[DB] ▶️ Aplicando migration: ${migrationId}`);

      const sqlPath = path.join(__dirname, '../migrations/001_schema_completo.sql');

      if (!fs.existsSync(sqlPath)) {
        console.error(`[DB] ❌ Arquivo de migration não encontrado: ${sqlPath}`);
        throw new Error('Arquivo de migration não encontrado');
      }

      const sql = fs.readFileSync(sqlPath, 'utf8');

      await client.query('BEGIN');
      try {
        // Executa cada statement separadamente
        const statements = sql
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s.length > 0 && !s.startsWith('--'));

        for (const statement of statements) {
          if (statement.length > 0) {
            await client.query(statement);
          }
        }

        await client.query('INSERT INTO _migrations (id) VALUES ($1)', [migrationId]);
        await client.query('COMMIT');
        console.log(`[DB] ✅ Migration ${migrationId} aplicada com sucesso`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[DB] ❌ Erro na migration ${migrationId}:`, err.message);
        throw err;
      }
    } else {
      console.log(`[DB] ✅ Migration ${migrationId} já aplicada`);
    }

    console.log('[DB] ✅ Migrations verificadas');
  } finally {
    client.release();
  }
}

/**
 * Testa conexão com o banco
 */
async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now');
    client.release();
    console.log('[DB] ✅ Conexão PostgreSQL OK:', result.rows[0].now);
    return true;
  } catch (err) {
    console.error('[DB] ❌ Erro de conexão:', err.message);
    return false;
  }
}

/**
 * Inicializa o banco de dados
 */
async function initDatabase() {
  const connected = await testConnection();
  if (connected) {
    await runMigrations();
  }
  return connected;
}

// ============================================================================
// HELPERS DE QUERY
// ============================================================================

/**
 * Executa query com parâmetros
 */
async function query(text, params) {
  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV === 'development') {
    console.log('[DB] Query executada', { text: text.substring(0, 50), duration, rows: result.rowCount });
  }
  return result;
}

/**
 * Busca um registro por ID
 */
async function findById(table, id) {
  const result = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

/**
 * Busca todos os registros
 */
async function findAll(table, conditions = {}, orderBy = 'id DESC') {
  let sql = `SELECT * FROM ${table}`;
  const params = [];

  const keys = Object.keys(conditions);
  if (keys.length > 0) {
    const where = keys.map((k, i) => `${k} = $${i + 1}`).join(' AND ');
    sql += ` WHERE ${where}`;
    params.push(...Object.values(conditions));
  }

  sql += ` ORDER BY ${orderBy}`;
  const result = await query(sql, params);
  return result.rows;
}

/**
 * Insere um registro
 */
async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await query(sql, values);
  return result.rows[0];
}

/**
 * Atualiza um registro
 */
async function update(table, id, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');

  const sql = `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`;
  const result = await query(sql, [...values, id]);
  return result.rows[0];
}

/**
 * Remove um registro
 */
async function remove(table, id) {
  const result = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0];
}

module.exports = {
  pool,
  query,
  findById,
  findAll,
  insert,
  update,
  remove,
  initDatabase,
  testConnection,
  runMigrations
};
