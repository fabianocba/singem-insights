-- ============================================================================
-- SINGEM - Evolução Escalável do Módulo de Almoxarifado
-- Catálogos auxiliares, auditoria dedicada e identidade pública estável
-- ============================================================================

CREATE TABLE IF NOT EXISTS fornecedores_almoxarifado (
	id SERIAL PRIMARY KEY,
	public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	cnpj VARCHAR(14),
	razao_social VARCHAR(255) NOT NULL,
	nome_fantasia VARCHAR(255),
	email VARCHAR(255),
	telefone VARCHAR(40),
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	version INTEGER NOT NULL DEFAULT 1,
	deleted_at TIMESTAMP,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fornecedores_almoxarifado_public_id_key UNIQUE (public_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_fornecedores_almox_cnpj
	ON fornecedores_almoxarifado(cnpj)
	WHERE cnpj IS NOT NULL;

CREATE TABLE IF NOT EXISTS grupos_materiais (
	id SERIAL PRIMARY KEY,
	codigo VARCHAR(40),
	nome VARCHAR(160) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT grupos_materiais_nome_key UNIQUE (nome)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_grupos_materiais_codigo
	ON grupos_materiais(codigo)
	WHERE codigo IS NOT NULL;

CREATE TABLE IF NOT EXISTS subgrupos_materiais (
	id SERIAL PRIMARY KEY,
	grupo_id INTEGER NOT NULL REFERENCES grupos_materiais(id) ON DELETE CASCADE,
	codigo VARCHAR(40),
	nome VARCHAR(160) NOT NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT subgrupos_materiais_grupo_nome_key UNIQUE (grupo_id, nome)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subgrupos_materiais_codigo
	ON subgrupos_materiais(codigo)
	WHERE codigo IS NOT NULL;

CREATE TABLE IF NOT EXISTS localizacoes_estoque (
	id SERIAL PRIMARY KEY,
	nome VARCHAR(160) NOT NULL,
	bloco VARCHAR(80),
	prateleira VARCHAR(80),
	nivel VARCHAR(80),
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT localizacoes_estoque_nome_key UNIQUE (nome)
);

CREATE TABLE IF NOT EXISTS logs_auditoria_almoxarifado (
	id BIGSERIAL PRIMARY KEY,
	public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	acao VARCHAR(80) NOT NULL,
	entidade_tipo VARCHAR(80) NOT NULL,
	entidade_id VARCHAR(120) NOT NULL,
	request_id VARCHAR(120),
	payload JSONB,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT logs_auditoria_almoxarifado_public_id_key UNIQUE (public_id)
);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_almoxarifado_created_at
	ON logs_auditoria_almoxarifado(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_almoxarifado_entidade
	ON logs_auditoria_almoxarifado(entidade_tipo, entidade_id);

CREATE INDEX IF NOT EXISTS idx_logs_auditoria_almoxarifado_usuario
	ON logs_auditoria_almoxarifado(usuario_id, created_at DESC);

ALTER TABLE materials
	ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
	ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
	ADD COLUMN IF NOT EXISTS grupo_id INTEGER,
	ADD COLUMN IF NOT EXISTS subgrupo_id INTEGER,
	ADD COLUMN IF NOT EXISTS localizacao_id INTEGER,
	ADD COLUMN IF NOT EXISTS fornecedor_preferencial_id INTEGER;

ALTER TABLE notas_fiscais
	ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
	ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE stock_movements
	ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
	ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE solicitacoes
	ADD COLUMN IF NOT EXISTS public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	ADD COLUMN IF NOT EXISTS prioridade VARCHAR(20) NOT NULL DEFAULT 'normal',
	ADD COLUMN IF NOT EXISTS centro_custo VARCHAR(120),
	ADD COLUMN IF NOT EXISTS responsavel_analise_id INTEGER,
	ADD COLUMN IF NOT EXISTS analisado_em TIMESTAMP,
	ADD COLUMN IF NOT EXISTS atendido_em TIMESTAMP,
	ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1,
	ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

ALTER TABLE solicitacao_itens
	ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'materials_grupo_fk'
	) THEN
		ALTER TABLE materials
			ADD CONSTRAINT materials_grupo_fk
			FOREIGN KEY (grupo_id) REFERENCES grupos_materiais(id) ON DELETE SET NULL;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'materials_subgrupo_fk'
	) THEN
		ALTER TABLE materials
			ADD CONSTRAINT materials_subgrupo_fk
			FOREIGN KEY (subgrupo_id) REFERENCES subgrupos_materiais(id) ON DELETE SET NULL;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'materials_localizacao_fk'
	) THEN
		ALTER TABLE materials
			ADD CONSTRAINT materials_localizacao_fk
			FOREIGN KEY (localizacao_id) REFERENCES localizacoes_estoque(id) ON DELETE SET NULL;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'materials_fornecedor_preferencial_fk'
	) THEN
		ALTER TABLE materials
			ADD CONSTRAINT materials_fornecedor_preferencial_fk
			FOREIGN KEY (fornecedor_preferencial_id) REFERENCES fornecedores_almoxarifado(id) ON DELETE SET NULL;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'notas_fiscais_fornecedor_almox_fk'
	) THEN
		ALTER TABLE notas_fiscais
			ADD CONSTRAINT notas_fiscais_fornecedor_almox_fk
			FOREIGN KEY (fornecedor_id) REFERENCES fornecedores_almoxarifado(id) ON DELETE SET NULL;
	END IF;

	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'solicitacoes_responsavel_analise_fk'
	) THEN
		ALTER TABLE solicitacoes
			ADD CONSTRAINT solicitacoes_responsavel_analise_fk
			FOREIGN KEY (responsavel_analise_id) REFERENCES usuarios(id) ON DELETE SET NULL;
	END IF;
