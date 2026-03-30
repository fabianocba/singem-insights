# Pacote de Issues Prontas - SINGEM (2026 Q2)

Objetivo: abrir rapidamente as issues do ciclo de 90 dias com padrao unico de titulo, descricao, criterios e evidencias.

## Convencoes sugeridas

- Prefixo de titulo: [SINGEM 2026Q2]
- Labels base: tipo:melhoria, area:backend, area:infra, prioridade:P0/P1/P2
- Milestone: Roadmap 90d - SINGEM

## Issue 1

Titulo:
- [SINGEM 2026Q2][P0] A-01 Baseline seguro de ambiente

Descricao:
- Criar e publicar baseline de ambiente seguro sem segredos reais, com instrucoes de preenchimento e validacao minima na inicializacao.

Escopo:
- Mapear variaveis necessarias no backend e scripts.
- Publicar arquivo de exemplo seguro.
- Garantir falha explicita quando variavel obrigatoria estiver ausente.

Criterios de aceite:
- Arquivo de exemplo publicado e referenciado na documentacao.
- Nenhum valor sensivel hardcoded.
- Variaveis obrigatorias identificadas e validadas na inicializacao.

Evidencias:
- Diff do arquivo de exemplo.
- Log de inicializacao com validacao.

Dependencias:
- Nenhuma.

## Issue 2

Titulo:
- [SINGEM 2026Q2][P0] A-02 Rotacao de segredos operacionais

Descricao:
- Rotacionar JWT secret, credenciais de banco e contas administrativas com janela controlada e plano de rollback.

Escopo:
- Troca de segredos em ambiente controlado.
- Revogacao dos segredos antigos.
- Validacao de deploy pos-rotacao.

Criterios de aceite:
- Segredos antigos revogados.
- Novo ciclo de deploy validado.
- Procedimento documentado para recorrencia.

Evidencias:
- Ata da janela de manutencao.
- Registro de validacao pos-rotacao (sem expor segredo).

Dependencias:
- A-01.

## Issue 3

Titulo:
- [SINGEM 2026Q2][P0] A-03 Eliminar advisories high de producao

Descricao:
- Atualizar dependencias vulneraveis no escopo de producao e validar nao regressao.

Escopo:
- Levantar advisories high atuais.
- Atualizar dependencias criticas.
- Rodar testes de contrato e smoke.

Criterios de aceite:
- Nenhum advisory high aberto em producao.
- Testes de contrato e smoke passando.

Evidencias:
- Relatorio antes/depois dos advisories.
- Saida de testes.

Dependencias:
- Nenhuma.

## Issue 4

Titulo:
- [SINGEM 2026Q2][P1] B-01 Baseline de performance do sync

Descricao:
- Medir baseline atual do sync para comparacao objetiva dos ganhos de batching.

Escopo:
- Definir cenario padrao.
- Coletar media e desvio por execucao.
- Documentar metodo.

Criterios de aceite:
- Baseline documentada com metodo reproduzivel.
- Tempo medio e desvio registrados.

Evidencias:
- Relatorio de baseline com carimbo de data.

Dependencias:
- Nenhuma.

## Issue 5

Titulo:
- [SINGEM 2026Q2][P1] B-02 Implementar batching no motor de sync

Descricao:
- Trocar persistencia sequencial por lotes com controle de concorrencia, retry e rastreabilidade.

Escopo:
- Definir tamanho de lote inicial.
- Implementar processamento em batches.
- Preservar integridade e idempotencia.

Criterios de aceite:
- Reducao minima de 40% do tempo total de sync em cenario comparavel.
- Sem perda de integridade de dados.
- Logs com rastreio por lote.

Evidencias:
- Benchmark comparativo baseline x batching.
- Saida de testes de contrato e smoke.

Dependencias:
- B-01.

## Issue 6

Titulo:
- [SINGEM 2026Q2][P1] B-03 Politica de retencao e expurgo historico

Descricao:
- Definir e implantar politica por tabela para crescimento controlado dos dados historicos.

Escopo:
- Definir regra por tabela.
- Automatizar rotina.
- Prever rollback operacional.

Criterios de aceite:
- Politica por tabela aprovada.
- Rotina automatizada implementada.
- Logs de execucao e rollback documentados.

Evidencias:
- Documento de politica.
- Log de execucao em homologacao.

Dependencias:
- Nenhuma.

## Issue 7

Titulo:
- [SINGEM 2026Q2][P1] C-01 Instrumentar metricas por endpoint

Descricao:
- Publicar p95/p99, timeout-rate e erro-rate por endpoint de integracao em dashboard unico.

Escopo:
- Definir pontos de instrumentacao.
- Expor metricas tecnicas por endpoint.
- Disponibilizar painel de consulta.

Criterios de aceite:
- Metricas visiveis em dashboard unico.
- Granularidade minima por endpoint e janela de tempo.

Evidencias:
- Captura do dashboard com dados reais.

Dependencias:
- Nenhuma.

## Issue 8

Titulo:
- [SINGEM 2026Q2][P2] C-02 Definir SLO/SLA institucionais

Descricao:
- Formalizar SLO/SLA de integracoes com metas, tratamento de incidente e revisao periodica.

Escopo:
- Definir metas de disponibilidade e latencia.
- Definir politicas de incidente.
- Aprovar com stakeholders.

Criterios de aceite:
- Documento aprovado por stakeholders.
- Metas conectadas aos dashboards.

Evidencias:
- Documento aprovado e publicado.

Dependencias:
- C-01.

## Issue 9

Titulo:
- [SINGEM 2026Q2][P2] C-03 Checklist LGPD operacional de integracoes

Descricao:
- Formalizar checklist de governanca de dados para fluxo de release de integracoes.

Escopo:
- Inventariar dados trafegados.
- Definir evidencias minimas de compliance.
- Integrar checklist ao release.

Criterios de aceite:
- Checklist aprovado e incorporado ao fluxo de release.
- Evidencias exigidas definidas.

Evidencias:
- Checklist publicado.
- Aplicacao em ao menos um release.

Dependencias:
- C-02.
