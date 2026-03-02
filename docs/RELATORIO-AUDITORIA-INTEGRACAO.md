# AUDITORIA TÉCNICA COMPLETA — INTEGRAÇÃO COMPRASGOV / DADOSGOV (SINGEM)

Data da auditoria: 2026-03-02  
Escopo: análise estática de backend + frontend, sem implementação.

## Resumo Executivo (1 página)

### Situação geral

- Maturidade atual: **avançado-operacional**.
- A integração já possui pilares críticos implementados:
  - clients dedicados (ComprasGov + DadosGov CKAN);
  - rotas internas institucionais;
  - cache com TTL configurável;
  - retry/backoff/timeout;
  - auditoria técnica de chamadas externas;
  - sync engine com lock distribuído (PostgreSQL advisory lock);
  - painel administrativo no frontend;
  - snapshot de pesquisa de preço com estatísticas.

### O que está pronto

- Segurança de acesso nas integrações administrativas: rotas `/api/integracoes/*` protegidas com autenticação e perfil admin.
- Concorrência de sincronização: lock distribuído evita execução simultânea entre instâncias.
- Contrato mínimo de integração: testes `test:integracoes` com execução validada (7/7).

### Principais pendências

- **Consolidação arquitetural**: coexistem trilhas nova e legada (`/api/integracoes/*` e `/api/integrations/*`).
- **Cobertura de testes**: contratos ainda focados em ComprasGov; falta ampliar para CKAN e endpoints administrativos.
- **Escala de cache**: cache técnico em memória local por instância (sem compartilhamento nativo entre nós).

### Risco atual

- **Não há risco crítico aberto** dos itens tratados nesta rodada (acesso admin e lock distribuído já aplicados).
- Riscos remanescentes são majoritariamente de **governança, padronização e confiabilidade ampliada**.

### Decisão executiva recomendada

- **Produção institucional controlada: APROVADA COM RESSALVAS**.
- Plano recomendado em 3 frentes:
  1. deprecar trilhas legadas e consolidar camada única;
  2. ampliar testes de contrato (CKAN/admin/sync);
  3. definir estratégia de cache para escala horizontal.

### Checklist executivo rápido

- Produção: **Parcialmente pronta (com ressalvas)**
- Ambiente institucional: **Parcialmente pronta**
- Auditoria externa: **Parcialmente pronta**
- Escala: **Parcialmente pronta**
- Instabilidade de API externa: **Pronta, com ressalvas de cobertura de testes**

## 1) Escopo auditado (mapeamento estrutural)

### 1.1 Clients centrais

- ComprasGovClient: [server/integrations/comprasgov/client.js](server/integrations/comprasgov/client.js)
- DadosGovCkanClient: [server/integrations/dadosgov/ckanClient.js](server/integrations/dadosgov/ckanClient.js)

### 1.2 Rotas internas com prefixo /api/integracoes/

Montagem de rotas no app:

- [server/app.js](server/app.js)

Prefixo administrativo:

- GET `/api/integracoes/auditoria`
- POST `/api/integracoes/sync/run`
- GET `/api/integracoes/sync/status`
- POST `/api/integracoes/cache/clear`
- GET `/api/integracoes/pesquisa-preco/snapshot/:id?format=json|html|pdf`
- GET `/api/integracoes/dashboard`
- Fonte: [server/routes/integracoes-admin.routes.js](server/routes/integracoes-admin.routes.js)

Prefixo ComprasGov:

- GET `/api/integracoes/comprasgov/health`
- GET `/api/integracoes/comprasgov/catmat/itens|grupos|classes`
- GET `/api/integracoes/comprasgov/catser/itens|grupos|classes`
- GET `/api/integracoes/comprasgov/pesquisa-preco/material|servico`
- GET `/api/integracoes/comprasgov/uasg|fornecedor|contratacoes|arp|contratos|legado/licitacoes|legado/itens|ocds`
- Fonte: [server/routes/comprasgov.routes.js](server/routes/comprasgov.routes.js)

Prefixo DadosGov CKAN:

- GET `/api/integracoes/dadosgov/ckan/package-search`
- GET `/api/integracoes/dadosgov/ckan/package-show`
- GET `/api/integracoes/dadosgov/ckan/package_search`
- GET `/api/integracoes/dadosgov/ckan/package_show`
- GET `/api/integracoes/dadosgov/ckan/resource-download`
- GET `/api/integracoes/dadosgov/ckan/resource_download`
- GET `/api/integracoes/dadosgov/ckan/health`
- Fonte: [server/routes/dadosgov.routes.js](server/routes/dadosgov.routes.js)

### 1.3 Adaptadores (catmat, catser, pesquisaPreco, uasg, fornecedor...)

