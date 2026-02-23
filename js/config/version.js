(function versionBridge() {
  if (window.__SINGEM_VERSION_BRIDGE__) {
    return;
  }
  window.__SINGEM_VERSION_BRIDGE__ = true;

  import('../core/version.js')
    .then((m) => {
      Object.assign(window, {
        APP_NAME: m.APP_NAME,
        APP_VERSION: m.APP_VERSION,
        APP_BUILD: m.APP_BUILD,
        BUILD_TIMESTAMP: m.BUILD_TIMESTAMP,
        VERSION_DISPLAY: m.VERSION_DISPLAY,
        CACHE_BUSTER: m.CACHE_BUSTER,
        VERSION_INFO: m.VERSION_INFO,
        VERSION: m.VERSION
      });
    })
    .catch(() => {
      const ts = new Date().toISOString();
      const build = `${ts.slice(0, 10).replace(/-/g, '')}-${ts.slice(11, 16).replace(':', '')}`;
      window.APP_NAME = 'SINGEM';
      window.APP_VERSION = '0.0.2';
      window.APP_BUILD = build;
      window.BUILD_TIMESTAMP = ts;
      window.VERSION_DISPLAY = `SINGEM 0.0.2 • build ${build}`;
      window.CACHE_BUSTER = `0.0.2-${build}`;
      window.VERSION_INFO = {
        appName: 'SINGEM',
        version: '0.0.2',
        build,
        buildTimestamp: ts,
        display: window.VERSION_DISPLAY,
        cacheBuster: window.CACHE_BUSTER
      };
      window.VERSION = {
        name: 'SINGEM',
        version: '0.0.2',
        build,
        buildTimestamp: ts
      };
    });
})();
