import { DEBUG_REL_EMP, TIPOS_RELATORIO, estadoRelatorio } from './state.js';

export function setupEventosTipoRelatorio(onReload) {
  const botoesTipo = Array.from(document.querySelectorAll('.btn-tipo-relatorio'));
  botoesTipo.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      const tipo = e.currentTarget.dataset.tipo;

      botoesTipo.forEach((button) => button.classList.remove('active'));
      e.currentTarget.classList.add('active');

      estadoRelatorio.tipoAtual = tipo;

      const config = TIPOS_RELATORIO[tipo];
      const tituloEl = document.getElementById('tituloRelatorioAtual');
      if (tituloEl && config) {
        tituloEl.textContent = config.titulo;
      }

      await onReload();
    });
  });
}

export function setupEventosFiltros(onRender) {
  const inputBusca = document.getElementById('buscaEmpenhoRelatorio');
  if (inputBusca) {
    let debounceTimer;
    inputBusca.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        estadoRelatorio.filtros.busca = e.target.value.toLowerCase().trim();
        await onRender();
      }, 300);
    });
  }

  const selectAno = document.getElementById('filtroAnoRelatorio');
  if (selectAno) {
    selectAno.addEventListener('change', async (e) => {
      estadoRelatorio.filtros.ano = e.target.value;
      await onRender();
    });
  }

  const selectOrdenacao = document.getElementById('ordenacaoRelatorio');
  if (selectOrdenacao) {
    selectOrdenacao.addEventListener('change', async (e) => {
      estadoRelatorio.ordenacao = e.target.value;
      await onRender();
    });
  }
}

export function setupExportacao(onExportar) {
  const btnExportar = document.getElementById('btnExportarRelatorio');
  if (btnExportar) {
    btnExportar.addEventListener('click', () => onExportar());
  }
}

export function setupDelegacaoEventosRelatorio() {
  const container = document.getElementById('relatorioEmpenhosContainer');
  if (!container) {
    console.warn('[Relatórios] Container relatorioEmpenhosContainer não encontrado');
    return;
  }

  if (container.__boundRelEmp) {
    return;
  }
  container.__boundRelEmp = true;

  container.addEventListener('click', async (ev) => {
    const target = ev.target?.closest('[data-action][data-id]');
    if (!target) {
      return;
    }

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (DEBUG_REL_EMP) {
      console.log('[REL] click', { action, id, target });
    }

    if (!id) {
      console.warn('[Relatórios] ID do empenho não encontrado no botão');
      return;
    }

    const empenhoId = parseInt(id, 10);
    if (Number.isNaN(empenhoId)) {
      console.warn('[Relatórios] ID inválido:', id);
      return;
    }

    try {
      if (action === 'ver') {
        if (window.app?.abrirEmpenhoParaEdicao) {
          await window.app.abrirEmpenhoParaEdicao(empenhoId, true);
        } else {
          console.error('[Relatórios] window.app.abrirEmpenhoParaEdicao não disponível');
        }
      } else if (action === 'detalhes') {
        if (window.app?.mostrarDetalhesEmpenho) {
          await window.app.mostrarDetalhesEmpenho(empenhoId);
        } else {
          console.error('[Relatórios] window.app.mostrarDetalhesEmpenho não disponível');
        }
      }
    } catch (error) {
      console.error('[Relatórios] Erro ao executar ação:', error);
    }
  });

  if (DEBUG_REL_EMP) {
    console.log('[Relatórios] ✅ Delegação de eventos configurada');
  }
}
