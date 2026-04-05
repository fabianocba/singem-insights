#!/usr/bin/env node
/* eslint-env node */
/**
 * SINGEM Backend — Healthcheck Script
 * Executado pelo Docker HEALTHCHECK
 * Alternativa leve a wget/curl para Alpine
 * Timeout: 8s (docker timeout é 10s)
 */

import http from 'node:http';

const PORT = process.env.PORT || 3000;
const TIMEOUT_MS = 8000;

const req = http.get(`http://localhost:${PORT}/health`, { timeout: TIMEOUT_MS }, (res) => {
  if (res.statusCode >= 200 && res.statusCode < 300) {
    process.exit(0);
  }
  process.exit(1);
});

req.on('error', (_err) => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

setTimeout(() => {
  req.destroy();
  process.exit(1);
}, TIMEOUT_MS + 1000);
