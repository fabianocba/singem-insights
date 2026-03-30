# PRD Refinado - SINGEM

Versao: 1.0  
Data: 30/03/2026  
Autores: Produto + Engenharia SINGEM  
Status: Draft para revisao e aprovacao

## 1. Resumo Executivo

Projeto: Evolucao do SINGEM para operacao institucional hibrida (offline-first + backend oficial).

Problema: O fluxo local ja atende operacao diaria de NE/NF/entregas, mas ainda existem lacunas de governanca operacional, escalabilidade de integracoes e formalizacao de indicadores (SLO/SLA, retencao, LGPD operacional).

Solucao proposta (alto nivel): Consolidar o frontend enterprise existente com o backend Node/Express + PostgreSQL via roadmap de 90 dias, priorizando seguranca, robustez de sync e observabilidade.

Resultado principal esperado: Plataforma de controle de materiais com confiabilidade institucional, reduzindo retrabalho operacional e risco tecnico em producao.

## 2. Contexto de Negocio e Alinhamento

### 2.1 Contexto atual

- O sistema ja cobre os fluxos principais de almoxarifado: cadastro de empenhos, entrada de NF, comparacao NE x NF, recebimento e controle de saldos.
- A arquitetura oficial e hibrida:
  - Frontend offline-first com IndexedDB para continuidade local.
  - Backend oficial com PostgreSQL para APIs, autenticacao e integracoes.
  - Orquestracao oficial via Docker em dev e prod.

### 2.2 Publico-alvo

- Administradores: configuracao, seguranca, integracoes e governanca.
- Almoxarifes: operacao diaria de recebimento, validacao e saldos.
- Gestores: visao de indicadores, auditoria e conformidade.

### 2.3 Alinhamento estrategico

- Aumentar confiabilidade operacional do processo de compras e recebimento.
- Reduzir risco de seguranca e risco de indisponibilidade.
- Preparar base para crescimento institucional com observabilidade e capacidade.

## 3. Objetivos e Metricas de Sucesso

### 3.1 Objetivos SMART

1. Reduzir em 50% o risco de seguranca aberto no Top 10 da auditoria ate o fim da Fase 2 (45 dias).
2. Reduzir em 40% o tempo medio de sincronizacao de catalogos com batching ate o fim da Fase 2.
3. Definir e publicar SLO/SLA tecnicos de integracoes e monitorar p95/p99 em producao ate o fim da Fase 3 (90 dias).
4. Atingir disponibilidade operacional de 99,5% no backend de integracoes apos estabilizacao da Fase 3.

### 3.2 KPIs

- Quantidade de riscos criticos/altos abertos na auditoria.
- Latencia p95/p99 por endpoint de integracao.
- Taxa de timeout e erro por integracao externa.
- Tempo medio de sync por lote.
- Crescimento mensal das tabelas historicas e taxa de expurgo.
- Disponibilidade do backend e tempo de recuperacao (MTTR).

## 4. Escopo

### 4.1 In-scope (release de refinamento)

Produto e operacao:
- Formalizacao de PRD, criterios de aceite e governanca de release.
- Definicao de SLO/SLA operacionais e rotina de observabilidade.

Seguranca:
- Rotacao de segredos JWT/DB/admin.
- Baseline de ambiente seguro (.env.example sem defaults inseguros).
- Atualizacao de dependencias com vulnerabilidades high.

Dados e performance:
- Politica de retencao/expurgo para tabelas historicas.
- Implementacao de batching no sync de catalogos.
- Instrumentacao de metricas (latencia, timeout-rate, erro-rate).

Infra e deploy:
- Padronizacao dos fluxos via scripts oficiais start/stop/rebuild/logs/deploy.
- Validacao de checklist de prontidao para producao.

### 4.2 Out-of-scope (neste ciclo)

- Reescrita completa do frontend legado.
- Mudanca de stack principal (Node/Express/PostgreSQL).
- Implementacao de novos modulos de negocio fora do fluxo NE/NF/entregas.

### 4.3 MVP deste refinamento

- P0 de seguranca concluido.
- Batching de sync ativo em producao.
- SLO/SLA publicados e metricas p95/p99 monitoradas.
- Politica de retencao operacional em execucao.

## 5. Requisitos Funcionais e Historias Prioritarias

### 5.1 EPIC A - Seguranca e Configuracao

Historia A1:
- Como administrador, quero rotacionar segredos e remover defaults inseguros para reduzir risco de comprometimento.
- Criterio de aceite:
  - Nenhum segredo sensivel em arquivos de exemplo.
  - Processo documentado de rotacao e validado em ambiente dev.

Historia A2:
- Como equipe de engenharia, quero atualizar dependencias vulneraveis para reduzir exposicao a CVEs.
- Criterio de aceite:
  - Sem advisories high abertas no escopo de producao.

### 5.2 EPIC B - Sync e Escalabilidade

Historia B1:
- Como sistema, quero persistir sincronizacao em lotes para reduzir latencia total.
- Criterio de aceite:
  - Throughput maior que baseline atual.
  - Tempo total de sync reduzido em no minimo 40% em cenario comparavel.

Historia B2:
- Como operacao, quero evitar impacto de crescimento historico sem governanca.
- Criterio de aceite:
  - Politica de retencao por tabela definida e executada automaticamente.

### 5.3 EPIC C - Observabilidade e Governanca

Historia C1:
- Como gestor tecnico, quero visualizar p95/p99, timeout-rate e erro-rate por endpoint.
- Criterio de aceite:
  - Dashboard operacional disponivel e atualizado.

