/* FSRoot wrapper - centraliza fluxo de obtenção da pasta raiz */
(function () {
  const DEBUG_FS = true;

  async function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function waitForFSManager(timeoutMs = 5000) {
    const start = Date.now();
    while (!window.fsManager && Date.now() - start < timeoutMs) {
      await sleep(50);
    }
    return !!window.fsManager;
  }

  async function ensureRootDirOrPrompt() {
    if (DEBUG_FS) {
      console.log('[FSRoot] ensureRootDirOrPrompt()');
    }

    const ready = await waitForFSManager();
    if (!ready) {
      console.warn('[FSRoot] fsManager não disponível');
      return null;
    }

    const fs = window.fsManager;

    // Se já há handle em memória, verificar permissão
    if (fs.mainDirectoryHandle) {
      try {
        const q = await fs.mainDirectoryHandle.queryPermission({ mode: 'readwrite' });
        if (DEBUG_FS) {
          console.log('[FSRoot] queryPermission existing handle:', q);
        }
        if (q === 'granted') {
          return fs.mainDirectoryHandle;
        }
        if (q === 'prompt') {
          // tentar requestPermission UMA vez
          try {
            const r = await fs.mainDirectoryHandle.requestPermission({ mode: 'readwrite' });
            if (DEBUG_FS) {
              console.log('[FSRoot] requestPermission result:', r);
            }
            if (r === 'granted') {
              return fs.mainDirectoryHandle;
            }
          } catch (e) {
            console.warn('[FSRoot] requestPermission falhou:', e);
          }
        }
      } catch (e) {
        console.warn('[FSRoot] erro verificando permissão:', e);
      }
    }

    // Tentar restaurar a referência salva (fsManager irá tentar requestPermission também)
    try {
      const restored = await fs.restoreFolderReference();
      if (restored && fs.mainDirectoryHandle) {
        if (DEBUG_FS) {
          console.log('[FSRoot] pasta restaurada via fsManager');
        }
        return fs.mainDirectoryHandle;
      }
    } catch (e) {
      console.warn('[FSRoot] restoreFolderReference erro:', e);
    }

    // Não tentamos abrir showDirectoryPicker automaticamente (requer gesto do usuário)
    if (DEBUG_FS) {
      console.log('[FSRoot] Nenhuma pasta disponível sem gesto do usuário');
    }
    return null;
  }

  function getRoot() {
    return window.fsManager?.mainDirectoryHandle || null;
  }

  window.FSRoot = { ensureRootDirOrPrompt, getRoot };
})();
