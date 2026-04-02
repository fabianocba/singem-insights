export { formatarCNPJ, converterMoedaParaNumero, formatarMoeda } from './notaFiscalFormatters.js';
export { updateStatusMessage, hideStatusMessage } from './notaFiscalStatusMessages.js';
export { selecionarOpcaoEntrada } from './notaFiscalOptions.js';
export { limparInfoEmpenhoNF, criarDatalistItensEmpenho } from './notaFiscalEmpenhoUi.js';

export function setupNotaFiscalOptions(app) {
  app._refreshNotaFiscalOptionRefs();

  if (!app.notaFiscalUIState.opcaoHandlersBound) {
    (app.notaFiscalUIState.opcaoCards || []).forEach((card) => {
      card.addEventListener('click', (e) => {
        const opcao = e.currentTarget.dataset.opcao;
        app.selecionarOpcaoEntrada(opcao);
      });
    });
    app.notaFiscalUIState.opcaoHandlersBound = true;
  }

  app.setupChaveAcesso();
}

export function getNotaFiscalRefs(app) {
  const current = app.notaFiscalUIState.refs;
  if (current && current.chaveInput && document.contains(current.chaveInput)) {
    return current;
  }

  app.notaFiscalUIState.refs = {
    chaveInput: document.getElementById('chaveAcessoInput'),
    btnBuscarPorChave: document.getElementById('btnBuscarPorChave'),
    btnLimparChave: document.getElementById('btnLimparChave'),
    chaveStatus: document.getElementById('chaveStatus'),
    barcodeVideo: document.getElementById('barcodeVideo'),
    btnStartCamera: document.getElementById('btnStartCamera'),
    btnStopCamera: document.getElementById('btnStopCamera'),
    btnSwitchCamera: document.getElementById('btnSwitchCamera'),
    btnUsarCodigoBarras: document.getElementById('btnUsarCodigoBarras'),
    barcodeData: document.getElementById('barcodeData'),
    barcodeResult: document.getElementById('barcodeResult'),
    barcodeStatus: document.getElementById('barcodeStatus')
  };

  return app.notaFiscalUIState.refs;
}

export function refreshNotaFiscalOptionRefs(app) {
  const opcaoCards = Array.from(document.querySelectorAll('.opcao-card'));
  const entradaContents = Array.from(document.querySelectorAll('.entrada-content'));

  app.notaFiscalUIState.opcaoCards = opcaoCards;
  app.notaFiscalUIState.entradaContents = entradaContents;
}

export function setupChaveAcesso(app) {
  const { chaveInput, btnBuscarPorChave: btnBuscar, btnLimparChave: btnLimpar } = app._getNotaFiscalRefs();

  if (!chaveInput || !btnBuscar || !btnLimpar) {
    return;
  }

  if (app.notaFiscalUIState.chaveHandlersBound) {
    return;
  }

  chaveInput.addEventListener('input', (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 44);
    e.target.value = value;

    if (value.length === 44) {
      btnBuscar.disabled = false;
      app.showChaveStatus('Chave válida! Clique em "Buscar" para consultar.', 'success');
    } else {
      btnBuscar.disabled = true;
      if (value.length > 0) {
        app.showChaveStatus(`Digite ${44 - value.length} dígitos restantes`, 'info');
      } else {
        app.hideChaveStatus();
      }
    }
  });

  btnBuscar.addEventListener('click', async () => {
    const chave = chaveInput.value.trim();
    if (chave.length === 44) {
      await app.buscarNotaFiscalPorChave(chave);
    }
  });

  btnLimpar.addEventListener('click', () => {
    chaveInput.value = '';
    btnBuscar.disabled = true;
    app.hideChaveStatus();
  });

  app.notaFiscalUIState.chaveHandlersBound = true;
}

export function setupCodigoBarras(app) {
  const {
    barcodeVideo: video,
    btnStartCamera: btnStart,
    btnStopCamera: btnStop,
    btnSwitchCamera: btnSwitch,
    btnUsarCodigoBarras: btnUsar,
    barcodeData
  } = app._getNotaFiscalRefs();

  if (!video || !btnStart || !btnStop) {
    return;
  }

  if (app.notaFiscalUIState.barcodeHandlersBound) {
    return;
  }

  app.stream = null;
  app.cameras = [];
  app.currentCameraIndex = 0;
  app.barcodeDetected = false;

  btnStart.addEventListener('click', async () => {
    await app.iniciarCamera();
  });

  btnStop.addEventListener('click', () => {
    app.pararCamera();
  });

  btnSwitch?.addEventListener('click', async () => {
    await app.trocarCamera();
  });

  btnUsar?.addEventListener('click', () => {
    app.usarCodigoBarras(barcodeData?.textContent || '');
  });

  app.notaFiscalUIState.barcodeHandlersBound = true;
}

