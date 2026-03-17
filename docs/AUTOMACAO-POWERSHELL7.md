# Automação de Desenvolvimento — PowerShell 7

> Padronização SINGEM para PowerShell 7.5+ (`pwsh`) no Windows.

## Pré-requisitos

| Ferramenta    | Verificação        | Obrigatório             |
| ------------- | ------------------ | ----------------------- |
| PowerShell 7+ | `pwsh --version`   | Sim                     |
| Node.js LTS   | `node --version`   | Sim                     |
| npm           | `npm --version`    | Sim                     |
| Git           | `git --version`    | Sim                     |
| OpenSSH       | `ssh -V`           | Para túnel DB           |
| Python 3      | `python --version` | Para AI Core / frontend |

O executável esperado do PowerShell é:

```
C:\Program Files\PowerShell\7\pwsh.exe
```

O terminal padrão do VS Code já deve estar configurado para `pwsh`.

---

## Arquitetura dos Scripts

```
scripts/
├── dev-up.ps1          ← script principal (up, setup, restart, health, tunnel, backend, frontend, ai, stop)
├── stop.ps1            ← encerra serviços + git publish opcional (-Publish)
├── util/
│   └── reset-ifdesk.js ← script de console para limpar storage no browser
├── docker-*.ps1        ← automação Docker (produção/staging, escopo separado)
├── bump-version.js     ← versionamento
├── quality-check.mjs   ← qualidade de código
└── scan-refs.cjs       ← scanner de referências
```

### Scripts removidos (obsoletos)

| Script removido                       | Motivo                                                       |
| ------------------------------------- | ------------------------------------------------------------ |
| `util/abrir.ps1`                      | Redirecionava para `server/iniciar-proxy.ps1` que não existe |
| `util/ABRIR_APLICACAO.ps1`            | Substituído por `Open-DevPages` interno do dev-up.ps1        |
| `util/ABRIR_APLICACAO.bat`            | Versão batch do anterior — desnecessário                     |
| `util/iniciar-servidor-sem-cache.ps1` | Substituído por `dev-up.ps1 -Action frontend`                |
| `util/REINICIAR_SEM_CACHE.ps1`        | Substituído por `dev-up.ps1 -Action restart`                 |
| `util/iniciar-proxy-siasg.ps1`        | Proxy SIASG sem uso ativo no projeto                         |

---

## Comandos de Uso

### Subir ambiente completo

```powershell
pwsh -File .\scripts\dev-up.ps1 -Action up
```

Executa: setup → git sync → npm install → túnel SSH → backend → frontend → AI Core → health check → abre browser.

### Ações individuais

```powershell
pwsh -File .\scripts\dev-up.ps1 -Action tunnel     # só o túnel SSH
pwsh -File .\scripts\dev-up.ps1 -Action backend     # só o backend Node.js
pwsh -File .\scripts\dev-up.ps1 -Action frontend    # só o servidor HTTP
pwsh -File .\scripts\dev-up.ps1 -Action ai          # só o AI Core Python
pwsh -File .\scripts\dev-up.ps1 -Action health      # health check completo
pwsh -File .\scripts\dev-up.ps1 -Action setup       # instala deps sem subir
pwsh -File .\scripts\dev-up.ps1 -Action restart     # stop + up
```

### Parar serviços

```powershell
pwsh -File .\scripts\stop.ps1                # apenas para os serviços
pwsh -File .\scripts\stop.ps1 -Publish       # para + commit automático + push origin/dev
```

### Opções avançadas do dev-up.ps1

| Parâmetro             | Padrão | Descrição                                       |
| --------------------- | ------ | ----------------------------------------------- |
| `-Action`             | `up`   | Ação a executar                                 |
| `-Branch`             | `dev`  | Branch Git                                      |
| `-ProjectRoot`        | `$PWD` | Raiz do projeto                                 |
| `-NoTunnel`           | —      | Não abre túnel SSH                              |
| `-NoOpenBrowser`      | —      | Não abre browser ao final                       |
| `-SkipGitSync`        | —      | Pula fetch/checkout/pull                        |
| `-SkipInstall`        | —      | Pula npm install                                |
| `-ForceInstall`       | —      | Força npm ci mesmo com node_modules existente   |
| `-NoAutoRepairTunnel` | —      | Não tenta recuperar túnel caído automaticamente |

