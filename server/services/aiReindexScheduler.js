const { config } = require('../config');
const aiCoreClient = require('./aiCoreClient');

const scheduledEntityTypes = new Set();
let scheduledTimer = null;

function flushScheduledReindex(source = 'scheduler') {
  const entityTypes = [...scheduledEntityTypes];
  scheduledEntityTypes.clear();
  scheduledTimer = null;

  if (entityTypes.length === 0) {
    return;
  }

  aiCoreClient
    .rebuildIndex({ entity_types: entityTypes, clear_first: false })
    .then((result) => {
      console.log('[AI] Reindex concluido:', {
        source,
        entityTypes,
        upserted: result?.upserted || 0
      });
    })
    .catch((error) => {
      console.warn('[AI] Reindex best effort falhou:', {
        source,
        entityTypes,
        error: error?.message || 'erro desconhecido'
      });
    });
}

function scheduleAiReindex(entityTypes = [], source = 'unknown') {
  if (!config.ai.enabled || !config.ai.autoReindexOnMutation) {
    return;
  }

  const normalized = entityTypes
    .map((value) =>
      String(value || '')
        .trim()
        .toLowerCase()
    )
    .filter(Boolean);

  if (normalized.length === 0) {
    return;
  }

  for (const entityType of normalized) {
    scheduledEntityTypes.add(entityType);
  }

  if (scheduledTimer) {
    return;
  }

  scheduledTimer = setTimeout(() => flushScheduledReindex(source), config.ai.reindexDebounceMs);
}

module.exports = {
  scheduleAiReindex
};
