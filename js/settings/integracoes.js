/**
 * Configurações → Integrações
 * Painel administrativo para ComprasGov + DadosGov CKAN
 */

import { httpRequest } from '../shared/lib/http.js';
import { notifyError, notifySuccess } from '../ui/feedback.js';
import { escapeHTML as escapeHtml } from '../utils/sanitize.js';
import {
  metricCardMarkup,
  metricGridMarkup,
  renderInto,
  reportTableMarkup,
  setFeedback,
  tableCellMarkup,
  tableRowMarkup
} from './renderUtils.js';

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
    setFeedback(statusEl, 'error', escapeHtml(message));
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
      renderInto(
        statusEl,
        metricGridMarkup([
          metricCardMarkup({
            tone: compras.ok ? 'success' : 'error',
            value: escapeHtml(String(compras.status || '-')),
            label: 'ComprasGov'
          }),
          metricCardMarkup({
            tone: dados.ok ? 'success' : 'error',
            value: escapeHtml(String(dados.status || '-')),
            label: 'DadosGov CKAN'
          }),
          metricCardMarkup({
            tone: Number(metrics.errorRate24h || 0) > 0 ? 'warning' : 'success',
            value: `${metrics.errorRate24h ?? 0}%`,
            label: 'Taxa de erro (24h)'
          }),
          metricCardMarkup({
            tone: 'info',
            value: `${metrics.cacheHitRate24h ?? 0}%`,
            label: 'Cache hit rate (24h)'
          }),
          metricCardMarkup({
            tone: 'info',
            value: `${cache.hitRate ?? 0}%`,
            label: 'Cache hit rate (processo)'
          })
        ])
      );
    }

    if (logsEl) {
      renderInto(
        logsEl,
        reportTableMarkup({
          headers: ['Data', 'Rota', 'Endpoint', 'Status', 'Cache', 'Duração'],
          rows: logs.map((item) =>
            tableRowMarkup([
              tableCellMarkup({ html: new Date(item.created_at).toLocaleString('pt-BR') }),
              tableCellMarkup({ html: escapeHtml(String(item.rota_interna || '-')) }),
              tableCellMarkup({
                html: escapeHtml(String(item.endpoint_externo || '-')),
                title: escapeHtml(String(item.endpoint_externo || '-'))
              }),
              tableCellMarkup({ html: item.status_http ?? '-' }),
              tableCellMarkup({ html: item.cache_hit ? 'HIT' : 'MISS' }),
              tableCellMarkup({ html: `${item.duracao_ms ?? 0} ms` })
            ])
          ),
          emptyMessage: 'Sem logs recentes.',
          emptyTone: 'neutral'
        })
      );
    }

    if (syncEl) {
      renderInto(
        syncEl,
        reportTableMarkup({
          headers: ['ID', 'Tipo', 'Status', 'Início', 'Fim', 'Registros'],
          rows: jobs.map((job) =>
            tableRowMarkup([
              tableCellMarkup({ html: job.id }),
              tableCellMarkup({ html: escapeHtml(String(job.tipo || '-')) }),
              tableCellMarkup({ html: escapeHtml(String(job.status || '-')) }),
              tableCellMarkup({ html: job.inicio ? new Date(job.inicio).toLocaleString('pt-BR') : '-' }),
              tableCellMarkup({ html: job.fim ? new Date(job.fim).toLocaleString('pt-BR') : '-' }),
              tableCellMarkup({ html: job.registros_processados ?? 0 })
            ])
          ),
          emptyMessage: 'Nenhum sync executado.',
          emptyTone: 'neutral'
        })
      );
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
