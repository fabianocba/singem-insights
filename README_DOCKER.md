# SINGEM — Docker

Guia completo para rodar, parar, rebuildar e monitorar o SINGEM via Docker.

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────────┐
│                       singem-network                             │
│                                                                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐           │
│  │ frontend │───▶│ backend  │───▶│    postgres       │           │
│  │  :80     │    │  :3000   │    │     :5432         │           │
│  │  nginx   │    │  node.js │    │  pgvector:pg15    │           │
│  └──────────┘    └──────────┘    └──────────────────┘           │
│      │                │                    │                     │
│  host:8000       host:3000            host:5432                  │
│  (dev)           (dev only)           (dev only)                 │
│  host:80/443                                                     │
│  (prod TLS)                                                      │
│                  ┌────────┐   ┌────────────────────┐            │
│                  │ redis  │   │     ai-core         │            │
│                  │ :6379  │   │     :8010           │            │
│                  │ redis:7│   │  python/fastapi      │            │
│                  └────────┘   │  (profile: ai)       │            │
│                host:6379      └────────────────────┘            │
│                (dev only)          host:8010 (dev)               │
│                                                                  │
│  ┌─────────────────── Observabilidade ─────────────────────┐    │
│  │ prometheus:9090  grafana:3100   loki:3200   promtail    │    │
│  │ node-exporter    postgres-exp   redis-exp   k6          │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

| Serviço    | Imagem                   | Porta host (dev) | Porta host (prod)  | Descrição                               |
| ---------- | ------------------------ | ---------------- | ------------------ | --------------------------------------- |
| `postgres` | `pgvector/pgvector:pg15` | `5432`           | _não exposta_      | Banco + pgvector                        |
| `redis`    | `redis:7-alpine`         | `6379`           | _não exposta_      | Cache (com senha em prod)               |
| `backend`  | `node:20-alpine`         | `3000`           | `127.0.0.1:3000`   | API Node/Express                        |
| `frontend` | `nginx:alpine`           | `8000`           | `80` + `443` (TLS) | Frontend + proxy reverso                |
| `ai-core`  | `python:3.12-slim`       | `8010`           | _não exposta_      | IA FastAPI (**opcional**, profile `ai`) |

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24 (inclui Compose v2)
- Git

---

## Estrutura de arquivos Docker

```
SINGEM/
├── Dockerfile.backend              ← Node.js 20-alpine, multi-stage
├── Dockerfile.frontend             ← nginx:alpine, arquivos estáticos
├── Dockerfile.ai                   ← python:3.12-slim / nvidia-cuda (GPU)
├── .dockerignore
├── .env.example                    ← Template de referência (raiz)
│
├── docker/
│   ├── local/                      ← ★ DESENVOLVIMENTO LOCAL
│   │   ├── docker-compose.yml      ← Standalone — rodar direto
│   │   └── .env.example            ← Exemplo .env para dev
│   │
│   ├── prod/                       ← ★ PRODUÇÃO VPS
│   │   ├── docker-compose.yml      ← Standalone — hardening completo
│   │   └── .env.example            ← Exemplo .env para prod
│   │
│   ├── addons/                     ← Compose opcionais plugáveis
│   │   ├── monitoring.yml          ← Prometheus + Grafana + exporters
│   │   ├── logging.yml             ← Loki + Promtail
│   │   ├── gpu.yml                 ← NVIDIA GPU para AI Core
│   │   ├── waf.yml                 ← WAF ModSecurity OWASP CRS
│   │   ├── loadtest.yml            ← k6 load testing
│   │   └── test.yml                ← CI/CD (rede + volumes isolados)
│   │
│   ├── nginx.conf                  ← NGINX HTTP (dev, rate-limiting)
│   ├── nginx-ssl.conf              ← NGINX HTTPS (prod, TLS 1.2+)
│   ├── nginx-waf.conf              ← NGINX WAF (ModSecurity)
│   ├── entrypoint-backend.sh       ← Espera PostgreSQL antes de iniciar
│   ├── prometheus.yml              ← Scrape configs Prometheus
│   ├── test-runner.js              ← Health checks integração
│   ├── grafana/                    ← Dashboards e datasources
│   ├── loki/                       ← Config Loki + Promtail
│   ├── modsecurity/                ← Regras contra false positives
│   └── k6/                         ← Cenários de load test
│
└── scripts/
    ├── docker-setup.ps1            ← Gera .env com secrets
    ├── docker-health.ps1           ← Diagnóstico de containers
    ├── docker-backup.ps1           ← Backup PostgreSQL com rotação
    ├── docker-backup-scheduler.ps1 ← Agendamento automático
    ├── docker-monitor.ps1          ← Monitoramento contínuo + alertas
    ├── docker-logs.ps1             ← Visualização/filtro de logs
    ├── docker-ssl-setup.ps1        ← Setup de certificados TLS
    ├── docker-ssl-renew.ps1        ← Renovação Let's Encrypt
    ├── docker-bluegreen.ps1        ← Deploy blue/green (zero downtime)
    └── docker-rollback.ps1         ← Rollback de versão com histórico
```

