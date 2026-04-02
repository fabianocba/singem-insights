# ADR: Padronizacao de Registro de Rotas no Backend

- Data: 2026-04-01
- Status: Aprovado e implementado

## Contexto

O backend do SINGEM cresceu com rotas em multiplos diretorios:

- server/routes/
- server/modules/*/*.routes.js
- server/src/routes/

Embora funcional, o bootstrap ficava concentrado em server/app.js com alto acoplamento e baixa rastreabilidade.

## Decisao

Centralizar o registro das rotas de API em um unico ponto:

- server/src/core/routes.js

A funcao registerRoutes(app, dependencies) passa a:

1. Registrar rotas de forma consistente.
2. Aplicar middlewares transversais no ponto de composicao.
3. Retornar lista de rotas registradas para observabilidade.

## Implementacao

- server/src/core/routes.js agora registra todo o grafo de endpoints publicos da API.
- server/app.js delega o registro para registerRoutes.
- O array registeredRoutes final passa a ser derivado da composicao centralizada.

## Consequencias

### Positivas

- Menor acoplamento do bootstrap principal.
- Padrao unico para adicionar/remover endpoints.
- Melhor auditabilidade do mapa de rotas.

### Negativas

- Ainda existem arquivos fisicos em diretorios diferentes (migracao estrutural completa permanece incremental).

## Proximos passos

1. Introduzir convencao de modulo para novas rotas (domain-first).
2. Migrar gradualmente server/src/routes para server/modules.
3. Remover duplicidades de naming entre routes e modules.
