#!/usr/bin/env node
/**
 * Script de Sync CATMAT Oficial - SINGEM
 *
 * Fonte EXCLUSIVA:
 *   http://compras.dados.gov.br/materiais/v1/materiais.{formato}
 *
 * Uso:
 *   node scripts/import-catmat.js --offset=0 --limit=200 --max-pages=10
 *   node scripts/import-catmat.js --resume --max-pages=50
 */

const db = require('../config/database');
const catmatService = require('../integrations/catmat/catmatService');

function parseArgs(argv) {
  const args = {};
  for (const item of argv.slice(2)) {
    if (!item.startsWith('--')) {
      continue;
    }
    const [key, value] = item.slice(2).split('=');
    args[key] = value === undefined ? true : value;
  }
  return args;
}

async function getCursor() {
  const result = await db.query('SELECT * FROM catmat_sync_cursor WHERE nome = $1 LIMIT 1', ['default']);
  if (result.rows[0]) {
    return result.rows[0];
  }

  await db.query(
    'INSERT INTO catmat_sync_cursor (nome, ultimo_offset, ultimo_sync_em, updated_at) VALUES ($1,$2,NULL,NOW())',
    ['default', 0]
  );
  return { nome: 'default', ultimo_offset: 0, ultimo_sync_em: null };
}

async function updateCursor(offset) {
  await db.query(
    `
    UPDATE catmat_sync_cursor
    SET ultimo_offset = $1,
        ultimo_sync_em = NOW(),
        updated_at = NOW()
    WHERE nome = 'default'
  `,
    [offset]
  );
}

async function createImportLog(offsetInicio, limiteLote) {
  const result = await db.query(
    `
    INSERT INTO catmat_import_log (
      arquivo_fonte, total_linhas, importados, atualizados, erros, erros_detalhes,
      duracao_ms, status, origem, offset_inicio, offset_fim, limite_lote
    ) VALUES ($1, 0, 0, 0, 0, '[]'::jsonb, 0, 'executando', 'api_oficial', $2, $2, $3)
    RETURNING id
  `,
    ['api_oficial_compras', offsetInicio, limiteLote]
  );
  return result.rows[0].id;
}

async function finalizeImportLog(logId, stats) {
  await db.query(
    `
    UPDATE catmat_import_log
    SET total_linhas = $2,
        importados = $3,
        atualizados = $4,
        erros = $5,
        erros_detalhes = $6::jsonb,
        duracao_ms = $7,
        status = $8,
        erro_mensagem = $9,
        offset_fim = $10,
        observacao = $11,
        finished_at = NOW()
    WHERE id = $1
  `,
    [
      logId,
      stats.total,
      stats.importados,
      stats.atualizados,
      stats.erros,
      JSON.stringify(stats.errosDetalhes.slice(0, 100)),
      stats.duracaoMs,
      stats.status,
      stats.erroMensagem,
      stats.offsetFim,
      stats.observacao || null
    ]
  );
}

async function run() {
  const args = parseArgs(process.argv);
  const limit = Math.max(1, Math.min(Number(args.limit || 200), 500));
  const maxPages = Math.max(1, Number(args['max-pages'] || 10));
  const termo = String(args.termo || '').trim();
  const useResume = Boolean(args.resume);

  const cursor = await getCursor();
  let currentOffset = useResume ? Number(cursor.ultimo_offset || 0) : Math.max(0, Number(args.offset || 0));
  const initialOffset = currentOffset;

  const stats = {
    total: 0,
    importados: 0,
    atualizados: 0,
    erros: 0,
    errosDetalhes: [],
    status: 'concluido',
    erroMensagem: null,
    duracaoMs: 0,
    offsetFim: currentOffset,
    observacao: null
  };

  const start = Date.now();
  const logId = await createImportLog(initialOffset, limit);

  console.log('╔═════════════════════════════════════════════════════╗');
  console.log('║        🔄 SYNC CATMAT API OFICIAL (VPS)            ║');
  console.log('╚═════════════════════════════════════════════════════╝');
  console.log(`Offset inicial: ${initialOffset}`);
  console.log(`Limite por lote: ${limit}`);
  console.log(`Máx. páginas: ${maxPages}`);
  console.log(`Modo resume: ${useResume ? 'SIM' : 'NÃO'}`);
  if (termo) {
    console.log(`Filtro termo: ${termo}`);
  }

  try {
    for (let page = 1; page <= maxPages; page++) {
      const lote = await catmatService.runSyncBatch({
        offset: currentOffset,
        limite: limit,
        termo
      });

      stats.total += lote.imported;
      stats.importados += lote.imported;
      stats.offsetFim = lote.nextOffset;

      console.log(
        `[${page}/${maxPages}] offset=${currentOffset} importados=${lote.imported} totalParcial=${stats.importados}`
      );

      currentOffset = lote.nextOffset;
      await updateCursor(currentOffset);

      if (!lote.hasMore) {
        stats.observacao = 'Fim da paginação detectado pela API.';
        break;
      }
    }
  } catch (err) {
    stats.status = 'erro';
    stats.erros += 1;
    stats.erroMensagem = err.message;
    stats.errosDetalhes.push({ erro: err.message });
    throw err;
  } finally {
    stats.duracaoMs = Date.now() - start;
    await finalizeImportLog(logId, stats).catch((logErr) => {
      console.error('[CATMAT] Falha ao finalizar log:', logErr.message);
    });
    await db.pool.end();
  }

  console.log('');
  console.log('✅ Sync CATMAT concluído com sucesso');
  console.log(`Total importado: ${stats.importados}`);
  console.log(`Offset final: ${stats.offsetFim}`);
  console.log(`Duração: ${stats.duracaoMs} ms`);
}

run().catch((err) => {
  console.error('❌ Erro no sync CATMAT:', err.message);
  process.exit(1);
});