export async function buscarNotaFiscalPorChave(app, chave) {
  try {
    app.showLoading('Consultando nota fiscal...');
    app.showChaveStatus('Consultando base de dados...', 'info');

    const dadosNF = await app.consultarChaveAcesso(chave);

    if (dadosNF) {
      app.preencherDadosNF(dadosNF);
      app.showChaveStatus('Nota fiscal encontrada e dados preenchidos!', 'success');
      app.showSuccess('Dados da nota fiscal carregados com sucesso!');
    } else {
      app.showChaveStatus('Nota fiscal não encontrada ou chave inválida', 'error');
      app.showError('Não foi possível encontrar a nota fiscal com esta chave');
    }
  } catch (error) {
    console.error('Erro ao buscar por chave:', error);
    app.showChaveStatus('Erro na consulta: ' + error.message, 'error');
    app.showError('Erro ao consultar nota fiscal: ' + error.message);
  } finally {
    app.hideLoading();
  }
}

export async function consultarChaveAcesso(chave) {
  try {
    const dadosAPI = await window.nfeIntegration.consultarPorChave(chave);

    if (dadosAPI) {
      return window.nfeIntegration.converterParaFormatoInterno(dadosAPI);
    }

    return null;
  } catch (error) {
    console.error('Erro na consulta via integração:', error);
    throw error;
  }
}

export async function iniciarCamera(app) {
  try {
    app.showBarcodeStatus('Inicializando câmera...', 'info');

    const devices = await navigator.mediaDevices.enumerateDevices();
    app.cameras = devices.filter((device) => device.kind === 'videoinput');

    if (app.cameras.length === 0) {
      throw new Error('Nenhuma câmera encontrada');
    }

    const constraints = {
      video: {
        deviceId: app.cameras[app.currentCameraIndex].deviceId,
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: app.cameras.length > 1 ? 'environment' : 'user'
      }
    };

    app.stream = await navigator.mediaDevices.getUserMedia(constraints);

    const { barcodeVideo: video, btnStartCamera, btnStopCamera, btnSwitchCamera } = app._getNotaFiscalRefs();
    if (!video) {
      throw new Error('Elemento de vídeo não encontrado');
    }
    video.srcObject = app.stream;

    btnStartCamera?.classList.add('hidden');
    btnStopCamera?.classList.remove('hidden');

    if (app.cameras.length > 1) {
      btnSwitchCamera?.classList.remove('hidden');
    }

    app.showBarcodeStatus('Câmera ativa. Aponte para o código de barras da NF-e', 'success');
    app.iniciarDeteccaoBarcode();
  } catch (error) {
    console.error('Erro ao iniciar câmera:', error);
    app.showBarcodeStatus('Erro ao acessar câmera: ' + error.message, 'error');
    app.showError('Não foi possível acessar a câmera: ' + error.message);
  }
}

export function pararCamera(app) {
  if (app.stream) {
    app.stream.getTracks().forEach((track) => track.stop());
    app.stream = null;
  }

  if (app.codeReader) {
    app.codeReader.reset();
    app.codeReader = null;
  }

  const {
    barcodeVideo: video,
    btnStartCamera,
    btnStopCamera,
    btnSwitchCamera,
    barcodeResult
  } = app._getNotaFiscalRefs();
  if (video) {
    video.srcObject = null;
  }

  btnStartCamera?.classList.remove('hidden');
  btnStopCamera?.classList.add('hidden');
  btnSwitchCamera?.classList.add('hidden');
  barcodeResult?.classList.add('hidden');

  app.hideBarcodeStatus();
  app.barcodeDetected = false;
}

export async function trocarCamera(app) {
  if (app.cameras.length <= 1) {
    return;
  }

  app.pararCamera();
  app.currentCameraIndex = (app.currentCameraIndex + 1) % app.cameras.length;
  await app.iniciarCamera();
}

export function iniciarDeteccaoBarcode(app) {
  try {
    if (typeof ZXing !== 'undefined') {
      app.codeReader = new ZXing.BrowserMultiFormatReader();

      app.codeReader.decodeFromVideoDevice(
        app.cameras[app.currentCameraIndex].deviceId,
        'barcodeVideo',
        (result, err) => {
          if (result) {
            app.codigoDetectado(result.text);
          }
          if (err && !(err instanceof ZXing.NotFoundException)) {
            console.error('Erro na detecção:', err);
          }
        }
      );
    } else {
      app.iniciarDeteccaoSimulada();
    }
  } catch (error) {
    console.error('Erro ao inicializar ZXing:', error);
    app.iniciarDeteccaoSimulada();
  }
}

