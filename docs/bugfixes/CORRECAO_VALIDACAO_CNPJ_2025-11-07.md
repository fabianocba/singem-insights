# 🐛 Correção - Bug de Validação de CNPJ

**Data:** 7 de novembro de 2025  
**Arquivo afetado:** `js/settings/unidade.js`  
**Função:** `validarCNPJAlgoritmo()`

---

## ❌ Problema Reportado

Ao tentar cadastrar uma Unidade Orçamentária, o sistema **sempre rejeitava CNPJs válidos** com a mensagem:

```
❌ CNPJ inválido! Verifique os dígitos verificadores.
```

Mesmo quando o CNPJ estava **correto e formatado corretamente**.

---

## 🔍 Causa Raiz

### Bug identificado (Linhas 694 e 709)

```javascript
// ❌ CÓDIGO COM BUG
let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
if (resultado !== digitos.charAt(0)) {
  // ← BUG AQUI
  return false;
}
```

### Problema técnico

A comparação estava usando **strict equality** (`!==`) entre:

- `resultado` → **Tipo: Number** (0-9)
- `digitos.charAt(0)` → **Tipo: String** ("0"-"9")

**Resultado:** A comparação `número !== string` **sempre retornava true**, fazendo com que **todos os CNPJs fossem rejeitados**, mesmo os válidos.

### Exemplo do problema:

```javascript
// Cálculo do dígito verificador resulta em: 8 (número)
let resultado = 8;

// Dígito no CNPJ é: "8" (string)
const digito = digitos.charAt(0); // "8"

// Comparação strict
resultado !== digito; // 8 !== "8" → true (BUG!)
// Deveria ser false (são iguais)
```

---

## ✅ Solução Aplicada

### Código corrigido

```javascript
// ✅ CÓDIGO CORRIGIDO
let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
if (resultado !== parseInt(digitos.charAt(0))) {
  // ← CORRIGIDO
  return false;
}

// ... (mesmo para segundo dígito)

resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
if (resultado !== parseInt(digitos.charAt(1))) {
  // ← CORRIGIDO
  return false;
}
```

### O que mudou

1. **Linha 694:** `digitos.charAt(0)` → `parseInt(digitos.charAt(0))`
2. **Linha 709:** `digitos.charAt(1)` → `parseInt(digitos.charAt(1))`

Agora ambos os lados da comparação são **números**, fazendo a validação funcionar corretamente.

---

## 🧪 Testes Realizados

### CNPJs válidos testados ✅

| CNPJ               | Status    |
| ------------------ | --------- |
| 00.394.460/0058-87 | ✅ VÁLIDO |
| 11.222.333/0001-81 | ✅ VÁLIDO |
| 07.526.557/0001-00 | ✅ VÁLIDO |
| 60.701.190/0001-04 | ✅ VÁLIDO |

### CNPJs inválidos testados ✅

| CNPJ               | Status                 |
| ------------------ | ---------------------- |
| 11.111.111/1111-11 | ❌ REJEITADO (correto) |
| 00.000.000/0000-00 | ❌ REJEITADO (correto) |
| 12.345.678/9012-34 | ❌ REJEITADO (correto) |
| 10.866.260/0001-99 | ❌ REJEITADO (correto) |

---

## 📝 Algoritmo de Validação (Receita Federal)

O algoritmo implementa a **validação oficial da Receita Federal**:

### Passos da validação

1. **Limpar CNPJ:** Remove formatação (pontos, barras, traços)
2. **Verificar tamanho:** Deve ter exatamente 14 dígitos
3. **Rejeitar sequências:** 11111111111111, 00000000000000, etc.
4. **Calcular 1º DV:**
   - Multiplicadores: 5,4,3,2,9,8,7,6,5,4,3,2
   - Soma dos produtos
   - Resto da divisão por 11
   - Se resto < 2: DV = 0, senão: DV = 11 - resto
5. **Calcular 2º DV:**
   - Multiplicadores: 6,5,4,3,2,9,8,7,6,5,4,3,2
   - Mesma lógica do 1º DV
6. **Comparar:** DVs calculados devem ser iguais aos informados

---

## 🎯 Impacto da Correção

### Antes da correção ❌

- **Nenhum CNPJ** podia ser cadastrado
- Sistema sempre rejeitava com mensagem de erro
- Bloqueava criação de Unidades Orçamentárias

### Após a correção ✅

- CNPJs **válidos são aceitos** normalmente
- CNPJs **inválidos são rejeitados** corretamente
- Sistema funciona conforme especificação da Receita Federal

