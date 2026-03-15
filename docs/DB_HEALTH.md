# 🏥 DB Health - Checklist de Saúde do IndexedDB

> **Guia de manutenção, diagnóstico e boas práticas para IndexedDB no SINGEM**

## 📋 Informações do Banco

### Configuração Atual

- **Nome do Banco**: `singemDB`
- **Versão Atual**: 1 (verificar em `db.js`)
- **Stores**:
  - `unidades` - Unidades Gestoras
  - `fornecedores` - Fornecedores
  - `grupos` - Grupos de Material/Serviço
  - `itens` - Itens de Material/Serviço
  - `empenhos` - Empenhos
  - Outras (verificar código)

## ✅ Checklist de Saúde

### 1. **Estrutura do Banco**

- [ ] Banco abre sem erros
- [ ] Versão correta no `db.js`
- [ ] Todas as stores existem
- [ ] Indexes criados corretamente
- [ ] KeyPath configurado em cada store

### 2. **Operações Básicas**

- [ ] Inserção funciona (`add`/`put`)
- [ ] Leitura funciona (`get`/`getAll`)
- [ ] Atualização funciona (`put`)
- [ ] Remoção funciona (`delete`)
- [ ] Transações completam sem erros

### 3. **Performance**

- [ ] Operações em lote usam transações
- [ ] Indexes usados em queries frequentes
- [ ] Não há queries full-scan desnecessárias
- [ ] Batch operations para inserções múltiplas

### 4. **Integridade de Dados**

- [ ] IDs únicos (sem duplicatas)
- [ ] Campos obrigatórios preenchidos
- [ ] Formato de dados consistente
- [ ] Sem dados órfãos (referências quebradas)

### 5. **Tratamento de Erros**

- [ ] `onerror` handlers em todas as requests
- [ ] `onblocked` handler no `open()`
- [ ] `onabort` handler em transações
- [ ] Retry logic para operações críticas

### 6. **Cache e Versão**

- [ ] Service Worker atualiza quando versão muda
- [ ] `versionManager.js` detecta mudanças
- [ ] Cache limpo ao atualizar versão
- [ ] Usuários notificados de updates

## 🔍 Diagnóstico de Problemas

### Problema: "Banco não abre"

**Possíveis causas:**

1. Versão incorreta (versão anterior maior que nova)
2. Upgrade mal feito (erro em `onupgradeneeded`)
3. Banco bloqueado em outra aba

**Soluções:**

```javascript
// 1. Verificar versão
console.log('Versão atual:', db.version);

// 2. Forçar recriação (CUIDADO: perde dados)
indexedDB.deleteDatabase('singemDB');

// 3. Fechar outras abas e tentar novamente
```

### Problema: "TransactionInactiveError"

**Causa:** Tentar usar transação após completar ou abortar

**Solução:**

```javascript
// ❌ ERRADO - transaction já completou
const tx = db.transaction(['unidades'], 'readwrite');
const store = tx.objectStore('unidades');
const request = store.add(data);

request.onsuccess = () => {
  // Aqui tx já completou!
  const request2 = store.add(data2); // ERRO!
};

// ✅ CORRETO - mesma transação
const tx = db.transaction(['unidades'], 'readwrite');
const store = tx.objectStore('unidades');

const request1 = store.add(data1);
const request2 = store.add(data2);

tx.oncomplete = () => {
  console.log('Ambos salvos!');
};
```

### Problema: "QuotaExceededError"

**Causa:** Limite de armazenamento excedido

**Soluções:**

```javascript
// 1. Limpar dados antigos
await clearStore(db, 'logs_antigos');

// 2. Verificar uso de armazenamento
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  console.log(`Usado: ${estimate.usage} / ${estimate.quota}`);
}

// 3. Solicitar mais espaço (se necessário)
if (navigator.storage && navigator.storage.persist) {
  const persistent = await navigator.storage.persist();
  console.log('Persistência:', persistent);
}
```

### Problema: "Dados não aparecem após salvar"

**Possíveis causas:**

1. Transação abortada (erro silencioso)
2. Cache do navegador com versão antiga
3. Lendo de store errada

**Soluções:**

```javascript
// 1. Verificar se transação completa
tx.oncomplete = () => console.log('✅ Salvo!');
tx.onerror = () => console.error('❌ Erro:', tx.error);
tx.onabort = () => console.error('⚠️ Abortado');

// 2. Limpar cache
// Ctrl+Shift+Delete ou modo privado

// 3. Verificar store name
console.log('Stores disponíveis:', db.objectStoreNames);
```

## 🛠️ Ferramentas de Debug

### 1. **DevTools do Chrome/Edge**

1. Abra DevTools (F12)
2. Vá em **Application** > **Storage** > **IndexedDB**
3. Expanda `singemDB`
4. Inspecione stores, dados, indexes

