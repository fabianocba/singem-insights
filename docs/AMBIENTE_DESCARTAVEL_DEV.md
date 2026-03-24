# SINGEM — Ambiente de Desenvolvimento com Máquina Descartável

> Frase-guia: **A máquina é apenas estação de trabalho. A fonte da verdade é o projeto atual versionado. Nada local pode prevalecer sobre o estado atual oficial do repositório.**

## 1) Objetivo

Garantir execução determinística e reprodutível em qualquer máquina, usando exclusivamente:

1. estado atual do repositório;
2. arquivos oficiais versionados;
3. scripts oficiais do projeto;
4. configuração de ambiente definida no próprio projeto.

## 2) Diagnóstico dos riscos de legado encontrados

Os principais pontos que causavam comportamento antigo/local:

- múltiplos caminhos de start/parada legados (já removidos na padronização atual);
- `.gitignore` inconsistente, com risco de lockfile não versionado e duplicidade de regras;
- fluxo Docker com arquivo raiz legado ainda sendo usado sem padronização explícita;
- automação de stop com publish Git embutido (`-Publish`) misturando ciclo de runtime com versionamento;
- caminho absoluto de Python por máquina em configuração do VS Code;
- ausência de uma suíte única de scripts com papéis claros (`setup/start/update/reset/doctor/rebuild`).

## 3) Padrão oficial adotado

A partir desta revisão, o fluxo oficial é:

1. `scripts/dev-setup.ps1`
2. `scripts/dev-start.ps1`
3. `scripts/dev-update.ps1`
4. `scripts/dev-stop.ps1`
5. `scripts/dev-rebuild.ps1`
6. `scripts/dev-reset.ps1`
7. `scripts/dev-doctor.ps1`

Base comum compartilhada:

- `scripts/dev-common.ps1`

Não há scripts legados de compatibilidade no fluxo oficial.

## 4) Como preparar máquina nova

Pré-requisitos mínimos:

- PowerShell 7 (`pwsh`)
- Git
- Docker Desktop com Compose plugin

Passos:

```powershell
git clone <repo>
cd SINGEM
pwsh -File .\scripts\dev-setup.ps1 -ProjectRoot .
pwsh -File .\scripts\dev-start.ps1 -ProjectRoot .
```

Resultado esperado:

- `.env` local criado a partir dos exemplos oficiais (se ausente);
- imagens e serviços alinhados ao estado atual do repositório via Docker Compose;
- compose oficial validado.

## 5) Como sincronizar com branch oficial

```powershell
git fetch origin --prune
git checkout dev
git pull --rebase origin dev
pwsh -File .\scripts\dev-update.ps1 -ProjectRoot .
```

O script `dev-update`:

- para containers antigos;
- reconstrói imagens com `--pull`;
- sobe novamente com `--remove-orphans`.

## 6) Como fazer reset total local

```powershell
pwsh -File .\scripts\dev-reset.ps1 -ProjectRoot .
```

O reset remove:

- containers, orfãos, volumes do projeto e imagens locais do projeto;
- `node_modules` (raiz e server);
- `singem-ai/.venv` (resíduo legado, se existir);
- caches e build outputs locais (`dist`, `build`, `.next`, `.cache`);
- logs locais e `__pycache__`.

Opcional para limpeza extra de build cache Docker:

```powershell
pwsh -File .\scripts\dev-reset.ps1 -ProjectRoot . -PruneBuilder
```

## 7) Diagnóstico automático (doctor)

```powershell
pwsh -File .\scripts\dev-doctor.ps1 -ProjectRoot .
```

Verifica automaticamente:

- ferramentas obrigatórias;
- sincronismo Git com origin (ahead/behind);
- working tree suja;
- existência de `.env` oficiais locais;
- validade da configuração Docker oficial;
- validade do compose oficial;
- serviços em execução;
- artefatos legados detectáveis.

## 8) Quais scripts antigos foram removidos

- Scripts legados de start/parada foram removidos do diretório oficial de execução.
- Opções de publish acopladas ao runtime não existem mais no fluxo oficial.

## 9) Pastas/arquivos que não podem influenciar entre máquinas

Ignorados e tratados por reset:

- `node_modules/`, `server/node_modules/`
- `singem-ai/.venv/`
- `dist/`, `build/`, `.next/`, `.cache/`
- `**/__pycache__/`, `**/.pytest_cache/`
- `storage/`, `logs/`, `server/logs/`
- backups/dumps locais e dados reais não versionados

## 10) Garantia arquitetural (prática)

O padrão elimina a máquina como fonte de verdade porque:

- setup e update sempre reconstruem dependências a partir de manifests versionados;
- start/rebuild usam compose oficial e rebuild controlado;
- reset remove herança local perigosa;
- doctor detecta divergências e risco de legado;
- tasks VS Code e scripts npm apontam para o mesmo caminho oficial.

## 11) Fluxo recomendado diário

```powershell
# início do dia
pwsh -File .\scripts\dev-update.ps1 -ProjectRoot .

# trabalho normal
pwsh -File .\scripts\dev-start.ps1 -ProjectRoot .

# diagnóstico rápido se algo divergir
pwsh -File .\scripts\dev-doctor.ps1 -ProjectRoot .

# stop
pwsh -File .\scripts\dev-stop.ps1 -ProjectRoot .
```
