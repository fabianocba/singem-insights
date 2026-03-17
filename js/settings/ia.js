/**
 * Configurações → Inteligência Artificial
 * Painel de status e administração do SINGEM AI Core
 */
import { escapeHTML as escapeHtml } from '../utils/sanitize.js';

import { httpRequest } from '../shared/lib/http.js';
import { notifyError, notifySuccess } from '../ui/feedback.js';
import {
  feedbackMarkup,
  metricCardMarkup,
  metricGridMarkup,
  renderInto,
  setFeedback
} from './renderUtils.js';

class SettingsIA {
  constructor() {
    this.lastHealth = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.getElementById('btnAiRefreshStatus')?.addEventListener('click', () => this.load());

    document.getElementById('btnAiRebuildIndex')?.addEventListener('click', () => this.rebuildIndex());
  }

  async load() {
    const panel = document.getElementById('aiStatusPanel');
    if (panel) {
      renderInto(panel, feedbackMarkup('info', '⏳ Verificando status da IA...'));
    }

    try {
      const response = await httpRequest('/api/ai/health', { method: 'GET' });

      if (!response.ok) {
        this.renderOffline(response.error?.message || 'Serviço indisponível');
        return;
      }

      this.lastHealth = response.data;
      this.renderStatus(response.data);
      this.renderFeatures(response.data);
    } catch {
      this.renderOffline('Não foi possível conectar ao serviço de IA');
    }
  }

  renderStatus(data) {
    const panel = document.getElementById('aiStatusPanel');
    if (!panel) {
      return;
    }

    const isOk = data.ok === true;
    const statusLabel = isOk ? 'ONLINE' : 'OFFLINE';
    const statusTone = isOk ? 'success' : 'error';

    const featureEnabled = data.feature_enabled !== false;
    const vectorEnabled = data.vector_search_enabled === true;
    const pgvectorEnabled = data.pgvector_enabled === true;

    const errors =
      Array.isArray(data.errors) && data.errors.length > 0
        ? feedbackMarkup('warning', `⚠️ ${data.errors.map((e) => escapeHtml(String(e))).join('<br>')}`)
        : '';

    renderInto(
      panel,
      `
      ${metricGridMarkup([
        metricCardMarkup({
          tone: statusTone,
          value: statusLabel,
          label: 'Status do serviço'
        }),
        metricCardMarkup({
          tone: 'info',
          value: escapeHtml(data.service || 'singem-ai'),
          label: 'Serviço',
          meta: `v${escapeHtml(data.version || '?')}`
        }),
        metricCardMarkup({
          tone: featureEnabled ? 'success' : 'error',
          value: featureEnabled ? 'ATIVO' : 'DESATIVADO',
          label: 'Feature IA'
        }),
        metricCardMarkup({
          tone: pgvectorEnabled ? 'success' : 'warning',
          value: pgvectorEnabled ? 'SIM' : 'NÃO',
          label: 'pgvector'
        }),
        metricCardMarkup({
          tone: vectorEnabled ? 'success' : 'warning',
          value: vectorEnabled ? 'SIM' : 'NÃO',
          label: 'Busca vetorial'
        })
      ])}
      ${errors ? `<div class="sg-status-slot">${errors}</div>` : ''}
    `
    );

    // Habilita botão de rebuild se serviço está online
    const btnRebuild = document.getElementById('btnAiRebuildIndex');
    if (btnRebuild) {
      btnRebuild.disabled = !isOk;
    }
  }

  renderOffline(message) {
    const panel = document.getElementById('aiStatusPanel');
    if (panel) {
      renderInto(
        panel,
        feedbackMarkup(
          'error',
          `<strong class="settings-feedback__headline">OFFLINE</strong>
           <p>${escapeHtml(String(message))}</p>
           <span class="settings-feedback__note">Verifique se o serviço singem-ai está rodando na porta 8010</span>`,
          { centered: true }
        )
      );
    }

    // Desabilita rebuild
    const btnRebuild = document.getElementById('btnAiRebuildIndex');
    if (btnRebuild) {
      btnRebuild.disabled = true;
    }

    // Marca todas as features como indisponíveis
    const featureIds = [
      'aiFeatureFornecedor',
      'aiFeatureItem',
      'aiFeatureCatmat',
      'aiFeatureNfe',
      'aiFeatureConsultas',
      'aiFeatureRelatorios',
      'aiFeatureSearch',
      'aiFeatureMatch'
    ];
    for (const id of featureIds) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = '⚫';
        el.title = 'Serviço offline';
      }
    }
  }

  renderFeatures(data) {
    const isOnline = data.ok === true;
    const featureOn = data.feature_enabled !== false;
    const vectorOn = data.vector_search_enabled === true;

    const features = {
      aiFeatureFornecedor: isOnline && featureOn,
      aiFeatureItem: isOnline && featureOn,
      aiFeatureCatmat: isOnline && featureOn,
      aiFeatureNfe: isOnline && featureOn,
      aiFeatureConsultas: isOnline && featureOn,
      aiFeatureRelatorios: isOnline && featureOn,
      aiFeatureSearch: isOnline && featureOn && vectorOn,
      aiFeatureMatch: isOnline && featureOn
    };

    for (const [id, active] of Object.entries(features)) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = active ? '✅' : '❌';
        el.title = active ? 'Disponível' : 'Indisponível';
      }
    }
  }

  async rebuildIndex() {
    const resultEl = document.getElementById('aiActionResult');
    const btn = document.getElementById('btnAiRebuildIndex');
    if (btn) {
      btn.disabled = true;
    }

    setFeedback(
      resultEl,
      'info',
      '⏳ Reconstruindo índice... Isso pode levar alguns minutos.',
      { reveal: true }
    );

    try {
      const response = await httpRequest('/api/ai/index/rebuild', {
        method: 'POST',
        body: {
          entity_types: ['material', 'catmat_item', 'fornecedor'],
          clear_first: false
        }
      });

      if (!response.ok) {
        const msg = response.error?.message || 'Falha ao reconstruir índice';
        notifyError(msg);
        setFeedback(resultEl, 'error', `❌ ${escapeHtml(msg)}`, { reveal: true });
        return;
      }

      const data = response.data;
      const total = data?.indexed_count ?? data?.total ?? '?';
      notifySuccess(`Índice reconstruído com sucesso! (${total} documentos)`);
      setFeedback(
        resultEl,
        'success',
        `✅ Índice reconstruído — ${escapeHtml(String(total))} documentos indexados.`,
        { reveal: true }
      );
    } catch {
      notifyError('Erro ao reconstruir índice.');
      setFeedback(resultEl, 'error', '❌ Erro de conexão ao reconstruir índice.', {
        reveal: true
      });
    } finally {
      if (btn) {
        btn.disabled = false;
      }
    }
  }
}

window.settingsIA = new SettingsIA();
