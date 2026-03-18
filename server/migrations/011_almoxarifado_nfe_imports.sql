-- ============================================================================
-- SINGEM - Submódulo de Importação e Processamento de NF-e de Entrada
-- Sessões de importação, itens importados, mapeamentos reaproveitáveis
-- e regras declarativas de classificação para o almoxarifado.
-- ============================================================================

CREATE TABLE IF NOT EXISTS nfe_importacoes (
	id BIGSERIAL PRIMARY KEY,
	public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	nota_fiscal_id INTEGER REFERENCES notas_fiscais(id) ON DELETE SET NULL,
	empenho_id INTEGER REFERENCES empenhos(id) ON DELETE SET NULL,
	fornecedor_id INTEGER REFERENCES fornecedores_almoxarifado(id) ON DELETE SET NULL,
	tipo_importacao VARCHAR(20) NOT NULL DEFAULT 'xml'
		CHECK (tipo_importacao IN ('xml', 'manual', 'chave_acesso')),
	origem VARCHAR(30) NOT NULL DEFAULT 'upload',
	status VARCHAR(30) NOT NULL DEFAULT 'pendente_confirmacao'
		CHECK (
			status IN (
				'rascunho',
				'processada',
				'pendente_confirmacao',
				'confirmada',
				'reprocessando',
				'erro',
				'cancelada'
			)
		),
	chave_acesso VARCHAR(44),
	numero VARCHAR(20),
	serie VARCHAR(10),
	modelo VARCHAR(4),
	ambiente VARCHAR(10),
	protocolo VARCHAR(40),
	emitente_cnpj VARCHAR(14),
	emitente_razao_social VARCHAR(255),
	destinatario_cnpj VARCHAR(14),
	destinatario_razao_social VARCHAR(255),
	data_emissao DATE,
	data_entrada DATE,
	valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
	xml_hash VARCHAR(64),
	xml_storage_path TEXT,
	pdf_storage_path TEXT,
	resumo JSONB NOT NULL DEFAULT '{}'::jsonb,
	divergencias JSONB NOT NULL DEFAULT '[]'::jsonb,
	dados_extraidos JSONB NOT NULL DEFAULT '{}'::jsonb,
	observacoes TEXT,
	request_id VARCHAR(120),
	created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	confirmed_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	confirmed_at TIMESTAMP,
	last_reprocessed_at TIMESTAMP,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT nfe_importacoes_public_id_key UNIQUE (public_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_nfe_importacoes_chave_acesso
	ON nfe_importacoes(chave_acesso)
	WHERE chave_acesso IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfe_importacoes_status
	ON nfe_importacoes(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_importacoes_fornecedor
	ON nfe_importacoes(fornecedor_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_importacoes_empenho
	ON nfe_importacoes(empenho_id)
	WHERE empenho_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfe_importacoes_nota_fiscal
	ON nfe_importacoes(nota_fiscal_id)
	WHERE nota_fiscal_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfe_importacoes_emitente_cnpj
	ON nfe_importacoes(emitente_cnpj, data_emissao DESC);

CREATE TABLE IF NOT EXISTS nfe_itens_importados (
	id BIGSERIAL PRIMARY KEY,
	importacao_id BIGINT NOT NULL REFERENCES nfe_importacoes(id) ON DELETE CASCADE,
	nota_fiscal_item_id INTEGER REFERENCES nota_fiscal_items(id) ON DELETE SET NULL,
	material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
	conta_contabil_id INTEGER REFERENCES contas_contabeis(id) ON DELETE SET NULL,
	item_numero INTEGER NOT NULL,
	status VARCHAR(30) NOT NULL DEFAULT 'pendente_analise'
		CHECK (
			status IN (
				'pendente_analise',
				'vinculado',
				'classificado',
				'novo_item_criado',
				'confirmado',
				'ignorado',
				'erro'
			)
		),
	codigo_produto VARCHAR(80),
	ean VARCHAR(30),
	ean_tributavel VARCHAR(30),
	descricao TEXT NOT NULL,
	descricao_normalizada TEXT,
	unidade VARCHAR(20) DEFAULT 'UN',
	unidade_tributavel VARCHAR(20),
	quantidade DECIMAL(15,4) NOT NULL DEFAULT 0,
	quantidade_tributavel DECIMAL(15,4) DEFAULT 0,
	valor_unitario DECIMAL(15,4) NOT NULL DEFAULT 0,
	valor_unitario_tributavel DECIMAL(15,4) DEFAULT 0,
	valor_total DECIMAL(15,2) NOT NULL DEFAULT 0,
	ncm VARCHAR(20),
	cest VARCHAR(20),
	cfop VARCHAR(10),
	catmat_codigo VARCHAR(30),
	catmat_descricao TEXT,
	lote VARCHAR(80),
	validade DATE,
	marca VARCHAR(120),
	referencia VARCHAR(120),
	match_strategy VARCHAR(50),
	match_score DECIMAL(6,4),
	divergencias JSONB NOT NULL DEFAULT '[]'::jsonb,
	sugestoes JSONB NOT NULL DEFAULT '{}'::jsonb,
	classificacao JSONB NOT NULL DEFAULT '{}'::jsonb,
	dados_fiscais JSONB NOT NULL DEFAULT '{}'::jsonb,
	dados_extraidos JSONB NOT NULL DEFAULT '{}'::jsonb,
	version INTEGER NOT NULL DEFAULT 1,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT nfe_itens_importados_importacao_item_key UNIQUE (importacao_id, item_numero)
);

CREATE INDEX IF NOT EXISTS idx_nfe_itens_importados_importacao_status
	ON nfe_itens_importados(importacao_id, status);

CREATE INDEX IF NOT EXISTS idx_nfe_itens_importados_material
	ON nfe_itens_importados(material_id)
	WHERE material_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfe_itens_importados_conta
	ON nfe_itens_importados(conta_contabil_id)
	WHERE conta_contabil_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_nfe_itens_importados_ncm
	ON nfe_itens_importados(ncm);

CREATE INDEX IF NOT EXISTS idx_nfe_itens_importados_catmat
	ON nfe_itens_importados(catmat_codigo);

CREATE INDEX IF NOT EXISTS idx_nfe_itens_importados_descricao_trgm
	ON nfe_itens_importados USING gin (descricao gin_trgm_ops);

CREATE TABLE IF NOT EXISTS catmat_mapeamentos (
	id BIGSERIAL PRIMARY KEY,
	fingerprint VARCHAR(80) NOT NULL,
	chave_descricao TEXT NOT NULL,
	fornecedor_cnpj VARCHAR(14),
	ncm VARCHAR(20),
	unidade VARCHAR(20),
	material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
	catmat_codigo VARCHAR(30) NOT NULL,
	catmat_descricao TEXT,
	confianca DECIMAL(6,4) NOT NULL DEFAULT 0.8500,
	origem VARCHAR(20) NOT NULL DEFAULT 'manual'
		CHECK (origem IN ('manual', 'aprendizado', 'regra', 'importacao')),
	hits INTEGER NOT NULL DEFAULT 0,
	ultima_utilizacao_em TIMESTAMP,
	created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT catmat_mapeamentos_fingerprint_key UNIQUE (fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_catmat_mapeamentos_codigo
	ON catmat_mapeamentos(catmat_codigo, ultima_utilizacao_em DESC);

CREATE INDEX IF NOT EXISTS idx_catmat_mapeamentos_material
	ON catmat_mapeamentos(material_id)
	WHERE material_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS conta_contabil_mapeamentos (
	id BIGSERIAL PRIMARY KEY,
	fingerprint VARCHAR(80) NOT NULL,
	chave_descricao TEXT NOT NULL,
	fornecedor_cnpj VARCHAR(14),
	ncm VARCHAR(20),
	unidade VARCHAR(20),
	material_id INTEGER REFERENCES materials(id) ON DELETE SET NULL,
	conta_contabil_id INTEGER NOT NULL REFERENCES contas_contabeis(id) ON DELETE CASCADE,
	confianca DECIMAL(6,4) NOT NULL DEFAULT 0.8500,
	origem VARCHAR(20) NOT NULL DEFAULT 'manual'
		CHECK (origem IN ('manual', 'aprendizado', 'regra', 'importacao')),
	hits INTEGER NOT NULL DEFAULT 0,
	ultima_utilizacao_em TIMESTAMP,
	created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT conta_contabil_mapeamentos_fingerprint_key UNIQUE (fingerprint)
);

CREATE INDEX IF NOT EXISTS idx_conta_contabil_mapeamentos_conta
	ON conta_contabil_mapeamentos(conta_contabil_id, ultima_utilizacao_em DESC);

CREATE INDEX IF NOT EXISTS idx_conta_contabil_mapeamentos_material
	ON conta_contabil_mapeamentos(material_id)
	WHERE material_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS regras_classificacao_materiais (
	id BIGSERIAL PRIMARY KEY,
	public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	nome VARCHAR(160) NOT NULL,
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	prioridade INTEGER NOT NULL DEFAULT 100,
	escopo VARCHAR(40) NOT NULL DEFAULT 'nfe_entrada',
	criterios JSONB NOT NULL DEFAULT '{}'::jsonb,
	resultado JSONB NOT NULL DEFAULT '{}'::jsonb,
	observacoes TEXT,
	hit_count INTEGER NOT NULL DEFAULT 0,
	created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT regras_classificacao_materiais_public_id_key UNIQUE (public_id),
	CONSTRAINT regras_classificacao_materiais_nome_key UNIQUE (nome)
);

CREATE INDEX IF NOT EXISTS idx_regras_classificacao_materiais_ativo_prioridade
	ON regras_classificacao_materiais(ativo, prioridade ASC);

DROP TRIGGER IF EXISTS update_nfe_importacoes_updated_at ON nfe_importacoes;
CREATE TRIGGER update_nfe_importacoes_updated_at BEFORE UPDATE ON nfe_importacoes
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_nfe_itens_importados_updated_at ON nfe_itens_importados;
CREATE TRIGGER update_nfe_itens_importados_updated_at BEFORE UPDATE ON nfe_itens_importados
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_catmat_mapeamentos_updated_at ON catmat_mapeamentos;
CREATE TRIGGER update_catmat_mapeamentos_updated_at BEFORE UPDATE ON catmat_mapeamentos
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_conta_contabil_mapeamentos_updated_at ON conta_contabil_mapeamentos;
CREATE TRIGGER update_conta_contabil_mapeamentos_updated_at BEFORE UPDATE ON conta_contabil_mapeamentos
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_regras_classificacao_materiais_updated_at ON regras_classificacao_materiais;
CREATE TRIGGER update_regras_classificacao_materiais_updated_at BEFORE UPDATE ON regras_classificacao_materiais
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS nfe_importacoes_increment_version ON nfe_importacoes;
CREATE TRIGGER nfe_importacoes_increment_version BEFORE UPDATE ON nfe_importacoes
	FOR EACH ROW EXECUTE FUNCTION increment_row_version();

DROP TRIGGER IF EXISTS nfe_itens_importados_increment_version ON nfe_itens_importados;
CREATE TRIGGER nfe_itens_importados_increment_version BEFORE UPDATE ON nfe_itens_importados
	FOR EACH ROW EXECUTE FUNCTION increment_row_version();
