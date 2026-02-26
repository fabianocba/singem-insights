# 📜 Scripts Utilitários - SINGEM

Scripts PowerShell para facilitar o uso do sistema.

---

## 🚀 Scripts Disponíveis

### `abrir-aplicacao.ps1`

**Descrição:** Abre o sistema SINGEM no navegador  
**Uso:**

```powershell
# Da pasta scripts
.\abrir-aplicacao.ps1

# Da raiz (use o atalho)
.\abrir.ps1
```

**O que faz:**

1. Verifica se o servidor está rodando
2. Abre `http://localhost:8000/index.html` no navegador
3. Exibe instruções de uso no console

**Requisitos:** Servidor HTTP rodando na porta 8000

---

### `iniciar-servidor.ps1`

**Descrição:** Inicia servidor HTTP local para o sistema  
**Uso:**

```powershell
# Da pasta scripts
.\iniciar-servidor.ps1

# Da raiz (use o atalho)
.\servidor.ps1
```

**O que faz:**

1. Verifica se Python está instalado
2. Inicia servidor HTTP na porta 8000
3. Exibe URL de acesso

**Requisitos:** Python 3 instalado

---

## 🔗 Atalhos na Raiz

Na raiz do projeto existem atalhos que redirecionam para estes scripts:

| Atalho         | Script Real                    | Descrição     |
| -------------- | ------------------------------ | --------------- |
| `abrir.ps1`    | `scripts\abrir-aplicacao.ps1`  | Abre sistema    |
| `servidor.ps1` | `scripts\iniciar-servidor.ps1` | Inicia servidor |

**Vantagem:** Você pode executar da raiz sem navegar para `scripts/`

---

## 📝 Exemplos de Uso

### Fluxo Completo

```powershell
# 1. Inicie o servidor
.\servidor.ps1

# 2. Em outro terminal, abra o sistema
.\abrir.ps1

# 3. Use o sistema normalmente
```

### Apenas Abrir (se servidor já estiver rodando)

```powershell
.\abrir.ps1
```

### Executar da Pasta Scripts

```powershell
cd scripts
.\iniciar-servidor.ps1
.\abrir-aplicacao.ps1
```

---

## 🛠️ Personalização

### Alterar Porta do Servidor

Edite `iniciar-servidor.ps1` e modifique:

```powershell
$porta = 8000  # Altere para sua porta desejada
```

### Alterar Navegador

Os scripts usam o navegador padrão do sistema.  
Para forçar um navegador específico, edite `abrir-aplicacao.ps1`:

```powershell
# Chrome
Start-Process "chrome.exe" $url

# Firefox
Start-Process "firefox.exe" $url

# Edge
Start-Process "msedge.exe" $url
```

---

## ⚠️ Solução de Problemas

### "Servidor não está rodando"

**Problema:** Servidor HTTP não iniciado  
**Solução:** Execute `.\servidor.ps1` primeiro

### "Python não encontrado"

**Problema:** Python não instalado ou não no PATH  
**Solução:**

1. Instale Python 3: https://python.org
2. Adicione Python ao PATH
3. Ou use outro servidor HTTP (Node.js, XAMPP, etc)

### Scripts não executam

**Problema:** Política de execução do PowerShell  
**Solução:**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## 📚 Documentação Relacionada

- `README.md` - Documentação principal
- `docs/GUIA_INICIO_RAPIDO.md` - Tutorial de uso
- `server/README.md` - Servidor Node.js (alternativa)

---

**Última atualização:** 03/11/2025  
**Versão:** 1.2.1  
**Sistema:** Windows PowerShell 5.1+
