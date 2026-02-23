# ðŸ“ Guia de Boas PrÃ¡ticas - SINGEM

## ðŸŽ¯ Objetivo

Este documento define os padrÃµes de qualidade de cÃ³digo para o projeto SINGEM.

---

## âœ… Checklist de Desenvolvimento

Antes de cada commit:

```bash
# 1. Formatar cÃ³digo
npm run format

# 2. Corrigir lint automaticamente
npm run lint:fix

# 3. Verificar qualidade
npm run quality
```

---

## ðŸ“ PadrÃµes de CÃ³digo

### **JavaScript**

#### âœ… **Usar `===` ao invÃ©s de `==`**

```javascript
// âŒ Evitar
if (valor == null) {
}

// âœ… Preferir
if (valor === null || valor === undefined) {
}
```

#### âœ… **Sempre usar chaves em if/for/while**

```javascript
// âŒ Evitar
if (condition) doSomething();

// âœ… Preferir
if (condition) {
  doSomething();
}
```

#### âœ… **Preferir const sobre let**

```javascript
// âŒ Evitar
let count = items.length;

// âœ… Preferir
const count = items.length;
```

#### âœ… **Nomear parÃ¢metros nÃ£o usados com `_`**

```javascript
// âŒ Evitar
items.forEach((item, index) => {
  /* nÃ£o usa index */
});

// âœ… Preferir
items.forEach((item, _index) => {
  /* ESLint ignora */
});
```

#### âœ… **Evitar mÃ©todos muito complexos (max 15)**

```javascript
// âŒ MÃ©todo muito complexo
function processData(data) {
  if (...) {
    if (...) {
      if (...) {
        // 20 nÃ­veis de profundidade
      }
    }
  }
}

// âœ… Refatorar em funÃ§Ãµes menores
function processData(data) {
  const validated = validateData(data);
  const transformed = transformData(validated);
  return saveData(transformed);
}
```

---

## ðŸ›¡ï¸ SeguranÃ§a

### **XSS Prevention**

```javascript
// âŒ Nunca use innerHTML com dados do usuÃ¡rio
element.innerHTML = userInput;

// âœ… Use textContent ou sanitize
element.textContent = userInput;
// ou
element.innerHTML = window.security.sanitize(userInput);
```

### **CNPJ/CPF Validation**

```javascript
// âœ… Sempre validar antes de usar
const cnpj = window.security.sanitizeCNPJ(input);
if (validarCNPJ(cnpj)) {
  // processar
}
```

### **Object.hasOwnProperty**

```javascript
// âŒ Acesso direto
if (obj.hasOwnProperty(key)) {
}

// âœ… Usar Object.prototype
if (Object.prototype.hasOwnProperty.call(obj, key)) {
}
```

---

## ðŸ“Š Complexidade

### **Limites Recomendados**

- **Complexity**: mÃ¡ximo 15 por mÃ©todo
- **Max Lines**: mÃ¡ximo 800 por arquivo
- **Max Depth**: mÃ¡ximo 4 nÃ­veis de indentaÃ§Ã£o

### **Quando Refatorar**

Se um mÃ©todo tem **complexity > 15**:

1. **Extrair funÃ§Ãµes auxiliares**
2. **Usar Early Returns**
3. **Simplificar condicionais**

Exemplo:

```javascript
// âŒ Complexity: 18
function processItem(item) {
  if (item.type === 'A') {
    if (item.status === 'active') {
      if (item.value > 100) {
        // ... muitas condiÃ§Ãµes
      }
    }
  }
}

// âœ… Complexity: 5
function processItem(item) {
  if (!isValidItem(item)) {
    return;
  }
  if (!isActiveItem(item)) {
    return;
  }

  processValidActiveItem(item);
}
```

---

## ðŸ§ª Testes

### **Prioridade de Testes**

1. **CrÃ­tico**: ValidaÃ§Ãµes, parseadores, cÃ¡lculos financeiros
2. **Alto**: CRUD operations, relatÃ³rios
3. **MÃ©dio**: UI helpers, formatadores
4. **Baixo**: Utils genÃ©ricos

### **Estrutura de Teste**

```javascript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should handle valid input', () => {
      // Arrange
      const input = { ... };

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe(expected);
    });

    it('should handle invalid input', () => {
      expect(() => functionName(null)).toThrow();
    });
  });
});
```

---

## ðŸ“¦ Estrutura de Arquivos

