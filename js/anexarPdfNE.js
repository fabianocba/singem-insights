/**
 * ============================================================================
 * IFDESK - Módulo: Anexar PDF da NE
 * ============================================================================
 *
 * Permite anexar um PDF de Nota de Empenho ao cadastro atual.
 * O arquivo é copiado para a pasta de Empenhos gerenciada pela aplicação.
 *
 * Nome do arquivo: {ANO}NE{NUMERO_PADRONIZADO}.pdf
 * Exemplo: 2025NE000123.pdf
 *
 * @version 1.0.0
 */

// Flag de debug (pode ser ativado via console: window.DEBUG_PDF_NE = true)
window.DEBUG_PDF_NE = localStorage.getItem('DEBUG_PDF_NE') === 'true';

/**
 * Logger condicional para debug
 */
function logDebug(...args) {
  if (window.DEBUG_PDF_NE) {
    console.log('[AnexarPdfNE]', ...args);
  }
}

/**
 * Padroniza o número do empenho (zeros à esquerda, mínimo 3 dígitos)
 * @param {string|number} numeroNE - Número do empenho
 * @returns {string} Número padronizado
 */
function padNumeroNE(numeroNE) {
  // Remove caracteres não numéricos
  let numeroPuro = String(numeroNE || '').replace(/\D/g, '');

  // Se vazio, usa '000'
  if (!numeroPuro) {
    numeroPuro = '000';
  }

  // Se menos de 3 dígitos, preenche com zeros
  if (numeroPuro.length < 3) {
    numeroPuro = numeroPuro.padStart(3, '0');
  }

  return numeroPuro;
}

/**
 * Extrai o primeiro nome do fornecedor (sanitizado para nome de arquivo)
 * @param {string} nomeCompleto - Nome/Razão Social do fornecedor
 * @returns {string} Primeiro nome sanitizado (maiúsculas, sem caracteres especiais)
 */
function extrairPrimeiroNome(nomeCompleto) {
  if (!nomeCompleto) {
    return '';
  }

  // Pegar primeiro "bloco" do nome (antes do primeiro espaço)
  let primeiroNome = String(nomeCompleto).trim().split(/\s+/)[0] || '';

  // Remover caracteres inválidos para nome de arquivo
  // Manter apenas letras, números, hífen e underscore
  primeiroNome = primeiroNome
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-zA-Z0-9\-_]/g, '') // Remove caracteres especiais
    .toUpperCase();

  // Limitar tamanho para evitar nomes muito longos
  if (primeiroNome.length > 20) {
    primeiroNome = primeiroNome.substring(0, 20);
  }

  logDebug('Primeiro nome extraído:', primeiroNome);
  return primeiroNome;
}

/**
 * Gera o nome padronizado do arquivo PDF da NE
 * @param {number|string} ano - Ano do empenho (obrigatório)
 * @param {string} numeroNE - Número do empenho (pode ter zeros à esquerda)
 * @param {string} [nomeFornecedor] - Nome/Razão Social do fornecedor (opcional)
 * @returns {string} Nome do arquivo no formato {ANO}NE{NUMERO} {FORNECEDOR}.pdf
 */
function buildEmpenhoPdfName(ano, numeroNE, nomeFornecedor) {
  if (!ano) {
    throw new Error('Ano é obrigatório para gerar nome do arquivo');
  }

  const anoStr = String(ano);
  const numeroPadronizado = padNumeroNE(numeroNE);
  const primeiroNome = extrairPrimeiroNome(nomeFornecedor);

  // Formato: 2025NE000 FORNECEDOR.pdf (ou sem fornecedor se não informado)
  let nomeArquivo;
  if (primeiroNome) {
    nomeArquivo = `${anoStr}NE${numeroPadronizado} ${primeiroNome}.pdf`;
  } else {
    nomeArquivo = `${anoStr}NE${numeroPadronizado}.pdf`;
  }

  logDebug('Nome gerado:', nomeArquivo);
  return nomeArquivo;
}

/**
 * Abre seletor de arquivo para escolher um PDF (File System Access API)
 * @returns {Promise<FileSystemFileHandle|null>} Handle do arquivo ou null se cancelou
 */