Implementados como operações do módulo de integração (não há pasta dedicada `adapters/`):

- Mapeamento de operações por domínio: [server/integrations/comprasgov/index.js](server/integrations/comprasgov/index.js)
- Normalização de resposta/paginação: [server/integrations/comprasgov/client.js](server/integrations/comprasgov/client.js)

### 1.4 Cache

- Cache técnico em memória (Map) com TTL por namespace + métricas: [server/integrations/core/integrationCache.js](server/integrations/core/integrationCache.js)
- TTL configurável por domínio no ComprasGov e CKAN via config/env: [server/config/index.js](server/config/index.js)

### 1.5 Retry/Backoff

- ComprasGov: timeout + retry exponencial + tratamento 408/429/5xx: [server/integrations/comprasgov/client.js](server/integrations/comprasgov/client.js)
- CKAN: retry exponencial + fallback de base URL: [server/integrations/dadosgov/ckanClient.js](server/integrations/dadosgov/ckanClient.js)

### 1.6 Paginação automática segura

- ComprasGov possui `buscarTodasPaginas` com limite configurável (`maxAutoPages`) e clamp de `tamanhoPagina` até 500: [server/integrations/comprasgov/client.js](server/integrations/comprasgov/client.js)
- CKAN não implementa paginação automática consolidada (somente ações pontuais).

### 1.7 Auditoria de chamadas externas

- Registro técnico em `audit_api_calls` com `request_id`, endpoint externo, duração e `cache_hit`: [server/integrations/core/auditApiCalls.js](server/integrations/core/auditApiCalls.js)
- ComprasGov também grava trilha adicional em `audit_log` de negócio (`persistAudit`): [server/integrations/comprasgov/client.js](server/integrations/comprasgov/client.js)

### 1.8 Sync engine (ETL)

- Implementado em: [server/integrations/sync/engine.js](server/integrations/sync/engine.js)
- Rotas admin para execução/status: [server/routes/integracoes-admin.routes.js](server/routes/integracoes-admin.routes.js)

### 1.9 Painel administrativo frontend

- Aba Integrações no HTML: [config/configuracoes.html](config/configuracoes.html)
- Lógica de painel: [js/settings/integracoes.js](js/settings/integracoes.js)
- Carregamento no settings manager: [js/settings/index.js](js/settings/index.js)

### 1.10 Snapshot de pesquisa de preço

- Persistência e estatísticas (menor, maior, média, mediana): [server/integrations/comprasgov/client.js](server/integrations/comprasgov/client.js)
- Exposição por endpoint em JSON/HTML/PDF: [server/routes/integracoes-admin.routes.js](server/routes/integracoes-admin.routes.js)

### 1.11 Testes de integração

- Teste de contrato existente para principais rotas ComprasGov: [server/tests/integracoes.contract.test.js](server/tests/integracoes.contract.test.js)
- Script: `test:integracoes` em [server/package.json](server/package.json)

---

## 2) Conformidade com requisitos

