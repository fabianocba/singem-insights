const AUTO_REFRESH_MS = 10000;
const FETCH_TIMEOUT_MS = 4500;

let refreshTimer = null;

function byId(id) {
  return document.getElementById(id);
}

function resolveBaseUrl() {
  if (window.__API_BASE_URL__) {
    return String(window.__API_BASE_URL__).replace(/\/+$/, '');
  }

  const host = String(window.location?.hostname || '');
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  if (isLocal) {
    return String(window.CONFIG?.api?.baseUrl || 'http://localhost:3000').replace(/\/+$/, '');
  }

  return '';
}

function resolveSystemStatusUrl() {
  return `${resolveBaseUrl()}/system-status`;
}

function normalizeStatusClass(status) {
  const value = String(status || 'UNKNOWN').toUpperCase();

  if (value === 'OK') {
    return 'status-ok';
  }

  if (value === 'DISABLED') {
    return 'status-neutral';
  }

  if (value === 'OFFLINE' || value === 'DEGRADED') {
    return 'status-warn';
  }

  if (value === 'DOWN' || value === 'CRITICAL') {
    return 'status-error';
  }

  return 'status-neutral';
}

function formatTimestamp(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('pt-BR');
}

function formatUptime(secondsValue) {
  const seconds = Number(secondsValue || 0);
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '-';
  }

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remSeconds = Math.floor(seconds % 60);

  const chunks = [];
  if (days > 0) {
    chunks.push(`${days}d`);
  }
  chunks.push(`${String(hours).padStart(2, '0')}h`);
  chunks.push(`${String(minutes).padStart(2, '0')}m`);
  chunks.push(`${String(remSeconds).padStart(2, '0')}s`);
  return chunks.join(' ');
}

function formatMegabytes(bytesValue) {
  const bytes = Number(bytesValue || 0);
  if (!Number.isFinite(bytes) || bytes < 0) {
    return '-';
  }
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function updateOverall(data) {
  const statusValue = String(data?.status || 'UNKNOWN').toUpperCase();
  const statusClass = normalizeStatusClass(statusValue);

  const statusNode = byId('overallStatus');
  statusNode.className = `status-badge ${statusClass}`;
  statusNode.textContent = statusValue;

  byId('statusMessage').textContent =
    statusValue === 'OK'
      ? 'Todos os serviços essenciais estão operacionais.'
      : statusValue === 'DEGRADED'
        ? 'Serviços auxiliares com degradação, núcleo operacional ativo.'
        : 'Há falha crítica detectada no núcleo do sistema.';
}

function updateMeta(data) {
  byId('metaName').textContent = data?.name || 'SINGEM';
  byId('metaVersion').textContent = data?.version || '-';
  byId('metaChannel').textContent = data?.channel || '-';
  byId('metaBuild').textContent = data?.build || '-';
  byId('metaBuildTimestamp').textContent = formatTimestamp(data?.buildTimestamp);
}

function updateServices(data) {
  const grid = byId('servicesGrid');
  const services = Array.isArray(data?.services) ? data.services : [];

  if (services.length === 0) {
    grid.innerHTML = '<article class="service-card"><h3>Sem dados</h3><p class="service-message">Nenhum serviço retornado pela API.</p></article>';
    return;
  }

  grid.innerHTML = services
    .map((service) => {
      const status = String(service?.status || 'UNKNOWN').toUpperCase();
      const name = service?.name || 'service';
      const message = service?.message || 'Sem detalhes';
      const statusClass = normalizeStatusClass(status);

      return `
        <article class="service-card">
          <h3>${name}</h3>
          <div class="status-badge ${statusClass}">${status}</div>
          <p class="service-message">${message}</p>
        </article>
      `;
    })
    .join('');
}

function updateSystemMetrics(data) {
  const system = data?.system || {};
  const memory = system.memory || {};
  const cpuLoad = Array.isArray(system.cpuLoad) ? system.cpuLoad : [];

  byId('sysHostname').textContent = system.hostname || '-';
  byId('sysPlatform').textContent = system.platform || '-';
  byId('sysNodeVersion').textContent = system.nodeVersion || '-';
  byId('sysUptime').textContent = formatUptime(system.uptimeSeconds);

  byId('memRss').textContent = formatMegabytes(memory.rss);
  byId('memHeapUsed').textContent = formatMegabytes(memory.heapUsed);
  byId('memHeapTotal').textContent = formatMegabytes(memory.heapTotal);
  byId('sysCpuLoad').textContent = cpuLoad.length > 0 ? cpuLoad.map((item) => Number(item).toFixed(2)).join(' | ') : '-';
}

function setRefreshState(text) {
  byId('refreshState').textContent = text;
}

function showError(message) {
  const errorBox = byId('errorBox');
  errorBox.textContent = message;
  errorBox.classList.remove('hidden');
}

function hideError() {
  byId('errorBox').classList.add('hidden');
}

async function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Falha no monitoramento: HTTP ${response.status}`);
    }

    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function refreshStatus() {
  setRefreshState('Atualizando...');

  try {
    const payload = await fetchWithTimeout(resolveSystemStatusUrl(), FETCH_TIMEOUT_MS);

    updateOverall(payload);
    updateMeta(payload);
    updateServices(payload);
    updateSystemMetrics(payload);

    byId('updateLabel').textContent = `Última atualização: ${formatTimestamp(payload?.timestamp)}`;
    setRefreshState('Atualização automática a cada 10 segundos.');
    hideError();
  } catch (error) {
    setRefreshState('Falha na atualização automática.');
    showError(`Não foi possível carregar o status do sistema. ${error?.message || ''}`.trim());
  }
}

function setupAutoRefresh() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }

  refreshTimer = setInterval(() => {
    refreshStatus();
  }, AUTO_REFRESH_MS);
}

function setupActions() {
  byId('btnRefresh')?.addEventListener('click', () => {
    refreshStatus();
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupActions();
  refreshStatus();
  setupAutoRefresh();
});