---

## Desenvolvimento Local

### Setup inicial

```bash
cd docker/local
cp .env.example .env
# Edite .env se necessário (valores padrão funcionam para dev)
```

### Subir o ambiente

```bash
cd docker/local

# Serviços base (postgres + redis + backend + frontend)
docker compose up --build

# Stack oficial (inclui AI Core)
docker compose up --build

# Em background
docker compose up -d --build
```

Aguarde os healthchecks passarem (~40 s na primeira vez):

| URL                          | Serviço                 |
| ---------------------------- | ----------------------- |
| http://localhost:8000        | Frontend SINGEM         |
| http://localhost:3000/health | Health check do backend |
| http://localhost:3000/api    | API REST                |

> **Primeiro boot:** o backend roda migrations automaticamente (bootstrap.js).

### Stack oficial com AI Core

```bash
cd docker/local
docker compose up --build

# Logs do AI Core
docker compose logs -f ai-core

# Health do AI Core
docker compose exec -T ai-core wget -qO- http://localhost:8010/ai/health
```

### Parar

```bash
cd docker/local

# Para e remove containers (volumes preservados)
docker compose down

# Reset completo (apaga dados do banco)
docker compose down -v
```

### Rebuildar

```bash
cd docker/local

# Rebuild sem cache
docker compose build --no-cache

# Rebuild de um serviço
docker compose build --no-cache backend

# Rebuild + subir
docker compose up --build
```

### Logs

```bash
cd docker/local

# Todos os serviços (tempo real)
docker compose logs -f

# Serviço específico
docker compose logs -f backend

# Últimas N linhas
docker compose logs --tail=100 backend
```

---

## Produção (VPS)

### Setup inicial

```bash
cd docker/prod
cp .env.example .env

# OBRIGATÓRIO: preencher TODOS os valores sensíveis
# Gerar secrets seguros:
openssl rand -hex 32        # → JWT_SECRET
openssl rand -base64 32     # → DB_PASSWORD, REDIS_PASSWORD
```

### Certificados TLS

```powershell
# Certificado auto-assinado (teste)
.\scripts\docker-ssl-setup.ps1 -Mode selfsigned

# Let's Encrypt (produção — porta 80 acessível da internet)
.\scripts\docker-ssl-setup.ps1 -Mode letsencrypt -Domain singem.ifbaiano.edu.br -Email admin@ifbaiano.edu.br
```

### Subir em produção

```bash
cd docker/prod

# Serviços base
docker compose up -d --build

# Stack oficial (inclui AI Core)
docker compose up -d --build
```

### Diferenças dev vs prod

| Aspecto    | Dev (`docker/local/`) | Prod (`docker/prod/`)               |
| ---------- | --------------------- | ----------------------------------- |
| Banco      | Porta 5432 exposta    | **Não exposto** (rede interna)      |
| Backend    | Porta 3000 pública    | `127.0.0.1:3000` (via nginx)        |
| Redis      | Porta 6379 exposta    | **Não exposto** + senha obrigatória |
| AI Core    | Porta 8010 pública    | **Não exposto** (rede interna)      |
| Frontend   | HTTP porta 8000       | HTTPS portas 80+443 (TLS)           |
| Restart    | `unless-stopped`      | `always`                            |
| Memória    | Sem limites           | Limites por serviço                 |
| Secrets    | Padrões dev           | **Obrigatórios** (`?:` syntax)      |
| Logs       | Padrão Docker         | Rotação (`max-size: 10m`)           |
| PostgreSQL | Config padrão         | Tuning (shared_buffers, etc.)       |

---

## Banco de Dados

### Conectar via psql (dentro do container)

```bash
cd docker/local  # ou docker/prod
docker compose exec postgres psql -U adm -d singem
```

### Via cliente externo (DBeaver, pgAdmin — só dev)

