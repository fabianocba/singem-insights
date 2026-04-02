import { emit } from '../../core/eventBus.js';
import { estadoRelatorio, TIPOS_RELATORIO } from './state.js';
import { filtrarEmpenhos } from './selectors.js';

export function exportarRelatorio() {
  const empenhosFiltrados = filtrarEmpenhos();

  if (empenhosFiltrados.length === 0) {
    alert('❌ Nenhum empenho para exportar.');
    return;
  }

  const config = TIPOS_RELATORIO[estadoRelatorio.tipoAtual];
  const titulo = config?.titulo || 'Relatório de Empenhos';

  const headers = [
    'Ano',
    'Número',
    'Fornecedor',
    'CNPJ',
    'Processo',
    'Valor Empenho',
    'Valor Utilizado',
    'Saldo Disponível',
    '% Utilizado',
    'Status',
    'Data Empenho'
  ];

  const rows = empenhosFiltrados.map((emp) => [
    emp.ano || '',
    emp.numero || '',
    emp.fornecedor || '',
    emp.cnpjDigits || emp.cnpjFornecedor || '',
    emp.processoSuap || emp.processo || '',
    (emp.valorTotalEmpenho ?? emp.valorTotal ?? 0).toFixed(2).replace('.', ','),
    (emp.valorUtilizado ?? 0).toFixed(2).replace('.', ','),
    (emp.saldoDisponivel ?? 0).toFixed(2).replace('.', ','),
    (emp.percentualUtilizado ?? 0).toFixed(1).replace('.', ','),
    emp.statusValidacao === 'validado' ? 'Validado' : 'Rascunho',
    emp.dataEmpenho ? new Date(emp.dataEmpenho).toLocaleDateString('pt-BR') : ''
  ]);

  const csvContent = [headers.join(';'), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';'))].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  const dataAtual = new Date().toISOString().split('T')[0];
  link.download = `relatorio_empenhos_${estadoRelatorio.tipoAtual}_${dataAtual}.csv`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  emit('relatorio.exportado', { tipo: estadoRelatorio.tipoAtual, qtd: empenhosFiltrados.length });

  alert(`✅ Relatório exportado!\n\n📄 ${titulo}\n📊 ${empenhosFiltrados.length} empenho(s)`);
}
