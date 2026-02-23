# ðŸ“œ Scripts UtilitÃ¡rios - SINGEM

Scripts PowerShell para facilitar o uso do sistema.

---

## ðŸš€ Scripts DisponÃ­veis

### `abrir-aplicacao.ps1`

**DescriÃ§Ã£o:** Abre o sistema SINGEM no navegador  
**Uso:**

```powershell
# Da pasta scripts
.\abrir-aplicacao.ps1

# Da raiz (use o atalho)
.\abrir.ps1
```

**O que faz:**

1. Verifica se o servidor estÃ¡ rodando
2. Abre `http://localhost:8000/index.html` no navegador
3. Exibe instruÃ§Ãµes de uso no console

**Requisitos:** Servidor HTTP rodando na porta 8000

---

### `iniciar-servidor.ps1`

**DescriÃ§Ã£o:** Inicia servidor HTTP local para o sistema  
**Uso:**

```powershell
# Da pasta scripts
.\iniciar-servidor.ps1

# Da raiz (use o atalho)
.\servidor.ps1
```

**O que faz:**

1. Verifica se Python estÃ¡ instalado
2. Inicia servidor HTTP na porta 8000
3. Exibe URL de acesso

**Requisitos:** Python 3 instalado

---

## ðŸ”— Atalhos na Raiz

Na raiz do projeto existem atalhos que redirecionam para estes scripts:

| Atalho         | Script Real                    | DescriÃ§Ã£o     |
| -------------- | ------------------------------ | --------------- |
| `abrir.ps1`    | `scripts\abrir-aplicacao.ps1`  | Abre sistema    |
| `servidor.ps1` | `scripts\iniciar-servidor.ps1` | Inicia servidor |

**Vantagem:** VocÃª pode executar da raiz sem navegar para `scripts/`

---

## ðŸ“ Exemplos de Uso

### Fluxo Completo

```powershell
# 1. Inicie o servidor
.\servidor.ps1

# 2. Em outro terminal, abra o sistema
.\abrir.ps1

# 3. Use o sistema normalmente
```

### Apenas Abrir (se servidor jÃ¡ estiver rodando)

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

## ðŸ› ï¸ PersonalizaÃ§Ã£o

### Alterar Porta do Servidor

Edite `iniciar-servidor.ps1` e modifique:

```powershell
$porta = 8000  # Altere para sua porta desejada
```

### Alterar Navegador

Os scripts usam o navegador padrÃ£o do sistema.  
Para forÃ§ar um navegador especÃ­fico, edite `abrir-aplicacao.ps1`:

```powershell
# Chrome
Start-Process "chrome.exe" $url

# Firefox
Start-Process "firefox.exe" $url

# Edge
Start-Process "msedge.exe" $url
```

---

## âš ï¸ SoluÃ§Ã£o de Problemas

### "Servidor nÃ£o estÃ¡ rodando"

**Problema:** Servidor HTTP nÃ£o iniciado  
**SoluÃ§Ã£o:** Execute `.\servidor.ps1` primeiro

### "Python nÃ£o encontrado"

**Problema:** Python nÃ£o instalado ou nÃ£o no PATH  
**SoluÃ§Ã£o:**

1. Instale Python 3: https://python.org
2. Adicione Python ao PATH
3. Ou use outro servidor HTTP (Node.js, XAMPP, etc)

### Scripts nÃ£o executam

**Problema:** PolÃ­tica de execuÃ§Ã£o do PowerShell  
**SoluÃ§Ã£o:**

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

---

## ðŸ“š DocumentaÃ§Ã£o Relacionada

- `README.md` - DocumentaÃ§Ã£o principal
- `docs/GUIA_INICIO_RAPIDO.md` - Tutorial de uso
- `server/README.md` - Servidor Node.js (alternativa)

---

**Ãšltima atualizaÃ§Ã£o:** 03/11/2025  
**VersÃ£o:** 1.2.1  
**Sistema:** Windows PowerShell 5.1+