```
Host:     localhost
Porta:    5432
Banco:    singem
Usuário:  adm
Senha:    <DB_PASSWORD do seu .env>
```

### Rodar migrations manualmente

```bash
docker compose exec backend node -e "require('./config/database').runMigrations().then(() => process.exit())"
```

### Seed de admin

```bash
docker compose exec backend node scripts/seed-admin.js
```

---

## Fluxo oficial dev e VPS

O backend Python (`ai-core`) roda **exclusivamente em container Docker**.

- Desenvolvimento local: `docker/local/docker-compose.yml` (IA já incluída na stack).
- Produção/VPS: `docker/prod/docker-compose.yml` (IA já incluída na stack).
- Não há caminho oficial com `.venv` local para runtime do AI Core.

---

## Solução de problemas

### Backend não sobe: "can't connect to postgres"

```bash
docker compose ps  # verificar se postgres está "healthy"
```

### Porta já em uso

```bash
docker compose down
# No Windows: verifique se scripts dev-* locais estão rodando nas mesmas portas
```

### Reset completo do banco

```bash
docker compose down -v
docker compose up --build
```

### Ver variáveis efetivas de um container

```bash
docker compose exec backend env | sort
```

---

## Scripts Docker (PowerShell)

Todos os scripts ficam em `scripts/` e são compatíveis com PowerShell 5.x e 7.x.

### Setup do ambiente

```powershell
# Gera .env com secrets criptográficos (desenvolvimento)
.\scripts\docker-setup.ps1

# Gera .env para produção
.\scripts\docker-setup.ps1 -Production -FrontendUrl "https://singem.ifbaiano.edu.br"

# Sobrescrever .env existente
.\scripts\docker-setup.ps1 -Force
```

### Diagnóstico de saúde

```powershell
# Verifica Docker Engine, containers, conectividade, segurança
.\scripts\docker-health.ps1
```

### Backup do banco de dados

```powershell
# Backup padrão (formato custom, mantém 10 backups)
.\scripts\docker-backup.ps1

# Com rotação de 5 e formato SQL compactado
.\scripts\docker-backup.ps1 -Keep 5 -Format sql

# Com notificação via webhook
.\scripts\docker-backup.ps1 -WebhookUrl "https://hooks.slack.com/xxx"

# Diretório de saída personalizado
.\scripts\docker-backup.ps1 -OutputDir "D:\backups\singem"
```

Para restaurar um backup:

```bash
# Formato custom (.dump)
docker exec -i singem-postgres pg_restore -U adm -d singem --clean < backup.dump

# Formato SQL (.sql.gz)
gunzip -c backup.sql.gz | docker exec -i singem-postgres psql -U adm -d singem
```

### Monitoramento contínuo

```powershell
# Execução única (ideal para agendador de tarefas)
.\scripts\docker-monitor.ps1 -Once

# Monitoramento contínuo a cada 2 minutos
.\scripts\docker-monitor.ps1 -Interval 120

# Com alertas via webhook (Slack/Teams)
.\scripts\docker-monitor.ps1 -Interval 60 -WebhookUrl "https://hooks.slack.com/xxx"

# Modo silencioso (apenas log e webhook)
.\scripts\docker-monitor.ps1 -Once -Quiet -WebhookUrl "https://hooks.slack.com/xxx"
```

### Visualização de logs

```powershell
# Todos os serviços (últimas 100 linhas)
.\scripts\docker-logs.ps1

# Backend com follow (tempo real)
.\scripts\docker-logs.ps1 -Service backend -Follow

# Filtrar por nível de erro
.\scripts\docker-logs.ps1 -Level ERROR -Since "1h"

# Filtrar por texto
.\scripts\docker-logs.ps1 -Service postgres -Filter "checkpoint" -Tail 50

# Exportar para arquivo
.\scripts\docker-logs.ps1 -Service backend -Since "30m" -Export "logs_backend.txt"
```

### TLS/SSL

```powershell
# Certificado auto-assinado (desenvolvimento)
.\scripts\docker-ssl-setup.ps1 -Mode selfsigned

# Let's Encrypt (produção — requer porta 80 acessível)
.\scripts\docker-ssl-setup.ps1 -Mode letsencrypt -Domain singem.ifbaiano.edu.br -Email admin@ifbaiano.edu.br

# Let's Encrypt em modo staging (teste sem rate limit)
.\scripts\docker-ssl-setup.ps1 -Mode letsencrypt -Domain singem.ifbaiano.edu.br -Email admin@ifbaiano.edu.br -DryRun
```

