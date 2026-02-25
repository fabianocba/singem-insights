/**
 * SINGEM - Script de Análise de Referências
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

function getAllFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);

  files.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
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

function resolveReferencePath(ref, fromFile) {
  ref = ref.split('?')[0].split('#')[0];

  if (ref.startsWith('http://') || ref.startsWith('https://')) {
    return null;
  }

  if (ref.startsWith('data:')) {
    return null;
  }

  const fromDir = path.dirname(fromFile);
  const resolved = path.resolve(fromDir, ref);

  return path.normalize(resolved);
}

function analyzeProject() {
  console.log('🔍 Escaneando projeto SINGEM...\n');

  const allFiles = getAllFiles(ROOT_DIR);
  const referenced = new Set();

  console.log(`📦 Total de arquivos encontrados: ${allFiles.length}\n`);

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

  const orphans = allFiles.filter((file) => {
    if (file.endsWith('index.html')) {
      return false;
    }

    if (
      file.endsWith('.editorconfig') ||
      file.endsWith('.eslintrc.json') ||
      file.endsWith('.prettierrc.json') ||
      file.endsWith('.prettierignore')
    ) {
      return false;
    }

    if (file.endsWith('README.md') || file.endsWith('CHANGELOG.md')) {
      return false;
    }

    return !referenced.has(file);
  });

  console.log('========================================');
  console.log('📊 RELATÓRIO DE ARQUIVOS ÓRFÃOS');
  console.log('========================================\n');

  if (orphans.length === 0) {
    console.log('✅ Nenhum arquivo órfão encontrado!\n');
  } else {
    console.log(`⚠️  ${orphans.length} arquivo(s) potencialmente órfão(s):\n`);

    const byExtension = {};
    orphans.forEach((file) => {
      const ext = path.extname(file);
      if (!byExtension[ext]) {
        byExtension[ext] = [];
      }
      byExtension[ext].push(path.relative(ROOT_DIR, file));
    });

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

  const reportPath = path.join(ROOT_DIR, 'SCAN_REPORT.txt');
  const reportContent = [
    'SINGEM - Relatório de Análise de Referências',
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

try {
  analyzeProject();
} catch (error) {
  console.error('❌ Erro ao analisar projeto:', error.message);
  process.exit(1);
}
