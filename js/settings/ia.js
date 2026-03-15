/**
 * Configurações → Inteligência Artificial
 * Painel de status e administração do SINGEM AI Core
 */
import { escapeHTML as escapeHtml } from '../utils/sanitize.js';

import { httpRequest } from '../shared/lib/http.js';
import { notifyError, notifySuccess } from '../ui/feedback.js';

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
      panel.innerHTML = '<p style="color: #666;">⏳ Verificando status da IA...</p>';
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
    const statusColor = isOk ? '#2e7d32' : '#c62828';
    const statusLabel = isOk ? 'ONLINE' : 'OFFLINE';
    const statusBg = isOk ? '#e8f5e9' : '#ffebee';

    const featureEnabled = data.feature_enabled !== false;
    const vectorEnabled = data.vector_search_enabled === true;
    const pgvectorEnabled = data.pgvector_enabled === true;

    const errors =
      Array.isArray(data.errors) && data.errors.length > 0
        ? `<div style="margin-top:10px; padding:10px; background:#fff3e0; border-radius:6px; color:#e65100; font-size:13px;">
           ⚠️ ${data.errors.map((e) => escapeHtml(String(e))).join('<br>')}
         </div>`
        : '';

    panel.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        <div style="background: ${statusBg}; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 22px; font-weight: bold; color: ${statusColor};">${statusLabel}</div>
          <div style="color: #666; font-size: 13px;">Status do serviço</div>
        </div>
        <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: #1565c0;">${escapeHtml(data.service || 'singem-ai')}</div>
          <div style="color: #666; font-size: 13px;">v${escapeHtml(data.version || '?')}</div>
        </div>
        <div style="background: ${featureEnabled ? '#e8f5e9' : '#ffebee'}; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: ${featureEnabled ? '#2e7d32' : '#c62828'};">${featureEnabled ? 'ATIVO' : 'DESATIVADO'}</div>
          <div style="color: #666; font-size: 13px;">Feature IA</div>
        </div>
        <div style="background: ${pgvectorEnabled ? '#e8f5e9' : '#fff3e0'}; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: ${pgvectorEnabled ? '#2e7d32' : '#e65100'};">${pgvectorEnabled ? 'SIM' : 'NÃO'}</div>
          <div style="color: #666; font-size: 13px;">pgvector</div>
        </div>
        <div style="background: ${vectorEnabled ? '#e8f5e9' : '#fff3e0'}; padding: 15px; border-radius: 8px; text-align: center;">
          <div style="font-size: 16px; font-weight: bold; color: ${vectorEnabled ? '#2e7d32' : '#e65100'};">${vectorEnabled ? 'SIM' : 'NÃO'}</div>
          <div style="color: #666; font-size: 13px;">Busca vetorial</div>
        </div>
      </div>
      ${errors}
    `;

    // Habilita botão de rebuild se serviço está online
    const btnRebuild = document.getElementById('btnAiRebuildIndex');
    if (btnRebuild) {
      btnRebuild.disabled = !isOk;
    }
  }

  renderOffline(message) {
    const panel = document.getElementById('aiStatusPanel');
    if (panel) {
      panel.innerHTML = `
        <div style="background: #ffebee; padding: 20px; border-radius: 8px; text-align: center;">
          <div style="font-size: 22px; font-weight: bold; color: #c62828;">OFFLINE</div>
          <div style="color: #666; margin-top: 5px;">${escapeHtml(String(message))}</div>
          <div style="color: #999; margin-top: 10px; font-size: 12px;">
            Verifique se o serviço singem-ai está rodando na porta 8010
          </div>
        </div>
      `;
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

    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = '<p style="color: #1565c0;">⏳ Reconstruindo índice... Isso pode levar alguns minutos.</p>';
    }

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
        if (resultEl) {
          resultEl.innerHTML = `<p style="color: #c62828;">❌ ${escapeHtml(msg)}</p>`;
        }
        return;
      }

      const data = response.data;
      const total = data?.indexed_count ?? data?.total ?? '?';
      notifySuccess(`Índice reconstruído com sucesso! (${total} documentos)`);
      if (resultEl) {
        resultEl.innerHTML = `<p style="color: #2e7d32;">✅ Índice reconstruído — ${escapeHtml(String(total))} documentos indexados.</p>`;
      }
    } catch {
      notifyError('Erro ao reconstruir índice.');
      if (resultEl) {
        resultEl.innerHTML = '<p style="color: #c62828;">❌ Erro de conexão ao reconstruir índice.</p>';
      }
    } finally {
      if (btn) {
        btn.disabled = false;
      }
    }
  }
}

window.settingsIA = new SettingsIA();
