/**
 * Configurações → Integrações
 * Painel administrativo para ComprasGov + DadosGov CKAN
 */

import { httpRequest } from '../shared/lib/http.js';
import { notifyError, notifySuccess } from '../ui/feedback.js';

class SettingsIntegracoes {
  constructor() {
    this.lastSnapshotId = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('btnIntegracoesRefresh')?.addEventListener('click', () => this.load());

    document.getElementById('btnIntegracoesSync')?.addEventListener('click', async () => {
      const tipo = document.getElementById('integracoesTipoSync')?.value || 'all';
      const response = await httpRequest(`/api/integracoes/sync/run?tipo=${encodeURIComponent(tipo)}`, {
        method: 'POST'
      });

      if (!response.ok) {
        notifyError(response.error?.message || 'Falha ao iniciar sync');
        return;
      }

      notifySuccess('Sync iniciado/completado com sucesso.');
      await this.load();
    });

    document.getElementById('btnIntegracoesClearCache')?.addEventListener('click', async () => {
      const response = await httpRequest('/api/integracoes/cache/clear', { method: 'POST' });
      if (!response.ok) {
        notifyError(response.error?.message || 'Falha ao limpar cache');
        return;
      }

      notifySuccess('Cache limpo com sucesso.');
      await this.load();
    });

    document.getElementById('btnGerarRelatorioOficialPreco')?.addEventListener('click', () => {
      const input = document.getElementById('integracoesSnapshotId');
      const snapshotId = Number(input?.value || this.lastSnapshotId || 0);

      if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
        notifyError('Informe um Snapshot ID válido.');
        return;
      }

      const format = document.getElementById('integracoesSnapshotFormato')?.value || 'html';
      const url = `/api/integracoes/pesquisa-preco/snapshot/${snapshotId}?format=${encodeURIComponent(format)}`;
      window.open(url, '_blank');
    });
  }

  async load() {
    const dashboard = await httpRequest('/api/integracoes/dashboard');

    if (!dashboard.ok) {
      this.renderError(dashboard.error?.message || 'Falha ao carregar painel de integrações');
      return;
    }

    const payload = dashboard.data?.data || dashboard.data;
    this.render(payload || {});
  }

  renderError(message) {
    const statusEl = document.getElementById('integracoesStatus');
    if (statusEl) {
      statusEl.innerHTML = `<div class="status-message error">${message}</div>`;
    }
  }

  render(payload) {
    const statusEl = document.getElementById('integracoesStatus');
    const logsEl = document.getElementById('integracoesLogs');
    const syncEl = document.getElementById('integracoesSyncJobs');

    const compras = payload.health?.comprasGov || {};
    const dados = payload.health?.dadosGovCkan || {};
    const metrics = payload.metrics24h || {};
    const cache = payload.cache || {};
    const logs = Array.isArray(payload.logs) ? payload.logs : [];
    const jobs = Array.isArray(payload.sync?.jobs) ? payload.sync.jobs : [];

    if (statusEl) {
      statusEl.innerHTML = `
        <div class="grid-2">
          <div class="status-message ${compras.ok ? 'success' : 'error'}">
            <strong>ComprasGov:</strong> ${compras.status || '-'}
          </div>
          <div class="status-message ${dados.ok ? 'success' : 'error'}">
            <strong>DadosGov CKAN:</strong> ${dados.status || '-'}
          </div>
        </div>
        <div class="panel" style="margin-top:10px;">
          <div><strong>Taxa de erro (24h):</strong> ${metrics.errorRate24h ?? 0}%</div>
          <div><strong>Cache hit rate (24h):</strong> ${metrics.cacheHitRate24h ?? 0}%</div>
          <div><strong>Cache hit rate (processo):</strong> ${cache.hitRate ?? 0}%</div>
        </div>
      `;
    }

    if (logsEl) {
      if (logs.length === 0) {
        logsEl.innerHTML = '<div class="loading">Sem logs recentes.</div>';
      } else {
        logsEl.innerHTML = `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Rota</th>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Cache</th>
                  <th>Duração</th>
                </tr>
              </thead>
              <tbody>
                ${logs
                  .map(
                    (item) => `
                  <tr>
                    <td>${new Date(item.created_at).toLocaleString('pt-BR')}</td>
                    <td>${item.rota_interna || '-'}</td>
                    <td title="${item.endpoint_externo || '-'}">${item.endpoint_externo || '-'}</td>
                    <td>${item.status_http ?? '-'}</td>
                    <td>${item.cache_hit ? 'HIT' : 'MISS'}</td>
                    <td>${item.duracao_ms ?? 0} ms</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    if (syncEl) {
      if (jobs.length === 0) {
        syncEl.innerHTML = '<div class="loading">Nenhum sync executado.</div>';
      } else {
        syncEl.innerHTML = `
          <div class="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Tipo</th>
                  <th>Status</th>
                  <th>Início</th>
                  <th>Fim</th>
                  <th>Registros</th>
                </tr>
              </thead>
              <tbody>
                ${jobs
                  .map(
                    (job) => `
                  <tr>
                    <td>${job.id}</td>
                    <td>${job.tipo}</td>
                    <td>${job.status}</td>
                    <td>${job.inicio ? new Date(job.inicio).toLocaleString('pt-BR') : '-'}</td>
                    <td>${job.fim ? new Date(job.fim).toLocaleString('pt-BR') : '-'}</td>
                    <td>${job.registros_processados ?? 0}</td>
                  </tr>
                `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    }

    this.lastSnapshotId = this.extractLastSnapshotId(logs);
    const input = document.getElementById('integracoesSnapshotId');
    if (input && this.lastSnapshotId && !input.value) {
      input.value = String(this.lastSnapshotId);
    }
  }

  extractLastSnapshotId(logs) {
    for (const log of logs) {
      const snapshotId = log?.query_params?.snapshotId || log?.snapshot_id;
      const parsed = Number(snapshotId);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return null;
  }
}

window.settingsIntegracoes = new SettingsIntegracoes();
