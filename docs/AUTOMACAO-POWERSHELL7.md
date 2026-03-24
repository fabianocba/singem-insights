# Automação de Desenvolvimento — PowerShell 7

> Padronização SINGEM para PowerShell 7+ (`pwsh`) no Windows, com fluxo oficial baseado em scripts `dev-*`.

## Pré-requisitos

| Ferramenta    | Verificação        | Obrigatório |
| ------------- | ------------------ | ----------- |
| PowerShell 7+ | `pwsh --version`   | Sim         |
| Node.js LTS   | `node --version`   | Sim         |
| npm           | `npm --version`    | Sim         |
| Git           | `git --version`    | Sim         |
| Docker        | `docker --version` | Sim         |
| Python 3.11+  | `python --version` | Sim         |

## Scripts oficiais

```
scripts/
├── dev-common.ps1   ← funções compartilhadas e políticas de execução
├── dev-setup.ps1    ← valida pré-requisitos e instala dependências
├── dev-start.ps1    ← sobe ambiente Docker oficial
├── dev-stop.ps1     ← para ambiente Docker oficial
├── dev-update.ps1   ← atualiza deps + rebuild/pull controlado
├── dev-rebuild.ps1  ← rebuild sem cache
├── dev-reset.ps1    ← limpeza local agressiva (containers, cache, venv)
└── dev-doctor.ps1   ← diagnóstico de saúde do ambiente
```

## Comandos de uso

### Setup inicial

```powershell
pwsh -File .\scripts\dev-setup.ps1
```

### Subir ambiente

```powershell
pwsh -File .\scripts\dev-start.ps1
```

Opções úteis no start:

```powershell
pwsh -File .\scripts\dev-start.ps1 -NoCache -Pull
```

### Parar ambiente

```powershell
pwsh -File .\scripts\dev-stop.ps1
```

### Atualizar / reconstruir / resetar

```powershell
pwsh -File .\scripts\dev-update.ps1
pwsh -File .\scripts\dev-rebuild.ps1
pwsh -File .\scripts\dev-reset.ps1
```

### Diagnóstico

```powershell
pwsh -File .\scripts\dev-doctor.ps1
```

## VS Code Tasks

As tasks oficiais ficam em `.vscode/tasks.json` e usam apenas scripts `dev-*`:

- `SINGEM: SETUP`
- `SINGEM: UP`
- `SINGEM: STOP`
- `SINGEM: UPDATE`
- `SINGEM: REBUILD`
- `SINGEM: RESET`
- `SINGEM: HEALTHCHECK`

## Portas padrão

| Serviço  | Porta | Health                         |
| -------- | ----- | ------------------------------ |
| Backend  | 3000  | `http://localhost:3000/health` |
| Frontend | 8000  | `http://localhost:8000`        |
| AI Core  | 8010  | `http://127.0.0.1:8010/ai/health` |

## Padrões obrigatórios

1. Todos os scripts exigem PowerShell 7 (`#Requires -Version 7.0`).
2. O compose oficial é resolvido por `Get-OfficialComposeFile` em `dev-common.ps1`.
3. Fluxo de execução é exclusivamente via scripts `dev-*` (sem wrappers legados).
4. Operações de runtime e operações de Git/versionamento são separadas.

## Fluxo recomendado

```text
1. Executar dev-setup
2. Executar dev-start
3. Desenvolver e validar
4. Executar dev-doctor
5. Executar dev-stop
```
