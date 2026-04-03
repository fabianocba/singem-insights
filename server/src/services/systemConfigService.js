const db = require('../../db');

async function upsertSystemConfig({
  chave,
  valor,
  descricao = null,
  categoria = 'geral',
  atualizadoPor = null,
  modoRegistro = 'real'
}) {
  const sql = `
    INSERT INTO configuracoes_sistema (
      chave,
      valor,
      descricao,
      categoria,
      atualizado_por,
      modo_registro,
      atualizado_em
    )
    VALUES ($1, $2, $3, $4, $5, $6, NOW())
    ON CONFLICT (chave)
    DO UPDATE SET
      valor = EXCLUDED.valor,
      descricao = EXCLUDED.descricao,
      categoria = EXCLUDED.categoria,
      atualizado_por = EXCLUDED.atualizado_por,
      modo_registro = EXCLUDED.modo_registro,
      atualizado_em = NOW()
    RETURNING *
  `;

  const params = [chave, valor, descricao, categoria, atualizadoPor, modoRegistro];
  const result = await db.query(sql, params);
  return result.rows[0];
}

async function getSystemConfig(chave, fallbackValue = null) {
  const result = await db.query('SELECT * FROM configuracoes_sistema WHERE chave = $1', [chave]);
  if (result.rows.length === 0) {
    return fallbackValue;
  }
  return result.rows[0].valor;
}

async function listSystemConfigs(categoria = null) {
  if (!categoria) {
    const result = await db.query('SELECT * FROM configuracoes_sistema ORDER BY categoria, chave');
    return result.rows;
  }

  const result = await db.query('SELECT * FROM configuracoes_sistema WHERE categoria = $1 ORDER BY chave', [categoria]);
  return result.rows;
}

module.exports = {
  upsertSystemConfig,
  getSystemConfig,
  listSystemConfigs
};
