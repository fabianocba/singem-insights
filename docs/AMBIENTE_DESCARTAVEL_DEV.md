# SINGEM — Ambiente Descartável (Padrão Final)

## Regras de ouro

1. Desenvolvimento via Docker somente.
2. Compose de dev: `docker/dev/docker-compose.dev.yml`.
3. Compose de prod: `docker/prod/docker-compose.prod.yml`.
4. Versão única em `version.json`.

## Comandos oficiais

```powershell
pwsh -File .\scripts\start.ps1 -ProjectRoot .
pwsh -File .\scripts\stop.ps1 -ProjectRoot .
pwsh -File .\scripts\rebuild.ps1 -ProjectRoot .
pwsh -File .\scripts\logs.ps1 -ProjectRoot .
pwsh -File .\scripts\deploy.ps1 -ProjectRoot .
pwsh -File .\scripts\version.ps1 -ProjectRoot .
pwsh -File .\scripts\clean-legacy.ps1 -ProjectRoot .
```

## Ambientes

- `.env.example`: modelo base
- `.env.dev`: desenvolvimento local
- `docker/prod/.env.prod`: produção VPS

## Política

Não usar scripts, compose ou env legados fora desse padrão.
