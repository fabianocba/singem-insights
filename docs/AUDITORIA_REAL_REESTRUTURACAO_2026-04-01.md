# Auditoria Real + Reestruturacao Profunda (Estado Atual)

Data: 2026-04-01
Escopo: codigo real presente e ativo no workspace atual.

## 1) Estrutura real em execucao

### Backend ativo (runtime)

- Entrada: `server/index.js` -> `server/bootstrap.js` -> `server/app.js`
- Registro de rotas: `server/src/core/routes.js`
- Modulos de dominio ativos (padrao controller/service/repository/schemas):
  - `server/modules/auth`
  - `server/modules/empenhos`
  - `server/modules/notas-fiscais`
  - `server/modules/almoxarifado`
- Rotas complementares ativas (integracoes e legado controlado):
  - `server/routes/*.routes.js` (compras, govbr, serproid, nfe v1/v2, integracoes etc.)
  - `server/src/routes/*.routes.js` (catmat, estoque)

### Frontend ativo

- Entrada principal: `index.html` + `js/app.js`
- Orquestracao modular em andamento via `js/features/app/*`
- Features por dominio existentes:
  - `js/features/auth`
  - `js/features/empenho`
  - `js/features/notaFiscal`
  - `js/features/almoxarifado`
  - `js/features/usuarios`
  - `js/features/unidades`
  - `js/features/configuracoes`
  - `js/features/fornecedores`

## 2) Modulos existentes vs mortos

### Ativos e em uso

- Backend: `auth`, `empenhos`, `notas-fiscais`, `almoxarifado`, integracoes ComprasGov/DadosGov/NFe
- Frontend: `app` (shell/orquestracao), `empenho`, `notaFiscal`, `almoxarifado`, `auth`

### Mortos/removidos detectados e tratados nesta execucao

- Removido: `server/proxy-server.py`
- Removido: `server/proxy-api-siasg.py`
- Removido: `server/iniciar-proxy.ps1`
- Removido: `server/src/modules/ai/.gitkeep`
- Hardened cleanup: `scripts/clean-legacy.ps1` atualizado para remover esses residuos automaticamente.

## 3) Arquivos problematicos por tamanho

### > 800 linhas

- `css/style.css` (4271)
- `css/tailwind-source.css` (4110)
- `js/app.js` (3526)
- `js/consultas/uiConsultas.js` (2004)
- `js/db.js` (1970)
- `css/consultas.css` (1940)
- `js/pdfReader.js` (1777)
- `js/settings/backup.js` (1513)
- `js/ui/appShellTemplate.js` (1501)
- `server/services/price-intelligence.service.js` (1378)
- `js/consultas/precosPraticadosRenderer.js` (1354)
- `server/modules/almoxarifado/almoxarifado.repository.js` (1245)
- `js/features/almoxarifado/pages/almoxarifadoPage.js` (1207)
- `js/importarNfePage.js` (993)
- `js/features/app/notaFiscalFlowSupport.js` (955)
- `js/catmatIntegration.js` (927)
- `js/settings/unidade.js` (893)
- `js/settings/preferencias.js` (849)

### 500-800 linhas (amostra critica)

- `server/integrations/comprasgov/client.js` (761)
- `server/domain/nfe/NfeXmlParser.js` (746)
- `server/services/gov-api/comprasGovGatewayService.js` (729)
- `server/integrations/catmat/catmatService.js` (720)
- `js/nfValidator.js` (709)
- `js/consultas/apiCompras.js` (606)
- `server/services/supplier-intelligence.service.js` (590)
- `js/reports/reportUI.js` (582)
- `js/features/app/relatorios.js` (571)
- `server/src/services/NfeImportServiceV2.js` (564)
- `js/neParser.js` (553)
- `js/relatoriosEmpenhos.js` (551)
- `js/anexarPdfNE.js` (548)
- `js/features/app/empenhoSupport.js` (522)
- `server/modules/almoxarifado/almoxarifado.service.js` (521)

## 4) Diferenca: codigo existente vs codigo executado

- `server/src/modules/*` contem majoritariamente placeholders `.gitkeep` (nao executados).
- Runtime real do backend consome `server/modules/*` e `server/routes/*` via `server/src/core/routes.js`.
- Frontend consome subset de endpoints (`/api/auth/*`, `/api/empenhos*`, `/api/integracoes/*`, `/api/version`, `/api/health`, `/api/compras*`), enquanto backend expoe superficie maior para administracao/integracoes.

## 5) Arquitetura alvo (somente modulos reais)

### Backend (consolidacao proposta)

- Manter apenas um eixo modular:
  - `server/src/modules/<modulo_real>/`
    - `<modulo>.routes.js`
    - `<modulo>.controller.js`
    - `<modulo>.service.js`
    - `<modulo>.repository.js`
    - `<modulo>.validation.js`
- Etapa de migracao incremental:
  1. mover `server/modules/{auth,empenhos,notas-fiscais,almoxarifado}` para `server/src/modules/*`
  2. atualizar `server/src/core/routes.js` para imports unificados
  3. mover `server/routes/*` ainda ativos para `server/src/modules/integracoes/*`
  4. remover duplicidade de pastas `middleware/` vs `middlewares/` (padrao unico)

### Frontend (estado real)

- Padrao alvo por feature real:
  - `js/features/<modulo_real>/index.js`
  - `js/features/<modulo_real>/render.js`
  - `js/features/<modulo_real>/events.js`
  - `js/features/<modulo_real>/state.js`
  - `js/features/<modulo_real>/api.js`
  - `js/features/<modulo_real>/validation.js`
- Consolidacao ja iniciada em `js/features/app/*`; continuar extraindo de `js/app.js` ate virar orquestrador fino.

## 6) Docker/build/cache (estado e validacao)

- Frontend em dev: compose monta bind em `index.html`, `css/`, `js/`, etc. (reflete mudancas sem rebuild total).
- Frontend em prod: build via `Dockerfile.frontend` e Nginx servindo artefatos atuais.
- Risco conhecido: em dev o volume de `css/` sobrescreve `tailwind.css` da imagem; mitigado por `scripts/start.ps1` que roda `npm run tailwind:build` antes do `docker compose up`.
- Validacao recomendada por release:
  - `npm run validate:version`
  - `npm run build`
  - `docker compose -f docker/dev/docker-compose.dev.yml config --quiet`
  - `docker compose -f docker/prod/docker-compose.prod.yml config` (com envs)

## 7) Limpeza brutal aplicada nesta rodada

- Remocao de residuos legados de proxy local e placeholder IA.
- Atualizacao de automacao para evitar regressao (`scripts/clean-legacy.ps1`).

## 8) Backlog imediato de reestruturacao profunda (proxima fase)

1. Quebrar `js/app.js` (3526 linhas) em modulos restantes por fluxo (auth, uploads, tabelas, acao de UI).
2. Dividir `server/services/price-intelligence.service.js` em:
   - `query-normalization`
   - `analytics-metrics`
   - `export-service`
   - `cache-repository`
3. Segmentar `server/modules/almoxarifado/almoxarifado.repository.js` por agregado (`itens`, `movimentacoes`, `solicitacoes`, `auditoria`).
4. Fracionar CSS monolitico (`style.css`, `tailwind-source.css`, `consultas.css`) por contexto de tela.
5. Eliminar placeholders restantes em `server/src/modules/*` apos migracao real para evitar falso modular.

## 9) Criterios de aceite desta rodada

- Sem referencia ativa a IA Core no runtime atual.
- Sem scripts de proxy legado no backend.
- Limpeza automatizada contempla residuos removidos.
- Auditoria documentada com base em evidencias do codigo atual.