export function iniciarDeteccaoSimulada(app) {
  const { barcodeVideo: video } = app._getNotaFiscalRefs();
  if (!video) {
    return;
  }
  let tentativas = 0;

  const detectar = () => {
    if (!app.stream || app.barcodeDetected) {
      return;
    }

    tentativas++;

    if (tentativas > 100 && Math.random() > 0.95) {
      const codigoSimulado = app.gerarCodigoBarrasSimulado();
      app.codigoDetectado(codigoSimulado);
      return;
    }

    requestAnimationFrame(detectar);
  };

  video.addEventListener('loadedmetadata', () => {
    app.showBarcodeStatus(
      'Modo demonstração ativo. Em 5-10 segundos será simulada a detecção de um código.',
      'warning'
    );
    detectar();
  });
}

export function gerarCodigoBarrasSimulado() {
  const ano = '25';
  const mes = '10';
  const cnpj = '12345678000190';
  const modelo = '55';
  const serie = '001';
  const numero = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(9, '0');
  const resto = '0'.repeat(44 - 6 - 14 - 2 - 3 - 9);

  return ano + mes + cnpj + modelo + serie + numero + resto;
}

export function codigoDetectado(app, codigo) {
  app.barcodeDetected = true;

  const { barcodeData, barcodeResult } = app._getNotaFiscalRefs();
  if (barcodeData) {
    barcodeData.textContent = codigo;
  }
  barcodeResult?.classList.remove('hidden');

  app.showBarcodeStatus('Código detectado! Verifique os dados e clique em "Usar"', 'success');
}

export async function usarCodigoBarras(app, codigo) {
  try {
    const chave = app.extrairChaveDoCodigoBarras(codigo);

    if (chave) {
      app.pararCamera();
      await app.buscarNotaFiscalPorChave(chave);
    } else {
      app.showError('Não foi possível extrair chave de acesso do código');
    }
  } catch (error) {
    console.error('Erro ao processar código de barras:', error);
    app.showError('Erro ao processar código: ' + error.message);
  }
}

export function extrairChaveDoCodigoBarras(codigo) {
  try {
    return window.nfeIntegration.extrairChaveDoCodigoBarras(codigo);
  } catch (error) {
    console.error('Erro ao extrair chave:', error);
    throw error;
  }
}

export function preencherDadosNF(app, dados) {
  if (dados.numero) {
    document.getElementById('numeroNotaFiscal').value = dados.numero;
  }

  if (dados.data) {
    document.getElementById('dataNotaFiscal').value = dados.data;
  }

  if (dados.cnpjEmitente) {
    document.getElementById('cnpjEmitente').value = dados.cnpjEmitente;
  }

  if (dados.cnpjDestinatario) {
    document.getElementById('cnpjDestinatario').value = dados.cnpjDestinatario;
  }

  if (dados.chaveAcesso) {
    document.getElementById('chaveAcesso').value = dados.chaveAcesso;
  }

  if (dados.valorTotal) {
    document.getElementById('valorTotalNF').value = app.formatarMoeda(dados.valorTotal);
  }

  if (dados.itens && dados.itens.length > 0) {
    app.adicionarItensExtraidos('itensNotaFiscal', dados.itens);
    app.calcularSomaItensNF();
  }

  if (dados.cnpjEmitente) {
    app.buscarEmpenhoCorrespondente(dados.cnpjEmitente);
  }

  app.currentNotaFiscal = {
    extractedData: dados,
    source: 'api'
  };
}

export function showChaveStatus(app, message, type = 'info') {
  const { chaveStatus: statusDiv } = app._getNotaFiscalRefs();
  app._updateStatusMessage(statusDiv, 'chaveStatusLast', message, type);
}

export function hideChaveStatus(app) {
  const { chaveStatus: statusDiv } = app._getNotaFiscalRefs();
  app._hideStatusMessage(statusDiv, 'chaveStatusLast');
}

export function showBarcodeStatus(app, message, type = 'info') {
  const { barcodeStatus: statusDiv } = app._getNotaFiscalRefs();
  app._updateStatusMessage(statusDiv, 'barcodeStatusLast', message, type);
}

