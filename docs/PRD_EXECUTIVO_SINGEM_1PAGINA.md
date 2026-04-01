# SINGEM - PRD Executivo (1 pagina)

Data: 30/03/2026  
Status: Draft para aprovacao executiva

## Objetivo

Consolidar o SINGEM como plataforma institucional hibrida (offline-first + backend oficial) com foco em seguranca, escalabilidade de integracoes e governanca operacional em 90 dias.

## Por que agora

- Fluxo de negocio principal ja funciona, mas existem riscos tecnicos e operacionais mapeados em auditoria.
- Crescimento de integracoes e dados historicos exige controles formais de capacidade e conformidade.

## Resultado esperado

- Reducao de risco critico de seguranca.
- Melhor throughput de sincronizacao.
- Operacao orientada por metricas com SLO/SLA formal.

## Metas de 90 dias

1. Reduzir 50% dos riscos de seguranca no Top 10 da auditoria ate 45 dias.
2. Reduzir 40% do tempo medio de sync com batching ate 45 dias.
3. Publicar SLO/SLA e monitorar p95/p99 por endpoint ate 90 dias.
4. Estabilizar disponibilidade de integracoes em 99,5% apos Fase 3.

## Escopo desta iniciativa

Inclui:

- Baseline seguro de ambiente e rotacao de segredos.
- Atualizacao de dependencias vulneraveis.
- Batching de sincronizacao.
- Politica de retencao/expurgo historico.
- Dashboard de metricas tecnicas e SLO/SLA.

Nao inclui:

- Reescrita total do frontend legado.
- Mudanca de stack principal.
- Novos modulos fora de NE/NF/entregas neste ciclo.

## Plano de execucao

Fase 1 (0-15 dias): contencao de risco (segredos, baseline seguro, dependencias high).  
Fase 2 (15-45 dias): robustez operacional (batching, retencao, metricas).  
Fase 3 (45-90 dias): escala institucional (SLO/SLA, dashboard e capacidade).

## Indicadores de sucesso

- Riscos criticos/altos remanescentes.
- Latencia p95/p99 por endpoint.
- Timeout-rate e erro-rate por integracao.
- Tempo medio de sync por lote.
- Disponibilidade e MTTR.

## Decisao solicitada

Aprovar:

1. Escopo do ciclo de 90 dias.
2. Ordem de prioridade P0 -> P1 -> P2.
3. Gate de Go/No-Go ao fim de cada fase.

## Artefatos vinculados

- PRD completo: docs/PRD_REFINADO_SINGEM_2026.md
- Backlog de issues: docs/implementacao/BACKLOG_ISSUES_SINGEM_2026Q2.md
- Checklist da Fase 1: docs/implementacao/FASE1_CHECKLIST_EXECUCAO_15_DIAS.md
- Pacote de issues prontas: docs/implementacao/ISSUES_GITHUB_READY_2026Q2.md
- Plano de sprints: docs/implementacao/PLANO_SPRINTS_2026Q2.md
