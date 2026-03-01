const db = require('../../config/database');
const { config } = require('../../config');
const { ComprasGovClient } = require('../comprasgov/client');

const client = new ComprasGovClient();

const state = {
  running: false,
  currentJobId: null,
  startedAt: null,
  tipo: null
};

function getSyncConfig() {
  return {
    pageSize: Math.max(10, Math.min(Number(config.integracoes?.syncPageSize || 100), 500)),
    maxPages: Math.max(1, Math.min(Number(config.integracoes?.syncMaxPages || 20), 200))
  };
}

function mapCatmatItem(item = {}) {
  const codigo = String(
    item.codigo || item.codigoItem || item.codigoMaterial || item.codigoCatalogo || item.id || ''
  ).trim();

  return {
    codigo,
    descricao: String(item.descricao || item.nome || item.descricaoItem || 'SEM DESCRIÇÃO').slice(0, 4000),
    id_grupo: item.codigoGrupo || item.idGrupo || null,
    id_classe: item.codigoClasse || item.idClasse || null,
    id_pdm: item.codigoPdm || item.idPdm || null,
    status: item.status || item.situacao || 'ATIVO',
    unidade: item.unidade || item.unidadeFornecimento || 'UN',
    payload_raw: item
  };
}

function mapCatserItem(item = {}) {
  const codigo = String(item.codigo || item.codigoItem || item.codigoServico || item.id || '').trim();

  return {
    codigo,
    descricao: String(item.descricao || item.nome || item.descricaoItem || 'SEM DESCRIÇÃO').slice(0, 4000),
    id_grupo: item.codigoGrupo || item.idGrupo || null,
    id_classe: item.codigoClasse || item.idClasse || null,
    status: item.status || item.situacao || 'ATIVO',
    unidade: item.unidade || item.unidadeFornecimento || 'UN',
    payload_raw: item
  };
}

function mapUasgItem(item = {}) {
  const codigo = String(item.codigoUasg || item.codigo || item.id || '').trim();

  return {
    codigo_uasg: codigo,
    nome: String(item.nome || item.nomeUasg || item.descricao || '').slice(0, 4000),
    orgao: String(item.orgao || item.nomeOrgao || item.codigoOrgao || '').slice(0, 255),
    uf: String(item.uf || item.siglaUf || '').slice(0, 10),
    municipio: String(item.municipio || item.nomeMunicipio || '').slice(0, 120),
    status: String(item.status || item.situacao || 'ATIVO').slice(0, 30),
    payload_raw: item
  };
}

async function upsertCatmat(items) {
  let processed = 0;

  for (const item of items) {
    const mapped = mapCatmatItem(item);
    if (!mapped.codigo) {
      continue;
    }

    await db.query(
      `
      INSERT INTO catmat_cache (
        codigo, descricao, id_grupo, id_classe, id_pdm, status, unidade, payload_raw, fetched_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW(),NOW())
      ON CONFLICT (codigo) DO UPDATE SET
        descricao = EXCLUDED.descricao,
        id_grupo = EXCLUDED.id_grupo,
        id_classe = EXCLUDED.id_classe,
        id_pdm = EXCLUDED.id_pdm,
        status = EXCLUDED.status,
        unidade = EXCLUDED.unidade,
        payload_raw = EXCLUDED.payload_raw,
        fetched_at = NOW(),
        updated_at = NOW()
      `,
      [
        mapped.codigo,
        mapped.descricao,
        mapped.id_grupo,
        mapped.id_classe,
        mapped.id_pdm,
        mapped.status,
        mapped.unidade,
        JSON.stringify(mapped.payload_raw)
      ]
    );

    processed += 1;
  }

  return processed;
}

async function upsertCatser(items) {
  let processed = 0;

  for (const item of items) {
    const mapped = mapCatserItem(item);
    if (!mapped.codigo) {
      continue;
    }

    await db.query(
      `
      INSERT INTO catser_cache (
        codigo, descricao, id_grupo, id_classe, status, unidade, payload_raw, fetched_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW(),NOW())
      ON CONFLICT (codigo) DO UPDATE SET
        descricao = EXCLUDED.descricao,
        id_grupo = EXCLUDED.id_grupo,
        id_classe = EXCLUDED.id_classe,
        status = EXCLUDED.status,
        unidade = EXCLUDED.unidade,
        payload_raw = EXCLUDED.payload_raw,
        fetched_at = NOW(),
        updated_at = NOW()
      `,
      [
        mapped.codigo,
        mapped.descricao,
        mapped.id_grupo,
        mapped.id_classe,
        mapped.status,
        mapped.unidade,
        JSON.stringify(mapped.payload_raw)
      ]
    );

    processed += 1;
  }

  return processed;
}