Variáveis de ambiente opcionais para testes de SSH sem editar o script:

- `SINGEM_SSH_HOST`
- `SINGEM_SSH_PORT`
- `SINGEM_SSH_USER`

Exemplo:

```powershell
$env:SINGEM_SSH_HOST = 'seu-host'
$env:SINGEM_SSH_PORT = '2222'
$env:SINGEM_SSH_USER = 'root'
pwsh -File .\scripts\dev-up.ps1 -Action up
```

---

## VS Code Tasks

Todas as tasks usam `pwsh` e estão em `.vscode/tasks.json`:

| Task                   | Ação                          |
| ---------------------- | ----------------------------- |
| `SINGEM: UP`           | `dev-up.ps1 -Action up`       |
| `SINGEM: TUNNEL`       | `dev-up.ps1 -Action tunnel`   |
| `SINGEM: BACKEND`      | `dev-up.ps1 -Action backend`  |
| `SINGEM: FRONTEND`     | `dev-up.ps1 -Action frontend` |
| `SINGEM: AI`           | `dev-up.ps1 -Action ai`       |
| `SINGEM: HEALTHCHECK`  | `dev-up.ps1 -Action health`   |
| `SINGEM: STOP`         | `stop.ps1`                    |
| `SINGEM: STOP+PUBLISH` | `stop.ps1 -Publish`           |

Acesse via: `Ctrl+Shift+P` → "Tasks: Run Task" → selecione a task.

---

## Portas padrão

| Serviço                | Porta           | Health                             |
| ---------------------- | --------------- | ---------------------------------- |
| Backend                | 3000            | `http://localhost:3000/health`     |
| Frontend               | 8000            | `http://localhost:8000/index.html` |
| AI Core                | 8010            | `http://127.0.0.1:8010/ai/health`  |
| Túnel SSH (PostgreSQL) | 5433 → VPS 5432 | Conexão TCP                        |

---

## Correções aplicadas para PowerShell 7

### 1. Executável do terminal

**Antes:** `powershell.exe` (Windows PowerShell 5.1)
**Depois:** `pwsh.exe` (PowerShell 7+)

Alterado em:

- `.vscode/tasks.json` — todas as tasks
- `dev-up.ps1` → `Start-ComponentWindow` — terminais filhos usam o mesmo executável do processo pai

### 2. Test-NetConnection substituído

`Test-NetConnection` é lento (~2s por chamada) e depende de módulo NetTCPIP opcional no PS7. Substituído pela função `Test-LocalPort` que já existia no script com TcpClient direto (~50ms).

### 3. #Requires -Version 7.0

Adicionado no topo de `dev-up.ps1` e `stop.ps1`. Se alguém executar com PowerShell 5.1 por engano, receberá erro claro em vez de falhas obscuras.

### 4. Encoding UTF-8

Já configurado no dev-up.ps1:

```powershell
[Console]::InputEncoding  = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
```

### 5. stop.ps1 simplificado

**Antes:** 160+ linhas com param block duplicado, 20+ parâmetros redundantes, git push obrigatório.
**Depois:** ~100 linhas, 3 parâmetros, delega stop para dev-up.ps1, git publish somente com `-Publish`.

---

## Fluxo de desenvolvimento típico

```
1. Abre VS Code no projeto C:\SINGEM
2. Ctrl+Shift+P → "Tasks: Run Task" → "SINGEM: UP"
   → setup, sync, túnel, backend, frontend, AI, health, browser
3. Desenvolve...
4. Ctrl+Shift+P → "Tasks: Run Task" → "SINGEM: STOP"
   → encerra todos os processos
5. (Opcional) "SINGEM: STOP+PUBLISH"
   → encerra + commit + push para origin/dev
```

Ou direto no terminal:

```powershell
PS C:\SINGEM> .\scripts\dev-up.ps1            # equivale a -Action up
PS C:\SINGEM> .\scripts\dev-up.ps1 -Action health
PS C:\SINGEM> .\scripts\stop.ps1
```
