import { APP_SHELL_TEMPLATE } from './appShellTemplate.js';

function hardenLoginFormRouting(root) {
  const form = root.querySelector('#loginForm');
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  // Garante endpoint canônico mesmo em clientes com cache antigo.
  form.setAttribute('action', '/api/auth/login');
  form.setAttribute('method', 'POST');

  if (form.dataset.authSubmitGuard === '1') {
    return;
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
  });

  form.dataset.authSubmitGuard = '1';
}

function mountAppShell() {
  const root = document.getElementById('app');
  if (!root) {
    return;
  }

  if (root.dataset.shellMounted === '1') {
    return;
  }

  root.innerHTML = APP_SHELL_TEMPLATE;
  hardenLoginFormRouting(root);
  root.dataset.shellMounted = '1';
  document.body.dataset.page = 'main';
}

mountAppShell();