async function pickPdfHandle() {
  logDebug('Abrindo seletor de arquivo PDF...');

  // Verificar suporte a File System Access API
  if ('showOpenFilePicker' in window) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: 'Arquivos PDF',
            accept: { 'application/pdf': ['.pdf'] }
          }
        ],
        multiple: false
      });

      const file = await fileHandle.getFile();
      logDebug('Arquivo selecionado:', file.name, file.size, 'bytes');

      // Validar tipo
      if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        throw new Error('Apenas arquivos PDF são permitidos');
      }

      return { fileHandle, file };
    } catch (error) {
      if (error.name === 'AbortError') {
        logDebug('Usuário cancelou seleção');
        return null;
      }
      throw error;
    }
  } else {
    // Fallback: usar input file tradicional
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,application/pdf';

      input.onchange = async (e) => {
        const file = e.target.files?.[0];
        if (file) {
          logDebug('Arquivo selecionado (fallback):', file.name);
          resolve({ fileHandle: null, file });
        } else {
          resolve(null);
        }
      };

      input.click();
    });
  }
}

/**
 * Salva o PDF na pasta de Empenhos gerenciada pela aplicação
 * @param {File} file - Arquivo PDF a salvar
 * @param {number|string} ano - Ano do empenho
 * @param {string} numeroNE - Número do empenho
 * @param {string} [nomeFornecedor] - Nome/Razão Social do fornecedor
 * @param {string} [pdfAntigoNome] - Nome do PDF anterior (para excluir ao substituir)
 * @returns {Promise<Object>} Informações do arquivo salvo
 */
