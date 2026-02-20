/**
 * SINGEM - Auditoria Automática do Projeto
 *
 * Este script realiza auditoria completa SEM modificar código existente.
 * Sempre sai com código 0 (não falha build), apenas reporta problemas.
 *
 * Execução: node scripts/audit.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

// ========================================
// Configuração
// ========================================
const CONFIG = {
  maxFileSize: 300 * 1024, // 300 KB
  ignoreDirs: ['node_modules', '.git', '.vscode', 'backup', 'dist', 'build'],
  ignoreFiles: ['.DS_Store', 'Thumbs.db', '.gitkeep'],
  scanExtensions: ['.js', '.html', '.css', '.json', '.md']
};

const REPORT = {
  metadata: {},
  summary: { errors: 0, warnings: 0, info: 0 },
  sections: {
    code: { lint: [], format: [] },
    dependencies: { vulnerabilities: [], licenses: [] },
    files: { large: [], orphans: [] },
    build: { size: null, recommendation: null },
    suggestions: []
  }
};

// ========================================
// Utilitários
// ========================================
function log(msg, type = 'info') {
  const prefix =
    {
      error: '❌',
      warn: '⚠️ ',
      info: '✅',
      debug: '🔍'
    }[type] || '💡';

  console.log(`${prefix} ${msg}`);

  if (type === 'error') {
    REPORT.summary.errors++;
  }
  if (type === 'warn') {
    REPORT.summary.warnings++;
  }
  if (type === 'info') {
    REPORT.summary.info++;
  }
}

function getAllFiles(dir, fileList = []) {
  try {
    const files = fs.readdirSync(dir);

    files.forEach((file) => {
      const filePath = path.join(dir, file);

      try {
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
          if (CONFIG.ignoreDirs.includes(file)) {
            return;
          }
          getAllFiles(filePath, fileList);
        } else {
          if (CONFIG.ignoreFiles.includes(file)) {
            return;
          }
          const ext = path.extname(file);
          if (CONFIG.scanExtensions.includes(ext)) {
            fileList.push({ path: filePath, size: stat.size, ext });
          }
        }
      } catch (err) {
        // Ignora erros de permissão
      }
    });
  } catch (err) {
    log(`Erro ao escanear diretório ${dir}: ${err.message}`, 'warn');
  }

  return fileList;
}

function formatBytes(bytes) {
  if (bytes === 0) {
    return '0 B';
  }
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

// ========================================
// 1. Metadata
// ========================================
function collectMetadata() {
  log('Coletando metadados...', 'info');

  REPORT.metadata = {
    timestamp: new Date().toISOString(),
    date: new Date().toLocaleString('pt-BR'),
    nodeVersion: process.version,
    platform: process.platform,
    projectRoot: ROOT_DIR
  };

  // Tenta ler versão do app
  try {
    const versionPath = path.join(ROOT_DIR, 'js', 'config', 'version.js');
    if (fs.existsSync(versionPath)) {
      const content = fs.readFileSync(versionPath, 'utf8');
      const match = content.match(/APP_VERSION\s*=\s*['"](.+?)['"]/);
      if (match) {
        REPORT.metadata.appVersion = match[1];
      }
    }
  } catch (err) {
    // Ignora se não encontrar
  }
}

// ========================================
// 2. Lint (ESLint)
// ========================================
async function runLint() {
  log('Verificando ESLint...', 'info');

  const eslintConfig = path.join(ROOT_DIR, '.eslintrc.json');
  if (!fs.existsSync(eslintConfig)) {
    log('ESLint config não encontrado, pulando...', 'debug');
    REPORT.sections.code.lint.push({
      status: 'skipped',
      message: 'Arquivo .eslintrc.json não encontrado'
    });
    return;
  }

  try {
    const { stdout } = await execAsync('npx eslint . --ext .js --format json', { cwd: ROOT_DIR, timeout: 30000 });

    const results = JSON.parse(stdout);
    let totalErrors = 0;
    let totalWarnings = 0;

    results.forEach((file) => {
      totalErrors += file.errorCount;
      totalWarnings += file.warningCount;

      if (file.messages.length > 0) {
        REPORT.sections.code.lint.push({
          file: path.relative(ROOT_DIR, file.filePath),
          errors: file.errorCount,
          warnings: file.warningCount,
          messages: file.messages.slice(0, 5) // Primeiros 5
        });
      }
    });

    if (totalErrors > 0) {
      log(`ESLint: ${totalErrors} erro(s) encontrado(s)`, 'error');
    } else if (totalWarnings > 0) {
      log(`ESLint: ${totalWarnings} aviso(s)`, 'warn');
    } else {
      log('ESLint: Nenhum problema encontrado', 'info');
    }
  } catch (err) {
    log(`ESLint não disponível ou erro: ${err.message}`, 'debug');
    REPORT.sections.code.lint.push({
      status: 'error',
      message: err.message
    });
  }
}

// ========================================
// 3. Format (Prettier)
// ========================================
async function runFormat() {
  log('Verificando Prettier...', 'info');

  const prettierConfig = path.join(ROOT_DIR, '.prettierrc.json');
  if (!fs.existsSync(prettierConfig)) {
    log('Prettier config não encontrado, pulando...', 'debug');
    REPORT.sections.code.format.push({
      status: 'skipped',
      message: 'Arquivo .prettierrc.json não encontrado'
    });
    return;
  }

  try {
    await execAsync('npx prettier --check . --log-level warn', { cwd: ROOT_DIR, timeout: 30000 });

    log('Prettier: Todos os arquivos formatados corretamente', 'info');
    REPORT.sections.code.format.push({
      status: 'ok',
      message: 'Formatação OK'
    });
  } catch (err) {
    const lines = err.stdout?.split('\n').filter(Boolean) || [];
    const count = lines.length;

    if (count > 0) {
      log(`Prettier: ${count} arquivo(s) precisam formatação`, 'warn');
      REPORT.sections.code.format.push({
        status: 'warning',
        count,
        files: lines.slice(0, 10) // Primeiros 10
      });
    }
  }
}

// ========================================
// 4. Dependências (npm audit)
// ========================================
async function runNpmAudit() {
  log('Verificando vulnerabilidades (npm audit)...', 'info');

  const packageJson = path.join(ROOT_DIR, 'package.json');
  if (!fs.existsSync(packageJson)) {
    log('package.json não encontrado, pulando...', 'debug');
    return;
  }

  try {
    const { stdout } = await execAsync('npm audit --json', {
      cwd: ROOT_DIR,
      timeout: 30000
    });

    const result = JSON.parse(stdout);
    const vulns = result.vulnerabilities || {};
    const total = Object.keys(vulns).length;

    if (total === 0) {
      log('npm audit: Nenhuma vulnerabilidade encontrada', 'info');
    } else {
      const critical = Object.values(vulns).filter((v) => v.severity === 'critical').length;
      const high = Object.values(vulns).filter((v) => v.severity === 'high').length;

      log(`npm audit: ${total} vulnerabilidade(s) - ${critical} crítica(s), ${high} alta(s)`, 'warn');

      REPORT.sections.dependencies.vulnerabilities = Object.entries(vulns).map(([name, data]) => ({
        name,
        severity: data.severity,
        via: data.via
      }));
    }
  } catch (err) {
    // npm audit pode retornar exit code != 0 se houver vulns
    if (err.stdout) {
      try {
        const result = JSON.parse(err.stdout);
        const vulns = result.vulnerabilities || {};
        const total = Object.keys(vulns).length;

        if (total > 0) {
          log(`npm audit: ${total} vulnerabilidade(s) encontrada(s)`, 'warn');
          REPORT.sections.dependencies.vulnerabilities = Object.entries(vulns)
            .slice(0, 20)
            .map(([name, data]) => ({
              name,
              severity: data.severity,
              via: data.via
            }));
        }
      } catch (parseErr) {
        // Ignora
      }
    }
  }
}

// ========================================
// 5. Arquivos Grandes
// ========================================
function findLargeFiles() {
  log('Procurando arquivos grandes...', 'info');

  const allFiles = getAllFiles(ROOT_DIR);
  const large = allFiles.filter((f) => f.size > CONFIG.maxFileSize);

  if (large.length > 0) {
    log(`${large.length} arquivo(s) acima de ${formatBytes(CONFIG.maxFileSize)}`, 'warn');

    REPORT.sections.files.large = large
      .sort((a, b) => b.size - a.size)
      .slice(0, 20)
      .map((f) => ({
        path: path.relative(ROOT_DIR, f.path),
        size: formatBytes(f.size),
        sizeBytes: f.size
      }));
  } else {
    log('Nenhum arquivo grande encontrado', 'info');
  }
}

// ========================================
// 6. Arquivos Órfãos
// ========================================
function findOrphans() {
  log('Procurando arquivos órfãos...', 'info');

  const allFiles = getAllFiles(ROOT_DIR);
  const jsFiles = allFiles.filter((f) => f.ext === '.js' || f.ext === '.html');
  const referenced = new Set();

  // Mapeia referências
  jsFiles.forEach((file) => {
    try {
      const content = fs.readFileSync(file.path, 'utf8');

      // Patterns de referência
      const patterns = [
        /<script[^>]+src=["']([^"']+)["']/g,
        /import\s+.*?from\s+["']([^"']+)["']/g,
        /require\s*\(\s*["']([^"']+)["']\s*\)/g,
        /<link[^>]+href=["']([^"']+)["']/g
      ];

      patterns.forEach((pattern) => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const ref = match[1];
          if (!ref.startsWith('http') && !ref.startsWith('data:')) {
            const fromDir = path.dirname(file.path);
            try {
              const resolved = path.resolve(fromDir, ref);
              if (fs.existsSync(resolved)) {
                referenced.add(resolved);
              }
            } catch (err) {
              // Ignora
            }
          }
        }
      });
    } catch (err) {
      // Ignora erros de leitura
    }
  });

  // Encontra órfãos
  const orphans = jsFiles.filter((file) => {
    const filePath = file.path;

    // Sempre considera index.html como referenciado
    if (filePath.endsWith('index.html')) {
      return false;
    }

    // Ignora configs
    if (
      filePath.endsWith('.editorconfig') ||
      filePath.endsWith('.eslintrc.json') ||
      filePath.endsWith('.prettierrc.json')
    ) {
      return false;
    }

    // Ignora READMEs
    if (filePath.endsWith('README.md')) {
      return false;
    }

    // Ignora arquivos de teste
    if (filePath.includes('/audit/')) {
      return false;
    }

    return !referenced.has(filePath);
  });

  if (orphans.length > 0) {
    log(`${orphans.length} arquivo(s) órfão(s) encontrado(s)`, 'warn');
    REPORT.sections.files.orphans = orphans.slice(0, 20).map((f) => ({
      path: path.relative(ROOT_DIR, f.path),
      size: formatBytes(f.size)
    }));
  } else {
    log('Nenhum arquivo órfão encontrado', 'info');
  }
}

// ========================================
// 7. Build Size (Opcional)
// ========================================
async function checkBuildSize() {
  log('Verificando tamanho do build (se disponível)...', 'info');

  // Verifica se há dist/ ou build/
  const distDir = path.join(ROOT_DIR, 'dist');
  const buildDir = path.join(ROOT_DIR, 'build');

  let targetDir = null;
  if (fs.existsSync(distDir)) {
    targetDir = distDir;
  } else if (fs.existsSync(buildDir)) {
    targetDir = buildDir;
  }

  if (targetDir) {
    const files = getAllFiles(targetDir);
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);

    REPORT.sections.build.size = {
      directory: path.relative(ROOT_DIR, targetDir),
      totalSize: formatBytes(totalSize),
      totalSizeBytes: totalSize,
      fileCount: files.length
    };

    log(`Build size: ${formatBytes(totalSize)} (${files.length} arquivos)`, 'info');

    if (totalSize > 5 * 1024 * 1024) {
      REPORT.sections.build.recommendation = 'Build acima de 5 MB. Considere code splitting ou compressão.';
      log(REPORT.sections.build.recommendation, 'warn');
    }
  } else {
    log('Nenhum diretório de build encontrado (dist/ ou build/)', 'debug');
  }
}

// ========================================
// 8. Sugestões
// ========================================
function generateSuggestions() {
  const suggestions = [];

  // Arquivos grandes
  if (REPORT.sections.files.large.length > 0) {
    suggestions.push({
      type: 'performance',
      message: `${REPORT.sections.files.large.length} arquivo(s) grande(s) detectado(s). Considere minificação ou lazy loading.`
    });
  }

  // Órfãos
  if (REPORT.sections.files.orphans.length > 0) {
    suggestions.push({
      type: 'cleanup',
      message: `${REPORT.sections.files.orphans.length} arquivo(s) órfão(s). Considere remover ou documentar.`
    });
  }

  // Vulnerabilidades
  if (REPORT.sections.dependencies.vulnerabilities.length > 0) {
    suggestions.push({
      type: 'security',
      message: 'Vulnerabilidades encontradas. Execute "npm audit fix" para corrigir.'
    });
  }

  // Lint
  const lintIssues = REPORT.sections.code.lint.filter((l) => l.errors > 0);
  if (lintIssues.length > 0) {
    suggestions.push({
      type: 'quality',
      message: 'Problemas de lint encontrados. Execute "npx eslint . --fix" para corrigir automaticamente.'
    });
  }

  // Format
  const formatIssues = REPORT.sections.code.format.filter((f) => f.status === 'warning');
  if (formatIssues.length > 0) {
    suggestions.push({
      type: 'quality',
      message: 'Arquivos precisam formatação. Execute "npx prettier --write ." para formatar.'
    });
  }

  REPORT.sections.suggestions = suggestions;
}

// ========================================
// 9. Gerar Relatórios
// ========================================
function generateReports() {
  log('Gerando relatórios...', 'info');

  // JSON
  const jsonPath = path.join(ROOT_DIR, 'audit-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(REPORT, null, 2), 'utf8');
  log(`Relatório JSON: ${jsonPath}`, 'info');

  // Markdown
  const mdPath = path.join(ROOT_DIR, 'AUDIT_REPORT.md');
  const md = generateMarkdown();
  fs.writeFileSync(mdPath, md, 'utf8');
  log(`Relatório Markdown: ${mdPath}`, 'info');
}

function generateMarkdown() {
  const lines = [];

  lines.push('# 🔍 SINGEM - Relatório de Auditoria Automática\n');
  lines.push(`**Data:** ${REPORT.metadata.date}  `);
  lines.push(`**Versão App:** ${REPORT.metadata.appVersion || 'N/A'}  `);
  lines.push(`**Node:** ${REPORT.metadata.nodeVersion}  `);
  lines.push(`**Plataforma:** ${REPORT.metadata.platform}\n`);

  lines.push('---\n');

  // Resumo
  lines.push('## 📊 Resumo Executivo\n');
  lines.push(`- ❌ **Erros:** ${REPORT.summary.errors}`);
  lines.push(`- ⚠️  **Avisos:** ${REPORT.summary.warnings}`);
  lines.push(`- ✅ **Info:** ${REPORT.summary.info}\n`);

  // Código
  lines.push('---\n');
  lines.push('## 💻 Qualidade de Código\n');

  lines.push('### ESLint\n');
  if (REPORT.sections.code.lint.length === 0) {
    lines.push('✅ Nenhum problema encontrado ou ESLint não configurado.\n');
  } else {
    REPORT.sections.code.lint.forEach((item) => {
      if (item.status === 'skipped') {
        lines.push(`⚠️  ${item.message}\n`);
      } else if (item.file) {
        lines.push(`- **${item.file}**: ${item.errors} erro(s), ${item.warnings} aviso(s)`);
      }
    });
    lines.push('');
  }

  lines.push('### Prettier\n');
  if (REPORT.sections.code.format.length === 0) {
    lines.push('✅ Formatação OK ou Prettier não configurado.\n');
  } else {
    REPORT.sections.code.format.forEach((item) => {
      if (item.status === 'warning') {
        lines.push(`⚠️  ${item.count} arquivo(s) precisam formatação\n`);
      }
    });
  }

  // Dependências
  lines.push('---\n');
  lines.push('## 📦 Dependências\n');

  if (REPORT.sections.dependencies.vulnerabilities.length === 0) {
    lines.push('✅ Nenhuma vulnerabilidade encontrada.\n');
  } else {
    lines.push(`⚠️  **${REPORT.sections.dependencies.vulnerabilities.length} vulnerabilidade(s):**\n`);
    REPORT.sections.dependencies.vulnerabilities.slice(0, 10).forEach((vuln) => {
      lines.push(`- **${vuln.name}** (${vuln.severity})`);
    });
    lines.push('');
  }

  // Arquivos
  lines.push('---\n');
  lines.push('## 📁 Arquivos\n');

  lines.push('### Arquivos Grandes (> 300 KB)\n');
  if (REPORT.sections.files.large.length === 0) {
    lines.push('✅ Nenhum arquivo grande encontrado.\n');
  } else {
    lines.push('| Arquivo | Tamanho |');
    lines.push('|---------|---------|');
    REPORT.sections.files.large.slice(0, 10).forEach((f) => {
      lines.push(`| ${f.path} | ${f.size} |`);
    });
    lines.push('');
  }

  lines.push('### Arquivos Órfãos\n');
  if (REPORT.sections.files.orphans.length === 0) {
    lines.push('✅ Nenhum arquivo órfão encontrado.\n');
  } else {
    lines.push('| Arquivo | Tamanho |');
    lines.push('|---------|---------|');
    REPORT.sections.files.orphans.slice(0, 10).forEach((f) => {
      lines.push(`| ${f.path} | ${f.size} |`);
    });
    lines.push('');
  }

  // Build
  if (REPORT.sections.build.size) {
    lines.push('---\n');
    lines.push('## 🏗️ Build\n');
    lines.push(`- **Diretório:** ${REPORT.sections.build.size.directory}`);
    lines.push(`- **Tamanho Total:** ${REPORT.sections.build.size.totalSize}`);
    lines.push(`- **Arquivos:** ${REPORT.sections.build.size.fileCount}\n`);

    if (REPORT.sections.build.recommendation) {
      lines.push(`⚠️  ${REPORT.sections.build.recommendation}\n`);
    }
  }

  // Sugestões
  if (REPORT.sections.suggestions.length > 0) {
    lines.push('---\n');
    lines.push('## 💡 Próximos Passos\n');
    REPORT.sections.suggestions.forEach((s, i) => {
      lines.push(`${i + 1}. **[${s.type}]** ${s.message}`);
    });
    lines.push('');
  }

  lines.push('---\n');
  lines.push('_Gerado automaticamente por SINGEM Audit em ' + REPORT.metadata.date + '_\n');

  return lines.join('\n');
}

// ========================================
// Main
// ========================================
async function main() {
  console.log('\n🔍 ========================================');
  console.log('   SINGEM - Auditoria Automática');
  console.log('========================================\n');

  try {
    collectMetadata();
    await runLint();
    await runFormat();
    await runNpmAudit();
    findLargeFiles();
    findOrphans();
    await checkBuildSize();
    generateSuggestions();
    generateReports();

    console.log('\n✅ ========================================');
    console.log('   Auditoria Concluída!');
    console.log('========================================\n');
    console.log('📄 Relatórios gerados:');
    console.log(`   - ${path.join(ROOT_DIR, 'AUDIT_REPORT.md')}`);
    console.log(`   - ${path.join(ROOT_DIR, 'audit-report.json')}`);
    console.log('\n💡 Execute "npm run audit:selftest" para testes no navegador.\n');
  } catch (err) {
    log(`Erro crítico: ${err.message}`, 'error');
    console.error(err);
  }

  // Sempre sai com código 0
  process.exit(0);
}

main();
