# SINGEM — Docker

Guia completo para rodar, parar, rebuildar e monitorar o ambiente SINGEM via Docker.

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    singem-network                       │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │ frontend │───▶│ backend  │───▶│    postgres       │  │
│  │  :80     │    │  :3000   │    │     :5432         │  │
│  │  nginx   │    │  node.js │    │  postgres:15-alp  │  │
│  └──────────┘    └──────────┘    └──────────────────┘  │
│      │                │                                 │
│  host:8000       host:3000           host:5432          │
│                       │                                 │
│                  ┌────────┐   ┌────────────────────┐   │
│                  │ redis  │   │     ai-core         │   │
│                  │ :6379  │   │     :8010           │   │
│                  │ redis:7│   │  python/fastapi      │   │
│                  └────────┘   │  (profile: ai)       │   │
│                host:6379      └────────────────────┘   │
│                                     host:8010           │
└─────────────────────────────────────────────────────────┘
```

| Serviço | Imagem | Porta host | Descrição |
|---|---|---|---|
| `singem-postgres` | `postgres:15-alpine` | `5432` | Banco de dados; volume `singem_postgres_data` |
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

Para HTTPS em produção, adicione um container Nginx reverse proxy com Certbot ou use Caddy na frente.

---

## Estrutura dos arquivos Docker

```
SINGEM/
├── Dockerfile.backend       ← Node.js 20-alpine, multi-stage
├── Dockerfile.frontend      ← nginx:alpine, arquivos estáticos
├── Dockerfile.ai             ← python:3.12-slim, FastAPI
├── docker-compose.yml       ← Orquestração completa
├── .dockerignore             ← O que NÃO entra no build context
├── .env.example              ← Template de variáveis Docker
└── docker/
    ├── nginx.conf            ← Config do NGINX (frontend)
    └── entrypoint-backend.sh ← Script de espera por postgres
```
