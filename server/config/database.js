/**
 * Configuração do PostgreSQL - SINGEM
 * Pool de conexões + Migrations automáticas
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const { config } = require('./index');

// ============================================================================
// POOL DE CONEXÕES
// ============================================================================

const pool = new Pool({
  connectionString: config.db.connectionString,
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  max: config.db.max,
  idleTimeoutMillis: config.db.idleTimeoutMillis,
  connectionTimeoutMillis: config.db.connectionTimeoutMillis
});

// Teste de conexão
pool.on('connect', () => {
  console.log('[DB] 🔌 Nova conexão estabelecida');
});

pool.on('error', (err) => {
  console.error('[DB] ❌ Erro no pool:', err.message);
});

// ============================================================================
// MIGRATIONS - Executa arquivos SQL automaticamente
// ============================================================================

/**
 * Executa todas as migrations SQL em ordem numérica
 * Busca arquivos *.sql na pasta migrations/ e aplica os pendentes
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

    // Busca todos os arquivos .sql na pasta migrations
    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort(); // Ordem alfabética = ordem numérica (001, 002, 003...)

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const migrationId = file.replace('.sql', '');

      if (applied.has(migrationId)) {
        skippedCount++;
        continue;
      }

      console.log(`[DB] ▶️ Aplicando migration: ${migrationId}`);

      const sqlPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(sqlPath, 'utf8');

      await client.query('BEGIN');
      try {
        // Executa cada statement separadamente
        // Divide por ; mas ignora ; dentro de funções ($$...$$)
        const statements = splitSqlStatements(sql);

        for (const statement of statements) {
          if (statement.trim().length > 0) {
            await client.query(statement);
          }
        }

        await client.query('INSERT INTO _migrations (id) VALUES ($1)', [migrationId]);
        await client.query('COMMIT');
        console.log(`[DB] ✅ Migration ${migrationId} aplicada com sucesso`);
        appliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`[DB] ❌ Erro na migration ${migrationId}:`, err.message);
        throw err;
      }
    }

    if (appliedCount > 0) {
      console.log(`[DB] ✅ ${appliedCount} migration(s) aplicada(s)`);
    }
    if (skippedCount > 0) {
      console.log(`[DB] ✅ ${skippedCount} migration(s) já aplicada(s)`);
    }

    console.log('[DB] ✅ Migrations verificadas');
  } finally {
    client.release();
  }
}

/**
 * Divide SQL em statements, respeitando blocos de função ($$...$$)
 */
function splitSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inBlock = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    // Ignora linhas de comentário puro
    const trimmed = line.trim();
    if (trimmed.startsWith('--') && !inBlock) {
      continue;
    }

    current += line + '\n';

    // Detecta início/fim de bloco de função
    if (line.includes('$$')) {
      const count = (line.match(/\$\$/g) || []).length;
      if (count % 2 === 1) {
        inBlock = !inBlock;
      }
    }

    // Se não está em bloco e a linha termina com ;, encerra statement
    if (!inBlock && trimmed.endsWith(';')) {
      statements.push(current.trim());
      current = '';
    }
  }

  // Adiciona resto se houver
  if (current.trim().length > 0) {
    statements.push(current.trim());
  }

  return statements.filter((s) => s.length > 0 && !s.startsWith('--'));
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
  const hasConnectionString = Boolean(config.db.connectionString);
  const hasPasswordFallback = Boolean(config.db.password);

  if (!hasConnectionString && !hasPasswordFallback) {
    throw new Error('[DB] Configuração inválida: defina DATABASE_URL ou DB_PASSWORD no ambiente.');
  }

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
  if (config.env === 'development') {
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
