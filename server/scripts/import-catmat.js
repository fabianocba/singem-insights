#!/usr/bin/env node
/**
 * Script de Importação CATMAT - SINGEM
 *
 * Importa dados do CATMAT a partir de arquivo CSV baixado do Portal de Compras
 *
 * USO:
 *   node scripts/import-catmat.js [caminho-arquivo.csv]
 *
 * Se caminho não for especificado, usa CATMAT_IMPORT_PATH do .env
 *
 * FORMATO CSV ESPERADO (separador: ;):
 *   CÓDIGO;DESCRIÇÃO;UNIDADE;GRUPO;CLASSE;SUSTENTÁVEL
 *   453210;PAPEL A4 BRANCO 75G/M2;RESMA;MATERIAL DE EXPEDIENTE;PAPEL;N
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const db = require('../config/database');
const { config } = require('../config');

// Configurações
const BATCH_SIZE = 500;
const SEPARADOR = ';';

// Estatísticas
const stats = {
  totalLinhas: 0,
  importados: 0,
  atualizados: 0,
  erros: 0,
  errosDetalhes: []
};

/**
 * Normaliza valor de célula CSV
 */
function normalizeValue(value) {
  if (!value) {
    return null;
  }
  return value.trim().replace(/^"|"$/g, '').trim();
}

/**
 * Processa uma linha do CSV
 */
function parseLine(line, headers) {
  const values = line.split(SEPARADOR);
  const obj = {};

  headers.forEach((header, index) => {
    obj[header.toLowerCase().trim()] = normalizeValue(values[index]);
  });

  return obj;
}

/**
 * Converte linha CSV para objeto do banco
 */
function toMaterial(row) {
  // Tenta mapear diferentes formatos de CSV do Portal de Compras
  const codigo = row.codigo || row['código'] || row.catmat || row.cod_item;
  const descricao = row.descricao || row['descrição'] || row.descr_item || row.desc_material;
  const unidade = row.unidade || row.unid_fornecimento || row.un || 'UN';
  const grupo = row.grupo || row.nome_grupo || row.catmat_grupo;
  const classe = row.classe || row.nome_classe || row.catmat_classe;
  const sustentavel = ['S', 'SIM', 'TRUE', '1', 'Y', 'YES'].includes(
    (row.sustentavel || row['sustentável'] || row.item_sustentavel || 'N').toUpperCase()
  );

  if (!codigo || !descricao) {
    return null;
  }

  return {
    codigo: String(codigo).replace(/\D/g, ''),
    catmat_id: parseInt(String(codigo).replace(/\D/g, '')) || null,
    descricao: descricao.substring(0, 500),
    unidade: (unidade || 'UN').substring(0, 20).toUpperCase(),
    catmat_grupo: grupo?.substring(0, 100) || null,
    catmat_classe: classe?.substring(0, 100) || null,
    catmat_padrao_desc: descricao.substring(0, 500),
    catmat_sustentavel: sustentavel,
    fonte: 'catmat_import',
    ativo: true
  };
}

/**
 * Processa batch de materiais via UPSERT
 */
async function processBatch(client, materials) {
  if (materials.length === 0) {
    return;
  }

  for (const mat of materials) {
    try {
      // UPSERT: insere ou atualiza se código já existe
      await client.query(
        `
        INSERT INTO materials (
          codigo, catmat_id, descricao, unidade,
          catmat_grupo, catmat_classe, catmat_padrao_desc,
          catmat_sustentavel, fonte, ativo, catmat_atualizado_em
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        ON CONFLICT (codigo) DO UPDATE SET
          catmat_id = COALESCE(EXCLUDED.catmat_id, materials.catmat_id),
          descricao = EXCLUDED.descricao,
          unidade = EXCLUDED.unidade,
          catmat_grupo = EXCLUDED.catmat_grupo,
          catmat_classe = EXCLUDED.catmat_classe,
          catmat_padrao_desc = EXCLUDED.catmat_padrao_desc,
          catmat_sustentavel = EXCLUDED.catmat_sustentavel,
          fonte = EXCLUDED.fonte,
          catmat_atualizado_em = NOW(),
          updated_at = NOW()
      `,
        [
          mat.codigo,
          mat.catmat_id,
          mat.descricao,
          mat.unidade,
          mat.catmat_grupo,
          mat.catmat_classe,
          mat.catmat_padrao_desc,
          mat.catmat_sustentavel,
          mat.fonte,
          mat.ativo
        ]
      );

      stats.importados++;
    } catch (err) {
      stats.erros++;
      if (stats.errosDetalhes.length < 100) {
        stats.errosDetalhes.push({
          codigo: mat.codigo,
          erro: err.message
        });
      }
    }
  }
}

/**
 * Registra log de importação
 */
