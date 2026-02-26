-- ============================================================================
-- SINGEM - Migration 004: CATMAT API Oficial + Cache VPS
-- Adequações para integração oficial com Compras Dados Abertos
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================================
-- CACHE OFICIAL CATMAT
-- ============================================================================
CREATE TABLE IF NOT EXISTS catmat_cache (
    codigo VARCHAR(30) PRIMARY KEY,
    descricao TEXT NOT NULL,
    id_grupo VARCHAR(30),
    id_classe VARCHAR(30),
    id_pdm VARCHAR(30),
    status VARCHAR(30) DEFAULT 'ATIVO',
    sustentavel BOOLEAN DEFAULT false,
    unidade VARCHAR(20) DEFAULT 'UN',
    fonte VARCHAR(100) NOT NULL DEFAULT 'api_oficial_compras',
    payload_raw JSONB,
    fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catmat_cache_status ON catmat_cache(status);
CREATE INDEX IF NOT EXISTS idx_catmat_cache_updated_at ON catmat_cache(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_catmat_cache_fetched_at ON catmat_cache(fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_catmat_cache_descricao_trgm ON catmat_cache USING gin(descricao gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_catmat_cache_codigo_trgm ON catmat_cache USING gin(codigo gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_catmat_cache_desc_tsv ON catmat_cache USING gin(to_tsvector('portuguese', descricao));

-- ============================================================================
-- LOG DE IMPORTAÇÃO / SYNC
-- ============================================================================
ALTER TABLE catmat_import_log ADD COLUMN IF NOT EXISTS origem VARCHAR(50) DEFAULT 'api_oficial';
ALTER TABLE catmat_import_log ADD COLUMN IF NOT EXISTS offset_inicio INTEGER DEFAULT 0;
ALTER TABLE catmat_import_log ADD COLUMN IF NOT EXISTS offset_fim INTEGER DEFAULT 0;
ALTER TABLE catmat_import_log ADD COLUMN IF NOT EXISTS limite_lote INTEGER DEFAULT 0;
ALTER TABLE catmat_import_log ADD COLUMN IF NOT EXISTS observacao TEXT;

-- ============================================================================
-- CURSOR DE SINCRONIZAÇÃO
-- ============================================================================
CREATE TABLE IF NOT EXISTS catmat_sync_cursor (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(100) UNIQUE NOT NULL,
    ultimo_offset INTEGER NOT NULL DEFAULT 0,
    ultimo_sync_em TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO catmat_sync_cursor (nome, ultimo_offset, ultimo_sync_em)
VALUES ('default', 0, NULL)
ON CONFLICT (nome) DO NOTHING;

-- ============================================================================
-- AUDITORIA DE VÍNCULOS CATMAT
-- ============================================================================
ALTER TABLE catmat_vinculos_log ADD COLUMN IF NOT EXISTS old_catmat VARCHAR(30);
ALTER TABLE catmat_vinculos_log ADD COLUMN IF NOT EXISTS new_catmat VARCHAR(30);

ALTER TABLE catmat_vinculos_log DROP CONSTRAINT IF EXISTS catmat_vinculos_log_entidade_check;
ALTER TABLE catmat_vinculos_log
    ADD CONSTRAINT catmat_vinculos_log_entidade_check
    CHECK (entidade IN ('empenho_item', 'nota_fiscal_item', 'EMPENHO_ITEM', 'NF_ITEM'));

-- ============================================================================
-- PEDIDOS DE CATALOGAÇÃO (RESPONSÁVEL/CONTROLE)
-- ============================================================================
ALTER TABLE catalogacao_pedidos ADD COLUMN IF NOT EXISTS responsavel_nome VARCHAR(255);
ALTER TABLE catalogacao_pedidos ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP;

-- ============================================================================
-- CAMPOS DE VÍNCULO CATMAT EM ITENS NF
-- ============================================================================
ALTER TABLE nota_fiscal_items ADD COLUMN IF NOT EXISTS catmat_codigo VARCHAR(30);
ALTER TABLE nota_fiscal_items ADD COLUMN IF NOT EXISTS catmat_descricao TEXT;
CREATE INDEX IF NOT EXISTS idx_nf_items_catmat_codigo ON nota_fiscal_items(catmat_codigo);

-- ============================================================================
-- FEATURE FLAGS (JSON POR MÓDULO)
-- ============================================================================
INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
    'catmat_obrigatorio',
    '{"ativo": false, "empenho_items": false, "nota_fiscal_items": false, "itens": false}'::jsonb,
    'Feature flags de obrigatoriedade CATMAT por módulo'
)
ON CONFLICT (chave) DO UPDATE
SET valor = CASE
    WHEN (configuracoes.valor ? 'itens') THEN configuracoes.valor
    ELSE configuracoes.valor || '{"itens": false}'::jsonb
END;

INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
    'catmat_link_pedido',
    '"https://www.gov.br/compras/pt-br/area-de-trabalho/materiais-e-servicos/catalogo/pedido-de-catalogacao"'::jsonb,
    'Link oficial para pedido de catalogação no Compras.gov.br'
)
ON CONFLICT (chave) DO UPDATE
SET valor = EXCLUDED.valor,
    descricao = EXCLUDED.descricao;

-- ============================================================================
-- FIM
-- ============================================================================
