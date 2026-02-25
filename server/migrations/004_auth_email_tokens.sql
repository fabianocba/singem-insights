-- ============================================================================
-- SINGEM - Migration 004: Ativação de Conta + Reset de Senha por E-mail
-- Cria estrutura de tokens de autenticação e adequa usuários para ativação.
-- ============================================================================

-- Campo adicional para compatibilidade com fluxo novo de ativação
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

-- Sincroniza dados legados (ativo -> is_active)
UPDATE usuarios
SET is_active = COALESCE(is_active, ativo, false)
WHERE is_active IS NULL;

-- Garante padrão para novos registros
ALTER TABLE usuarios ALTER COLUMN is_active SET DEFAULT false;

-- Tabela única para tokens de ativação e reset de senha
CREATE TABLE IF NOT EXISTS auth_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('ACTIVATION', 'RESET')),
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_type_expires ON auth_tokens(type, expires_at);
CREATE INDEX IF NOT EXISTS idx_auth_tokens_open_valid ON auth_tokens(token_hash, type)
    WHERE used_at IS NULL;

-- ============================================================================
-- FIM DA MIGRATION 004
-- ============================================================================
