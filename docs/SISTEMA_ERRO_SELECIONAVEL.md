# Sistema de Erro Selecionável

## 📋 Visão Geral

Sistema melhorado de exibição de erros que **permite selecionar e copiar** a mensagem completa do erro, facilitando o suporte e debug.

## ❌ Problema Anterior

```javascript
showError(message) {
  alert('❌ ' + message);  // ❌ NÃO PERMITE SELEÇÃO
}
```

### Limitações:

- ❌ Texto do `alert()` NÃO pode ser selecionado
- ❌ Impossível copiar erro completo
- ❌ Dificulta suporte técnico
- ❌ Sem detalhes técnicos (stack trace)
- ❌ Visual básico do sistema operacional

---

## ✅ Solução Implementada

### Modal Customizado com Texto Selecionável

```javascript
showError(message, details = null) {
  // Cria modal customizado
  // - Texto totalmente selecionável
  // - Exibe stack trace se disponível
  // - Instruções de como reportar
  // - Botão para logar no console
}
```

## 🎨 Características do Modal

### 1. **Design Moderno**

- Fundo escuro com overlay semitransparente
- Animações suaves (fadeIn + slideDown)
- Cores contrastantes (vermelho para erro)
- Layout responsivo

### 2. **Texto Totalmente Selecionável**

```css
user-select: text;
-webkit-user-select: text;
-moz-user-select: text;
-ms-user-select: text;
```

### 3. **Detalhes Técnicos**

Se um objeto `Error` for passado como segundo parâmetro:

- Exibe `error.message`
- Exibe `error.stack` (stack trace completo)
- Formata como código (monospace, fundo escuro)
- Scroll se muito longo

### 4. **Instruções de Suporte**

O modal inclui instruções claras:

1. Selecionar e copiar a mensagem de erro (Ctrl+C)
2. Abrir o Console (F12)
3. Tirar screenshot do console
4. Enviar ambos para suporte

### 5. **Botões de Ação**

- **📋 Logar no Console**: Escreve erro no console (útil para F12)
- **✓ Fechar**: Fecha o modal

### 6. **Interação**

- Clique fora do modal → fecha
- Pressione ESC → fecha

---

## 🔧 Como Usar

### Uso Básico

```javascript
this.showError('Não foi possível salvar o arquivo');
```

### Com Detalhes Técnicos (RECOMENDADO)

```javascript
try {
  await algumaSalvamento();
} catch (error) {
  this.showError(
    'Não foi possível salvar o arquivo.\n\n' + 'Por favor, copie esta mensagem e os detalhes técnicos abaixo.',
    error // ← Passa o objeto Error completo
  );
}
```

### Com Objeto Personalizado

```javascript
this.showError('Falha na validação', {
  campo: 'numero',
  valor: '123ABC',
  esperado: 'somente números'
});
```

---

## 📸 Estrutura do Modal

```
┌─────────────────────────────────────────┐
│ ❌  Erro ao Salvar                      │
│     Ocorreu um problema durante...      │
├─────────────────────────────────────────┤
│ 📝 Mensagem:                            │
│ Não foi possível salvar o arquivo       │
├─────────────────────────────────────────┤
│ 📋 Detalhes Técnicos (selecione...):    │
│ SecurityError: Failed to execute...     │
│ Stack Trace:                            │
│ at saveFile (fsManager.js:245)         │
│ at _salvarArquivoEmpenho (app.js:1625) │
├─────────────────────────────────────────┤
│ 💡 Como Reportar:                       │
│ 1. Selecione e copie (Ctrl+C)...       │
│ 2. Abra o Console (F12)                │
│ 3. Tire screenshot...                   │
│ 4. Envie para suporte                   │
├─────────────────────────────────────────┤
│         [📋 Logar no Console] [✓ Fechar]│
└─────────────────────────────────────────┘
```

---

## 🧪 Exemplo Real

### Erro ao Salvar Empenho

**Antes (alert não selecionável):**

```
❌ Erro ao salvar arquivo
```

