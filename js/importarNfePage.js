// ==================================================
// CADASTRO MANUAL DE NOTA FISCAL - SINGEM
// Módulo ERP com validação cruzada NF × Empenho
// Versão 2.1.0 - Modal Modernizado
// ==================================================

// Estado da aplicação
let empenhos = [];
let empenhoSelecionado = null;
let ultimaValidacao = null;
let itemCounter = 0;

// Policy de validação
const NF_POLICY = {
  toleranciaTotal: 0.05, // 5 centavos de tolerância
  bloquearDivergenciaTotal: true,
  bloquearItemInexistente: true,
  bloquearQtdMaiorQueSaldo: true,
  precoDivergenteEhBloqueante: false, // começa como alerta
  toleranciaPrecoPct: 1.0,
  toleranciaPrecoAbs: 0.01
};

// Elementos DOM
const formNF = document.getElementById('formNF');
const alertBox = document.getElementById('alertBox');
const itensBody = document.getElementById('itensBody');
const listaEmpenhos = document.getElementById('listaEmpenhos');

// ==================================================
// INICIALIZAÇÃO
// ==================================================
document.addEventListener('DOMContentLoaded', async () => {
  // Definir data padrão como hoje
  document.getElementById('dataEmissao').valueAsDate = new Date();

  // Carregar empenhos
  await carregarEmpenhos();

  // Event listeners
  setupEventListeners();

  // Estado inicial do botão
  atualizarEstadoBotaoSalvar();

  console.log('[NF] Módulo inicializado - NFValidator disponível:', !!window.NFValidator);
});

function setupEventListeners() {
  // Validação de chave de acesso
  document.getElementById('chaveAcesso').addEventListener('input', (e) => {
    const valor = e.target.value.replace(/\D/g, '');
    e.target.value = valor;
    validarChave(valor);
  });

  // Formatação de CNPJ
  document.getElementById('cnpjEmitente').addEventListener('input', (e) => {
    e.target.value = formatarCNPJ(e.target.value);
  });

  // Formatação de valores monetários
  ['valorTotal', 'valorProdutos'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('blur', (e) => {
        e.target.value = formatarMoeda(parseMoeda(e.target.value));
        atualizarDiferenca();
      });
      el.addEventListener('input', () => {
        // Invalida validação anterior quando usuário altera
        ultimaValidacao = null;
        atualizarEstadoBotaoSalvar();
      });
    }
  });

  // Adicionar item do empenho
  document.getElementById('btnAddItemFromEmpenho')?.addEventListener('click', abrirModalItensEmpenho);

  // Filtro de empenhos
  document.getElementById('filtroEmpenho').addEventListener('input', (e) => {
    renderizarEmpenhos(e.target.value.replace(/\D/g, ''));
  });

  // Auto-preencher filtro com CNPJ do emitente
  document.getElementById('cnpjEmitente').addEventListener('blur', (e) => {
    const cnpj = e.target.value.replace(/\D/g, '');
    if (cnpj.length === 14) {
      document.getElementById('filtroEmpenho').value = formatarCNPJ(cnpj);
      renderizarEmpenhos(cnpj);
    }
  });

  // Submit do formulário
  formNF.addEventListener('submit', salvarNotaFiscal);
}

// ==================================================
// BANCO DE DADOS
// ==================================================
async function ensureDbManagerReady() {
  if (!window.dbManager) {
    return null;
  }

  if (!window.dbManager.db && typeof window.dbManager.init === 'function') {
    await window.dbManager.init();
  }

  return window.dbManager;
}

async function abrirBancoLocal() {
  if (typeof indexedDB.databases === 'function') {
    const databases = await indexedDB.databases();
    const hasLocalDatabase = (databases || []).some((db) => db.name === 'ControleMaterialDB');

    if (!hasLocalDatabase) {
      throw new Error('Base local ControleMaterialDB não encontrada neste navegador');
    }
  }

  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ControleMaterialDB');
    req.onerror = () => reject(new Error('Erro ao abrir banco de dados local'));
    req.onsuccess = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('empenhos') || !db.objectStoreNames.contains('notasFiscais')) {
        db.close();
        reject(new Error('Base local incompatível: stores de NF/empenhos não encontradas'));
        return;
      }
      resolve(db);
    };
  });
}

