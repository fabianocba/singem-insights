import { ensureFloatingThemeToggle, initTheme, mountThemeToggle } from './themeManager.js';
import { initVisualAudits, scheduleVisualAuditRefresh } from './aiVisualAudit.js';

const PAGE_LABELS = {
  consultas: 'Cockpit analítico',
  configuracoes: 'Centro de controle',
  'gerenciar-backups': 'Resiliência operacional',
  'diagnostico-cache': 'Diagnóstico técnico',
  'importar-nfe': 'Lançamento fiscal',
  'system-status': 'Monitoramento interno'
};

function getStandaloneRoot() {
  return document.querySelector(
    '.consultas-container, .settings-container, .backup-container, .status-page, body > .container'
  );
}

function mountInlineToggleIfNeeded() {
  const inlineToggle = document.querySelector('[data-theme-toggle]');
  if (inlineToggle) {
    mountThemeToggle(inlineToggle, { showLabel: true });
    return;
  }

  ensureFloatingThemeToggle();
}

function decorateStandalonePage() {
  document.body.classList.add('sg-standalone-page');
  document.body.dataset.pageLabel = PAGE_LABELS[document.body?.dataset?.page] || 'Operação auxiliar';

  document.querySelectorAll('table').forEach((table) => {
    table.classList.add('sg-table');
  });

  document.querySelectorAll('.empty-state, .loading-state').forEach((node) => {
    node.classList.add('sg-state-card');
  });

  document.querySelectorAll('.status, .alert, .status-message').forEach((node) => {
    node.classList.add('sg-alert');
  });
}

function decorateActionClusters() {
  document
    .querySelectorAll(
      '.sg-page-header-actions, .settings-tabs, .backup-actions, .button-group, .actions, .filters-actions'
    )
    .forEach((node) => {
      node.classList.add('sg-command-cluster');
    });
}

function decorateVersionFooter() {
  const versionFooter = document.getElementById('app-version-container');
  if (versionFooter) {
    versionFooter.classList.add('app-version-footer');
  }
}

function buildUtilityHeader(title, description) {
  const header = document.createElement('div');
  header.className = 'sg-utility-hero__header';

  const heading = document.createElement('h1');
  heading.textContent = title;
  header.appendChild(heading);

  if (description) {
    const paragraph = document.createElement('p');
    paragraph.textContent = description;
    header.appendChild(paragraph);
  }

  return header;
}

function decorateStandaloneHero() {
  const root = getStandaloneRoot();
  if (!root || root.querySelector('.sg-utility-hero')) {
    return;
  }

  if (root.querySelector('.consultas-header, .settings-header, .backup-header, .status-header-card')) {
    return;
  }

  const actions = root.querySelector(':scope > .sg-page-header-actions');
  const header = root.querySelector(':scope > header');
  const title = header?.querySelector('h1') || root.querySelector(':scope > h1');
  if (!title) {
    return;
  }

  const description = header?.querySelector('p');
  const hero = document.createElement('section');
  hero.className = 'sg-utility-hero';

  const content = document.createElement('div');
  content.className = 'sg-utility-hero__content';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'sg-utility-hero__eyebrow';
  eyebrow.textContent = PAGE_LABELS[document.body?.dataset?.page] || 'Operação auxiliar';
  content.appendChild(eyebrow);

  if (header) {
    header.classList.add('sg-utility-hero__header');
    content.appendChild(header);
  } else {
    content.appendChild(
      buildUtilityHeader(title.textContent || document.title || 'SINGEM', description?.textContent || '')
    );
    title.remove();
    if (description) {
      description.remove();
    }
  }

  hero.appendChild(content);

  if (actions) {
    actions.classList.add('sg-utility-hero__actions');
    hero.appendChild(actions);
  }

  root.prepend(hero);
}

function initStandalonePageEnhancer() {
  if (document.body?.dataset.page === 'main') {
    return;
  }

  initTheme();
  initVisualAudits();
  mountInlineToggleIfNeeded();
  decorateStandalonePage();
  decorateActionClusters();
  decorateStandaloneHero();
  decorateVersionFooter();
  scheduleVisualAuditRefresh(document.body?.dataset?.page || 'standalone');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStandalonePageEnhancer);
} else {
  initStandalonePageEnhancer();
}