| Requisito                                                           | Status          | Evidência                                                                                                                                                                                                                                                                               | Observação                                                                                                                       |
| ------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Camada única de integração                                          | ⚠ Parcial      | [server/integrations/comprasgov](server/integrations/comprasgov), [server/integrations/dadosgov](server/integrations/dadosgov), coexistindo com [server/integrations/catmat](server/integrations/catmat) e [server/routes/integrations.routes.js](server/routes/integrations.routes.js) | Há duplicidade de estratégias (`/api/integracoes/*` e `/api/integrations/*`) e frontend legado de consultas usando outra trilha. |
| Cache com TTL configurável                                          | ✅ Implementado | [server/integrations/core/integrationCache.js](server/integrations/core/integrationCache.js), [server/config/index.js](server/config/index.js), [server/.env.development](server/.env.development), [server/.env.production](server/.env.production)                                    | TTL por domínio e flags de enable.                                                                                               |
| Auditoria completa (requestId, endpoint externo, duração, cacheHit) | ✅ Implementado | [server/integrations/core/auditApiCalls.js](server/integrations/core/auditApiCalls.js)                                                                                                                                                                                                  | Campos exigidos presentes.                                                                                                       |
| Sync Engine com lock                                                | ✅ Implementado | [server/integrations/sync/engine.js](server/integrations/sync/engine.js)                                                                                                                                                                                                                | Lock local (`state.running`) + lock distribuído com `pg_try_advisory_lock`.                                                      |
| Snapshot de preço com estatísticas                                  | ✅ Implementado | [server/integrations/comprasgov/client.js](server/integrations/comprasgov/client.js), [server/migrations/005_fase2_integracoes.sql](server/migrations/005_fase2_integracoes.sql)                                                                                                        | Gera snapshot com métricas estatísticas e endpoint de emissão.                                                                   |
| Health check endpoints                                              | ✅ Implementado | [server/routes/comprasgov.routes.js](server/routes/comprasgov.routes.js), [server/routes/dadosgov.routes.js](server/routes/dadosgov.routes.js), [server/routes/integracoes-admin.routes.js](server/routes/integracoes-admin.routes.js)                                                  | Health por integração + dashboard consolidado.                                                                                   |
| Testes mínimos de contrato                                          | ⚠ Parcial      | [server/tests/integracoes.contract.test.js](server/tests/integracoes.contract.test.js)                                                                                                                                                                                                  | Cobre ComprasGov; não cobre CKAN/admin/sync/snapshot de ponta a ponta.                                                           |
| Tratamento padronizado de erro                                      | ✅ Implementado | [server/routes/comprasgov.routes.js](server/routes/comprasgov.routes.js), [server/routes/dadosgov.routes.js](server/routes/dadosgov.routes.js)                                                                                                                                          | Envelope consistente com `success=false`, `requestId`, `externalStatus`.                                                         |
| Limite seguro de paginação (ex.: 500)                               | ✅ Implementado | [server/integrations/comprasgov/client.js](server/integrations/comprasgov/client.js), [server/tests/integracoes.contract.test.js](server/tests/integracoes.contract.test.js)                                                                                                            | `maxPageSize` clamp até 500.                                                                                                     |
| Variáveis .env configuradas corretamente                            | ✅ Implementado | [server/config/index.js](server/config/index.js), [server/.env.development](server/.env.development), [server/.env.production](server/.env.production)                                                                                                                                  | Chaves de integração presentes para ComprasGov/CKAN/Integrações.                                                                 |

---

## 3) Estado de maturidade

### ✅ O que está corretamente implementado

- Clients dedicados para ComprasGov e CKAN.
- Rotas internas de integração organizadas por domínio.
- Cache técnico com TTL e métricas.
- Retry/backoff e timeout nas integrações externas.
- Auditoria técnica persistente de chamadas externas.
- Snapshot de pesquisa de preço com estatística e emissão de relatório.
- Painel administrativo de integrações no frontend.
- Teste de contrato mínimo para ComprasGov.

### ⚠ O que está parcialmente implementado

- Camada única: coexistem arquitetura nova (`/api/integracoes/*`) e antiga (`/api/integrations/*`, CATMAT legado).
- Cobertura de testes: ausência de contratos para CKAN/admin/sync.
- Paginação automática robusta está madura no ComprasGov, mas não em todas as integrações.

### ❌ O que NÃO está implementado

- Testes de contrato para dados.gov CKAN e endpoints administrativos.
- Camada única de integração totalmente consolidada (ainda coexistem trilhas legadas em paralelo).

---

## 4) Riscos arquiteturais (com criticidade)

### ALTO

1. Duplicidade de trilhas de integração (novo + legado) aumenta risco de divergência funcional e de manutenção.  
   Evidências: [server/routes/integrations.routes.js](server/routes/integrations.routes.js), [server/integrations/catmat](server/integrations/catmat), [js/consultas/apiCompras.js](js/consultas/apiCompras.js).

### MÉDIO

2. Cache técnico em memória local não compartilhado entre instâncias e sem persistência em restart.

3. Testes de contrato focados em ComprasGov; falta cobertura de CKAN/admin/sync/snapshot.

---

## 5) Arquivos potencialmente desnecessários/duplicados

- Stack legado paralelo de integração CATMAT/Integrations:
  - [server/routes/integrations.routes.js](server/routes/integrations.routes.js)
  - [server/integrations/catmat](server/integrations/catmat)
- Cliente frontend de consultas diretas com lógica própria de retry/cache diferente da trilha oficial de integração:
  - [js/consultas/apiCompras.js](js/consultas/apiCompras.js)
  - [js/consultas/cache.js](js/consultas/cache.js)
- Relatórios históricos potencialmente redundantes:
  - [docs/RELATORIO-INTEGRACAO-COMPRASGOV.md](docs/RELATORIO-INTEGRACAO-COMPRASGOV.md)
  - [docs/RELATORIO-FASE2-INTEGRACAO-COMPRASGOV.md](docs/RELATORIO-FASE2-INTEGRACAO-COMPRASGOV.md)

Observação: “desnecessário” aqui indica sobreposição funcional/documental; não implica remoção imediata sem plano de migração.

---

## 6) Pontos de segurança que precisam melhoria

