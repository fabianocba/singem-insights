function getDbManager() {
  return window?.dbManager ?? null;
}

function requireDbManager() {
  const dbManager = getDbManager();
  if (!dbManager) {
    throw new Error('Banco de dados não está pronto');
  }
  return dbManager;
}

export function hasDbManager() {
  return Boolean(getDbManager());
}

export function getManagerType() {
  return typeof getDbManager();
}

export function getDbName() {
  return getDbManager()?.db?.name ?? null;
}

export function getDbVersion() {
  return getDbManager()?.db?.version ?? null;
}

export function hasMethod(methodName) {
  return typeof getDbManager()?.[methodName] === 'function';
}

export async function invokeIfAvailable(methodName, ...args) {
  const dbManager = getDbManager();
  if (typeof dbManager?.[methodName] !== 'function') {
    return null;
  }
  return dbManager[methodName](...args);
}

export async function buscarEmpenhos(includeAll = false) {
  return requireDbManager().buscarEmpenhos(includeAll);
}

export async function buscarEmpenhoPorId(empenhoId) {
  return requireDbManager().buscarEmpenhoPorId(empenhoId);
}

export async function buscarEmpenhosPorCNPJ(cnpj) {
  return requireDbManager().buscarEmpenhosPorCNPJ(cnpj);
}

export async function compararNotaFiscalComEmpenho(notaFiscal, empenhoId) {
  return requireDbManager().compararNotaFiscalComEmpenho(notaFiscal, empenhoId);
}

export async function buscarFornecedores() {
  return requireDbManager().buscarFornecedores();
}

export async function salvarEmpenho(empenho) {
  return requireDbManager().salvarEmpenho(empenho);
}

export async function criarSaldosEmpenho(empenhoId, empenho) {
  return requireDbManager().criarSaldosEmpenho(empenhoId, empenho);
}

export async function salvarArquivo(arquivoInfo) {
  return requireDbManager().salvarArquivo(arquivoInfo);
}

export async function salvarEntrega(entrega) {
  return requireDbManager().salvarEntrega(entrega);
}

export async function atualizarSaldosComNotaFiscal(empenhoId, numeroNotaFiscal, itens, dataNotaFiscal) {
  return requireDbManager().atualizarSaldosComNotaFiscal(empenhoId, numeroNotaFiscal, itens, dataNotaFiscal);
}

export async function buscarNotasFiscaisPorEmpenho(empenhoId) {
  return requireDbManager().buscarNotasFiscaisPorEmpenho(empenhoId);
}

export async function buscarSaldoEmpenho(empenhoId) {
  return requireDbManager().buscarSaldoEmpenho(empenhoId);
}

export async function getUnidadeOrcamentaria() {
  return requireDbManager().getUnidadeOrcamentaria();
}

export async function getRecord(storeName, recordId) {
  return requireDbManager().get(storeName, recordId);
}

export async function getAll(storeName) {
  return requireDbManager().getAll(storeName);
}

export async function getByIndex(storeName, indexName, indexValue) {
  return requireDbManager().getByIndex(storeName, indexName, indexValue);
}

export async function deleteRecord(storeName, recordId) {
  return requireDbManager().delete(storeName, recordId);
}