Historia C2:
- Como organizacao, quero SLO/SLA formais para integrar operacao e decisao de capacidade.
- Criterio de aceite:
  - Documento aprovado por produto + engenharia + operacao.

## 6. Requisitos Nao Funcionais

- Seguranca: autenticao + RBAC ativos; segredo nunca versionado; hardening de dependencias.
- Performance: observacao continua de p95/p99; controle de timeout e retry.
- Escalabilidade: sync com batching e estrategia de crescimento historico.
- Confiabilidade: scripts oficiais como caminho unico de operacao.
- Compliance: formalizacao de controles operacionais de LGPD no escopo de integracoes.

## 7. Arquitetura e Integracoes

### 7.1 Arquitetura alvo

- Frontend:
  - Mantem padrao enterprise atual (Event Bus, Repository, Web Workers, Async Queue).
  - IndexedDB continua como camada local para resiliencia offline.
- Backend:
  - Node.js/Express com middleware de auth, rate limit, logger e error handler.
  - PostgreSQL como persistencia oficial das APIs e integracoes.
- Infra:
  - Docker Compose oficial:
    - dev: docker/dev/docker-compose.dev.yml
    - prod: docker/prod/docker-compose.prod.yml

### 7.2 Integracoes chave

- ComprasGov e dados.gov.br (CKAN).
- Fluxo de sincronizacao de catalogos.
- Modulos de NF-e e consultas diversas (conforme disponibilidade e politica institucional).

## 8. Premissas, Restricoes e Riscos

### 8.1 Premissas

- Times de produto e engenharia disponiveis para validacao de criterios de aceite.
- Ambiente Docker oficial como padrao de execucao e teste.
- Dados historicos com volume crescente exigindo politica de ciclo de vida.

### 8.2 Restricoes

- Nao interromper operacao local offline existente.
- Compatibilidade com fluxo atual de empenhoDraft e statusValidacao.
- Limite de mudanca por release para reduzir risco de regressao operacional.

### 8.3 Riscos prioritarios

- Segredos em ambiente e dependencia vulneravel (alto impacto).
- Sync sequencial sem batching (degradacao de performance).
- Ausencia de SLO/SLA e LGPD operacional (risco de governanca).

## 9. Dependencias

Internas:
- Engenharia frontend, backend, infra/devops.
- Produto e operacao (almoxarifado).

Externas:
- Disponibilidade das APIs externas (ComprasGov/CKAN).
- Janela institucional para deploy e validacao.

## 10. Timeline por Fases (90 dias)

Fase 1 (0-15 dias) - Contencao de risco
- Rotacao de segredos.
- Baseline de ambiente seguro.
- Atualizacao de dependencias criticas.

Fase 2 (15-45 dias) - Robustez operacional
- Batching no sync.
- Retencao/expurgo por tabela.
- Instrumentacao de metricas tecnicas por endpoint.

Fase 3 (45-90 dias) - Escala institucional
- SLO/SLA formal.
- Dashboard operacional com p95/p99.
- Plano de capacidade e rotina periodica de verificacao.

## 11. Stakeholders

- Product Owner: a definir
- Engineering Lead: a definir
- Security/Infra Lead: a definir
- Operacao Almoxarifado: a definir
- Sponsor executivo: a definir

## 12. Backlog Tecnico Inicial (acionavel)

Prioridade P0:
1. Criar baseline seguro de variaveis de ambiente.
2. Rotacionar segredos e validar pipeline de deploy.
3. Corrigir dependencias com advisories high.

Prioridade P1:
1. Implementar batching no motor de sync.
2. Instrumentar metricas de latencia, timeout e erro.
3. Definir e aplicar retencao/expurgo em tabelas historicas.

Prioridade P2:
1. Publicar SLO/SLA oficiais por integracao.
2. Consolidar dashboard de operacao e capacidade.
3. Formalizar checklist LGPD operacional para integracoes.

## 13. Criterios de Go/No-Go

Go:
- P0 concluido sem regressao critica.
- Batching e observabilidade validados em ambiente controlado.
- Procedimentos operacionais documentados.

No-Go:
- Segredos sem rotacao.
- Vulnerabilidade high de producao sem plano aprovado.
- Ausencia de monitoracao minima para endpoints criticos.

## 14. Proximos Passos

1. Revisao conjunta do PRD com produto + engenharia + operacao.
2. Quebra em issues/epics com donos e estimativas.
3. Execucao da Fase 1 com janela de validacao controlada.
4. Revisao quinzenal de KPIs e replanejamento de escopo.

## 15. Artefatos de Execucao

- Backlog em formato de issues: docs/implementacao/BACKLOG_ISSUES_SINGEM_2026Q2.md
- Checklist operacional Fase 1 (0-15 dias): docs/implementacao/FASE1_CHECKLIST_EXECUCAO_15_DIAS.md
- Versao executiva para aprovacao: docs/PRD_EXECUTIVO_SINGEM_1PAGINA.md
- Pacote de issues prontas para GitHub: docs/implementacao/ISSUES_GITHUB_READY_2026Q2.md
- Plano de sprints do ciclo: docs/implementacao/PLANO_SPRINTS_2026Q2.md

## 16. Referencias

- README.md
- version.json
- package.json
- README_DOCKER.md
- docs/INFRAESTRUTURA_ENTERPRISE.md
- docs/RELATORIO-AUDITORIA-MASTER.md
- .github/copilot-instructions.md