export function hideBarcodeStatus(app) {
  const { barcodeStatus: statusDiv } = app._getNotaFiscalRefs();
  app._hideStatusMessage(statusDiv, 'barcodeStatusLast');
}

export async function processarNotaFiscalUpload(app, file, textContent, extractedData) {
  try {
    app.currentNotaFiscal = {
      file: file,
      textContent: textContent,
      extractedData: extractedData
    };

    app.exibirPreviewNotaFiscal(extractedData);
    app.showSuccess('PDF processado com sucesso. Revise os dados extraidos abaixo.');
  } catch (error) {
    console.error('Erro ao processar upload de nota fiscal:', error);
    app.showError('Erro ao processar PDF: ' + error.message);
  }
}

export function mostrarSeletorItensEmpenho(app) {
  if (!app.empenhoVinculadoNF?.itens?.length) {
    app.showWarning('Selecione um empenho com itens antes de adicionar');
    return;
  }

  const itens = app.empenhoVinculadoNF.itens;
  const itensNaLista = new Set();

  document.querySelectorAll('#itensNotaFiscal .item-row').forEach((row) => {
    const descricao = row.querySelector('[data-field="descricao"]')?.value?.toUpperCase().trim();
    const itemCompra = row.querySelector('[data-field="itemCompra"]')?.value?.trim();
    if (itemCompra) {
      itensNaLista.add(`IC:${itemCompra}`);
    }
    if (descricao) {
      itensNaLista.add(`D:${descricao}`);
    }
  });

  const itensComStatus = itens.map((item, idx) => {
    const desc = (item.descricao || item.material || '').toUpperCase().trim();
    const ic = String(item.itemCompra || item.codigo || '').trim();
    const jaAdicionado = (ic && itensNaLista.has(`IC:${ic}`)) || itensNaLista.has(`D:${desc}`);
    return { ...item, idx, jaAdicionado };
  });

  const disponiveis = itensComStatus.filter((i) => !i.jaAdicionado);
  const jaAdicionados = itensComStatus.filter((i) => i.jaAdicionado);

  if (disponiveis.length === 0 && jaAdicionados.length > 0) {
    app.showInfo('Todos os itens do empenho ja foram adicionados a NF');
    return;
  }

  const self = app;
  const existente = document.getElementById('modalSeletorItensNF');
  if (existente) {
    existente.remove();
  }

  const modal = document.createElement('div');
  modal.id = 'modalSeletorItensNF';
  modal.className = 'modal-itens-empenho';

  modal.innerHTML = `
      <div class="overlay"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3 class="modal-title">Adicionar itens do empenho</h3>
          <button type="button" class="modal-close" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-controls">
          <button type="button" class="btn btn-sm btn-outline" id="btnMarcarTodosItensEmpenho">
            Marcar todos
          </button>
          <button type="button" class="btn btn-sm btn-outline" id="btnDesmarcarTodosItensEmpenho">
            Desmarcar todos
          </button>
          <span class="contador-itens">
            ${disponiveis.length} disponíveis${jaAdicionados.length ? `, ${jaAdicionados.length} já adicionados` : ''}
          </span>
        </div>
        <div class="modal-body" id="modalSeletorItensBody">
          <div class="itens-checklist">
            ${disponiveis
              .map(
                (item) => `
              <label class="it-check-row" data-idx="${item.idx}">
                <input type="checkbox" class="chkItemEmpenho" value="${item.idx}">
                <span class="item-badge">${item.itemCompra || item.codigo || item.idx + 1}</span>
                <div class="item-info">
                  <span class="item-desc">${(item.descricao || item.material || 'Sem descrição').toUpperCase()}</span>
                  <span class="item-meta">${item.unidade || 'UN'} • ${self.formatarMoeda(item.valorUnitario || 0)}</span>
                </div>
              </label>
            `
              )
              .join('')}
            ${jaAdicionados
              .map(
                (item) => `
              <label class="it-check-row ja-adicionado" data-idx="${item.idx}" title="Item já adicionado à NF">
                <input type="checkbox" class="chkItemEmpenho" value="${item.idx}" disabled>
                <span class="item-badge item-badge-ok">✓</span>
                <div class="item-info">
                  <span class="item-desc">${(item.descricao || item.material || 'Sem descrição').toUpperCase()}</span>
                  <span class="item-meta">${item.unidade || 'UN'} • ${self.formatarMoeda(item.valorUnitario || 0)} • <em>Já adicionado</em></span>
                </div>
              </label>
            `
              )
              .join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="btnCancelarItensEmpenho">Cancelar</button>
          <button type="button" class="btn btn-primary" id="btnConfirmarItensEmpenho">Adicionar selecionados</button>
        </div>
      </div>
    `;

  document.body.appendChild(modal);

  const fecharModal = () => modal.remove();
  const setAllChecks = (checked) => {
    modal.querySelectorAll('.chkItemEmpenho:not(:disabled)').forEach((chk) => {
      chk.checked = checked;
    });
  };

  modal.querySelector('.overlay').addEventListener('click', fecharModal);
  modal.querySelector('.modal-close').addEventListener('click', fecharModal);
  modal.querySelector('#btnCancelarItensEmpenho').addEventListener('click', fecharModal);
  modal.querySelector('#btnMarcarTodosItensEmpenho').addEventListener('click', () => setAllChecks(true));
  modal.querySelector('#btnDesmarcarTodosItensEmpenho').addEventListener('click', () => setAllChecks(false));

  modal.querySelector('#btnConfirmarItensEmpenho').addEventListener('click', () => {
    const checkboxes = modal.querySelectorAll('.chkItemEmpenho:checked');
    if (checkboxes.length === 0) {
      self.showWarning('Nenhum item selecionado');
      return;
    }

    checkboxes.forEach((cb) => {
      const item = itens[parseInt(cb.value)];
      if (item) {
        self.adicionarItemNFPreenchido(item);
      }
    });

    fecharModal();
    self.calcularValorTotalNotaFiscal();
    self.showSuccess(`${checkboxes.length} item(ns) adicionado(s)`);
  });

  setAllChecks(false);
  requestAnimationFrame(() => modal.classList.add('open'));
}

