const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Preserva variaveis de ambiente do processo (ex: PM2, Docker, testes) antes de carregar .env.
const systemEnv = { ...process.env };

function restoreSystemEnv(overrides = {}) {
  Object.entries(overrides).forEach(([key, value]) => {
    process.env[key] = value;
  });
}

const baseEnvPath = path.join(__dirname, '../.env');
dotenv.config({ path: baseEnvPath });
restoreSystemEnv(systemEnv);

const runtimeEnv = process.env.NODE_ENV || 'development';
const envOverridePath = path.join(__dirname, `../.env.${runtimeEnv}`);

if (fs.existsSync(envOverridePath)) {
  dotenv.config({ path: envOverridePath, override: true });
  restoreSystemEnv(systemEnv);
}

const envPath = fs.existsSync(envOverridePath) ? envOverridePath : baseEnvPath;

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
    host: process.env.DB_HOST || 'postgres',
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
  comprasApi: {
    baseUrl: process.env.COMPRAS_API_BASE_URL || 'https://dadosabertos.compras.gov.br',
    timeoutMs: Number(process.env.COMPRAS_API_TIMEOUT_MS || 15000),
    maxRetries: Number(process.env.COMPRAS_API_MAX_RETRIES || 3),
    retryBaseDelayMs: Number(process.env.COMPRAS_API_RETRY_BASE_DELAY_MS || 500),
    rateLimitMs: Number(process.env.COMPRAS_API_RATE_LIMIT_MS || 250),
    apiToken: process.env.COMPRAS_API_TOKEN || process.env.COMPRASGOV_API_TOKEN || '',
    acceptHeader: process.env.COMPRAS_API_ACCEPT_HEADER || process.env.COMPRASGOV_ACCEPT_HEADER || '*/*'
  },
  comprasGov: {
    baseUrl:
      process.env.COMPRASGOV_BASE_URL || process.env.COMPRAS_API_BASE_URL || 'https://dadosabertos.compras.gov.br',
    timeoutMs: Number(process.env.COMPRASGOV_TIMEOUT_MS || process.env.COMPRAS_API_TIMEOUT_MS || 15000),
    maxRetries: Number(process.env.COMPRASGOV_MAX_RETRIES || process.env.COMPRAS_API_MAX_RETRIES || 3),
    retryBaseDelayMs: Number(
      process.env.COMPRASGOV_RETRY_BASE_DELAY_MS || process.env.COMPRAS_API_RETRY_BASE_DELAY_MS || 400
    ),
    rateLimitMs: Number(process.env.COMPRASGOV_RATE_LIMIT_MS || process.env.COMPRAS_API_RATE_LIMIT_MS || 250),
    cacheEnabled: parseBoolean(process.env.COMPRASGOV_CACHE_ENABLED, true),
    cacheTtlCatalogSeconds: Number(process.env.COMPRASGOV_CACHE_TTL_CATALOGO_SECONDS || 86400),
    cacheTtlPesquisaPrecoSeconds: Number(process.env.COMPRASGOV_CACHE_TTL_PESQUISA_SECONDS || 21600),
    cacheTtlFornecedorUasgSeconds: Number(process.env.COMPRASGOV_CACHE_TTL_FORNECEDOR_UASG_SECONDS || 43200),
    cacheTtlDefaultSeconds: Number(process.env.COMPRASGOV_CACHE_TTL_DEFAULT_SECONDS || 3600),
    maxPageSize: Number(process.env.COMPRASGOV_MAX_PAGE_SIZE || 500),
    maxAutoPages: Number(process.env.COMPRASGOV_MAX_AUTO_PAGES || 20),
    auditEnabled: parseBoolean(process.env.COMPRASGOV_AUDIT_ENABLED, true),
    snapshotEnabled: parseBoolean(process.env.COMPRASGOV_SNAPSHOT_ENABLED, true),
    apiToken: process.env.COMPRASGOV_API_TOKEN || process.env.COMPRAS_API_TOKEN || '',
    acceptHeader: process.env.COMPRASGOV_ACCEPT_HEADER || process.env.COMPRAS_API_ACCEPT_HEADER || '*/*',
    endpoints: {
      catalogoMaterial: {
        grupos: process.env.COMPRASGOV_ENDPOINT_CATALOGO_MATERIAL_GRUPOS || '/modulo-material/1_consultarGrupoMaterial',
        classes:
          process.env.COMPRASGOV_ENDPOINT_CATALOGO_MATERIAL_CLASSES || '/modulo-material/2_consultarClasseMaterial',
        pdm: process.env.COMPRASGOV_ENDPOINT_CATALOGO_MATERIAL_PDM || '/modulo-material/3_consultarPdmMaterial',
        itens: process.env.COMPRASGOV_ENDPOINT_CATALOGO_MATERIAL_ITENS || '/modulo-material/4_consultarItemMaterial',
        naturezaDespesa:
          process.env.COMPRASGOV_ENDPOINT_CATALOGO_MATERIAL_NATUREZA_DESPESA ||
          '/modulo-material/5_consultarMaterialNaturezaDespesa',
        unidadeFornecimento:
          process.env.COMPRASGOV_ENDPOINT_CATALOGO_MATERIAL_UNIDADE_FORNECIMENTO ||
          '/modulo-material/6_consultarMaterialUnidadeFornecimento',
        caracteristicas:
          process.env.COMPRASGOV_ENDPOINT_CATALOGO_MATERIAL_CARACTERISTICAS ||
          '/modulo-material/7_consultarMaterialCaracteristicas'
      },
      catalogoServico: {
        itens: process.env.COMPRASGOV_ENDPOINT_CATALOGO_SERVICO_ITENS || '/modulo-servico/6_consultarItemServico',
        grupos: process.env.COMPRASGOV_ENDPOINT_CATALOGO_SERVICO_GRUPOS || '/modulo-servico/3_consultarGrupoServico',
        classes: process.env.COMPRASGOV_ENDPOINT_CATALOGO_SERVICO_CLASSES || '/modulo-servico/4_consultarClasseServico'
      },
      pesquisaPreco: {
        material:
          process.env.COMPRASGOV_ENDPOINT_PESQUISA_PRECO_MATERIAL || '/modulo-pesquisa-preco/1_consultarMaterial',
        materialDetalhe:
          process.env.COMPRASGOV_ENDPOINT_PESQUISA_PRECO_MATERIAL_DETALHE ||
          '/modulo-pesquisa-preco/2_consultarMaterialDetalhe',
        servico: process.env.COMPRASGOV_ENDPOINT_PESQUISA_PRECO_SERVICO || '/modulo-pesquisa-preco/3_consultarServico',
        servicoDetalhe:
          process.env.COMPRASGOV_ENDPOINT_PESQUISA_PRECO_SERVICO_DETALHE ||
          '/modulo-pesquisa-preco/4_consultarServicoDetalhe'
      },
      uasgOrgao: {
        consulta: process.env.COMPRASGOV_ENDPOINT_UASG || '/modulo-uasg/1_consultarUasg',
        orgao: process.env.COMPRASGOV_ENDPOINT_ORGAO || '/modulo-uasg/2_consultarOrgao'
      },
      fornecedor: {
        consulta: process.env.COMPRASGOV_ENDPOINT_FORNECEDOR || '/modulo-fornecedor/1_consultarFornecedor'
      },
      contratacoes: {
        consulta:
          process.env.COMPRASGOV_ENDPOINT_CONTRATACOES || '/modulo-contratacoes/1_consultarContratacoes_PNCP_14133',
        itens:
          process.env.COMPRASGOV_ENDPOINT_CONTRATACOES_ITENS ||
          '/modulo-contratacoes/2_consultarItensContratacoes_PNCP_14133',
        resultadosItens:
          process.env.COMPRASGOV_ENDPOINT_CONTRATACOES_RESULTADOS_ITENS ||
          '/modulo-contratacoes/3_consultarResultadoItensContratacoes_PNCP_14133'
      },
      arp: {
        // BUGFIX: endpoint correto de CONSULTA da ARP (não o de itens)
        consulta: process.env.COMPRASGOV_ENDPOINT_ARP || '/modulo-arp/1_consultarARP',
        item: process.env.COMPRASGOV_ENDPOINT_ARP_ITEM || '/modulo-arp/2_consultarARPItem',
        consultaId: process.env.COMPRASGOV_ENDPOINT_ARP_ID || '/modulo-arp/1.1_consultarARP_Id',
        itemId: process.env.COMPRASGOV_ENDPOINT_ARP_ITEM_ID || '/modulo-arp/2.1_consultarARPItem_Id'
      },
      contratos: {
        consulta: process.env.COMPRASGOV_ENDPOINT_CONTRATOS || '/modulo-contratos/1_consultarContratos',
        item: process.env.COMPRASGOV_ENDPOINT_CONTRATOS_ITEM || '/modulo-contratos/2_consultarContratosItem'
      },
      legado: {
        licitacoes: process.env.COMPRASGOV_ENDPOINT_LEGADO_LICITACOES || '/modulo-legado/1_consultarLicitacao',
        itens: process.env.COMPRASGOV_ENDPOINT_LEGADO_ITENS || '/modulo-legado/2_consultarItemLicitacao'
      },
      ocds: {
        consulta: process.env.COMPRASGOV_ENDPOINT_OCDS || '/modulo-ocds/1_releases'
      }
    }
  },
  dadosGovCkan: {
    baseUrl: process.env.DADOSGOV_CKAN_BASE_URL || 'https://dados.gov.br/api/3/action',
    timeoutMs: Number(process.env.DADOSGOV_CKAN_TIMEOUT_MS || 12000),
    cacheEnabled: parseBoolean(process.env.DADOSGOV_CKAN_CACHE_ENABLED, true),
    cacheTtlSeconds: Number(process.env.DADOSGOV_CKAN_CACHE_TTL_SECONDS || 300),
    maxRetries: Number(process.env.DADOSGOV_CKAN_MAX_RETRIES || 3),
    retryBaseDelayMs: Number(process.env.DADOSGOV_CKAN_RETRY_BASE_DELAY_MS || 400),
    maxDownloadBytes: Number(process.env.DADOSGOV_CKAN_MAX_DOWNLOAD_BYTES || 20971520)
  },
  integracoes: {
    auditEnabled: parseBoolean(process.env.INTEGRACOES_AUDIT_ENABLED, true),
    cacheEnabled: parseBoolean(process.env.INTEGRACOES_CACHE_ENABLED, true),
    cacheTtlCatalogSeconds: Number(process.env.INTEGRACOES_CACHE_TTL_CATALOGO_SECONDS || 86400),
    cacheTtlPesquisaSeconds: Number(process.env.INTEGRACOES_CACHE_TTL_PESQUISA_SECONDS || 21600),
    cacheTtlFornecedorUasgSeconds: Number(process.env.INTEGRACOES_CACHE_TTL_FORNECEDOR_UASG_SECONDS || 43200),
    syncMaxPages: Number(process.env.INTEGRACOES_SYNC_MAX_PAGES || 20),
    syncPageSize: Number(process.env.INTEGRACOES_SYNC_PAGE_SIZE || 100)
  },
  ai: {
    enabled: parseBoolean(process.env.AI_CORE_ENABLED, (process.env.NODE_ENV || 'development') !== 'production'),
    baseUrl: process.env.AI_CORE_BASE_URL || 'http://ai-core:8010',
    apiPrefix: process.env.AI_CORE_API_PREFIX || '/ai',
    timeoutMs: Number(process.env.AI_CORE_TIMEOUT_MS || 15000),
    healthTimeoutMs: Number(process.env.AI_CORE_HEALTH_TIMEOUT_MS || 2500),
    internalToken: process.env.AI_CORE_INTERNAL_TOKEN || process.env.AI_INTERNAL_TOKEN || 'change-me',
    internalTokenHeader: process.env.AI_CORE_INTERNAL_TOKEN_HEADER || 'x-internal-token',
    autoReindexOnMutation: parseBoolean(process.env.AI_CORE_AUTO_REINDEX_ON_MUTATION, true),
    reindexDebounceMs: Number(process.env.AI_CORE_REINDEX_DEBOUNCE_MS || 1500)
  },
  priceIntelligence: {
    cacheTtlSeconds: Number(process.env.PRICE_INTELLIGENCE_CACHE_TTL_SECONDS || 1800),
    dbCacheEnabled: parseBoolean(process.env.PRICE_INTELLIGENCE_DB_CACHE_ENABLED, true),
    dbCacheTtlSeconds: Number(process.env.PRICE_INTELLIGENCE_DB_CACHE_TTL_SECONDS || 21600),
    maxCodesPerQuery: Number(process.env.PRICE_INTELLIGENCE_MAX_CODES || 10),
    upstreamPageSize: Number(process.env.PRICE_INTELLIGENCE_UPSTREAM_PAGE_SIZE || 100),
    maxAutoPages: Number(process.env.PRICE_INTELLIGENCE_MAX_AUTO_PAGES || 12),
    maxTotalItems: Number(process.env.PRICE_INTELLIGENCE_MAX_TOTAL_ITEMS || 5000),
    maxReturnedRawItems: Number(process.env.PRICE_INTELLIGENCE_MAX_RETURNED_RAW_ITEMS || 2000),
    maxExportItems: Number(process.env.PRICE_INTELLIGENCE_MAX_EXPORT_ITEMS || 10000),
    topLimit: Number(process.env.PRICE_INTELLIGENCE_TOP_LIMIT || 10)
  },
  priceSnapshot: {
    enabled: parseBoolean(process.env.PRICE_SNAPSHOT_ENABLED, true)
  },
  catmatCacheTtlHours: Number(process.env.CATMAT_CACHE_TTL_HOURS || 168),
  catmatObrigatorioNF: parseBoolean(process.env.CATMAT_OBRIGATORIO_NF, false),
  catmatObrigatorioEmpenho: parseBoolean(process.env.CATMAT_OBRIGATORIO_EMPENHO, false),
  catmatObrigatorioItens: parseBoolean(process.env.CATMAT_OBRIGATORIO_ITENS, false),
  govbr: {
    enabled: parseBoolean(process.env.GOVBR_ENABLED, false),
    clientId: process.env.GOVBR_CLIENT_ID || '',
    clientSecret: process.env.GOVBR_CLIENT_SECRET || '',
    redirectUri: process.env.GOVBR_REDIRECT_URI || '',
    issuer: process.env.GOVBR_ISSUER || 'https://sso.acesso.gov.br',
    autoCreateUser: parseBoolean(process.env.GOVBR_AUTO_CREATE_USER, false),
    scopes: process.env.GOVBR_SCOPES || 'openid email profile govbr_confiabilidades govbr_confiabilidades_idtoken'
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
    login: process.env.SINGEM_ADMIN_LOGIN || process.env.ADMIN_LOGIN || 'admin',
    email: process.env.SINGEM_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'admin@ifbaiano.edu.br',
    nome: process.env.SINGEM_ADMIN_NOME || process.env.ADMIN_NOME || 'Administrador SINGEM',
    password: process.env.SINGEM_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || ''
  },
  sefaz: {
    ambiente: process.env.SEFAZ_AMBIENTE || 'producao',
    certificadoPath: process.env.CERTIFICADO_PATH || null,
    certificadoSenha: process.env.CERTIFICADO_SENHA || null
  }
};

function getCorsOrigins() {
  if (config.env !== 'production') {
    const devDefaults = [
      'http://localhost:8000',
      'http://localhost:3000',
      'http://127.0.0.1:8000',
      'http://127.0.0.1:3000'
    ];

    const merged = [...config.corsOrigins, ...devDefaults];
    return [...new Set(merged)];
  }

  if (config.corsOrigins.length > 0) {
    return config.corsOrigins;
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

    if (config.ai.enabled) {
      if (!config.ai.baseUrl) {
        errors.push('Defina AI_CORE_BASE_URL quando o modulo de IA estiver habilitado');
      }

      if (!config.ai.internalToken || config.ai.internalToken === 'change-me') {
        errors.push('Defina AI_CORE_INTERNAL_TOKEN forte quando o modulo de IA estiver habilitado');
      }
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
