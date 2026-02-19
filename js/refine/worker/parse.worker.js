/* parse.worker.js
 * Worker que importa os módulos locais e executa parsePdfRefined em background.
 * Recebe: {cmd:'parse', id, arrayBuffer}
 * Responde: {cmd:'result', id, result} ou {cmd:'error', id, message}
 */
try {
  importScripts(
    '../patterns.js',
    '../logger.js',
    '../normalize.js',
    '../validate.js',
    '../analyzer.js',
    '../detectors.js',
    '../extract/header.js',
    '../extract/items.js',
    '../extract/totals.js',
    '../score.js',
    '../ocrFallback.js',
    '../index.js'
  );
} catch (e) {
  // importScripts pode falhar em alguns hosts; ainda ouvimos mensagens e retornamos erro
}

self.onmessage = async function (ev) {
  const msg = ev.data;
  if (!msg || !msg.cmd) {
    return;
  }
  if (msg.cmd === 'parse') {
    const id = msg.id;
    try {
      const res = await self.parsePdfRefined(msg.arrayBuffer, msg.options || {});
      self.postMessage({ cmd: 'result', id, result: res });
    } catch (err) {
      self.postMessage({ cmd: 'error', id, message: err && err.message });
    }
  }
};