export function adicionarItemNFPreenchido(app, item) {
  const container = document.getElementById('itensNotaFiscal');
  const seq = (container?.querySelectorAll('tr.nf-row').length || 0) + 1;

  const refEmpenho = {
    quantidade: item.quantidade || item.qtd || 0,
    valorUnitario: item.valorUnitario || 0
  };

  const itemRow = app.criarItemRow(
    'notaFiscal',
    seq,
    (item.descricao || item.material || '').toUpperCase(),
    item.unidade || 'UN',
    null,
    item.valorUnitario || 0,
    item.subelemento || '',
    item.itemCompra || item.codigo || '',
    refEmpenho
  );

  itemRow.dataset.origem = 'EMPENHO';
  container.appendChild(itemRow);
}

export function calcularValorTotalNotaFiscal(app) {
  const container = document.getElementById('itensNotaFiscal');
  if (!container) {
    return;
  }

  let somaItens = 0;
  let rows = container.querySelectorAll('tr.nf-row');
  if (rows.length === 0) {
    rows = container.querySelectorAll('.item-row');
  }
  rows.forEach((row) => {
    const valorTotalStr = row.querySelector('[data-field="valorTotal"]')?.value || '0';
    const valorTotal = window.converterMoedaParaNumero(valorTotalStr);
    somaItens += valorTotal;
  });
  somaItens = app.money2(somaItens);

  const somaInput = document.getElementById('somaItensNF');
  if (somaInput) {
    somaInput.value = window.formatarNumero(somaItens);
  }

  const valorTotalInput = document.getElementById('valorTotalNF');
  const totalNFManual = app.money2(app.parseMoneyInputBR(valorTotalInput?.value));
  const diferenca = app.money2(somaItens - totalNFManual);

  const difInput = document.getElementById('nfDiferenca');
  if (difInput) {
    difInput.value = window.formatarNumero(diferenca);
    if (Math.abs(diferenca) > 0.05) {
      difInput.style.color = '#dc3545';
      difInput.style.fontWeight = 'bold';
    } else {
      difInput.style.color = '#28a745';
      difInput.style.fontWeight = 'bold';
    }
  }

  const nfSomaLabel = document.getElementById('nfSomaItensLabel');
  const nfTotalManualLabel = document.getElementById('nfTotalManualLabel');
  const nfDiferencaLabel = document.getElementById('nfDiferencaLabel');
  const nfBadge = document.getElementById('nfConciliacaoBadge');

  if (nfSomaLabel) {
    nfSomaLabel.textContent = window.formatarNumero(somaItens);
  }
  if (nfTotalManualLabel) {
    nfTotalManualLabel.textContent = window.formatarNumero(totalNFManual);
  }
  if (nfDiferencaLabel) {
    nfDiferencaLabel.textContent = window.formatarNumero(diferenca);
  }

  if (nfBadge) {
    const diffAbs = Math.abs(diferenca);
    nfBadge.classList.remove('ok', 'warn', 'bad');
    if (diffAbs <= 0.05) {
      nfBadge.textContent = 'OK';
      nfBadge.classList.add('ok');
    } else if (diffAbs <= 1.0) {
      nfBadge.textContent = 'ATENÇÃO';
      nfBadge.classList.add('warn');
    } else {
      nfBadge.textContent = 'DIVERGENTE';
      nfBadge.classList.add('bad');
    }
  }

  const divergenciaElement = document.getElementById('divergenciaValor');
  if (divergenciaElement) {
    if (totalNFManual > 0 && somaItens > 0) {
      if (Math.abs(diferenca) <= 0.05) {
        divergenciaElement.textContent = '✅ Valores conferem!';
        divergenciaElement.style.color = '#28a745';
      } else {
        const percentual = totalNFManual > 0 ? Math.abs((diferenca / totalNFManual) * 100) : 0;
        divergenciaElement.textContent = `⚠️ Divergência: ${window.formatarNumero(Math.abs(diferenca))} (${percentual.toFixed(2)}%)`;
        divergenciaElement.style.color = '#dc3545';
      }
      divergenciaElement.style.display = 'block';
    } else if (totalNFManual <= 0 && somaItens > 0) {
      divergenciaElement.textContent = '⚠️ Informe o Valor Total da NF';
      divergenciaElement.style.color = '#ffc107';
      divergenciaElement.style.display = 'block';
    } else {
      divergenciaElement.style.display = 'none';
    }
  }
}

