/**
 * SINGEM - Helpers de UX para melhoria de experiência do usuário
 * - Autocomplete de itens e unidades
 * - Formatação de campo Item Compra (3 dígitos fixos: 000-999)
 * - Validação de unidades
 * - Normalização para maiúscula
 * @version 1.1.0
 */

const DEBUG_UX = false;

// ==========================================
// FUNÇÕES DE NORMALIZAÇÃO
// ==========================================

/**
 * Normaliza string para maiúscula e trim
 * @param {string} s - String a normalizar
 * @returns {string} String normalizada
 */
function normUpper(s) {
  return String(s ?? '')
    .trim()
    .toUpperCase();
}

/**
 * Verifica se string é apenas numérica
 * @param {string} s - String a verificar
 * @returns {boolean} True se apenas números
 */
function isOnlyNumeric(s) {
  return /^\d+$/.test(String(s ?? '').trim());
}

/**
 * Verifica se string é alfanumérica maiúscula válida
 * @param {string} s - String a verificar
 * @returns {boolean} True se válida
 */
function isAlphaNumUpper(s) {
  return /^[A-Z0-9]+$/.test(normUpper(s));
}

/**
 * Formata Item de Compra com 3 dígitos fixos (000-999)
 * - Remove caracteres não numéricos
 * - Limita a 3 dígitos (mantém os últimos se > 3)
 * - Preenche com zeros à esquerda
 * @param {string|number} value - Valor a formatar
 * @returns {string} Valor formatado (ex: "001", "051", "123")
 */
function formatItemCompra3Digitos(value) {
  let s = String(value ?? '').trim();

  // Remove tudo que não for número
  s = s.replace(/\D+/g, '');

  if (!s) {
    return '000';
  }

  // Limita a 3 dígitos (mantém os últimos 3 se maior)
  if (s.length > 3) {
    s = s.slice(-3);
  }

  // Completa com zeros à esquerda
  return s.padStart(3, '0');
}

/**
 * Valida unidade de medida
 * - Não pode ser apenas numérica
 * - Deve ser alfanumérica (letras ou letras+números)
 * @param {string} unidade - Unidade a validar
 * @returns {{ok: boolean, msg?: string, val?: string}}
 */
function validarUnidade(unidade) {
  const u = normUpper(unidade);

  if (!u) {
    return { ok: false, msg: 'Unidade obrigatória.' };
  }

  if (isOnlyNumeric(u)) {
    return {
      ok: false,
      msg: 'Unidade não pode ser apenas numérica (ex: "123"). Use letras ou letras+números (ex: UN, M2, KG1).'
    };
  }

  if (!isAlphaNumUpper(u)) {
    return { ok: false, msg: 'Unidade inválida. Use apenas letras ou letras+números, sem espaços (ex: UN, M2, KG).' };
  }

  return { ok: true, val: u };
}

// ==========================================
// AUTOCOMPLETE DE ITENS
// ==========================================

let _datalistItens = null;
let _datalistUnidades = null;

/**
 * Inicializa datalist para autocomplete de itens
 * @param {HTMLInputElement} input - Input de descrição
 */
async function initItemAutocomplete(input) {
  if (!input) {
    return;
  }

  // Criar datalist se não existir
  let datalist = document.getElementById('itensSugestoesDL');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'itensSugestoesDL';
    document.body.appendChild(datalist);
  }
  _datalistItens = datalist;

  // Vincular ao input
  input.setAttribute('list', 'itensSugestoesDL');

  // Atualizar sugestões ao digitar
  input.addEventListener('input', async () => {
    const q = normUpper(input.value);
    if (q.length < 2) {
      datalist.innerHTML = '';
      return;
    }

    try {
      const items = await window.dbManager.getItensSugestoes();
      const filtered = items.filter((x) => x.startsWith(q) || x.includes(q)).slice(0, 15);

      datalist.innerHTML = filtered.map((x) => `<option value="${x}"></option>`).join('');

      if (DEBUG_UX) {
        console.log('[UX] Sugestões itens:', filtered.length);
      }
    } catch (e) {
      if (DEBUG_UX) {
        console.warn('[UX] Erro ao buscar sugestões:', e);
      }
    }
  });

  // Forçar maiúscula ao sair
  input.addEventListener('blur', () => {
    input.value = normUpper(input.value);
  });

  if (DEBUG_UX) {
    console.log('[UX] Autocomplete de itens inicializado');
  }
}

/**
 * Inicializa datalist para autocomplete de unidades
 * @param {HTMLInputElement} input - Input de unidade
 */
