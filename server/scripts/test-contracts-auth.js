#!/usr/bin/env node

/**
 * Authenticated Contract Test Runner
 * Automatically handles:
 * 1. Backend health check (tries localhost:3000 and localhost:3001)
 * 2. Admin login to get JWT token
 * 3. Sets TEST_AUTH_TOKEN environment variable
 * 4. Runs npm run test:contracts
 */

const { spawn } = require('child_process');
const https = require('https');
const http = require('http');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.development') });

const BASE_URL_CANDIDATES = [
  process.env.TEST_BASE_URL || process.env.API_BASE_URL,
  'http://localhost:3000',
  'http://localhost:3001'
].filter(Boolean);

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || 'admin';
const ADMIN_SENHA = process.env.ADMIN_SENHA || 'MudarNaPrimeiraExecucao123!';

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: data ? JSON.parse(data) : null,
            headers: res.headers
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers
          });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function checkHealthEndpoint(baseUrl) {
  try {
    const response = await makeRequest(`${baseUrl}/api/health`, {
      timeout: 3000,
      method: 'GET'
    });
    return response.status === 200 || response.status === 401;
  } catch (error) {
    return false;
  }
}

async function resolveBaseUrl() {
  for (const candidate of BASE_URL_CANDIDATES) {
    if (!candidate) {
      continue;
    }
    try {
      const isHealthy = await checkHealthEndpoint(candidate);
      if (isHealthy) {
        console.log(`✓ Backend available: ${candidate}`);
        return candidate;
      }
    } catch (error) {
      // Try next candidate
    }
  }
  throw new Error(`No backend available. Tried: ${BASE_URL_CANDIDATES.join(', ')}`);
}

async function loginAndGetToken(baseUrl) {
  console.log(`\n📝 Logging in as '${ADMIN_LOGIN}'...`);
  try {
    const response = await makeRequest(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        login: ADMIN_LOGIN,
        senha: ADMIN_SENHA
      }
    });

    if (response.status !== 200 || !response.data?.data?.accessToken) {
      console.error(`✗ Login failed: ${response.status}`);
      console.error('Response:', response.data);
      throw new Error('Login failed');
    }

    const token = response.data.data.accessToken;
    console.log(`✓ Token obtained (${token.length} chars)`);
    return token;
  } catch (error) {
    console.error('✗ Login error:', error.message);
    throw error;
  }
}

async function runTestsWithToken(token) {
  return new Promise((resolve, reject) => {
    console.log(`\n🧪 Running npm run test:contracts with TEST_AUTH_TOKEN...\n`);

    const env = { ...process.env };
    env.TEST_AUTH_TOKEN = token;
    env.TEST_BASE_URL = env.TEST_BASE_URL || 'http://localhost:3000';

    const npm = spawn('npm', ['run', 'test:contracts'], {
      cwd: path.join(__dirname, '..'),
      env,
      stdio: 'inherit'
    });

    npm.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ All tests passed!');
        resolve(0);
      } else {
        console.error(`\n✗ Tests failed with exit code ${code}`);
        reject(new Error(`Test suite exited with code ${code}`));
      }
    });

    npm.on('error', reject);
  });
}

async function main() {
  try {
    console.log('🚀 Authenticated Contract Test Runner\n');

    // 1. Find backend
    console.log('🔍 Looking for backend...');
    const baseUrl = await resolveBaseUrl();

    // 2. Login and get token
    const token = await loginAndGetToken(baseUrl);

    // 3. Run tests
    await runTestsWithToken(token);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

main();
