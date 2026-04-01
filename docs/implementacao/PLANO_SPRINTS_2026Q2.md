# Plano de Sprints - SINGEM (2026 Q2)

Base: roadmap de 90 dias do PRD refinado.  
Inicio sugerido: 31/03/2026.

## Premissas de capacidade

- Backend: 10 pontos/sprint
- Infra/Security: 6 pontos/sprint
- Produto/Operacao: 4 pontos/sprint
- Reserva de risco: 20% da capacidade total

## Sprint 1 (31/03 a 11/04)

Objetivo:

- Fechar todo P0 de seguranca.

Itens:

- A-01 Baseline seguro de ambiente.
- A-02 Rotacao de segredos operacionais.
- A-03 Eliminar advisories high.

Saida esperada:

- Gate de seguranca aprovado para avancar a Fase 2.

## Sprint 2 (14/04 a 25/04)

Objetivo:

- Estabelecer baseline tecnica e iniciar ganho de performance.

Itens:

- B-01 Baseline de sync atual.
- B-02 Batching no motor de sync (implementacao principal).

Saida esperada:

- Primeira medicao comparativa de ganho.

## Sprint 3 (28/04 a 09/05)

Objetivo:

- Consolidar robustez operacional e observabilidade.

Itens:

- B-02 Batching no motor de sync (fechamento + hardening).
- B-03 Politica de retencao e expurgo.
- C-01 Metricas por endpoint.

Saida esperada:

- Operacao com metricas tecnicas e governanca de dados historicos.

## Sprint 4 (12/05 a 23/05)

Objetivo:

- Fechar governanca institucional.

Itens:

- C-02 SLO/SLA institucionais.
- C-03 Checklist LGPD operacional.

Saida esperada:

- Pacote completo de governanca para encerramento do ciclo.

## Cerimonias recomendadas

- Planejamento: primeiro dia de sprint.
- Daily: 15 minutos, foco em bloqueios.
- Review: ultimo dia util da sprint.
- Retro: apos review, com plano de melhoria.

## Riscos de cronograma

1. Dependencias externas de API atrasarem validacao.
2. Atualizacao de dependencias gerar regressao maior que o previsto.
3. Falta de dono formal para atividades transversais.

## Mitigacoes

1. Tratar integracoes com contratos e timeout/retry controlados.
2. Liberacao incremental com testes em cada passo.
3. Nomear owners fixos por trilha no kickoff da Sprint 1.
