#!/usr/bin/env node

/**
 * Script de Verificação de Qualidade - IFDESK
 * Executa linting, formatting e análise de código
 */

import { execSync } from 'child_process';
import fs from 'fs';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function runCommand(cmd, description) {
  log(`\n🔍 ${description}...`, 'cyan');
  try {
    const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe' });
    log(`✅ ${description} - OK`, 'green');
    return { success: true, output };
  } catch (error) {
    log(`❌ ${description} - FALHOU`, 'red');
    return { success: false, output: error.stdout || error.message };
  }
}

async function main() {
  log('\n╔══════════════════════════════════════════════╗', 'blue');
  log('║   IFDESK - Verificação de Qualidade v1.0    ║', 'blue');
  log('╚══════════════════════════════════════════════╝\n', 'blue');

  const results = {
    lint: null,
    format: null,
    timestamp: new Date().toISOString()
  };

  // 1. Verificar formatação
  results.format = runCommand('npm run format:check', 'Verificação de Formatação');

  // 2. Executar linting
  results.lint = runCommand('npm run lint', 'Análise de Lint');

  // 3. Gerar relatório
  log('\n📊 Gerando relatório...', 'cyan');

  const report = {
    timestamp: results.timestamp,
    checks: {
      formatting: results.format.success,
      linting: results.lint.success
    },
    summary: generateSummary(results)
  };

  fs.writeFileSync('quality-report.json', JSON.stringify(report, null, 2));
  log('✅ Relatório salvo em quality-report.json', 'green');

  // 4. Resumo final
  log('\n╔══════════════════════════════════════════════╗', 'blue');
  log('║              RESUMO DA QUALIDADE             ║', 'blue');
  log('╚══════════════════════════════════════════════╝\n', 'blue');

  const totalChecks = Object.keys(report.checks).length;
  const passedChecks = Object.values(report.checks).filter(Boolean).length;
  const score = Math.round((passedChecks / totalChecks) * 100);

  log(`Checks Passados: ${passedChecks}/${totalChecks}`, score === 100 ? 'green' : 'yellow');
  log(`Score de Qualidade: ${score}%`, score >= 80 ? 'green' : score >= 60 ? 'yellow' : 'red');

  if (report.summary) {
    log(`\n${report.summary}`, 'cyan');
  }

  log('\n💡 Dicas:', 'blue');
  log('  • Execute "npm run lint:fix" para corrigir problemas automaticamente');
  log('  • Execute "npm run format" para formatar código');
  log('  • Verifique quality-report.json para detalhes\n');

  process.exit(score === 100 ? 0 : 1);
}

function generateSummary(results) {
  const lines = [];

  if (!results.lint.success) {
    const output = results.lint.output;
    const problemsMatch = output.match(/(\d+)\s+problems?\s+\((\d+)\s+errors?,\s+(\d+)\s+warnings?\)/);
    if (problemsMatch) {
      const [, total, errors, warnings] = problemsMatch;
      lines.push(`Lint: ${total} problemas (${errors} erros, ${warnings} avisos)`);
    }
  }

  if (!results.format.success) {
    lines.push('Formatação: Alguns arquivos precisam ser formatados');
  }

  return lines.join('\n');
}

main().catch((error) => {
  log(`\n❌ Erro fatal: ${error.message}`, 'red');
  process.exit(1);
});
