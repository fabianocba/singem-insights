# SINGEM Docker - Padrão Oficial

## Estrutura

- docker/dev/docker-compose.dev.yml
- docker/dev/nginx.dev.conf
- docker/prod/docker-compose.prod.yml
- docker/prod/docker-compose.prod.ssl.yml
- docker/prod/nginx.conf
- docker/prod/nginx.ssl.conf
- docker/prod/.env.prod

## Desenvolvimento

Comandos oficiais:

pwsh -File .\scripts\start.ps1 -ProjectRoot .
pwsh -File .\scripts\stop.ps1 -ProjectRoot .
pwsh -File .\scripts\rebuild.ps1 -ProjectRoot .
pwsh -File .\scripts\logs.ps1 -ProjectRoot .

## Produção VPS

Comando oficial:

pwsh -File .\scripts\deploy.ps1 -ProjectRoot .

Auditoria remota opcional:

pwsh -File .\scripts\vps-docker-audit.ps1 -SshHost <host> -SshUser <usuario> -Port <porta>

## Política

- Não usar compose legado na raiz do repositório.
- Não usar docker/local.
- Não usar .env de produção fora de docker/prod/.env.prod.
- Fonte única de versão: version.json.
