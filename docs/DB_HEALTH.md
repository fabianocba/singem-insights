# ðŸ¥ DB Health - Checklist de SaÃºde do IndexedDB

> **Guia de manutenÃ§Ã£o, diagnÃ³stico e boas prÃ¡ticas para IndexedDB no SINGEM**

## ðŸ“‹ InformaÃ§Ãµes do Banco

### ConfiguraÃ§Ã£o Atual

- **Nome do Banco**: `singemDB`
- **VersÃ£o Atual**: 1 (verificar em `db.js`)
- **Stores**:
  - `unidades` - Unidades Gestoras
  - `fornecedores` - Fornecedores
  - `grupos` - Grupos de Material/ServiÃ§o
  - `itens` - Itens de Material/ServiÃ§o
  - `empenhos` - Empenhos
  - Outras (verificar cÃ³digo)

## âœ… Checklist de SaÃºde

### 1. **Estrutura do Banco**

- [ ] Banco abre sem erros
- [ ] VersÃ£o correta no `db.js`
- [ ] Todas as stores existem
- [ ] Indexes criados corretamente
- [ ] KeyPath configurado em cada store

### 2. **OperaÃ§Ãµes BÃ¡sicas**

- [ ] InserÃ§Ã£o funciona (`add`/`put`)
- [ ] Leitura funciona (`get`/`getAll`)
- [ ] AtualizaÃ§Ã£o funciona (`put`)
- [ ] RemoÃ§Ã£o funciona (`delete`)
- [ ] TransaÃ§Ãµes completam sem erros

### 3. **Performance**

- [ ] OperaÃ§Ãµes em lote usam transaÃ§Ãµes
- [ ] Indexes usados em queries frequentes
- [ ] NÃ£o hÃ¡ queries full-scan desnecessÃ¡rias
- [ ] Batch operations para inserÃ§Ãµes mÃºltiplas

### 4. **Integridade de Dados**

- [ ] IDs Ãºnicos (sem duplicatas)
- [ ] Campos obrigatÃ³rios preenchidos
- [ ] Formato de dados consistente
- [ ] Sem dados Ã³rfÃ£os (referÃªncias quebradas)

### 5. **Tratamento de Erros**

- [ ] `onerror` handlers em todas as requests
- [ ] `onblocked` handler no `open()`
- [ ] `onabort` handler em transaÃ§Ãµes
- [ ] Retry logic para operaÃ§Ãµes crÃ­ticas

### 6. **Cache e VersÃ£o**

- [ ] Service Worker atualiza quando versÃ£o muda
- [ ] `versionManager.js` detecta mudanÃ§as
- [ ] Cache limpo ao atualizar versÃ£o
- [ ] UsuÃ¡rios notificados de updates

## ðŸ” DiagnÃ³stico de Problemas

### Problema: "Banco nÃ£o abre"

**PossÃ­veis causas:**

1. VersÃ£o incorreta (versÃ£o anterior maior que nova)
2. Upgrade mal feito (erro em `onupgradeneeded`)
3. Banco bloqueado em outra aba

**SoluÃ§Ãµes:**

```javascript
// 1. Verificar versÃ£o
console.log('VersÃ£o atual:', db.version);

// 2. ForÃ§ar recriaÃ§Ã£o (CUIDADO: perde dados)
indexedDB.deleteDatabase('singemDB');

// 3. Fechar outras abas e tentar novamente
```

### Problema: "TransactionInactiveError"

**Causa:** Tentar usar transaÃ§Ã£o apÃ³s completar ou abortar

**SoluÃ§Ã£o:**

```javascript
// âŒ ERRADO - transaction jÃ¡ completou
const tx = db.transaction(['unidades'], 'readwrite');
const store = tx.objectStore('unidades');
const request = store.add(data);

request.onsuccess = () => {
  // Aqui tx jÃ¡ completou!
  const request2 = store.add(data2); // ERRO!
};

// âœ… CORRETO - mesma transaÃ§Ã£o
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

**SoluÃ§Ãµes:**

```javascript
// 1. Limpar dados antigos
await clearStore(db, 'logs_antigos');

// 2. Verificar uso de armazenamento
if (navigator.storage && navigator.storage.estimate) {
  const estimate = await navigator.storage.estimate();
  console.log(`Usado: ${estimate.usage} / ${estimate.quota}`);
}

// 3. Solicitar mais espaÃ§o (se necessÃ¡rio)
if (navigator.storage && navigator.storage.persist) {
  const persistent = await navigator.storage.persist();
  console.log('PersistÃªncia:', persistent);
}
```

### Problema: "Dados nÃ£o aparecem apÃ³s salvar"

**PossÃ­veis causas:**

1. TransaÃ§Ã£o abortada (erro silencioso)
2. Cache do navegador com versÃ£o antiga
3. Lendo de store errada

**SoluÃ§Ãµes:**

```javascript
// 1. Verificar se transaÃ§Ã£o completa
tx.oncomplete = () => console.log('âœ… Salvo!');
tx.onerror = () => console.error('âŒ Erro:', tx.error);
tx.onabort = () => console.error('âš ï¸ Abortado');

// 2. Limpar cache
// Ctrl+Shift+Delete ou modo privado