### Agendamento de backup (Windows Task Scheduler)

```powershell
# Cria tarefa agendada para backup diário às 02:00
.\scripts\docker-backup-scheduler.ps1 -Install

# Remove a tarefa agendada
.\scripts\docker-backup-scheduler.ps1 -Uninstall

# Personalizar horário e retenção
.\scripts\docker-backup-scheduler.ps1 -Install -Hour 3 -Minute 30 -Keep 7
```

---

## Observabilidade (Prometheus + Grafana)

Stack de monitoramento com métricas, dashboards e alertas.

```bash
cd docker/local  # ou docker/prod

# Subir os serviços base primeiro
docker compose up -d

# Subir monitoring stack (requer rede singem-network ativa)
docker compose -f ../addons/monitoring.yml up -d

# Com logs centralizados (Loki)
docker compose -f ../addons/monitoring.yml -f ../addons/logging.yml up -d
```

| URL                   | Serviço                 |
| --------------------- | ----------------------- |
| http://localhost:9090 | Prometheus              |
| http://localhost:3100 | Grafana (admin / admin) |

### Serviços de monitoramento

| Serviço             | Imagem                                          | Função                                            |
| ------------------- | ----------------------------------------------- | ------------------------------------------------- |
| `prometheus`        | `prom/prometheus:v2.51.0`                       | Coleta e armazenamento de métricas (30d retenção) |
| `grafana`           | `grafana/grafana:11.0.0`                        | Dashboards e alertas visuais                      |
| `node-exporter`     | `prom/node-exporter:v1.8.0`                     | Métricas do host (CPU, memória, disco)            |
| `postgres-exporter` | `prometheuscommunity/postgres-exporter:v0.15.0` | Métricas do PostgreSQL                            |
| `redis-exporter`    | `oliver006/redis_exporter:v1.61.0`              | Métricas do Redis                                 |

### Dashboard SINGEM Overview

Dashboard pré-configurado em `docker/grafana/provisioning/dashboards/singem-overview.json` com:

- **Status Geral** — Backend UP/DOWN, Database UP/DOWN, Uptime, Total Requests, Req/s, CPU Host
- **Requests** — Rate (5m avg), requests/min
- **Memória Node.js** — Heap Used/Total, RSS, External + Gauge de utilização
- **PostgreSQL** — Conexões ativas, tamanho do banco, transações/s (commits vs rollbacks)
- **Redis** — Memória, clientes conectados, comandos/s
- **Host** — CPU %, memória usada/disponível, disco %

### Logs centralizados (Loki)

```bash
cd docker/local  # ou docker/prod
docker compose -f ../addons/monitoring.yml -f ../addons/logging.yml up -d
```

| Serviço    | Imagem                   | Função                               |
| ---------- | ------------------------ | ------------------------------------ |
| `loki`     | `grafana/loki:3.0.0`     | Armazenamento de logs (30d retenção) |
| `promtail` | `grafana/promtail:3.0.0` | Coleta de logs dos containers Docker |

No Grafana, vá em **Explore → Loki** para consultar logs. Filtros disponíveis:

- `{service="backend"}` — logs do backend
- `{service="backend"} |= "ERROR"` — apenas erros
- `{service="postgres"} |= "checkpoint"` — checkpoints do banco

---

## WAF (Web Application Firewall)

Proteção via ModSecurity com OWASP Core Rule Set.

```bash
# A partir do diretório docker/local/ ou docker/prod/
docker compose -f docker-compose.yml -f ../addons/waf.yml up -d
```

- OWASP CRS Paranoia Level 2
- Rate limiting integrado (30r/s geral, 20r/s API, 5r/s auth)
- Exclusões configuradas para evitar false positives em endpoints SINGEM
- ModSecurity desabilitado para assets estáticos e `/metrics`

---

## Blue/Green Deployment

Deploy com zero downtime via switching de upstream nginx.

```powershell
# Deploy nova versão
.\scripts\docker-bluegreen.ps1 -Action deploy -Tag v1.2.0

# Verificar estado
.\scripts\docker-bluegreen.ps1 -Action status

# Rollback para versão anterior
.\scripts\docker-bluegreen.ps1 -Action rollback

# Com webhook de notificação
.\scripts\docker-bluegreen.ps1 -Action deploy -Tag v1.2.0 -WebhookUrl "https://hooks.slack.com/xxx"
```

