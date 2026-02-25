-- ============================================================================
-- SINGEM - Migration 003: CATMAT Completo + Pedidos de Catalogação
-- Sistema de cache local do catálogo CATMAT com fluxo de pedidos internos
-- ============================================================================

-- ============================================================================
-- CAMPOS ADICIONAIS NA TABELA materials (cache CATMAT)
-- ============================================================================

-- Campo 'fonte' para identificar origem do registro
ALTER TABLE materials ADD COLUMN IF NOT EXISTS fonte VARCHAR(50) DEFAULT 'manual';

-- Campo 'ativo' já existe, mas garantir
ALTER TABLE materials ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Índice GIN para busca full-text (se não existir)
CREATE INDEX IF NOT EXISTS idx_materials_descricao_tsvector
    ON materials USING gin(to_tsvector('portuguese', descricao));

-- Índice para busca ILIKE (trigram) - mais rápido para autocomplete
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_materials_descricao_trgm
    ON materials USING gin(descricao gin_trgm_ops);

-- Índice composto para filtros comuns
CREATE INDEX IF NOT EXISTS idx_materials_catmat_ativo
    ON materials(catmat_id, ativo) WHERE ativo = true;

-- ============================================================================
-- TABELA: catalogacao_pedidos (Pedidos internos de catalogação)
-- ============================================================================
CREATE TABLE IF NOT EXISTS catalogacao_pedidos (
    id SERIAL PRIMARY KEY,

    -- Tipo do catálogo (futuro: CATSER)
    tipo VARCHAR(10) NOT NULL DEFAULT 'CATMAT' CHECK (tipo IN ('CATMAT', 'CATSER')),

    -- Termo de busca que não retornou resultados
    termo_busca VARCHAR(255) NOT NULL,

    -- Descrição solicitada para catalogação
    descricao_solicitada TEXT NOT NULL,

    -- Unidade de medida sugerida
    unidade_sugerida VARCHAR(20) DEFAULT 'UN',

    -- Justificativa para a catalogação
    justificativa TEXT,

    -- Status do pedido
    status VARCHAR(20) NOT NULL DEFAULT 'NAO_SOLICITADO'
        CHECK (status IN ('NAO_SOLICITADO', 'SOLICITADO', 'APROVADO', 'DEVOLVIDO', 'CANCELADO')),

    -- Observações internas
    observacoes TEXT,

    -- Link externo (ex: protocolo no Compras.gov.br)
    link_externo VARCHAR(500),

    -- Código CATMAT atribuído após aprovação
    catmat_codigo_aprovado INTEGER,

    -- Anexos (JSON array com referências a arquivos)
    anexos JSONB DEFAULT '[]',

    -- Auditoria
    created_by INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by INTEGER REFERENCES usuarios(id),

    -- Datas de status
    solicitado_em TIMESTAMP,
    aprovado_em TIMESTAMP,
    devolvido_em TIMESTAMP,
    cancelado_em TIMESTAMP
);

-- Índices para catalogacao_pedidos
CREATE INDEX IF NOT EXISTS idx_catalogacao_pedidos_status ON catalogacao_pedidos(status);
CREATE INDEX IF NOT EXISTS idx_catalogacao_pedidos_tipo ON catalogacao_pedidos(tipo);
CREATE INDEX IF NOT EXISTS idx_catalogacao_pedidos_created_by ON catalogacao_pedidos(created_by);
CREATE INDEX IF NOT EXISTS idx_catalogacao_pedidos_created_at ON catalogacao_pedidos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_catalogacao_pedidos_termo ON catalogacao_pedidos USING gin(termo_busca gin_trgm_ops);

