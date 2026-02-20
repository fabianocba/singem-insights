# ðŸ”’ Sistema de Backup e RestauraÃ§Ã£o - SINGEM

## ðŸ“Œ VisÃ£o Geral

O **Sistema de Backup AutomÃ¡tico** do SINGEM garante que **nenhum dado seja perdido** e mantÃ©m um **histÃ³rico completo** de todas as alteraÃ§Ãµes feitas na aplicaÃ§Ã£o.

---

## âœ¨ Funcionalidades

### 1ï¸âƒ£ **Backup AutomÃ¡tico**

- âœ… Backup criado automaticamente **antes e depois** de cada operaÃ§Ã£o crÃ­tica
- âœ… Backup ao carregar a aplicaÃ§Ã£o
- âœ… Backup antes de salvar/editar usuÃ¡rios
- âœ… Backup antes de restaurar dados

### 2ï¸âƒ£ **HistÃ³rico de AlteraÃ§Ãµes (Changelog)**

- âœ… Registro detalhado de **todas** as operaÃ§Ãµes realizadas
- âœ… Timestamp preciso de cada aÃ§Ã£o
- âœ… InformaÃ§Ãµes sobre usuÃ¡rio/unidade modificados
- âœ… Tipo de operaÃ§Ã£o (salvar, editar, excluir, restaurar)

### 3ï¸âƒ£ **RestauraÃ§Ã£o de Dados**

- âœ… Restaurar qualquer backup com 1 clique
- âœ… Backup de seguranÃ§a criado **antes** da restauraÃ§Ã£o
- âœ… Lista de backups ordenados por data (mais recente primeiro)

### 4ï¸âƒ£ **ImportaÃ§Ã£o/ExportaÃ§Ã£o**

- âœ… Exportar backup para arquivo JSON
- âœ… Importar backup de arquivo externo
- âœ… Transferir dados entre navegadores/computadores

---

## ðŸš€ Como Usar

### **Acesso RÃ¡pido**

1. Acesse: **http://localhost:8080/config/gerenciar-backups.html**
2. Ou clique no menu: **ConfiguraÃ§Ãµes â†’ Gerenciar Backups**

### **Criar Backup Manual**

```
1. Clique em "ðŸ’¾ Criar Backup Agora"
2. Aguarde confirmaÃ§Ã£o
3. O backup aparece no topo da lista
```

### **Restaurar Backup**

```
1. Localize o backup desejado na lista
2. Clique em "â†©ï¸ Restaurar"
3. Confirme a operaÃ§Ã£o (âš ï¸ CUIDADO: sobrescreve dados atuais)
4. Aguarde e recarregue a pÃ¡gina
```

### **Exportar Backup**

```
1. Clique em "ðŸ“¤ Exportar" no backup desejado
2. Salve o arquivo JSON em local seguro
3. Use para backup externo ou transferÃªncia
```

### **Importar Backup**

```
1. Clique em "ðŸ“¥ Importar Backup"
2. Selecione o arquivo JSON
3. O backup serÃ¡ adicionado Ã  lista
```

---

## ðŸ” InformaÃ§Ãµes dos Backups

Cada backup mostra:

- **ID**: Identificador Ãºnico
- **Tipo**:
  - ðŸ¤– **AutomÃ¡tico** - Criado pelo sistema
  - ðŸ‘¤ **Manual** - Criado pelo usuÃ¡rio
  - ðŸ“¥ **Importado** - Vindo de arquivo externo
  - ðŸ”„ **RestauraÃ§Ã£o** - Criado antes de restaurar
- **Data/Hora**: Timestamp preciso
- **UsuÃ¡rios**: Quantidade de usuÃ¡rios salvos
- **Unidades**: Quantidade de unidades salvas
- **Tamanho**: Tamanho do backup em KB/MB

---

## ðŸ“ HistÃ³rico de AlteraÃ§Ãµes (Changelog)

O changelog registra **todas** as operaÃ§Ãµes:

### Tipos de AÃ§Ãµes