- Validar periodicamente políticas de autorização por perfil administrativo em `/api/integracoes/*`.
- Avaliar rate limit mais restritivo para endpoints administrativos de sync/cache.
- Revisar política de auditoria para incluir actor e origem IP de forma consistente em todas as trilhas.
- Definir política de retenção/mascaramento para `query_params` auditados (evitar exposição de dados sensíveis em logs).

---

## 7) Mapa da arquitetura atual

### 7.1 Diagrama textual

```text
Frontend Configurações (Aba Integrações)
  -> /api/integracoes/dashboard|auditoria|sync|cache|snapshot
      -> integracoes-admin.routes
          -> ComprasGovClient / DadosGovCkanClient
              -> integrationCache (Map + TTL)
              -> auditApiCalls (audit_api_calls)
              -> persistAudit ComprasGov (audit_log)
              -> Sync Engine (sync_jobs + caches locais)
              -> Price Snapshot (price_snapshot)

Fluxo paralelo legado:
Frontend Consultas Diversas -> js/consultas/apiCompras.js -> /api/... (proxy/rotas legadas)
```

### 7.2 Fluxo real das chamadas

1. Frontend chama endpoint interno em `/api/integracoes/*`.
2. Rota encaminha para módulo de integração (`comprasgov` ou `dadosgov`).
3. Client aplica sanitização, clamp de paginação, timeout/retry/backoff.
4. Client consulta cache técnico; se miss, chama endpoint externo.
5. Chamada é auditada em `audit_api_calls` (incluindo `cache_hit`).
6. Resposta é normalizada para envelope padrão.
7. Em pesquisa de preço, gera snapshot estatístico em `price_snapshot`.

### 7.3 Dependências usadas na integração

- Backend HTTP: `fetch` nativo (Node)
- API server: `express`
- Banco: `pg`
- PDF de snapshot: `pdfkit`
- Config/env: `dotenv`
- Segurança básica HTTP: `helmet`, `cors`, `express-rate-limit`

Fonte principal: [server/package.json](server/package.json)

### 7.4 Tabelas relacionadas à integração

- `audit_api_calls` (migration 005)
- `sync_jobs` (migration 005)
- `catser_cache` (migration 005)
- `uasg_cache` (migration 005)
- `price_snapshot` (migration 005)
- `catmat_cache` (migration 004)
- `audit_log` (migration 001; trilha complementar do ComprasGov)

Fontes: [server/migrations/005_fase2_integracoes.sql](server/migrations/005_fase2_integracoes.sql), [server/migrations/004_catmat_api_oficial_cache.sql](server/migrations/004_catmat_api_oficial_cache.sql), [server/migrations/001_schema_completo.sql](server/migrations/001_schema_completo.sql)

---

## 8) Melhorias recomendadas por prioridade

### Alta

1. Consolidar camada de integração e planejar depreciação de trilhas legadas duplicadas.
2. Expandir testes de contrato para CKAN e endpoints administrativos críticos.
3. Fortalecer observabilidade operacional do sync (métricas de lock, tempo de execução e alertas).

### Média

1. Padronizar estratégia de cache entre módulos legados e novos.
2. Definir retenção e governança para logs de auditoria técnica.
3. Revisar janela e limiares de rate limiting para endpoints administrativos.

### Baixa

1. Unificar nomenclatura de rotas (`package-search` e `package_search`) após período de compatibilidade.
2. Consolidar documentação histórica de integração em um documento canônico.

---

## 9) Checklist executivo final

- A integração está pronta para produção? **Parcialmente**.
  - Núcleo técnico está funcional e endurecido, mas ainda há pendências de consolidação arquitetural e cobertura de testes.

- Está pronta para ambiente institucional? **Parcialmente**.
  - Controle de acesso crítico está aplicado; faltam melhorias de governança e testes ampliados.

- Está pronta para auditoria externa? **Parcialmente**.
  - Trilhas de auditoria existem, mas ainda há inconsistências arquiteturais (duas trilhas de integração).

- Está pronta para escala? **Parcialmente**.
  - Lock distribuído de sync já reduz risco de concorrência, mas cache in-memory ainda limita comportamento em múltiplas instâncias.

- Está pronta para instabilidade da API externa? **Sim, com ressalvas**.
  - Retry/backoff/timeout e fallback parcial estão implementados, mas cobertura de testes ainda é limitada fora do ComprasGov.

---

## 10) Conclusão de maturidade

Nível de maturidade atual: **avançado-operacional (com pendências estruturais não críticas)**.

O projeto possui pilares centrais implementados (camada dedicada, auditoria, cache, sync com lock distribuído, painel e controle de acesso administrativo). O foco restante é consolidar trilhas legadas e ampliar a cobertura de testes de contrato para elevar confiabilidade institucional.