async function upsertUasg(items) {
  let processed = 0;

  for (const item of items) {
    const mapped = mapUasgItem(item);
    if (!mapped.codigo_uasg) {
      continue;
    }

    await db.query(
      `
      INSERT INTO uasg_cache (
        codigo_uasg, nome, orgao, uf, municipio, status, payload_raw, fetched_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,NOW(),NOW())
      ON CONFLICT (codigo_uasg) DO UPDATE SET
        nome = EXCLUDED.nome,
        orgao = EXCLUDED.orgao,
        uf = EXCLUDED.uf,
        municipio = EXCLUDED.municipio,
        status = EXCLUDED.status,
        payload_raw = EXCLUDED.payload_raw,
        fetched_at = NOW(),
        updated_at = NOW()
      `,
      [
        mapped.codigo_uasg,
        mapped.nome,
        mapped.orgao,
        mapped.uf,
        mapped.municipio,
        mapped.status,
        JSON.stringify(mapped.payload_raw)
      ]
    );

    processed += 1;
  }

  return processed;
}

async function fetchDomain(domain, operation, requestId, routeInterna) {
  const cfg = getSyncConfig();

  return client.requestDomain({
    domain,
    operation,
    pagina: 1,
    tamanhoPagina: cfg.pageSize,
    params: {},
    requestId,
    user: null,
    routeInterna,
    buscarTodasPaginas: true,
    maxPaginas: cfg.maxPages
  });
}

async function createJob(tipo) {
  const result = await db.query(
    `INSERT INTO sync_jobs (tipo, status, inicio, registros_processados) VALUES ($1, 'running', NOW(), 0) RETURNING id`,
    [tipo]
  );

  return result.rows[0].id;
}

async function finishJob(id, status, registrosProcessados, erro, detalhes) {
  await db.query(
    `
    UPDATE sync_jobs
    SET status = $2,
        fim = NOW(),
        registros_processados = $3,
        erro = $4,
        detalhes = $5::jsonb
    WHERE id = $1
    `,
    [id, status, Number(registrosProcessados || 0), erro || null, JSON.stringify(detalhes || {})]
  );
}

async function runByType(tipo, requestId) {
  const normalizedType = String(tipo || 'all').toLowerCase();
  const accepted = ['catmat', 'catser', 'uasg', 'fornecedor', 'all'];

  if (!accepted.includes(normalizedType)) {
    const error = new Error(`Tipo de sync inválido: ${tipo}`);
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    throw error;
  }

  if (state.running) {
    const error = new Error('Já existe um sync em execução');
    error.statusCode = 409;
    error.code = 'SYNC_LOCKED';
    throw error;
  }

  state.running = true;
  state.startedAt = new Date().toISOString();
  state.tipo = normalizedType;

  const jobId = await createJob(normalizedType);
  state.currentJobId = jobId;

  let processed = 0;
  const details = {
    steps: []
  };

  try {
    const shouldRun = (name) => normalizedType === 'all' || normalizedType === name;

    if (shouldRun('catmat')) {
      const data = await fetchDomain('catalogoMaterial', 'itens', requestId, '/api/integracoes/sync/run');
      const count = await upsertCatmat(data.resultado || []);
      processed += count;
      details.steps.push({ tipo: 'catmat', total: count });
    }

    if (shouldRun('catser')) {
      const data = await fetchDomain('catalogoServico', 'itens', requestId, '/api/integracoes/sync/run');
      const count = await upsertCatser(data.resultado || []);
      processed += count;
      details.steps.push({ tipo: 'catser', total: count });
    }

    if (shouldRun('uasg')) {
      const data = await fetchDomain('uasgOrgao', 'consulta', requestId, '/api/integracoes/sync/run');
      const count = await upsertUasg(data.resultado || []);
      processed += count;
      details.steps.push({ tipo: 'uasg', total: count });
    }

    if (shouldRun('fornecedor')) {
      const data = await fetchDomain('fornecedor', 'consulta', requestId, '/api/integracoes/sync/run');
      const count = Array.isArray(data.resultado) ? data.resultado.length : 0;
      processed += count;
      details.steps.push({ tipo: 'fornecedor', total: count, observacao: 'Sem cache persistente dedicado nesta fase' });
    }

    await finishJob(jobId, 'completed', processed, null, details);

    return {
      jobId,
      tipo: normalizedType,
      status: 'completed',
      registrosProcessados: processed,
      detalhes: details
    };
  } catch (error) {
    await finishJob(jobId, 'failed', processed, error.message, {
      ...details,
      erro: {
        message: error.message,
        code: error.code || 'SYNC_ERROR'
      }
    });

    throw error;
  } finally {
    state.running = false;
    state.currentJobId = null;
    state.startedAt = null;
    state.tipo = null;
  }
}

async function getStatus() {
  const result = await db.query('SELECT * FROM sync_jobs ORDER BY created_at DESC LIMIT 20');

  return {
    running: state.running,
    currentJobId: state.currentJobId,
    startedAt: state.startedAt,
    tipo: state.tipo,
    jobs: result.rows
  };
}

module.exports = {
  runByType,
  getStatus
};
