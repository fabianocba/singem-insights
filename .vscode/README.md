# 🔧 Configuração do VS Code - IFDESK

Este diretório contém configurações para automatizar o IFDESK no VS Code.

## 📁 Arquivos

### `tasks.json`

Define a task automática que executa ao abrir o workspace:

- **Label**: 🎯 Iniciar IFDESK Automaticamente
- **Trigger**: Ao abrir a pasta (`runOn: folderOpen`)
- **Ação**: Executa `iniciar-sistema.ps1`

### `iniciar-sistema.ps1`

Script PowerShell que:

1. ✅ Verifica se servidor já está rodando
2. 🐍 Detecta Python instalado
3. 🚀 Inicia servidor HTTP na porta 8000 (se necessário)
4. ⏳ Aguarda servidor ficar pronto
5. 🌐 Abre navegador em `http://localhost:8000/index.html`

### `settings.json`

Configurações do workspace:

- Habilita tasks automáticas
- Configura auto-save
- Define PowerShell como terminal padrão
- Exclusões de busca

## 🚀 Como Usar

### Primeira Vez

1. Abra a pasta IFDESK no VS Code
2. VS Code mostrará: **"Esta pasta contém tarefas automáticas. Permitir?"**
3. Clique em **"Permitir"**
4. O sistema iniciará automaticamente!

### Próximas Vezes

- Basta abrir a pasta no VS Code
- O sistema inicia automaticamente (se você permitiu)

### Desabilitar Inicialização Automática

Se quiser desabilitar:

1. Vá em `tasks.json`
2. Remova a propriedade `runOptions` da task
3. Ou altere `settings.json`: `"task.allowAutomaticTasks": "off"`

## 🔍 Troubleshooting

### Task não executa automaticamente

**Solução**: Verifique se você permitiu tasks automáticas:

- Pressione `Ctrl+Shift+P`
- Digite: `Tasks: Manage Automatic Tasks in Folder`
- Selecione: `Allow Automatic Tasks in Folder`

### Servidor não inicia

**Causas possíveis**:

- Python não instalado
- Porta 8000 já em uso
- Permissão de execução do PowerShell

**Solução**:

- Execute manualmente: `.\abrir.ps1`
- Veja os erros no terminal

### Navegador não abre

**Causa**: Servidor demorou mais que o esperado

**Solução**:

- Abra manualmente: `http://localhost:8000/index.html`
- Aumente o delay em `iniciar-sistema.ps1`

## 📝 Logs

Os logs de execução aparecem no painel **Terminal** do VS Code:

- Aba: **TAREFAS** (ou **TASKS**)
- Task: 🎯 Iniciar IFDESK Automaticamente

## 🛑 Parar o Servidor

Para parar o servidor:

1. Abra o Gerenciador de Tarefas (Ctrl+Shift+Esc)
2. Procure processo `python.exe` (porta 8000)
3. Finalize o processo

Ou execute no terminal:

```powershell
Get-Process python | Where-Object {$_.Path -like "*python*"} | Stop-Process
```

## 📚 Documentação Oficial

- [VS Code Tasks](https://code.visualstudio.com/docs/editor/tasks)
- [Automatic Tasks](https://code.visualstudio.com/docs/editor/tasks#_automatic-tasks)
