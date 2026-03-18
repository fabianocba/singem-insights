-- ============================================================================
-- SINGEM - Módulo de Almoxarifado
-- Expande estruturas legadas de materials/notas_fiscais/stock_movements
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE IF NOT EXISTS contas_contabeis (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    descricao VARCHAR(255) NOT NULL,
    categoria VARCHAR(80),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE materials
    ADD COLUMN IF NOT EXISTS codigo_interno VARCHAR(50),
    ADD COLUMN IF NOT EXISTS descricao_resumida VARCHAR(255),
    ADD COLUMN IF NOT EXISTS catmat_codigo VARCHAR(30),
    ADD COLUMN IF NOT EXISTS catmat_descricao TEXT,
    ADD COLUMN IF NOT EXISTS grupo VARCHAR(120),
    ADD COLUMN IF NOT EXISTS subgrupo VARCHAR(120),
    ADD COLUMN IF NOT EXISTS conta_contabil_id INTEGER,
    ADD COLUMN IF NOT EXISTS estoque_minimo DECIMAL(15,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS estoque_maximo DECIMAL(15,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS ponto_reposicao DECIMAL(15,4) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS localizacao VARCHAR(255),
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'ativo';

UPDATE materials
SET codigo_interno = codigo
WHERE codigo_interno IS NULL AND codigo IS NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'materials_conta_contabil_fk'
    ) THEN
        ALTER TABLE materials
            ADD CONSTRAINT materials_conta_contabil_fk
            FOREIGN KEY (conta_contabil_id) REFERENCES contas_contabeis(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_materials_codigo_interno ON materials(codigo_interno) WHERE codigo_interno IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_materials_catmat_codigo ON materials(catmat_codigo);
CREATE INDEX IF NOT EXISTS idx_materials_conta_contabil_id ON materials(conta_contabil_id);
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_grupo_subgrupo ON materials(grupo, subgrupo);
CREATE INDEX IF NOT EXISTS idx_materials_descricao_trgm ON materials USING gin (descricao gin_trgm_ops);

CREATE TABLE IF NOT EXISTS item_imagens (
    id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES materials(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    tipo VARCHAR(40) DEFAULT 'principal',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_item_imagens_item_id ON item_imagens(item_id);

ALTER TABLE notas_fiscais
    ADD COLUMN IF NOT EXISTS fornecedor_id INTEGER,
    ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'entrada';

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_tipo ON notas_fiscais(tipo);
CREATE INDEX IF NOT EXISTS idx_notas_fiscais_fornecedor_id ON notas_fiscais(fornecedor_id);

ALTER TABLE nota_fiscal_items
    ADD COLUMN IF NOT EXISTS conta_contabil_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'nota_fiscal_items_conta_contabil_fk'
    ) THEN
        ALTER TABLE nota_fiscal_items
            ADD CONSTRAINT nota_fiscal_items_conta_contabil_fk
            FOREIGN KEY (conta_contabil_id) REFERENCES contas_contabeis(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_nf_items_conta_contabil_id ON nota_fiscal_items(conta_contabil_id);

CREATE TABLE IF NOT EXISTS solicitacoes (
    id SERIAL PRIMARY KEY,
    setor VARCHAR(255) NOT NULL,
    solicitante VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'rascunho'
        CHECK (status IN ('rascunho', 'enviada', 'aprovada', 'atendida', 'parcial', 'cancelada')),
    data TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_status ON solicitacoes(status);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_data ON solicitacoes(data DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_setor ON solicitacoes(setor);

CREATE TABLE IF NOT EXISTS solicitacao_itens (
    id SERIAL PRIMARY KEY,
    solicitacao_id INTEGER NOT NULL REFERENCES solicitacoes(id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES materials(id),
    quantidade DECIMAL(15,4) NOT NULL,
    quantidade_atendida DECIMAL(15,4) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente'
        CHECK (status IN ('pendente', 'separado', 'atendido', 'parcial', 'cancelado')),
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_solicitacao_itens_solicitacao_id ON solicitacao_itens(solicitacao_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_itens_item_id ON solicitacao_itens(item_id);
CREATE INDEX IF NOT EXISTS idx_solicitacao_itens_status ON solicitacao_itens(status);

ALTER TABLE stock_movements
    ADD COLUMN IF NOT EXISTS origem VARCHAR(30) DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS justificativa TEXT,
    ADD COLUMN IF NOT EXISTS solicitacao_id INTEGER,
    ADD COLUMN IF NOT EXISTS localizacao_destino VARCHAR(255);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'stock_movements_solicitacao_fk'
    ) THEN
        ALTER TABLE stock_movements
            ADD CONSTRAINT stock_movements_solicitacao_fk
            FOREIGN KEY (solicitacao_id) REFERENCES solicitacoes(id) ON DELETE SET NULL;
    END IF;
END $$;

ALTER TABLE stock_movements DROP CONSTRAINT IF EXISTS stock_movements_tipo_check;
ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_tipo_check
    CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'transferencia', 'devolucao'));

CREATE INDEX IF NOT EXISTS idx_stock_movements_origem ON stock_movements(origem);
CREATE INDEX IF NOT EXISTS idx_stock_movements_solicitacao_id ON stock_movements(solicitacao_id);

DROP TRIGGER IF EXISTS update_contas_contabeis_updated_at ON contas_contabeis;
CREATE TRIGGER update_contas_contabeis_updated_at BEFORE UPDATE ON contas_contabeis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_solicitacoes_updated_at ON solicitacoes;
CREATE TRIGGER update_solicitacoes_updated_at BEFORE UPDATE ON solicitacoes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