async function carregarEmpenhos() {
  try {
    const manager = await ensureDbManagerReady();

    if (manager && typeof manager.buscarEmpenhos === 'function') {
      try {
        const todosEmpenhos = await manager.buscarEmpenhos(true);
        empenhos = (todosEmpenhos || []).filter((e) => e.statusValidacao === 'validado');

        console.log(`[NF] carregarEmpenhos via dbManager: ${todosEmpenhos.length} total, ${empenhos.length} validados`);

        if (empenhos.length === 0 && todosEmpenhos.length > 0) {
          console.warn('[NF] Existem empenhos disponíveis, mas nenhum está validado!');
        }

        renderizarEmpenhos();
        return;
      } catch (managerError) {
        console.warn('[NF] Falha ao carregar empenhos via dbManager. Tentando fallback local:', managerError);
      }
    }

    const db = await abrirBancoLocal();
    const tx = db.transaction(['empenhos'], 'readonly');
    const store = tx.objectStore('empenhos');
    const req = store.getAll();

    req.onsuccess = () => {
      const todosEmpenhos = req.result || [];
      empenhos = todosEmpenhos.filter((e) => e.statusValidacao === 'validado');

      console.log(`[NF] carregarEmpenhos local: ${todosEmpenhos.length} total, ${empenhos.length} validados`);

      if (empenhos.length === 0 && todosEmpenhos.length > 0) {
        console.warn('[NF] Existem empenhos no banco local, mas nenhum está validado!');
      }

      renderizarEmpenhos();
    };

    req.onerror = () => {
      console.error('[NF] Erro ao buscar empenhos no banco local:', req.error);
      mostrarAlerta('Erro ao carregar empenhos do banco local', 'danger');
    };
  } catch (error) {
    console.error('[NF] Erro ao carregar empenhos:', error);
    mostrarAlerta('Erro ao carregar empenhos: ' + error.message, 'danger');
  }
}

async function salvarNotaFiscalNoBanco(notaFiscal) {
  const manager = await ensureDbManagerReady();

  if (manager && typeof manager.salvarNotaFiscal === 'function') {
    try {
      return await manager.salvarNotaFiscal(notaFiscal);
    } catch (managerError) {
      console.warn('[NF] Falha ao salvar via dbManager. Tentando fallback local:', managerError);
    }
  }

  const db = await abrirBancoLocal();
  const tx = db.transaction(['notasFiscais'], 'readwrite');
  const store = tx.objectStore('notasFiscais');

  return new Promise((resolve, reject) => {
    const req = store.add(notaFiscal);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(new Error('Erro ao salvar nota fiscal: ' + req.error?.message));
  });
}

// ==================================================
// RENDERIZAÇÃO DE EMPENHOS
// ==================================================
function renderizarEmpenhos(filtroCNPJ = '') {
  let lista = empenhos;

  // Filtrar por CNPJ se informado
  if (filtroCNPJ && filtroCNPJ.length >= 8) {
    lista = empenhos.filter((e) => {
      const cnpjEmp = (e.cnpjFornecedor || '').replace(/\D/g, '');
      return cnpjEmp.includes(filtroCNPJ);
    });
  }

  if (lista.length === 0) {
    listaEmpenhos.innerHTML = `
            <div class="empenho-empty">
              <p>${filtroCNPJ ? 'Nenhum empenho encontrado para este CNPJ' : 'Nenhum empenho validado disponível'}</p>
            </div>
          `;
    return;
  }

  listaEmpenhos.innerHTML = lista
    .map(
      (emp) => `
          <div class="empenho-card" data-id="${emp.id}" onclick="selecionarEmpenho('${emp.id}')">
            <div class="empenho-card__header">
              <div class="empenho-card__titulo">NE ${emp.ano || ''}${emp.numero}</div>
              <span class="badge-status validado">Validado</span>
            </div>
            <div class="empenho-card__body">
              <div class="empenho-card__descricao">${emp.fornecedor || 'Fornecedor não informado'}</div>
              <div class="empenho-card__meta">
                <span class="empenho-card__info">CNPJ: ${formatarCNPJ(emp.cnpjFornecedor || '')}</span>
                <strong class="empenho-valor">R$ ${formatarMoeda(emp.valorTotal || 0)}</strong>
              </div>
            </div>
          </div>
        `
    )
    .join('');

  // Restaurar seleção se existir
  if (empenhoSelecionado) {
    const card = document.querySelector(`.empenho-card[data-id="${empenhoSelecionado.id}"]`);
    if (card) {
      card.classList.add('selected');
    }
  }
}

function selecionarEmpenho(id) {
  // Remover seleção anterior
  document.querySelectorAll('.empenho-card.selected').forEach((el) => el.classList.remove('selected'));

  // Selecionar novo
  empenhoSelecionado = empenhos.find((e) => e.id === id);
  document.getElementById('empenhoSelecionado').value = id;

  const card = document.querySelector(`.empenho-card[data-id="${id}"]`);
  if (card) {
    card.classList.add('selected');
  }

  // Invalidar validação quando muda empenho
  ultimaValidacao = null;
  atualizarEstadoBotaoSalvar();
}

// ==================================================
// MODAL DE ITENS DO EMPENHO
// ==================================================

function abrirModalItensEmpenho() {
  if (!empenhoSelecionado) {
    mostrarAlerta('Selecione um empenho primeiro antes de adicionar itens.', 'danger');
    return;
  }

  if (!empenhoSelecionado.itens || empenhoSelecionado.itens.length === 0) {
    mostrarAlerta('O empenho selecionado não possui itens cadastrados.', 'danger');
    return;
  }

  renderChecklistItensEmpenho(empenhoSelecionado);

  const modal = document.getElementById('modalItensEmpenho');
  if (modal) {
    modal.classList.add('open');
  }
}

function fecharModalItensEmpenho() {
  const modal = document.getElementById('modalItensEmpenho');
  if (modal) {
    modal.classList.remove('open');
  }
}

