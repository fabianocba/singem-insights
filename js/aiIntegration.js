import * as FormatUtils from './core/format.js';
import apiClient from './services/apiClient.js';

const availabilityState = {
  value: null,
  expiresAt: 0
};

function setAvailability(value, ttlMs) {
  availabilityState.value = value;
  availabilityState.expiresAt = Date.now() + ttlMs;
}

async function ensureAiAvailable() {
async function ensureAiAvailable(options = {}) {
  const forceRefresh = options?.forceRefresh === true;

  if (!forceRefresh && availabilityState.value !== null && Date.now() < availabilityState.expiresAt) {
    return availabilityState.value;
  }

  try {
    const result = await apiClient.ai.health();
    const available = Boolean(result?.enabled !== false && result?.ok);
    setAvailability(available, available ? 120000 : 30000);
    return available;
  } catch {
    setAvailability(false, 30000);
    return false;
  }
}

function markUnavailableFromError(error) {
  const status = Number(error?.status || 0);
  if (status === 0 || status === 503 || status === 504) {
    setAvailability(false, 30000);
  }
}

export async function isAiAvailable(options = {}) {
  return ensureAiAvailable(options);
}

export function handleAiAvailabilityError(error) {
  markUnavailableFromError(error);
}

function debounce(fn, waitMs = 500) {
  let timer = null;

  const wrapped = (...args) => {
    if (timer) {
      clearTimeout(timer);
    }
    timer = setTimeout(() => {
      timer = null;
      fn(...args);
    }, waitMs);
  };

  wrapped.cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return wrapped;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function hideSuggestion(container) {
  if (!container) {
    return;
  }
  container.innerHTML = '';
  container.classList.add('hidden');
}

function renderLoading(container, label) {
  if (!container) {
    return;
  }
  container.innerHTML = `<div class="ai-assist-loading">${escapeHtml(label)}</div>`;
  container.classList.remove('hidden');
}

function formatConfidence(value) {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;
  return `${Math.round(safe * 100)}%`;
}

function getEntityLabel(entityType) {
  switch (String(entityType || '').toLowerCase()) {
    case 'catmat_item':
      return 'CATMAT';
    case 'fornecedor':
      return 'Fornecedor';
    case 'material':
      return 'Material';
    default:
      return 'Sugestao';
  }
}

async function sendFeedback(featureName, queryText, suggestion, accepted) {
  if (!suggestion) {
    return;
  }

  try {
    await apiClient.ai.feedback({
      feature_name: featureName,
      query_text: queryText,
      suggested_entity_type: suggestion.entity_type,
      suggested_entity_id: suggestion.entity_id,
      accepted,
      context: {
        source: 'frontend-ui',
        confidence: suggestion.confidence
      }
    });
  } catch {
    // Feedback e best effort.
  }
}

function renderCard(
  container,
  { title, badge, confidence, explanation, metaText, alternativesCount, onApply, onDismiss }
) {
  container.innerHTML = `
    <div class="ai-assist-head">
      <span class="ai-assist-chip">IA</span>
      <span class="ai-assist-chip ai-assist-chip-muted">${escapeHtml(badge)}</span>
      <span class="ai-assist-chip ai-assist-chip-score">${escapeHtml(confidence)}</span>
    </div>
    <div class="ai-assist-title">${escapeHtml(title)}</div>
    <div class="ai-assist-text">${escapeHtml(explanation)}</div>
    ${metaText ? `<div class="ai-assist-meta">${escapeHtml(metaText)}</div>` : ''}
    ${alternativesCount > 0 ? `<div class="ai-assist-meta">+ ${alternativesCount} alternativa(s)</div>` : ''}
    <div class="ai-assist-actions">
      <button type="button" class="btn btn-primary btn-sm" data-ai-action="apply">Aplicar</button>
      <button type="button" class="btn btn-outline btn-sm" data-ai-action="dismiss">Ignorar</button>
    </div>
  `;
  container.classList.remove('hidden');
  container.querySelector('[data-ai-action="apply"]')?.addEventListener('click', onApply);
  container.querySelector('[data-ai-action="dismiss"]')?.addEventListener('click', onDismiss);
}

export function initFornecedorAIAssist({ input, cnpjInput, container, contextModule = 'empenhos', onApply, onError }) {
  if (!input || !cnpjInput || !container) {
    return () => {};
  }

  let currentController = null;
  let requestVersion = 0;

  const run = async () => {
    const text = String(input.value || '').trim();
    const normalizedCnpj = FormatUtils.onlyDigits(String(cnpjInput.value || ''));

    if (text.length < 3 && normalizedCnpj.length < 14) {
      hideSuggestion(container);
      return;
    }

    const available = await ensureAiAvailable();
    if (!available) {
      hideSuggestion(container);
      return;
    }

    if (currentController) {
      currentController.abort();
    }

    const controller = new AbortController();
    currentController = controller;
    const version = ++requestVersion;

    renderLoading(container, 'Analisando fornecedor...');

    try {
      const response = await apiClient.ai.suggestFornecedor(
        {
          text,
          cnpj: normalizedCnpj || undefined,
          context_module: contextModule,
          limit: 4
        },
        { signal: controller.signal }
      );

      if (version !== requestVersion) {
        return;
      }

      const suggestion = response?.suggestion_main || response?.alternatives?.[0];
      if (!suggestion) {
        hideSuggestion(container);
        return;
      }

      const metaCnpj = FormatUtils.onlyDigits(String(suggestion?.metadata?.cnpj || ''));
      const metaText = metaCnpj ? `CNPJ ${FormatUtils.formatCNPJ(metaCnpj)}` : '';

      renderCard(container, {
        title: suggestion.title,
        badge: getEntityLabel(suggestion.entity_type),
        confidence: formatConfidence(suggestion.confidence),
        explanation: suggestion.explanation || 'Sugestao gerada a partir do historico do sistema.',
        metaText,
        alternativesCount: Array.isArray(response?.alternatives) ? response.alternatives.length : 0,
        onApply: async () => {
          onApply?.(suggestion);
          hideSuggestion(container);
          await sendFeedback('suggest_fornecedor_ui', text, suggestion, true);
        },
        onDismiss: async () => {
          hideSuggestion(container);
          await sendFeedback('suggest_fornecedor_ui', text, suggestion, false);
        }
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      markUnavailableFromError(error);
      hideSuggestion(container);
      onError?.(error);
    }
  };

  const debouncedRun = debounce(run, 550);
  input.addEventListener('input', debouncedRun);
  cnpjInput.addEventListener('input', debouncedRun);
  input.addEventListener('blur', debouncedRun);
  cnpjInput.addEventListener('blur', debouncedRun);

  return () => {
    debouncedRun.cancel();
    input.removeEventListener('input', debouncedRun);
    cnpjInput.removeEventListener('input', debouncedRun);
    input.removeEventListener('blur', debouncedRun);
    cnpjInput.removeEventListener('blur', debouncedRun);
    if (currentController) {
      currentController.abort();
    }
    hideSuggestion(container);
  };
}

export function initItemModalAIAssist({ overlay, contextModule = 'empenhos', onApply, onError }) {
  if (!overlay) {
    return () => {};
  }

  const descricaoInput = overlay.querySelector('#modalDescricao');
  const container = overlay.querySelector('#modalAiItemSuggestion');
  if (!descricaoInput || !container) {
    return () => {};
  }

  let currentController = null;
  let requestVersion = 0;

  const run = async () => {
    const text = String(descricaoInput.value || '').trim();
    const unidade = String(overlay.querySelector('#modalUnidade')?.value || '').trim();
    const catmatCodigo = String(overlay.querySelector('#modalCatmatCodigo')?.value || '').trim();

    if (text.length < 4) {
      hideSuggestion(container);
      return;
    }

    const available = await ensureAiAvailable();
    if (!available) {
      hideSuggestion(container);
      return;
    }

    if (currentController) {
      currentController.abort();
    }

    const controller = new AbortController();
    currentController = controller;
    const version = ++requestVersion;

    renderLoading(container, 'Buscando item parecido...');

    try {
      const response = await apiClient.ai.suggestItem(
        {
          text,
          context_module: contextModule,
          hints: {
            unidade,
            catmatCodigo
          },
          limit: 4
        },
        { signal: controller.signal }
      );

      if (version !== requestVersion) {
        return;
      }

      const suggestion = response?.suggestion_main || response?.alternatives?.[0];
      if (!suggestion) {
        hideSuggestion(container);
        return;
      }

      const metadata = suggestion.metadata || {};
      const metaParts = [];
      if (suggestion.entity_type === 'catmat_item' && metadata.codigo) {
        metaParts.push(`CATMAT ${metadata.codigo}`);
      }
      if (metadata.unidade) {
        metaParts.push(`UN ${metadata.unidade}`);
      }

      renderCard(container, {
        title: suggestion.title,
        badge: getEntityLabel(suggestion.entity_type),
        confidence: formatConfidence(suggestion.confidence),
        explanation: suggestion.explanation || 'Sugestao gerada a partir do indice interno.',
        metaText: metaParts.join(' | '),
        alternativesCount: Array.isArray(response?.alternatives) ? response.alternatives.length : 0,
        onApply: async () => {
          onApply?.(suggestion);
          hideSuggestion(container);
          await sendFeedback('suggest_item_ui', text, suggestion, true);
        },
        onDismiss: async () => {
          hideSuggestion(container);
          await sendFeedback('suggest_item_ui', text, suggestion, false);
        }
      });
    } catch (error) {
      if (error?.name === 'AbortError') {
        return;
      }

      markUnavailableFromError(error);
      hideSuggestion(container);
      onError?.(error);
    }
  };

  const debouncedRun = debounce(run, 600);
  descricaoInput.addEventListener('input', debouncedRun);
  descricaoInput.addEventListener('blur', debouncedRun);

  return () => {
    debouncedRun.cancel();
    descricaoInput.removeEventListener('input', debouncedRun);
    descricaoInput.removeEventListener('blur', debouncedRun);
    if (currentController) {
      currentController.abort();
    }
    hideSuggestion(container);
  };
}
