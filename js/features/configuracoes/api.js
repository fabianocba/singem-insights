export async function carregarConfiguracoes() {
  return window.dbManager?.get?.('config', 'preferencias') || null;
}

export async function salvarConfiguracoes(config) {
  return window.dbManager?.update?.('config', { id: 'preferencias', ...config });
}
