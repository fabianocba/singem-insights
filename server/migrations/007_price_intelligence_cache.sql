CREATE TABLE IF NOT EXISTS price_intelligence_cache (
    id BIGSERIAL PRIMARY KEY,
    cache_key VARCHAR(64) NOT NULL UNIQUE,
    catalog_type VARCHAR(20) NOT NULL,
    codes_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    filters_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    normalized_payload JSONB NOT NULL,
    total_registros INTEGER NOT NULL DEFAULT 0,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_price_intelligence_cache_catalog_type
    ON price_intelligence_cache(catalog_type);

CREATE INDEX IF NOT EXISTS idx_price_intelligence_cache_expires_at
    ON price_intelligence_cache(expires_at DESC);

CREATE INDEX IF NOT EXISTS idx_price_intelligence_cache_fetched_at
    ON price_intelligence_cache(fetched_at DESC);
