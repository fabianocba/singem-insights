# Backlog de Execucao - SINGEM (2026 Q2)

Data base: 30/03/2026  
Origem: PRD Refinado SINGEM  
Objetivo: transformar o PRD em backlog operavel (epics + issues) para execucao imediata.

## Convencoes

- Prioridade: P0 (critico), P1 (alto), P2 (medio).
- Esforco: S (ate 1 dia), M (2 a 4 dias), L (5 a 8 dias).
- Status inicial: To Do.
- DoR: Definition of Ready.
- DoD: Definition of Done.

## EPIC A - Seguranca e Baseline de Ambiente

### A-01 Criar baseline seguro de ambiente

- Prioridade: P0
- Esforco: M
- Dono sugerido: Backend + Infra
- Dependencias: nenhuma
- Descricao: criar arquivo de exemplo de ambiente sem segredos reais, com orientacoes de preenchimento e validacoes minimas.
- Criterios de aceite:
  - Arquivo de exemplo publicado e referenciado na documentacao.
  - Nenhum valor sensivel hardcoded.
  - Variaveis obrigatorias identificadas e validadas na inicializacao.
- DoR:
  - Lista de variaveis usadas no backend e scripts consolidada.
- DoD:
  - Build local sobe com ambiente preenchido a partir do exemplo.
  - Revisao de seguranca aprovada.

### A-02 Rotacionar segredos operacionais

- Prioridade: P0
- Esforco: M
- Dono sugerido: Infra + Security
- Dependencias: A-01
- Descricao: rotacionar JWT secret, credenciais de banco e contas administrativas, com janela controlada.
- Criterios de aceite:
  - Segredos antigos revogados.
  - Novo ciclo de deploy validado apos rotacao.
  - Procedimento documentado para recorrencia.
- DoR:
  - Janela de manutencao aprovada.
  - Responsaveis nomeados.
- DoD:
  - Evidencia de validacao pos-rotacao registrada.

### A-03 Eliminar advisories high de producao

- Prioridade: P0
- Esforco: M
- Dono sugerido: Backend
- Dependencias: nenhuma
- Descricao: atualizar dependencias vulneraveis no escopo de producao e validar regressao.
- Criterios de aceite:
  - Nenhum advisory high aberto no escopo de producao.
  - Testes de contrato e smoke passando.
- DoR:
  - Baseline atual de advisories coletada.
- DoD:
  - Relatorio antes/depois anexado.

## EPIC B - Sync e Escalabilidade de Integracoes

### B-01 Instrumentar baseline de sync atual

- Prioridade: P1
- Esforco: S
- Dono sugerido: Backend
- Dependencias: nenhuma
- Descricao: medir tempo atual de sync para comparacao posterior.
- Criterios de aceite:
  - Baseline com metodo de medicao documentado.
  - Tempo medio e desvio registrados.
- DoR:
  - Ambiente com volume de dados de referencia definido.
- DoD:
  - Baseline anexada no documento de implementacao.

### B-02 Implementar batching no motor de sync

- Prioridade: P1
- Esforco: L
- Dono sugerido: Backend
- Dependencias: B-01
- Descricao: migrar persistencia sequencial para lotes controlados com protecao de concorrencia e retry.
- Criterios de aceite:
  - Reducao minima de 40% no tempo total de sync em cenario comparavel.
  - Sem perda de integridade de dados.
  - Logs com rastreio por lote.
- DoR:
  - Estrategia de lote e tamanho inicial aprovados.
- DoD:
  - Testes de contrato e smoke passando.
  - Benchmark comparativo anexado.

### B-03 Politica de retencao e expurgo historico

- Prioridade: P1
- Esforco: M
- Dono sugerido: Backend + DBA
- Dependencias: nenhuma
- Descricao: definir e aplicar ciclo de vida para tabelas historicas de auditoria e snapshots.
- Criterios de aceite:
  - Politica por tabela aprovada.
  - Rotina automatizada implementada.
  - Logs de execucao e rollback documentados.
- DoR:
  - Mapeamento de tabelas com risco de crescimento concluido.
- DoD:
  - Execucao validada em ambiente de homologacao.

## EPIC C - Observabilidade, SLO/SLA e Governanca

### C-01 Instrumentar metricas tecnicas por endpoint

- Prioridade: P1
- Esforco: M
- Dono sugerido: Backend + Infra
- Dependencias: nenhuma
- Descricao: publicar p95/p99, timeout-rate e erro-rate por endpoint de integracao.
- Criterios de aceite:
  - Metricas visiveis em dashboard unico.
  - Dados com granularidade minima por endpoint e janela de tempo.
- DoR:
  - Ferramenta de monitoracao definida.
- DoD:
  - Dashboard acessivel e com dados validos.

### C-02 Definir SLO/SLA institucionais

- Prioridade: P2
- Esforco: M
- Dono sugerido: Produto + Engenharia + Operacao
- Dependencias: C-01
- Descricao: formalizar SLO/SLA de integracoes com metas e politicas de incidente.
- Criterios de aceite:
  - Documento aprovado por stakeholders.
  - Metas conectadas aos dashboards de operacao.
- DoR:
  - Historico minimo de metricas coletado.
- DoD:
  - Processo de revisao trimestral definido.

### C-03 Checklist LGPD operacional para integracoes

- Prioridade: P2
- Esforco: M
- Dono sugerido: Produto + Security
- Dependencias: C-02
- Descricao: formalizar checklist de governanca de dados e operacao para integracoes externas.
- Criterios de aceite:
  - Checklist aprovado e incorporado ao fluxo de release.
  - Evidencias exigidas definidas.
- DoR:
  - Inventario de dados trafegados por integracao pronto.
- DoD:
  - Checklist aplicado em ao menos um ciclo de release.

## Ordem de Execucao Recomendada

Sprint 1 (P0): A-01, A-02, A-03  
Sprint 2 (P1): B-01, B-02  
Sprint 3 (P1): B-03, C-01  
Sprint 4 (P2): C-02, C-03

## Dependencias Cruzadas

- A-01 bloqueia A-02.
- B-01 bloqueia comparacao objetiva de resultado de B-02.
- C-01 alimenta C-02.

## Regra de Qualidade para Fechamento de Issue

Uma issue so pode ser concluida quando:
- Criterios de aceite atendidos.
- Evidencias anexadas (logs, output de testes, captura de dashboard ou benchmark).
- Sem regressao critica detectada em fluxo NE/NF/entregas.

## Publicacao de Issues

- Pacote pronto para abertura no GitHub: docs/implementacao/ISSUES_GITHUB_READY_2026Q2.md
- Planejamento por sprint: docs/implementacao/PLANO_SPRINTS_2026Q2.md
