# Scripts de Desenvolvimento - SINGEM

Padrão operacional recomendado para trocar de máquina sem reconfiguração manual.

## Comandos oficiais

### Iniciar ambiente DEV

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1 -Action start -ProjectRoot . -Branch dev
```

### Encerrar ambiente DEV

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stop.ps1 -OnlyStop -ProjectRoot . -Branch dev
```

## Compatibilidade adicional

- `scripts/dev-up.ps1` continua aceitando `start`, `up`, `setup`, `restart`, `health`, `backend`, `frontend`, `ai` e `tunnel`.
- `scripts/stop.ps1` é o comando estável para encerramento e publicação no GitHub (`origin/dev`).
- `-OnlyStop` foi mantido apenas para compatibilidade de chamada, mas não desativa commit/push.

## Observações

- Os dois comandos acima são os únicos que você precisa memorizar ao trocar de máquina.
- O AI Core é opcional no fluxo de `up` e `health`: falhas no AI não impedem backend/frontend.
- O health de backend aceita `OK` e `DEGRADED` quando o banco está conectado.
- O túnel em `5433` é reutilizado automaticamente quando já for um túnel válido do projeto.