---

## 🔧 Arquivos Relacionados

### Arquivos verificados

1. ✅ **`js/settings/unidade.js`** - **CORRIGIDO**
   - Método `validarCNPJAlgoritmo()`
   - Linhas 694 e 709

2. ✅ **`js/utils/validate.js`** - **JÁ ESTAVA CORRETO**
   - Função `validateCNPJ()`
   - Já usava `parseInt()` nas comparações

3. ✅ **`js/core/inputValidator.js`** - **JÁ ESTAVA CORRETO**
   - Método `isValidCNPJ()`
   - Já usava `parseInt()` nas comparações

4. ✅ **`js/pdfReader.js`** - **USA MÓDULO CORRETO**
   - Chama `this.validarCNPJ()` que usa o módulo utils/validate.js

---

## 📚 Outras Validações de CNPJ no Sistema

### Módulos que validam CNPJ:

| Arquivo                     | Função/Método            | Status                |
| --------------------------- | ------------------------ | --------------------- |
| `js/settings/unidade.js`    | `validarCNPJAlgoritmo()` | ✅ CORRIGIDO          |
| `js/utils/validate.js`      | `validateCNPJ()`         | ✅ JÁ CORRETO         |
| `js/core/inputValidator.js` | `isValidCNPJ()`          | ✅ JÁ CORRETO         |
| `js/pdfReader.js`           | `validarCNPJ()`          | ✅ USA MÓDULO CORRETO |

### Usos no sistema:

1. **Cadastro de Unidade** → `settings/unidade.js` (CORRIGIDO)
2. **Validação de NF** → `utils/validate.js` (OK)
3. **Validação de Empenho** → `utils/validate.js` (OK)
4. **Parse de PDF** → `pdfReader.js` → `utils/validate.js` (OK)

---

## 🚀 Como Testar

### 1. Limpar cache do navegador

```
Ctrl+Shift+Delete → Limpar cache e cookies
Ctrl+F5 → Recarregar com cache limpo
```

### 2. Acessar configurações

```
Menu → Configurações → Unidade Orçamentária
```

### 3. Cadastrar unidade

```
Razão Social: Instituto Federal Baiano - Campus Valença
CNPJ: 10.766.260/0001-93
UG: 158330
```

### 4. Verificar sucesso

```
✅ Deve aceitar CNPJ válido
✅ Deve salvar unidade
✅ Deve aparecer na lista
```

### 5. Testar CNPJ inválido

```
CNPJ: 11.111.111/1111-11
❌ Deve rejeitar com mensagem de erro
```

---

## 📋 Checklist de Validação

- [x] Bug identificado (comparação número !== string)
- [x] Correção aplicada (adicionado parseInt())
- [x] Testes realizados (CNPJs válidos e inválidos)
- [x] Outros módulos verificados (validate.js, inputValidator.js)
- [x] Documentação criada
- [ ] **PENDENTE:** Teste pelo usuário com CNPJ real

---

## 💡 Lições Aprendidas

### Problema de Type Coercion

JavaScript tem **dois tipos de comparação**:

1. **Loose equality (`==`)** - Faz conversão automática de tipos

   ```javascript
   8 == '8'; // true (converte string para número)
   ```

2. **Strict equality (`===` ou `!==`)** - Não converte tipos
   ```javascript
   8 === '8'; // false (tipos diferentes)
   ```

### Solução

Quando usar strict equality, **garantir que ambos os lados são do mesmo tipo**:

- Converter explicitamente: `parseInt()`, `Number()`, `String()`
- Ou usar loose equality quando apropriado

### Recomendação

Sempre usar **strict equality** (`===` / `!==`) com **conversão explícita** de tipos:

```javascript
// ✅ BOM
if (resultado !== parseInt(digito)) {
}

// ⚠️ EVITAR (pode esconder bugs)
if (resultado != digito) {
}

// ❌ ERRADO (bug atual)
if (resultado !== digito) {
}
```

---

## 📞 Suporte

Se após a correção ainda houver problemas:

1. **Limpar cache:** `Ctrl+F5`
2. **Verificar console:** `F12` → Console
3. **Testar com CNPJ válido:** Use validador online da Receita Federal
4. **Reportar:** Informar CNPJ testado e mensagem de erro exata

---

**Correção aplicada por:** GitHub Copilot  
**Testada:** ✅ Algoritmo validado  
**Status:** ✅ Pronto para uso
