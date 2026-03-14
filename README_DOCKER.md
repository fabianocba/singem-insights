# SINGEM — Docker

Guia completo para rodar, parar, rebuildar e monitorar o ambiente SINGEM via Docker.

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
│                       │                    │                     │
│                  ┌────────┐   ┌────────────────────┐            │
│                  │ redis  │   │     ai-core         │            │
│                  │ :6379  │   │     :8010           │            │
│                  │ redis:7│   │  python/fastapi      │            │
│                  └────────┘   │  (profile: ai)       │            │
│                host:6379      └────────────────────┘            │
│                                     host:8010                    │
│                                                                  │
│  ┌─────────────────── Observabilidade ─────────────────────┐    │
│  │ prometheus:9090  grafana:3100   loki:3200   promtail    │    │
│  │ node-exporter    postgres-exp   redis-exp   k6          │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

| Serviço | Imagem | Porta host | Descrição |
|---|---|---|---|
| `singem-postgres` | `pgvector/pgvector:pg15` | `5432` | Banco de dados + pgvector; volume `singem_postgres_data` |
| `singem-redis` | `redis:7-alpine` | `6379` | Cache futuro; volume `singem_redis_data` |
| `singem-backend` | `node:20-alpine` | `3000` | API Node/Express; volume `storage/` e `singem_backend_logs` |
| `singem-frontend` | `nginx:alpine` | `8000` | Frontend estático; proxy `/api/` → backend |
| `singem-ai-core` | `python:3.12-slim` | `8010` | Motor de IA FastAPI (**opcional**, profile `ai`) |

---

## Pré-requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) ≥ 24 (inclui Compose v2)
- Git

---

## Configuração inicial

```bash
# 1. Clone o repositório
git clone https://github.com/fabianocba/SINGEM.git
cd SINGEM

# 2. Crie e ajuste o arquivo de ambiente
cp .env.example .env

# 3. IMPORTANTE: troque os valores sensíveis no .env
#    - JWT_SECRET    → mínimo 32 caracteres, ex: openssl rand -hex 32
#    - DB_PASSWORD   → senha forte do banco
#    - ADMIN_PASSWORD → senha do admin inicial
```

---

## Como rodar

### Ambiente completo (postgres + backend + frontend + redis)

```bash
docker compose up --build
```

Aguarde os healthchecks passarem (~40 s na primeira vez). Quando estiver pronto:

| URL | Serviço |
|---|---|
| http://localhost:8000 | Frontend SINGEM |
| http://localhost:3000/health | Health check do backend |
| http://localhost:3000/api | API REST |

> **Primeiro boot:** o backend roda as migrations automaticamente antes de iniciar.

### Em background (detached)

```bash
docker compose up -d --build
```

### Com AI Core

```bash
docker compose --profile ai up --build
```

### Tudo junto (todos os serviços)

```bash
docker compose --profile full up --build
```

---

## Como parar

```bash
# Para e remove containers (volumes são preservados)
docker compose down

# Para e remove tudo INCLUDING volumes (reset completo do banco)
docker compose down -v
```

---

## Como rebuildar

```bash
# Rebuild de tudo (sem cache)
docker compose build --no-cache

# Rebuild de um serviço específico
docker compose build --no-cache backend
docker compose build --no-cache frontend

# Rebuild + subir
docker compose up --build
```

---

## Como acessar logs

```bash
# Todos os serviços (tempo real)
docker compose logs -f

# Serviço específico
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres

# Últimas N linhas
docker compose logs --tail=100 backend
```

---

## Como conectar no banco de dados

### Via terminal Docker (psql dentro do container)

```bash
docker compose exec postgres psql -U adm -d singem
```

### Via cliente externo (DBeaver, pgAdmin, etc.)

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

### Seed de admin (se necessário)

```bash
docker compose exec backend node scripts/seed-admin.js
```

---

## Variáveis de ambiente importantes

| Variável | Padrão | Descrição |
|---|---|---|
| `DB_NAME` | `singem` | Nome do banco |
| `DB_USER` | `adm` | Usuário PostgreSQL |
| `DB_PASSWORD` | `Singem@12345` | **Trocar em produção!** |
| `JWT_SECRET` | `change_this_...` | **Trocar em produção!** |
| `ADMIN_PASSWORD` | `MudarNaPrimeira...` | Senha do admin inicial |
| `NODE_ENV` | `development` | `development` ou `production` |
| `AI_CORE_ENABLED` | `false` | Ativar comunicação com AI Core |
| `CORS_ORIGINS` | `http://localhost:8000,...` | Origens permitidas (CORS) |

