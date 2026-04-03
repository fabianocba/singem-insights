-- ============================================================================
-- SINGEM - Origem de dados para operacao realista (real x simulado)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'usuarios'
  ) THEN
    ALTER TABLE usuarios
      ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'usuarios_origem_dados_check'
    ) THEN
      ALTER TABLE usuarios
        ADD CONSTRAINT usuarios_origem_dados_check
        CHECK (origem_dados IN ('real', 'simulado'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_usuarios_origem_dados ON usuarios(origem_dados);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'materials'
  ) THEN
    ALTER TABLE materials
      ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'materials_origem_dados_check'
    ) THEN
      ALTER TABLE materials
        ADD CONSTRAINT materials_origem_dados_check
        CHECK (origem_dados IN ('real', 'simulado'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_materials_origem_dados ON materials(origem_dados);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'empenhos'
  ) THEN
    ALTER TABLE empenhos
      ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'empenhos_origem_dados_check'
    ) THEN
      ALTER TABLE empenhos
        ADD CONSTRAINT empenhos_origem_dados_check
        CHECK (origem_dados IN ('real', 'simulado'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_empenhos_origem_dados ON empenhos(origem_dados);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'notas_fiscais'
  ) THEN
    ALTER TABLE notas_fiscais
      ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'notas_fiscais_origem_dados_check'
    ) THEN
      ALTER TABLE notas_fiscais
        ADD CONSTRAINT notas_fiscais_origem_dados_check
        CHECK (origem_dados IN ('real', 'simulado'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_notas_fiscais_origem_dados ON notas_fiscais(origem_dados);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'arquivos'
  ) THEN
    ALTER TABLE arquivos
      ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'arquivos_origem_dados_check'
    ) THEN
      ALTER TABLE arquivos
        ADD CONSTRAINT arquivos_origem_dados_check
        CHECK (origem_dados IN ('real', 'simulado'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_arquivos_origem_dados ON arquivos(origem_dados);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fornecedores_almoxarifado'
  ) THEN
    ALTER TABLE fornecedores_almoxarifado
      ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'fornecedores_almoxarifado_origem_dados_check'
    ) THEN
      ALTER TABLE fornecedores_almoxarifado
        ADD CONSTRAINT fornecedores_almoxarifado_origem_dados_check
        CHECK (origem_dados IN ('real', 'simulado'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_fornecedores_almoxarifado_origem_dados
      ON fornecedores_almoxarifado(origem_dados);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'unidades_organizacionais'
  ) THEN
    ALTER TABLE unidades_organizacionais
      ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'unidades_organizacionais_origem_dados_check'
    ) THEN
      ALTER TABLE unidades_organizacionais
        ADD CONSTRAINT unidades_organizacionais_origem_dados_check
        CHECK (origem_dados IN ('real', 'simulado'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_unidades_organizacionais_origem_dados
      ON unidades_organizacionais(origem_dados);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'setores_organizacionais'
  ) THEN
    ALTER TABLE setores_organizacionais
      ADD COLUMN IF NOT EXISTS origem_dados VARCHAR(20) NOT NULL DEFAULT 'real';

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'setores_organizacionais_origem_dados_check'
    ) THEN
      ALTER TABLE setores_organizacionais
        ADD CONSTRAINT setores_organizacionais_origem_dados_check
        CHECK (origem_dados IN ('real', 'simulado'));
    END IF;

    CREATE INDEX IF NOT EXISTS idx_setores_organizacionais_origem_dados
      ON setores_organizacionais(origem_dados);
  END IF;
END $$;
