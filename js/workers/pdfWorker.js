/**
 * PDF Worker - Processa PDFs em background sem travar a UI
 * Usa PDF.js para extração de texto e Tesseract como fallback
 */

// Importar bibliotecas (ajuste os paths conforme necessário)
self.importScripts(
  'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.min.js',
  'https://cdn.jsdelivr.net/npm/tesseract.js@2.1.5/dist/tesseract.min.js'
);

// Configurar PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@2.16.105/build/pdf.worker.min.js';

/**
 * Timeout padrão para processamento (30 segundos)
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * Extrai texto de um PDF usando PDF.js
 * @param {ArrayBuffer} pdfBuffer - Buffer do PDF
 * @returns {Promise<string>} Texto extraído
 */
async function extractTextFromPDF(pdfBuffer) {
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText.trim();
}

/**
 * Extrai texto de imagem usando Tesseract OCR (fallback)
 * @param {ArrayBuffer} pdfBuffer - Buffer do PDF
 * @returns {Promise<string>} Texto extraído via OCR
 */
async function extractTextFromImagePDF(pdfBuffer) {
  // Renderizar primeira página como imagem
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  const viewport = page.getViewport({ scale: 2.0 });
  const canvas = new OffscreenCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  await page.render({
    canvasContext: context,
    viewport: viewport
  }).promise;

  // Converter canvas para ImageData
  const imageData = context.getImageData(0, 0, viewport.width, viewport.height);

  // OCR com Tesseract
  const {
    data: { text }
  } = await Tesseract.recognize(
    imageData,
    'por', // Português
    {
      logger: (m) =>
        self.postMessage({
          type: 'progress',
          status: m.status,
          progress: m.progress
        })
    }
  );

  return text.trim();
}

/**
 * Normaliza dados extraídos para formato padrão
 * @param {string} text - Texto extraído
 * @param {string} filename - Nome do arquivo
 * @returns {Object} Dados normalizados
 */
function normalizeExtractedData(text, filename) {
  // Detectar tipo de documento
  const isEmpenho = /NOTA DE EMPENHO|EMPENHO N[ºO°]/i.test(text);
  const isNotaFiscal = /NOTA FISCAL|NF-e|DANFE/i.test(text);

  return {
    tipoDocumento: isEmpenho ? 'empenho' : isNotaFiscal ? 'notaFiscal' : 'unknown',
    textoCompleto: text,
    nomeArquivo: filename,
    dataExtracao: new Date().toISOString(),
    metadados: {
      tamanhoPaginas: text.split('\n\n').length,
      tamanhoTexto: text.length,
      contemTexto: text.length > 50
    }
  };
}

/**
 * Processa PDF com timeout
 * @param {ArrayBuffer} pdfBuffer - Buffer do PDF
 * @param {string} filename - Nome do arquivo
 * @param {number} timeout - Timeout em ms
 * @returns {Promise<Object>} Dados extraídos
 */
async function processPDFWithTimeout(pdfBuffer, filename, timeout) {
  return Promise.race([
    (async () => {
      try {
        // Tentar extrair texto direto
        self.postMessage({ type: 'progress', status: 'Extraindo texto do PDF...', progress: 0.3 });
        const text = await extractTextFromPDF(pdfBuffer);

        // Se texto muito pequeno, tentar OCR
        if (text.length < 50) {
          self.postMessage({ type: 'progress', status: 'Aplicando OCR...', progress: 0.5 });
          const ocrText = await extractTextFromImagePDF(pdfBuffer);
          return normalizeExtractedData(ocrText, filename);
        }

        return normalizeExtractedData(text, filename);
      } catch (error) {
        // Fallback para OCR em caso de erro
        self.postMessage({ type: 'progress', status: 'Tentando OCR...', progress: 0.6 });
        const ocrText = await extractTextFromImagePDF(pdfBuffer);
        return normalizeExtractedData(ocrText, filename);
      }
    })(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('⏱️ Timeout: O processamento do PDF excedeu o tempo limite')), timeout)
    )
  ]);
}

/**
 * Message handler
 */
self.onmessage = async (event) => {
  const { id, type, payload } = event.data;

  try {
    if (type === 'PARSE_PDF') {
      const { pdfBuffer, filename, timeout = DEFAULT_TIMEOUT } = payload;

      self.postMessage({
        type: 'progress',
        status: 'Iniciando processamento...',
        progress: 0.1
      });

      const result = await processPDFWithTimeout(pdfBuffer, filename, timeout);

      self.postMessage({
        type: 'progress',
        status: 'Concluído!',
        progress: 1.0
      });

      self.postMessage({
        id,
        type: 'SUCCESS',
        payload: result
      });
    } else {
      throw new Error(`Tipo de operação desconhecido: ${type}`);
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'ERROR',
      payload: {
        message: error.message,
        stack: error.stack
      }
    });
  }
};

console.log('[PDFWorker] Worker inicializado e aguardando tarefas');