- ðŸ’¾ **UsuÃ¡rio Salvo** - CriaÃ§Ã£o ou ediÃ§Ã£o de usuÃ¡rio
- ðŸ—‘ï¸ **UsuÃ¡rio ExcluÃ­do** - RemoÃ§Ã£o de usuÃ¡rio
- ðŸ¢ **Unidade Salva** - CriaÃ§Ã£o ou ediÃ§Ã£o de unidade
- â†©ï¸ **Backup Restaurado** - RestauraÃ§Ã£o de dados
- ðŸ“¥ **Backup Importado** - ImportaÃ§Ã£o de backup

### Detalhes Registrados

- Login do usuÃ¡rio
- Nome do usuÃ¡rio
- ID do backup (em restauraÃ§Ãµes)
- Timestamp preciso

---

## ðŸ”§ TÃ©cnico

### **Armazenamento**

- **IndexedDB** - Store: `backups`
- **Estrutura**:

```javascript
{
  id: 1,
  timestamp: "2025-11-07T10:30:00.000Z",
  type: "auto" | "manual" | "imported" | "pre-restore",
  version: 3,
  data: {
    usuarios: { usuarios: [...], dataAtualizacao: "..." },
    unidades: { unidades: [...] },
    unidadeOrcamentaria: { codigo: "..." }
  },
  userAgent: "Mozilla/5.0...",
  appVersion: "1.3.1"
}
```

### **IntegraÃ§Ã£o AutomÃ¡tica**

```javascript
// Em repository.js - saveUsuario()
if (window.dataBackupManager) {
  // Backup ANTES de salvar
  await window.dataBackupManager.createAutoBackup('pre-save-usuario');

  // Registra no changelog
  await window.dataBackupManager.logChange('save_usuario', {
    usuarioId: usuario.id,
    login: usuario.login,
    nome: usuario.nome
  });

  // ... operaÃ§Ã£o de salvamento ...

  // Backup DEPOIS de salvar (sucesso)
  await window.dataBackupManager.createAutoBackup('post-save-usuario');
}
```

### **API DisponÃ­vel**

```javascript
// Criar backup
await window.dataBackupManager.createAutoBackup('manual');

// Listar backups
const backups = await window.dataBackupManager.listBackups();

// Restaurar backup
await window.dataBackupManager.restoreBackup(backupId);

// Exportar backup
await window.dataBackupManager.exportBackup(backupId);

// Importar backup
await window.dataBackupManager.importBackup(file);

// Obter changelog
const changes = await window.dataBackupManager.getChangelog(50);

// Registrar mudanÃ§a
await window.dataBackupManager.logChange('custom_action', {
  key: 'value'
});
```

---

## âš ï¸ Avisos Importantes

### **Ao Restaurar Backup**

1. âš ï¸ **TODOS** os dados atuais serÃ£o **substituÃ­dos**
2. âœ… Um backup de seguranÃ§a Ã© criado **antes** da restauraÃ§Ã£o
3. ðŸ”„ Ã‰ necessÃ¡rio **recarregar a pÃ¡gina** apÃ³s restaurar
4. âŒ A operaÃ§Ã£o **NÃƒO pode ser desfeita** (exceto restaurando outro backup)

### **Limpeza AutomÃ¡tica**

- ðŸ—‘ï¸ Apenas os **Ãºltimos 10 backups** sÃ£o mantidos
- â° Backups mais antigos sÃ£o **removidos automaticamente**
- ðŸ’¾ Exporte backups importantes para **arquivo externo**

### **Backup Externo**

- ðŸ’¡ Recomendado: **exportar backups semanalmente**
- ðŸ“ Salvar em: nuvem, pendrive, outro computador
- ðŸ”’ ProteÃ§Ã£o contra: falha do HD, reinstalaÃ§Ã£o do Windows, corrupÃ§Ã£o do navegador

---

## ðŸ› SoluÃ§Ã£o de Problemas

### **"Nenhum backup encontrado"**

```
SoluÃ§Ã£o: Crie o primeiro backup manualmente
Clique em "ðŸ’¾ Criar Backup Agora"
```

### **"Erro ao restaurar backup"**

