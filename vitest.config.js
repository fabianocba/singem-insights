import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Ambiente de execução (jsdom simula browser)
    environment: 'jsdom',

    // Padrão de arquivos de teste
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['js/**/*.js'],
      exclude: ['js/**/*.test.js', 'js/**/*.spec.js', 'js/external/**', 'js/libs/**', 'node_modules/**', 'server/**'],
      // Metas de cobertura
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70
      }
    },

    // Configurações globais
    globals: true,

    // Setup files (executados antes dos testes)
    setupFiles: ['./tests/setup.js'],

    // Timeout padrão
    testTimeout: 10000,

    // Reporter
    reporter: ['verbose', 'html']
  }
});
