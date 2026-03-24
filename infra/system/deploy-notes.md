# Deploy Notes

- Ambiente oficial de produção usa docker/prod/docker-compose.prod.yml.
- Segredos de produção devem ficar em docker/prod/.env.prod.
- Fluxo oficial: scripts/deploy.ps1.
- Healthcheck obrigatório: backend /health, frontend /health, ai-core /ai/health.