### 2. **Exportar Dados**

```javascript
import { exportStore } from './js/db/indexeddb-utils.js';

// Exportar todas as unidades
const db = await openDB();
const unidades = await exportStore(db, 'unidades');
console.log(JSON.stringify(unidades, null, 2));
```

### 3. **Informações do Banco**

```javascript
import { getDatabaseInfo } from './js/db/indexeddb-utils.js';

const db = await openDB();
const info = await getDatabaseInfo(db);
console.table(info.stores);
console.log('Total de itens:', info.totalItems);
```

### 4. **Contar Itens**

```javascript
import { countItems } from './js/db/indexeddb-utils.js';

const db = await openDB();
const total = await countItems(db, 'unidades');
console.log(`Total de unidades: ${total}`);
```

## 📊 Métricas de Performance

### Benchmarks Esperados

| Operação                 | Tempo Esperado | Observações                 |
| ------------------------ | -------------- | --------------------------- |
| `open()`                 | < 100ms        | Primeira vez pode ser maior |
| `get()` (por chave)      | < 10ms         | Acesso direto por ID        |
| `getAll()` (< 100 itens) | < 50ms         | Sem índices                 |
| `put()` (1 item)         | < 20ms         | Transação simples           |
| `batchPut()` (100 itens) | < 200ms        | Com transações em lote      |
| `count()`                | < 30ms         | Operação otimizada          |

### Como Medir

```javascript
console.time('operacao');
await minhaOperacao();
console.timeEnd('operacao');
```

## 🔄 Migrations (Mudanças de Schema)

### Como Atualizar Versão

```javascript
// db.js
const DB_VERSION = 2; // Incrementar versão

const request = indexedDB.open('singemDB', DB_VERSION);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const oldVersion = event.oldVersion;

  // Migração v1 → v2
  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains('novos_dados')) {
      db.createObjectStore('novos_dados', { keyPath: 'id' });
    }
  }
};
```

### Boas Práticas para Migrations

1. **Sempre incremente a versão** quando mudar schema
2. **Teste com dados reais** antes de deploy
3. **Mantenha backward compatibility** quando possível
4. **Documente mudanças** em CHANGELOG.md
5. **Notifique usuários** sobre atualizações importantes

## 🧪 Testes de Integridade

### Script de Validação

```javascript
// Executar no console do navegador
async function validarIntegridade() {
  const db = await openDB();

  // 1. Verificar stores
  const storesEsperadas = ['unidades', 'fornecedores', 'grupos', 'itens'];
  for (const storeName of storesEsperadas) {
    if (!db.objectStoreNames.contains(storeName)) {
      console.error(`❌ Store ${storeName} não existe!`);
    } else {
      console.log(`✅ Store ${storeName} OK`);
    }
  }

  // 2. Verificar se há dados
  for (const storeName of storesEsperadas) {
    const count = await countItems(db, storeName);
    console.log(`📊 ${storeName}: ${count} itens`);
  }

  // 3. Testar operações CRUD
  const testUnidade = {
    id: 'TEST_' + Date.now(),
    codigo: '999999',
    nome: 'TESTE INTEGRIDADE',
    sigla: 'TEST'
  };

  try {
    // Create
    await withTx(db, ['unidades'], 'readwrite', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('unidades').add(testUnidade);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    console.log('✅ CREATE funciona');

    // Read
    const read = await withTx(db, ['unidades'], 'readonly', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('unidades').get(testUnidade.id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    console.log('✅ READ funciona');

    // Update
    testUnidade.nome = 'TESTE ATUALIZADO';
    await withTx(db, ['unidades'], 'readwrite', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('unidades').put(testUnidade);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    console.log('✅ UPDATE funciona');

    // Delete
    await withTx(db, ['unidades'], 'readwrite', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('unidades').delete(testUnidade.id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    console.log('✅ DELETE funciona');

    console.log('🎉 Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  }
}

validarIntegridade();
```

## 📚 Recursos Adicionais

- [MDN - IndexedDB](https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API)
- [IndexedDB Best Practices](https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/indexeddb-best-practices)
- [Working with quota](https://web.dev/storage-for-the-web/)

## 🚨 Quando Resetar o Banco

**⚠️ ATENÇÃO: Isso apaga TODOS os dados!**

```javascript
// Fechar banco primeiro
if (db) {
  db.close();
}

// Deletar banco
indexedDB.deleteDatabase('singemDB');

// Recarregar página
location.reload();
```

**Só faça isso se:**

- Está em ambiente de desenvolvimento
- Tem backup dos dados
- Schema está irremediavelmente corrompido
- Tem certeza que não há outra solução

---

**Última atualização:** 05/11/2024  
**Responsável:** SINGEM Team
