const fs = require('fs').promises;
const os = require('os');

const db = require('../../db');
const { config } = require('../../config');
const aiCoreClient = require('../aiCoreClient');
const { readVersion } = require('../../utils/version');

const DEFAULT_TIMEOUTS = {
  databaseMs: Number(process.env.SYSTEM_STATUS_DB_TIMEOUT_MS || 2000),
  aiMs: Number(process.env.SYSTEM_STATUS_AI_TIMEOUT_MS || 2200),
  internetMs: Number(process.env.SYSTEM_STATUS_INTERNET_TIMEOUT_MS || 1800)
};

const INTERNET_PING_URL = process.env.SYSTEM_STATUS_PING_URL || 'https://clients3.google.com/generate_204';

function withTimeout(promiseFactory, timeoutMs, fallback) {
  let timer = null;

  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallback), timeoutMs);
  });

  return Promise.race([promiseFactory(), timeoutPromise]).finally(() => {
    if (timer) {
      clearTimeout(timer);
    }
  });
}

function normalizeMessage(error, fallback) {
  return error?.message || String(error || fallback);
}

function normalizeOptionalText(value) {
  if (value === undefined || value === null) {
    return '';
  }
  return String(value).trim();
}

function buildAiDetails(aiStatus = {}) {
  const version = normalizeOptionalText(aiStatus.version);
  const build = normalizeOptionalText(aiStatus.build);
  const commit = normalizeOptionalText(aiStatus.commit);
  const env = normalizeOptionalText(aiStatus.env);

  return {
    service: normalizeOptionalText(aiStatus.service),
    version,
    build,
    commit,
    env
  };
}

function buildAiMessage(aiStatus = {}) {
  const directMessage = normalizeOptionalText(aiStatus.message);
  if (directMessage) {
    return directMessage;
  }

  const details = buildAiDetails(aiStatus);
  const chunks = [];

  if (details.service) {
    chunks.push(details.service);
  }

  if (details.version) {
    chunks.push(`v${details.version}`);
  }

  if (details.build) {
    chunks.push(`build ${details.build}`);
  }

  if (details.commit) {
    chunks.push(`commit ${details.commit}`);
  }

  if (details.env) {
    chunks.push(`env ${details.env}`);
  }

  return chunks.length > 0 ? chunks.join(' • ') : 'AI Core online';
}

async function checkDatabase() {
  const timeoutMs = Number.isFinite(DEFAULT_TIMEOUTS.databaseMs) && DEFAULT_TIMEOUTS.databaseMs > 0 ? DEFAULT_TIMEOUTS.databaseMs : 2000;

  try {
    const result = await withTimeout(
      async () => {
        await db.query('SELECT 1 AS ok');
        return {
          name: 'database',
          status: 'OK',
          ok: true,
          message: 'PostgreSQL conectado e respondendo'
        };
      },
      timeoutMs,
      {
        name: 'database',
        status: 'DOWN',
        ok: false,
        message: `Timeout no healthcheck do PostgreSQL (${timeoutMs}ms)`
      }
    );

    return result;
  } catch (error) {
    return {
      name: 'database',
      status: 'DOWN',
      ok: false,
      message: normalizeMessage(error, 'Falha ao conectar no PostgreSQL')
    };
  }
}

async function checkAiCore({ requestId }) {
  const timeoutMs = Number.isFinite(DEFAULT_TIMEOUTS.aiMs) && DEFAULT_TIMEOUTS.aiMs > 0 ? DEFAULT_TIMEOUTS.aiMs : 2200;

  try {
    const aiStatus = await aiCoreClient.healthCheck({ requestId, timeoutMs });

    if (!aiStatus.enabled) {
      return {
        name: 'aiCore',
        status: 'DISABLED',
        ok: true,
        message: 'Módulo AI Core desabilitado por configuração',
        details: buildAiDetails(aiStatus)
      };
    }

    if (aiStatus.ok) {
      return {
        name: 'aiCore',
        status: 'OK',
        ok: true,
        message: buildAiMessage(aiStatus),
        details: buildAiDetails(aiStatus)
      };
    }

    return {
      name: 'aiCore',
      status: 'OFFLINE',
      ok: false,
      message: aiStatus.error || 'AI Core não respondeu corretamente',
      details: buildAiDetails(aiStatus)
    };
  } catch (error) {
    return {
      name: 'aiCore',
      status: config.ai.enabled ? 'OFFLINE' : 'DISABLED',
      ok: !config.ai.enabled,
      message: config.ai.enabled
        ? normalizeMessage(error, 'Falha na verificação do AI Core')
        : 'Módulo AI Core desabilitado por configuração',
      details: {
        service: 'SINGEM AI Core',
        version: '',
        build: '',
        commit: '',
        env: ''
      }
    };
  }
}