function renderChecklistItensEmpenho(empenho) {
  const list = document.getElementById('modalItensEmpenhoLista');
  if (!list) {
    return;
  }

  // Itens já adicionados para verificar duplicados
  const itensJaAdicionados = new Set(coletarItens().map(itemKey));

  list.innerHTML = (empenho.itens || [])
    .map((it, idx) => {
      const key = itemKey(it);
      const jaNaLista = itensJaAdicionados.has(key);
      const qtd = it.quantidade ?? 0;
      const vUnit = it.valorUnitario ?? 0;

      return `
            <div class="item-check-row it-check-row ${jaNaLista ? 'ja-adicionado' : ''}">
              <input type="checkbox" class="chkItemEmpenho" data-index="${idx}"
                     id="chkItem_${idx}" ${jaNaLista ? 'disabled' : ''}>
              <label for="chkItem_${idx}" class="item-info">
                <span class="item-codigo item-badge">${String(it.itemCompra || '---').padStart(3, '0')}</span>
                <span class="item-desc"> — ${String(it.descricao || it.material || 'Sem descrição').toUpperCase()}</span>
                <span class="item-unidade">(${String(it.unidade || 'UN').toUpperCase()})</span>
                <div class="item-qtd-valor item-meta">
                  Qtd: ${qtd} | V.Unit: R$ ${formatarMoeda(vUnit)} | Total: R$ ${formatarMoeda(qtd * vUnit)}
                  ${jaNaLista ? '<strong class="item-badge item-badge-ok">Já adicionado</strong>' : ''}
                </div>
              </label>
            </div>
          `;
    })
    .join('');

  // Garantir todos desmarcados por padrão
  setAllChecks(false);
}

function setAllChecks(checked) {
  document.querySelectorAll('#modalItensEmpenhoLista .chkItemEmpenho:not(:disabled)').forEach((chk) => {
    chk.checked = checked;
  });
}

function itemKey(it) {
  const ic = String(it.itemCompra || '').trim();
  if (ic) {
    return `IC:${ic.padStart(3, '0')}`;
  }
  return `DU:${String(it.descricao || '')
    .toUpperCase()
    .trim()}|${String(it.unidade || '')
    .toUpperCase()
    .trim()}`;
}

function confirmarItensEmpenho() {
  if (!empenhoSelecionado || !empenhoSelecionado.itens) {
    fecharModalItensEmpenho();
    return;
  }

  const checks = Array.from(document.querySelectorAll('#modalItensEmpenhoLista .chkItemEmpenho'));
  const selecionados = checks
    .filter((chk) => chk.checked && !chk.disabled)
    .map((chk) => empenhoSelecionado.itens[Number(chk.dataset.index)])
    .filter(Boolean);

  if (selecionados.length === 0) {
    mostrarAlerta('Nenhum item selecionado. Marque pelo menos um item.', 'danger');
    return;
  }

  // Adicionar cada item selecionado
  selecionados.forEach((itEmp) => {
    adicionarItem({
      itemCompra: itEmp.itemCompra || '',
      descricao: String(itEmp.descricao || itEmp.material || '').toUpperCase(),
      unidade: String(itEmp.unidade || 'UN').toUpperCase(),
      quantidade: itEmp.quantidade || 0,
      valorUnitario: itEmp.valorUnitario || 0,
      valorTotal: (itEmp.quantidade || 0) * (itEmp.valorUnitario || 0)
    });
  });

  mostrarAlerta(`✅ ${selecionados.length} item(ns) adicionado(s) do empenho.`, 'success');
  fecharModalItensEmpenho();
}

// ==================================================
// ITENS DA NOTA - GRID ERP
// ==================================================

function adicionarItem(dados = {}) {
  itemCounter++;
  const seq = itensBody.querySelectorAll('tr').length + 1;

  const row = document.createElement('tr');
  row.id = `item-${itemCounter}`;
  row.dataset.itemId = itemCounter;

  row.innerHTML = `
          <td class="nf-seq-cell">${seq}</td>
          <td>
            <input type="text" name="itemCompra_${itemCounter}" maxlength="3"
                   placeholder="000" value="${dados.itemCompra || ''}"
                   class="nf-input--center"
                   oninput="validarItemCompra(this)"
                   title="Código do item (3 dígitos)">
          </td>
          <td>
            <input type="text" name="desc_${itemCounter}"
                   placeholder="Descrição do item (MAIÚSCULA)"
                   value="${dados.descricao || ''}"
                   oninput="this.value = this.value.toUpperCase()"
                   class="nf-input--caps">
          </td>
          <td>
            <input type="text" name="unidade_${itemCounter}" maxlength="10"
                   placeholder="UN" value="${dados.unidade || ''}"
                   oninput="validarUnidade(this)"
                   class="nf-input--center nf-input--caps"
                   title="Não pode ser apenas numérico">
          </td>
          <td>
            <input type="number" name="qty_${itemCounter}" step="0.0001" min="0.0001"
                   placeholder="0" value="${dados.quantidade || ''}"
                   onchange="calcularTotalItem(${itemCounter})">
          </td>
          <td>
            <input type="text" name="unit_${itemCounter}"
                   placeholder="0,00" value="${dados.valorUnitario ? formatarMoeda(dados.valorUnitario) : ''}"
                   onblur="formatarECalcular(this, ${itemCounter})">
          </td>
          <td>
            <input type="text" name="total_${itemCounter}"
                   placeholder="0,00" value="${dados.valorTotal ? formatarMoeda(dados.valorTotal) : ''}"
                   readonly class="nf-input--readonly">
          </td>
          <td>
            <button type="button" class="btn-remove" onclick="removerItem(${itemCounter})" title="Remover item">✕</button>
          </td>
        `;

  itensBody.appendChild(row);

  // Focar no primeiro campo do novo item
  row.querySelector(`[name="itemCompra_${itemCounter}"]`)?.focus();

  // Invalidar validação anterior
  ultimaValidacao = null;
  atualizarEstadoBotaoSalvar();

  return row;
}

