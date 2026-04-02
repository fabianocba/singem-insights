# Auditoria de Coesao - SINGEM (2026-04-02)

## Escopo e criterio
- Base: todos os arquivos versionados por `git ls-files`.
- Classificacao aplicada em 3 categorias conforme solicitado.
- Evidencias usadas: estrutura real, uso em runtime/build e heuristicas de coesao.

## Resultado consolidado
- Total de arquivos auditados: 647
- coeso e necessario: 629
- nao coeso, precisa refatorar: 6
- desnecessario, pode excluir: 12

## Arquivos nao coesos (prioridade de refatoracao)
- js/app.js
- js/consultas/uiConsultasState.js
- js/features/app/empenhoEdicao.js
- js/features/app/notaFiscalFlowSupport.js
- server/src/services/NfeImportService.js
- server/src/services/NfeImportServiceV2.js

## Arquivos desnecessarios (candidatos de exclusao)
- .lint-output.txt
- 01_EMPENHOS/2025/2025NE197 CGSM.pdf
- 01_EMPENHOS/2025/2025NE198 CGSM.pdf
- 01_EMPENHOS/2025/2025NE199 CGSM.pdf
- 01_EMPENHOS/2025/2025NE200 CGSM.pdf
- 01_EMPENHOS/2025/2025NE201 CGSM.pdf
- 02_NOTAS_FISCAIS/2026/29260251561070000150550010000004851300001174.xml
- 02_NOTAS_FISCAIS/2026/NF 485 CGSM.pdf
- 04_BACKUPS/BKUP_IFDESK_GERAL_2026-02-09T18-21_v6.json
- 04_BACKUPS/IFDESK_Backup_2026-02-04T17-29-40.json
- 04_BACKUPS/IFDESK_backup_2026-02-04T13-34-50.json
- SCAN_REPORT.txt

## Classificacao detalhada
- Arquivo completo: docs\AUDITORIA_COESAO_CLASSIFICACAO_2026-04-02.csv
