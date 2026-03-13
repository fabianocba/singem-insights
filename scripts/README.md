# Scripts de Desenvolvimento - SINGEM

Padrão oficial e único para ambiente local.

## Comandos oficiais

### Start

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1 -Action start -ProjectRoot . -Branch dev
```

### Stop

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop.ps1 -ProjectRoot . -Branch dev
```

### Stop (somente encerrar serviços, sem publicação Git)

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop.ps1 -OnlyStop -ProjectRoot . -Branch dev
```

## Ações suportadas em `dev-up.ps1`

- `start` (alias de `up`)
- `up`
- `setup`
- `tunnel`
- `backend`
- `frontend`
- `ai`
- `health`
- `stop`
- `restart`

## Observações

- `dev-up.ps1` é o ponto central de orquestração.
- `stop.ps1` encerra os serviços e publica no `origin/dev` por padrão.
- Use `-OnlyStop` para apenas encerrar serviços (sem commit/push).
- Scripts legados de inicialização foram removidos para manter higiene do projeto.
