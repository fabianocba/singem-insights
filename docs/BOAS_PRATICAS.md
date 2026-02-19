# 📐 Guia de Boas Práticas - IFDESK

## 🎯 Objetivo

Este documento define os padrões de qualidade de código para o projeto IFDESK.

---

## ✅ Checklist de Desenvolvimento

Antes de cada commit:

```bash
# 1. Formatar código
npm run format

# 2. Corrigir lint automaticamente
npm run lint:fix

# 3. Verificar qualidade
npm run quality
```

---

## 📏 Padrões de Código

### **JavaScript**

#### ✅ **Usar `===` ao invés de `==`**

```javascript
// ❌ Evitar
if (valor == null) {
}

// ✅ Preferir
if (valor === null || valor === undefined) {
}
```

#### ✅ **Sempre usar chaves em if/for/while**

```javascript
// ❌ Evitar
if (condition) doSomething();

// ✅ Preferir
if (condition) {
  doSomething();
}
```

#### ✅ **Preferir const sobre let**

```javascript
// ❌ Evitar
let count = items.length;

// ✅ Preferir
const count = items.length;
```

#### ✅ **Nomear parâmetros não usados com `_`**

```javascript
// ❌ Evitar
items.forEach((item, index) => {
  /* não usa index */
});

// ✅ Preferir
items.forEach((item, _index) => {
  /* ESLint ignora */
});
```

#### ✅ **Evitar métodos muito complexos (max 15)**

```javascript
// ❌ Método muito complexo
function processData(data) {
  if (...) {
    if (...) {
      if (...) {
        // 20 níveis de profundidade
      }
    }
  }
}

// ✅ Refatorar em funções menores
function processData(data) {
  const validated = validateData(data);
  const transformed = transformData(validated);
  return saveData(transformed);
}
```

---

## 🛡️ Segurança

### **XSS Prevention**

```javascript
// ❌ Nunca use innerHTML com dados do usuário
element.innerHTML = userInput;

// ✅ Use textContent ou sanitize
element.textContent = userInput;
// ou
element.innerHTML = window.security.sanitize(userInput);
```

### **CNPJ/CPF Validation**

```javascript
// ✅ Sempre validar antes de usar
const cnpj = window.security.sanitizeCNPJ(input);
if (validarCNPJ(cnpj)) {
  // processar
}
```

### **Object.hasOwnProperty**

```javascript
// ❌ Acesso direto
if (obj.hasOwnProperty(key)) {
}

// ✅ Usar Object.prototype
if (Object.prototype.hasOwnProperty.call(obj, key)) {
}
```

---

## 📊 Complexidade

### **Limites Recomendados**

- **Complexity**: máximo 15 por método
- **Max Lines**: máximo 800 por arquivo
- **Max Depth**: máximo 4 níveis de indentação

### **Quando Refatorar**

Se um método tem **complexity > 15**:

1. **Extrair funções auxiliares**
2. **Usar Early Returns**
3. **Simplificar condicionais**

Exemplo:

```javascript
// ❌ Complexity: 18
function processItem(item) {
  if (item.type === 'A') {
    if (item.status === 'active') {
      if (item.value > 100) {
        // ... muitas condições
      }
    }
  }
}

// ✅ Complexity: 5
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

## 🧪 Testes

### **Prioridade de Testes**

1. **Crítico**: Validações, parseadores, cálculos financeiros
2. **Alto**: CRUD operations, relatórios
3. **Médio**: UI helpers, formatadores
4. **Baixo**: Utils genéricos

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

## 📦 Estrutura de Arquivos

```
js/
├── core/           # Módulos fundamentais (db, security, etc)
├── ui/             # Componentes de UI (feedback, modals, etc)
├── workers/        # Web Workers para processamento assíncrono
├── utils/          # Utilitários genéricos
├── consultas/      # Integração com APIs externas
├── settings/       # Configurações e preferências
└── app.js          # Aplicação principal
```

### **Regras de Importação**

- `core/` não pode importar de `ui/` ou `app.js`
- `utils/` não pode importar de nenhum outro módulo
- `workers/` são isolados (não importam outros módulos)

---

## 🔧 Ferramentas

### **VS Code Tasks**

Pressione `Ctrl+Shift+P` → "Tasks: Run Task":

- **lint** - Verificar problemas de código
- **lint:fix** - Corrigir automaticamente
- **format** - Formatar todos os arquivos
- **format:check** - Verificar formatação

### **Scripts NPM**

```bash
npm run lint          # Verificar lint (falha se houver warnings)
npm run lint:fix      # Corrigir automaticamente
npm run format        # Formatar código
npm run format:check  # Verificar formatação
npm run quality       # Verificação completa de qualidade
```

---

## 📈 Métricas de Qualidade

### **Objetivos**

| Métrica             | Meta  | Atual |
| ------------------- | ----- | ----- |
| Lint Errors         | 0     | 62    |
| Lint Warnings       | < 10  | 81    |
| Código Duplicado    | < 3%  | -     |
| Cobertura de Testes | > 70% | 0%    |

### **Score de Qualidade**

```
Score = (Checks Passados / Total de Checks) * 100

Checks:
- [ ] Sem erros de lint
- [ ] Warnings < 10
- [ ] Formatação correta
- [ ] Sem vulnerabilidades
```

---

## 🚀 Workflow Recomendado

### **Antes de Começar**

1. Garantir que está na branch correta
2. `npm install` para atualizar dependências

### **Durante o Desenvolvimento**

1. Escrever código
2. Salvar arquivo (formatação automática ativada)
3. Ver erros de lint no painel "Problemas" do VS Code
4. Corrigir conforme necessário

### **Antes do Commit**

```bash
# Executar verificação completa
npm run quality

# Se houver erros, corrigir automaticamente
npm run lint:fix
npm run format

# Verificar novamente
npm run quality
```

---

## ⚠️ Problemas Comuns

### **"Expected '===' and instead saw '=='"**

**Causa**: Uso de comparação frouxa

**Solução**:

```javascript
// Antes
if (x == null) {
}

// Depois
if (x === null || x === undefined) {
}
```

### **"Unnecessary escape character"**

**Causa**: Escape desnecessário em regex

**Solução**:

```javascript
// Antes
/[.\-]/

// Depois
/[.-]/ ou /[\-.]/ (se hífen no final)
```

### **"Method X has a complexity of Y. Maximum allowed is 15"**

**Causa**: Método muito complexo

**Solução**: Refatorar em funções menores (veja seção "Complexidade")

---

## 📚 Recursos

- [ESLint Rules](https://eslint.org/docs/rules/)
- [Prettier Options](https://prettier.io/docs/en/options.html)
- [JavaScript Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide)

---

## 🎓 Para Novos Desenvolvedores

1. Ler este guia completamente
2. Configurar VS Code com extensões recomendadas:
   - ESLint
   - Prettier
3. Executar `npm install`
4. Fazer um teste: `npm run quality`
5. Explorar o código existente seguindo os padrões

---

**Última Atualização**: 2025-11-06  
**Versão**: 1.0.0
