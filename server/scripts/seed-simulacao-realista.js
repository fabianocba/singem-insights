/* eslint-disable no-console */
const bcrypt = require('bcrypt');
const db = require('../config/database');
const { config } = require('../config');
const fileStorageService = require('../src/services/fileStorageService');
const { bootstrapStorageDirectories } = require('../src/bootstrap/storageBootstrap');

const ORIGEM_SIMULADA = 'simulado';
const SALT_ROUNDS = 10;

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

function enforceSafetyRules() {
  if (!APPLY) {
    console.log('[SEED][DRY-RUN] Use --apply para executar escrita no banco/arquivos.');
    return;
  }

  const env = String(config.env || process.env.NODE_ENV || 'development').toLowerCase();
  if (env === 'production' && process.env.ALLOW_SIMULATED_SEED !== 'true') {
    throw new Error(
      'Execucao bloqueada em producao. Defina ALLOW_SIMULATED_SEED=true para confirmar operacao conscientemente.'
    );
  }
}

async function columnExists(tableName, columnName) {
  const result = await db.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
      LIMIT 1`,
    [tableName, columnName]
  );

  return result.rowCount > 0;
}

async function tableExists(tableName) {
  const result = await db.query(
    `SELECT 1
       FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = $1
      LIMIT 1`,
    [tableName]
  );

  return result.rowCount > 0;
}

function fakeCnpj(seed) {
  const base = String(seed).replace(/\D/g, '').padStart(12, '0').slice(0, 12);
  return `${base}0001`.slice(0, 14);
}

function buildAccessKey(nfNumber, idx) {
  const stem = `29${new Date().getFullYear()}55${String(nfNumber).padStart(9, '0')}0001000${idx}`;
  return stem.padEnd(44, '7').slice(0, 44);
}

async function ensureUnidades() {
  const payload = [
    { codigo: 'SIM-REITORIA', nome: 'Reitoria IF Baiano (Simulada)', sigla: 'RT-SIM' },
    { codigo: 'SIM-CGB', nome: 'Campus Guanambi (Simulado)', sigla: 'CGB-SIM' },
    { codigo: 'SIM-SER', nome: 'Campus Senhor do Bonfim (Simulado)', sigla: 'CSB-SIM' }
  ];

  let inserted = 0;
  const rows = [];
  for (const item of payload) {
    if (APPLY) {
      await db.query(
        `INSERT INTO unidades_organizacionais (codigo, nome, sigla, ativo, origem_dados)
         VALUES ($1, $2, $3, TRUE, $4)
         ON CONFLICT DO NOTHING`,
        [item.codigo, item.nome, item.sigla, ORIGEM_SIMULADA]
      );
    }

    const current = await db.query(
      `SELECT id, codigo, nome
         FROM unidades_organizacionais
        WHERE codigo = $1
          AND origem_dados = $2
        LIMIT 1`,
      [item.codigo, ORIGEM_SIMULADA]
    );

    if (current.rowCount > 0) {
      rows.push(current.rows[0]);
      inserted += 1;
    }
  }

  return { rows, count: inserted };
}

async function ensureUsuarios(unidades) {
  const unidadePrincipal = unidades[0]?.id || null;
  const users = [
    {
      login: 'sim.admin',
      email: 'sim.admin@demo.ifbaiano.edu.br',
      nome: 'Administrador Simulacao',
      perfil: 'admin_superior',
      senha: 'Simulacao@2026'
    },
    {
      login: 'sim.almox',
      email: 'sim.almox@demo.ifbaiano.edu.br',
      nome: 'Almoxarife Simulacao',
      perfil: 'almoxarife',
      senha: 'Simulacao@2026'
    },
    {
      login: 'sim.conferente',
      email: 'sim.conferente@demo.ifbaiano.edu.br',
      nome: 'Conferente Simulacao',
      perfil: 'conferente',
      senha: 'Simulacao@2026'
    }
  ];

  const hasAuthProvider = await columnExists('usuarios', 'auth_provider');
  const hasOrigem = await columnExists('usuarios', 'origem_dados');

  const insertedRows = [];

  for (const u of users) {
    const senhaHash = await bcrypt.hash(u.senha, SALT_ROUNDS);
    if (APPLY) {
      const cols = ['login', 'email', 'senha_hash', 'nome', 'perfil', 'ativo'];
      const vals = [u.login, u.email, senhaHash, u.nome, u.perfil, true];

      if (hasAuthProvider) {
        cols.push('auth_provider');
        vals.push('local');
      }
      if (hasOrigem) {
        cols.push('origem_dados');
        vals.push(ORIGEM_SIMULADA);
      }

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      await db.query(
        `INSERT INTO usuarios (${cols.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT (login) DO NOTHING`,
        vals
      );
    }

    const lookup = await db.query(
      `SELECT id, login, perfil
         FROM usuarios
        WHERE login = $1
          ${hasOrigem ? 'AND origem_dados = $2' : ''}
        LIMIT 1`,
      hasOrigem ? [u.login, ORIGEM_SIMULADA] : [u.login]
    );

    if (lookup.rowCount > 0) {
      insertedRows.push(lookup.rows[0]);
    }
  }

  if (APPLY && unidadePrincipal && (await tableExists('usuario_escopos_acesso'))) {
    for (const usr of insertedRows) {
      await db.query(
        `INSERT INTO usuario_escopos_acesso (usuario_id, unidade_id, nivel_escopo, perfil_escopo, principal, ativo)
         VALUES ($1, $2, 'unidade', 'gestor', TRUE, TRUE)
         ON CONFLICT DO NOTHING`,
        [usr.id, unidadePrincipal]
      );
    }
  }

  return insertedRows;
}

async function ensureFornecedores() {
  const fornecedores = [
    {
      cnpj: fakeCnpj('111111111111'),
      razao: 'Comercial Horizonte Escolar LTDA',
      fantasia: 'Horizonte Escolar'
    },
    {
      cnpj: fakeCnpj('222222222222'),
      razao: 'Nordeste Suprimentos Publicos EIRELI',
      fantasia: 'Nordeste Suprimentos'
    },
    {
      cnpj: fakeCnpj('333333333333'),
      razao: 'Bahia Distribuidora Institucional S.A.',
      fantasia: 'BDI Institucional'
    }
  ];

  const rows = [];
  for (const f of fornecedores) {
    if (APPLY) {
      await db.query(
        `INSERT INTO fornecedores_almoxarifado
          (cnpj, razao_social, nome_fantasia, email, telefone, ativo, origem_dados)
         VALUES ($1, $2, $3, $4, $5, TRUE, $6)
         ON CONFLICT DO NOTHING`,
        [
          f.cnpj,
          f.razao,
          f.fantasia,
          `contato@${f.fantasia.toLowerCase().replace(/[^a-z0-9]+/g, '')}.demo`,
          '(77) 99999-0000',
          ORIGEM_SIMULADA
        ]
      );
    }

    const current = await db.query(
      `SELECT id, cnpj, razao_social
         FROM fornecedores_almoxarifado
        WHERE cnpj = $1
          AND origem_dados = $2
        LIMIT 1`,
      [f.cnpj, ORIGEM_SIMULADA]
    );

    if (current.rowCount > 0) {
      rows.push(current.rows[0]);
    }
  }

  return rows;
}

async function ensureMaterials(fornecedores) {
  const cat = [
    ['SIM-MAT-0001', '[SIM] Papel A4 75g - resma 500 folhas', 'UN', '339030', '16'],
    ['SIM-MAT-0002', '[SIM] Caneta esferografica azul caixa com 50', 'CX', '339030', '16'],
    ['SIM-MAT-0003', '[SIM] Toner impressora institucional preto', 'UN', '339030', '17'],
    ['SIM-MAT-0004', '[SIM] Agua mineral 20L', 'UN', '339030', '07'],
    ['SIM-MAT-0005', '[SIM] Alcool etilico 70% 1L', 'UN', '339030', '22'],
    ['SIM-MAT-0006', '[SIM] Cabo de rede cat6 2m', 'UN', '339030', '17'],
    ['SIM-MAT-0007', '[SIM] Mouse optico USB', 'UN', '339030', '17'],
    ['SIM-MAT-0008', '[SIM] Teclado ABNT2 USB', 'UN', '339030', '17']
  ];

  const hasFornecedorPreferencial = await columnExists('materials', 'fornecedor_preferencial_id');
  const fornecedorPreferencial = fornecedores[0]?.id || null;

  const rows = [];
  for (const item of cat) {
    const [codigo, descricao, unidade, natureza, subelemento] = item;

    if (APPLY) {
      const cols = ['codigo', 'descricao', 'unidade', 'natureza_despesa', 'subelemento', 'ativo', 'origem_dados'];
      const vals = [codigo, descricao, unidade, natureza, subelemento, true, ORIGEM_SIMULADA];

      if (hasFornecedorPreferencial) {
        cols.push('fornecedor_preferencial_id');
        vals.push(fornecedorPreferencial);
      }

      const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
      await db.query(
        `INSERT INTO materials (${cols.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT DO NOTHING`,
        vals
      );
    }

    const current = await db.query(
      `SELECT id, codigo, descricao
         FROM materials
        WHERE codigo = $1
          AND origem_dados = $2
        LIMIT 1`,
      [codigo, ORIGEM_SIMULADA]
    );

    if (current.rowCount > 0) {
      rows.push(current.rows[0]);
    }
  }

  return rows;
}

async function ensureEmpenhos(users, fornecedores) {
  const hasOrigem = await columnExists('empenhos', 'origem_dados');
  const hasModo = await columnExists('empenhos', 'modo_registro');
  const hasUnidade = await columnExists('empenhos', 'unidade_id');
  const unidadeSimulada = await db.query(
    `SELECT id
       FROM unidades_organizacionais
      WHERE codigo = 'SIM-CGB'
        AND origem_dados = $1
      LIMIT 1`,
    [ORIGEM_SIMULADA]
  );

  const unidadeId = unidadeSimulada.rows[0]?.id || null;
  const criador = users.find((u) => u.login === 'sim.admin')?.id || users[0]?.id || null;
  const ano = new Date().getFullYear();
  const base = [980001, 980002, 980003, 980004, 980005, 980006];
  const rows = [];

  for (let i = 0; i < base.length; i += 1) {
    const numero = String(base[i]);
    const slug = `${ano}-NE-${numero}`;
    const fornecedor = fornecedores[i % fornecedores.length];
    const valorTotal = Number((2000 + i * 850.45).toFixed(2));
    const status = i % 3 === 0 ? 'validado' : 'rascunho';

    if (APPLY) {
      const cols = [
        'numero',
        'ano',
        'slug',
        'data_empenho',
        'fornecedor',
        'cnpj_fornecedor',
        'valor_total',
        'natureza_despesa',
        'processo_suap',
        'status_validacao',
        'created_by'
      ];

      const vals = [
        numero,
        ano,
        slug,
        new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
        fornecedor.razao_social,
        fornecedor.cnpj,
        valorTotal,
        '339030',
        `SIM-PROC-${ano}-${numero}`,
        status,
        criador
      ];

      if (hasModo) {
        cols.push('modo_registro');
        vals.push('simulado');
      }
      if (hasOrigem) {
        cols.push('origem_dados');
        vals.push(ORIGEM_SIMULADA);
      }
      if (hasUnidade && unidadeId) {
        cols.push('unidade_id');
        vals.push(unidadeId);
      }

      const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
      await db.query(
        `INSERT INTO empenhos (${cols.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT (ano, numero) DO NOTHING`,
        vals
      );
    }

    const current = await db.query(
      `SELECT id, numero, ano, fornecedor, cnpj_fornecedor
         FROM empenhos
        WHERE ano = $1
          AND numero = $2
          ${hasOrigem ? 'AND origem_dados = $3' : ''}
        LIMIT 1`,
      hasOrigem ? [ano, numero, ORIGEM_SIMULADA] : [ano, numero]
    );

    if (current.rowCount > 0) {
      rows.push(current.rows[0]);
    }
  }

  return rows;
}

async function ensureEmpenhoItems(empenhos, materials) {
  let created = 0;

  for (const empenho of empenhos) {
    const exists = await db.query(
      `SELECT 1
         FROM empenho_items
        WHERE empenho_id = $1
          AND descricao ILIKE '[SIM] %'
        LIMIT 1`,
      [empenho.id]
    );

    if (exists.rowCount > 0 || !APPLY) {
      continue;
    }

    for (let i = 0; i < 3; i += 1) {
      const mat = materials[(i + empenho.id) % materials.length];
      const quantidade = 10 + i * 5;
      const valorUnitario = Number((15 + i * 7.35).toFixed(4));
      await db.query(
        `INSERT INTO empenho_items (
          empenho_id,
          material_id,
          item_numero,
          descricao,
          unidade,
          quantidade,
          valor_unitario,
          saldo_quantidade,
          saldo_valor,
          natureza_despesa,
          subelemento
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          empenho.id,
          mat.id,
          i + 1,
          mat.descricao,
          'UN',
          quantidade,
          valorUnitario,
          quantidade,
          Number((quantidade * valorUnitario).toFixed(2)),
          '339030',
          '16'
        ]
      );
      created += 1;
    }
  }

  return created;
}

async function ensureNotasFiscais(empenhos, users) {
  const hasOrigem = await columnExists('notas_fiscais', 'origem_dados');
  const hasModo = await columnExists('notas_fiscais', 'modo_registro');
  const createdBy = users.find((u) => u.login === 'sim.conferente')?.id || users[0]?.id || null;
  const rows = [];

  for (let i = 0; i < empenhos.length; i += 1) {
    const emp = empenhos[i];
    const nfNumero = `77${String(emp.numero).slice(-4)}`;
    const chave = buildAccessKey(nfNumero, i + 1);
    const status = i % 2 === 0 ? 'recebida' : 'conferida';

    if (APPLY) {
      const cols = [
        'empenho_id',
        'numero',
        'serie',
        'chave_acesso',
        'data_emissao',
        'data_entrada',
        'fornecedor',
        'cnpj_fornecedor',
        'valor_total',
        'status',
        'created_by',
        'observacoes'
      ];
      const vals = [
        emp.id,
        nfNumero,
        '1',
        chave,
        new Date(Date.now() - i * 43200000).toISOString().slice(0, 10),
        new Date().toISOString().slice(0, 10),
        emp.fornecedor,
        emp.cnpj_fornecedor,
        Number((900 + i * 120.3).toFixed(2)),
        status,
        createdBy,
        '[SIM] Nota fiscal para demonstracao operacional'
      ];

      if (hasModo) {
        cols.push('modo_registro');
        vals.push('simulado');
      }
      if (hasOrigem) {
        cols.push('origem_dados');
        vals.push(ORIGEM_SIMULADA);
      }

      const placeholders = cols.map((_, idx) => `$${idx + 1}`).join(', ');
      await db.query(
        `INSERT INTO notas_fiscais (${cols.join(', ')})
         VALUES (${placeholders})
         ON CONFLICT (chave_acesso) DO NOTHING`,
        vals
      );
    }

    const current = await db.query(
      `SELECT id, numero, chave_acesso, empenho_id
         FROM notas_fiscais
        WHERE chave_acesso = $1
          ${hasOrigem ? 'AND origem_dados = $2' : ''}
        LIMIT 1`,
      hasOrigem ? [chave, ORIGEM_SIMULADA] : [chave]
    );

    if (current.rowCount > 0) {
      rows.push(current.rows[0]);
    }
  }

  return rows;
}

async function ensureNotaItems(notas, materials) {
  let created = 0;

  for (const nota of notas) {
    const exists = await db.query(
      `SELECT 1
         FROM nota_fiscal_items
        WHERE nota_fiscal_id = $1
          AND descricao ILIKE '[SIM] %'
        LIMIT 1`,
      [nota.id]
    );

    if (exists.rowCount > 0 || !APPLY) {
      continue;
    }

    for (let i = 0; i < 2; i += 1) {
      const material = materials[(nota.id + i) % materials.length];
      const quantidade = 2 + i;
      const valorUnitario = Number((45.4 + i * 10.2).toFixed(4));

      await db.query(
        `INSERT INTO nota_fiscal_items (
          nota_fiscal_id,
          material_id,
          item_numero,
          codigo_produto,
          descricao,
          unidade,
          quantidade,
          valor_unitario,
          ncm,
          cfop,
          valor_icms,
          valor_ipi
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          nota.id,
          material.id,
          i + 1,
          material.codigo,
          material.descricao,
          'UN',
          quantidade,
          valorUnitario,
          '84713012',
          '5102',
          Number((valorUnitario * quantidade * 0.12).toFixed(2)),
          Number((valorUnitario * quantidade * 0.04).toFixed(2))
        ]
      );
      created += 1;
    }
  }

  return created;
}

async function ensureArquivoVinculado(params) {
  const { modulo, categoria, entidadeTipo, entidadeId, nomeOriginal, mimeType, conteudo, usuarioId } = params;
  const existing = await db.query(
    `SELECT id
       FROM arquivos
      WHERE modulo = $1
        AND categoria = $2
        AND entidade_tipo = $3
        AND entidade_id = $4
        AND nome_original = $5
        AND status <> 'excluido'
      LIMIT 1`,
    [modulo, categoria, entidadeTipo, String(entidadeId), nomeOriginal]
  );

  if (existing.rowCount > 0 || !APPLY) {
    return false;
  }

  await fileStorageService.saveBuffer({
    buffer: Buffer.from(conteudo, 'utf8'),
    originalName: nomeOriginal,
    mimeType,
    modulo,
    categoria,
    entidadeTipo,
    entidadeId,
    usuarioCriador: usuarioId,
    prefix: 'SIM',
    modoRegistro: 'simulado'
  });

  await db.query(
    `UPDATE arquivos
        SET origem_dados = $1
      WHERE modulo = $2
        AND categoria = $3
        AND entidade_tipo = $4
        AND entidade_id = $5
        AND nome_original = $6`,
    [ORIGEM_SIMULADA, modulo, categoria, entidadeTipo, String(entidadeId), nomeOriginal]
  );

  return true;
}

async function ensureArquivos(empenhos, notas, fornecedores, materials, users) {
  let created = 0;
  const userId = users[0]?.id || null;

  for (const emp of empenhos.slice(0, 4)) {
    // Categoria pdf aqui representa anexo funcional do empenho, com MIME controlado para ambiente de testes.
    const done = await ensureArquivoVinculado({
      modulo: 'empenhos',
      categoria: 'pdf',
      entidadeTipo: 'empenho',
      entidadeId: emp.id,
      nomeOriginal: `sim-empenho-${emp.numero}.txt`,
      mimeType: 'text/plain',
      conteudo: `[SIM] Documento auxiliar do empenho ${emp.numero}`,
      usuarioId: userId
    });
    if (done) {
      created += 1;
    }
  }

  for (const nf of notas.slice(0, 4)) {
    const done = await ensureArquivoVinculado({
      modulo: 'notas-fiscais',
      categoria: 'anexo',
      entidadeTipo: 'nota_fiscal',
      entidadeId: nf.id,
      nomeOriginal: `sim-nf-${nf.numero}.txt`,
      mimeType: 'text/plain',
      conteudo: `[SIM] Anexo funcional da NF ${nf.numero}`,
      usuarioId: userId
    });
    if (done) {
      created += 1;
    }
  }

  for (const forn of fornecedores.slice(0, 2)) {
    const done = await ensureArquivoVinculado({
      modulo: 'anexos',
      categoria: 'fornecedor',
      entidadeTipo: 'fornecedor_almoxarifado',
      entidadeId: forn.id,
      nomeOriginal: `sim-fornecedor-${forn.id}.txt`,
      mimeType: 'text/plain',
      conteudo: `[SIM] Documento cadastral do fornecedor ${forn.razao_social}`,
      usuarioId: userId
    });
    if (done) {
      created += 1;
    }
  }

  for (const mat of materials.slice(0, 2)) {
    const done = await ensureArquivoVinculado({
      modulo: 'anexos',
      categoria: 'material',
      entidadeTipo: 'material',
      entidadeId: mat.id,
      nomeOriginal: `sim-material-${mat.codigo}.txt`,
      mimeType: 'text/plain',
      conteudo: `[SIM] Ficha tecnica do material ${mat.codigo}`,
      usuarioId: userId
    });
    if (done) {
      created += 1;
    }
  }

  return created;
}

async function printResumo() {
  const [users, unidades, fornecedores, materials, empenhos, notas, arquivos] = await Promise.all([
    db.query(`SELECT COUNT(*) AS total FROM usuarios WHERE origem_dados = $1`, [ORIGEM_SIMULADA]),
    db.query(`SELECT COUNT(*) AS total FROM unidades_organizacionais WHERE origem_dados = $1`, [ORIGEM_SIMULADA]),
    db.query(`SELECT COUNT(*) AS total FROM fornecedores_almoxarifado WHERE origem_dados = $1`, [ORIGEM_SIMULADA]),
    db.query(`SELECT COUNT(*) AS total FROM materials WHERE origem_dados = $1`, [ORIGEM_SIMULADA]),
    db.query(`SELECT COUNT(*) AS total FROM empenhos WHERE origem_dados = $1`, [ORIGEM_SIMULADA]),
    db.query(`SELECT COUNT(*) AS total FROM notas_fiscais WHERE origem_dados = $1`, [ORIGEM_SIMULADA]),
    db.query(`SELECT COUNT(*) AS total FROM arquivos WHERE origem_dados = $1 AND status <> 'excluido'`, [
      ORIGEM_SIMULADA
    ])
  ]);

  console.log('');
  console.log('[SEED] Totais de dados simulados persistidos');
  console.log(`  usuarios: ${users.rows[0].total}`);
  console.log(`  unidades: ${unidades.rows[0].total}`);
  console.log(`  fornecedores: ${fornecedores.rows[0].total}`);
  console.log(`  materiais: ${materials.rows[0].total}`);
  console.log(`  empenhos: ${empenhos.rows[0].total}`);
  console.log(`  notas fiscais: ${notas.rows[0].total}`);
  console.log(`  arquivos: ${arquivos.rows[0].total}`);
}

async function main() {
  console.log('[SEED] Iniciando carga de simulacao operacional realista');
  console.log(`[SEED] Modo: ${APPLY ? 'APPLY' : 'DRY-RUN'}`);

  enforceSafetyRules();

  const connected = await db.testConnection();
  if (!connected) {
    throw new Error('Falha de conexao com PostgreSQL.');
  }

  await db.runMigrations();

  if (!APPLY) {
    await printResumo();
    return;
  }

  await bootstrapStorageDirectories({ strict: false });

  const unidades = await ensureUnidades();
  const usuarios = await ensureUsuarios(unidades.rows);
  const fornecedores = await ensureFornecedores();
  const materials = await ensureMaterials(fornecedores);
  const empenhos = await ensureEmpenhos(usuarios, fornecedores);
  const totalEmpenhoItems = await ensureEmpenhoItems(empenhos, materials);
  const notas = await ensureNotasFiscais(empenhos, usuarios);
  const totalNotaItems = await ensureNotaItems(notas, materials);
  const totalArquivos = await ensureArquivos(empenhos, notas, fornecedores, materials, usuarios);

  console.log('');
  console.log('[SEED] Carga aplicada com sucesso.');
  console.log(`[SEED] Unidades simuladas ativas: ${unidades.count}`);
  console.log(`[SEED] Usuarios simulados ativos: ${usuarios.length}`);
  console.log(`[SEED] Fornecedores simulados ativos: ${fornecedores.length}`);
  console.log(`[SEED] Materiais simulados ativos: ${materials.length}`);
  console.log(`[SEED] Empenhos simulados ativos: ${empenhos.length}`);
  console.log(`[SEED] Itens de empenho inseridos nesta execucao: ${totalEmpenhoItems}`);
  console.log(`[SEED] Notas fiscais simuladas ativas: ${notas.length}`);
  console.log(`[SEED] Itens de NF inseridos nesta execucao: ${totalNotaItems}`);
  console.log(`[SEED] Arquivos vinculados inseridos nesta execucao: ${totalArquivos}`);

  await printResumo();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[SEED][ERRO]', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  });