```
js/
â”œâ”€â”€ core/           # MÃ³dulos fundamentais (db, security, etc)
â”œâ”€â”€ ui/             # Componentes de UI (feedback, modals, etc)
â”œâ”€â”€ workers/        # Web Workers para processamento assÃ­ncrono
â”œâ”€â”€ utils/          # UtilitÃ¡rios genÃ©ricos
â”œâ”€â”€ consultas/      # IntegraÃ§Ã£o com APIs externas
â”œâ”€â”€ settings/       # ConfiguraÃ§Ãµes e preferÃªncias
â””â”€â”€ app.js          # AplicaÃ§Ã£o principal
```

### **Regras de ImportaÃ§Ã£o**

- `core/` nÃ£o pode importar de `ui/` ou `app.js`
- `utils/` nÃ£o pode importar de nenhum outro mÃ³dulo
- `workers/` sÃ£o isolados (nÃ£o importam outros mÃ³dulos)

---

## ðŸ”§ Ferramentas

### **VS Code Tasks**

Pressione `Ctrl+Shift+P` â†’ "Tasks: Run Task":

- **lint** - Verificar problemas de cÃ³digo
- **lint:fix** - Corrigir automaticamente
- **format** - Formatar todos os arquivos
- **format:check** - Verificar formataÃ§Ã£o

### **Scripts NPM**

```bash
npm run lint          # Verificar lint (falha se houver warnings)
npm run lint:fix      # Corrigir automaticamente
npm run format        # Formatar cÃ³digo
npm run format:check  # Verificar formataÃ§Ã£o
npm run quality       # VerificaÃ§Ã£o completa de qualidade
```

---

## ðŸ“ˆ MÃ©tricas de Qualidade

### **Objetivos**

| MÃ©trica           | Meta  | Atual |
| ------------------- | ----- | ----- |
| Lint Errors         | 0     | 62    |
| Lint Warnings       | < 10  | 81    |
| CÃ³digo Duplicado   | < 3%  | -     |
| Cobertura de Testes | > 70% | 0%    |

### **Score de Qualidade**

```
Score = (Checks Passados / Total de Checks) * 100

Checks:
- [ ] Sem erros de lint
- [ ] Warnings < 10
- [ ] FormataÃ§Ã£o correta
- [ ] Sem vulnerabilidades
```

---

## ðŸš€ Workflow Recomendado

### **Antes de ComeÃ§ar**

1. Garantir que estÃ¡ na branch correta
2. `npm install` para atualizar dependÃªncias

### **Durante o Desenvolvimento**

1. Escrever cÃ³digo
2. Salvar arquivo (formataÃ§Ã£o automÃ¡tica ativada)
3. Ver erros de lint no painel "Problemas" do VS Code
4. Corrigir conforme necessÃ¡rio

### **Antes do Commit**

```bash
# Executar verificaÃ§Ã£o completa
npm run quality

# Se houver erros, corrigir automaticamente
npm run lint:fix
npm run format

# Verificar novamente
npm run quality
```

---

## âš ï¸ Problemas Comuns

### **"Expected '===' and instead saw '=='"**

**Causa**: Uso de comparaÃ§Ã£o frouxa

**SoluÃ§Ã£o**:

```javascript
// Antes
if (x == null) {
}

// Depois
if (x === null || x === undefined) {
}
```

### **"Unnecessary escape character"**

**Causa**: Escape desnecessÃ¡rio em regex

**SoluÃ§Ã£o**:

```javascript
// Antes
/[.\-]/

// Depois
/[.-]/ ou /[\-.]/ (se hÃ­fen no final)
```

### **"Method X has a complexity of Y. Maximum allowed is 15"**

**Causa**: MÃ©todo muito complexo

**SoluÃ§Ã£o**: Refatorar em funÃ§Ãµes menores (veja seÃ§Ã£o "Complexidade")

---

## ðŸ“š Recursos

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [JavaScript Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)

---

## ðŸŽ“ Para Novos Desenvolvedores

1. Ler este guia completamente
2. Configurar VS Code com extensÃµes recomendadas:
   - ESLint
   - Prettier
3. Executar `npm install`
4. Fazer um teste: `npm run quality`
5. Explorar o cÃ³digo existente seguindo os padrÃµes

---

**Ãšltima AtualizaÃ§Ã£o**: 2025-11-06  
**VersÃ£o**: 1.0.0
