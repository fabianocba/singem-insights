# 🔒 Correção do SecurityError - File System Access API

## ❌ Problema Original

**Erro:**

```
SecurityError: Failed to execute 'showDirectoryPicker' on 'Window': Must be handling a user gesture to show a file picker.
```

**Causa:**
O código chamava `showDirectoryPicker()` automaticamente dentro de `_salvarArquivoEmpenho()` → `saveFile()`, sem um gesto explícito do usuário (clique em botão).

---

## ✅ Solução Implementada

### **Princípio da Correção:**

1. **NUNCA** chamar `showDirectoryPicker()` sem gesto do usuário
2. **Botão visível** para usuário selecionar pasta manualmente
3. **Armazenamento persistente** do handle no IndexedDB
4. **Fallback automático** para download direto se não houver permissão

---

## 🔧 Modificações no Código

### **1. fsManager.js - FileSystemManager**

#### **Nova Função: `initializeAsync()`**

```javascript
async initializeAsync() {
  console.log('[FS] 🔄 Inicializando FileSystemManager...');

  // Aguardar banco de dados estar pronto
  let retries = 0;
  const maxRetries = 50;

  while (retries < maxRetries) {
    if (window.dbManager?.db) {
      console.log('[FS] ✅ Banco de dados disponível');
      await this.restoreFolderReference();
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 100));
    retries++;
  }
}
```

**O que faz:**

- Aguarda banco de dados estar pronto
- Tenta restaurar pasta salva anteriormente
- **NÃO** pede permissão ao usuário (apenas verifica)

---

#### **Função Modificada: `selectMainDirectory()`**

```javascript
async selectMainDirectory() {
  console.log('[FS] 🖱️ selectMainDirectory() chamada (via gesto do usuário)');

  if (!this.isSupported) {
    throw new Error('File System Access API não suportada neste navegador');
  }

  try {
    // ✅ showDirectoryPicker() APENAS aqui, chamado por botão do usuário
    console.log('[FS] 📂 Abrindo seletor de pasta...');
    this.mainDirectoryHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });

    console.log('[FS] ✅ Pasta selecionada:', this.mainDirectoryHandle.name);
    await this.saveFolderReference();
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('[FS] ℹ️ Usuário cancelou a seleção de pasta');
      return false;
    }
    console.error('[FS] ❌ Erro ao selecionar pasta principal:', error);
    throw error;
  }
}
```

**O que mudou:**

- ⚠️ **CRÍTICO:** Apenas esta função chama `showDirectoryPicker()`
- ⚠️ **CRÍTICO:** Deve ser chamada apenas via botão do usuário
- Logs detalhados de cada etapa

---

#### **Função Modificada: `restoreFolderReference()`**

```javascript
async restoreFolderReference() {
  try {
    console.log('[FS] 🔄 Tentando restaurar pasta salva...');

    // ... busca handle no IndexedDB ...

    // Verificar se ainda temos permissão
    const permission = await this.mainDirectoryHandle.queryPermission({
      mode: 'readwrite'
    });

    if (permission === 'granted') {
      console.log('[FS] ✅ Permissão válida - pasta restaurada com sucesso');
      return true;
    }

    // ⚠️ NÃO solicitar permissão aqui (seria sem gesto do usuário)
    // Apenas logar e retornar false
    console.warn('[FS] ⚠️ Permissão expirada - usuário precisa clicar no botão');
    this.mainDirectoryHandle = null;
    return false;

  } catch (error) {
    console.error('[FS] ❌ Erro ao restaurar referência da pasta:', error);
    return false;
  }
}
```

**O que mudou:**

- ❌ **REMOVIDO:** `requestPermission()` (causava SecurityError)
- ✅ **ADICIONADO:** Apenas verifica permissão com `queryPermission()`
- ℹ️ Se não tiver permissão, retorna `false` e usa fallback

---

#### **Nova Função: `hasFolderWithPermission()`**

```javascript
async hasFolderWithPermission() {
  if (!this.mainDirectoryHandle) {
    console.log('[FS] ℹ️ Nenhuma pasta configurada');
    return false;
  }

  try {
    const permission = await this.mainDirectoryHandle.queryPermission({
      mode: 'readwrite'
    });

    const hasPermission = permission === 'granted';
    console.log('[FS] 🔐 Status da permissão:', permission, hasPermission ? '✅' : '❌');
    return hasPermission;
  } catch (error) {
    console.error('[FS] ❌ Erro ao verificar permissão:', error);
    return false;
  }
}
```

**O que faz:**

- Verifica se há pasta configurada E com permissão válida
- **NÃO** pede permissão ao usuário
- Retorna `true` ou `false`