END $$;

INSERT INTO grupos_materiais (nome)
SELECT DISTINCT TRIM(m.grupo)
FROM materials m
WHERE m.grupo IS NOT NULL
	AND TRIM(m.grupo) <> ''
ON CONFLICT (nome) DO NOTHING;

INSERT INTO subgrupos_materiais (grupo_id, nome)
SELECT DISTINCT g.id, TRIM(m.subgrupo)
FROM materials m
JOIN grupos_materiais g ON g.nome = TRIM(m.grupo)
WHERE m.subgrupo IS NOT NULL
	AND TRIM(m.subgrupo) <> ''
ON CONFLICT (grupo_id, nome) DO NOTHING;

INSERT INTO localizacoes_estoque (nome)
SELECT DISTINCT TRIM(m.localizacao)
FROM materials m
WHERE m.localizacao IS NOT NULL
	AND TRIM(m.localizacao) <> ''
ON CONFLICT (nome) DO NOTHING;

UPDATE materials m
SET grupo_id = g.id
FROM grupos_materiais g
WHERE m.grupo_id IS NULL
	AND m.grupo IS NOT NULL
	AND TRIM(m.grupo) = g.nome;

UPDATE materials m
SET subgrupo_id = sg.id
FROM subgrupos_materiais sg
JOIN grupos_materiais g ON g.id = sg.grupo_id
WHERE m.subgrupo_id IS NULL
	AND m.subgrupo IS NOT NULL
	AND TRIM(m.subgrupo) = sg.nome
	AND (
		m.grupo_id = g.id
		OR (m.grupo_id IS NULL AND m.grupo IS NOT NULL AND TRIM(m.grupo) = g.nome)
	);

UPDATE materials m
SET localizacao_id = l.id
FROM localizacoes_estoque l
WHERE m.localizacao_id IS NULL
	AND m.localizacao IS NOT NULL
	AND TRIM(m.localizacao) = l.nome;

ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_status_check;
ALTER TABLE solicitacoes
	ADD CONSTRAINT solicitacoes_status_check
	CHECK (
		status IN (
			'rascunho',
			'enviada',
			'em_analise',
			'aprovada',
			'em_separacao',
			'atendida',
			'parcial',
			'parcialmente_atendida',
			'recusada',
			'cancelada',
			'estornada'
		)
	);

