-- ============================================================================
-- SINGEM - Migration 008: Gov.br Auto-Create User + Auth Provider Enhancement
-- Expandir auth_provider com 'serproid', adicionar cpf na tabela usuarios
-- ============================================================================

-- Expande enum de auth_provider para incluir serproid
ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_auth_provider_check;
ALTER TABLE usuarios ADD CONSTRAINT usuarios_auth_provider_check
  CHECK (auth_provider IN ('local', 'govbr', 'serproid', 'ambos'));

-- Garante coluna cpf na tabela usuarios (serproid e govbr usam)
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cpf VARCHAR(11);
CREATE INDEX IF NOT EXISTS idx_usuarios_cpf ON usuarios(cpf);

-- Garante coluna ultimo_login
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS ultimo_login TIMESTAMP;

-- Tabela de sessões gov.br (anti-CSRF state + PKCE)
CREATE TABLE IF NOT EXISTS govbr_sessions (
    id SERIAL PRIMARY KEY,
    state VARCHAR(64) UNIQUE NOT NULL,
    nonce VARCHAR(64),
    code_verifier VARCHAR(128) NOT NULL,
    redirect_after TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_govbr_sessions_state ON govbr_sessions(state);
CREATE INDEX IF NOT EXISTS idx_govbr_sessions_expires ON govbr_sessions(expires_at);

-- Limpeza automática de sessões expiradas (se executado manualmente)
DELETE FROM govbr_sessions WHERE expires_at < NOW();