---

#### **✨ NOVA FUNÇÃO: `saveFileWithFallback()`**

```javascript
async saveFileWithFallback(file, folderType, extractedText = '', metadados = {}) {
  console.log('[FS] 💾 Iniciando salvamento com fallback...');

  // Validar arquivo primeiro
  this.validateFile(file);

  // Estratégia 1: Tentar salvar na pasta configurada
  if (this.isSupported && this.mainDirectoryHandle) {
    console.log('[FS] 🔍 Verificando permissão da pasta configurada...');

    const hasPermission = await this.hasFolderWithPermission();

    if (hasPermission) {
      console.log('[FS] ✅ Permissão válida - salvando na pasta local...');
      try {
        const result = await this.saveFile(file, folderType, extractedText, metadados);
        console.log('[FS] ✅ Arquivo salvo com sucesso na pasta local!');
        return {
          success: true,
          method: 'local',
          message: 'Arquivo salvo na pasta local configurada',
          ...result
        };
      } catch (error) {
        console.error('[FS] ❌ Erro ao salvar na pasta local:', error);
      }
    } else {
      console.warn('[FS] ⚠️ Sem permissão válida para a pasta');
    }
  }

  // Estratégia 2: Mostrar mensagem para usuário configurar pasta
  if (this.isSupported && !this.mainDirectoryHandle) {
    console.log('[FS] ℹ️ Pasta não configurada - mostrando mensagem ao usuário');
    this.showConfigureFolderMessage();
  }

  // Estratégia 3: Fallback - Download automático
  console.log('[FS] 🔄 Fazendo fallback para download automático...');
  const downloadResult = await this.downloadFile(file, folderType, metadados);

  console.log('[FS] ✅ Download automático concluído');
  return {
    success: true,
    method: 'download',
    message: 'Arquivo baixado automaticamente (pasta não configurada ou sem permissão)',
    ...downloadResult
  };
}
```

**O que faz:**

1. **Tenta salvar** na pasta configurada (se permissão válida)
2. **Mostra mensagem** se pasta não configurada
3. **Faz download** automático (fallback)
4. **NUNCA falha** - sempre tem fallback

---

#### **Nova Função: `downloadFile()`**

```javascript
async downloadFile(file, folderType, metadados = {}) {
  console.log('[FS] 📥 Iniciando download direto...');

  // Gerar nome padronizado
  let fileName = file.name;
  if (metadados && metadados.numero && metadados.fornecedor) {
    fileName = this.gerarNomeArquivoPadronizado(folderType, metadados.numero, metadados.fornecedor);
  }

  // Criar URL do blob e baixar
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Limpar
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);

  console.log('[FS] ✅ Download iniciado:', fileName);
  return { fileName, originalName: file.name, size: file.size, timestamp: new Date().toISOString() };
}
```

**O que faz:**

- Faz download direto do arquivo via blob URL
- Usa nome padronizado (NE 123 FORNECEDOR.pdf)
- Limpa recursos após download

---

### **2. app.js - Função `_salvarArquivoEmpenho()`**

#### **ANTES (❌ Com SecurityError):**

```javascript
async _salvarArquivoEmpenho(file, textContent, extractedData) {
  if (!window.fsManager || !window.fsManager.isFileSystemAPISupported()) {
    return null;
  }

  try {
    // ❌ PROBLEMA: Chama selectMainDirectory() automaticamente
    if (!window.fsManager.mainDirectoryHandle) {
      const configurar = confirm('Deseja configurar uma pasta...');
      if (configurar) {
        // ❌ showDirectoryPicker() SEM gesto do usuário
        await window.fsManager.selectMainDirectory();
      }
    }

    // Salva arquivo
    const arquivoInfo = await window.fsManager.saveFile(file, 'empenhos', textContent, metadados);
    return arquivoInfo;
  } catch (error) {
    console.warn('Erro ao salvar arquivo:', error);
  }

  return null;
}
```

#### **DEPOIS (✅ Sem SecurityError):**

