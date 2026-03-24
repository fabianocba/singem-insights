# Scripts de Desenvolvimento — SINGEM (padrão oficial)

Requer PowerShell 7 (`pwsh`).

## Filosofia

Máquina local é descartável. A fonte da verdade é o repositório atual (arquivos versionados + scripts oficiais).

## Fluxo oficial único

1. `pwsh -File .\scripts\dev-setup.ps1 -ProjectRoot .`
2. `pwsh -File .\scripts\dev-start.ps1 -ProjectRoot .`
3. `pwsh -File .\scripts\dev-update.ps1 -ProjectRoot .` (após pull/rebase)
4. `pwsh -File .\scripts\dev-stop.ps1 -ProjectRoot .`
5. `pwsh -File .\scripts\dev-rebuild.ps1 -ProjectRoot .` (rebuild limpo)
6. `pwsh -File .\scripts\dev-reset.ps1 -ProjectRoot .` (reset total)
7. `pwsh -File .\scripts\dev-doctor.ps1 -ProjectRoot .` (diagnóstico)
8. `pwsh -File .\scripts\deploy-vps.ps1 -ProjectRoot .` (deploy produção VPS)
9. `pwsh -File .\scripts\vps-docker-audit.ps1 -SshHost <host> -SshUser <usuario> -Port <porta>` (auditoria remota Docker-only na VPS)

## Scripts oficiais

| Script            | Função                                                                   |
| ----------------- | ------------------------------------------------------------------------ |
| `dev-setup.ps1`   | Prepara máquina nova com validação de ferramentas e `.env` oficiais Docker |
| `dev-start.ps1`   | Sobe stack oficial Docker (inclui AI Core por padrão)                       |
| `dev-stop.ps1`    | Para ambiente com `down --remove-orphans`                                |
| `dev-update.ps1`  | Reaplica dependências e rebuild após sincronização Git                   |
| `dev-reset.ps1`   | Remove containers/volumes/caches/deps locais legados                     |
| `dev-doctor.ps1`  | Detecta riscos de divergência, legado e inconsistências                  |
| `dev-rebuild.ps1` | Reconstrução sem cache (`--no-cache --pull`)                             |
| `dev-common.ps1`  | Biblioteca compartilhada dos scripts oficiais                            |
| `deploy-vps.ps1`  | Deploy VPS padronizado (inclui AI Core por padrão)                       |
| `vps-docker-audit.ps1` | Auditoria remota via SSH (Docker/Compose + serviços + healthchecks) |

## Política de execução

- Somente scripts `dev-*` são oficiais para desenvolvimento.
- Não há wrappers legados no diretório de scripts.
- O ciclo de Git (add/commit/rebase/push) é sempre explícito e manual.

## Atalhos NPM

```powershell
npm run dev:setup
npm run dev:start
npm run dev:update
npm run dev:doctor
npm run dev:rebuild
npm run dev:reset
npm run dev:stop
npm run dev:deploy:vps
npm run dev:audit:vps -- -SshHost <host> -SshUser <usuario> -Port <porta>
```

## Referência operacional

Consulte `docs/AMBIENTE_DESCARTAVEL_DEV.md` para o guia completo de máquina nova, atualização, reset e diagnóstico.
