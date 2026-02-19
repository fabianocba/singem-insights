/* ocrFallback.js
 * Fallback para OCR usando Tesseract.js via CDN (se necessário)
 * Retorna texto por página: [{page, text}]
 */
(function (global) {
  async function runTesseractOnCanvas(canvas) {
    if (typeof Tesseract === 'undefined') {
      // tenta carregar do CDN (poderá ser bloqueado pelo CSP)
      await new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://unpkg.com/tesseract.js@2.1.5/dist/tesseract.min.js';
        s.onload = resolve;
        s.onerror = () => reject(new Error('Falha ao carregar Tesseract.js'));
        document.head.appendChild(s);
      });
    }
    const worker = Tesseract.createWorker();
    await worker.load();
    await worker.loadLanguage('por');
    await worker.initialize('por');
    const { data } = await worker.recognize(canvas);
    await worker.terminate();
    return data.text;
  }

  async function pdfImageOcr(pdfPagesCanvases, progressCb, abortSignal) {
    const out = [];
    for (let i = 0; i < pdfPagesCanvases.length; i++) {
      if (abortSignal && abortSignal.aborted) {
        throw new Error('OCR aborted');
      }
      const canvas = pdfPagesCanvases[i];
      const text = await runTesseractOnCanvas(canvas);
      out.push({ page: i + 1, text });
      progressCb && progressCb({ page: i + 1 });
    }
    return out;
  }

  global.refineOcrFallback = { pdfImageOcr };
  // eslint-disable-next-line no-undef
  if (typeof module !== 'undefined') {
    module.exports = global.refineOcrFallback;
  }
})(this);
