/* eslint-env node */

/**
 * SINGEM — Integration Test Runner
 * Executa health checks automatizados nos servicos Docker.
 * Usado pelo docker-compose.test.yml via entrypoint.
 */
const http = require('http');

const checks = [
  { name: 'Backend Health', url: 'http://backend-test:3000/health' },
  { name: 'Frontend Index', url: 'http://frontend-test:80/' },
  { name: 'API Proxy', url: 'http://frontend-test:80/api/health' }
];

function checkUrl(name, url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        const ok = res.statusCode >= 200 && res.statusCode < 400;
        console.log('  ' + (ok ? 'PASS' : 'FAIL') + ' ' + name + ': HTTP ' + res.statusCode);
        resolve(ok);
      });
    });
    req.on('error', (err) => {
      console.log('  FAIL ' + name + ': ' + err.message);
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      console.log('  FAIL ' + name + ': timeout');
      resolve(false);
    });
  });
}

async function runMigrationCheck() {
  try {
    const { Client } = require('pg');
    const client = new Client({
      connectionString: process.env.DATABASE_URL
    });
    await client.connect();
    const res = await client.query('SELECT COUNT(*) as total FROM _migrations');
    const count = parseInt(res.rows[0].total, 10);
    const ok = count > 0;
    console.log('  ' + (ok ? 'PASS' : 'FAIL') + ' Migrations: ' + count + ' aplicadas');
    await client.end();
    return ok;
  } catch (err) {
    console.log('  FAIL Migrations: ' + err.message);
    return false;
  }
}

(async () => {
  console.log('');
  console.log('==========================================');
  console.log(' SINGEM - Integration Test Suite');
  console.log('==========================================');
  console.log('');

  const results = [];
  for (const c of checks) {
    results.push(await checkUrl(c.name, c.url));
  }
  results.push(await runMigrationCheck());

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log('');
  console.log('  Resultado: ' + passed + '/' + total + ' checks passaram');
  console.log('');
  process.exit(passed === total ? 0 : 1);
})();
