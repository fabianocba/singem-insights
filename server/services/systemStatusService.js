const fs = require('fs').promises;
const os = require('os');

const db = require('../db');
const aiCoreClient = require('./aiCoreClient');
const { readVersion } = require('../utils/version');

const TIMEOUTS = {
  databaseMs: Number(process.env.SYSTEM_STATUS_DATABASE_TIMEOUT_MS || 120),
  aiCoreMs: Number(process.env.SYSTEM_STATUS_AI_TIMEOUT_MS || 120),
  nfeMs: Number(process.env.SYSTEM_STATUS_NFE_TIMEOUT_MS || 120),
  internetMs: Number(process.env.SYSTEM_STATUS_INTERNET_TIMEOUT_MS || 120)
};

const EXTERNAL_PING_URL = process.env.SYSTEM_STATUS_EXTERNAL_URL || 'https://clients3.google.com/generate_204';

function toPositiveTimeout(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function isoSeconds(value) {
  const date = new Date(value || Date.now());
  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

async function withTimeout(taskFactory, timeoutMs, fallbackValue) {
  let timer = null;

  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });

  try {
    return await Promise.race([taskFactory(), timeoutPromise]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

function safeMessage(error, fallback) {
  return error?.message ? String(error.message) : fallback;
}

async function checkDatabase() {
  const timeoutMs = toPositiveTimeout(TIMEOUTS.databaseMs, 120);

  try {
    const result = await withTimeout(
      async () => {
        await db.query('SELECT 1');
        return {
          name: 'database',
          status: 'OK',
          ok: true,
          message: 'PostgreSQL connected'
        };
      },
      timeoutMs,
      {
        name: 'database',
        status: 'OFFLINE',
        ok: false,
        message: 'PostgreSQL timeout'
      }
    );

    return result;
  } catch (error) {
    return {
      name: 'database',
      status: 'OFFLINE',
      ok: false,
      message: safeMessage(error, 'PostgreSQL unavailable')
    };
  }
}

async function checkAICore({ requestId }) {
  const timeoutMs = toPositiveTimeout(TIMEOUTS.aiCoreMs, 120);

  try {
    const ai = await aiCoreClient.healthCheck({ requestId, timeoutMs });

    if (ai?.enabled && ai?.ok) {
      return {
        name: 'aiCore',
        status: 'OK',
        ok: true,
        message: 'AI Core available'
      };
    }

    if (!ai?.enabled) {
      return {
        name: 'aiCore',
        status: 'OFFLINE',
        ok: false,
        message: 'AI Core disabled by configuration'
      };
    }

    return {
      name: 'aiCore',
      status: 'OFFLINE',
      ok: false,
      message: 'AI Core unavailable'
    };
  } catch (error) {
    return {
      name: 'aiCore',
      status: 'OFFLINE',
      ok: false,
      message: safeMessage(error, 'AI Core unavailable')
    };
  }
}

async function checkNFEService({ nfeService, nfeServiceV2 }) {
  const timeoutMs = toPositiveTimeout(TIMEOUTS.nfeMs, 120);

  return withTimeout(
    async () => {
      if (!nfeService && !nfeServiceV2) {
        return {
          name: 'nfeService',
          status: 'OFFLINE',
          ok: false,
          message: 'NFE service unavailable'
        };
      }

      const paths = [];

      if (nfeService?.paths?.xml) {
        paths.push(nfeService.paths.xml);
      }
      if (nfeService?.paths?.pdf) {
        paths.push(nfeService.paths.pdf);
      }
      if (nfeServiceV2?.config?.storagePath) {
        paths.push(nfeServiceV2.config.storagePath);
      }

      if (paths.length > 0) {
        await Promise.all(paths.map((targetPath) => fs.access(targetPath)));
      }

      if (nfeService && !nfeService.dfeClient) {
        return {
          name: 'nfeService',
          status: 'DEGRADED',
          ok: true,
          message: 'XML upload available, SEFAZ query unavailable'
        };
      }

      return {
        name: 'nfeService',
        status: 'OK',
        ok: true,
        message: 'NFE service operational'
      };
    },
    timeoutMs,
    {
      name: 'nfeService',
      status: 'DEGRADED',
      ok: true,
      message: 'NFE health timeout'
    }
  ).catch((error) => ({
    name: 'nfeService',
    status: 'OFFLINE',
    ok: false,
    message: safeMessage(error, 'NFE service unavailable')
  }));
}

async function checkInternet() {
  const timeoutMs = toPositiveTimeout(TIMEOUTS.internetMs, 120);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(EXTERNAL_PING_URL, {
      method: 'GET',
      headers: { Accept: '*/*' },
      signal: controller.signal
    });

    if (response.ok || (response.status >= 200 && response.status < 400)) {
      return {
        name: 'internet',
        status: 'OK',
        ok: true,
        message: 'External connectivity OK'
      };
    }

    return {
      name: 'internet',
      status: 'OFFLINE',
      ok: false,
      message: 'External connectivity unavailable'
    };
  } catch (_error) {
    return {
      name: 'internet',
      status: 'OFFLINE',
      ok: false,
      message: 'External connectivity unavailable'
    };
  } finally {
    clearTimeout(timer);
  }
}

function resolveGlobalStatus(services) {
  const database = services.find((service) => service.name === 'database');
  if (!database || database.status === 'OFFLINE' || !database.ok) {
    return 'DOWN';
  }

  const hasNonOk = services.some((service) => service.status !== 'OK');
  return hasNonOk ? 'DEGRADED' : 'OK';
}

function buildSystemSnapshot() {
  const memoryUsage = process.memoryUsage();
  return {
    uptimeSeconds: Math.floor(process.uptime()),
    memory: {
      rss: memoryUsage.rss,
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal
    },
    cpuLoad: typeof os.loadavg === 'function' ? os.loadavg() : [],
    hostname: os.hostname(),
    platform: os.platform(),
    nodeVersion: process.version
  };
}

function buildDownPayload(versionInfo, serviceMessage = 'PostgreSQL unavailable') {
  return {
    status: 'DOWN',
    name: versionInfo?.name || 'SINGEM',
    version: versionInfo?.version || '1.2.2',
    channel: versionInfo?.channel || 'main',
    build: versionInfo?.build || 'local',
    buildTimestamp: isoSeconds(versionInfo?.buildTimestamp),
    services: [
      {
        name: 'database',
        status: 'OFFLINE',
        ok: false,
        message: serviceMessage
      }
    ],
    system: buildSystemSnapshot(),
    timestamp: isoSeconds()
  };
}

async function getSystemStatus({ requestId, nfeService, nfeServiceV2 }) {
  const info = readVersion();

  const services = await Promise.all([
    checkDatabase(),
    checkAICore({ requestId }),
    checkNFEService({ nfeService, nfeServiceV2 }),
    checkInternet()
  ]);

  return {
    status: resolveGlobalStatus(services),
    name: info.name || 'SINGEM',
    version: info.version || '1.2.2',
    channel: info.channel || 'main',
    build: info.build || 'local',
    buildTimestamp: isoSeconds(info.buildTimestamp),
    services,
    system: buildSystemSnapshot(),
    timestamp: isoSeconds()
  };
}

module.exports = {
  checkDatabase,
  checkAICore,
  checkNFEService,
  checkInternet,
  getSystemStatus,
  buildDownPayload
};