**Depois (modal completo):**

```
❌ Erro ao Salvar
Ocorreu um problema durante o salvamento

📝 Mensagem:
Não foi possível salvar o arquivo de empenho.

Por favor, copie esta mensagem e os detalhes técnicos abaixo.

📋 Detalhes Técnicos (selecione para copiar):
NotAllowedError: The request is not allowed by the user agent or the platform in the current context.

Stack Trace:
at FileSystemFileHandle.createWritable (native)
at saveFile (fsManager.js:245:42)
at saveFileWithFallback (fsManager.js:568:28)
at _salvarArquivoEmpenho (app.js:1625:50)
at processarArquivo (app.js:1542:22)

💡 Como Reportar:
1. Selecione e copie (Ctrl+C) a mensagem de erro acima
2. Abra o Console (pressione F12)
3. Tire um screenshot do console
4. Envie ambos (mensagem + screenshot) para o suporte
```

---

## 🎯 Locais Atualizados

### 1. **js/app.js - Função showError()**

**Linha:** ~2713-2900

**Mudanças:**

- ❌ Removido: `alert('❌ ' + message)`
- ✅ Adicionado: Modal customizado com texto selecionável
- ✅ Parâmetro `details` opcional
- ✅ Suporte a objetos Error com stack trace
- ✅ Console.error automático
- ✅ Instruções de suporte

### 2. **js/app.js - \_salvarArquivoEmpenho()**

**Linha:** ~1612-1660

**Mudanças:**

```javascript
// ANTES:
catch (error) {
  console.error('[APP] ❌ Erro ao salvar arquivo:', error);
  console.warn('[APP] ⚠️ Continuando sem salvar arquivo');
  return null;
}

// DEPOIS:
catch (error) {
  console.error('[APP] ❌ Erro ao salvar arquivo:', error);

  // ✅ MOSTRA ERRO DETALHADO COM MODAL SELECIONÁVEL
  this.showError(
    'Não foi possível salvar o arquivo de empenho.\n\n' +
    'Por favor, copie esta mensagem e os detalhes técnicos abaixo.',
    error  // ← Passa objeto Error completo
  );

  return null;
}
```

---

## 🔍 Como Debugar com o Novo Sistema

### Passo 1: Reproduza o Erro

Execute a ação que causa o erro (ex: salvar empenho)

### Passo 2: Modal Aparece

O modal customizado será exibido automaticamente

### Passo 3: Copie a Mensagem

- **Opção A**: Selecione o texto da mensagem principal e pressione Ctrl+C
- **Opção B**: Selecione os detalhes técnicos e pressione Ctrl+C
- **Opção C**: Clique em "📋 Logar no Console" e copie do console (F12)

### Passo 4: Abra o Console (F12)

```javascript
// Você verá logs como:
[APP] ❌ ERRO: Não foi possível salvar o arquivo de empenho...
[APP] 📋 Detalhes: NotAllowedError: ...
[APP] 📚 Stack: at FileSystemFileHandle.createWritable...
```

### Passo 5: Tire Screenshot

Capture a tela mostrando:

- O modal de erro completo
- O console com os logs

### Passo 6: Reporte

Envie para o suporte:

- Texto copiado do modal
- Screenshot do console
- Descrição do que estava fazendo

---

## 📊 Vantagens do Novo Sistema

| Aspecto              | Alert Antigo | Modal Novo        |
| -------------------- | ------------ | ----------------- |
| **Seleção de Texto** | ❌ Não       | ✅ Sim            |
| **Stack Trace**      | ❌ Não       | ✅ Sim            |
| **Visual**           | ❌ Sistema   | ✅ Customizado    |
| **Instruções**       | ❌ Não       | ✅ Sim            |
| **Console Log**      | ❌ Manual    | ✅ Automático     |
| **Copiar Fácil**     | ❌ Não       | ✅ Botão dedicado |
| **Fecha com ESC**    | ❌ Não       | ✅ Sim            |
| **Animações**        | ❌ Não       | ✅ Sim            |

