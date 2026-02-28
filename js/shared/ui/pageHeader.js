export function renderPageHeader({ title, subtitle = '', icon = '' }) {
  return `
    <div class="screen-header">
      <h2>${icon ? `${icon} ` : ''}${title}</h2>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </div>
  `;
}
