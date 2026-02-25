const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '../.env');
dotenv.config({ path: envPath });

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  return String(value).toLowerCase() === 'true';
}

function parseOrigins(originsValue) {
  return String(originsValue || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const config = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3000),
  apiBodyLimit: process.env.API_BODY_LIMIT || '10mb',
  trustProxy: parseBoolean(process.env.TRUST_PROXY, false),
  corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
  db: {
    connectionString: process.env.DATABASE_URL || '',
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 5432),
    name: process.env.DB_NAME || 'singem',
    user: process.env.DB_USER || 'singem_user',
    password: process.env.DB_PASSWORD || '',
    max: Number(process.env.DB_POOL_MAX || 20),
    idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
    connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 2000)
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  },
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 587),
    secure: parseBoolean(process.env.SMTP_SECURE, false),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || ''
  },
  appUrl: process.env.APP_URL || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8000',
  catmatImportPath: process.env.CATMAT_IMPORT_PATH || '',
  catmatObrigatorio: parseBoolean(process.env.CATMAT_OBRIGATORIO, false),
  govbr: {
    enabled: parseBoolean(process.env.GOVBR_ENABLED, false),
    clientId: process.env.GOVBR_CLIENT_ID || '',
    clientSecret: process.env.GOVBR_CLIENT_SECRET || '',
    redirectUri: process.env.GOVBR_REDIRECT_URI || '',
    issuer: process.env.GOVBR_ISSUER || 'https://sso.acesso.gov.br'
  },
  serproid: {
    enabled: parseBoolean(process.env.SERPROID_ENABLED, false),
    autoCreateUser: parseBoolean(process.env.SERPROID_AUTO_CREATE_USER, false),
    clientId: process.env.SERPROID_CLIENT_ID || '',
    clientSecret: process.env.SERPROID_CLIENT_SECRET || '',
    redirectUri: process.env.SERPROID_REDIRECT_URI || '',
    baseUrl: process.env.SERPROID_BASE_URL || 'https://hom.serproid.serpro.gov.br'
  },
  serpro: {
    baseUrl: process.env.SERPRO_BASE_URL || 'https://gateway.apiserpro.serpro.gov.br',
    apiKey: process.env.SERPRO_API_KEY || '',
    consumerSecret: process.env.SERPRO_CONSUMER_SECRET || ''
  },
  admin: {
    login: process.env.ADMIN_LOGIN || 'admin',
    email: process.env.ADMIN_EMAIL || 'admin@ifbaiano.edu.br',
    nome: process.env.ADMIN_NOME || 'Administrador SINGEM',
    password: process.env.ADMIN_PASSWORD || ''
  },
  sefaz: {
    ambiente: process.env.SEFAZ_AMBIENTE || 'producao',
    certificadoPath: process.env.CERTIFICADO_PATH || null,
    certificadoSenha: process.env.CERTIFICADO_SENHA || null
  }
};

function getCorsOrigins() {
  if (config.corsOrigins.length > 0) {
    return config.corsOrigins;
  }

  if (config.env !== 'production') {
    return ['http://localhost:8000', 'http://localhost:3000'];
  }

  return [];
}

function validateRuntimeConfig() {
  const errors = [];

  if (config.env === 'production') {
    if (!config.jwt.secret || config.jwt.secret.length < 32 || config.jwt.secret.includes('coloque_uma_chave')) {
      errors.push('JWT_SECRET inválido para produção (mínimo 32 caracteres fortes)');
    }

    if (!config.db.connectionString && !config.db.password) {
      errors.push('Defina DATABASE_URL ou DB_PASSWORD para conexão segura com PostgreSQL');
    }

    if (getCorsOrigins().length === 0) {
      errors.push('Defina CORS_ORIGINS para produção (origens permitidas separadas por vírgula)');
    }
  }

  if (errors.length > 0) {
    throw new Error(`[Config] Ambiente inválido: ${errors.join('; ')}`);
  }
}

module.exports = {
  config,
  envPath,
  parseBoolean,
  parseOrigins,
  getCorsOrigins,
  validateRuntimeConfig
};