```javascript
async _salvarArquivoEmpenho(file, textContent, extractedData) {
  console.log('[APP] 💾 Iniciando salvamento de empenho...');

  if (!window.fsManager || !window.fsManager.isFileSystemAPISupported()) {
    console.warn('[APP] ⚠️ File System Access API não suportada');
    return null;
  }

  try {
    // Preparar metadados
    const metadados = {
      numero: extractedData.numero,
      fornecedor: extractedData.fornecedor,
      data: extractedData.data
    };

    console.log('[APP] 📋 Metadados:', metadados);

    // ✅ USA NOVA FUNÇÃO COM FALLBACK AUTOMÁTICO
    // NÃO chama showDirectoryPicker() automaticamente
    const result = await window.fsManager.saveFileWithFallback(
      file,
      'empenhos',
      textContent,
      metadados
    );

    console.log('[APP] ✅ Salvamento concluído:', result.method);

    // Mostrar mensagem apropriada
    if (result.method === 'download') {
      this.showInfo(
        '📥 Arquivo baixado automaticamente!\n\n' +
        'Para salvar automaticamente na pasta local:\n' +
        '1. Clique no botão "📁 Selecionar Pasta Principal"\n' +
        '2. Escolha onde deseja salvar os arquivos\n' +
        '3. Os próximos arquivos serão salvos automaticamente'
      );
    }

    return result;
  } catch (error) {
    console.error('[APP] ❌ Erro ao salvar arquivo:', error);
    return null;
  }
}
```

**O que mudou:**

- ❌ **REMOVIDO:** Chamada automática a `selectMainDirectory()`
- ❌ **REMOVIDO:** Confirm modal
- ✅ **ADICIONADO:** Usa `saveFileWithFallback()` com 3 estratégias
- ✅ **ADICIONADO:** Mensagem informativa após fallback
- ✅ **ADICIONADO:** Logs detalhados com prefixo `[APP]`

---

### **3. index.html - Interface do Usuário**

#### **Botão "Selecionar Pasta Principal" (nas abas)**

```html
<!-- Abas de navegação -->
<div class="tabs-container">
  <button class="tab-btn active" data-tab="cadastro">📝 Novo Cadastro</button>
  <button class="tab-btn" data-tab="controle-saldos">📊 Controle de Saldos</button>
  <button class="tab-btn" data-tab="relatorio">📋 Relatório de Empenhos</button>

  <!-- ✅ BOTÃO PARA SELECIONAR PASTA -->
  <button
    onclick="window.fsManager?.selectMainDirectory().then(ok => ok && alert('✅ Pasta configurada!'))"
    style="margin-left: auto; background: linear-gradient(135deg, #1976d2, #1565c0); color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: 600;"
    title="Selecione a pasta onde os PDFs serão salvos automaticamente"
  >
    📁 Selecionar Pasta Principal
  </button>
</div>
```

**O que faz:**

- Botão **visível** no canto superior direito
- Chama `selectMainDirectory()` via **onclick** (gesto do usuário)
- Mostra alert de confirmação

---

#### **Mensagem de Configuração (amarela)**

```html
<!-- ✅ MENSAGEM DE CONFIGURAÇÃO -->
<div id="fs-config-message" style="display: none; background: #fff3cd; border: 1px solid #ffc107; ...">
  <div style="display: flex; align-items: center; gap: 10px;">
    <span style="font-size: 24px;">⚠️</span>
    <div style="flex: 1;">
      <strong>Pasta não configurada</strong>
      <p style="...">
        Para salvar PDFs automaticamente, clique no botão abaixo. Sem configurar, os arquivos serão baixados
        normalmente.
      </p>
    </div>
    <button
      onclick="window.fsManager?.selectMainDirectory().then(ok => ok && (document.getElementById('fs-config-message').style.display = 'none'))"
      style="background: #28a745; color: white; ..."
    >
      📁 Selecionar Pasta
    </button>
  </div>
</div>
```

**O que faz:**

- Mensagem amarela (warning) quando pasta não configurada
- Botão inline para configurar rapidamente
- Oculta automaticamente após configuração

---

## 🎯 Fluxo de Funcionamento

### **Cenário 1: Pasta Configurada COM Permissão**

```
1. Usuário faz upload de PDF
2. fsManager.saveFileWithFallback() chamada
3. Verifica: pasta configurada? ✅
4. Verifica: permissão válida? ✅
5. Salva na pasta local ✅
6. Logs: [FS] ✅ Arquivo salvo com sucesso na pasta local!
```

### **Cenário 2: Pasta Configurada SEM Permissão**

```
1. Usuário faz upload de PDF
2. fsManager.saveFileWithFallback() chamada
3. Verifica: pasta configurada? ✅
4. Verifica: permissão válida? ❌
5. Faz download automático (fallback) 📥
6. Mostra mensagem: "Para salvar automaticamente, clique no botão..."
7. Logs: [FS] ⚠️ Sem permissão - fallback para download
```

### **Cenário 3: Pasta NÃO Configurada**