> Em **produção**, configure também `CORS_ORIGINS` com o domínio real, `TRUST_PROXY=true`, e `NODE_ENV=production`.

---

## Diferença entre Docker e desenvolvimento local

| Aspecto | Docker | Dev local (dev-up.ps1) |
|---|---|---|
| Banco | Container postgres (porta 5432) | VPS via túnel SSH (porta 5433) |
| `DB_HOST` | `postgres` (service name) | `127.0.0.1` |
| `DB_PORT` | `5432` | `5433` |
| Frontend | NGINX:alpine | `python -m http.server 8000` |
| AI Core | Container Python (profile `ai`) | Processo local porta 8010 |
| Migrations | Automáticas no boot | Automáticas no boot |

---

## Solução de problemas

### Backend não sobe: "can't connect to postgres"

O postgres pode ainda não ter terminado o startup. Aguarde o healthcheck:

```bash
docker compose ps  # verifique se o estado do postgres é "healthy"
```

### Porta já em uso

```bash
# Pare qualquer processo que use as portas 3000, 5432, 8000
docker compose down
```

No Windows, verifique se o ambiente local (dev-up.ps1) está ativo e rodando nas mesmas portas.

### Reset completo do banco

```bash
docker compose down -v
docker compose up --build
```

### Ver variáveis de ambiente efetivas de um container

```bash
docker compose exec backend env | sort
```

---

## Produção (checklist mínimo)

```bash
# 1. Ajuste o .env:
NODE_ENV=production
TRUST_PROXY=true
JWT_SECRET=<string aleatória forte, min 32 chars>
DB_PASSWORD=<senha forte>
CORS_ORIGINS=https://meudominio.com
ADMIN_PASSWORD=<senha forte única>

# 2. Build e suba em detached
docker compose up -d --build

# 3. Verifique saúde
docker compose ps
curl http://localhost:3000/health
```

Para HTTPS em produção, use o script de TLS (ver seção abaixo) ou Certbot standalone.

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

## Produção com TLS

```bash
# 1. Gere certificados
.\scripts\docker-ssl-setup.ps1 -Mode letsencrypt -Domain singem.ifbaiano.edu.br -Email admin@ifbaiano.edu.br

# 2. Suba com compose de produção (inclui TLS, hardening, limites de memória)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3. Para staging
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

---

## Estrutura dos arquivos Docker

```
SINGEM/
├── Dockerfile.backend              ← Node.js 20-alpine, multi-stage
├── Dockerfile.frontend             ← nginx:alpine, arquivos estáticos
├── Dockerfile.ai                   ← python:3.12-slim / nvidia-cuda (GPU)
├── docker-compose.yml              ← Orquestração base (5 serviços)
├── docker-compose.prod.yml         ← Override produção (TLS, hardening)
├── docker-compose.staging.yml      ← Override staging (HTTP:8080, debug)
├── docker-compose.test.yml         ← Testes isolados (tmpfs, portas alt.)
├── docker-compose.gpu.yml          ← Override GPU NVIDIA
├── docker-compose.monitoring.yml   ← Prometheus + Grafana + exporters
├── docker-compose.logging.yml      ← Loki + Promtail (logs centralizados)
├── docker-compose.waf.yml          ← WAF ModSecurity OWASP CRS
├── docker-compose.loadtest.yml     ← k6 load testing (smoke/load/stress)
├── .dockerignore
├── .env.example
├── docker/
│   ├── nginx.conf                  ← NGINX HTTP (dev, rate-limiting)
│   ├── nginx-ssl.conf              ← NGINX HTTPS (prod, TLS 1.2+)
│   ├── nginx-waf.conf              ← NGINX WAF (ModSecurity)
│   ├── entrypoint-backend.sh       ← Espera por postgres + migrations
│   ├── test-runner.js              ← Health checks integração
│   ├── prometheus.yml              ← Scrape configs Prometheus
│   ├── grafana/
│   │   └── provisioning/
│   │       ├── datasources/
│   │       │   ├── prometheus.yml  ← Datasource Prometheus
│   │       │   └── loki.yml        ← Datasource Loki
│   │       └── dashboards/
│   │           ├── dashboards.yml  ← Provider config
│   │           └── singem-overview.json ← Dashboard pre-configurado
│   ├── loki/
│   │   ├── loki-config.yml         ← Loki storage/retention config
│   │   └── promtail-config.yml     ← Coleta de logs Docker
│   ├── modsecurity/
│   │   └── singem-exclusions.conf  ← Regras contra false positives
│   ├── k6/
│   │   └── singem-load.js          ← Cenários k6 (smoke/load/stress)
│   └── upstream/
│       └── backend.conf            ← Upstream blue/green (gerado)
└── scripts/
    ├── docker-setup.ps1            ← Gera .env com secrets
    ├── docker-health.ps1           ← Diagnóstico de containers
    ├── docker-backup.ps1           ← Backup PostgreSQL com rotação
    ├── docker-backup-scheduler.ps1 ← Agendamento automático de backup
    ├── docker-monitor.ps1          ← Monitoramento contínuo + alertas
    ├── docker-logs.ps1             ← Visualização/filtro de logs
    ├── docker-ssl-setup.ps1        ← Setup de certificados TLS
    ├── docker-ssl-renew.ps1        ← Renovação Let's Encrypt automática
    ├── docker-bluegreen.ps1        ← Deploy blue/green (zero downtime)
    └── docker-rollback.ps1         ← Rollback de versão com histórico
