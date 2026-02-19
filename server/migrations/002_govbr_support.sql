-- ============================================================================
-- SINGEM - Migration 002: Suporte a Login Gov.br
-- Adiciona campos para vinculação de contas gov.br aos usuários
-- ============================================================================

-- Adiciona campos gov.br na tabela usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS govbr_sub VARCHAR(255) UNIQUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS govbr_cpf VARCHAR(11);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS govbr_nome_social VARCHAR(255);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS govbr_email_verificado BOOLEAN DEFAULT false;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS govbr_nivel_confiabilidade INTEGER;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS govbr_vinculado_em TIMESTAMP;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(20) DEFAULT 'local' CHECK (auth_provider IN ('local', 'govbr', 'ambos'));

-- Índice para busca por govbr_sub
CREATE INDEX IF NOT EXISTS idx_usuarios_govbr_sub ON usuarios(govbr_sub);

-- Tabela para armazenar tokens gov.br (opcional, para refresh)
CREATE TABLE IF NOT EXISTS govbr_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    access_token TEXT,
    refresh_token TEXT,
    id_token TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_govbr_tokens_usuario ON govbr_tokens(usuario_id);

-- Tabela de log de autenticações (auditoria)
CREATE TABLE IF NOT EXISTS auth_log (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id),
    provider VARCHAR(20) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_log_usuario ON auth_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auth_log_created ON auth_log(created_at);

-- ============================================================================
-- CATMAT - Campos adicionais para materiais
-- ============================================================================

-- Adiciona campos CATMAT na tabela materials
ALTER TABLE materials ADD COLUMN IF NOT EXISTS catmat_id INTEGER;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS catmat_grupo VARCHAR(100);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS catmat_classe VARCHAR(100);
ALTER TABLE materials ADD COLUMN IF NOT EXISTS catmat_padrao_desc TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS catmat_sustentavel BOOLEAN DEFAULT false;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS catmat_atualizado_em TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_materials_catmat_id ON materials(catmat_id);
