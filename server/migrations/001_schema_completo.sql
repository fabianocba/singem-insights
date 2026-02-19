-- ============================================================================
-- SINGEM - Schema Completo MVP
-- Sistema Institucional de Gestão de Material - IF Baiano
-- ============================================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABELA: _migrations (controle de versões)
-- ============================================================================
CREATE TABLE IF NOT EXISTS _migrations (
    id VARCHAR(100) PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABELA: usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    nome VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) DEFAULT 'operador' CHECK (perfil IN ('admin', 'operador', 'visualizador')),
    ativo BOOLEAN DEFAULT true,
    ultimo_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuarios_login ON usuarios(login);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- ============================================================================
-- TABELA: refresh_tokens
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- ============================================================================
-- TABELA: materials (catálogo de materiais)
-- ============================================================================
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(50) UNIQUE,
    descricao VARCHAR(500) NOT NULL,
    unidade VARCHAR(20) DEFAULT 'UN',
    natureza_despesa VARCHAR(10),
    subelemento VARCHAR(10),
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_materials_codigo ON materials(codigo);
CREATE INDEX IF NOT EXISTS idx_materials_descricao ON materials USING gin(to_tsvector('portuguese', descricao));

-- ============================================================================
-- TABELA: empenhos
-- ============================================================================
CREATE TABLE IF NOT EXISTS empenhos (
    id SERIAL PRIMARY KEY,
    numero VARCHAR(20) NOT NULL,
    ano INTEGER NOT NULL,
    slug VARCHAR(50) UNIQUE,
    data_empenho DATE,
    fornecedor VARCHAR(255),
    cnpj_fornecedor VARCHAR(14),
    valor_total DECIMAL(15,2) DEFAULT 0,
    natureza_despesa VARCHAR(10),
    processo_suap VARCHAR(50),
    status_validacao VARCHAR(20) DEFAULT 'rascunho' CHECK (status_validacao IN ('rascunho', 'validado', 'cancelado')),
    validado_em TIMESTAMP,
    validado_por INTEGER REFERENCES usuarios(id),
    pdf_data TEXT,
    observacoes TEXT,
    status VARCHAR(20) DEFAULT 'ativo',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES usuarios(id),
    UNIQUE(ano, numero)
);

CREATE INDEX IF NOT EXISTS idx_empenhos_ano_numero ON empenhos(ano, numero);
CREATE INDEX IF NOT EXISTS idx_empenhos_cnpj ON empenhos(cnpj_fornecedor);
CREATE INDEX IF NOT EXISTS idx_empenhos_slug ON empenhos(slug);
CREATE INDEX IF NOT EXISTS idx_empenhos_status ON empenhos(status_validacao);