```

---

## Observabilidade (Prometheus + Grafana)

Stack de monitoramento com métricas, dashboards e alertas.

```bash
# Subir monitoring stack
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml up -d

# Com logs centralizados (Loki)
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.logging.yml up -d
```

| URL | Serviço |
|---|---|
| http://localhost:9090 | Prometheus |
| http://localhost:3100 | Grafana (admin / admin) |

### Serviços de monitoramento

| Serviço | Imagem | Função |
|---|---|---|
| `prometheus` | `prom/prometheus:v2.51.0` | Coleta e armazenamento de métricas (30d retenção) |
| `grafana` | `grafana/grafana:11.0.0` | Dashboards e alertas visuais |
| `node-exporter` | `prom/node-exporter:v1.8.0` | Métricas do host (CPU, memória, disco) |
| `postgres-exporter` | `prometheuscommunity/postgres-exporter:v0.15.0` | Métricas do PostgreSQL |
| `redis-exporter` | `oliver006/redis_exporter:v1.61.0` | Métricas do Redis |

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
# Subir com logging
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.logging.yml up -d
```

| Serviço | Imagem | Função |
|---|---|---|
| `loki` | `grafana/loki:3.0.0` | Armazenamento de logs (30d retenção) |
| `promtail` | `grafana/promtail:3.0.0` | Coleta de logs dos containers Docker |

No Grafana, vá em **Explore → Loki** para consultar logs. Filtros disponíveis:
- `{service="backend"}` — logs do backend
- `{service="backend"} |= "ERROR"` — apenas erros
- `{service="postgres"} |= "checkpoint"` — checkpoints do banco

---

## WAF (Web Application Firewall)

Proteção via ModSecurity com OWASP Core Rule Set.

```bash
# Subir com WAF
docker compose -f docker-compose.yml -f docker-compose.waf.yml up -d
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
# Smoke test rápido (30s, 2 VUs)
docker compose -f docker-compose.yml -f docker-compose.loadtest.yml run --rm k6-smoke

# Cenários completos (smoke → load → stress, ~9 min)
docker compose -f docker-compose.yml -f docker-compose.loadtest.yml run --rm k6

# Com output para Prometheus (requer monitoring stack)
docker compose -f docker-compose.yml -f docker-compose.monitoring.yml -f docker-compose.loadtest.yml run --rm k6-prometheus
```

### Cenários

| Cenário | VUs | Duração | Início |
|---|---|---|---|
| **Smoke** | 2 (constante) | 30s | 0s |
| **Load** | 0→20→20→0 | 5min | 30s |
| **Stress** | 0→50→100→0 | 3.5min | 5m30s |

### Thresholds (SLOs)

| Métrica | Limite |
|---|---|
| `http_req_duration` p95 | < 500ms |
| `http_req_duration` p99 | < 1500ms |
| `http_req_failed` | < 5% |
| Health endpoint p95 | < 200ms |

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

## Documentação adicional

- [GitHub Environments & Secrets](docs/GITHUB_ENVIRONMENTS.md) — configuração de CI/CD
- [Infraestrutura Enterprise](docs/INFRAESTRUTURA_ENTERPRISE.md) — arquitetura do sistema
- [Boas Práticas](docs/BOAS_PRATICAS.md) — padrões de código
