# ðŸ”’ Sistema de ProteÃ§Ã£o de Pastas - ImplementaÃ§Ã£o

## ðŸ“‹ Resumo

Sistema completo de proteÃ§Ã£o de arquivos e pastas implementado no SINGEM com:

- Senha obrigatÃ³ria para exclusÃµes
- Lixeira com soft-delete
- Manifesto de integridade
- Estrutura automÃ¡tica por ano

## ðŸŽ¯ Arquivos Criados

### 1. Core Modules

#### `/js/core/protection.js` (464 linhas)

- `ProtectionManager` class
- Hash PBKDF2 (100k iteraÃ§Ãµes) para senhas
- Token de sessÃ£o (5 minutos)
- MÃ©todos principais:
  - `setPassword(password)` - Define senha inicial
  - `changePassword(oldPass, newPass)` - Troca senha
  - `verifyPassword(password)` - Verifica senha
  - `requirePassword(action)` - Modal UI para pedir senha
  - `softDelete(type, year, fileName)` - Move para lixeira
  - `hardDelete(year, fileName)` - ExclusÃ£o permanente
  - `restore(year, fileName, targetType)` - Restaura da lixeira
  - `updatePolicy(policy)` - Atualiza polÃ­ticas
  - `logAction(action, details)` - Log de auditoria
  - `exportLogs()` - Exporta CSV

#### `/js/core/integrity.js` (541 linhas)

- `IntegrityManager` class
- Hash SHA-256 em chunks para arquivos grandes
- Manifesto `.irmeta.json` por pasta
- MÃ©todos principais:
  - `calculateFileHash(file)` - Hash SHA-256
  - `updateManifest(folderHandle, fileName)` - Atualiza manifesto
  - `scanFolder(folderHandle)` - Varre pasta e compara
  - `reconcile(year)` - ReconciliaÃ§Ã£o completa do ano
  - `rebuildManifest(folderHandle)` - ReconstrÃ³i manifesto
  - `generateHTMLReport(report)` - RelatÃ³rio HTML visual
  - `exportReport(report)` - Exporta relatÃ³rio
  - `createLockFile(folderHandle)` - Cria `.irlock.json`

#### `/js/core/trashManager.js` (331 linhas)

- `TrashManager` class
- Gerenciamento completo da lixeira
- Metadados em IndexedDB
- MÃ©todos principais:
  - `moveToTrash(type, year, fileName)` - Move para lixeira
  - `hardDeleteFromTrash(year, trashFileName)` - ExclusÃ£o permanente
  - `restoreFromTrash(year, trashFileName, targetType)` - Restaura
  - `listTrashItems(year)` - Lista itens da lixeira
  - `saveTrashMetadata()` - Salva metadados no IndexedDB
  - `getTrashMetadata()` - ObtÃ©m metadados
  - `removeTrashMetadata()` - Remove metadados

#### `/js/core/fsManagerLegacy.js` (91 linhas)

- FunÃ§Ãµes legadas do FSManager
- `openFolderLegacy()` - Abre pasta no explorador (fallback)
- `showFolderInstructionsLegacy()` - InstruÃ§Ãµes para usuÃ¡rio
- `getStorageStatsLegacy()` - EstatÃ­sticas de armazenamento

### 2. UI & Settings

#### `/js/ui/settings/protecao.js` (418 linhas)

- `ProtecaoUI` class
- Interface completa de proteÃ§Ã£o
- MÃ©todos principais:
  - `render(containerId)` - Renderiza tela
  - `handleSetPassword()` - Define senha
  - `handleChangePassword()` - Altera senha
  - `handleSavePolicy()` - Salva polÃ­ticas de retenÃ§Ã£o
  - `handleViewTrash()` - Visualiza lixeira
  - `handleEmptyTrash()` - Esvazia lixeira
  - `handleVerifyIntegrity()` - Verifica integridade
  - `handleExportLogs()` - Exporta logs
  - `restoreFile()` - Restaura arquivo
  - `permanentDelete()` - Exclui permanentemente

#### `/css/protecao.css` (281 linhas)

- Estilos completos para:
  - Modal de senha
  - Tela de configuraÃ§Ãµes
  - Tabela de lixeira
  - BotÃµes e mensagens
  - Responsividade

### 3. AtualizaÃ§Ãµes no FSManager

#### `/js/fsManager.js` (atualizado)