function validarItemCompra(input) {
  // Aceitar apenas números
  input.value = input.value.replace(/\D/g, '').substring(0, 3);
  ultimaValidacao = null;
  atualizarEstadoBotaoSalvar();
}

function validarUnidade(input) {
  input.value = input.value.toUpperCase();
  // Verificar se é apenas numérico (inválido)
  const valor = input.value.trim();
  if (valor && /^\d+$/.test(valor)) {
    input.style.borderColor = 'var(--danger)';
    input.title = 'Unidade não pode ser apenas numérica!';
  } else {
    input.style.borderColor = '';
    input.title = '';
  }
  ultimaValidacao = null;
  atualizarEstadoBotaoSalvar();
}

function removerItem(id) {
  const row = document.getElementById(`item-${id}`);
  if (row) {
    row.remove();
  }
  atualizarSequencias();
  atualizarSomaItens();
  ultimaValidacao = null;
  atualizarEstadoBotaoSalvar();
}

function atualizarSequencias() {
  const rows = itensBody.querySelectorAll('tr');
  rows.forEach((row, idx) => {
    const seqCell = row.querySelector('td:first-child');
    if (seqCell) {
      seqCell.textContent = idx + 1;
    }
  });
}

function formatarECalcular(input, itemId) {
  input.value = formatarMoeda(parseMoeda(input.value));
  calcularTotalItem(itemId);
}

function calcularTotalItem(itemId) {
  const qty = parseFloat(document.querySelector(`[name="qty_${itemId}"]`)?.value || 0);
  const unit = parseMoeda(document.querySelector(`[name="unit_${itemId}"]`)?.value || '0');
  const total = qty * unit;

  const totalInput = document.querySelector(`[name="total_${itemId}"]`);
  if (totalInput) {
    totalInput.value = formatarMoeda(total);
  }

  atualizarSomaItens();
  ultimaValidacao = null;
  atualizarEstadoBotaoSalvar();
}

function atualizarSomaItens() {
  const totais = document.querySelectorAll('[name^="total_"]');
  let soma = 0;
  totais.forEach((input) => {
    soma += parseMoeda(input.value || '0');
  });
  document.getElementById('somaItens').textContent = `R$ ${formatarMoeda(soma)}`;
  atualizarDiferenca();
  return soma;
}

function atualizarDiferenca() {
  const totalManual = parseMoeda(document.getElementById('valorTotal')?.value || '0');
  const soma = parseMoeda(document.getElementById('somaItens')?.textContent || '0');
  const diferenca = soma - totalManual;

  // Atualizar display do total NF manual
  document.getElementById('totalNFDisplay').textContent = `R$ ${formatarMoeda(totalManual)}`;

  // Atualizar diferença com cor
  const diferencaEl = document.getElementById('diferencaTotal');
  diferencaEl.textContent = `R$ ${formatarMoeda(Math.abs(diferenca))}${diferenca !== 0 ? (diferenca > 0 ? ' (acima)' : ' (abaixo)') : ''}`;

  if (Math.abs(diferenca) <= NF_POLICY.toleranciaTotal) {
    diferencaEl.style.color = 'var(--success)';
  } else {
    diferencaEl.style.color = 'var(--danger)';
  }
}

function coletarItens() {
  const itens = [];
  const rows = itensBody.querySelectorAll('tr');
  rows.forEach((row, idx) => {
    const id = row.dataset.itemId;
    if (!id) {
      return;
    }

    const itemCompra = (row.querySelector(`[name="itemCompra_${id}"]`)?.value || '').trim();
    const desc = (row.querySelector(`[name="desc_${id}"]`)?.value || '').trim().toUpperCase();
    const unidade = (row.querySelector(`[name="unidade_${id}"]`)?.value || '').trim().toUpperCase();
    const qty = parseFloat(row.querySelector(`[name="qty_${id}"]`)?.value || 0);
    const unit = parseMoeda(row.querySelector(`[name="unit_${id}"]`)?.value || '0');

    // Só adiciona se tiver pelo menos descrição ou quantidade
    if (desc || qty > 0) {
      itens.push({
        sequencia: idx + 1,
        itemCompra: itemCompra ? itemCompra.padStart(3, '0') : null,
        descricao: desc || 'ITEM SEM DESCRICAO',
        unidade: unidade || 'UN',
        quantidade: qty,
        valorUnitario: unit,
        valorTotal: qty * unit // Recalcula para garantir consistência
      });
    }
  });
  return itens;
}

