/* platform-core.js
 * Core de plataforma moderna para SINGEM
 * - Error Boundary global
 * - Performance monitoring
 * - Health checks
 * - Auto-recovery
 */
(function (global) {
  'use strict';

  const PlatformCore = {
    version: '2.0.0',
    errors: [],
    metrics: {
      pageLoadTime: 0,
      dbInitTime: 0,
      apiCalls: [],
      parsingTimes: []
    },
    health: {
      db: false,
      fs: false,
      parser: false
    }
  };

  // ========== ERROR BOUNDARY ==========
  class ErrorBoundary {
    constructor() {
      this.errors = [];
      this.setupGlobalHandlers();
    }

    setupGlobalHandlers() {
      // Erros não capturados
      window.addEventListener('error', (event) => {
        this.captureError({
          type: 'uncaught',
          message: event.message,
          filename: event.filename,
          line: event.lineno,
          column: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString()
        });

        // Não previne o comportamento padrão, apenas registra
        return false;
      });

      // Promise rejections não tratadas
      window.addEventListener('unhandledrejection', (event) => {
        this.captureError({
          type: 'unhandled-promise',
          message: event.reason?.message || String(event.reason),
          stack: event.reason?.stack,
          timestamp: new Date().toISOString()
        });
      });

      console.log('[ErrorBoundary] Handlers globais configurados');
    }

    captureError(error) {
      this.errors.push(error);
      PlatformCore.errors.push(error);

      // Log estruturado
      console.error('[ErrorBoundary]', error);

      // Tenta armazenar no IndexedDB para análise posterior
      this.persistError(error).catch(() => {});

      // Se muitos erros em sequência, mostra alerta
      if (this.errors.length > 10) {
        this.showCriticalErrorUI();
      }
    }

    async persistError(error) {
      try {
        if (!global.db?.errors) {
          return;
        }

        const tx = global.db.transaction(['errors'], 'readwrite');
        const store = tx.objectStore('errors');
        await store.add({
          ...error,
          id: Date.now() + Math.random(),
          userAgent: navigator.userAgent
        });
      } catch (e) {
        console.warn('[ErrorBoundary] Falha ao persistir erro:', e);
      }
    }

    showCriticalErrorUI() {
      if (document.getElementById('criticalErrorOverlay')) {
        return;
      }

      const overlay = document.createElement('div');
      overlay.id = 'criticalErrorOverlay';
      overlay.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.95); z-index: 99999; display: flex;
        align-items: center; justify-content: center; color: white;
        font-family: system-ui, -apple-system, sans-serif;
      `;

      overlay.innerHTML = `
        <div style="text-align: center; max-width: 500px; padding: 40px;">
          <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
          <h2 style="margin: 0 0 15px 0;">Múltiplos Erros Detectados</h2>
          <p style="color: #ccc; margin-bottom: 25px;">
            O sistema encontrou vários erros consecutivos. Recomendamos recarregar a página.
          </p>
          <button onclick="location.reload()" style="
            padding: 12px 30px; font-size: 16px; background: #4CAF50;
            color: white; border: none; border-radius: 6px; cursor: pointer;
            font-weight: 600;
          ">🔄 Recarregar Página</button>
          <button onclick="this.parentElement.parentElement.remove()" style="
            padding: 12px 30px; font-size: 16px; background: transparent;
            color: white; border: 1px solid white; border-radius: 6px;
            cursor: pointer; margin-left: 10px;
          ">Continuar Mesmo Assim</button>
        </div>
      `;

      document.body.appendChild(overlay);
    }

    getErrors() {
      return this.errors;
    }
    clearErrors() {
      this.errors = [];
    }
  }

  // ========== PERFORMANCE MONITOR ==========
  class PerformanceMonitor {
    constructor() {
      this.marks = new Map();
      this.measures = [];
      this.observers = [];
      this.setupObservers();
    }

    setupObservers() {
      if (!window.PerformanceObserver) {
        return;
      }

      // Long Tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              // > 50ms é considerado longo
              console.warn('[Performance] Long Task detectada:', entry.duration.toFixed(2) + 'ms');
              this.measures.push({
                type: 'long-task',
                duration: entry.duration,
                timestamp: Date.now()
              });
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (e) {
        // longtask pode não estar disponível em alguns browsers
      }

      // Navigation timing
      try {
        const navObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            PlatformCore.metrics.pageLoadTime = entry.loadEventEnd - entry.fetchStart;
            console.log('[Performance] Page load:', PlatformCore.metrics.pageLoadTime.toFixed(2) + 'ms');
          }
        });
        navObserver.observe({ entryTypes: ['navigation'] });
        this.observers.push(navObserver);
      } catch (e) {
        // Ignore PerformanceObserver errors in older browsers
      }
    }

    mark(name) {
      this.marks.set(name, performance.now());
    }

    measure(name, startMark) {
      const start = this.marks.get(startMark);
      if (start === undefined) {
        console.warn('[Performance] Mark não encontrada:', startMark);
        return undefined;
      }

      const duration = performance.now() - start;
      this.measures.push({ name, duration, timestamp: Date.now() });

      console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
      return duration;
    }

    getMeasures() {
      return this.measures;
    }

    getAverageParsingTime() {
      const parsingMeasures = this.measures.filter((m) => m.name.includes('parsing'));
      if (!parsingMeasures.length) {
        return 0;
      }

      const sum = parsingMeasures.reduce((acc, m) => acc + m.duration, 0);
      return sum / parsingMeasures.length;
    }
  }

  // ========== HEALTH MONITOR ==========
  class HealthMonitor {
    constructor() {
      this.checks = new Map();
      this.lastCheck = null;
    }

    async runCheck(name, checkFn) {
      try {
        const start = performance.now();
        const result = await checkFn();
        const duration = performance.now() - start;

        this.checks.set(name, {
          status: result ? 'healthy' : 'degraded',
          lastCheck: new Date().toISOString(),
          duration
        });

        PlatformCore.health[name] = result;
        return result;
      } catch (error) {
        this.checks.set(name, {
          status: 'failed',
          lastCheck: new Date().toISOString(),
          error: error.message
        });

        PlatformCore.health[name] = false;
        return false;
      }
    }

    async runAllChecks() {
      const checks = [
        { name: 'db', fn: this.checkDatabase },
        { name: 'fs', fn: this.checkFileSystem },
        { name: 'parser', fn: this.checkParser }
      ];

      const results = await Promise.all(checks.map((c) => this.runCheck(c.name, c.fn.bind(this))));

      this.lastCheck = new Date().toISOString();

      const allHealthy = results.every((r) => r);
      console.log('[Health]', allHealthy ? '✅ Todos os sistemas OK' : '⚠️ Alguns sistemas degradados');

      return { healthy: allHealthy, checks: Object.fromEntries(this.checks) };
    }

    async checkDatabase() {
      try {
        if (!global.db) {
          return false;
        }

        // Tenta ler uma store
        const tx = global.db.transaction(['empenhos'], 'readonly');
        const store = tx.objectStore('empenhos');
        await store.count();

        return true;
      } catch (e) {
        console.error('[Health] DB check failed:', e);
        return false;
      }
    }

    async checkFileSystem() {
      try {
        if (!global.fsManager) {
          return false;
        }
        return global.fsManager.isFileSystemAPISupported?.() || false;
      } catch (e) {
        return false;
      }
    }

    async checkParser() {
      try {
        return typeof global.parsePdfRefined === 'function';
      } catch (e) {
        return false;
      }
    }

    getStatus() {
      return {
        lastCheck: this.lastCheck,
        checks: Object.fromEntries(this.checks),
        health: PlatformCore.health
      };
    }
  }

  // ========== INICIALIZAÇÃO ==========
  function init() {
    console.log(`[PlatformCore] Inicializando v${PlatformCore.version}...`);

    PlatformCore.errorBoundary = new ErrorBoundary();
    PlatformCore.performance = new PerformanceMonitor();
    PlatformCore.health = new HealthMonitor();

    // Performance mark inicial
    PlatformCore.performance.mark('platform-init');

    // Health check inicial após 2s (dá tempo do DB inicializar)
    setTimeout(() => {
      PlatformCore.health.runAllChecks().then((status) => {
        console.log('[PlatformCore] Health check:', status);
      });
    }, 2000);

    // Health check periódico (5min)
    setInterval(
      () => {
        PlatformCore.health.runAllChecks();
      },
      5 * 60 * 1000
    );

    console.log('[PlatformCore] ✅ Inicializado com sucesso');
  }

  // ========== API PÚBLICA ==========
  global.PlatformCore = PlatformCore;
  global.PlatformCore.init = init;

  // Helpers de conveniência
  global.captureError = (error) => {
    PlatformCore.errorBoundary?.captureError({
      type: 'manual',
      message: error.message || String(error),
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  };

  global.measurePerformance = (name, fn) => {
    const markName = `perf-${name}-${Date.now()}`;
    PlatformCore.performance?.mark(markName);

    const result = fn();

    if (result instanceof Promise) {
      return result.finally(() => {
        PlatformCore.performance?.measure(name, markName);
      });
    }

    PlatformCore.performance?.measure(name, markName);
    return result;
  };

  // Auto-init quando DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