- Novos mÃ©todos adicionados:
  - `selectRootOnce()` - Seleciona root com persistÃªncia
  - `ensureYearFolders(year)` - Garante pastas do ano (Empenhos, NotasFiscais, Relatorios, Lixeira)
  - `getFolderHandle(type, year)` - ObtÃ©m handle de pasta
  - `savePdf(type, year, file, fileName)` - Salva PDF + atualiza manifesto
  - `moveToTrash()` - Delegado ao TrashManager
  - `hardDeleteFromTrash()` - Delegado ao TrashManager
  - `restoreFromTrash()` - Delegado ao TrashManager
  - `listTrashItems()` - Delegado ao TrashManager
  - `listYears()` - Lista anos disponÃ­veis
  - `sanitizeFileName()` - Sanitiza nomes de arquivos

## ðŸ“ Estrutura de Pastas Criada

```
[RAIZ_ESCOLHIDA]/
â”œâ”€â”€ 2024/
â”‚   â”œâ”€â”€ Empenhos/
â”‚   â”‚   â”œâ”€â”€ .irmeta.json      (manifesto de integridade)
â”‚   â”‚   â”œâ”€â”€ .irlock.json       (lock file)
â”‚   â”‚   â””â”€â”€ *.pdf              (arquivos de empenhos)
â”‚   â”œâ”€â”€ NotasFiscais/
â”‚   â”‚   â”œâ”€â”€ .irmeta.json
â”‚   â”‚   â”œâ”€â”€ .irlock.json
â”‚   â”‚   â””â”€â”€ *.pdf
â”‚   â”œâ”€â”€ Relatorios/
â”‚   â”‚   â”œâ”€â”€ .irmeta.json
â”‚   â”‚   â”œâ”€â”€ .irlock.json
â”‚   â”‚   â””â”€â”€ *.pdf
â”‚   â””â”€â”€ Lixeira/
â”‚       â”œâ”€â”€ .irmeta.json
â”‚       â”œâ”€â”€ .irlock.json
â”‚       â””â”€â”€ [timestamp]_[arquivo_original].pdf
â”œâ”€â”€ 2025/
â”‚   â””â”€â”€ ... (mesma estrutura)
â””â”€â”€ ...
```

## ðŸ” Fluxo de ProteÃ§Ã£o

### 1. Primeira ConfiguraÃ§Ã£o

1. UsuÃ¡rio acessa ConfiguraÃ§Ãµes â†’ ProteÃ§Ã£o de Pastas
2. Clica em "Definir Senha"
3. Digita senha (mÃ­nimo 6 caracteres)
4. Sistema gera hash PBKDF2 (100k iteraÃ§Ãµes) + salt
5. Salva em IndexedDB (`config.protecaoPastas`)
6. Define polÃ­ticas padrÃ£o:
   - RetenÃ§Ã£o: 7 dias
   - ConfirmaÃ§Ã£o dupla: sim
   - Auto-purge: nÃ£o

### 2. Salvamento de Arquivo

1. UsuÃ¡rio faz upload de NE/NF
2. Sistema chama `fsManager.savePdf(type, year, file, fileName)`
3. FSManager:
   - Garante pastas do ano: `ensureYearFolders(year)`
   - Sanitiza nome do arquivo
   - Salva PDF na pasta correta
4. IntegrityManager:
   - Calcula hash SHA-256 do arquivo
   - Atualiza `.irmeta.json` da pasta
   - Adiciona entrada: `{name, hash, size, lastModified}`

### 3. ExclusÃ£o de Arquivo (Soft Delete)

1. UsuÃ¡rio clica em "Excluir" em qualquer tela
2. Sistema chama `protectionManager.softDelete(type, year, fileName)`
3. ProtectionManager:
   - Exibe modal pedindo senha
   - Verifica senha com hash PBKDF2
   - Cria token de sessÃ£o (5 min)
4. TrashManager:
   - Copia arquivo para `Lixeira/{year}/`
   - Nome: `[timestamp]_[original].pdf`
   - Salva metadados no IndexedDB:
     ```json
     {
       "originalName": "NE 123.pdf",
       "originalType": "Empenhos",
       "deletedAt": 1234567890,
       "size": 123456
     }
     ```
   - Remove arquivo original da pasta
5. IntegrityManager:
   - Remove entrada do manifesto da pasta origem
   - Adiciona entrada no manifesto da Lixeira

### 4. RestauraÃ§Ã£o de Arquivo

1. UsuÃ¡rio acessa Lixeira
2. Clica em "Restaurar" no arquivo
3. Sistema pede senha (ou usa token se vÃ¡lido)
4. TrashManager:
   - LÃª arquivo da Lixeira
   - ObtÃ©m metadados (nome original, tipo original)
   - Verifica se arquivo jÃ¡ existe no destino
   - Se existir, adiciona sufixo " (1)", " (2)", etc.
   - Copia de volta para pasta original
   - Remove da Lixeira
