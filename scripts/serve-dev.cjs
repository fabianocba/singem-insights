const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function parseArgs(argv) {
  const options = {
    host: '127.0.0.1',
    port: 8000,
    directory: process.cwd()
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1];

    if (arg === '--host' && nextValue) {
      options.host = nextValue;
      index += 1;
      continue;
    }

    if (arg === '--port' && nextValue) {
      const parsedPort = Number.parseInt(nextValue, 10);
      if (Number.isFinite(parsedPort)) {
        options.port = parsedPort;
      }
      index += 1;
      continue;
    }

    if (arg === '--directory' && nextValue) {
      options.directory = path.resolve(nextValue);
      index += 1;
    }
  }

  return options;
}

const MIME_TYPES = Object.freeze({
  '.css': 'text/css; charset=utf-8',
  '.gif': 'image/gif',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8'
});

function setNoCacheHeaders(response) {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.setHeader('Pragma', 'no-cache');
  response.setHeader('Expires', '0');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function writeError(response, statusCode, message) {
  setNoCacheHeaders(response);
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'text/plain; charset=utf-8');
  response.end(message);
}

function resolveFilePath(rootDir, requestPath) {
  const decodedPath = decodeURIComponent(requestPath || '/');
  const sanitizedPath = path.normalize(decodedPath).replace(/^([.][.][/\\])+/, '');
  const rootPath = path.resolve(rootDir);
  const resolvedPath = path.resolve(path.join(rootPath, sanitizedPath));

  if (!resolvedPath.toLowerCase().startsWith(rootPath.toLowerCase())) {
    return null;
  }

  return resolvedPath;
}

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

async function statSafe(targetPath) {
  try {
    return await fs.promises.stat(targetPath);
  } catch {
    return null;
  }
}

async function createRequestHandler(rootDir) {
  const rootPath = path.resolve(rootDir);

  return async (request, response) => {
    if (request.method === 'OPTIONS') {
      setNoCacheHeaders(response);
      response.statusCode = 204;
      response.end();
      return;
    }

    if (!['GET', 'HEAD'].includes(request.method || 'GET')) {
      writeError(response, 405, 'Metodo nao suportado');
      return;
    }

    const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const resolvedTarget = resolveFilePath(rootPath, requestUrl.pathname);

    if (!resolvedTarget) {
      writeError(response, 403, 'Acesso negado');
      return;
    }

    let filePath = resolvedTarget;
    let stats = await statSafe(filePath);

    if (stats?.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      stats = await statSafe(filePath);
    }

    if (!stats || !stats.isFile()) {
      writeError(response, 404, 'Arquivo nao encontrado');
      return;
    }

    setNoCacheHeaders(response);
    response.statusCode = 200;
    response.setHeader('Content-Type', getMimeType(filePath));
    response.setHeader('Content-Length', stats.size);

    if (request.method === 'HEAD') {
      response.end();
      return;
    }

    const stream = fs.createReadStream(filePath);
    stream.on('error', () => {
      if (!response.headersSent) {
        writeError(response, 500, 'Erro ao ler arquivo');
      } else {
        response.destroy();
      }
    });
    stream.pipe(response);
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const handler = await createRequestHandler(options.directory);

  const server = http.createServer((request, response) => {
    handler(request, response).catch((error) => {
      console.error('[serve-dev] erro inesperado:', error);
      writeError(response, 500, 'Erro interno do servidor');
    });
  });

  server.listen(options.port, options.host, () => {
    console.log(`[serve-dev] Servindo ${options.directory}`);
    console.log(`[serve-dev] URL: http://${options.host}:${options.port}`);
    console.log('[serve-dev] Cache-Control: no-store, no-cache, must-revalidate, proxy-revalidate');
  });
}

main().catch((error) => {
  console.error('[serve-dev] falha ao iniciar:', error);
  process.exitCode = 1;
});
