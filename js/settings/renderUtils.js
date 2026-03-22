function normalizeTone(tone = 'info') {
  return ['info', 'success', 'warning', 'error', 'neutral'].includes(tone) ? tone : 'info';
}

function joinClasses(...classNames) {
  return classNames.filter(Boolean).join(' ');
}

export function toggleHidden(element, hidden) {
  if (!element) {
    return;
  }

  element.classList.toggle('hidden', hidden);
}

export function renderInto(element, html, { reveal = false } = {}) {
  if (!element) {
    return '';
  }

  if (reveal) {
    toggleHidden(element, false);
  }

  element.innerHTML = html;
  return html;
}

export function feedbackMarkup(tone, message, { centered = false } = {}) {
  const classes = [
    'settings-feedback',
    `settings-feedback--${normalizeTone(tone)}`,
    centered ? 'settings-feedback--center' : ''
  ];

  return `<div class="${joinClasses(...classes)}">${message}</div>`;
}

export function setFeedback(
  element,
  tone,
  message,
  { reveal = false, centered = false, autoHideMs = 0, hideAfterClear = false } = {}
) {
  const html = feedbackMarkup(tone, message, { centered });
  renderInto(element, html, { reveal });

  if (autoHideMs > 0 && element) {
    setTimeout(() => {
      if (element.innerHTML !== html) {
        return;
      }

      element.innerHTML = '';
      if (hideAfterClear) {
        toggleHidden(element, true);
      }
    }, autoHideMs);
  }

  return html;
}

export function metricCardMarkup({ tone = 'info', value = '-', label = '', meta = '' }) {
  const normalizedTone = normalizeTone(tone === 'neutral' ? 'info' : tone);

  return `
    <article class="settings-metric-card settings-metric-card--${normalizedTone}">
      <div class="settings-metric-card__value settings-metric-card__value--${normalizedTone}">${value}</div>
      <div class="settings-metric-card__label">${label}</div>
      ${meta ? `<div class="settings-metric-card__meta">${meta}</div>` : ''}
    </article>
  `;
}

export function metricGridMarkup(cards, { className = 'settings-metric-grid' } = {}) {
  return `<div class="${className}">${cards.join('')}</div>`;
}

export function tableCellMarkup({ html, tag = 'td', className = '', colspan, title }) {
  const attrs = [
    className ? ` class="${className}"` : '',
    Number.isFinite(colspan) ? ` colspan="${colspan}"` : '',
    title ? ` title="${title}"` : ''
  ].join('');

  return `<${tag}${attrs}>${html}</${tag}>`;
}

export function tableRowMarkup(cells, { rowClass = '' } = {}) {
  const content = cells.map((cell) => (typeof cell === 'string' ? cell : tableCellMarkup(cell))).join('');

  return `<tr${rowClass ? ` class="${rowClass}"` : ''}>${content}</tr>`;
}

export function reportTableMarkup({
  headers = [],
  rows = [],
  emptyMessage = '',
  emptyTone = 'neutral',
  tableClass = 'sg-plain-table settings-report__table'
} = {}) {
  if ((!rows || rows.length === 0) && emptyMessage) {
    return feedbackMarkup(emptyTone, emptyMessage);
  }

  const headerMarkup = headers.length
    ? `
      <thead>
        <tr>
          ${headers
            .map((header) => {
              const config = typeof header === 'string' ? { label: header } : header;
              return tableCellMarkup({
                tag: 'th',
                html: config.label,
                className: config.className || ''
              });
            })
            .join('')}
        </tr>
      </thead>
    `
    : '';

  return `
    <div class="settings-report__table-shell">
      <table class="${tableClass}">
        ${headerMarkup}
        <tbody>
          ${rows.join('')}
        </tbody>
      </table>
    </div>
  `;
}

export function reportMarkup({ title = '', content = '' } = {}) {
  return `
    <div class="settings-report">
      ${title ? `<h4 class="settings-report__title">${title}</h4>` : ''}
      ${content}
    </div>
  `;
}

export function progressMarkup({ title, value, leftLabel, centerLabel, rightLabel }) {
  const normalizedValue = Math.max(0, Math.min(Number(value) || 0, 100));

  return `
    <div class="settings-progress">
      ${title ? `<div class="settings-progress__title">${title}</div>` : ''}
      <progress class="settings-progress__meter" max="100" value="${normalizedValue}">${normalizedValue}%</progress>
      <div class="settings-progress__meta">
        <span>${leftLabel || ''}</span>
        <span>${centerLabel || `${normalizedValue}%`}</span>
        <span>${rightLabel || ''}</span>
      </div>
    </div>
  `;
}
