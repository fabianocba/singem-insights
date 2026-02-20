/* ui-integration.js
 * Integração do parser refinado na UI existente do SINGEM
 * - Adiciona checkbox "Usar Parser Refinado" nos uploads
 * - Modal "Ver Parsing" para visualizar resultado detalhado
 * - Integra com fluxo de upload de NE/NF sem quebrar o existente
 */
(function (global) {
  'use strict';

  // Estado global da integração
  const state = {
    useRefinedParser: false,
    lastParseResult: null,
    isProcessing: false
  };

  // Inicializa a integração quando DOM estiver pronto
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  function setup() {
    console.log('[Parser Refinado] Inicializando integração UI...');

    // Adiciona checkbox toggle na seção de upload (se existir)
    injectParserToggle();

    // Cria modal de visualização
    createViewParsingModal();

    // Intercepta upload de PDFs para usar parser refinado quando ativo
    interceptPdfUpload();

    console.log('[Parser Refinado] UI integrada com sucesso.');
  }

  function injectParserToggle() {
    // Procura pelo input de upload de NE/NF
    const uploaders = [
      document.getElementById('pdfUploadNE'),
      document.getElementById('pdfUploadNF'),
      document.querySelector('input[type="file"][accept*="pdf"]')
    ].filter(Boolean);

    uploaders.forEach((uploader) => {
      const parent = uploader.parentElement;
      if (!parent || parent.querySelector('.parser-toggle')) {
        return;
      } // já existe

      // Container do toggle
      const toggleDiv = document.createElement('div');
      toggleDiv.className = 'parser-toggle';
      toggleDiv.style.cssText = 'margin-top: 10px; display: flex; align-items: center; gap: 8px;';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.id = `useRefined_${uploader.id}`;
      checkbox.checked = state.useRefinedParser;
      checkbox.addEventListener('change', (e) => {
        state.useRefinedParser = e.target.checked;
        console.log(`[Parser Refinado] ${e.target.checked ? 'Ativado' : 'Desativado'}`);
      });

      const label = document.createElement('label');
      label.htmlFor = checkbox.id;
      label.style.cssText = 'cursor: pointer; user-select: none; font-size: 14px;';
      label.innerHTML = `
        <span style="font-weight: 600;">🔬 Usar Parser Refinado</span>
        <span style="font-size: 12px; color: #666; margin-left: 5px;">
          (extração avançada com IA)
        </span>
      `;

      toggleDiv.appendChild(checkbox);
      toggleDiv.appendChild(label);
      parent.appendChild(toggleDiv);
    });
  }

  function createViewParsingModal() {
    if (document.getElementById('viewParsingModal')) {
      return;
    } // já existe

    const modal = document.createElement('div');
    modal.id = 'viewParsingModal';
    modal.className = 'modal';
    modal.style.cssText =
      'display: none; position: fixed; z-index: 10000; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); overflow: auto;';

    modal.innerHTML = `
      <div class="modal-content" style="background: #fff; margin: 2% auto; padding: 30px; width: 90%; max-width: 1200px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.3); position: relative;">
        <span class="close" style="position: absolute; top: 15px; right: 20px; font-size: 32px; font-weight: bold; cursor: pointer; color: #999; line-height: 1;">&times;</span>

        <h2 style="margin: 0 0 20px 0; color: #333; border-bottom: 2px solid #4CAF50; padding-bottom: 10px;">
          🔬 Resultado do Parser Refinado
        </h2>

        <div id="parsingStats" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 25px;">
          <!-- Cards de estatísticas serão inseridos aqui -->
        </div>

        <div style="display: flex; gap: 15px; margin-bottom: 20px;">
          <button id="btnShowParsedData" class="tab-btn active" style="flex: 1; padding: 12px; border: none; background: #4CAF50; color: white; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.3s;">
            📋 Dados Extraídos
          </button>
          <button id="btnShowWarnings" class="tab-btn" style="flex: 1; padding: 12px; border: none; background: #f0f0f0; color: #666; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.3s;">
            ⚠️ Avisos
          </button>
          <button id="btnShowJSON" class="tab-btn" style="flex: 1; padding: 12px; border: none; background: #f0f0f0; color: #666; font-weight: 600; border-radius: 6px; cursor: pointer; transition: all 0.3s;">
            📄 JSON Completo
          </button>
        </div>

        <div id="parsingContent" style="background: #f9f9f9; padding: 20px; border-radius: 8px; max-height: 500px; overflow-y: auto; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.6;">
          <!-- Conteúdo dinâmico -->
        </div>

        <div style="margin-top: 20px; text-align: right;">
          <button id="btnCopyJSON" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 6px; cursor: pointer; margin-right: 10px;">
            📋 Copiar JSON
          </button>
          <button id="btnCloseModal" style="padding: 10px 20px; border: none; background: #4CAF50; color: white; border-radius: 6px; cursor: pointer; font-weight: 600;">
            ✅ Fechar
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event listeners
    const closeBtn = modal.querySelector('.close');
    const closeModalBtn = modal.querySelector('#btnCloseModal');
    const copyBtn = modal.querySelector('#btnCopyJSON');

    [closeBtn, closeModalBtn].forEach((btn) => {
      btn.addEventListener('click', () => {
        modal.style.display = 'none';
      });
    });

    // Fecha ao clicar fora
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.style.display = 'none';
      }
    });

    // Tabs
    const tabs = modal.querySelectorAll('.tab-btn');
    tabs.forEach((tab, idx) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => {
          t.style.background = '#f0f0f0';
          t.style.color = '#666';
        });
        tab.style.background = '#4CAF50';
        tab.style.color = 'white';

        if (idx === 0) {
          showParsedData();
        } else if (idx === 1) {
          showWarnings();
        } else {
          showJSON();
        }
      });
    });

    // Copy JSON
    copyBtn.addEventListener('click', () => {
      if (!state.lastParseResult) {
        return;
      }
      navigator.clipboard.writeText(JSON.stringify(state.lastParseResult, null, 2)).then(() => {
        copyBtn.textContent = '✅ Copiado!';
        setTimeout(() => {
          copyBtn.textContent = '📋 Copiar JSON';
        }, 2000);
      });
    });
  }

  function showParsedData() {
    const content = document.getElementById('parsingContent');
    if (!state.lastParseResult) {
      content.innerHTML = '<p style="color: #999;">Nenhum dado disponível.</p>';
      return;
    }

    const res = state.lastParseResult;
    let html = '<div style="color: #333;">';

    // Header
    if (res.header) {
      html += '<h3 style="color: #4CAF50; margin-top: 0;">📄 Cabeçalho</h3>';
      html += '<table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">';
      for (const [key, val] of Object.entries(res.header)) {
        if (val === null || val === undefined) {
          continue;
        }
        const displayVal = typeof val === 'object' ? JSON.stringify(val) : val;
        html += `<tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: 600; width: 200px;">${key}</td>
          <td style="padding: 8px;">${displayVal}</td>
        </tr>`;
      }
      html += '</table>';
    }

    // Itens
    if (res.itens && res.itens.length > 0) {
      html += `<h3 style="color: #4CAF50;">📦 Itens (${res.itens.length})</h3>`;
      html +=
        '<div style="overflow-x: auto;"><table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px;">';
      html += '<thead><tr style="background: #4CAF50; color: white;">';
      html += '<th style="padding: 8px; text-align: left;">Seq</th>';
      html += '<th style="padding: 8px; text-align: left;">Descrição</th>';
      html += '<th style="padding: 8px; text-align: right;">Qtd</th>';
      html += '<th style="padding: 8px; text-align: right;">V.Unit</th>';
      html += '<th style="padding: 8px; text-align: right;">V.Total</th>';
      html += '</tr></thead><tbody>';

      res.itens.slice(0, 50).forEach((it) => {
        html += `<tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 6px;">${it.seq || '-'}</td>
          <td style="padding: 6px;">${(it.descricao || '').slice(0, 80)}</td>
          <td style="padding: 6px; text-align: right;">${it.quantidade !== null ? it.quantidade : '-'}</td>
          <td style="padding: 6px; text-align: right;">${it.valorUnitario !== null ? it.valorUnitario.toFixed(2) : '-'}</td>
          <td style="padding: 6px; text-align: right;">${it.valorTotal !== null ? it.valorTotal.toFixed(2) : '-'}</td>
        </tr>`;
      });

      if (res.itens.length > 50) {
        html += `<tr><td colspan="5" style="padding: 10px; text-align: center; color: #999;">
          ... e mais ${res.itens.length - 50} itens (veja JSON completo)
        </td></tr>`;
      }
      html += '</tbody></table></div>';
    }

    // Totais
    if (res.totais) {
      html += '<h3 style="color: #4CAF50;">💰 Totais</h3>';
      html += '<table style="width: 100%; border-collapse: collapse;">';
      for (const [key, val] of Object.entries(res.totais)) {
        if (val === null || val === undefined) {
          continue;
        }
        html += `<tr style="border-bottom: 1px solid #ddd;">
          <td style="padding: 8px; font-weight: 600; width: 200px;">${key}</td>
          <td style="padding: 8px; text-align: right;">R$ ${typeof val === 'number' ? val.toFixed(2) : val}</td>
        </tr>`;
      }
      html += '</table>';
    }

    html += '</div>';
    content.innerHTML = html;
  }

  function showWarnings() {
    const content = document.getElementById('parsingContent');
    if (!state.lastParseResult) {
      content.innerHTML = '<p style="color: #999;">Nenhum dado disponível.</p>';
      return;
    }

    const res = state.lastParseResult;
    let html = '<div style="color: #333;">';

    if (res.warnings && res.warnings.length > 0) {
      html += '<h3 style="color: #ff9800; margin-top: 0;">⚠️ Avisos</h3>';
      html += '<ul style="list-style: none; padding: 0;">';
      res.warnings.forEach((w) => {
        html += `<li style="padding: 10px; margin-bottom: 10px; background: #fff3cd; border-left: 4px solid #ff9800; border-radius: 4px;">
          <strong>${w.msg || w}</strong>
          ${w.meta ? `<pre style="margin: 5px 0 0 0; font-size: 11px;">${JSON.stringify(w.meta, null, 2)}</pre>` : ''}
        </li>`;
      });
      html += '</ul>';
    } else {
      html += '<p style="color: #4CAF50;">✅ Nenhum aviso. Extração limpa!</p>';
    }

    if (res.errors && res.errors.length > 0) {
      html += '<h3 style="color: #f44336; margin-top: 20px;">❌ Erros</h3>';
      html += '<ul style="list-style: none; padding: 0;">';
      res.errors.forEach((e) => {
        html += `<li style="padding: 10px; margin-bottom: 10px; background: #ffebee; border-left: 4px solid #f44336; border-radius: 4px;">
          <strong>${e.msg || e}</strong>
          ${e.meta ? `<pre style="margin: 5px 0 0 0; font-size: 11px;">${JSON.stringify(e.meta, null, 2)}</pre>` : ''}
        </li>`;
      });
      html += '</ul>';
    }

    html += '</div>';
    content.innerHTML = html;
  }

  function showJSON() {
    const content = document.getElementById('parsingContent');
    if (!state.lastParseResult) {
      content.innerHTML = '<p style="color: #999;">Nenhum dado disponível.</p>';
      return;
    }

    content.innerHTML = `<pre style="margin: 0; white-space: pre-wrap; word-break: break-word; color: #333;">${JSON.stringify(state.lastParseResult, null, 2)}</pre>`;
  }

  function updateStats(result) {
    const statsDiv = document.getElementById('parsingStats');
    if (!statsDiv) {
      return;
    }

    const stats = [
      { label: 'Tipo', value: result.tipo || 'Desconhecida', icon: '📋', color: '#2196F3' },
      {
        label: 'Confiança',
        value: `${((result.confidence || 0) * 100).toFixed(1)}%`,
        icon: '🎯',
        color: result.confidence >= 0.85 ? '#4CAF50' : result.confidence >= 0.7 ? '#ff9800' : '#f44336'
      },
      { label: 'Itens', value: result.itens ? result.itens.length : 0, icon: '📦', color: '#9C27B0' },
      { label: 'Avisos', value: result.warnings ? result.warnings.length : 0, icon: '⚠️', color: '#ff9800' },
      { label: 'Tempo', value: result.timing ? `${result.timing.ms}ms` : '-', icon: '⏱️', color: '#607D8B' }
    ];

    statsDiv.innerHTML = stats
      .map(
        (s) => `
      <div style="background: ${s.color}15; border-left: 4px solid ${s.color}; padding: 15px; border-radius: 8px;">
        <div style="font-size: 24px; margin-bottom: 5px;">${s.icon}</div>
        <div style="font-size: 13px; color: #666; margin-bottom: 5px;">${s.label}</div>
        <div style="font-size: 20px; font-weight: 600; color: ${s.color};">${s.value}</div>
      </div>
    `
      )
      .join('');
  }

  function showParsingModal(result) {
    state.lastParseResult = result;
    const modal = document.getElementById('viewParsingModal');
    if (!modal) {
      return;
    }

    updateStats(result);
    showParsedData(); // default tab
    modal.style.display = 'block';
  }

  function interceptPdfUpload() {
    // Intercepta a função global de upload de PDF (se existir)
    const originalPdfReader = global.pdfReader;

    // Wrapper que verifica se deve usar parser refinado
    global.parseWithRefinedIfEnabled = async function (file) {
      if (!state.useRefinedParser || !global.parsePdfRefined) {
        // Usa parser padrão
        if (originalPdfReader && originalPdfReader.readPDF) {
          return await originalPdfReader.readPDF(file);
        }
        throw new Error('Parser padrão não disponível');
      }

      // Usa parser refinado
      state.isProcessing = true;
      try {
        const result = await global.parsePdfRefined(file);

        // Mostra modal automaticamente
        showParsingModal(result);

        // Retorna no formato compatível com o sistema existente
        return convertToLegacyFormat(result);
      } finally {
        state.isProcessing = false;
      }
    };

    // Expõe função para abrir modal manualmente
    global.showRefinedParsingResult = showParsingModal;
  }

  function convertToLegacyFormat(refinedResult) {
    // Converte resultado do parser refinado para formato esperado pelo sistema existente
    return {
      tipo: refinedResult.tipo,
      numero: refinedResult.header?.numero || null,
      data: refinedResult.header?.dataEmissaoISO || refinedResult.header?.dataEmissao || null,
      fornecedor: refinedResult.header?.cnpj?.masked || null,
      valor: refinedResult.totais?.vNF || refinedResult.totais?.vProd || null,
      itens: refinedResult.itens || [],
      raw: refinedResult,
      confidence: refinedResult.confidence
    };
  }

  // Expõe API pública
  global.refinedParserUI = {
    init,
    showModal: showParsingModal,
    isEnabled: () => state.useRefinedParser,
    enable: () => {
      state.useRefinedParser = true;
    },
    disable: () => {
      state.useRefinedParser = false;
    },
    getLastResult: () => state.lastParseResult
  };

  // Auto-init
  init();
})(window);
