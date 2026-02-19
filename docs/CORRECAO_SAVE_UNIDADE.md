# 🔧 Correção do Erro "Cannot read properties of undefined (reading 'saveUnidade')"

## 📋 Resumo

Erro identificado e corrigido relacionado à ordem de carregamento de módulos ES6 e verificações de segurança.

## 🐛 Problema Original

```
❌ Erro ao salvar: Falha ao salvar (transação abortada).
Cannot read properties of undefined (reading 'saveUnidade')
```

### Causa Raiz

1. **Ordem de Carregamento Incorreta**
   - `app.js` (que define `window.repository`) carregava **DEPOIS** de `unidade.js`
   - `unidade.js` tentava usar `window.repository.saveUnidade()` antes da definição
   - Resultado: `window.repository === undefined`

2. **Scripts Duplicados**
   - `repository.js` e `dbTx.js` carregados como scripts regulares
   - Mas são módulos ES6 já importados pelo `app.js`
   - Causava conflitos de carregamento

## ✅ Soluções Aplicadas

### 1. Ordem de Carregamento (index.html)

**ANTES:**

```html
<!-- Settings carregavam primeiro -->
<script src="js/settings/unidade.js" defer></script>
...
<!-- app.js carregava por último -->
<script type="module" src="js/app.js" defer></script>
```

**DEPOIS:**

```html
<!-- app.js carrega PRIMEIRO -->
<script type="module" src="js/app.js"></script>

<!-- Settings carregam DEPOIS (podem usar window.repository) -->
<script src="js/settings/unidade.js" defer></script>
```

**Mudanças:**

- ✅ app.js movido para linha 831 (antes dos settings)
- ✅ Removido app.js duplicado no final (linha ~1098)
- ✅ Removidos scripts de `dbTx.js` e `repository.js` (são ES6 modules)

### 2. Verificações de Segurança (unidade.js)

Adicionadas verificações robustas no método `salvar()`:

```javascript
async salvar() {
  try {
    // ============================================================================
    // VERIFICAÇÕES DE SEGURANÇA - Garantir que módulos estão disponíveis
    // ============================================================================
    if (!window.dbManager) {
      alert('❌ Erro: Banco de dados não inicializado! Recarregue a página.');
      console.error('[SAVE_UNIDADE] dbManager não está disponível');
      return;
    }

    if (!window.repository) {
      alert('❌ Erro: Módulo de repositório não carregado! Recarregue a página.');
      console.error('[SAVE_UNIDADE] window.repository não está disponível');
      console.error('[SAVE_UNIDADE] Tipo:', typeof window.repository);
      return;
    }

    if (typeof window.repository.saveUnidade !== 'function') {
      alert('❌ Erro: Método saveUnidade não encontrado! Recarregue a página.');
      console.error('[SAVE_UNIDADE] saveUnidade não é uma função');
      console.error('[SAVE_UNIDADE] repository:', window.repository);
      return;
    }

    // ... resto do código
  }
}
```

**Benefícios:**

- ✅ Detecta problemas antes de tentar salvar
- ✅ Mensagens claras no console (prefixo `[SAVE_UNIDADE]`)
- ✅ Alertas informativos para o usuário
- ✅ Previne erros crypticos de `undefined`

### 3. Logs de Debug (app.js)

Adicionados logs detalhados na exposição global:

```javascript
document.addEventListener('DOMContentLoaded', () => {
  console.log('[App] 🔧 Expondo módulos globalmente...');
  console.log('[App] Repository tipo:', typeof repository);
  console.log('[App] Repository.saveUnidade:', typeof repository?.saveUnidade);

  window.repository = repository;
  window.app = new ControleMaterialApp();

  console.log('[App] ✅ window.repository exposto:', !!window.repository);
  console.log('[App] ✅ window.repository.saveUnidade:', typeof window.repository?.saveUnidade);
});
```

**Informações disponíveis:**

- ✅ Tipo do repository ao importar
- ✅ Disponibilidade do método `saveUnidade`
- ✅ Confirmação de exposição global
- ✅ Facilita debug futuro

## 📐 Estrutura Validada

### repository.js (ES6 Module)

```javascript
// Exportações nomeadas
export async function saveUnidade(unidade) { ... }
export async function listUnidades() { ... }

// Export default com todos os métodos
export default {
  saveEmpenho,
  saveNotaFiscal,
  // ...
  saveUnidade,    // ✅ Incluído
  getUnidade,
  listUnidades,
  saveUsuario,
  getUsuarioByLogin,
  listUsuarios,
  hasUsuarios
};
```