-- ============================================================================
-- TABELA: empenho_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS empenho_items (
    id SERIAL PRIMARY KEY,
    empenho_id INTEGER NOT NULL REFERENCES empenhos(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id),
    item_numero INTEGER,
    descricao VARCHAR(500) NOT NULL,
    unidade VARCHAR(20) DEFAULT 'UN',
    quantidade DECIMAL(15,4) NOT NULL,
    valor_unitario DECIMAL(15,4) NOT NULL,
    valor_total DECIMAL(15,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    saldo_quantidade DECIMAL(15,4),
    saldo_valor DECIMAL(15,2),
    natureza_despesa VARCHAR(10),
    subelemento VARCHAR(10),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_empenho_items_empenho ON empenho_items(empenho_id);
CREATE INDEX IF NOT EXISTS idx_empenho_items_material ON empenho_items(material_id);

-- ============================================================================
-- TABELA: notas_fiscais
-- ============================================================================
CREATE TABLE IF NOT EXISTS notas_fiscais (
    id SERIAL PRIMARY KEY,
    empenho_id INTEGER REFERENCES empenhos(id) ON DELETE SET NULL,
    numero VARCHAR(20) NOT NULL,
    serie VARCHAR(5),
    chave_acesso VARCHAR(44) UNIQUE,
    data_emissao DATE,
    data_entrada DATE,
    fornecedor VARCHAR(255),
    cnpj_fornecedor VARCHAR(14),
    valor_total DECIMAL(15,2) DEFAULT 0,
    valor_icms DECIMAL(15,2) DEFAULT 0,
    valor_ipi DECIMAL(15,2) DEFAULT 0,
    valor_frete DECIMAL(15,2) DEFAULT 0,
    valor_desconto DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'conferida', 'recebida', 'cancelada')),
    xml_data TEXT,
    pdf_data TEXT,
    observacoes TEXT,
    conferida_por INTEGER REFERENCES usuarios(id),
    conferida_em TIMESTAMP,
    recebida_por INTEGER REFERENCES usuarios(id),
    recebida_em TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_nf_empenho ON notas_fiscais(empenho_id);
CREATE INDEX IF NOT EXISTS idx_nf_chave ON notas_fiscais(chave_acesso);
CREATE INDEX IF NOT EXISTS idx_nf_cnpj ON notas_fiscais(cnpj_fornecedor);
CREATE INDEX IF NOT EXISTS idx_nf_data ON notas_fiscais(data_emissao);
CREATE INDEX IF NOT EXISTS idx_nf_status ON notas_fiscais(status);

-- ============================================================================
-- TABELA: nota_fiscal_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS nota_fiscal_items (
    id SERIAL PRIMARY KEY,
    nota_fiscal_id INTEGER NOT NULL REFERENCES notas_fiscais(id) ON DELETE CASCADE,
    empenho_item_id INTEGER REFERENCES empenho_items(id),
    material_id INTEGER REFERENCES materials(id),
    item_numero INTEGER,
    codigo_produto VARCHAR(50),
    descricao VARCHAR(500) NOT NULL,
    ncm VARCHAR(10),
    cfop VARCHAR(10),
    unidade VARCHAR(20) DEFAULT 'UN',
    quantidade DECIMAL(15,4) NOT NULL,
    valor_unitario DECIMAL(15,4) NOT NULL,
    valor_total DECIMAL(15,2) GENERATED ALWAYS AS (quantidade * valor_unitario) STORED,
    valor_icms DECIMAL(15,2) DEFAULT 0,
    valor_ipi DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_nf_items_nf ON nota_fiscal_items(nota_fiscal_id);
CREATE INDEX IF NOT EXISTS idx_nf_items_empenho_item ON nota_fiscal_items(empenho_item_id);
CREATE INDEX IF NOT EXISTS idx_nf_items_material ON nota_fiscal_items(material_id);

-- ============================================================================
-- TABELA: stock_movements (movimentações de estoque)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_movements (
    id SERIAL PRIMARY KEY,
    material_id INTEGER NOT NULL REFERENCES materials(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('entrada', 'saida', 'ajuste', 'transferencia')),
    quantidade DECIMAL(15,4) NOT NULL,
    valor_unitario DECIMAL(15,4),
    valor_total DECIMAL(15,2),
    -- Referências
    nota_fiscal_id INTEGER REFERENCES notas_fiscais(id),
    nota_fiscal_item_id INTEGER REFERENCES nota_fiscal_items(id),
    empenho_id INTEGER REFERENCES empenhos(id),
    -- Detalhes
    documento VARCHAR(50),
    observacoes TEXT,
    -- Saldo após movimento
    saldo_anterior DECIMAL(15,4),
    saldo_posterior DECIMAL(15,4),
    -- Auditoria
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_stock_material ON stock_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_stock_tipo ON stock_movements(tipo);
CREATE INDEX IF NOT EXISTS idx_stock_data ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_nf ON stock_movements(nota_fiscal_id);

-- ============================================================================
-- TABELA: stock_balances (saldos consolidados - cache)
-- ============================================================================
CREATE TABLE IF NOT EXISTS stock_balances (
    id SERIAL PRIMARY KEY,
    material_id INTEGER UNIQUE NOT NULL REFERENCES materials(id),
    quantidade DECIMAL(15,4) DEFAULT 0,
    valor_medio DECIMAL(15,4) DEFAULT 0,
    valor_total DECIMAL(15,2) DEFAULT 0,
    ultima_entrada DATE,
    ultima_saida DATE,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_balances_material ON stock_balances(material_id);

-- ============================================================================
-- TABELA: audit_log
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    usuario_nome VARCHAR(255),
    acao VARCHAR(50) NOT NULL,
    entidade VARCHAR(50) NOT NULL,
    entidade_id INTEGER,
    dados_antes JSONB,
    dados_depois JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_usuario ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_entidade ON audit_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_data ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_acao ON audit_log(acao);

-- ============================================================================
-- TABELA: sync_operations (fila de operações offline)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_operations (
    id SERIAL PRIMARY KEY,
    op_id VARCHAR(100) UNIQUE NOT NULL,
    usuario_id INTEGER REFERENCES usuarios(id),
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('criar', 'atualizar', 'excluir')),
    entidade VARCHAR(50) NOT NULL,
    entidade_id VARCHAR(100),
    dados JSONB,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processado', 'erro')),
    erro TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sync_op_id ON sync_operations(op_id);
CREATE INDEX IF NOT EXISTS idx_sync_status ON sync_operations(status);
CREATE INDEX IF NOT EXISTS idx_sync_entidade ON sync_operations(entidade);

-- ============================================================================
-- FUNÇÕES AUXILIARES
-- ============================================================================

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON materials
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_empenhos_updated_at ON empenhos;
CREATE TRIGGER update_empenhos_updated_at BEFORE UPDATE ON empenhos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_notas_fiscais_updated_at ON notas_fiscais;
CREATE TRIGGER update_notas_fiscais_updated_at BEFORE UPDATE ON notas_fiscais
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_stock_balances_updated_at ON stock_balances;
CREATE TRIGGER update_stock_balances_updated_at BEFORE UPDATE ON stock_balances
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- FIM DO SCHEMA
-- ============================================================================
