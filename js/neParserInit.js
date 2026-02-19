/**
 * Inicializador do módulo neParser
 * Carrega o módulo ES6 e disponibiliza globalmente
 */

// Promessa que resolve quando o módulo estiver carregado
window.neParserReady = (async function initNeParser() {
  try {
    console.log('Iniciando carregamento do módulo neParser...');

    // Importa o módulo neParser
    const neParserModule = await import('./neParser.js');

    // Disponibiliza globalmente
    window.neParser = {
      parseEmpenhoPdf: neParserModule.parseEmpenhoPdf,
      toNumberBR: neParserModule.toNumberBR,
      normalizeDescResumida: neParserModule.normalizeDescResumida,
      extractTextFromPDF: neParserModule.extractTextFromPDF
    };

    console.log('✅ Módulo neParser carregado com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao carregar módulo neParser:', error);
    console.error('Stack:', error.stack);

    // Define versão vazia para evitar erros
    window.neParser = {
      parseEmpenhoPdf: async () => {
        throw new Error('Módulo neParser não foi carregado corretamente: ' + error.message);
      }
    };

    return false;
  }
})();