// ==================================================
// VALIDAÇÕES
// ==================================================
function validarChave(chave) {
  const grupo = document.getElementById('chaveAcesso').parentElement;
  if (chave.length === 44) {
    grupo.classList.remove('has-error');
    return true;
  } else if (chave.length > 0) {
    grupo.classList.add('has-error');
    return false;
  }
  grupo.classList.remove('has-error');
  return false;
}

function validarCNPJ(cnpj) {
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14) {
    return false;
  }
  if (/^(\d)\1+$/.test(cnpj)) {
    return false;
  }

  // Validação dos dígitos verificadores
  let soma = 0;
  let peso = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 12; i++) {
    soma += parseInt(cnpj[i]) * peso[i];
  }
  let resto = soma % 11;
  const dv1 = resto < 2 ? 0 : 11 - resto;
  if (parseInt(cnpj[12]) !== dv1) {
    return false;
  }

  soma = 0;
  peso = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  for (let i = 0; i < 13; i++) {
    soma += parseInt(cnpj[i]) * peso[i];
  }
  resto = soma % 11;
  const dv2 = resto < 2 ? 0 : 11 - resto;
  return parseInt(cnpj[13]) === dv2;
}

function validarFormulario() {
  let valido = true;

  // Chave de acesso
  const chave = document.getElementById('chaveAcesso').value.replace(/\D/g, '');
  if (chave.length !== 44) {
    document.getElementById('chaveAcesso').parentElement.classList.add('has-error');
    valido = false;
  }

  // CNPJ
  const cnpj = document.getElementById('cnpjEmitente').value;
  if (!validarCNPJ(cnpj)) {
    document.getElementById('cnpjEmitente').parentElement.classList.add('has-error');
    valido = false;
  } else {
    document.getElementById('cnpjEmitente').parentElement.classList.remove('has-error');
  }

  // Campos obrigatórios
  ['numeroNF', 'serie', 'dataEmissao', 'razaoSocial', 'valorTotal'].forEach((id) => {
    const input = document.getElementById(id);
    if (!input.value.trim()) {
      input.parentElement.classList.add('has-error');
      valido = false;
    } else {
      input.parentElement.classList.remove('has-error');
    }
  });

  // Empenho selecionado
  if (!empenhoSelecionado) {
    mostrarAlerta('Selecione um empenho para vincular a nota fiscal', 'danger');
    valido = false;
  }

  // Itens da NF
  const itens = coletarItens();
  if (itens.length === 0) {
    mostrarAlerta('Adicione pelo menos um item à nota fiscal', 'danger');
    valido = false;
  }

  // Validar unidades (não podem ser apenas numéricas)
  for (const item of itens) {
    if (/^\d+$/.test(item.unidade)) {
      mostrarAlerta(`Item "${item.descricao}": unidade "${item.unidade}" não pode ser apenas numérica`, 'danger');
      valido = false;
      break;
    }
  }

  return valido;
}

// ==================================================
// VALIDAÇÃO COMPLETA NF × EMPENHO (ERP)
// ==================================================

function atualizarEstadoBotaoSalvar() {
  const btnSalvar = document.getElementById('btnSalvar');

  // Se não tem validação, desabilita salvar
  if (!ultimaValidacao) {
    btnSalvar.disabled = true;
    btnSalvar.title = 'Execute a validação primeiro';
    btnSalvar.innerHTML = '💾 Salvar Nota Fiscal';
    return;
  }

  // Se tem erros bloqueantes, desabilita salvar
  if (ultimaValidacao.errors.length > 0) {
    btnSalvar.disabled = true;
    btnSalvar.title = 'Corrija os erros antes de salvar';
    btnSalvar.innerHTML = '❌ Erros encontrados';
    return;
  }

  // Se só alertas, habilita (ou se OK)
  btnSalvar.disabled = false;
  btnSalvar.title = ultimaValidacao.warnings.length > 0 ? 'Há alertas, mas pode salvar' : 'Validação OK';
  btnSalvar.innerHTML = ultimaValidacao.warnings.length > 0 ? '⚠️ Salvar (com alertas)' : '✅ Salvar Nota Fiscal';
}