```
1. Usuário faz upload de PDF
2. fsManager.saveFileWithFallback() chamada
3. Verifica: pasta configurada? ❌
4. Mostra mensagem amarela ⚠️
5. Faz download automático (fallback) 📥
6. Logs: [FS] ℹ️ Pasta não configurada - fallback para download
```

### **Cenário 4: Usuário Clica no Botão "Selecionar Pasta"**

```
1. Usuário clica no botão 🖱️
2. fsManager.selectMainDirectory() chamada (GESTO DO USUÁRIO) ✅
3. showDirectoryPicker() abre (SEM SecurityError) ✅
4. Usuário escolhe pasta 📁
5. Handle salvo no IndexedDB 💾
6. Próximos uploads salvam automaticamente ✅
7. Logs: [FS] ✅ Pasta selecionada e salva
```

---

## 📊 Resultados

### **✅ Problemas Resolvidos:**

- ❌ SecurityError **ELIMINADO** completamente
- ❌ Chamadas automáticas a `showDirectoryPicker()` **REMOVIDAS**
- ❌ Confirm modals bloqueantes **REMOVIDOS**

### **✅ Funcionalidades Garantidas:**

- ✅ Funciona **SEM** configuração (download automático)
- ✅ Funciona **COM** configuração (salvamento local)
- ✅ Permissão persistente via IndexedDB
- ✅ Fallback transparente e automático
- ✅ UX melhorada com botão visível e mensagens
- ✅ Logs claros de cada operação

---

## 🔍 Como Testar

### **Teste 1: Sem Configuração (Fallback)**

```
1. Abra index.html
2. Vá em "Cadastro de Empenho"
3. Faça upload de um PDF
4. Resultado esperado:
   ✅ Download automático inicia
   ✅ Mensagem amarela aparece
   ✅ Logs no console: [FS] Fallback para download
```

### **Teste 2: Configurar Pasta**

```
1. Clique no botão "📁 Selecionar Pasta Principal"
2. Escolha uma pasta no seu computador
3. Resultado esperado:
   ✅ Alert: "Pasta configurada com sucesso"
   ✅ Logs: [FS] ✅ Pasta selecionada: [nome]
```

### **Teste 3: Com Pasta Configurada**

```
1. (Após configurar pasta)
2. Faça upload de outro PDF
3. Resultado esperado:
   ✅ Arquivo salvo na pasta local
   ✅ NÃO faz download
   ✅ Logs: [FS] ✅ Arquivo salvo com sucesso na pasta local!
```

### **Teste 4: Verificar Estrutura de Pastas**

```
1. Abra a pasta configurada no explorador
2. Estrutura esperada:
   [Pasta Escolhida]/
     └── [Abreviação Unidade]/
         └── [Ano]/
             └── Notas de Empenho/
                 └── NE 123 FORNECEDOR.pdf
```

---

## 🛠️ Troubleshooting

### **"SecurityError ainda aparece"**

```
Verifique:
1. Botão chama selectMainDirectory() via onclick? ✅
2. Nenhum código chama showDirectoryPicker() automaticamente? ✅
3. saveFileWithFallback() é usado ao invés de saveFile()? ✅
```

### **"Arquivo não salva na pasta"**

```
Verifique:
1. Pasta foi configurada clicando no botão? ✅
2. Permissão foi concedida pelo navegador? ✅
3. Logs mostram "Permissão válida"? ✅
```

### **"Download não inicia"**

```
Verifique:
1. Navegador bloqueia downloads automáticos? ❌
2. Permissões do navegador para downloads? ✅
3. Popup blocker ativo? ❌
```

---

## 📚 Referências

- **File System Access API:** https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API
- **Security Requirements:** https://developer.chrome.com/articles/file-system-access/#security-considerations
- **User Gesture:** https://html.spec.whatwg.org/multipage/interaction.html#transient-activation

---

## ✅ Checklist de Implementação

- [x] Remover chamadas automáticas a `showDirectoryPicker()`
- [x] Criar botão visível "Selecionar Pasta Principal"
- [x] Implementar `saveFileWithFallback()` com 3 estratégias
- [x] Implementar `downloadFile()` (fallback)
- [x] Adicionar `hasFolderWithPermission()` (verificação sem pedido)
- [x] Modificar `restoreFolderReference()` (sem `requestPermission()`)
- [x] Adicionar logs detalhados com prefixos `[FS]` e `[APP]`
- [x] Criar mensagem amarela de configuração
- [x] Atualizar `_salvarArquivoEmpenho()` para usar fallback
- [x] Testar todos os 4 cenários
- [x] Documentar solução completa

---

**🎉 SecurityError RESOLVIDO! Sistema funciona perfeitamente com ou sem configuração de pasta!**
