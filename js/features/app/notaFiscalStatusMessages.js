export function updateStatusMessage(app, statusDiv, stateKey, message, type) {
  if (!statusDiv) {
    return;
  }

  const normalizedMessage = String(message || '');
  const nextStatus = { message: normalizedMessage, type, hidden: false };
  const prevStatus = app.notaFiscalUIState[stateKey];

  if (
    prevStatus &&
    prevStatus.hidden === false &&
    prevStatus.message === nextStatus.message &&
    prevStatus.type === nextStatus.type
  ) {
    return;
  }

  if (statusDiv.textContent !== normalizedMessage) {
    statusDiv.textContent = normalizedMessage;
  }

  const className = `status-message ${type}`;
  if (statusDiv.className !== className) {
    statusDiv.className = className;
  }

  if (statusDiv.classList.contains('hidden')) {
    statusDiv.classList.remove('hidden');
  }

  app.notaFiscalUIState[stateKey] = nextStatus;
}

export function hideStatusMessage(app, statusDiv, stateKey) {
  if (!statusDiv) {
    return;
  }

  const prevStatus = app.notaFiscalUIState[stateKey];
  if (prevStatus?.hidden === true && statusDiv.classList.contains('hidden')) {
    return;
  }

  statusDiv.classList.add('hidden');

  app.notaFiscalUIState[stateKey] = {
    message: prevStatus?.message || '',
    type: prevStatus?.type || 'info',
    hidden: true
  };
}
