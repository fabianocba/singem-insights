import { APP_SHELL_TEMPLATE } from './appShellTemplate.js';

function mountAppShell() {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }

  if (root.dataset.shellMounted === '1') {
    return;
  }

  root.innerHTML = APP_SHELL_TEMPLATE;
  root.dataset.shellMounted = '1';
  document.body.dataset.page = 'main';
}

mountAppShell();
