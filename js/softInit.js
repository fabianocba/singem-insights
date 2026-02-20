/**
 * SINGEM - Inicializador Suave (Soft Init)
 *
 * Este script carrega os novos utilitários de forma OPCIONAL e SEGURA.
 * Se algo falhar, o sistema continua funcionando normalmente.
 *
 * NÃO substitui nem modifica código existente.
 */

(async function () {
  console.info('🚀 SINGEM Soft Init - Carregando melhorias...');

  const loadedModules = {
    utils: false,
    dbIntegration: false
  };

  // ========================================
  // 1. Carrega utilitários gerais
  // ========================================
  try {
    await import('./utils/integration.js');
    loadedModules.utils = true;
    console.info('✅ Utilitários gerais carregados');
  } catch (error) {
    console.warn('⚠️ Não foi possível carregar utilitários gerais:', error.message);
    console.info('💡 Sistema continua funcionando normalmente sem os utils');
  }

  // ========================================
  // 2. Aguarda e melhora dbManager
  // ========================================
  try {
    await import('./db/integration.js');
    loadedModules.dbIntegration = true;
    console.info('✅ Melhorias de IndexedDB carregadas');
  } catch (error) {
    console.warn('⚠️ Não foi possível carregar melhorias de DB:', error.message);
    console.info('💡 dbManager original continua funcionando');
  }

  // ========================================
  // 3. Relatório final
  // ========================================
  console.info('📊 Relatório de carregamento:');
  console.table(loadedModules);

  if (loadedModules.utils) {
    console.info('💡 Use window.SINGEMUtils para acessar utilitários');
    console.info('📖 Exemplos:');
    console.info('   - window.SINGEMUtils.validate.validateCNPJ("12.345.678/0001-90")');
    console.info('   - window.SINGEMUtils.sanitize.escapeHTML(userInput)');
    console.info('   - window.SINGEMUtils.logger.info("Mensagem de log")');
  }

  if (loadedModules.dbIntegration) {
    console.info('💡 dbManager agora tem novos métodos:');
    console.info('   - dbManager.batchInsert(storeName, items)');
    console.info('   - dbManager.count(storeName)');
    console.info('   - dbManager.exportData(storeName)');
    console.info('   - dbManager.initSafe()');
  }

  // Dispara evento customizado
  window.dispatchEvent(
    new CustomEvent('SINGEMUtilsReady', {
      detail: loadedModules
    })
  );

  console.info('🎉 SINGEM Soft Init concluído!');
})();
