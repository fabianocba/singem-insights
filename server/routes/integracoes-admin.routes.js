const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../config/database');
const comprasGov = require('../integrations/comprasgov');
const dadosGov = require('../integrations/dadosgov');
const integrationCache = require('../integrations/core/integrationCache');
const { listAuditCalls, getAuditMetrics24h } = require('../integrations/core/auditApiCalls');
const syncEngine = require('../integrations/sync/engine');

const router = express.Router();

function getStatusCode(error) {
  const statusCode = Number(error?.statusCode || error?.status || 500);
  return statusCode >= 400 && statusCode <= 599 ? statusCode : 500;
}

function sendError(res, req, error) {
  const statusCode = getStatusCode(error);
  return res.status(statusCode).json({
    success: false,
    message: error?.message || 'Erro interno na integração',
    requestId: req.requestId || null,
    externalStatus: Number(error?.statusCode || statusCode)
  });
}

async function execute(res, req, operation) {
  try {
    const data = await operation(req);
    return res.status(200).json({
      success: true,
      message: 'OK',
      requestId: req.requestId || null,
      data
    });
  } catch (error) {
    return sendError(res, req, error);
  }
}

router.get('/auditoria', (req, res) =>
  execute(res, req, async (request) => {
    const items = await listAuditCalls({
      de: request.query.de,
      ate: request.query.ate,
      endpoint: request.query.endpoint,
      status: request.query.status,
      limit: request.query.limit || 100
    });

    return {
      total: items.length,
      items
    };
  })
);

router.post('/sync/run', (req, res) =>
  execute(res, req, (request) => syncEngine.runByType(request.query.tipo || 'all', request.requestId || null))
);

router.get('/sync/status', (req, res) => execute(res, req, () => syncEngine.getStatus()));

router.post('/cache/clear', (req, res) =>
  execute(res, req, () => {
    const result = integrationCache.clear();
    return {
      ...result,
      cacheStats: integrationCache.snapshotStats()
    };
  })
);

router.get('/pesquisa-preco/snapshot/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      const error = new Error('ID de snapshot inválido');
      error.statusCode = 400;
      throw error;
    }

    const result = await db.query('SELECT * FROM price_snapshot WHERE id = $1 LIMIT 1', [id]);
    const row = result.rows[0];

    if (!row) {
      const error = new Error('Snapshot não encontrado');
      error.statusCode = 404;
      throw error;
    }

    const format = String(req.query.format || 'json').toLowerCase();

    const html = `
      <!doctype html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório Oficial de Pesquisa de Preço #${row.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
          h1 { margin: 0 0 8px; }
          .box { border: 1px solid #ccc; padding: 12px; margin-bottom: 10px; border-radius: 6px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
          pre { white-space: pre-wrap; word-break: break-word; background: #f7f7f7; padding: 10px; border-radius: 6px; }
        </style>
      </head>
      <body>
        <h1>Relatório Oficial de Pesquisa de Preço</h1>
        <div class="box">Snapshot ID: <strong>${row.id}</strong></div>
        <div class="box">Data/Hora: <strong>${new Date(row.data_hora_consulta).toLocaleString('pt-BR')}</strong></div>
        <div class="grid box">
          <div><strong>Código Item Catálogo:</strong> ${row.codigo_item_catalogo || '-'}</div>
          <div><strong>Total Resultados:</strong> ${row.total_resultados ?? 0}</div>
          <div><strong>Menor Preço:</strong> ${row.menor_preco ?? '-'}</div>
          <div><strong>Maior Preço:</strong> ${row.maior_preco ?? '-'}</div>
          <div><strong>Média:</strong> ${row.media ?? '-'}</div>
          <div><strong>Mediana:</strong> ${row.mediana ?? '-'}</div>
        </div>
        <div class="box">
          <strong>Filtros Usados</strong>
          <pre>${JSON.stringify(row.filtros_usados || {}, null, 2)}</pre>
        </div>
      </body>
      </html>
    `;

    if (format === 'html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    }

    if (format === 'pdf') {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="snapshot-preco-${row.id}.pdf"`);

      const doc = new PDFDocument({ margin: 40 });
      doc.pipe(res);
      doc.fontSize(16).text('Relatório Oficial de Pesquisa de Preço', { underline: true });
      doc.moveDown(1);
      doc.fontSize(11).text(`Snapshot ID: ${row.id}`);
      doc.text(`Data/Hora: ${new Date(row.data_hora_consulta).toLocaleString('pt-BR')}`);
      doc.text(`Código Item Catálogo: ${row.codigo_item_catalogo || '-'}`);
      doc.text(`Total Resultados: ${row.total_resultados ?? 0}`);
      doc.text(`Menor Preço: ${row.menor_preco ?? '-'}`);
      doc.text(`Maior Preço: ${row.maior_preco ?? '-'}`);
      doc.text(`Média: ${row.media ?? '-'}`);
      doc.text(`Mediana: ${row.mediana ?? '-'}`);
      doc.moveDown(1);
      doc.fontSize(10).text('Filtros Usados:', { underline: true });
      doc.fontSize(9).text(JSON.stringify(row.filtros_usados || {}, null, 2));
      doc.end();
      return res;
    }

    return res.status(200).json({
      success: true,
      message: 'OK',
      requestId: req.requestId || null,
      data: row
    });
  } catch (error) {
    return sendError(res, req, error);
  }
});

router.get('/dashboard', (req, res) =>
  execute(res, req, async (request) => {
    const [comprasHealth, dadosHealth, auditMetrics, syncStatus] = await Promise.all([
      comprasGov.health({ requestId: request.requestId || null, user: request.user || null }),
      dadosGov.health(request),
      getAuditMetrics24h(),
      syncEngine.getStatus()
    ]);

    const logs = await listAuditCalls({ limit: 20 });

    return {
      health: {
        comprasGov: comprasHealth,
        dadosGovCkan: dadosHealth
      },
      logs,
      metrics24h: auditMetrics,
      cache: integrationCache.snapshotStats(),
      sync: {
        running: syncStatus.running,
        currentJobId: syncStatus.currentJobId,
        jobs: syncStatus.jobs
      }
    };
  })
);

module.exports = router;
