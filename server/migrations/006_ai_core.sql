-- ============================================================================
-- SINGEM - Migration 006: AI Core
-- Schema para indice, feedback, matching e cache de relatorios do modulo IA
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS ai_documents (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(200) NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    content_normalized TEXT NOT NULL,
    source_module VARCHAR(120),
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding VECTOR(384),
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    search_tsv tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('portuguese', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('portuguese', COALESCE(content_normalized, '')), 'B')
    ) STORED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_documents_entity UNIQUE (entity_type, entity_id),
    CONSTRAINT ai_documents_status_check CHECK (status IN ('active', 'inactive', 'archived'))
);

CREATE INDEX IF NOT EXISTS idx_ai_documents_entity_type ON ai_documents(entity_type);
CREATE INDEX IF NOT EXISTS idx_ai_documents_status ON ai_documents(status);
CREATE INDEX IF NOT EXISTS idx_ai_documents_source_module ON ai_documents(source_module);
CREATE INDEX IF NOT EXISTS idx_ai_documents_updated_at ON ai_documents(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_documents_search_tsv ON ai_documents USING gin(search_tsv);
CREATE INDEX IF NOT EXISTS idx_ai_documents_title_trgm ON ai_documents USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ai_documents_content_norm_trgm ON ai_documents USING gin(content_normalized gin_trgm_ops);

CREATE TABLE IF NOT EXISTS ai_aliases (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(80) NOT NULL,
    entity_id VARCHAR(200) NOT NULL,
    alias_text TEXT NOT NULL,
    alias_normalized TEXT NOT NULL,
    weight NUMERIC(6,4) NOT NULL DEFAULT 0.5000,
    metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_aliases_entity UNIQUE (entity_type, entity_id, alias_normalized),
    CONSTRAINT ai_aliases_weight_check CHECK (weight >= 0 AND weight <= 1)
);

CREATE INDEX IF NOT EXISTS idx_ai_aliases_alias_norm_trgm ON ai_aliases USING gin(alias_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ai_aliases_entity_type ON ai_aliases(entity_type);

CREATE TABLE IF NOT EXISTS ai_entity_matches (
    id BIGSERIAL PRIMARY KEY,
    source_entity_type VARCHAR(80) NOT NULL,
    source_entity_id VARCHAR(200),
    target_entity_type VARCHAR(80) NOT NULL,
    target_entity_id VARCHAR(200) NOT NULL,
    match_type VARCHAR(40) NOT NULL DEFAULT 'semantic',
    confidence NUMERIC(6,4) NOT NULL DEFAULT 0,
    reasons_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    status VARCHAR(30) NOT NULL DEFAULT 'revisar',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_entity_matches_status_check CHECK (
        status IN ('fraco', 'revisar', 'provavel', 'forte', 'confirmado', 'aprovado', 'approved', 'descartado')
    )
);

CREATE INDEX IF NOT EXISTS idx_ai_entity_matches_source ON ai_entity_matches(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_entity_matches_target ON ai_entity_matches(target_entity_type, target_entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_entity_matches_status ON ai_entity_matches(status);
CREATE INDEX IF NOT EXISTS idx_ai_entity_matches_created_at ON ai_entity_matches(created_at DESC);

CREATE TABLE IF NOT EXISTS ai_feedback (
    id BIGSERIAL PRIMARY KEY,
    feature_name VARCHAR(120) NOT NULL,
    query_text TEXT NOT NULL,
    suggested_entity_type VARCHAR(80) NOT NULL,
    suggested_entity_id VARCHAR(200) NOT NULL,
    accepted BOOLEAN NOT NULL,
    user_id VARCHAR(120),
    context_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_feedback_feature_name ON ai_feedback(feature_name);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_entity ON ai_feedback(suggested_entity_type, suggested_entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_user_id ON ai_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);

CREATE TABLE IF NOT EXISTS ai_report_cache (
    id BIGSERIAL PRIMARY KEY,
    report_key VARCHAR(200) NOT NULL,
    params_hash CHAR(64) NOT NULL,
    summary_text TEXT NOT NULL,
    insights_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT uq_ai_report_cache UNIQUE (report_key, params_hash)
);

CREATE INDEX IF NOT EXISTS idx_ai_report_cache_report_key ON ai_report_cache(report_key);
CREATE INDEX IF NOT EXISTS idx_ai_report_cache_expires_at ON ai_report_cache(expires_at);
