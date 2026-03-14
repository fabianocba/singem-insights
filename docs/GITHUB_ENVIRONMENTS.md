# SINGEM — GitHub Environments & Secrets

Guia para configurar os environments e secrets necessários no GitHub para
que os workflows de CI/CD funcionem corretamente.

---

## Environments necessários

Acesse **Settings → Environments** no repositório GitHub e crie:

| Environment | Usado por | Proteção sugerida |
|---|---|---|
| `staging` | `deploy-staging.yml` | Nenhuma (deploy automático) |
| `production` | `deploy-hostinger.yml`, `docker.yml` (push) | Reviewers obrigatórios |

### Configuração recomendada para `production`

1. **Required reviewers**: adicione ao menos 1 mantenedor
2. **Wait timer**: 0 (ou 5 min para grace period)
3. **Deployment branches**: apenas `main` e tags `v*.*.*`

---

## Secrets obrigatórios

### Secrets de repositório (Settings → Secrets and variables → Actions)

| Secret | Usado por | Descrição |
|---|---|---|
| `GITHUB_TOKEN` | `docker.yml` | **Automático** — não precisa criar. Usado para push ao GHCR |

### Secrets do environment `staging`

| Secret | Descrição | Exemplo |
|---|---|---|
| `HOST` | IP/hostname do servidor staging | `203.0.113.10` |
| `USER` | Usuário SSH | `deploy` |
| `SSH_KEY` | Chave privada SSH (conteúdo completo) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PORT` | Porta SSH | `22` |

### Secrets do environment `production`

| Secret | Descrição | Exemplo |
|---|---|---|
| `HOST` | IP/hostname do servidor de produção | `203.0.113.20` |
| `USER` | Usuário SSH | `deploy` |
| `SSH_KEY` | Chave privada SSH (conteúdo completo) | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `PORT` | Porta SSH | `22` |

---

## Secrets opcionais (webhook de monitoramento)

Se utilizar `docker-monitor.ps1` com alertas via webhook:

| Secret | Usado por | Descrição |
|---|---|---|
| `SLACK_WEBHOOK_URL` | `docker-monitor.ps1` via `-WebhookUrl` | Incoming Webhook do Slack |
| `TEAMS_WEBHOOK_URL` | `docker-monitor.ps1` via `-WebhookUrl` | Incoming Webhook do Teams |

Estes não são usados pelos workflows diretamente, mas podem ser referenciados
em scripts de monitoramento no servidor.

---

## Como gerar a chave SSH para deploy

```bash
# No servidor de produção/staging
ssh-keygen -t ed25519 -C "singem-deploy" -f ~/.ssh/singem_deploy -N ""

# Adicione a chave pública ao authorized_keys
cat ~/.ssh/singem_deploy.pub >> ~/.ssh/authorized_keys

# Copie o conteúdo da chave privada para o secret SSH_KEY
cat ~/.ssh/singem_deploy
```

---

## Verificando a configuração

Após configurar, execute manualmente cada workflow para testar:

1. **docker.yml**: vá em Actions → "Docker Build & Push" → "Run workflow"
2. **deploy-staging.yml**: vá em Actions → "Deploy Hostinger Staging" → "Run workflow"
3. **deploy-hostinger.yml**: vá em Actions → "Deploy Hostinger Production" → "Run workflow"

### Checklist

- [ ] Environment `staging` criado com secrets SSH
- [ ] Environment `production` criado com secrets SSH + reviewers
- [ ] Workflow `docker.yml` executa com sucesso (lint + build + integration)
- [ ] Workflow `deploy-staging.yml` faz deploy no servidor staging
- [ ] Workflow `deploy-hostinger.yml` faz deploy em produção (com aprovação)
