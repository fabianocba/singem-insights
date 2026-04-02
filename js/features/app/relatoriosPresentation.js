/**
 * Apresentação de relatórios: tabela genérica, exportações e painel de estatísticas.
 */

/**
 * Exibe relatório na tela (função pura, sem dependência de `app`)
 * @param {string} titulo
 * @param {Array|null} dados
 */
export function exibirRelatorio(titulo, dados) {
  const reportContent = document.getElementById('reportContent');
  const reportTitle = document.getElementById('reportTitle');
  const reportData = document.getElementById('reportData');

  reportTitle.textContent = titulo;
  reportContent.classList.remove('hidden');

  if (dados && Array.isArray(dados)) {
    let html = `<p>Total de registros: ${dados.length}</p>`;
    html += '<table class="table"><thead><tr>';

    if (dados.length > 0) {
      Object.keys(dados[0]).forEach((key) => {
        if (!key.includes('pdf') && !key.includes('Data')) {
          html += `<th>${key}</th>`;
        }
      });
    }

    html += '</tr></thead><tbody>';

    dados.forEach((item) => {
      html += '<tr>';
      Object.entries(item).forEach(([key, value]) => {
        if (!key.includes('pdf') && !key.includes('Data')) {
          html += `<td>${value}</td>`;
        }
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    reportData.innerHTML = html;
  } else {
    reportData.innerHTML = '<p>Nenhum dado encontrado.</p>';
  }
}

/**
 * Exportar relatório em PDF
 * @param {object} app
 */
export function exportarRelatorioPDF(app) {
  app.showWarning('Funcionalidade de exportação em PDF será implementada em breve');
}

/**
 * Exportar relatório em CSV
 * @param {object} app
 */
export function exportarRelatorioCSV(app) {
  app.showWarning('Funcionalidade de exportação em CSV será implementada em breve');
}

/**
 * Aplicar filtros no relatório (stub)
 */
export function aplicarFiltrosRelatorio() {
  console.log('Aplicando filtros de relatório...');
}

/**
 * Mostra estatísticas de arquivos
 * @param {object} app
 */
export async function mostrarEstatisticasArquivos(app) {
  try {
    app.showLoading('Coletando estatísticas...');

    const statsDisplay = document.getElementById('fileStatsDisplay');
    statsDisplay.innerHTML = `
      <div class="file-stats">
        <h4>📊 Estatísticas de Arquivos</h4>
        <p>Esta funcionalidade será implementada em breve.</p>
        <p class="text-muted">As estatísticas de uso de arquivos estarão disponíveis em uma próxima versão.</p>
      </div>
    `;
    statsDisplay.classList.remove('hidden');
  } catch (error) {
    console.error('Erro ao mostrar estatísticas:', error);
    app.showError('Erro ao mostrar estatísticas: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

/**
 * Atualiza estatísticas de arquivos se o painel estiver visível
 * @param {object} app
 */
export async function atualizarEstatisticasArquivos(app) {
  const statsDisplay = document.getElementById('fileStatsDisplay');
  if (statsDisplay && !statsDisplay.classList.contains('hidden')) {
    await mostrarEstatisticasArquivos(app);
  }
}