export function adicionarItensExtraidos(app, containerId, itens) {
  if (!itens || itens.length === 0) {
    console.log('Nenhum item para adicionar');
    return;
  }

  const setValueSafe = (el, value, label = '') => {
    if (!el) {
      console.warn('[XML Import] Campo não encontrado:', label);
      return false;
    }
    el.value = value ?? '';
    return true;
  };

  if (containerId === 'itensNotaFiscal') {
    const container = document.getElementById(containerId);
    if (!container) {
      console.error('[XML Import] Container itensNotaFiscal não encontrado');
      return;
    }
    container.innerHTML = '';
    itens.forEach((item, index) => {
      console.log(`Adicionando item NF ${index + 1}:`, item);
      const itemRow = app.criarItemRow('notaFiscal');

      setValueSafe(
        itemRow.querySelector('[data-field="descricao"]'),
        item.descricao || item.descricao_resumida || '',
        'descricao'
      );
      setValueSafe(itemRow.querySelector('[data-field="unidade"]'), item.unidade || 'UN', 'unidade');
      setValueSafe(
        itemRow.querySelector('[data-field="quantidade"]'),
        window.formatarNumero(item.quantidade || 0),
        'quantidade'
      );
      setValueSafe(
        itemRow.querySelector('[data-field="valorUnitario"]'),
        window.formatarNumero(item.valorUnitario || 0),
        'valorUnitario'
      );
      const valorTotal = item.valorTotal || item.quantidade * item.valorUnitario;
      setValueSafe(
        itemRow.querySelector('[data-field="valorTotal"]'),
        window.formatarNumero(valorTotal || 0),
        'valorTotal'
      );

      container.appendChild(itemRow);
    });
    app.calcularSomaItensNF();
    return;
  }

  itens.forEach((item) => {
    app.empenhoDraft.itens.push({
      seq: app.empenhoDraft.itens.length + 1,
      descricao: item.descricao || item.descricao_resumida || '',
      unidade: item.unidade || 'UN',
      quantidade: item.quantidade || 0,
      valorUnitario: item.valorUnitario || 0,
      valorTotal: item.valorTotal || item.quantidade * item.valorUnitario || 0,
      subelemento: item.subelemento || '',
      itemCompra: item.itemCompra || '',
      catmatCodigo: item.catmatCodigo || '',
      catmatDescricao: item.catmatDescricao || '',
      catmatFonte: item.catmatFonte || null,
      observacao: item.observacao || ''
    });
  });

  app.renderItensEmpenho();
  console.log(`${itens.length} itens adicionados com sucesso`);
}

