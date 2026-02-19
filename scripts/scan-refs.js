/**
 * IFDESK - Script de Análise de Referências
 *
 * Escaneia o projeto para encontrar arquivos órfãos
 * (não referenciados em nenhum import ou script tag)
 */

const fs = require('fs');
const path = require('path');

// Configuração
const ROOT_DIR = path.resolve(__dirname, '..');
const EXTENSIONS_TO_SCAN = ['.js', '.html', '.css'];
const EXTENSIONS_TO_CHECK = ['.js', '.css', '.json', '.md'];

// Pastas a ignorar
const IGNORE_DIRS = ['node_modules', '.git', '.vscode', 'backup', 'dist', 'build'];

// Padrões de referência
const PATTERNS = {
  scriptTag: /<script[^>]+src=["']([^"']+)["']/g,
  importStatement: /import\s+.*?from\s+["']([^"']+)["']/g,
  requireStatement: /require\s*\(\s*["']([^"']+)["']\s*\)/g,
  linkTag: /<link[^>]+href=["']([^"']+)["']/g,
  cssUrl: /url\s*\(\s*["']?([^"')]+)["']?\s*\)/g
};

/**
 * Obtém todos os arquivos do projeto
 */
function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      // Ignora pastas específicas
      if (IGNORE_DIRS.includes(file)) {
        return;
      }
      getAllFiles(filePath, fileList);
    } else {
      const ext = path.extname(file);
      if (EXTENSIONS_TO_CHECK.includes(ext)) {
        fileList.push(filePath);
      }
    }
  });

  return fileList;
}

/**
 * Escaneia arquivo em busca de referências
 */
function scanFileForReferences(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const references = new Set();

  Object.values(PATTERNS).forEach((pattern) => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      references.add(match[1]);
    }
  });

  return Array.from(references);
}

/**
 * Normaliza caminho de referência
 */
function resolveReferencePath(ref, fromFile) {
  // Remove query strings e hashes
  ref = ref.split('?')[0].split('#')[0];

  // Ignora URLs externas
  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return null;
  }

  // Ignora data URIs
  if (ref.startsWith('data:')) {
    return null;
  }

  // Resolve caminho relativo
  const fromDir = path.dirname(fromFile);
  const resolved = path.resolve(fromDir, ref);

  // Normaliza para separadores do sistema
  return path.normalize(resolved);
}

/**
 * Análise principal
 */
function analyzeProject() {
  console.log('🔍 Escaneando projeto IFDESK...\n');

  const allFiles = getAllFiles(ROOT_DIR);
  const referenced = new Set();

  console.log(`📦 Total de arquivos encontrados: ${allFiles.length}\n`);

  // Escaneia cada arquivo em busca de referências
  allFiles.forEach((file) => {
    const ext = path.extname(file);

    if (!EXTENSIONS_TO_SCAN.includes(ext)) {
      return;
    }

    const refs = scanFileForReferences(file);

    refs.forEach((ref) => {
      const resolved = resolveReferencePath(ref, file);
      if (resolved && fs.existsSync(resolved)) {
        referenced.add(resolved);
      }
    });
  });

  console.log(`✅ Arquivos referenciados: ${referenced.size}\n`);

  // Encontra órfãos
  const orphans = allFiles.filter((file) => {
    // Sempre considera index.html como referenciado
    if (file.endsWith('index.html')) {
      return false;
    }

    // Ignora arquivos de configuração
    if (
      file.endsWith('.editorconfig') ||
      file.endsWith('.eslintrc.json') ||
      file.endsWith('.prettierrc.json') ||
      file.endsWith('.prettierignore')
    ) {
      return false;
    }

    // Ignora README e documentação principal
    if (file.endsWith('README.md') || file.endsWith('CHANGELOG.md')) {
      return false;
    }

    return !referenced.has(file);
  });

  // Relatório
  console.log('========================================');
  console.log('📊 RELATÓRIO DE ARQUIVOS ÓRFÃOS');
  console.log('========================================\n');

  if (orphans.length === 0) {
    console.log('✅ Nenhum arquivo órfão encontrado!\n');
  } else {
    console.log(`⚠️  ${orphans.length} arquivo(s) potencialmente órfão(s):\n`);

    // Agrupa por extensão
    const byExtension = {};
    orphans.forEach((file) => {
      const ext = path.extname(file);
      if (!byExtension[ext]) {
        byExtension[ext] = [];
      }
      byExtension[ext].push(path.relative(ROOT_DIR, file));
    });

    // Mostra agrupado
    Object.entries(byExtension).forEach(([ext, files]) => {
      console.log(`\n${ext} (${files.length} arquivo(s)):`);
      files.forEach((file) => {
        console.log(`  - ${file}`);
      });
    });

    console.log('\n⚠️  ATENÇÃO:');
    console.log('  - Nem todos os órfãos podem ser removidos (podem ser usados dinamicamente)');
    console.log('  - Revise manualmente antes de deletar');
    console.log('  - Faça backup antes de qualquer remoção\n');
  }

  // Estatísticas
  console.log('========================================');
  console.log('📈 ESTATÍSTICAS');
  console.log('========================================\n');

  const stats = {
    'Total de arquivos': allFiles.length,
    'Arquivos referenciados': referenced.size,
    'Arquivos órfãos': orphans.length,
    'Taxa de utilização': `${((referenced.size / allFiles.length) * 100).toFixed(1)}%`
  };

  Object.entries(stats).forEach(([key, value]) => {
    console.log(`${key.padEnd(25)} ${value}`);
  });

  console.log('\n');

  // Salva relatório
  const reportPath = path.join(ROOT_DIR, 'SCAN_REPORT.txt');
  const reportContent = [
    'IFDESK - Relatório de Análise de Referências',
    '='.repeat(60),
    `Data: ${new Date().toLocaleString('pt-BR')}`,
    '',
    'ARQUIVOS ÓRFÃOS:',
    '-'.repeat(60),
    orphans.length === 0
      ? 'Nenhum arquivo órfão encontrado'
      : orphans.map((f) => path.relative(ROOT_DIR, f)).join('\n'),
    '',
    'ESTATÍSTICAS:',
    '-'.repeat(60),
    ...Object.entries(stats).map(([k, v]) => `${k}: ${v}`)
  ].join('\n');

  fs.writeFileSync(reportPath, reportContent, 'utf8');
  console.log(`💾 Relatório salvo em: ${reportPath}\n`);
}

// Executa análise
try {
  analyzeProject();
} catch (error) {
  console.error('❌ Erro ao analisar projeto:', error.message);
  process.exit(1);
}
