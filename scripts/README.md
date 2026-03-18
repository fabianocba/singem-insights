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

### Smoke da tela de NFe

```powershell
pwsh -File .\scripts\smoke-importar-nfe.ps1
pwsh -File .\scripts\smoke-importar-nfe.ps1 -UseRealBackend
pwsh -File .\scripts\smoke-importar-nfe.ps1 -UseRealBackend -AuthToken $env:SINGEM_SMOKE_TOKEN
pwsh -File .\scripts\smoke-importar-nfe.ps1 -UseRealBackend -Login usuario@dominio -Password senha
pwsh -File .\scripts\smoke-importar-nfe.ps1 -UseRealBackend -StorageStatePath .\tmp\state.json
pwsh -File .\scripts\smoke-importar-nfe.ps1 -UseRealBackend -AllowWrite
```

Atalhos NPM:

```powershell
npm run smoke:nfe
npm run smoke:nfe:real
npm run smoke:nfe:real:write
```

Observações:

- O modo padrão usa um dbManager mockado e não grava dados reais.
- O modo `-UseRealBackend` executa contra a tela real; por segurança, sem `-AllowWrite` ele valida e para antes do salvamento.
- Para modo real autenticado, passe `-AuthToken`, ou forneça `-Login` e `-Password` para o runner obter JWT em `/api/auth/login`.
- `-StorageStatePath` é suportado, mas hoje a autenticação principal do projeto fica em memória (`window.__SINGEM_AUTH`); então, no fluxo local atual, token explícito ou login por API são os caminhos mais confiáveis.
- O wrapper instala `playwright-core` em um sandbox temporário em `%TEMP%\singem-playwright-smoke` sem alterar dependências do projeto.

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