function validarNFCompleta() {
  console.log('[NF] Iniciando validação completa...');

  // Validar formulário básico primeiro
  if (!validarFormulario()) {
    mostrarAlerta('Corrija os campos obrigatórios antes de validar', 'danger');
    return;
  }

  // Coletar dados da NF
  const itens = coletarItens();
  const totalManual = parseMoeda(document.getElementById('valorTotal')?.value || '0');
  const somaItens = itens.reduce((acc, i) => acc + i.valorTotal, 0);

  const nfDraft = {
    numero: document.getElementById('numeroNF').value.trim(),
    serie: document.getElementById('serie').value.trim(),
    dataNotaFiscal: document.getElementById('dataEmissao').value,
    cnpjEmitente: document.getElementById('cnpjEmitente').value.replace(/\D/g, ''),
    valorTotal: totalManual,
    valorTotalCalculado: somaItens,
    itens: itens
  };

  console.log('[NF] Draft:', nfDraft);
  console.log('[NF] Empenho selecionado:', empenhoSelecionado);

  // Usar o NFValidator se disponível
  let resultado;
  if (window.NFValidator && typeof window.NFValidator.validateNF === 'function') {
    resultado = window.NFValidator.validateNF(nfDraft, empenhoSelecionado, {
      allowExtraItems: !NF_POLICY.bloquearItemInexistente,
      allowOverQty: !NF_POLICY.bloquearQtdMaiorQueSaldo,
      tolerancePricePct: NF_POLICY.toleranciaPrecoPct,
      tolerancePriceAbs: NF_POLICY.toleranciaPrecoAbs
    });
  } else {
    // Validação simplificada se NFValidator não estiver disponível
    resultado = validarNFSimplificado(nfDraft, empenhoSelecionado);
  }

  // Adicionar validação de diferença total
  const diferenca = Math.abs(somaItens - totalManual);
  if (diferenca > NF_POLICY.toleranciaTotal && NF_POLICY.bloquearDivergenciaTotal) {
    resultado.errors.push({
      code: 'TOTAL_DIFF',
      message: `Diferença entre Total NF (R$ ${formatarMoeda(totalManual)}) e Soma dos itens (R$ ${formatarMoeda(somaItens)}): R$ ${formatarMoeda(diferenca)}`
    });
    resultado.ok = false;
  } else if (diferenca > 0.01) {
    resultado.warnings.push({
      code: 'TOTAL_DIFF_MINOR',
      message: `Pequena diferença de totais: R$ ${formatarMoeda(diferenca)}`
    });
  }

  // Guardar resultado e adicionar totais
  resultado.totals = { somaItens, totalNFManual: totalManual, diff: diferenca };
  ultimaValidacao = resultado;

  console.log('[NF] Resultado validação:', resultado);

  // Mostrar modal com resultado
  mostrarModalValidacao(resultado);

  // Atualizar estado do botão
  atualizarEstadoBotaoSalvar();
}

function validarNFSimplificado(nf, empenho) {
  // Validação básica quando NFValidator não está disponível
  const erros = [];
  const alertas = [];

  // Verificar se empenho tem itens
  if (!empenho || !empenho.itens || empenho.itens.length === 0) {
    alertas.push({
      code: 'NO_EMPENHO_ITEMS',
      message: 'Empenho não possui itens cadastrados para comparação'
    });
    return { ok: true, errors: erros, warnings: alertas };
  }

  // Verificar CNPJ
  const cnpjEmpenho = (empenho.cnpjFornecedor || empenho.cnpjDigits || '').replace(/\D/g, '');
  const cnpjNF = (nf.cnpjEmitente || '').replace(/\D/g, '');
  if (cnpjEmpenho && cnpjNF && cnpjEmpenho !== cnpjNF) {
    erros.push({
      code: 'CNPJ_MISMATCH',
      message: `CNPJ do fornecedor difere: NF=${cnpjNF} vs Empenho=${cnpjEmpenho}`
    });
  }

  // Verificar cada item
  nf.itens.forEach((nfItem, idx) => {
    // Tentar encontrar no empenho
    const empItem = empenho.itens.find((e) => {
      // Match por itemCompra
      if (nfItem.itemCompra && e.itemCompra) {
        return nfItem.itemCompra === e.itemCompra;
      }
      // Match por descrição + unidade
      const descNF = (nfItem.descricao || '').toUpperCase().trim();
      const descEmp = (e.descricao || e.material || '').toUpperCase().trim();
      const unidNF = (nfItem.unidade || '').toUpperCase();
      const unidEmp = (e.unidade || '').toUpperCase();
      return descNF === descEmp && unidNF === unidEmp;
    });

    if (!empItem && NF_POLICY.bloquearItemInexistente) {
      erros.push({
        code: 'ITEM_NOT_FOUND',
        message: `Item ${idx + 1} "${nfItem.descricao}" não encontrado no empenho`
      });
    }

    if (empItem) {
      // Verificar quantidade
      const saldo = empItem.saldoQuantidade ?? empItem.quantidade ?? 0;
      if (nfItem.quantidade > saldo && NF_POLICY.bloquearQtdMaiorQueSaldo) {
        erros.push({
          code: 'OVER_QTY',
          message: `Item "${nfItem.descricao}": qtd NF (${nfItem.quantidade}) > saldo (${saldo})`
        });
      }

      // Verificar preço
      const precoEmp = empItem.valorUnitario ?? 0;
      const precoNF = nfItem.valorUnitario ?? 0;
      const diffPreco = Math.abs(precoNF - precoEmp);
      if (precoEmp > 0 && diffPreco > NF_POLICY.toleranciaPrecoAbs) {
        const diffPct = (diffPreco / precoEmp) * 100;
        if (diffPct > NF_POLICY.toleranciaPrecoPct) {
          const msg = `Item "${nfItem.descricao}": preço NF (R$ ${formatarMoeda(precoNF)}) difere do empenho (R$ ${formatarMoeda(precoEmp)}) - ${diffPct.toFixed(1)}%`;
          if (NF_POLICY.precoDivergenteEhBloqueante) {
            erros.push({ code: 'PRICE_DIFF', message: msg });
          } else {
            alertas.push({ code: 'PRICE_DIFF', message: msg });
          }
        }
      }
    }
  });

  return {
    ok: erros.length === 0,
    errors: erros,
    warnings: alertas
  };
}