---

## Rollback de Versão

Rollback rápido de imagens Docker com histórico.

```powershell
# Rollback do backend para tag anterior
.\scripts\docker-rollback.ps1 -Service backend

# Rollback para tag específica
.\scripts\docker-rollback.ps1 -Service frontend -Tag v1.1.0

# Rollback de todos os serviços
.\scripts\docker-rollback.ps1 -Service all

# Dry run (mostra o que seria feito)
.\scripts\docker-rollback.ps1 -Service backend -DryRun
```

---

## Load Testing (k6)

Testes de carga automatizados com cenários progressivos.

```bash
cd docker/local  # ou docker/prod

# Smoke test rápido (30s, 2 VUs)
docker compose -f ../addons/loadtest.yml run --rm k6-smoke

# Cenários completos (smoke → load → stress, ~9 min)
docker compose -f ../addons/loadtest.yml run --rm k6

# Com output para Prometheus (requer monitoring stack)
docker compose -f ../addons/monitoring.yml -f ../addons/loadtest.yml run --rm k6-prometheus
```

### Cenários

| Cenário    | VUs           | Duração | Início |
| ---------- | ------------- | ------- | ------ |
| **Smoke**  | 2 (constante) | 30s     | 0s     |
| **Load**   | 0→20→20→0     | 5min    | 30s    |
| **Stress** | 0→50→100→0    | 3.5min  | 5m30s  |

### Thresholds (SLOs)

| Métrica                 | Limite   |
| ----------------------- | -------- |
| `http_req_duration` p95 | < 500ms  |
| `http_req_duration` p99 | < 1500ms |
| `http_req_failed`       | < 5%     |
| Health endpoint p95     | < 200ms  |

### Endpoints testados

- `GET /health` — health check
- `GET /api/info` — info do sistema
- `GET /api/version` — versão
- `GET /metrics` — métricas Prometheus
- `GET /` — assets estáticos

---

## Security Scanning (CI/CD)

O pipeline GitHub Actions inclui scan de vulnerabilidades com [Trivy](https://trivy.dev/):

- Scan automático de imagens Docker (backend + frontend) a cada push
- Severidade: CRITICAL e HIGH (vulnerabilidades não corrigidas ignoradas)
- Resultados em formato SARIF enviados ao GitHub Security tab
- Tabela resumo no log do workflow

---

## Renovação Automática de Certificados

```powershell
# Renovação manual
.\scripts\docker-ssl-renew.ps1

# Instalar tarefa agendada (renovação a cada 12h)
.\scripts\docker-ssl-renew.ps1 -Install

# Remover tarefa agendada
.\scripts\docker-ssl-renew.ps1 -Uninstall
```

---

## Deploy CI/CD (GitHub Actions)

O deploy para VPS é feito via Docker Compose, sem PM2. Os workflows fazem SSH na VPS, atualizam o código e recriam os containers.

### Produção (main → Hostinger)

- Trigger: push para `main` ou `workflow_dispatch`
- Workflow: `.github/workflows/deploy-hostinger.yml`
- Ações: `git reset --hard` → `docker compose up -d --build` → healthcheck → prune

### Staging (dev/staging → Hostinger)

- Trigger: push para `dev` ou `staging`
- Workflow: `.github/workflows/deploy-staging.yml`
- Mesmo fluxo, diretório separado (`/var/www/singem-staging`)

### Deploy manual (via script)

```bash
# Na branch main, com working tree limpo:
bash scripts/deploy-main.sh

# Sem criar tag:
CREATE_TAG=0 bash scripts/deploy-main.sh

# Com compose file customizado:
COMPOSE_DIR=docker/prod bash scripts/deploy-main.sh
```

O script faz: bump de versão → tag → push → `docker compose up -d --build` → healthcheck.

### Pré-requisitos na VPS

1. Docker Engine ≥ 24 + Compose v2
2. `docker/prod/.env` configurado com todos os secrets
3. Certificados TLS em `docker/ssl/` (se HTTPS habilitado)
4. Portas 80 e 443 no firewall

---

## Documentação adicional

- [GitHub Environments & Secrets](docs/GITHUB_ENVIRONMENTS.md) — configuração de CI/CD
- [Infraestrutura Enterprise](docs/INFRAESTRUTURA_ENTERPRISE.md) — arquitetura do sistema
- [Boas Práticas](docs/BOAS_PRATICAS.md) — padrões de código
