# Automação PowerShell 7 — Padrão Final

## Scripts oficiais

```
scripts/
	start.ps1
	stop.ps1
	rebuild.ps1
	logs.ps1
	deploy.ps1
	version.ps1
	clean-legacy.ps1
```

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

## Regras

1. Não usar scripts `dev-*` removidos.
2. Desenvolvimento sempre via `docker/dev/docker-compose.dev.yml`.
3. Produção sempre via `docker/prod/docker-compose.prod.yml`.
4. Versão única em `version.json`.
