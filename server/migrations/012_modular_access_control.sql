-- ============================================================================
-- SINGEM - Base de Acesso Modular
-- Contexto organizacional, catálogo de módulos, vínculos por perfil/módulo/setor
-- e base para autorização contextual em ambiente institucional.
-- ============================================================================

ALTER TABLE usuarios DROP CONSTRAINT IF EXISTS usuarios_perfil_check;
ALTER TABLE usuarios
	ADD CONSTRAINT usuarios_perfil_check
	CHECK (
		perfil IN (
			'admin',
			'admin_superior',
			'admin_setorial',
			'gestor',
			'almoxarife',
			'conferente',
			'operador',
			'auditor',
			'solicitante',
			'visualizador',
			'visitante'
		)
	);

CREATE TABLE IF NOT EXISTS system_modules (
	id SERIAL PRIMARY KEY,
	chave VARCHAR(80) NOT NULL,
	nome_exibicao VARCHAR(160) NOT NULL,
	descricao TEXT,
	categoria VARCHAR(30) NOT NULL
		CHECK (categoria IN ('central', 'setorial', 'solicitacao')),
	modulo_pai VARCHAR(80),
	rota VARCHAR(160),
	screen_id VARCHAR(120),
	icone VARCHAR(60),
	ordem_menu INTEGER NOT NULL DEFAULT 100,
	habilitado BOOLEAN NOT NULL DEFAULT TRUE,
	oculto_em_producao BOOLEAN NOT NULL DEFAULT FALSE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT system_modules_chave_key UNIQUE (chave)
);

