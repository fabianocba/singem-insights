-- ============================================================================
-- SINGEM - Persistencia de arquivos e configuracoes de sistema
-- ============================================================================

CREATE TABLE IF NOT EXISTS arquivos (
  id BIGSERIAL PRIMARY KEY,
  modulo VARCHAR(80) NOT NULL,
  categoria VARCHAR(80) NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  nome_armazenado VARCHAR(255) NOT NULL,
  extensao VARCHAR(20),
  mime_type VARCHAR(120),
  tamanho_bytes BIGINT NOT NULL CHECK (tamanho_bytes >= 0),
  caminho_relativo TEXT NOT NULL,
  caminho_absoluto TEXT,
  hash_arquivo VARCHAR(128),
  entidade_tipo VARCHAR(80),
  entidade_id VARCHAR(120),
  usuario_criador INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'arquivado', 'excluido')),
  modo_registro VARCHAR(20) NOT NULL DEFAULT 'real' CHECK (modo_registro IN ('real', 'simulado'))
);

CREATE INDEX IF NOT EXISTS idx_arquivos_modulo_categoria ON arquivos(modulo, categoria);
CREATE INDEX IF NOT EXISTS idx_arquivos_entidade ON arquivos(entidade_tipo, entidade_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_status ON arquivos(status);
CREATE INDEX IF NOT EXISTS idx_arquivos_modo_registro ON arquivos(modo_registro);
CREATE UNIQUE INDEX IF NOT EXISTS idx_arquivos_caminho_relativo_unique ON arquivos(caminho_relativo);

CREATE TABLE IF NOT EXISTS configuracoes_sistema (
  chave VARCHAR(120) PRIMARY KEY,
  valor TEXT,
  descricao TEXT,
  categoria VARCHAR(60) NOT NULL DEFAULT 'geral',
  atualizado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
  modo_registro VARCHAR(20) NOT NULL DEFAULT 'real' CHECK (modo_registro IN ('real', 'simulado'))
);

CREATE INDEX IF NOT EXISTS idx_configuracoes_sistema_categoria ON configuracoes_sistema(categoria);

INSERT INTO configuracoes_sistema (chave, valor, descricao, categoria, modo_registro)
VALUES
  ('instituicao.nome', 'IF Baiano', 'Nome institucional exibido na aplicacao', 'institucional', 'real'),
  ('storage.base_path', '/app/storage', 'Pasta base de armazenamento persistente usada pelo backend', 'storage', 'real'),
  ('storage.upload.max_bytes', '26214400', 'Tamanho maximo de upload em bytes (25MB)', 'storage', 'real'),
  ('storage.operacao.modo_padrao', 'real', 'Modo padrao dos registros: real ou simulado', 'operacao', 'real'),
  ('nf.modo_simulacao.habilitado', 'true', 'Permite cadastros e importacoes em modo simulado sem quebrar producao', 'nota_fiscal', 'real'),
  ('empenho.modo_simulacao.habilitado', 'true', 'Permite registros simulados de empenho para treinamento e homologacao', 'empenho', 'real')
ON CONFLICT (chave) DO NOTHING;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notas_fiscais'
  ) THEN
    ALTER TABLE notas_fiscais
      ADD COLUMN IF NOT EXISTS modo_registro VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'notas_fiscais_modo_registro_check'
    ) THEN
      ALTER TABLE notas_fiscais
        ADD CONSTRAINT notas_fiscais_modo_registro_check
        CHECK (modo_registro IN ('real', 'simulado'));
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'empenhos'
  ) THEN
    ALTER TABLE empenhos
      ADD COLUMN IF NOT EXISTS modo_registro VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'empenhos_modo_registro_check'
    ) THEN
      ALTER TABLE empenhos
        ADD CONSTRAINT empenhos_modo_registro_check
        CHECK (modo_registro IN ('real', 'simulado'));
    END IF;
  END IF;
END $$;
