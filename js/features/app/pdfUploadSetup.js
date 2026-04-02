export function setupFileUploads(app) {
  app.setupPDFUpload('uploadEmpenho', 'fileEmpenho', (file, textContent, extractedData) => {
    app.processarEmpenhoUpload(file, textContent, extractedData);
  });

  app.setupPDFUpload('uploadNotaFiscal', 'fileNotaFiscal', (file, textContent, extractedData) => {
    app.processarNotaFiscalUpload(file, textContent, extractedData);
  });

  app.setupNotaFiscalOptions();
}

export function setupPDFUpload(app, uploadBoxId, fileInputId, callback) {
  const uploadBox = document.getElementById(uploadBoxId);
  const fileInput = document.getElementById(fileInputId);

  if (!uploadBox || !fileInput) {
    return;
  }

  uploadBox.addEventListener('click', () => {
    fileInput.click();
  });

  uploadBox.addEventListener('dragover', (event) => {
    event.preventDefault();
    uploadBox.classList.add('dragover');
  });

  uploadBox.addEventListener('dragleave', () => {
    uploadBox.classList.remove('dragover');
  });

  uploadBox.addEventListener('drop', (event) => {
    event.preventDefault();
    uploadBox.classList.remove('dragover');

    const files = event.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      app.processarPDF(files[0], callback);
      return;
    }

    app.showError('Por favor, selecione um arquivo PDF válido');
  });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      app.processarPDF(file, callback);
      return;
    }

    app.showError('Por favor, selecione um arquivo PDF válido');
  });
}
