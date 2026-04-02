function buildDetailsHtml(details) {
  if (!details) {
    return '';
  }

  if (details instanceof Error) {
    return `
      <div style="margin-top: 15px; padding: 15px; background: #2a2a2a; border-radius: 5px; border-left: 3px solid #dc3545;">
        <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">Detalhes tecnicos (selecione para copiar):</div>
        <div style="
          font-family: 'Courier New', monospace;
          font-size: 12px;
          white-space: pre-wrap;
          word-break: break-all;
          max-height: 200px;
          overflow-y: auto;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
          color: #ff6b6b;
          line-height: 1.6;
          padding: 10px;
          background: #1a1a1a;
          border-radius: 3px;
        ">${details.message}

Stack Trace:
${details.stack || 'Não disponível'}</div>
      </div>
    `;
  }

  if (typeof details === 'object') {
    return `
      <div style="margin-top: 15px; padding: 15px; background: #2a2a2a; border-radius: 5px; border-left: 3px solid #dc3545;">
        <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">Detalhes (selecione para copiar):</div>
        <div style="
          font-family: 'Courier New', monospace;
          font-size: 12px;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
          user-select: text;
          -webkit-user-select: text;
          color: #ff6b6b;
          padding: 10px;
          background: #1a1a1a;
          border-radius: 3px;
        ">${JSON.stringify(details, null, 2)}</div>
      </div>
    `;
  }

  return `
    <div style="margin-top: 15px; padding: 15px; background: #2a2a2a; border-radius: 5px; border-left: 3px solid #dc3545;">
      <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">Detalhes (selecione para copiar):</div>
      <div style="
        font-family: 'Courier New', monospace;
        font-size: 12px;
        white-space: pre-wrap;
        user-select: text;
        -webkit-user-select: text;
        color: #ff6b6b;
        padding: 10px;
        background: #1a1a1a;
        border-radius: 3px;
      ">${String(details)}</div>
    </div>
  `;
}

function ensureErrorModalAnimations() {
  if (document.getElementById('sg-error-modal-animations')) {
    return;
  }

  const style = document.createElement('style');
  style.id = 'sg-error-modal-animations';
  style.textContent = `
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes slideDown {
      from { transform: translateY(-50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(style);
}

export function showError(app, message, details = null) {
  console.error('[APP] ❌ ERRO:', message);
  if (details) {
    console.error('[APP] 📋 Detalhes:', details);
    if (details instanceof Error) {
      console.error('[APP] 📚 Stack:', details.stack);
    }
  }

  const oldModal = document.getElementById('error-modal-custom');
  if (oldModal) {
    oldModal.remove();
  }

  ensureErrorModalAnimations();

  const safeMessage = String(message || '').replace(/'/g, "\\'");
  const detailsHtml = buildDetailsHtml(details);

  const modal = document.createElement('div');
  modal.id = 'error-modal-custom';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 999999;
    animation: fadeIn 0.2s;
  `;

  modal.innerHTML = `
    <div style="
      background: #1e1e1e;
      color: white;
      padding: 30px;
      border-radius: 10px;
      max-width: 700px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 10px 50px rgba(0, 0, 0, 0.5);
      animation: slideDown 0.3s;
    ">
      <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 20px;">
        <div style="font-size: 48px;">Erro</div>
        <div>
          <h2 style="margin: 0; color: #dc3545; font-size: 24px;">Erro ao Salvar</h2>
          <p style="margin: 5px 0 0 0; color: #ccc; font-size: 14px;">Ocorreu um problema durante o salvamento</p>
        </div>
      </div>

      <div style="
        background: #2a2a2a;
        padding: 20px;
        border-radius: 8px;
        margin-bottom: 20px;
        border-left: 4px solid #dc3545;
      ">
        <div style="font-weight: bold; color: #fff; margin-bottom: 10px;">Mensagem:</div>
        <div style="
          color: #ff6b6b;
          line-height: 1.6;
          user-select: text;
          -webkit-user-select: text;
          -moz-user-select: text;
          -ms-user-select: text;
        ">${message}</div>
      </div>

      ${detailsHtml}

      <div style="margin-top: 20px; padding: 15px; background: #2a2a2a; border-radius: 5px; border-left: 3px solid #ffc107;">
        <div style="font-weight: bold; color: #ffc107; margin-bottom: 10px;">Como reportar:</div>
        <ol style="margin: 10px 0; padding-left: 20px; color: #ccc; line-height: 1.8;">
          <li>Selecione e copie (Ctrl+C) a mensagem de erro acima</li>
          <li>Abra o Console (pressione F12)</li>
          <li>Tire um screenshot do console</li>
          <li>Envie ambos (mensagem + screenshot) para o suporte</li>
        </ol>
      </div>

      <div style="display: flex; gap: 10px; margin-top: 25px; justify-content: flex-end;">
        <button onclick="console.log('=== DETALHES DO ERRO ==='); console.error('${safeMessage}'); ${details ? `console.error(${JSON.stringify(details)});` : ''} alert('Erro registrado no console. Pressione F12 para ver.')"
          style="
            background: #6c757d;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#5a6268'"
          onmouseout="this.style.background='#6c757d'"
        >
          Registrar no Console
        </button>
        <button onclick="document.getElementById('error-modal-custom').remove()"
          style="
            background: #dc3545;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 5px;
            cursor: pointer;
            font-weight: 600;
            font-size: 14px;
            transition: background 0.2s;
          "
          onmouseover="this.style.background='#c82333'"
          onmouseout="this.style.background='#dc3545'"
        >
          ✓ Fechar
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      modal.remove();
    }
  });

  const handleEsc = (event) => {
    if (event.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
}

export function showWarning(app, message) {
  void app;
  alert(message);
}