async function checkNfeService({ nfeService, nfeServiceV2 }) {
  if (!nfeService && !nfeServiceV2) {
    return {
      name: 'nfeService',
      status: 'DISABLED',
      ok: true,
      message: 'Serviço de NF-e não inicializado'
    };
  }

  try {
    const pathsToValidate = [];

    if (nfeService?.paths?.xml) {
      pathsToValidate.push(nfeService.paths.xml);
    }

    if (nfeService?.paths?.pdf) {
      pathsToValidate.push(nfeService.paths.pdf);
    }

    if (nfeServiceV2?.config?.storagePath) {
      pathsToValidate.push(nfeServiceV2.config.storagePath);
    }

    if (pathsToValidate.length > 0) {
      await Promise.all(pathsToValidate.map((candidatePath) => fs.access(candidatePath)));
    }

    if (nfeService && !nfeService.dfeClient) {
      return {
        name: 'nfeService',
        status: 'DEGRADED',
        ok: true,
        message: 'Serviço ativo com upload XML, mas consulta SEFAZ indisponível'
      };
    }

    return {
      name: 'nfeService',
      status: 'OK',
      ok: true,
      message: 'Serviço NF-e operacional'
    };
  } catch (error) {
    return {
      name: 'nfeService',
      status: 'DOWN',
      ok: false,
      message: normalizeMessage(error, 'Falha na infraestrutura do serviço NF-e')
    };
  }
}

async function checkInternet() {
  const timeoutMs = Number.isFinite(DEFAULT_TIMEOUTS.internetMs) && DEFAULT_TIMEOUTS.internetMs > 0 ? DEFAULT_TIMEOUTS.internetMs : 1800;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(INTERNET_PING_URL, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        Accept: '*/*'
      }
    });

    if (response.ok || (response.status >= 200 && response.status < 400)) {
      return {
        name: 'internet',
        status: 'OK',
        ok: true,
        message: 'Conectividade externa disponível'
      };
    }

    return {
      name: 'internet',
      status: 'DOWN',
      ok: false,
      message: `Teste externo retornou HTTP ${response.status}`
    };
  } catch (error) {
    const isTimeout = error?.name === 'AbortError';
    return {
      name: 'internet',
      status: 'DOWN',
      ok: false,
      message: isTimeout ? `Timeout de conectividade externa (${timeoutMs}ms)` : normalizeMessage(error, 'Sem conectividade externa')
    };
  } finally {
    clearTimeout(timer);
  }
}

function buildSystemInfo() {
  const memory = process.memoryUsage();

  return {
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rss: memory.rss,
      heapUsed: memory.heapUsed,
      heapTotal: memory.heapTotal
    },
    cpuLoad: typeof os.loadavg === 'function' ? os.loadavg() : [],
    hostname: os.hostname(),
    platform: os.platform(),
    nodeVersion: process.version
  };
}

function calculateOverallStatus(services) {
  const database = services.find((service) => service.name === 'database');

  if (!database || database.status === 'DOWN') {
    return 'CRITICAL';
  }

  const hasAuxiliaryIssues = services.some(
    (service) => service.name !== 'database' && ['OFFLINE', 'DOWN', 'DEGRADED'].includes(service.status)
  );

  return hasAuxiliaryIssues ? 'DEGRADED' : 'OK';
}

async function buildSystemStatus({ requestId, nfeService, nfeServiceV2 }) {
  const versionInfo = readVersion();

  const services = await Promise.all([
    checkDatabase(),
    checkAiCore({ requestId }),
    checkNfeService({ nfeService, nfeServiceV2 }),
    checkInternet()
  ]);

  return {
    status: calculateOverallStatus(services),
    name: versionInfo.name,
    version: versionInfo.version,
    channel: versionInfo.channel,
    build: versionInfo.build,
    buildTimestamp: versionInfo.buildTimestamp,
    services,
    system: buildSystemInfo(),
    timestamp: new Date().toISOString()
  };
}

async function getSystemStatus({ requestId, nfeService, nfeServiceV2 }) {
  try {
    return await buildSystemStatus({ requestId, nfeService, nfeServiceV2 });
  } catch (error) {
    const versionInfo = readVersion();

    return {
      status: 'CRITICAL',
      name: versionInfo.name,
      version: versionInfo.version,
      channel: versionInfo.channel,
      build: versionInfo.build,
      buildTimestamp: versionInfo.buildTimestamp,
      services: [
        {
          name: 'database',
          status: 'DOWN',
          ok: false,
          message: 'Erro estrutural no agregador de monitoramento'
        }
      ],
      system: buildSystemInfo(),
      timestamp: new Date().toISOString(),
      error: normalizeMessage(error, 'Falha interna no monitoramento')
    };
  }
}

module.exports = {
  getSystemStatus
};
