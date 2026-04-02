import * as NaturezaSubelementos from '../../data/naturezaSubelementos.js';

/* eslint-disable complexity */
export function abrirModalItemEmpenho(app, options = {}) {
  const { index = null, seq = null, descricao = '', unidade = 'UN', quantidade = null, valorUnitario = null } = options;

  const naturezaDespesa = app.empenhoDraft.header.naturezaDespesa;
  if (!naturezaDespesa) {
    app.showToast('⚠️ Selecione a Natureza da Despesa no cabeçalho antes de adicionar itens.', 'warning');
    return;
  }

  const existente = index !== null ? app.empenhoDraft.itens[index] : null;
  const dados = existente || {
    seq: seq || app.empenhoDraft.itens.length + 1,
    descricao,
    unidade,
    quantidade,
    valorUnitario,
    valorTotal: quantidade && valorUnitario ? quantidade * valorUnitario : null,
    subelementoCodigo: '',
    subelementoNome: '',
    itemCompra: '',
    catmatCodigo: '',
    catmatDescricao: '',
    catmatFonte: '',
    observacao: ''
  };

  const opcoesSubelemento = NaturezaSubelementos.gerarOpcoesSubelemento(naturezaDespesa, dados.subelementoCodigo);

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
      <div class="modal-card modal-item-empenho">
        <div class="modal-header">
          <h4>${index !== null ? '✏️ Editar Item' : '➕ Adicionar Item'}</h4>
          <button type="button" class="btn-fechar" id="modalFechar" title="Fechar">✕</button>
        </div>

        <div class="modal-body">
          <!-- Seção: Identificação -->
          <fieldset class="modal-section">
            <legend>📋 Identificação</legend>
            <div class="modal-grid modal-grid-3">
              <div class="form-group">
                <label for="modalSeq">Seq</label>
                <input type="number" id="modalSeq" value="${dados.seq || ''}" class="input-sm" />
              </div>
              <div class="form-group">
                <label for="modalSubelemento">Subelemento *</label>
                <select id="modalSubelemento">${opcoesSubelemento}</select>
              </div>
              <div class="form-group">
                <label for="modalItemCompra">Item Compra</label>
                <input type="text" id="modalItemCompra" value="${dados.itemCompra || ''}" placeholder="Nº do item" />
              </div>
            </div>
          </fieldset>

          <!-- Seção: CATMAT com Autocomplete -->
          <fieldset class="modal-section">
            <legend>🏷️ CATMAT</legend>
            <div class="form-group" style="position: relative;">
              <label for="modalCatmatBusca">Buscar Material CATMAT</label>
              <input type="text" id="modalCatmatBusca"
                placeholder="Digite pelo menos 3 caracteres para buscar..."
                autocomplete="off"
                style="width: 100%;" />
              <small style="color: #666; font-size: 12px;">
                Digite para buscar no catálogo. Se não encontrar, clique em "Criar Pedido de Catalogação".
              </small>
            </div>
            <div class="modal-grid modal-grid-3" style="margin-top: 10px;">
              <div class="form-group">
                <label for="modalCatmatCodigo">Código CATMAT</label>
                <input type="text" id="modalCatmatCodigo" value="${dados.catmatCodigo || ''}" placeholder="Preenchido automaticamente" readonly style="background: #f9f9f9;" />
              </div>
              <div class="form-group form-group-span-2">
                <label for="modalCatmatDescricao">Descrição CATMAT</label>
                <input type="text" id="modalCatmatDescricao" value="${dados.catmatDescricao || ''}" placeholder="Preenchido ao selecionar" readonly style="background: #f9f9f9;" />
              </div>
            </div>
            <div class="form-group">
              <label for="modalCatmatFonte">Fonte/Unidade</label>
              <input type="text" id="modalCatmatFonte" value="${dados.catmatFonte || ''}" placeholder="Preenchido automaticamente" readonly style="background: #f9f9f9;" />
            </div>
            <div style="margin-top: 8px;">
              <button type="button" id="btnLimparCatmat" class="btn btn-secondary btn-sm" style="font-size: 12px; padding: 4px 8px;">
                🗑️ Limpar CATMAT
              </button>
            </div>
          </fieldset>

          <!-- Seção: Descrição do Item -->
          <fieldset class="modal-section">
            <legend>📝 Descrição do Item</legend>
            <div class="form-group">
              <label for="modalDescricao">Descrição *</label>
              <textarea id="modalDescricao" rows="2" placeholder="Descrição completa do item">${dados.descricao || ''}</textarea>
            </div>
          </fieldset>

          <!-- Seção: Valores -->
          <fieldset class="modal-section">
            <legend>💰 Quantidades e Valores</legend>
            <div class="modal-grid modal-grid-4">
              <div class="form-group">
                <label for="modalUnidade">Unidade</label>
                <input type="text" id="modalUnidade" value="${dados.unidade || 'UN'}" placeholder="UN" class="input-sm" />
              </div>
              <div class="form-group">
                <label for="modalQuantidade">Quantidade</label>
                <input type="text" id="modalQuantidade" value="${dados.quantidade ?? ''}" placeholder="0" class="input-numero" />
              </div>
              <div class="form-group">
                <label for="modalValorUnitario">Vlr. Unitário</label>
                <input type="text" id="modalValorUnitario" value="${dados.valorUnitario ?? ''}" placeholder="0,00" class="input-numero" />
              </div>
              <div class="form-group">
                <label for="modalValorTotal">Vlr. Total</label>
                <input type="text" id="modalValorTotal" value="${dados.valorTotal ?? ''}" disabled class="input-total" />
              </div>
            </div>
          </fieldset>

          <!-- Seção: Observação -->
          <fieldset class="modal-section">
            <legend>📎 Observação</legend>
            <div class="form-group">
              <textarea id="modalObservacao" rows="2" placeholder="Observações adicionais (opcional)">${dados.observacao || ''}</textarea>
            </div>
          </fieldset>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" id="modalCancelar">Cancelar</button>
          <button type="button" class="btn btn-primary" id="modalSalvar">💾 Salvar Item</button>
        </div>
      </div>
    `;

  const atualizarTotal = () => {
    const qtd = app.parseNumero(document.getElementById('modalQuantidade').value);
    const vlr = app.parseNumero(document.getElementById('modalValorUnitario').value);
    document.getElementById('modalValorTotal').value = window.formatarNumero(qtd * vlr);
  };

  overlay.querySelector('#modalQuantidade').addEventListener('input', atualizarTotal);
  overlay.querySelector('#modalValorUnitario').addEventListener('input', atualizarTotal);

  if (window.UXHelpers) {
    window.UXHelpers.initModalItemUX();
  }

  const catmatBusca = overlay.querySelector('#modalCatmatBusca');
  if (catmatBusca && window.CatmatIntegration) {
    window.CatmatIntegration.initCatmatAutocomplete(catmatBusca, (material) => {
      document.getElementById('modalCatmatCodigo').value = material.catmat_id || material.codigo || '';
      document.getElementById('modalCatmatDescricao').value = material.catmat_padrao_desc || material.descricao || '';
      document.getElementById('modalCatmatFonte').value = material.unidade || 'UN';

      const descricaoItem = document.getElementById('modalDescricao');
      if (!descricaoItem.value.trim()) {
        descricaoItem.value = material.descricao || '';
      }

      const unidadeItem = document.getElementById('modalUnidade');
      if (unidadeItem && unidadeItem.value === 'UN' && material.unidade) {
        unidadeItem.value = material.unidade;
      }

      catmatBusca.value = '';
    });
  }

  overlay.querySelector('#btnLimparCatmat')?.addEventListener('click', () => {
    document.getElementById('modalCatmatCodigo').value = '';
    document.getElementById('modalCatmatDescricao').value = '';
    document.getElementById('modalCatmatFonte').value = '';
  });

  let itemModalDirty = false;

  const marcarDirty = () => {
    itemModalDirty = true;
  };
  overlay.querySelectorAll('input, select, textarea').forEach((el) => {
    el.addEventListener('input', marcarDirty);
    el.addEventListener('change', marcarDirty);
  });

  const fecharModal = (forceClose = false) => {
    if (!forceClose && itemModalDirty) {
      const confirmar = confirm('⚠️ Você tem alterações não salvas.\n\nDeseja descartar as alterações?');
      if (!confirmar) {
        return;
      }
    }
    document.removeEventListener('keydown', handleEsc);
    overlay.remove();
  };

  overlay.querySelector('#modalCancelar').addEventListener('click', () => fecharModal(false));
  overlay.querySelector('#modalFechar').addEventListener('click', () => fecharModal(false));

  overlay.querySelector('.modal-card').addEventListener('click', (e) => {
    e.stopPropagation();
  });

  const handleEsc = (e) => {
    if (e.key === 'Escape') {
      fecharModal(false);
    }
  };
  document.addEventListener('keydown', handleEsc);

  setTimeout(() => {
    overlay.querySelector('#modalSeq')?.focus();
  }, 100);

  overlay.querySelector('#modalSalvar').addEventListener('click', async () => {
    const subelementoSelect = document.getElementById('modalSubelemento');
    const subelementoCodigo = subelementoSelect.value.trim();
    const subelementoNome = subelementoCodigo
      ? NaturezaSubelementos.getSubelementoNome(app.empenhoDraft.header.naturezaDespesa, subelementoCodigo)
      : '';

    let descricaoItem = document.getElementById('modalDescricao').value.trim();
    let unidadeItem = document.getElementById('modalUnidade').value.trim() || 'UN';
    let itemCompra = document.getElementById('modalItemCompra').value.trim();

    if (window.UXHelpers) {
      descricaoItem = window.UXHelpers.normUpper(descricaoItem);

      const validacaoUnidade = window.UXHelpers.validarUnidade(unidadeItem);
      if (!validacaoUnidade.ok) {
        app.showToast('⚠️ ' + validacaoUnidade.msg, 'warning');
        return;
      }
      unidadeItem = validacaoUnidade.val;

      itemCompra = window.UXHelpers.formatItemCompra3Digitos(itemCompra);
    }

    const novo = {
      seq: Number(document.getElementById('modalSeq').value) || app.empenhoDraft.itens.length + 1,
      subelementoCodigo,
      subelementoNome,
      itemCompra,
      descricao: descricaoItem,
      unidade: unidadeItem,
      quantidade: app.parseNumero(document.getElementById('modalQuantidade').value),
      valorUnitario: app.parseNumero(document.getElementById('modalValorUnitario').value),
      valorTotal: app.parseNumero(document.getElementById('modalValorTotal').value),
      observacao: document.getElementById('modalObservacao').value.trim(),
      catmatCodigo: document.getElementById('modalCatmatCodigo').value.trim(),
      catmatDescricao: document.getElementById('modalCatmatDescricao').value.trim(),
      catmatFonte: document.getElementById('modalCatmatFonte').value.trim()
    };

    if (!novo.subelementoCodigo) {
      app.showToast('⚠️ Subelemento é obrigatório', 'warning');
      return;
    }

    if (!novo.descricao) {
      app.showToast('⚠️ Descrição é obrigatória', 'warning');
      return;
    }

    if (index !== null) {
      app.empenhoDraft.itens[index] = novo;
    } else {
      app.empenhoDraft.itens.push(novo);
    }

    if (window.UXHelpers) {
      window.UXHelpers.salvarSugestoesAposSalvarItem(novo);
    }

    app.reindexarSequenciaEmpenho();
    app.renderItensEmpenho();
    overlay.remove();
  });

  document.body.appendChild(overlay);

  setTimeout(() => {
    document.getElementById('modalDescricao')?.focus();
  }, 100);
}
/* eslint-enable complexity */
