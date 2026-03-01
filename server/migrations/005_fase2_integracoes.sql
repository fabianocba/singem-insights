-- ============================================================================
-- SINGEM - Migration 005: Fase 2 Integrações ComprasGov + DadosGov
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_api_calls (
    id BIGSERIAL PRIMARY KEY,
    request_id VARCHAR(100),
    usuario VARCHAR(255),
    rota_interna VARCHAR(255) NOT NULL,
    endpoint_externo TEXT NOT NULL,
    metodo VARCHAR(10) NOT NULL DEFAULT 'GET',
    query_params JSONB,
    status_http INTEGER,
    duracao_ms INTEGER,
    cache_hit BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_api_calls_created_at ON audit_api_calls(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_api_calls_endpoint ON audit_api_calls(endpoint_externo);
CREATE INDEX IF NOT EXISTS idx_audit_api_calls_status ON audit_api_calls(status_http);

CREATE TABLE IF NOT EXISTS sync_jobs (
    id BIGSERIAL PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'running',
    inicio TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fim TIMESTAMP,
    registros_processados INTEGER NOT NULL DEFAULT 0,
    erro TEXT,
    detalhes JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_tipo ON sync_jobs(tipo);

CREATE TABLE IF NOT EXISTS catser_cache (
    codigo VARCHAR(50) PRIMARY KEY,
    descricao TEXT NOT NULL,
    id_grupo VARCHAR(50),
    id_classe VARCHAR(50),
    status VARCHAR(30) DEFAULT 'ATIVO',
    unidade VARCHAR(20) DEFAULT 'UN',
    payload_raw JSONB,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catser_cache_updated_at ON catser_cache(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_catser_cache_status ON catser_cache(status);

CREATE TABLE IF NOT EXISTS uasg_cache (
    codigo_uasg VARCHAR(30) PRIMARY KEY,
    nome TEXT,
    orgao VARCHAR(255),
    uf VARCHAR(10),
    municipio VARCHAR(120),
    status VARCHAR(30) DEFAULT 'ATIVO',
    payload_raw JSONB,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_uasg_cache_updated_at ON uasg_cache(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_uasg_cache_uf ON uasg_cache(uf);

CREATE TABLE IF NOT EXISTS price_snapshot (
    id BIGSERIAL PRIMARY KEY,
    codigo_item_catalogo VARCHAR(80),
    filtros_usados JSONB,
    data_hora_consulta TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_resultados INTEGER NOT NULL DEFAULT 0,
    menor_preco NUMERIC(18,4),
    maior_preco NUMERIC(18,4),
    media NUMERIC(18,4),
    mediana NUMERIC(18,4),
    request_id VARCHAR(100),
    resultado_bruto JSONB
);

CREATE INDEX IF NOT EXISTS idx_price_snapshot_data ON price_snapshot(data_hora_consulta DESC);
CREATE INDEX IF NOT EXISTS idx_price_snapshot_codigo_item ON price_snapshot(codigo_item_catalogo);
CREATE INDEX IF NOT EXISTS idx_price_snapshot_request_id ON price_snapshot(request_id);
