# RELATÓRIO DE AUDITORIA — SEGURANÇA

## Metadados

- Data de referência: 2026-03-02
- Tipo: Auditoria técnica documental (segurança de aplicação e operação)
- Escopo: autenticação/autorização, gestão de segredos, dependências e superfície de integração
- Implementações: não realizadas neste relatório

## 1) Escopo e evidências

Escopo focado nas integrações externas, autenticação/autorização, proteção de API, gestão de segredos e superfície de ataque operacional.

Evidências principais:

- Proteção de rotas administrativas (`authenticate` + `requireAdmin`).
- Rate limiting global e dedicado para integrações.
- Sanitização de parâmetros em clientes externos.
- Registro de auditoria técnica de chamadas externas.
- Resultado de dependências com `npm audit --omit=dev --json` (backend).

## 2) Achados de segurança

### 2.1 Controle de acesso e proteção de endpoints

- ✅ **Implementado**: `/api/integracoes/comprasgov`, `/api/integracoes/dadosgov` e `/api/integracoes` protegidos por autenticação e perfil admin.
- ✅ **Implementado**: bloqueio validado por testes de contrato para chamadas sem token.
- Risco residual: **Baixo**.

### 2.2 Limitação de tráfego e abuso

- ✅ **Implementado**: `createApiLimiter` global (`300 req/min`) e `createIntegracoesLimiter` (`120 req/min`).
- ⚠️ Observação: configuração estática (sem ajuste por perfil/tenant).
- Risco residual: **Baixo–Médio**.

### 2.3 Sanitização e resiliência de integração

- ✅ **Implementado**: sanitização/normalização de query params e limitação de paginação.
- ✅ **Implementado**: timeout + retry com backoff para tolerância a falhas transitórias.
- ✅ **Implementado**: validação de protocolo (`http/https`) no download CKAN.
- Risco residual: **Baixo**.

### 2.4 Gestão de segredos e credenciais

- ❌ **Crítico**: segredos e credenciais sensíveis presentes em `server/.env.development` e `server/.env.production` (JWT, DB e senha admin default).
- ❌ **Crítico**: ausência de `server/.env.example` para padrão seguro de implantação.
- Risco: **Crítico** (exposição operacional e possibilidade de comprometimento).

### 2.5 Vulnerabilidades de dependência (produção)

Resultado de `npm audit --omit=dev --json`:

- Total: **5 vulnerabilidades** (`4 high`, `1 low`, `0 critical`).
- Alta severidade transitiva envolvendo cadeia `bcrypt -> @mapbox/node-pre-gyp -> tar`.
- Vulnerabilidades altas em `minimatch` (ReDoS).
- `fixAvailable` aponta atualização com mudança major (`bcrypt@6.0.0`).
- Risco: **Alto** (principalmente em cenários de exploração de dependências transitivas).

## 3) Classificação resumida (✅⚠❌)

| Domínio                                | Status | Severidade |
| -------------------------------------- | ------ | ---------- |
| Autenticação/autorização               | ✅     | Baixa      |
| Rate limiting                          | ✅     | Baixa      |
| Sanitização de entrada nas integrações | ✅     | Baixa      |
| Segredos em arquivos de ambiente       | ❌     | Crítica    |
| Higiene de dependências de produção    | ⚠️     | Alta       |
| Política formal de rotação de segredos | ⚠️     | Alta       |

## 4) Top riscos de segurança

1. **Segredos hardcoded/default em ambiente** — **Crítico**.
2. **Dependências com advisories de alta severidade** — **Alto**.
3. **Ausência de baseline `.env.example` e checklist de rotação** — **Alto**.
4. **Rate limit sem diferenciação por identidade/carga institucional** — **Médio**.

## 5) Recomendações prioritárias

- P0: rotacionar imediatamente `JWT_SECRET`, credenciais de banco e senha admin default.
- P0: retirar segredos sensíveis versionáveis de arquivos operacionais expostos ao time amplo.
- P1: atualizar cadeia de dependências vulneráveis (incluindo avaliação de impacto da major de `bcrypt`).
- P1: introduzir `env.example` seguro + política de segredos (criação, rotação, revogação).
- P2: adicionar varredura CI de dependências e política de bloqueio por severidade.

## 6) Conclusão

A base de proteção de API está sólida (acesso, sanitização, limites), porém a postura de segurança geral fica comprometida por **gestão de segredos inadequada** e **vulnerabilidades de dependências de produção** ainda abertas.

## 7) Arquivos auditados (segurança)

- `server/app.js`
- `server/middleware/auth.js`
- `server/middleware/rateLimit.js`
- `server/middlewares/requestId.js`
- `server/middlewares/requestLogger.js`
- `server/src/middlewares/errorHandler.js`
- `server/integrations/comprasgov/client.js`
- `server/integrations/dadosgov/ckanClient.js`
- `server/integrations/core/auditApiCalls.js`
- `server/.env.development`
- `server/.env.production`
- `server/package.json` (dependências)