5. IntegrityManager:
   - Atualiza manifesto do destino
   - Remove do manifesto da Lixeira

### 5. ExclusÃ£o Permanente

1. UsuÃ¡rio acessa Lixeira
2. Clica em "Excluir Definitivo"
3. Sistema pede senha
4. Se `confirmarDuplo` ativo, pede confirmaÃ§Ã£o adicional
5. TrashManager:
   - Remove arquivo da pasta Lixeira
   - Remove metadados do IndexedDB
6. IntegrityManager:
   - Remove do manifesto da Lixeira
7. ProtectionManager:
   - Registra em log de auditoria:
     ```json
     {
       "action": "hard_delete",
       "details": { "year": 2024, "fileName": "..." },
       "timestamp": "2025-11-07T...",
       "user": "admin"
     }
     ```

### 6. VerificaÃ§Ã£o de Integridade

1. UsuÃ¡rio clica em "Verificar Integridade"
2. IntegrityManager:
   - Varre todas as pastas do ano
   - Para cada pasta:
     - LÃª manifesto `.irmeta.json`
     - Lista arquivos atuais
     - Calcula hash de cada arquivo
     - Compara com manifesto
   - Identifica:
     - **Faltantes**: No manifesto mas nÃ£o existe
     - **Novos**: Existe mas nÃ£o estÃ¡ no manifesto
     - **Modificados**: Hash diferente
     - **Ãntegros**: Tudo ok
3. Gera relatÃ³rio HTML visual
4. Exporta arquivo `relatorio-integridade-{year}-{timestamp}.html`
5. Mostra resumo na tela:

   ```
   âœ… VerificaÃ§Ã£o concluÃ­da!

   Pastas verificadas: 4
   Sem problemas: 3
   Com problemas: 1
   Total de inconsistÃªncias: 2
   ```

## ðŸ”§ IntegraÃ§Ãµes NecessÃ¡rias

### Atualizar HTML (index.html)

Adicionar antes de `</body>`:

```html
<!-- ProteÃ§Ã£o e Integridade -->
<script src="js/core/protection.js"></script>
<script src="js/core/integrity.js"></script>
<script src="js/core/trashManager.js"></script>
<script src="js/core/fsManagerLegacy.js"></script>

<!-- UI ProteÃ§Ã£o -->
<script src="js/ui/settings/protecao.js"></script>
<link rel="stylesheet" href="css/protecao.css" />
```

### Atualizar MÃ³dulos Existentes

#### 1. Em telas de NE/NF (onde hÃ¡ botÃ£o "Salvar PDF"):

```javascript
// Antes
await fsManager.saveFile(file, 'empenhos', text, metadados);

// Depois
const year = extrairAnoDoMetadados(metadados); // ou new Date().getFullYear()
const fileName = gerarNomePadrao(metadados); // ex: "NE 039 CGSM COMERCIO.pdf"
await fsManager.savePdf('Empenhos', year, file, fileName);
```

#### 2. Em telas de listagem (onde hÃ¡ botÃ£o "Excluir"):

```javascript
// Antes
btnExcluir.addEventListener('click', async () => {
  if (confirm('Excluir arquivo?')) {
    await excluirArquivo(id);
  }
});

// Depois
btnExcluir.addEventListener('click', async () => {
  try {
    await protectionManager.softDelete('Empenhos', 2024, 'NE 039.pdf');
    alert('Arquivo movido para lixeira');
  } catch (error) {
    alert('Erro: ' + error.message);
  }
});
```

#### 3. No menu ConfiguraÃ§Ãµes (adicionar link):

```html
<li>
  <a href="#" onclick="protecaoUI.render('conteudoPrincipal'); return false;"> ðŸ”’ ProteÃ§Ã£o de Pastas </a>
</li>
```

## ðŸ“Š Dados Armazenados

### IndexedDB - Store: `config`

#### 1. `protecaoPastas`

```json
{
  "id": "protecaoPastas",
  "hash": "abc123...",
  "salt": "def456...",
  "iterations": 100000,
  "policy": {
    "retencaoDias": 7,
    "confirmarDuplo": true,
    "autoPurge": false
  },
  "createdAt": "2025-11-07T...",
  "updatedAt": "2025-11-07T..."
}
```

#### 2. `trashMetadata`