-- ============================================================================
-- TABELA: catmat_vinculos_log (Auditoria de vínculos CATMAT em itens)
-- ============================================================================
CREATE TABLE IF NOT EXISTS catmat_vinculos_log (
    id SERIAL PRIMARY KEY,

    -- Entidade vinculada
    entidade VARCHAR(30) NOT NULL CHECK (entidade IN ('empenho_item', 'nota_fiscal_item')),
    entidade_id INTEGER NOT NULL,

    -- Material/CATMAT vinculado
    material_id INTEGER REFERENCES materials(id),
    catmat_id INTEGER,

    -- Ação realizada
    acao VARCHAR(20) NOT NULL CHECK (acao IN ('vincular', 'desvincular', 'alterar')),

    -- Dados anteriores (se alteração)
    dados_anteriores JSONB,

    -- Auditoria
    usuario_id INTEGER REFERENCES usuarios(id),
    usuario_nome VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para catmat_vinculos_log
CREATE INDEX IF NOT EXISTS idx_catmat_vinculos_entidade ON catmat_vinculos_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_catmat_vinculos_material ON catmat_vinculos_log(material_id);
CREATE INDEX IF NOT EXISTS idx_catmat_vinculos_usuario ON catmat_vinculos_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_catmat_vinculos_created ON catmat_vinculos_log(created_at DESC);

-- ============================================================================
-- TABELA: catmat_import_log (Log de importações do CATMAT)
-- ============================================================================
CREATE TABLE IF NOT EXISTS catmat_import_log (
    id SERIAL PRIMARY KEY,

    -- Arquivo fonte
    arquivo_fonte VARCHAR(500),

    -- Estatísticas
    total_linhas INTEGER DEFAULT 0,
    importados INTEGER DEFAULT 0,
    atualizados INTEGER DEFAULT 0,
    erros INTEGER DEFAULT 0,

    -- Detalhes de erros (primeiros 100)
    erros_detalhes JSONB DEFAULT '[]',

    -- Tempo de execução (ms)
    duracao_ms INTEGER,

    -- Status
    status VARCHAR(20) DEFAULT 'executando' CHECK (status IN ('executando', 'concluido', 'erro')),
    erro_mensagem TEXT,

    -- Auditoria
    executado_por INTEGER REFERENCES usuarios(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_catmat_import_log_status ON catmat_import_log(status);
CREATE INDEX IF NOT EXISTS idx_catmat_import_log_created ON catmat_import_log(created_at DESC);

-- ============================================================================
-- TABELA: configuracoes (Feature flags e configs globais)
-- ============================================================================
-- Verificar se já existe, se não criar
CREATE TABLE IF NOT EXISTS configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(100) UNIQUE NOT NULL,
    valor JSONB NOT NULL,
    descricao TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feature flag: CATMAT obrigatório por módulo
INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
    'catmat_obrigatorio',
    '{"empenho_items": false, "nota_fiscal_items": false, "ativo": false}'::jsonb,
    'Define se CATMAT é obrigatório para salvar itens. Configurável por módulo.'
)
ON CONFLICT (chave) DO NOTHING;

-- Configuração: Link do Compras.gov.br para pedido de catalogação
INSERT INTO configuracoes (chave, valor, descricao)
VALUES (
    'catmat_link_pedido',
    '"https://www.gov.br/compras/pt-br/sistemas/sistema-de-catalogacao"'::jsonb,
    'Link para área de pedido de catalogação no Compras.gov.br'
)
ON CONFLICT (chave) DO NOTHING;

-- Trigger para updated_at em catalogacao_pedidos
DROP TRIGGER IF EXISTS update_catalogacao_pedidos_updated_at ON catalogacao_pedidos;
CREATE TRIGGER update_catalogacao_pedidos_updated_at
    BEFORE UPDATE ON catalogacao_pedidos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para updated_at em configuracoes
DROP TRIGGER IF EXISTS update_configuracoes_updated_at ON configuracoes;
CREATE TRIGGER update_configuracoes_updated_at
    BEFORE UPDATE ON configuracoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIM DA MIGRATION 003
-- ============================================================================