// ==================================================
// MODAL DE DIVERGÊNCIAS
// ==================================================

function mostrarModalValidacao(resultado) {
  const modal = document.getElementById('modalDivergencias');
  const titulo = document.getElementById('modalTitulo');
  const body = document.getElementById('modalBody');
  const btnSalvarComAlertas = document.getElementById('btnSalvarComAlertas');

  let html = '';

  if (resultado.ok && resultado.errors.length === 0 && resultado.warnings.length === 0) {
    titulo.innerHTML = '✅ Validação OK';
    html = `
            <div class="sucesso-box">
              <strong>Nota fiscal validada com sucesso!</strong>
              <p>Todos os itens correspondem ao empenho e não há divergências.</p>
            </div>
          `;
    btnSalvarComAlertas.style.display = 'none';
  } else {
    if (resultado.errors.length > 0) {
      titulo.innerHTML = '❌ Erros Encontrados';
      html += `<h4 class="sg-modal-heading sg-modal-heading--danger">🚫 Erros Bloqueantes (${resultado.errors.length}):</h4>`;
      resultado.errors.forEach((e) => {
        html += `<div class="erro-item"><strong>${e.code}:</strong> ${e.message}</div>`;
      });
    }

    if (resultado.warnings.length > 0) {
      if (resultado.errors.length === 0) {
        titulo.innerHTML = '⚠️ Avisos';
      }
      html += `<h4 class="sg-modal-heading sg-modal-heading--warning">⚠️ Avisos (${resultado.warnings.length}):</h4>`;
      resultado.warnings.forEach((w) => {
        html += `<div class="alerta-item"><strong>${w.code}:</strong> ${w.message}</div>`;
      });
    }

    // Mostrar botão "Salvar mesmo assim" apenas se não houver erros bloqueantes
    btnSalvarComAlertas.style.display =
      resultado.errors.length === 0 && resultado.warnings.length > 0 ? 'inline-flex' : 'none';
  }

  // Adicionar box de totais
  if (resultado.totals) {
    html += `
            <div class="totais-box">
              <h4 class="sg-modal-heading sg-modal-heading--primary">📊 Totais:</h4>
              <p><strong>Soma dos itens:</strong> R$ ${formatarMoeda(resultado.totals.somaItens)}</p>
              <p><strong>Total NF (manual):</strong> R$ ${formatarMoeda(resultado.totals.totalNFManual)}</p>
              <p><strong>Diferença:</strong> R$ ${formatarMoeda(resultado.totals.diff)}</p>
            </div>
          `;
  }

  body.innerHTML = html;
  modal.style.display = 'flex';
}

function fecharModal() {
  document.getElementById('modalDivergencias').style.display = 'none';
}

function salvarComAlertas() {
  // Fechar modal e forçar salvamento
  fecharModal();
  // Desbloquear botão temporariamente
  document.getElementById('btnSalvar').disabled = false;
  // Triggerar submit do form
  document.getElementById('formNF').dispatchEvent(new Event('submit'));
}

// ==================================================
// SALVAR NOTA FISCAL
// ==================================================
async function salvarNotaFiscal(e) {
  e.preventDefault();

  // Validação básica do formulário
  if (!validarFormulario()) {
    mostrarAlerta('Corrija os campos destacados em vermelho', 'danger');
    return;
  }

  // Verificar se validação foi executada (exceto se veio de salvarComAlertas)
  if (!ultimaValidacao) {
    mostrarAlerta('Execute a validação antes de salvar', 'danger');
    validarNFCompleta();
    return;
  }

  // Verificar se há erros bloqueantes
  if (ultimaValidacao.errors && ultimaValidacao.errors.length > 0) {
    mostrarAlerta('Corrija os erros bloqueantes antes de salvar', 'danger');
    mostrarModalValidacao(ultimaValidacao);
    return;
  }

  const btnSalvar = document.getElementById('btnSalvar');
  btnSalvar.disabled = true;
  btnSalvar.innerHTML = '⏳ Salvando...';

  try {
    const itens = coletarItens();
    const somaItens = itens.reduce((acc, i) => acc + i.valorTotal, 0);
    const totalManual = parseMoeda(document.getElementById('valorTotal').value);

    const notaFiscal = {
      // Identificação
      chaveAcesso: document.getElementById('chaveAcesso').value.replace(/\D/g, ''),
      numero: document.getElementById('numeroNF').value.trim(),
      serie: document.getElementById('serie').value.trim(),
      dataNotaFiscal: document.getElementById('dataEmissao').value,

      // Emitente
      cnpjFornecedor: document.getElementById('cnpjEmitente').value.replace(/\D/g, ''),
      razaoSocialEmitente: document.getElementById('razaoSocial').value.trim().toUpperCase(),

      // Valores
      valorTotal: totalManual,
      valorTotalCalculado: somaItens,
      valorProdutos: parseMoeda(document.getElementById('valorProdutos').value || '0'),
      diferenca: Math.abs(somaItens - totalManual),

      // Itens com estrutura ERP
      itens: itens,
      qtdItens: itens.length,

      // Vínculo com empenho
      empenhoId: empenhoSelecionado.id,
      empenhoNumero: empenhoSelecionado.numero,
      empenhoAno: empenhoSelecionado.ano,

      // Resultado da validação
      validacao: {
        dataValidacao: new Date().toISOString(),
        ok: ultimaValidacao.ok,
        qtdErros: ultimaValidacao.errors?.length || 0,
        qtdAlertas: ultimaValidacao.warnings?.length || 0,
        alertas: ultimaValidacao.warnings || []
      },

      // Metadados
      status: 'ativa',
      dataCriacao: new Date().toISOString(),
      dataAtualizacao: new Date().toISOString()
    };

    console.log('[NF] Salvando nota fiscal:', notaFiscal);

    const nfId = await salvarNotaFiscalNoBanco(notaFiscal);

    console.log('[NF] Nota fiscal salva com ID:', nfId);

    mostrarAlerta(
      `✅ Nota Fiscal ${notaFiscal.numero}/${notaFiscal.serie} cadastrada com sucesso!
             Vinculada ao empenho NE ${empenhoSelecionado.ano || ''}${empenhoSelecionado.numero}.
             ${notaFiscal.validacao.qtdAlertas > 0 ? `(${notaFiscal.validacao.qtdAlertas} alerta(s) registrado(s))` : ''}`,
      'success'
    );

    // Limpar formulário após sucesso
    setTimeout(() => {
      limparFormulario();
    }, 2000);
  } catch (error) {
    console.error('[NF] Erro ao salvar:', error);
    mostrarAlerta(`Erro ao salvar nota fiscal: ${error.message}`, 'danger');
  }

  // Restaurar botão
  atualizarEstadoBotaoSalvar();
}