ALTER TABLE solicitacao_itens DROP CONSTRAINT IF EXISTS solicitacao_itens_status_check;
ALTER TABLE solicitacao_itens
	ADD CONSTRAINT solicitacao_itens_status_check
	CHECK (status IN ('pendente', 'reservado', 'separado', 'atendido', 'parcial', 'cancelado'));

ALTER TABLE solicitacoes DROP CONSTRAINT IF EXISTS solicitacoes_prioridade_check;
ALTER TABLE solicitacoes
	ADD CONSTRAINT solicitacoes_prioridade_check
	CHECK (prioridade IN ('baixa', 'normal', 'alta', 'urgente'));

CREATE INDEX IF NOT EXISTS idx_materials_public_id ON materials(public_id);
CREATE INDEX IF NOT EXISTS idx_materials_deleted_at ON materials(deleted_at);
CREATE INDEX IF NOT EXISTS idx_materials_grupo_id ON materials(grupo_id);
CREATE INDEX IF NOT EXISTS idx_materials_subgrupo_id ON materials(subgrupo_id);
CREATE INDEX IF NOT EXISTS idx_materials_localizacao_id ON materials(localizacao_id);
CREATE INDEX IF NOT EXISTS idx_materials_fornecedor_preferencial_id ON materials(fornecedor_preferencial_id);

CREATE INDEX IF NOT EXISTS idx_notas_fiscais_public_id ON notas_fiscais(public_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_public_id ON stock_movements(public_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_deleted_at ON stock_movements(deleted_at);

CREATE INDEX IF NOT EXISTS idx_solicitacoes_public_id ON solicitacoes(public_id);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_prioridade ON solicitacoes(prioridade, data DESC);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_centro_custo ON solicitacoes(centro_custo);
CREATE INDEX IF NOT EXISTS idx_solicitacoes_deleted_at ON solicitacoes(deleted_at);

CREATE OR REPLACE FUNCTION increment_row_version()
RETURNS TRIGGER AS $$
BEGIN
	NEW.version = COALESCE(OLD.version, 0) + 1;
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fornecedores_almoxarifado_updated_at ON fornecedores_almoxarifado;
CREATE TRIGGER update_fornecedores_almoxarifado_updated_at BEFORE UPDATE ON fornecedores_almoxarifado
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_grupos_materiais_updated_at ON grupos_materiais;
CREATE TRIGGER update_grupos_materiais_updated_at BEFORE UPDATE ON grupos_materiais
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subgrupos_materiais_updated_at ON subgrupos_materiais;
CREATE TRIGGER update_subgrupos_materiais_updated_at BEFORE UPDATE ON subgrupos_materiais
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_localizacoes_estoque_updated_at ON localizacoes_estoque;
CREATE TRIGGER update_localizacoes_estoque_updated_at BEFORE UPDATE ON localizacoes_estoque
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS materials_increment_version ON materials;
CREATE TRIGGER materials_increment_version BEFORE UPDATE ON materials
	FOR EACH ROW EXECUTE FUNCTION increment_row_version();

DROP TRIGGER IF EXISTS notas_fiscais_increment_version ON notas_fiscais;
CREATE TRIGGER notas_fiscais_increment_version BEFORE UPDATE ON notas_fiscais
	FOR EACH ROW EXECUTE FUNCTION increment_row_version();

DROP TRIGGER IF EXISTS stock_movements_increment_version ON stock_movements;
CREATE TRIGGER stock_movements_increment_version BEFORE UPDATE ON stock_movements
	FOR EACH ROW EXECUTE FUNCTION increment_row_version();

DROP TRIGGER IF EXISTS solicitacoes_increment_version ON solicitacoes;
CREATE TRIGGER solicitacoes_increment_version BEFORE UPDATE ON solicitacoes
	FOR EACH ROW EXECUTE FUNCTION increment_row_version();

DROP TRIGGER IF EXISTS solicitacao_itens_increment_version ON solicitacao_itens;
CREATE TRIGGER solicitacao_itens_increment_version BEFORE UPDATE ON solicitacao_itens
	FOR EACH ROW EXECUTE FUNCTION increment_row_version();