### app.js (Importação)

```javascript
// Import correto como ES6 module
import repository from './core/repository.js'; // ✅

// Exposição global no DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.repository = repository; // ✅
  window.app = new ControleMaterialApp();
});
```

### unidade.js (Uso)

```javascript
// Verifica antes de usar
if (!window.repository || typeof window.repository.saveUnidade !== 'function') {
  // Erro claro e preventivo
  return;
}

// Usa com segurança
await window.repository.saveUnidade(unidade); // ✅
```

## 🔄 Fluxo de Transação Garantido

### Via dbTx.js

```javascript
// repository.js usa dbTx.withTx() para garantir commits
import { withTx } from './dbTx.js';

export async function saveUnidade(unidade) {
  return withTx('config', 'readwrite', async (tx, store) => {
    await store.put(unidade, 'todasUnidades');
    // tx.oncomplete é aguardado automaticamente
  });
}
```

**Garantias:**

- ✅ Transação só completa após `tx.oncomplete`
- ✅ Erros são capturados e propagados
- ✅ Sem aborts silenciosos
- ✅ Dados persistem corretamente

## 🧪 Testes de Validação

### 1. Recarregar Página

```
Ctrl + Shift + R (hard reload)
```

### 2. Verificar Console

Procure pelos logs:

```
[App] 🔧 Expondo módulos globalmente...
[App] Repository tipo: object
[App] Repository.saveUnidade: function
[App] ✅ window.repository exposto: true
[App] ✅ window.repository.saveUnidade: function
```

### 3. Teste Manual

1. Abrir "Configurações" → "Unidade Orçamentária"
2. Preencher formulário de unidade
3. Clicar em "Salvar"
4. Verificar:
   - ✅ Sem erros no console
   - ✅ Alert "✅ Unidade cadastrada com sucesso!"
   - ✅ Unidade aparece na lista
   - ✅ Dados persistem após reload

### 4. Teste de Persistência

```javascript
// No console do navegador
console.log(window.repository);
console.log(typeof window.repository.saveUnidade);
// Deve exibir: "function"
```

## 📊 Checklist de Aceite

- [x] ✅ `window.repository` disponível globalmente
- [x] ✅ `saveUnidade()` é uma função acessível
- [x] ✅ Ordem de carregamento correta (app.js primeiro)
- [x] ✅ Verificações de segurança impedem erros crypticos
- [x] ✅ Logs de debug facilitam troubleshooting
- [x] ✅ Transações garantem commit real (via dbTx.js)
- [x] ✅ Sem duplicação de scripts ES6
- [x] ✅ Mensagens de erro claras para o usuário

## 🚀 Próximas Integrações

### Proteção de Pastas

Após validar salvamento de unidades, integrar:

- `ProtectionManager` para senhas
- `IntegrityManager` para verificação de arquivos
- `TrashManager` para soft-delete

### Módulos NE/NF

Aplicar mesmo padrão:

```javascript
// Verificar antes de salvar
if (!window.repository?.saveEmpenho) {
  console.error('[NE_SAVE] repository.saveEmpenho indisponível');
  return;
}

// Salvar com transação garantida
await window.repository.saveEmpenho(empenho);
```

## 📝 Notas Importantes

1. **Scripts com `defer`**: Executam NA ORDEM que aparecem no HTML, mas APÓS o DOM carregar
2. **Módulos ES6**: Não devem ser carregados com `<script src>` se já importados
3. **`window.repository`**: Exposto globalmente para compatibilidade com código legado
4. **Verificações**: Sempre validar disponibilidade antes de usar APIs globais

## 🔗 Arquivos Modificados

- `index.html` - Ordem de carregamento e remoção de duplicados
- `js/settings/unidade.js` - Verificações de segurança
- `js/app.js` - Logs de debug na exposição global
- `js/core/repository.js` - ✅ Já estava correto (export default)
- `js/core/dbTx.js` - ✅ Já estava correto (transações garantidas)

---

**Data da Correção:** 2025-01-07  
**Status:** ✅ CORRIGIDO  
**Teste Necessário:** ⏳ AGUARDANDO VALIDAÇÃO DO USUÁRIO