// ==================================================
// UTILITÁRIOS
// ==================================================
function formatarCNPJ(valor) {
  const nums = valor.replace(/\D/g, '').slice(0, 14);
  if (nums.length <= 2) {
    return nums;
  }
  if (nums.length <= 5) {
    return nums.replace(/^(\d{2})(\d)/, '$1.$2');
  }
  if (nums.length <= 8) {
    return nums.replace(/^(\d{2})(\d{3})(\d)/, '$1.$2.$3');
  }
  if (nums.length <= 12) {
    return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d)/, '$1.$2.$3/$4');
  }
  return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d)/, '$1.$2.$3/$4-$5');
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function parseMoeda(str) {
  if (!str) {
    return 0;
  }
  // Remove tudo exceto números, vírgula e ponto
  const limpo = String(str).replace(/[^\d,.-]/g, '');
  // Trata formato BR (1.234,56) ou US (1,234.56)
  if (limpo.includes(',') && limpo.includes('.')) {
    // Determina qual é o separador decimal
    const lastComma = limpo.lastIndexOf(',');
    const lastDot = limpo.lastIndexOf('.');
    if (lastComma > lastDot) {
      // Formato BR: 1.234,56
      return parseFloat(limpo.replace(/\./g, '').replace(',', '.')) || 0;
    } else {
      // Formato US: 1,234.56
      return parseFloat(limpo.replace(/,/g, '')) || 0;
    }
  } else if (limpo.includes(',')) {
    return parseFloat(limpo.replace(',', '.')) || 0;
  }
  return parseFloat(limpo) || 0;
}

function mostrarAlerta(msg, tipo) {
  alertBox.className = `alert alert-${tipo} show`;
  alertBox.innerHTML = msg;
  alertBox.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (tipo === 'success') {
    setTimeout(() => {
      alertBox.classList.remove('show');
    }, 5000);
  }
}

function limparFormulario() {
  formNF.reset();
  document.getElementById('dataEmissao').valueAsDate = new Date();
  itensBody.innerHTML = '';
  itemCounter = 0;

  // Resetar estado de validação
  ultimaValidacao = null;

  // Resetar empenho selecionado
  empenhoSelecionado = null;
  document.getElementById('empenhoSelecionado').value = '';
  document.querySelectorAll('.empenho-card.selected').forEach((el) => el.classList.remove('selected'));

  // Resetar erros visuais
  document.querySelectorAll('.has-error').forEach((el) => el.classList.remove('has-error'));
  alertBox.classList.remove('show');

  // Resetar totais e diferença
  document.getElementById('somaItens').textContent = 'R$ 0,00';
  document.getElementById('totalNFDisplay').textContent = 'R$ 0,00';
  document.getElementById('diferencaTotal').textContent = 'R$ 0,00';
  document.getElementById('diferencaTotal').style.color = 'var(--success)';

  // Atualizar estado do botão
  atualizarEstadoBotaoSalvar();

  // Recarregar lista de empenhos
  renderizarEmpenhos();

  console.log('[NF] Formulário limpo');
}

Object.assign(window, {
  selecionarEmpenho,
  fecharModalItensEmpenho,
  setAllChecks,
  confirmarItensEmpenho,
  validarItemCompra,
  validarUnidade,
  removerItem,
  formatarECalcular,
  calcularTotalItem,
  validarNFCompleta,
  fecharModal,
  salvarComAlertas,
  limparFormulario
});