async function savePdfToEmpenhosDir(file, ano, numeroNE, nomeFornecedor, pdfAntigoNome) {
  logDebug('Salvando PDF na pasta de empenhos...');

  // Verificar se fsManager está disponível e configurado
  if (!window.fsManager) {
    throw new Error('Sistema de arquivos não inicializado');
  }

  if (!window.fsManager.mainDirectoryHandle) {
    throw new Error(
      'Pasta principal não configurada.\n\n' + 'Clique em "📁 Selecionar Pasta Principal" para configurar.'
    );
  }

  // Gerar nome do arquivo (agora com fornecedor)
  const nomeArquivo = buildEmpenhoPdfName(ano, numeroNE, nomeFornecedor);
  logDebug('Nome do arquivo:', nomeArquivo);

  // Obter pasta de empenhos para o ano
  const pastaEmpenhos = await window.fsManager.getOrCreateSubfolder('empenhos', ano);
  logDebug('Pasta de empenhos obtida para ano:', ano);

  // Se há PDF antigo com nome diferente, excluir
  if (pdfAntigoNome && pdfAntigoNome !== nomeArquivo) {
    try {
      await pastaEmpenhos.removeEntry(pdfAntigoNome);
      logDebug('PDF antigo removido:', pdfAntigoNome);
    } catch (e) {
      // Arquivo antigo não existe ou erro ao remover - continuar
      logDebug('Não foi possível remover PDF antigo:', e.message);
    }
  }

  // Verificar se arquivo com mesmo nome já existe
  let arquivoExiste = false;
  try {
    await pastaEmpenhos.getFileHandle(nomeArquivo);
    arquivoExiste = true;
  } catch (e) {
    // Arquivo não existe, ok
  }

  if (arquivoExiste && nomeArquivo !== pdfAntigoNome) {
    const confirmar = confirm(`⚠️ O arquivo "${nomeArquivo}" já existe na pasta.\n\n` + 'Deseja sobrescrever?');
    if (!confirmar) {
      throw new Error('Operação cancelada pelo usuário');
    }
  }

  // Criar/sobrescrever arquivo
  const fileHandle = await pastaEmpenhos.getFileHandle(nomeArquivo, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(file);
  await writable.close();

  logDebug('✅ Arquivo salvo com sucesso:', nomeArquivo);

  // Retornar informações do arquivo
  return {
    originalName: file.name,
    savedName: nomeArquivo,
    folderType: 'empenhos',
    year: ano,
    size: file.size,
    timestamp: new Date().toISOString(),
    path: `01_EMPENHOS/${ano}/${nomeArquivo}`
  };
}

/**
 * Atualiza o registro do empenho no IndexedDB com informações do PDF anexado
 * @param {number} empenhoId - ID do empenho
 * @param {Object} arquivoInfo - Informações do arquivo salvo
 */
async function updateEmpenhoPdfMeta(empenhoId, arquivoInfo) {
  logDebug('Atualizando empenho com anexo, ID:', empenhoId);

  if (!window.dbManager) {
    throw new Error('Banco de dados não inicializado');
  }

  // Buscar empenho atual
  const empenho = await window.dbManager.get('empenhos', empenhoId);
  if (!empenho) {
    throw new Error('Empenho não encontrado no banco de dados');
  }

  // Adicionar/atualizar campos de anexo (schemaless - adiciona direto no objeto)
  empenho.pdfFileName = arquivoInfo.savedName;
  empenho.pdfAttachedAt = Date.now();
  empenho.pdfOriginalName = arquivoInfo.originalName;
  empenho.pdfPath = arquivoInfo.path;

  empenho.dataAtualizacao = new Date().toISOString();

  // Salvar
  await window.dbManager.update('empenhos', empenho);
  logDebug('✅ Empenho atualizado com anexo');

  // Também salvar na store de arquivos para backup/restore
  const arquivoMeta = {
    ...arquivoInfo,
    documentoId: empenhoId,
    tipoDocumento: 'empenho'
  };
  await window.dbManager.salvarArquivo(arquivoMeta);
  logDebug('✅ Arquivo registrado na store de arquivos');

  return empenho;
}

/**
 * Handler principal do botão "Anexar PDF da NE"
 * Obtém ano e número do formulário atual
 */
async function handleAnexarPdfNE() {
  logDebug('=== handleAnexarPdfNE() iniciado ===');

  const statusEl = document.getElementById('statusAnexoPdfNE');
  const btnAnexar = document.getElementById('btnAnexarPdfNE');

  try {
    // Obter ano, número e fornecedor do formulário
    const anoInput = document.getElementById('anoEmpenho');
    const numeroInput = document.getElementById('numeroEmpenho');
    const fornecedorInput = document.getElementById('fornecedorEmpenho');

    const ano = anoInput?.value?.trim();
    const numero = numeroInput?.value?.trim();
    const fornecedor = fornecedorInput?.value?.trim() || '';

    logDebug('Valores do formulário - Ano:', ano, 'Número:', numero, 'Fornecedor:', fornecedor);

    // Validar campos obrigatórios
    if (!ano) {
      alert('⚠️ Preencha o campo "Ano" antes de anexar o PDF.');
      anoInput?.focus();
      return;
    }

    if (!numero) {
      alert('⚠️ Preencha o campo "Número do Empenho" antes de anexar o PDF.');
      numeroInput?.focus();
      return;
    }

    // Verificar se pasta está configurada
    if (!window.fsManager?.mainDirectoryHandle) {
      alert('⚠️ Pasta principal não configurada.\n\n' + 'Clique em "📁 Selecionar Pasta Principal" primeiro.');
      return;
    }

    // Verificar se já existe PDF anexado (para substituir)
    const pdfAtual = statusEl?.querySelector('.link-pdf-anexado')?.dataset?.pdf;
    if (pdfAtual) {
      const confirmarSubstituir = confirm(
        `⚠️ Já existe um PDF anexado:\n${pdfAtual}\n\nDeseja substituir pelo novo arquivo?`
      );
      if (!confirmarSubstituir) {
        logDebug('Usuário cancelou substituição');
        return;
      }
    }

    // Selecionar arquivo
    const result = await pickPdfHandle();
    if (!result) {
      logDebug('Nenhum arquivo selecionado');
      return;
    }

    const { file } = result;

    // Feedback visual
    if (btnAnexar) {
      btnAnexar.disabled = true;
      btnAnexar.textContent = '⏳ Salvando...';
    }
    if (statusEl) {
      statusEl.textContent = '⏳ Salvando PDF...';
      statusEl.style.color = '#666';
    }

    // Salvar arquivo na pasta (com fornecedor e removendo PDF antigo se existir)
    const arquivoInfo = await savePdfToEmpenhosDir(file, ano, numero, fornecedor, pdfAtual);

    // Atualizar status na UI com link clicável
    if (statusEl) {
      statusEl.innerHTML = criarLinkPdf(arquivoInfo.savedName, ano);
      statusEl.style.color = '#28a745';
      bindLinkPdfClick(statusEl);
    }

    // Guardar info no objeto global para usar ao salvar empenho
    if (window.app) {
      window.app._anexoPdfNEPendente = arquivoInfo;
      logDebug('Anexo pendente guardado em window.app._anexoPdfNEPendente');
    }

    // Mostrar sucesso
    alert(`✅ PDF anexado com sucesso!\n\nArquivo: ${arquivoInfo.savedName}\nLocal: ${arquivoInfo.path}`);
  } catch (error) {
    console.error('[AnexarPdfNE] Erro:', error);

    if (statusEl) {
      statusEl.textContent = `❌ Erro: ${error.message}`;
      statusEl.style.color = '#dc3545';
    }

    alert(`❌ Erro ao anexar PDF:\n\n${error.message}`);
  } finally {
    // Restaurar botão
    if (btnAnexar) {
      btnAnexar.disabled = false;
      btnAnexar.textContent = '📎 Anexar PDF da NE';
    }
  }
}

/**
 * Abre o PDF anexado para visualização
 * @param {string} pdfFileName - Nome do arquivo PDF
 * @param {number|string} ano - Ano do empenho
 */
async function abrirPdfAnexado(pdfFileName, ano) {
  logDebug('Abrindo PDF:', pdfFileName, 'Ano:', ano);

  try {
    // Verificar se fsManager está disponível
    if (!window.fsManager?.mainDirectoryHandle) {
      alert('⚠️ Pasta principal não configurada.\n\nConfigure a pasta para visualizar o PDF.');
      return;
    }

    // Obter pasta de empenhos do ano
    const pastaEmpenhos = await window.fsManager.getOrCreateSubfolder('empenhos', ano);
    logDebug('Pasta de empenhos obtida:', pastaEmpenhos.name);

    // Obter handle do arquivo
    let fileHandle;
    try {
      fileHandle = await pastaEmpenhos.getFileHandle(pdfFileName);
    } catch (e) {
      alert(`⚠️ Arquivo não encontrado:\n${pdfFileName}\n\nO arquivo pode ter sido movido ou excluído.`);
      return;
    }

    // Obter o arquivo
    const file = await fileHandle.getFile();
    logDebug('Arquivo obtido:', file.name, file.size, 'bytes');

    // Criar URL do blob e abrir em nova aba
    const blob = new Blob([await file.arrayBuffer()], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);

    // Abrir em nova aba
    const newWindow = window.open(url, '_blank');

    if (newWindow) {
      logDebug('✅ PDF aberto em nova aba');
      // Limpar URL após um tempo (para liberar memória)
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } else {
      // Popup bloqueado - tentar download
      alert('⚠️ Pop-up bloqueado pelo navegador.\n\nO PDF será baixado.');
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfFileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    }
  } catch (error) {
    console.error('[AnexarPdfNE] Erro ao abrir PDF:', error);
    alert(`❌ Erro ao abrir PDF:\n\n${error.message}`);
  }
}

/**
 * Cria HTML do link clicável para abrir o PDF
 * @param {string} pdfFileName - Nome do arquivo
 * @param {number|string} ano - Ano do empenho
 * @returns {string} HTML do link
 */
function criarLinkPdf(pdfFileName, ano) {
  // Usar data attributes para passar os parâmetros
  return `✅ PDF anexado: <a href="#" class="link-pdf-anexado" data-pdf="${pdfFileName}" data-ano="${ano}" style="color: #007bff; text-decoration: underline; cursor: pointer; font-weight: bold;">${pdfFileName}</a>`;
}

/**
 * Atualiza a UI de status quando um empenho é carregado para edição
 * @param {Object} empenho - Dados do empenho
 */
function atualizarStatusAnexoUI(empenho) {
  const statusEl = document.getElementById('statusAnexoPdfNE');
  if (!statusEl) {
    return;
  }

  if (empenho?.pdfFileName) {
    const ano = empenho.ano || empenho.anoEmpenho || new Date().getFullYear();
    statusEl.innerHTML = criarLinkPdf(empenho.pdfFileName, ano);
    statusEl.style.color = '#28a745';
    // Bind do click no link
    bindLinkPdfClick(statusEl);
  } else {
    statusEl.textContent = 'Nenhum PDF anexado.';
    statusEl.style.color = '#666';
  }
}

/**
 * Adiciona listener de click aos links de PDF
 * @param {HTMLElement} container - Elemento contendo o link
 */
function bindLinkPdfClick(container) {
  const link = container.querySelector('.link-pdf-anexado');
  if (link && !link.dataset.bound) {
    link.dataset.bound = '1';
    link.addEventListener('click', async (e) => {
      e.preventDefault();
      const pdfFileName = link.dataset.pdf;
      const ano = link.dataset.ano;
      await abrirPdfAnexado(pdfFileName, ano);
    });
  }
}

/**
 * Reseta o status de anexo na UI (ao limpar formulário)
 */
function resetarStatusAnexoUI() {
  const statusEl = document.getElementById('statusAnexoPdfNE');
  if (statusEl) {
    statusEl.textContent = 'Nenhum PDF anexado.';
    statusEl.style.color = '#666';
  }
  // Limpar pendente
  if (window.app) {
    window.app._anexoPdfNEPendente = null;
  }
}

/**
 * Inicializa o módulo - configura event listeners
 */
function initAnexarPdfNE() {
  logDebug('Inicializando módulo AnexarPdfNE...');

  const btnAnexar = document.getElementById('btnAnexarPdfNE');
  if (btnAnexar && !btnAnexar.dataset.bound) {
    btnAnexar.dataset.bound = '1';
    btnAnexar.addEventListener('click', handleAnexarPdfNE);
    logDebug('✅ Listener anexado ao botão');
  }

  // Logs de auditoria (só se DEBUG_PDF_NE === true)
  if (window.DEBUG_PDF_NE) {
    console.group('📋 AUDITORIA - AnexarPdfNE');
    console.log('Arquivo do formulário de empenho: index.html (empenhoScreen > tabCadastro)');
    console.log('Função que salva empenho: app.js → salvarEmpenho()');
    console.log('Função que obtém pasta de empenhos: fsManager.js → getOrCreateSubfolder("empenhos", ano)');
    console.log('Padrão de pasta: IFDESK/[UNIDADE]/01_EMPENHOS/[ANO]/ ou legado');
    console.log('Store de arquivos IndexedDB: "arquivos"');
    console.log('fsManager.mainDirectoryHandle:', window.fsManager?.mainDirectoryHandle?.name || 'NÃO CONFIGURADO');
    console.groupEnd();
  }

  logDebug('✅ Módulo inicializado');
}

// ============================================================================
// FUNÇÃO DE TESTE MANUAL (somente em debug)
// ============================================================================
/**
 * Teste manual guiado da funcionalidade de anexar PDF
 * Execute no console: await manualTestPdfNE()
 */
async function manualTestPdfNE() {
  console.group('🧪 TESTE MANUAL - Anexar PDF da NE');

  try {
    // 1. Verificar pré-requisitos
    console.log('1️⃣ Verificando pré-requisitos...');

    if (!window.fsManager?.mainDirectoryHandle) {
      console.error('❌ Pasta principal não configurada!');
      console.log('   → Clique em "📁 Selecionar Pasta Principal" primeiro');
      return false;
    }
    console.log('   ✅ fsManager configurado:', window.fsManager.mainDirectoryHandle.name);

    if (!window.dbManager) {
      console.error('❌ dbManager não disponível!');
      return false;
    }
    console.log('   ✅ dbManager disponível');

    // 2. Verificar formulário
    console.log('2️⃣ Verificando formulário de empenho...');

    const anoInput = document.getElementById('anoEmpenho');
    const numeroInput = document.getElementById('numeroEmpenho');
    const btnAnexar = document.getElementById('btnAnexarPdfNE');
    const statusEl = document.getElementById('statusAnexoPdfNE');

    if (!anoInput || !numeroInput) {
      console.error('❌ Campos de ano/número não encontrados!');
      return false;
    }
    console.log('   ✅ Campos ano/número encontrados');

    if (!btnAnexar) {
      console.error('❌ Botão "Anexar PDF" não encontrado!');
      return false;
    }
    console.log('   ✅ Botão "Anexar PDF" encontrado');

    if (!statusEl) {
      console.error('❌ Status de anexo não encontrado!');
      return false;
    }
    console.log('   ✅ Status de anexo encontrado');

    // 3. Verificar valores
    console.log('3️⃣ Valores atuais do formulário:');
    console.log('   Ano:', anoInput.value || '(vazio)');
    console.log('   Número:', numeroInput.value || '(vazio)');

    if (!anoInput.value || !numeroInput.value) {
      console.warn('⚠️ Preencha ano e número antes de testar!');
      console.log('   → Exemplo: Ano=2025, Número=000123');
    }

    // 4. Testar função de nome
    console.log('4️⃣ Testando buildEmpenhoPdfName():');
    const testCases = [
      { ano: 2025, num: '123', expected: '2025NE123.pdf' },
      { ano: 2025, num: '1', expected: '2025NE001.pdf' },
      { ano: 2025, num: '000456', expected: '2025NE000456.pdf' },
      { ano: 2026, num: '', expected: '2026NE000.pdf' }
    ];

    for (const tc of testCases) {
      const result = buildEmpenhoPdfName(tc.ano, tc.num);
      const status = result === tc.expected ? '✅' : '❌';
      console.log(`   ${status} (${tc.ano}, "${tc.num}") → "${result}" (esperado: "${tc.expected}")`);
    }

    // 5. Verificar pasta de empenhos
    console.log('5️⃣ Verificando pasta de empenhos...');
    try {
      const ano = anoInput.value || new Date().getFullYear();
      const pasta = await window.fsManager.getOrCreateSubfolder('empenhos', ano);
      console.log('   ✅ Pasta obtida:', pasta.name);

      // Listar arquivos existentes
      const arquivos = [];
      for await (const entry of pasta.values()) {
        if (entry.kind === 'file' && entry.name.endsWith('.pdf')) {
          arquivos.push(entry.name);
        }
      }
      console.log('   📁 PDFs existentes:', arquivos.length ? arquivos : '(nenhum)');
    } catch (e) {
      console.error('   ❌ Erro ao acessar pasta:', e.message);
    }

    // 6. Instruções para teste manual
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 INSTRUÇÕES PARA TESTE MANUAL:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('1. Preencha Ano e Número do Empenho no formulário');
    console.log('2. Clique no botão "📎 Anexar PDF da NE"');
    console.log('3. Selecione um arquivo PDF');
    console.log('4. Verifique se aparece "✅ PDF anexado: ..."');
    console.log('5. Abra a pasta 01_EMPENHOS/[ANO]/ e confirme o arquivo');
    console.log('6. Salve o empenho e reabra para confirmar persistência');
    console.log('═══════════════════════════════════════════════════════════');

    console.log('');
    console.log('✅ Teste de pré-requisitos concluído!');
    return true;
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    return false;
  } finally {
    console.groupEnd();
  }
}

// Exportar funções globalmente
window.AnexarPdfNE = {
  padNumeroNE,
  extrairPrimeiroNome,
  buildEmpenhoPdfName,
  pickPdfHandle,
  savePdfToEmpenhosDir,
  updateEmpenhoPdfMeta,
  handleAnexarPdfNE,
  atualizarStatusAnexoUI,
  resetarStatusAnexoUI,
  abrirPdfAnexado,
  criarLinkPdf,
  bindLinkPdfClick,
  init: initAnexarPdfNE
};

// Disponibilizar teste manual no escopo global
window.manualTestPdfNE = manualTestPdfNE;

// Auto-inicializar quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnexarPdfNE);
} else {
  // DOM já carregado, aguardar um pouco para garantir que outros scripts carregaram
  setTimeout(initAnexarPdfNE, 100);
}

console.log('[AnexarPdfNE] ✅ Módulo carregado');