async function logImport(client, arquivo, duracao, status, erro = null) {
  await client.query(
    `
    INSERT INTO catmat_import_log (
      arquivo_fonte, total_linhas, importados, atualizados, erros,
      erros_detalhes, duracao_ms, status, erro_mensagem, finished_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
  `,
    [
      arquivo,
      stats.totalLinhas,
      stats.importados,
      stats.atualizados,
      stats.erros,
      JSON.stringify(stats.errosDetalhes.slice(0, 100)),
      duracao,
      status,
      erro
    ]
  );
}

/**
 * Importa arquivo CSV
 */
async function importCSV(filePath) {
  const startTime = Date.now();
  const client = await db.pool.connect();

  console.log('╔═════════════════════════════════════════════════════╗');
  console.log('║         📦 IMPORTAÇÃO CATMAT - SINGEM               ║');
  console.log('╚═════════════════════════════════════════════════════╝');
  console.log('');
  console.log(`📁 Arquivo: ${filePath}`);
  console.log('');

  try {
    // Verifica se arquivo existe
    if (!fs.existsSync(filePath)) {
      throw new Error(`Arquivo não encontrado: ${filePath}`);
    }

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let headers = null;
    let batch = [];
    let lineNumber = 0;

    for await (const line of rl) {
      lineNumber++;

      // Primeira linha = headers
      if (!headers) {
        headers = line.split(SEPARADOR).map((h) => h.trim().replace(/^"|"$/g, ''));
        console.log(`📋 Colunas detectadas: ${headers.join(', ')}`);
        console.log('');
        continue;
      }

      // Ignora linhas vazias
      if (!line.trim()) {
        continue;
      }

      stats.totalLinhas++;

      try {
        const row = parseLine(line, headers);
        const material = toMaterial(row);

        if (material) {
          batch.push(material);
        } else {
          stats.erros++;
          if (stats.errosDetalhes.length < 100) {
            stats.errosDetalhes.push({
              linha: lineNumber,
              erro: 'Código ou descrição ausente'
            });
          }
        }

        // Processa batch
        if (batch.length >= BATCH_SIZE) {
          await processBatch(client, batch);
          process.stdout.write(
            `\r⏳ Processando... ${stats.totalLinhas} linhas (${stats.importados} OK, ${stats.erros} erros)`
          );
          batch = [];
        }
      } catch (err) {
        stats.erros++;
        if (stats.errosDetalhes.length < 100) {
          stats.errosDetalhes.push({
            linha: lineNumber,
            erro: err.message
          });
        }
      }
    }

    // Processa último batch
    if (batch.length > 0) {
      await processBatch(client, batch);
    }

    const duracao = Date.now() - startTime;

    // Registra log
    await logImport(client, filePath, duracao, 'concluido');

    console.log('\n');
    console.log('╔═════════════════════════════════════════════════════╗');
    console.log('║                  ✅ IMPORTAÇÃO CONCLUÍDA            ║');
    console.log('╠═════════════════════════════════════════════════════╣');
    console.log(`║  📊 Total de linhas:  ${String(stats.totalLinhas).padEnd(29)}║`);
    console.log(`║  ✅ Importados:       ${String(stats.importados).padEnd(29)}║`);
    console.log(`║  ❌ Erros:            ${String(stats.erros).padEnd(29)}║`);
    console.log(`║  ⏱️  Tempo:           ${String(duracao + 'ms').padEnd(29)}║`);
    console.log('╚═════════════════════════════════════════════════════╝');

    if (stats.errosDetalhes.length > 0) {
      console.log('\n⚠️ Primeiros erros:');
      stats.errosDetalhes.slice(0, 5).forEach((e) => {
        console.log(`   - Linha ${e.linha || e.codigo}: ${e.erro}`);
      });
    }
  } catch (err) {
    const duracao = Date.now() - startTime;
    await logImport(client, filePath, duracao, 'erro', err.message).catch(() => {});

    console.error('\n❌ ERRO NA IMPORTAÇÃO:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await db.pool.end();
  }
}

// ============================================================================
// EXECUÇÃO
// ============================================================================

// Pega caminho do arquivo (argumento ou ENV)
const arquivoArg = process.argv[2];
const arquivoEnv = config.catmatImportPath;

let arquivoFinal = arquivoArg || arquivoEnv;

if (!arquivoFinal) {
  console.error('❌ Erro: Caminho do arquivo CSV não especificado.');
  console.log('');
  console.log('USO:');
  console.log('  node scripts/import-catmat.js ./data/catmat/catmat.csv');
  console.log('');
  console.log('Ou defina CATMAT_IMPORT_PATH no arquivo .env');
  process.exit(1);
}

// Resolve caminho relativo
if (!path.isAbsolute(arquivoFinal)) {
  arquivoFinal = path.join(__dirname, '..', arquivoFinal);
}

importCSV(arquivoFinal).catch((err) => {
  console.error('❌ Erro fatal:', err);
  process.exit(1);
});