```
1. Verifique se o backup estÃ¡ na lista
2. Tente recarregar a pÃ¡gina (F5)
3. Abra Console (F12) para ver erros
4. Importe backup externo se necessÃ¡rio
```

### **"Preciso recuperar dados antigos"**

```
1. Localize o backup com a data desejada
2. Verifique quantidade de usuÃ¡rios/unidades
3. Clique em "â†©ï¸ Restaurar"
4. Confirme a operaÃ§Ã£o
```

### **"Perdi tudo apÃ³s limpar navegador"**

```
âŒ Se nÃ£o houver backup externo, dados perdidos
âœ… Sempre exporte backups importantes!
ðŸ“¥ Importe o backup externo se tiver
```

---

## ðŸ“Š Exemplo de Uso

### **CenÃ¡rio: EdiÃ§Ã£o Acidental**

```
1. UsuÃ¡rio edita dados incorretamente
2. Salva as alteraÃ§Ãµes
3. Percebe o erro

âœ… SOLUÃ‡ÃƒO:
- Acesse "Gerenciar Backups"
- Localize backup ANTES da ediÃ§Ã£o (timestamp)
- Clique em "â†©ï¸ Restaurar"
- Dados voltam ao estado anterior
```

### **CenÃ¡rio: Transferir Entre Computadores**

```
1. Computador A: Acesse "Gerenciar Backups"
2. Computador A: Clique "ðŸ“¤ Exportar" no backup desejado
3. Transferir arquivo JSON via pendrive/email/nuvem
4. Computador B: Acesse "Gerenciar Backups"
5. Computador B: Clique "ðŸ“¥ Importar Backup"
6. Computador B: Selecione o arquivo JSON
7. Computador B: Clique "â†©ï¸ Restaurar" no backup importado
```

### **CenÃ¡rio: Auditoria de AlteraÃ§Ãµes**

```
1. Acesse seÃ§Ã£o "ðŸ“ HistÃ³rico de AlteraÃ§Ãµes"
2. Veja TODAS as operaÃ§Ãµes realizadas
3. Identifique: quem, quando, o quÃª
4. Use para: auditoria, compliance, debugging
```

---

## ðŸŽ¯ BenefÃ­cios

### **Para UsuÃ¡rios**

- âœ… **SeguranÃ§a total**: dados nunca sÃ£o perdidos
- âœ… **ReversÃ£o fÃ¡cil**: desfazer alteraÃ§Ãµes com 1 clique
- âœ… **Auditoria completa**: histÃ³rico de todas as aÃ§Ãµes
- âœ… **TransferÃªncia simples**: backup portÃ¡til via JSON

### **Para Desenvolvedores**

- âœ… **Debugging**: ver estado dos dados em qualquer momento
- âœ… **Testes seguros**: restaurar dados apÃ³s testes
- âœ… **MigraÃ§Ã£o**: transferir dados entre ambientes
- âœ… **Compliance**: registro de todas as operaÃ§Ãµes

### **Para Administradores**

- âœ… **Conformidade LGPD**: auditoria de acesso a dados
- âœ… **Disaster Recovery**: recuperaÃ§Ã£o rÃ¡pida de dados
- âœ… **GovernanÃ§a**: controle total sobre alteraÃ§Ãµes
- âœ… **Backup redundante**: exportaÃ§Ã£o automÃ¡tica

---

## ðŸ“š DocumentaÃ§Ã£o TÃ©cnica Completa

- **CÃ³digo-fonte**: `js/core/dataBackup.js`
- **Interface**: `config/gerenciar-backups.html`
- **IntegraÃ§Ã£o**: `js/core/repository.js` (saveUsuario)
- **API**: Classe `DataBackupManager`

---

## ðŸ†˜ Suporte

- **Console (F12)**: Logs detalhados com prefixo `[BACKUP]`
- **GitHub Issues**: Reportar bugs/sugestÃµes
- **DocumentaÃ§Ã£o**: Este arquivo (SISTEMA_BACKUP.md)

---

**âœ… Com este sistema, vocÃª NUNCA mais perderÃ¡ dados no SINGEM! ðŸŽ‰**

