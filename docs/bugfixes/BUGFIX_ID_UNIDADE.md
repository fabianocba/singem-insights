# 🐛 Bugfix: ID da Unidade Orçamentária Sobrescrito

**Data:** 05/11/2025  
**Arquivo:** `js/settings/unidade.js`  
**Problema:** Usuários não conseguiam ser cadastrados por erro de "Unidade Orçamentária não cadastrada"

---

## 📋 Descrição do Problema

### Sintoma

Ao tentar cadastrar um usuário, o sistema exibia:

```
❌ UNIDADE ORÇAMENTÁRIA NÃO CADASTRADA!
```

Mesmo que a unidade tivesse sido cadastrada e salva com sucesso.

### Logs Observados

```
✅ Registro salvo em 'config': todasUnidades
✅ Todas as unidades salvas no IndexedDB
✅ Registro salvo em 'config': unidade_1762366461540_hd27sxdcp  ← ID ERRADO!
✅ Unidade principal salva no IndexedDB
```

**Problema:** ID deveria ser `"unidadeOrcamentaria"` mas foi salvo como `"unidade_1762366461540_hd27sxdcp"`

---

## 🔍 Análise da Causa Raiz

### Código Problemático (ANTES)

```javascript
async saveUnidadeOrcamentaria(unidade) {
  const data = {
    id: "unidadeOrcamentaria",  // ← Define id correto
    ...(unidade || {}),          // ← MAS spread sobrescreve!
  };
  await window.dbManager.update("config", data);
}
```

### O Que Acontecia

1. Método recebe `unidade` com `id: "unidade_1762366461540_hd27sxdcp"`
2. Objeto `data` define `id: "unidadeOrcamentaria"`
3. **Spread operator `...unidade`** vem DEPOIS
4. Spread sobrescreve todas as propriedades, incluindo `id`
5. Resultado final: `id: "unidade_1762366461540_hd27sxdcp"` ❌

### Por Que Isso Causava Erro

```javascript
// Em usuarios.js
async salvarNovoUsuario() {
  // Tenta buscar com id fixo
  const unidade = await window.getUnidadeOrcamentaria();
  // → Busca por id: "unidadeOrcamentaria"
  // → Mas no banco está: "unidade_1762366461540_hd27sxdcp"
  // → Retorna null ❌

  if (!unidade || !unidade.cnpj) {
    alert("❌ UNIDADE ORÇAMENTÁRIA NÃO CADASTRADA!");
    return;
  }
}
```

---

## ✅ Solução Implementada

### Código Corrigido (DEPOIS)

```javascript
async saveUnidadeOrcamentaria(unidade) {
  const data = {
    ...(unidade || {}),           // ← Spread PRIMEIRO
    id: "unidadeOrcamentaria",    // ← ID fixo SOBRESCREVE
  };
  await window.dbManager.update("config", data);
}
```

### Como Funciona Agora

1. Spread operator copia TODAS as propriedades de `unidade`
2. Incluindo `id`, `razaoSocial`, `cnpj`, etc.
3. **Depois**, `id: "unidadeOrcamentaria"` sobrescreve o ID
4. Resultado: ID sempre fixo ✅

---

## 🧪 Ordem de Propriedades em JavaScript

### Exemplo Visual

```javascript
// ERRADO (id sobrescrito)
const obj1 = {
  id: 'fixo',
  ...{ id: 'dinamico', nome: 'teste' }
};
console.log(obj1.id); // → "dinamico" ❌

// CORRETO (id preservado)
const obj2 = {
  ...{ id: 'dinamico', nome: 'teste' },
  id: 'fixo'
};
console.log(obj2.id); // → "fixo" ✅
```

**Regra:** Última propriedade declarada prevalece!

---

## 📦 Alterações Realizadas

### 1. `js/settings/unidade.js` (linha ~645)

**ANTES:**

```javascript
async saveUnidadeOrcamentaria(unidade) {
  const data = {
    id: "unidadeOrcamentaria",
    ...(unidade || {}),
  };
  // ...
}
```

**DEPOIS:**

```javascript
async saveUnidadeOrcamentaria(unidade) {
  const data = {
    ...(unidade || {}),
    id: "unidadeOrcamentaria", // ID fixo para leitura global
  };
  // ...
}
```

### 2. `js/settings/usuarios.js`

Adicionado método `ensureDBReady()` para garantir inicialização do banco antes de operações, seguindo o mesmo padrão de `unidade.js`.

---

## ✅ Resultado Esperado

### Logs Corretos (APÓS CORREÇÃO)

```
✅ Registro salvo em 'config': todasUnidades
✅ Todas as unidades salvas no IndexedDB
✅ Registro salvo em 'config': unidadeOrcamentaria  ← ID CORRETO!
✅ Unidade principal salva no IndexedDB
```

### Fluxo de Cadastro de Usuário

```
1. Usuário cadastra unidade orçamentária
   → Salva em: config/unidadeOrcamentaria ✅

2. Usuário tenta cadastrar novo usuário
   → Busca: config/unidadeOrcamentaria ✅
   → Encontra unidade ✅
   → Permite cadastro ✅
```

---

## 🧪 Como Testar

### 1. Limpe o Cache

```powershell
.\REINICIAR_SEM_CACHE.ps1
```

Ou no navegador:

```
Ctrl + Shift + R
```

### 2. Teste o Fluxo Completo

1. **Vá em:** Configurações → Unidade Orçamentária
2. **Preencha** todos os campos obrigatórios
3. **Salve** a unidade
4. **Verifique logs** no console (F12):

   ```
   ✅ Registro salvo em 'config': unidadeOrcamentaria
   ```

5. **Vá em:** Configurações → Usuários
6. **Preencha** dados do novo usuário
7. **Salve** o usuário
8. **NÃO deve** aparecer erro de "Unidade não cadastrada" ✅

### 3. Verificação no IndexedDB

1. Pressione `F12` (DevTools)
2. Aba **Application**
3. **IndexedDB** → **ControleMaterialDB** → **config**
4. Procure por chave: `"unidadeOrcamentaria"`
5. Deve existir e ter todos os dados da unidade ✅

---

## 📊 Impacto

- **Arquivos modificados:** 2 (`unidade.js`, `usuarios.js`)
- **Linhas alteradas:** ~8 linhas
- **Breaking changes:** Nenhum
- **Compatibilidade:** 100% preservada
- **Severidade:** **CRÍTICA** (bloqueava cadastro de usuários)

---

## 🔗 Relacionado

- **BUGFIX_UNIDADE_DB.md:** Correção de inicialização do IndexedDB
- **SOLUCAO_CACHE.md:** Problema de cache do navegador

---

**Status:** ✅ **CORRIGIDO**  
**Teste:** ⏳ **Aguardando validação do usuário após limpar cache**