CREATE TABLE IF NOT EXISTS unidades_organizacionais (
	id SERIAL PRIMARY KEY,
	public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	codigo VARCHAR(40),
	nome VARCHAR(160) NOT NULL,
	sigla VARCHAR(40),
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT unidades_organizacionais_public_id_key UNIQUE (public_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unidades_organizacionais_codigo
	ON unidades_organizacionais(codigo)
	WHERE codigo IS NOT NULL;

CREATE TABLE IF NOT EXISTS setores_organizacionais (
	id SERIAL PRIMARY KEY,
	public_id UUID NOT NULL DEFAULT uuid_generate_v4(),
	unidade_id INTEGER REFERENCES unidades_organizacionais(id) ON DELETE CASCADE,
	codigo VARCHAR(40),
	nome VARCHAR(160) NOT NULL,
	sigla VARCHAR(40),
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT setores_organizacionais_public_id_key UNIQUE (public_id),
	CONSTRAINT setores_organizacionais_unidade_nome_key UNIQUE (unidade_id, nome)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_setores_organizacionais_codigo
	ON setores_organizacionais(codigo)
	WHERE codigo IS NOT NULL;

CREATE TABLE IF NOT EXISTS usuario_escopos_acesso (
	id BIGSERIAL PRIMARY KEY,
	usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
	unidade_id INTEGER REFERENCES unidades_organizacionais(id) ON DELETE CASCADE,
	setor_id INTEGER REFERENCES setores_organizacionais(id) ON DELETE CASCADE,
	nivel_escopo VARCHAR(20) NOT NULL DEFAULT 'setor'
		CHECK (nivel_escopo IN ('global', 'unidade', 'setor', 'proprio')),
	perfil_escopo VARCHAR(20) NOT NULL DEFAULT 'membro'
		CHECK (perfil_escopo IN ('superior', 'setorial', 'gestor', 'membro', 'consulta')),
	principal BOOLEAN NOT NULL DEFAULT FALSE,
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	created_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	updated_by INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuario_escopos_acesso_usuario
	ON usuario_escopos_acesso(usuario_id, ativo);

CREATE INDEX IF NOT EXISTS idx_usuario_escopos_acesso_unidade
	ON usuario_escopos_acesso(unidade_id, ativo)
	WHERE unidade_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_usuario_escopos_acesso_setor
	ON usuario_escopos_acesso(setor_id, ativo)
	WHERE setor_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS perfil_modulo_acessos (
	id BIGSERIAL PRIMARY KEY,
	perfil VARCHAR(30) NOT NULL,
	modulo_key VARCHAR(80) NOT NULL REFERENCES system_modules(chave) ON DELETE CASCADE,
	acoes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
	nivel_escopo VARCHAR(20) NOT NULL DEFAULT 'setor'
		CHECK (nivel_escopo IN ('global', 'unidade', 'setor', 'proprio')),
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT perfil_modulo_acessos_perfil_modulo_key UNIQUE (perfil, modulo_key)
);

CREATE INDEX IF NOT EXISTS idx_perfil_modulo_acessos_perfil
	ON perfil_modulo_acessos(perfil, ativo);

CREATE TABLE IF NOT EXISTS usuario_modulo_acessos (
	id BIGSERIAL PRIMARY KEY,
	usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
	modulo_key VARCHAR(80) NOT NULL REFERENCES system_modules(chave) ON DELETE CASCADE,
	unidade_id INTEGER REFERENCES unidades_organizacionais(id) ON DELETE CASCADE,
	setor_id INTEGER REFERENCES setores_organizacionais(id) ON DELETE CASCADE,
	tipo_regra VARCHAR(10) NOT NULL DEFAULT 'grant'
		CHECK (tipo_regra IN ('grant', 'revoke')),
	acoes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
	nivel_escopo VARCHAR(20) NOT NULL DEFAULT 'setor'
		CHECK (nivel_escopo IN ('global', 'unidade', 'setor', 'proprio')),
	ativo BOOLEAN NOT NULL DEFAULT TRUE,
	concedido_por INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_usuario_modulo_acessos_usuario
	ON usuario_modulo_acessos(usuario_id, ativo);

CREATE INDEX IF NOT EXISTS idx_usuario_modulo_acessos_modulo
	ON usuario_modulo_acessos(modulo_key, ativo);

CREATE INDEX IF NOT EXISTS idx_usuario_modulo_acessos_setor
	ON usuario_modulo_acessos(setor_id, ativo)
	WHERE setor_id IS NOT NULL;

DO $$
BEGIN
	IF NOT EXISTS (
		SELECT 1
		FROM pg_constraint
		WHERE conname = 'system_modules_modulo_pai_fk'
	) THEN
		ALTER TABLE system_modules
			ADD CONSTRAINT system_modules_modulo_pai_fk
			FOREIGN KEY (modulo_pai) REFERENCES system_modules(chave) ON DELETE SET NULL;
	END IF;
END $$;

INSERT INTO system_modules (chave, nome_exibicao, descricao, categoria, rota, screen_id, icone, ordem_menu, habilitado, oculto_em_producao)
VALUES
	('singem_adm', 'SINGEM ADM', 'Administração, cadastros gerais, governança e parâmetros globais.', 'central', '/config/', 'configScreen', 'settings-2', 10, TRUE, FALSE),
	('singem_devtools', 'Ferramentas de Desenvolvimento', 'Recursos técnicos restritos a ambiente de desenvolvimento.', 'central', '/system-status/', NULL, 'flask-conical', 15, TRUE, TRUE),
	('gestao_almoxarifado', 'Gestão de Almoxarifado', 'Entradas, saídas, saldos, requisições, inventário e NF-e.', 'setorial', '/almoxarifado', 'almoxarifadoScreen', 'warehouse', 20, TRUE, FALSE),
	('gestao_patrimonio', 'Gestão de Patrimônio', 'Tombamento, transferência, baixa, localização e inventário patrimonial.', 'setorial', '/patrimonio', NULL, 'building-2', 30, TRUE, FALSE),
	('gestao_veiculos', 'Gestão de Veículos', 'Frota, motoristas, reservas, abastecimentos, manutenção e relatórios.', 'setorial', '/veiculos', NULL, 'car-front', 40, TRUE, FALSE),
	('gestao_servicos_internos', 'Gestão de Serviços Internos', 'Ordens de serviço, equipes, acompanhamento, encerramento e relatórios.', 'setorial', '/servicos-internos', NULL, 'briefcase-business', 50, TRUE, FALSE),
	('gestao_contratos', 'Gestão de Contratos', 'Vigência, fiscal, aditivos, alertas, documentos e relatórios.', 'setorial', '/contratos', NULL, 'file-signature', 60, TRUE, FALSE),
	('solicitacao_almoxarifado', 'Solicitação de Almoxarifado', 'Portal geral de requisição de materiais e acompanhamento.', 'solicitacao', '/solicitacoes/almoxarifado', NULL, 'clipboard-list', 70, TRUE, FALSE),
	('solicitacao_veiculos', 'Solicitação de Veículos', 'Portal geral de reservas, deslocamentos e acompanhamento.', 'solicitacao', '/solicitacoes/veiculos', NULL, 'car-taxi-front', 80, TRUE, FALSE),
	('solicitacao_servicos_internos', 'Solicitação de Serviços Internos', 'Portal geral para ordens e demandas de serviços internos.', 'solicitacao', '/solicitacoes/servicos-internos', NULL, 'notebook-tabs', 90, TRUE, FALSE)
ON CONFLICT (chave) DO UPDATE SET
	nome_exibicao = EXCLUDED.nome_exibicao,
	descricao = EXCLUDED.descricao,
	categoria = EXCLUDED.categoria,
	rota = EXCLUDED.rota,
	screen_id = EXCLUDED.screen_id,
	icone = EXCLUDED.icone,
	ordem_menu = EXCLUDED.ordem_menu,
	habilitado = EXCLUDED.habilitado,
	oculto_em_producao = EXCLUDED.oculto_em_producao,
	updated_at = CURRENT_TIMESTAMP;

INSERT INTO perfil_modulo_acessos (perfil, modulo_key, acoes, nivel_escopo)
VALUES
	('admin', 'singem_adm', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar', 'reprocessar'], 'global'),
	('admin', 'singem_devtools', ARRAY['visualizar', 'administrar', 'processar'], 'global'),
	('admin', 'gestao_almoxarifado', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar', 'reprocessar'], 'global'),
	('admin', 'gestao_patrimonio', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar'], 'global'),
	('admin', 'gestao_veiculos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar'], 'global'),
	('admin', 'gestao_servicos_internos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar'], 'global'),
	('admin', 'gestao_contratos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar'], 'global'),
	('admin', 'solicitacao_almoxarifado', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'exportar'], 'global'),
	('admin', 'solicitacao_veiculos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'exportar'], 'global'),
	('admin', 'solicitacao_servicos_internos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'exportar'], 'global'),
	('admin_superior', 'singem_adm', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar', 'reprocessar'], 'global'),
	('admin_superior', 'gestao_almoxarifado', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar', 'reprocessar'], 'global'),
	('admin_superior', 'gestao_patrimonio', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar'], 'global'),
	('admin_superior', 'gestao_veiculos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar'], 'global'),
	('admin_superior', 'gestao_servicos_internos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar'], 'global'),
	('admin_superior', 'gestao_contratos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'importar', 'exportar', 'processar'], 'global'),
	('admin_superior', 'solicitacao_almoxarifado', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'exportar'], 'global'),
	('admin_superior', 'solicitacao_veiculos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'exportar'], 'global'),
	('admin_superior', 'solicitacao_servicos_internos', ARRAY['visualizar', 'cadastrar', 'editar', 'excluir', 'aprovar', 'administrar', 'exportar'], 'global')
ON CONFLICT (perfil, modulo_key) DO UPDATE SET
	acoes = EXCLUDED.acoes,
	nivel_escopo = EXCLUDED.nivel_escopo,
	ativo = TRUE,
	updated_at = CURRENT_TIMESTAMP;

DROP TRIGGER IF EXISTS update_system_modules_updated_at ON system_modules;
CREATE TRIGGER update_system_modules_updated_at BEFORE UPDATE ON system_modules
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_unidades_organizacionais_updated_at ON unidades_organizacionais;
CREATE TRIGGER update_unidades_organizacionais_updated_at BEFORE UPDATE ON unidades_organizacionais
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_setores_organizacionais_updated_at ON setores_organizacionais;
CREATE TRIGGER update_setores_organizacionais_updated_at BEFORE UPDATE ON setores_organizacionais
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuario_escopos_acesso_updated_at ON usuario_escopos_acesso;
CREATE TRIGGER update_usuario_escopos_acesso_updated_at BEFORE UPDATE ON usuario_escopos_acesso
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_perfil_modulo_acessos_updated_at ON perfil_modulo_acessos;
CREATE TRIGGER update_perfil_modulo_acessos_updated_at BEFORE UPDATE ON perfil_modulo_acessos
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_usuario_modulo_acessos_updated_at ON usuario_modulo_acessos;
CREATE TRIGGER update_usuario_modulo_acessos_updated_at BEFORE UPDATE ON usuario_modulo_acessos
	FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
