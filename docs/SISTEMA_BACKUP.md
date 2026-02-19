# 🔒 Sistema de Backup e Restauração - IFDESK

## 📌 Visão Geral

O **Sistema de Backup Automático** do IFDESK garante que **nenhum dado seja perdido** e mantém um **histórico completo** de todas as alterações feitas na aplicação.

---

## ✨ Funcionalidades

### 1️⃣ **Backup Automático**

- ✅ Backup criado automaticamente **antes e depois** de cada operação crítica
- ✅ Backup ao carregar a aplicação
- ✅ Backup antes de salvar/editar usuários
- ✅ Backup antes de restaurar dados

### 2️⃣ **Histórico de Alterações (Changelog)**

- ✅ Registro detalhado de **todas** as operações realizadas
- ✅ Timestamp preciso de cada ação
- ✅ Informações sobre usuário/unidade modificados
- ✅ Tipo de operação (salvar, editar, excluir, restaurar)

### 3️⃣ **Restauração de Dados**

- ✅ Restaurar qualquer backup com 1 clique
- ✅ Backup de segurança criado **antes** da restauração
- ✅ Lista de backups ordenados por data (mais recente primeiro)

### 4️⃣ **Importação/Exportação**

- ✅ Exportar backup para arquivo JSON
- ✅ Importar backup de arquivo externo
- ✅ Transferir dados entre navegadores/computadores

---

## 🚀 Como Usar

### **Acesso Rápido**

1. Acesse: **http://localhost:8080/config/gerenciar-backups.html**
2. Ou clique no menu: **Configurações → Gerenciar Backups**

### **Criar Backup Manual**

```
1. Clique em "💾 Criar Backup Agora"
2. Aguarde confirmação
3. O backup aparece no topo da lista
```

### **Restaurar Backup**

```
1. Localize o backup desejado na lista
2. Clique em "↩️ Restaurar"
3. Confirme a operação (⚠️ CUIDADO: sobrescreve dados atuais)
4. Aguarde e recarregue a página
```

### **Exportar Backup**

```
1. Clique em "📤 Exportar" no backup desejado
2. Salve o arquivo JSON em local seguro
3. Use para backup externo ou transferência
```

### **Importar Backup**

```
1. Clique em "📥 Importar Backup"
2. Selecione o arquivo JSON
3. O backup será adicionado à lista
```

---

## 🔍 Informações dos Backups

Cada backup mostra:

- **ID**: Identificador único
- **Tipo**:
  - 🤖 **Automático** - Criado pelo sistema
  - 👤 **Manual** - Criado pelo usuário
  - 📥 **Importado** - Vindo de arquivo externo
  - 🔄 **Restauração** - Criado antes de restaurar
- **Data/Hora**: Timestamp preciso
- **Usuários**: Quantidade de usuários salvos
- **Unidades**: Quantidade de unidades salvas
- **Tamanho**: Tamanho do backup em KB/MB

---

## 📝 Histórico de Alterações (Changelog)

O changelog registra **todas** as operações:

### Tipos de Ações

- 💾 **Usuário Salvo** - Criação ou edição de usuário
- 🗑️ **Usuário Excluído** - Remoção de usuário
- 🏢 **Unidade Salva** - Criação ou edição de unidade
- ↩️ **Backup Restaurado** - Restauração de dados
- 📥 **Backup Importado** - Importação de backup

### Detalhes Registrados

- Login do usuário
- Nome do usuário
- ID do backup (em restaurações)
- Timestamp preciso

---

## 🔧 Técnico

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

### **Integração Automática**

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

  // ... operação de salvamento ...

  // Backup DEPOIS de salvar (sucesso)
  await window.dataBackupManager.createAutoBackup('post-save-usuario');
}
```

### **API Disponível**

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

// Registrar mudança
await window.dataBackupManager.logChange('custom_action', {
  key: 'value'
});
```

---

## ⚠️ Avisos Importantes

### **Ao Restaurar Backup**

