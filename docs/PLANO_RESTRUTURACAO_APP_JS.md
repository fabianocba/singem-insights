# Plano de Reestruturacao de js/app.js

- Data base: 2026-04-01
- Arquivo alvo: js/app.js

## Contexto

O arquivo js/app.js possui alto acoplamento e mais de 7 mil linhas, concentrando:

- bootstrap
- autenticacao
- navegacao
- fluxos de empenho/NF
- relatorios
- acoes legadas de manutencao de dados

## Acao aplicada nesta etapa

Foi iniciada a modularizacao com extracao de responsabilidades:

1. Helpers de branding e versao para:
- js/features/app/versionBranding.js

2. Acoes legadas de manutencao de dados para:
- js/features/app/legacyDataMaintenance.js

3. Bloco de relatorios e controle de saldos para:
- js/features/app/relatorios.js
  - gerarRelatorio, exibirControleSaldos, carregarSaldoEmpenho
  - getStatusColor, getStatusLabel, getSaldoStatusColor
  - exibirRelatorio, exportarRelatorioPDF, exportarRelatorioCSV
  - aplicarFiltrosRelatorio, mostrarEstatisticasArquivos, atualizarEstatisticasArquivos

4. Listeners da infraestrutura Enterprise para:
- js/features/app/infrastructureListeners.js
  - setupInfrastructureListeners (eventBus: pdf.parse, ne.salva, nf.salva, queue.task, relatorio.gerar, saldo.atualizado)

5. Gateway unico de acesso ao dbManager para:
- js/core/dbGateway.js
  - leitura de estado do dbManager
  - wrappers semanticos para buscar/salvar/excluir registros
  - wrappers genericos para get/getAll/getByIndex/delete

6. Bootstrap da aplicacao para:
- js/features/app/bootstrap.js
  - waitForRepository
  - logBootstrapReport
  - bootstrapApp
  - tratamento visual de erro fatal na inicializacao

7. Suporte de Nota Fiscal para:
- js/features/app/notaFiscalSupport.js
  - buscarEmpenhoCorrespondente
  - verificarDivergencias
  - executarValidacaoNF
  - validarCNPJDestinatarioContraUnidade
  - salvarArquivoNotaFiscal
  - atualizarSaldosEmpenhoComNF
  - salvarNotaFiscal
  - onEmpenhoSelecionado

8. Suporte de Empenho para:
- js/features/app/empenhoSupport.js
  - onlyDigits, dataBRtoISO, parseNumero, validarCNPJ
  - validarCNPJFornecedorContraUnidade
  - detectarPendencias
  - validateEmpenhoDraft
  - normalizeEmpenhoDraft
  - syncFromFormToDraft
  - syncFromDraftToForm
  - atualizarExibicaoTotais
  - salvarEmpenho

9. Shell inicial da aplicacao para:
- js/features/app/appShell.js
  - init
  - setupCriticalAuthListeners
  - verificarSessao
  - handleOAuthCallback
  - verificarUsuariosCadastrados
  - carregarDadosUnidade
  - setupEventListeners
  - setupScreenNavigation
  - setupImageFallbacks
  - restaurarDadosLembrados
  - salvarDadosLembradosPosLogin
  - limparDadosLembrados
  - abrirModalRecuperacaoSenha

10. Validacao e modalizacao de Empenho para:
- js/features/app/empenhoValidationSupport.js
  - validarEmpenho
  - validarCadastroEmpenho
  - mostrarModalValidacao
  - atualizarBadgeStatus
  - atualizarBotaoValidar

11. Fluxo remanescente de Nota Fiscal para:
- js/features/app/notaFiscalFlowSupport.js
  - setupNotaFiscalOptions, getNotaFiscalRefs, refreshNotaFiscalOptionRefs
  - selecionarOpcaoEntrada, setupChaveAcesso, setupCodigoBarras
  - buscarNotaFiscalPorChave, consultarChaveAcesso
  - iniciarCamera, pararCamera, trocarCamera
  - iniciarDeteccaoBarcode, iniciarDeteccaoSimulada, gerarCodigoBarrasSimulado
  - codigoDetectado, usarCodigoBarras, extrairChaveDoCodigoBarras
  - preencherDadosNF, show/hide status de chave e barcode
  - processarNotaFiscalUpload
  - converterMoedaParaNumero, formatarMoeda
  - limparInfoEmpenhoNF, criarDatalistItensEmpenho, mostrarSeletorItensEmpenho, adicionarItemNFPreenchido
  - calcularValorTotalNotaFiscal, adicionarItensExtraidos, coletarItens
  - exibirPreviewNotaFiscal, gerarTabelaItensExtraidos, transferirDadosParaFormulario

12. js/app.js passa a delegar para todos os modulos extraidos mantendo compatibilidade funcional.
- Linha base: 7071 linhas
- Apos Fase 1 (versionBranding + legacyDataMaintenance): 7071 linhas
- Apos Fase 2-3 (relatorios + infrastructureListeners): 6498 linhas (-573 linhas)
- Apos Fase 4 inicial (dbGateway + remocao de acesso direto em app.js e js/features/app): 6499 linhas
- Apos Fase 4.1 (extracao do bootstrap): 6354 linhas (-717 linhas desde a linha base)
- Apos Fase 4.2 (extracao do suporte de Nota Fiscal): 5995 linhas (-1076 linhas desde a linha base)
- Apos Fase 4.3 (extracao do suporte de Empenho): 5386 linhas (-1685 linhas desde a linha base)
- Apos Fase 4.4 (extracao do shell inicial da aplicacao): 5022 linhas (-2049 linhas desde a linha base)
- Apos Fase 4.5 (extracao da validacao de Empenho + fluxo remanescente de NF): 3789 linhas (-3282 linhas desde a linha base)
- Estado atual: app.js e js/features/app nao acessam window.dbManager diretamente; bootstrap, shell inicial, acesso a dados e suportes de NF/Empenho centralizados em modulos dedicados

## Proximas etapas recomendadas

1. Extrair o bloco remanescente de upload/processamento de PDF e parser para modulo dedicado.
2. Consolidar utilitarios de itens (NF/Empenho) em modulo de composicao de UI.
3. Reduzir app.js a bootstrap + composicao de features.
4. Expandir o uso do dbGateway para outros arquivos fora de js/features/app.

## Criterio de sucesso final

- app.js abaixo de 1500 linhas
- sem acesso direto a window.dbManager fora de gateway
- testes de contrato e smoke cobrindo fluxos criticos