export function coletarItens(app, containerId) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.warn('[coletarItens] Container não encontrado:', containerId);
    return [];
  }
  const itens = [];

  let rows = container.querySelectorAll('tr.nf-row');
  if (rows.length === 0) {
    rows = container.querySelectorAll('.item-row');
  }

  rows.forEach((row) => {
    const item = {
      codigo: row.querySelector('[data-field="codigo"]')?.value || '',
      descricao: row.querySelector('[data-field="descricao"]')?.value || '',
      unidade: row.querySelector('[data-field="unidade"]')?.value || 'UN',
      quantidade: window.converterMoedaParaNumero(row.querySelector('[data-field="quantidade"]')?.value) || 0,
      valorUnitario: window.converterMoedaParaNumero(row.querySelector('[data-field="valorUnitario"]')?.value) || 0,
      subelemento: row.querySelector('[data-field="subelemento"]')?.value || '',
      itemCompra: row.querySelector('[data-field="itemCompra"]')?.value || ''
    };
    item.valorTotal = app.money2(item.quantidade * item.valorUnitario);

    if (item.descricao) {
      itens.push(item);
    }
  });

  return itens;
}

export function exibirPreviewNotaFiscal(app, extractedData) {
  const previewContainer = document.getElementById('previewDadosNF');
  const alerta = document.getElementById('alertaDivergencia');

  if (!previewContainer) {
    return;
  }

  app
    .carregarEmpenhosSelect()
    .catch((err) => console.error('[exibirPreviewNotaFiscal] Erro ao carregar empenhos:', err));

  const somaItens = (extractedData.itens || []).reduce((sum, item) => {
    const valor = parseFloat(item.valorTotal) || 0;
    return sum + valor;
  }, 0);

  const somaItensArredondado = Math.round(somaItens * 100) / 100;
  const valorTotal = parseFloat(extractedData.valorTotal) || 0;
  const valorTotalArredondado = Math.round(valorTotal * 100) / 100;
  const diferenca = Math.abs(valorTotalArredondado - somaItensArredondado);
  const percentualDif = valorTotalArredondado > 0 ? (diferenca / valorTotalArredondado) * 100 : 0;

  if (diferenca > 0.05 && percentualDif > 0.5) {
    alerta.className = 'alert alert-warning';
    alerta.innerHTML = `
        ⚠️ <strong>Divergência de Valores</strong><br>
        Valor total NF: <strong>${app.formatarMoeda(valorTotalArredondado)}</strong><br>
        Soma dos itens: <strong>${app.formatarMoeda(somaItensArredondado)}</strong><br>
        Diferença: <strong>${app.formatarMoeda(diferenca)}</strong> (${percentualDif.toFixed(2)}%)
      `;
    alerta.classList.remove('hidden');
  } else {
    alerta.className = 'alert alert-success';
    alerta.innerHTML = '✅ <strong>Valores conferem!</strong> Valor total está correto.';
    alerta.classList.remove('hidden');
  }

  document.getElementById('previewNumeroNF').textContent = extractedData.numero || '-';
  document.getElementById('previewDataNF').textContent = extractedData.data || '-';
  document.getElementById('previewNomeFornecedor').textContent = extractedData.nomeFornecedor || '-';
  document.getElementById('previewCNPJEmitente').textContent = extractedData.cnpjEmitente || '-';
  document.getElementById('previewCNPJDestinatario').textContent = extractedData.cnpjDestinatario || '-';
  document.getElementById('previewChaveAcesso').textContent = extractedData.chaveAcesso
    ? extractedData.chaveAcesso.substring(0, 20) + '...'
    : '-';
  document.getElementById('previewValorTotal').textContent = app.formatarMoeda(valorTotal);

  app.gerarTabelaItensExtraidos(extractedData.itens || []);

  document.getElementById('resumoTotalItens').textContent = (extractedData.itens || []).length;
  document.getElementById('resumoValorCabecalho').textContent = app.formatarMoeda(valorTotal);
  document.getElementById('resumoSomaItens').textContent = app.formatarMoeda(somaItens);
  document.getElementById('resumoDiferenca').textContent = app.formatarMoeda(diferenca);

  previewContainer.classList.remove('hidden');

  const btnTransferir = document.getElementById('btnTransferirDados');
  if (btnTransferir) {
    btnTransferir.onclick = () => {
      app.transferirDadosParaFormulario(extractedData);
    };
  }
}

