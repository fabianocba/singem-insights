let initialized = false;

export function initVisualAudits() {
  initialized = true;
}

export async function refreshVisualAudit(_scope, _options = {}) {
  if (!initialized) {
    initVisualAudits();
  }
}

export function scheduleVisualAuditRefresh(scope, options = {}) {
  void scope;
  void options;
  if (!initialized) {
    initVisualAudits();
  }
}
