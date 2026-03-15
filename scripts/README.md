# Scripts de Desenvolvimento — SINGEM

> Requer **PowerShell 7+** (`pwsh`). Documentação completa: [docs/AUTOMACAO-POWERSHELL7.md](../docs/AUTOMACAO-POWERSHELL7.md)

## Modo Docker

```bash
cp .env.example .env
docker compose up --build
```

Consulte [README_DOCKER.md](../README_DOCKER.md) para o guia completo.

---

## Modo DEV local (PowerShell 7 + túnel SSH)

### Subir ambiente completo

```powershell
pwsh -File .\scripts\dev-up.ps1 -Action up
```

### Ações individuais

```powershell
pwsh -File .\scripts\dev-up.ps1 -Action tunnel
pwsh -File .\scripts\dev-up.ps1 -Action backend
pwsh -File .\scripts\dev-up.ps1 -Action frontend
pwsh -File .\scripts\dev-up.ps1 -Action ai
pwsh -File .\scripts\dev-up.ps1 -Action health
pwsh -File .\scripts\dev-up.ps1 -Action setup
pwsh -File .\scripts\dev-up.ps1 -Action restart
```

### Parar serviços

```powershell
pwsh -File .\scripts\stop.ps1                # apenas parar
pwsh -File .\scripts\stop.ps1 -Publish       # parar + commit + push origin/dev
```

## Estrutura

| Script                 | Função                                               |
| ---------------------- | ---------------------------------------------------- |
| `dev-up.ps1`           | Script principal — sobe e gerencia todos os serviços |
| `stop.ps1`             | Encerra serviços; com `-Publish` faz commit+push     |
| `util/reset-ifdesk.js` | Script de console para limpar storage no browser     |
| `docker-*.ps1`         | Automação Docker (produção/staging)                  |

## VS Code Tasks

Todas as tasks (`SINGEM: UP`, `SINGEM: STOP`, etc.) já usam `pwsh` e estão prontas para uso direto no terminal integrado.

## Observações

- A ação `start` é um alias para `up` (compatibilidade mantida).
- AI Core é opcional: falhas não impedem backend/frontend.
- O túnel SSH em `5433` é reutilizado automaticamente quando já ativo.
- No Docker, o banco usa `postgres:5432` sem túnel SSH.
