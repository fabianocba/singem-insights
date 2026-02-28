export function renderRows(container, rows = [], emptyMessage = 'Nenhum registro encontrado.') {
  if (!container) {
    return;
  }

  if (!rows.length) {
    container.innerHTML = `<p style="padding: 12px; color: #666;">${emptyMessage}</p>`;
    return;
  }

  container.innerHTML = rows.join('');
}
