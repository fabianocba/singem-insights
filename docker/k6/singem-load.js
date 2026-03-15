// ============================================================
// SINGEM — k6 Load Test Scenarios
// Testa endpoints criticos do backend sob carga
//
// Uso standalone:
//   k6 run docker/k6/singem-load.js --env BASE_URL=http://localhost:3000
//
// Via docker compose:
//   docker compose -f docker-compose.yml -f docker-compose.loadtest.yml up --abort-on-container-exit
// ============================================================

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Metricas customizadas
const errorRate = new Rate('singem_errors');
const healthDuration = new Trend('singem_health_duration', true);
const apiInfoDuration = new Trend('singem_api_info_duration', true);

const BASE_URL = __ENV.BASE_URL || 'http://backend:3000';

// ---- Cenarios de carga ------------------------------------
export const options = {
  scenarios: {
    // Smoke test: carga minima para validar que funciona
    smoke: {
      executor: 'constant-vus',
      vus: 2,
      duration: '30s',
      startTime: '0s',
      tags: { scenario: 'smoke' }
    },
    // Load test: carga media sustentada
    load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 20 }, // ramp up
        { duration: '3m', target: 20 }, // sustain
        { duration: '1m', target: 0 } // ramp down
      ],
      startTime: '30s',
      tags: { scenario: 'load' }
    },
    // Stress test: picos de carga
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 }
      ],
      startTime: '5m30s',
      tags: { scenario: 'stress' }
    }
  },
  thresholds: {
    // SLOs
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed: ['rate<0.05'], // < 5% erro
    singem_errors: ['rate<0.1'], // < 10% erros customizados
    singem_health_duration: ['p(95)<200'], // health < 200ms p95
    singem_api_info_duration: ['p(95)<300'] // info < 300ms p95
  }
};

// ---- Funcao principal ------------------------------------
export default function () {
  group('Health Check', () => {
    const res = http.get(`${BASE_URL}/health`);
    healthDuration.add(res.timings.duration);

    const ok = check(res, {
      'health status 200': (r) => r.status === 200,
      'health body has status': (r) => {
        try {
          return JSON.parse(r.body).status !== undefined;
        } catch {
          return false;
        }
      },
      'health response < 500ms': (r) => r.timings.duration < 500
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('API Info', () => {
    const res = http.get(`${BASE_URL}/api/info`);
    apiInfoDuration.add(res.timings.duration);

    const ok = check(res, {
      'info status 200': (r) => r.status === 200,
      'info has nome': (r) => {
        try {
          return JSON.parse(r.body).nome !== undefined;
        } catch {
          return false;
        }
      }
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('API Version', () => {
    const res = http.get(`${BASE_URL}/api/version`);

    const ok = check(res, {
      'version status 200': (r) => r.status === 200,
      'version has ok': (r) => {
        try {
          return JSON.parse(r.body).ok === true;
        } catch {
          return false;
        }
      }
    });
    errorRate.add(!ok);
  });

  sleep(0.5);

  group('Metrics Endpoint', () => {
    const res = http.get(`${BASE_URL}/metrics`);

    const ok = check(res, {
      'metrics status 200': (r) => r.status === 200,
      'metrics has singem_up': (r) => r.body && r.body.includes('singem_up')
    });
    errorRate.add(!ok);
  });

  sleep(1);

  group('Static Assets', () => {
    const res = http.get(`${BASE_URL}/`);

    const ok = check(res, {
      'index status 200': (r) => r.status === 200
    });
    errorRate.add(!ok);
  });

  sleep(0.5);
}

// ---- Resumo pos-execucao ---------------------------------
export function handleSummary(data) {
  const passed = Object.values(data.metrics).every(
    (m) => !m.thresholds || Object.values(m.thresholds).every((t) => t.ok)
  );

  console.log(passed ? '\n✅ Todos os thresholds passaram!' : '\n❌ Alguns thresholds falharam!');

  return {
    stdout: textSummary(data, { indent: '  ', enableColors: true })
  };
}

import { textSummary } from 'https://jslib.k6.io/k6-summary/0.1.0/index.js';