// 3. Verificar store name
console.log('Stores disponÃ­veis:', db.objectStoreNames);
```

## ðŸ› ï¸ Ferramentas de Debug

### 1. **DevTools do Chrome/Edge**

1. Abra DevTools (F12)
2. VÃ¡ em **Application** > **Storage** > **IndexedDB**
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

### 3. **InformaÃ§Ãµes do Banco**

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

## ðŸ“Š MÃ©tricas de Performance

### Benchmarks Esperados

| OperaÃ§Ã£o               | Tempo Esperado | ObservaÃ§Ãµes               |
| ------------------------ | -------------- | --------------------------- |
| `open()`                 | < 100ms        | Primeira vez pode ser maior |
| `get()` (por chave)      | < 10ms         | Acesso direto por ID        |
| `getAll()` (< 100 itens) | < 50ms         | Sem Ã­ndices                |
| `put()` (1 item)         | < 20ms         | TransaÃ§Ã£o simples         |
| `batchPut()` (100 itens) | < 200ms        | Com transaÃ§Ãµes em lote    |
| `count()`                | < 30ms         | OperaÃ§Ã£o otimizada        |

### Como Medir

```javascript
console.time('operacao');
await minhaOperacao();
console.timeEnd('operacao');
```

## ðŸ”„ Migrations (MudanÃ§as de Schema)

### Como Atualizar VersÃ£o

```javascript
// db.js
const DB_VERSION = 2; // Incrementar versÃ£o

const request = indexedDB.open('singemDB', DB_VERSION);

request.onupgradeneeded = (event) => {
  const db = event.target.result;
  const oldVersion = event.oldVersion;

  // MigraÃ§Ã£o v1 â†’ v2
  if (oldVersion < 2) {
    if (!db.objectStoreNames.contains('novos_dados')) {
      db.createObjectStore('novos_dados', { keyPath: 'id' });
    }
  }
};
```

### Boas PrÃ¡ticas para Migrations

1. **Sempre incremente a versÃ£o** quando mudar schema
2. **Teste com dados reais** antes de deploy
3. **Mantenha backward compatibility** quando possÃ­vel
4. **Documente mudanÃ§as** em CHANGELOG.md
5. **Notifique usuÃ¡rios** sobre atualizaÃ§Ãµes importantes

## ðŸ§ª Testes de Integridade

### Script de ValidaÃ§Ã£o

```javascript
// Executar no console do navegador
async function validarIntegridade() {
  const db = await openDB();

  // 1. Verificar stores
  const storesEsperadas = ['unidades', 'fornecedores', 'grupos', 'itens'];
  for (const storeName of storesEsperadas) {
    if (!db.objectStoreNames.contains(storeName)) {
      console.error(`âŒ Store ${storeName} nÃ£o existe!`);
    } else {
      console.log(`âœ… Store ${storeName} OK`);
    }
  }

  // 2. Verificar se hÃ¡ dados
  for (const storeName of storesEsperadas) {
    const count = await countItems(db, storeName);
    console.log(`ðŸ“Š ${storeName}: ${count} itens`);
  }

  // 3. Testar operaÃ§Ãµes CRUD
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
    console.log('âœ… CREATE funciona');

    // Read
    const read = await withTx(db, ['unidades'], 'readonly', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('unidades').get(testUnidade.id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    });
    console.log('âœ… READ funciona');

    // Update
    testUnidade.nome = 'TESTE ATUALIZADO';
    await withTx(db, ['unidades'], 'readwrite', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('unidades').put(testUnidade);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    console.log('âœ… UPDATE funciona');

    // Delete
    await withTx(db, ['unidades'], 'readwrite', (tx) => {
      return new Promise((resolve, reject) => {
        const request = tx.objectStore('unidades').delete(testUnidade.id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
    console.log('âœ… DELETE funciona');

    console.log('ðŸŽ‰ Todos os testes passaram!');
  } catch (error) {
    console.error('âŒ Erro nos testes:', error);
  }
}

validarIntegridade();
```

## ðŸ“š Recursos Adicionais

- [MDN - IndexedDB](https://developer.mozilla.org/pt-BR/docs/Web/API/IndexedDB_API)
- [IndexedDB Best Practices](https://developers.google.com/web/fundamentals/instant-and-offline/web-storage/indexeddb-best-practices)
- [Working with quota](https://web.dev/storage-for-the-web/)

## ðŸš¨ Quando Resetar o Banco

**âš ï¸ ATENÃ‡ÃƒO: Isso apaga TODOS os dados!**

```javascript
// Fechar banco primeiro
if (db) {
  db.close();
}

// Deletar banco
indexedDB.deleteDatabase('singemDB');

// Recarregar pÃ¡gina
location.reload();
```

**SÃ³ faÃ§a isso se:**

- EstÃ¡ em ambiente de desenvolvimento
- Tem backup dos dados
- Schema estÃ¡ irremediavelmente corrompido
- Tem certeza que nÃ£o hÃ¡ outra soluÃ§Ã£o

---

**Ãšltima atualizaÃ§Ã£o:** 05/11/2024  
**ResponsÃ¡vel:** SINGEM Team