export function gerarTabelaItensExtraidos(itens) {
  const container = document.getElementById('tabelaItensExtraidos');
  if (!container) {
    return;
  }

  if (!itens || itens.length === 0) {
    container.innerHTML = "<p style='color: #666; text-align: center; padding: 20px;'>Nenhum item extraído</p>";
    return;
  }

  const fmtMoney = (n) => {
    const valor = parseFloat(n) || 0;
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };
  const fmtQty = (n) => {
    const valor = parseFloat(n) || 0;
    return valor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
  };
  const truncate = (str, max = 50) => {
    if (!str) {
      return '-';
    }
    return str.length > max ? str.substring(0, max) + '...' : str;
  };

  const somaItens = itens.reduce((sum, item) => sum + (parseFloat(item.valorTotal) || 0), 0);

  let html = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.9em;">
          <thead>
            <tr style="background: #f8f9fa; border-bottom: 2px solid #dee2e6;">
              <th style="width: 40px; text-align: center; padding: 8px; border: 1px solid #dee2e6;">#</th>
              <th style="width: 80px; text-align: left; padding: 8px; border: 1px solid #dee2e6;">Código</th>
              <th style="min-width: 180px; text-align: left; padding: 8px; border: 1px solid #dee2e6;">Descrição</th>
              <th style="width: 50px; text-align: center; padding: 8px; border: 1px solid #dee2e6;">Un</th>
              <th style="width: 70px; text-align: right; padding: 8px; border: 1px solid #dee2e6;">Qtd</th>
              <th style="width: 90px; text-align: right; padding: 8px; border: 1px solid #dee2e6;">Vl.Unit</th>
              <th style="width: 100px; text-align: right; padding: 8px; border: 1px solid #dee2e6;">Vl.Total</th>
            </tr>
          </thead>
          <tbody>
    `;

  itens.forEach((item, index) => {
    const bgColor = index % 2 === 0 ? '#fff' : '#f8f9fa';
    const descricaoFull = item.descricao || '-';
    const descricaoTruncada = truncate(descricaoFull, 45);

    html += `
        <tr style="background: ${bgColor};">
          <td style="text-align: center; padding: 6px 4px; border: 1px solid #e9ecef; font-weight: 600; color: #666;">${index + 1}</td>
          <td style="text-align: left; padding: 6px 4px; border: 1px solid #e9ecef; font-family: monospace; font-size: 0.85em;">${item.codigo || '-'}</td>
          <td style="text-align: left; padding: 6px 4px; border: 1px solid #e9ecef;" title="${descricaoFull}">${descricaoTruncada}</td>
          <td style="text-align: center; padding: 6px 4px; border: 1px solid #e9ecef; text-transform: uppercase;">${item.unidade || 'UN'}</td>
          <td style="text-align: right; padding: 6px 4px; border: 1px solid #e9ecef; font-family: monospace;">${fmtQty(item.quantidade)}</td>
          <td style="text-align: right; padding: 6px 4px; border: 1px solid #e9ecef; font-family: monospace;">${fmtMoney(item.valorUnitario)}</td>
          <td style="text-align: right; padding: 6px 4px; border: 1px solid #e9ecef; font-weight: 600; font-family: monospace;">${fmtMoney(item.valorTotal)}</td>
        </tr>
      `;
  });

  html += `
          </tbody>
          <tfoot>
            <tr style="background: #e7f1ff; font-weight: bold;">
              <td colspan="6" style="text-align: right; padding: 8px; border: 1px solid #dee2e6;">SOMA DOS ITENS:</td>
              <td style="text-align: right; padding: 8px; border: 1px solid #dee2e6; font-family: monospace;">${fmtMoney(somaItens)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;

  container.innerHTML = html;
}

export async function transferirDadosParaFormulario(app, extractedData) {
  try {
    if (extractedData.numero) {
      document.getElementById('numeroNotaFiscal').value = extractedData.numero;
    }
    if (extractedData.data) {
      document.getElementById('dataNotaFiscal').value = extractedData.data;
    }
    if (extractedData.cnpjEmitente) {
      document.getElementById('cnpjEmitente').value = extractedData.cnpjEmitente;
    }
    if (extractedData.cnpjDestinatario) {
      document.getElementById('cnpjDestinatario').value = extractedData.cnpjDestinatario;
    }
    if (extractedData.chaveAcesso) {
      document.getElementById('chaveAcesso').value = extractedData.chaveAcesso;
    }
    if (extractedData.valorTotal) {
      document.getElementById('valorTotalNF').value = app.formatarMoeda(extractedData.valorTotal);
    }

    app.adicionarItensExtraidos('itensNotaFiscal', extractedData.itens);
    app.calcularSomaItensNF();

    if (extractedData.cnpjEmitente) {
      await app.buscarEmpenhoCorrespondente(extractedData.cnpjEmitente);
    }

    document.getElementById('previewDadosNF').classList.add('hidden');
    document.getElementById('formNotaFiscal').scrollIntoView({ behavior: 'smooth' });

    app.showSuccess('Dados transferidos com sucesso. Revise e salve a Nota Fiscal.');
  } catch (error) {
    console.error('Erro ao transferir dados:', error);
    app.showError('Erro ao transferir dados: ' + error.message);
  }
}