1. ⚠️ **TODOS** os dados atuais serão **substituídos**
2. ✅ Um backup de segurança é criado **antes** da restauração
3. 🔄 É necessário **recarregar a página** após restaurar
4. ❌ A operação **NÃO pode ser desfeita** (exceto restaurando outro backup)

### **Limpeza Automática**

- 🗑️ Apenas os **últimos 10 backups** são mantidos
- ⏰ Backups mais antigos são **removidos automaticamente**
- 💾 Exporte backups importantes para **arquivo externo**

### **Backup Externo**

- 💡 Recomendado: **exportar backups semanalmente**
- 📁 Salvar em: nuvem, pendrive, outro computador
- 🔒 Proteção contra: falha do HD, reinstalação do Windows, corrupção do navegador

---

## 🐛 Solução de Problemas

### **"Nenhum backup encontrado"**

```
Solução: Crie o primeiro backup manualmente
Clique em "💾 Criar Backup Agora"
```

### **"Erro ao restaurar backup"**

```
1. Verifique se o backup está na lista
2. Tente recarregar a página (F5)
3. Abra Console (F12) para ver erros
4. Importe backup externo se necessário
```

### **"Preciso recuperar dados antigos"**

```
1. Localize o backup com a data desejada
2. Verifique quantidade de usuários/unidades
3. Clique em "↩️ Restaurar"
4. Confirme a operação
```

### **"Perdi tudo após limpar navegador"**

```
❌ Se não houver backup externo, dados perdidos
✅ Sempre exporte backups importantes!
📥 Importe o backup externo se tiver
```

---

## 📊 Exemplo de Uso

### **Cenário: Edição Acidental**

```
1. Usuário edita dados incorretamente
2. Salva as alterações
3. Percebe o erro

✅ SOLUÇÃO:
- Acesse "Gerenciar Backups"
- Localize backup ANTES da edição (timestamp)
- Clique em "↩️ Restaurar"
- Dados voltam ao estado anterior
```

### **Cenário: Transferir Entre Computadores**

```
1. Computador A: Acesse "Gerenciar Backups"
2. Computador A: Clique "📤 Exportar" no backup desejado
3. Transferir arquivo JSON via pendrive/email/nuvem
4. Computador B: Acesse "Gerenciar Backups"
5. Computador B: Clique "📥 Importar Backup"
6. Computador B: Selecione o arquivo JSON
7. Computador B: Clique "↩️ Restaurar" no backup importado
```

### **Cenário: Auditoria de Alterações**

```
1. Acesse seção "📝 Histórico de Alterações"
2. Veja TODAS as operações realizadas
3. Identifique: quem, quando, o quê
4. Use para: auditoria, compliance, debugging
```

---

## 🎯 Benefícios

### **Para Usuários**

- ✅ **Segurança total**: dados nunca são perdidos
- ✅ **Reversão fácil**: desfazer alterações com 1 clique
- ✅ **Auditoria completa**: histórico de todas as ações
- ✅ **Transferência simples**: backup portátil via JSON

### **Para Desenvolvedores**

- ✅ **Debugging**: ver estado dos dados em qualquer momento
- ✅ **Testes seguros**: restaurar dados após testes
- ✅ **Migração**: transferir dados entre ambientes
- ✅ **Compliance**: registro de todas as operações

### **Para Administradores**

- ✅ **Conformidade LGPD**: auditoria de acesso a dados
- ✅ **Disaster Recovery**: recuperação rápida de dados
- ✅ **Governança**: controle total sobre alterações
- ✅ **Backup redundante**: exportação automática

---

## 📚 Documentação Técnica Completa

- **Código-fonte**: `js/core/dataBackup.js`
- **Interface**: `config/gerenciar-backups.html`
- **Integração**: `js/core/repository.js` (saveUsuario)
- **API**: Classe `DataBackupManager`

---

## 🆘 Suporte

- **Console (F12)**: Logs detalhados com prefixo `[BACKUP]`
- **GitHub Issues**: Reportar bugs/sugestões
- **Documentação**: Este arquivo (SISTEMA_BACKUP.md)

---

**✅ Com este sistema, você NUNCA mais perderá dados no IFDESK! 🎉**
