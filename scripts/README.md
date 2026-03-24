# Scripts Oficiais — SINGEM

Requer PowerShell 7 (`pwsh`).

## Fluxo operacional oficial

1. `pwsh -File .\scripts\start.ps1 -ProjectRoot .`
2. `pwsh -File .\scripts\stop.ps1 -ProjectRoot .`
3. `pwsh -File .\scripts\rebuild.ps1 -ProjectRoot .`
4. `pwsh -File .\scripts\logs.ps1 -ProjectRoot .`
5. `pwsh -File .\scripts\deploy.ps1 -ProjectRoot .`

Scripts auxiliares oficiais:

1. `pwsh -File .\scripts\version.ps1 -ProjectRoot .`
2. `pwsh -File .\scripts\clean-legacy.ps1 -ProjectRoot .`

## Scripts canônicos

| Script | Função |
| --- | --- |
| `start.ps1` | Sobe stack oficial de desenvolvimento via Docker |
| `stop.ps1` | Para stack oficial e remove órfãos |
| `rebuild.ps1` | Rebuild completo sem cache e subida da stack |
| `logs.ps1` | Exibe logs consolidados ou por serviço |
| `deploy.ps1` | Deploy oficial para VPS (prod) |
| `version.ps1` | Atualiza `version.json` com política de bump |
| `clean-legacy.ps1` | Remove arquivos e fluxos legados detectados |

## Atalhos NPM

```powershell
npm run start
npm run stop
npm run rebuild
npm run logs
npm run deploy
npm run version
npm run clean:legacy
```
