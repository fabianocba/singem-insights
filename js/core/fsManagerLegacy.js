/**
 * Métodos legados do FSManager (mantidos para compatibilidade)
 * Estes métodos ainda são usados em partes antigas do sistema
 */

/**
 * Abre pasta no explorador do sistema (fallback manual)
 */
async function openFolderLegacy(folderType, year = null) {
  const fs = window.fsManager;
  if (!fs.mainDirectoryHandle) {
    throw new Error('Pasta principal não configurada');
  }

  const currentYear = year || new Date().getFullYear();

  try {
    await fs.getOrCreateSubfolder(folderType, currentYear);

    alert(
      `📁 Estrutura de pastas criada!\n\n` +
        `Navegue manualmente até a pasta:\n` +
        `${fs.mainDirectoryHandle.name}/${currentYear}/${folderType}\n\n` +
        `(Não é possível abrir automaticamente o explorador de arquivos pelo navegador)`
    );

    return true;
  } catch (error) {
    console.error('Erro ao abrir pasta:', error);
    throw error;
  }
}

/**
 * Mostra instruções de acesso às pastas
 */
async function showFolderInstructionsLegacy(folderType, year = null) {
  const fs = window.fsManager;
  const configPastas = await fs.obterConfigEstrutura();

  if (!configPastas || !configPastas.unidade) {
    alert('⚠️ Configure a estrutura de pastas primeiro em Configurações → Arquivos');
    return;
  }

  const abreviacao = configPastas.unidade.abreviacao;
  const currentYear = year || new Date().getFullYear();
  const tipoNome = folderType === 'empenhos' ? 'Notas de Empenho' : 'Notas Fiscais';

  const caminho = `${fs.mainDirectoryHandle.name}/${abreviacao}/${currentYear}/${tipoNome}`;

  alert(
    `📂 Como acessar os arquivos:\n\n` +
      `1. Abra o Explorador de Arquivos (Windows) ou Finder (Mac)\n` +
      `2. Navegue até: ${caminho}\n` +
      `3. Seus PDFs estarão nesta pasta\n\n` +
      `💡 Dica: Adicione esta pasta aos favoritos para acesso rápido!`
  );
}

/**
 * Obtém estatísticas de armazenamento
 */
async function getStorageStatsLegacy() {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    const used = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentUsed = quota > 0 ? ((used / quota) * 100).toFixed(2) : 0;

    return {
      used: (used / (1024 * 1024)).toFixed(2),
      quota: (quota / (1024 * 1024)).toFixed(2),
      percentUsed: percentUsed,
      available: ((quota - used) / (1024 * 1024)).toFixed(2)
    };
  }

  return null;
}

// Export functions
window.fsManagerLegacy = {
  openFolderLegacy,
  showFolderInstructionsLegacy,
  getStorageStatsLegacy
};

console.log('✅ FSManager Legacy carregado');