---

## 🚀 Próximos Passos

### 1. **Testar Salvamento de Empenho**

- Tente salvar uma nota de empenho
- Se der erro, o modal aparecerá
- Copie a mensagem COMPLETA
- Reporte o erro copiado

### 2. **Identificar Causa Raiz**

Com o erro completo (mensagem + stack trace):

- Identificar se é permissão de pasta
- Verificar se é problema do IndexedDB
- Checar se é validação de dados
- Analisar stack trace para localizar origem

### 3. **Aplicar Fix Específico**

Baseado no erro copiado:

- Fix em fsManager.js (se for File System)
- Fix em app.js (se for validação)
- Fix em dbManager.js (se for IndexedDB)

---

## 🎓 Exemplos de Uso

### Exemplo 1: Erro Simples

```javascript
if (!file) {
  this.showError('Nenhum arquivo foi selecionado');
}
```

### Exemplo 2: Erro com Try-Catch

```javascript
try {
  await salvarNoBanco(dados);
} catch (error) {
  this.showError('Erro ao salvar no banco de dados', error);
}
```

### Exemplo 3: Erro com Contexto

```javascript
try {
  const result = await processarPDF(file);
} catch (error) {
  this.showError(`Erro ao processar PDF: ${file.name}\n\n` + 'Verifique se o arquivo não está corrompido.', error);
}
```

---

## 📝 Checklist de Implementação

- [x] Criar função showError() com modal customizado
- [x] Adicionar suporte a detalhes técnicos
- [x] Implementar texto selecionável (user-select: text)
- [x] Adicionar stack trace para objetos Error
- [x] Incluir instruções de suporte
- [x] Adicionar botão "Logar no Console"
- [x] Implementar fechamento com ESC e clique fora
- [x] Adicionar animações CSS
- [x] Atualizar \_salvarArquivoEmpenho() para usar novo sistema
- [x] Documentar sistema completo

---

## 🔗 Arquivos Relacionados

- **js/app.js** - Função showError() (linha ~2713)
- **js/app.js** - \_salvarArquivoEmpenho() (linha ~1612)
- **js/fsManager.js** - saveFileWithFallback() (linha ~540)
- **docs/CORRECAO_SECURITYERROR.md** - Fix anterior de SecurityError

---

## ⚠️ Observações Importantes

1. **SEMPRE passe o objeto Error como segundo parâmetro** quando disponível:

   ```javascript
   catch (error) {
     this.showError('Mensagem amigável', error);  // ✅ CORRETO
   }
   ```

2. **Não use alert() para erros importantes** - use o modal:

   ```javascript
   // ❌ EVITAR:
   alert('Erro ao salvar');

   // ✅ PREFERIR:
   this.showError('Erro ao salvar', errorObject);
   ```

3. **O modal já faz console.error() automaticamente** - não precisa duplicar:

   ```javascript
   // ❌ REDUNDANTE:
   console.error('Erro:', error);
   this.showError('Erro', error);

   // ✅ SUFICIENTE:
   this.showError('Erro', error); // Já loga automaticamente
   ```

---

## 📞 Suporte

Agora com o erro **totalmente copiável**, o suporte técnico pode:

- Ver mensagem exata do erro
- Analisar stack trace completo
- Identificar linha e arquivo do problema
- Reproduzir o erro localmente
- Aplicar fix preciso

**Antes:** "Deu erro ao salvar" ❌  
**Depois:** "NotAllowedError at line 245 in fsManager.js: createWritable() failed" ✅

---

## 🎉 Resultado Final

O usuário agora pode:

1. ✅ Ver erro em modal bonito e profissional
2. ✅ Selecionar e copiar mensagem completa (Ctrl+C)
3. ✅ Ver stack trace técnico detalhado
4. ✅ Seguir instruções claras de suporte
5. ✅ Logar erro no console com 1 clique
6. ✅ Fechar modal com ESC ou clique fora

**Problema resolvido!** 🎊