async function initUnidadeAutocomplete(input) {
  if (!input) {
    return;
  }

  // Criar datalist se não existir
  let datalist = document.getElementById('unidadesSugestoesDL');
  if (!datalist) {
    datalist = document.createElement('datalist');
    datalist.id = 'unidadesSugestoesDL';
    document.body.appendChild(datalist);
  }
  _datalistUnidades = datalist;

  // Vincular ao input
  input.setAttribute('list', 'unidadesSugestoesDL');

  // Carregar config de unidades
  try {
    const config = await window.dbManager.getUnidadesConfig();

    // Definir valor padrão como última usada
    if (!input.value && config.last) {
      input.value = config.last;
    }

    // Popular datalist
    datalist.innerHTML = config.list.map((u) => `<option value="${u}"></option>`).join('');

    if (DEBUG_UX) {
      console.log('[UX] Unidades carregadas:', config.list.length, 'última:', config.last);
    }
  } catch (e) {
    if (DEBUG_UX) {
      console.warn('[UX] Erro ao carregar unidades:', e);
    }
  }

  // Forçar maiúscula ao sair
  input.addEventListener('blur', () => {
    input.value = normUpper(input.value);
  });

  if (DEBUG_UX) {
    console.log('[UX] Autocomplete de unidades inicializado');
  }
}

/**
 * Inicializa formatação de 3 dígitos fixos no campo Item Compra
 * - Durante digitação: permite apenas números, limita a 3
 * - No blur: formata com zeros à esquerda
 * @param {HTMLInputElement} input - Input de item compra
 */
function initItemCompra3Digitos(input) {
  if (!input) {
    return;
  }

  // Durante digitação: permitir somente números e limitar a 3 dígitos
  input.addEventListener('input', () => {
    input.value = input.value.replace(/\D+/g, '').slice(0, 3);
  });

  // Ao sair do campo: ajustar para 3 dígitos com zeros à esquerda
  input.addEventListener('blur', () => {
    input.value = formatItemCompra3Digitos(input.value);
  });

  if (DEBUG_UX) {
    console.log('[UX] Formatação 3 dígitos (Item Compra) inicializada');
  }
}

/**
 * Salva descrição do item nas sugestões
 * @param {string} descricao - Descrição do item
 */
async function salvarItemSugestao(descricao) {
  const desc = normUpper(descricao);
  if (desc && desc.length >= 3) {
    await window.dbManager.addItemSugestao(desc);
    if (DEBUG_UX) {
      console.log('[UX] Item salvo nas sugestões:', desc);
    }
  }
}

/**
 * Salva unidade na configuração
 * @param {string} unidade - Unidade a salvar
 */
async function salvarUnidadeConfig(unidade) {
  const u = normUpper(unidade);
  if (u) {
    await window.dbManager.saveUnidadeConfig(u);
    if (DEBUG_UX) {
      console.log('[UX] Unidade salva na config:', u);
    }
  }
}

/**
 * Inicializa todos os helpers de UX no modal de item
 * Deve ser chamado quando o modal de item é aberto
 */
async function initModalItemUX() {
  // Descrição do item - autocomplete + maiúscula
  const descInput = document.getElementById('modalDescricao');
  if (descInput) {
    await initItemAutocomplete(descInput);
  }

  // Unidade - autocomplete + última usada + validação
  const unidadeInput = document.getElementById('modalUnidade');
  if (unidadeInput) {
    await initUnidadeAutocomplete(unidadeInput);
  }

  // Item Compra - 3 dígitos fixos (000-999)
  const itemCompraInput = document.getElementById('modalItemCompra');
  if (itemCompraInput) {
    initItemCompra3Digitos(itemCompraInput);
  }

  if (DEBUG_UX) {
    console.log('[UX] Modal de item UX inicializado');
  }
}

/**
 * Processa item antes de salvar (normalização e validação)
 * @param {Object} item - Item a processar
 * @returns {{ok: boolean, item?: Object, errors?: string[]}}
 */
function processarItemAntesSalvar(item) {
  const errors = [];

  // Normalizar descrição para maiúscula
  if (item.descricao) {
    item.descricao = normUpper(item.descricao);
  }

  // Validar e normalizar unidade
  if (item.unidade) {
    const validacao = validarUnidade(item.unidade);
    if (!validacao.ok) {
      errors.push(validacao.msg);
    } else {
      item.unidade = validacao.val;
    }
  }

  // Formatar itemCompra com 3 dígitos fixos (000-999)
  if (item.itemCompra !== undefined && item.itemCompra !== null) {
    item.itemCompra = formatItemCompra3Digitos(item.itemCompra);
  }

  return errors.length > 0 ? { ok: false, errors } : { ok: true, item };
}

/**
 * Salva sugestões após salvar item com sucesso
 * @param {Object} item - Item salvo
 */
async function salvarSugestoesAposSalvarItem(item) {
  // Salvar descrição nas sugestões
  if (item.descricao) {
    await salvarItemSugestao(item.descricao);
  }

  // Salvar unidade na config
  if (item.unidade) {
    await salvarUnidadeConfig(item.unidade);
  }
}

// ==========================================
// EXPORTAR PARA WINDOW (uso global)
// ==========================================

window.UXHelpers = {
  // Normalização
  normUpper,
  isOnlyNumeric,
  isAlphaNumUpper,
  formatItemCompra3Digitos,
  validarUnidade,

  // Autocomplete
  initItemAutocomplete,
  initUnidadeAutocomplete,
  initItemCompra3Digitos,
  initModalItemUX,

  // Salvar sugestões
  salvarItemSugestao,
  salvarUnidadeConfig,

  // Processamento
  processarItemAntesSalvar,
  salvarSugestoesAposSalvarItem
};

console.log('✅ UXHelpers carregado e disponível em window.UXHelpers');
