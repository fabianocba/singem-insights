# Fase 1 - Checklist de Execucao (0 a 15 dias)

Data base: 30/03/2026  
Objetivo da fase: contencao de risco e prontidao minima de seguranca para continuidade do roadmap.

Janela sugerida: 31/03/2026 a 11/04/2026.

## Escopo da Fase 1

- Baseline seguro de ambiente.
- Rotacao de segredos operacionais.
- Correcao de vulnerabilidades high em dependencias de producao.

## Responsaveis (nomes a preencher)

- Lead tecnico: [definir]
- Infra/Security: [definir]
- Backend: [definir]
- QA/Operacao: [definir]

## Checklist Operacional

### Semana 1

1. Levantar variaveis de ambiente usadas em backend e scripts.
- Owner: Backend
- Estimativa: 0,5 dia
- Saida esperada: inventario consolidado de variaveis.

2. Publicar baseline seguro de ambiente.
- Owner: Backend + Infra
- Estimativa: 1 dia
- Saida esperada: arquivo de exemplo seguro + instrucoes de uso.

3. Definir plano de rotacao com janela e plano de rollback.
- Owner: Infra/Security
- Estimativa: 0,5 dia
- Saida esperada: procedimento aprovado para execucao.

4. Coletar baseline de vulnerabilidades de producao.
- Owner: Backend
- Estimativa: 0,5 dia
- Saida esperada: lista de pacotes e severidade atual.

### Semana 2

5. Executar rotacao de segredos em ambiente controlado.
- Owner: Infra/Security
- Estimativa: 1 dia
- Saida esperada: segredos antigos revogados e novos validados.

6. Atualizar dependencias vulneraveis (high) e validar aplicacao.
- Owner: Backend
- Estimativa: 2 dias
- Saida esperada: advisories high zerados no escopo de producao.

7. Rodar testes de contrato e smoke apos atualizacoes.
- Owner: Backend + QA
- Estimativa: 1 dia
- Saida esperada: evidencias de nao regressao.

8. Revisao de prontidao e decisao Go/No-Go da fase.
- Owner: Lead tecnico + Operacao
- Estimativa: 0,5 dia
- Saida esperada: ata de decisao com pendencias e plano da Fase 2.

## Comandos de Verificacao (referencia)

- npm run test
- npm run test:contracts:direct
- npm run smoke:nfe
- npm run validate:version

## Gate de Qualidade da Fase 1

Todos os itens abaixo precisam estar cumpridos:

- Baseline de ambiente seguro publicado e validado.
- Rotacao de segredos concluida com rollback testado.
- Sem advisories high em producao.
- Testes de contrato e smoke sem regressao critica.
- Evidencias arquivadas em pasta de implementacao.

## Evidencias Minimas Obrigatorias

- Registro de variaveis e baseline seguro.
- Registro da rotacao (sem expor segredo).
- Relatorio de vulnerabilidades antes/depois.
- Saida de testes e smokes.
- Ata final de Go/No-Go.

## Riscos de Execucao da Fase 1 e Mitigacao

1. Janela de manutencao insuficiente para rotacao.
- Mitigacao: agendar janela dedicada com rollback pre-aprovado.

2. Atualizacao de dependencia gerar regressao.
- Mitigacao: atualizar em blocos pequenos e validar por bateria de testes.

3. Falta de dono claro por atividade.
- Mitigacao: nomear responsaveis antes do inicio da semana 1.

## Definicao de Conclusao da Fase

A Fase 1 so termina quando:
- Gate de qualidade aprovado.
- Pendencias classificadas por severidade.
- Fase 2 planejada com escopo fechado para 30 dias seguintes.

## Governanca de Acompanhamento

- Checkpoint tecnico: segunda, quarta e sexta.
- Responsavel por atualizar status: Lead tecnico.
- Registro oficial de andamento: documento de backlog e board de issues.

## Artefatos Relacionados

- Backlog operacional: docs/implementacao/BACKLOG_ISSUES_SINGEM_2026Q2.md
- Pacote de issues prontas: docs/implementacao/ISSUES_GITHUB_READY_2026Q2.md
- Plano de sprints: docs/implementacao/PLANO_SPRINTS_2026Q2.md