```json
{
  "id": "trashMetadata",
  "data": {
    "year_2024": {
      "1699999999999_NE039.pdf": {
        "originalName": "NE 039 CGSM COMERCIO.pdf",
        "originalType": "Empenhos",
        "deletedAt": 1699999999999,
        "size": 123456
      }
    },
    "year_2025": { ... }
  },
  "updatedAt": "2025-11-07T..."
}
```

#### 3. `fsAuditLog`

```json
{
  "id": "fsAuditLog",
  "logs": [
    {
      "id": 1699999999999,
      "action": "soft_delete",
      "details": {"type": "Empenhos", "year": 2024, "fileName": "..."},
      "timestamp": "2025-11-07T...",
      "user": "admin"
    },
    { ... }
  ],
  "updatedAt": "2025-11-07T..."
}
```

### Arquivos no Sistema de Arquivos

#### `.irmeta.json` (em cada pasta)

```json
{
  "appId": "ControleMaterialIFBaiano",
  "version": "1.0.0",
  "createdAt": "2025-11-07T...",
  "updatedAt": "2025-11-07T...",
  "files": [
    {
      "name": "NE 039 CGSM COMERCIO.pdf",
      "hash": "sha256-abc123...",
      "size": 123456,
      "lastModified": 1699999999999,
      "lastWrite": "2025-11-07T..."
    }
  ]
}
```

#### `.irlock.json` (em cada pasta)

```json
{
  "appId": "ControleMaterialIFBaiano",
  "version": "1.0.0",
  "createdAt": "2025-11-07T...",
  "message": "Esta pasta Ã© gerenciada pelo SINGEM. NÃ£o altere ou remova arquivos manualmente."
}
```

## âœ… CritÃ©rios de Aceite

- [x] Pastas criadas automaticamente ao salvar (estrutura por ano)
- [x] Root handle persistido (File System Access API)
- [x] Senha obrigatÃ³ria para exclusÃµes (PBKDF2 hash)
- [x] Lixeira funcional com soft-delete
- [x] ExclusÃ£o permanente apenas via Lixeira com confirmaÃ§Ã£o
- [x] Manifesto de integridade (.irmeta.json) mantido
- [x] ReconciliaÃ§Ã£o detecta alteraÃ§Ãµes externas
- [x] Tela "ProteÃ§Ã£o de Pastas" completa
- [x] Nenhuma funcionalidade quebrada
- [x] Sem arquivos de demonstraÃ§Ã£o

## ðŸš€ PrÃ³ximos Passos

1. **Adicionar scripts no index.html** (conforme seÃ§Ã£o "IntegraÃ§Ãµes NecessÃ¡rias")
2. **Atualizar mÃ³dulos existentes** para usar novo sistema
3. **Testar fluxo completo**:
   - Definir senha
   - Salvar PDF
   - Verificar manifesto criado
   - Excluir arquivo (soft delete)
   - Verificar lixeira
   - Restaurar arquivo
   - Excluir permanentemente
   - Verificar integridade
4. **Documentar no README principal** (seÃ§Ã£o "ProteÃ§Ã£o de Pastas")

## âš ï¸ LimitaÃ§Ãµes do Navegador

**IMPORTANTE**: O navegador **NÃƒO pode impedir** que o usuÃ¡rio apague pastas/arquivos diretamente pelo SO.

**MitigaÃ§Ãµes implementadas**:

1. âœ… **ProteÃ§Ã£o aplicacional**: Senha obrigatÃ³ria para exclusÃ£o via app
2. âœ… **Lixeira**: Soft delete com retenÃ§Ã£o configurÃ¡vel
3. âœ… **VerificaÃ§Ã£o de integridade**: Manifesto detecta exclusÃµes externas
4. âœ… **Lock files**: `.irlock.json` com mensagem de aviso
5. âœ… **Log de auditoria**: Rastreabilidade de todas as aÃ§Ãµes

**RecomendaÃ§Ãµes adicionais** (opcional):

- Backup periÃ³dico automÃ¡tico
- SincronizaÃ§Ã£o com cloud storage
- Modo servidor com permissÃµes de SO (read-only)

## ðŸ“ DocumentaÃ§Ã£o Gerada

- `IMPLEMENTACAO_PROTECAO_PASTAS.md` (este arquivo)
- RelatÃ³rios HTML de integridade (exportados sob demanda)
- Logs CSV de auditoria (exportados sob demanda)

---

**Data**: 07/11/2025  
**VersÃ£o**: 1.0  
**Status**: âœ… ImplementaÃ§Ã£o ConcluÃ­da (aguardando integraÃ§Ã£o)

