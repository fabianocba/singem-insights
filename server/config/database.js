/**
 * Compat layer de banco de dados.
 * Mantém API legada consumida no projeto, delegando para server/db.
 */

const fs = require('fs');
const path = require('path');
const db = require('../db');
const { config } = require('./index');

function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inBlock = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !inBlock) {
      continue;
    }

    current += `${line}\n`;

    if (line.includes('$$')) {
      const count = (line.match(/\$\$/g) || []).length;
      if (count % 2 === 1) {
        inBlock = !inBlock;
      }
    }

    if (!inBlock && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements.filter((statement) => statement.length > 0 && !statement.startsWith('--'));
}

async function runMigrations() {
  const client = await db.getClient();
  try {
    console.log('[DB] Verificando migrations...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const { rows } = await client.query('SELECT id FROM _migrations');
    const applied = new Set(rows.map((row) => row.id));

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const migrationId = file.replace('.sql', '');
      if (applied.has(migrationId)) {
        skippedCount++;
        continue;
      }

      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const statements = splitSqlStatements(sql);

      await client.query('BEGIN');
      try {
        for (const statement of statements) {
          await client.query(statement);
        }

        await client.query('INSERT INTO _migrations (id) VALUES ($1)', [migrationId]);
        await client.query('COMMIT');
        appliedCount++;
        console.log(`[DB] Migration aplicada: ${migrationId}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`[DB] Erro na migration ${migrationId}:`, error.message);
        throw error;
      }
    }

    if (appliedCount > 0) {
      console.log(`[DB] ${appliedCount} migration(s) aplicada(s)`);
    }
    if (skippedCount > 0) {
      console.log(`[DB] ${skippedCount} migration(s) já aplicada(s)`);
    }
  } finally {
    client.release();
  }
}

async function testConnection() {
  try {
    const result = await db.healthCheck();
    if (!result.ok) {
      console.error('[DB] Erro de conexão:', result.error || 'desconhecido');
      return false;
    }

    return true;
  } catch (error) {
    console.error('[DB] Erro de conexão:', error.message);
    return false;
  }
}

async function initDatabase() {
  const hasConnectionString = Boolean(process.env.DATABASE_URL || config.db.connectionString);
  const hasPassword = Boolean(process.env.PGPASSWORD || process.env.DB_PASSWORD || config.db.password);

  if (!hasConnectionString && !hasPassword) {
    throw new Error('[DB] Configuração inválida: defina DATABASE_URL ou credenciais PG/DB no ambiente.');
  }

  const connected = await testConnection();
  if (connected) {
    await runMigrations();
  }

  return connected;
}

async function query(text, params) {
  const start = Date.now();
  const result = await db.query(text, params);

  if (config.env === 'development') {
    const duration = Date.now() - start;
    console.log('[DB] Query executada', {
      text: String(text).substring(0, 50),
      duration,
      rows: result.rowCount
    });
  }

  return result;
}

async function findById(table, id) {
  const result = await query(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  return result.rows[0] || null;
}

async function findAll(table, conditions = {}, orderBy = 'id DESC') {
  let sql = `SELECT * FROM ${table}`;
  const params = [];

  const keys = Object.keys(conditions);
  if (keys.length > 0) {
    const where = keys.map((key, index) => `${key} = $${index + 1}`).join(' AND ');
    sql += ` WHERE ${where}`;
    params.push(...Object.values(conditions));
  }

  sql += ` ORDER BY ${orderBy}`;
  const result = await query(sql, params);
  return result.rows;
}

async function insert(table, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const placeholders = keys.map((_, index) => `$${index + 1}`).join(', ');

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
  const result = await query(sql, values);
  return result.rows[0];
}

async function update(table, id, data) {
  const keys = Object.keys(data);
  const values = Object.values(data);
  const sets = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

  const sql = `UPDATE ${table} SET ${sets}, updated_at = NOW() WHERE id = $${keys.length + 1} RETURNING *`;
  const result = await query(sql, [...values, id]);
  return result.rows[0];
}

async function remove(table, id) {
  const result = await query(`DELETE FROM ${table} WHERE id = $1 RETURNING *`, [id]);
  return result.rows[0];
}

module.exports = {
  pool: db.pool,
  query,
  getClient: db.getClient,
  healthCheck: db.healthCheck,
  close: db.close,
  findById,
  findAll,
  insert,
  update,
  remove,
  initDatabase,
  testConnection,
  runMigrations
};
