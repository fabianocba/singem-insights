## [0.1.1] - 2026-02-19

### Added
- Estrutura backend Node/Express institucional
- PostgreSQL preparado com migrations
- Identity provider pattern (local + govbr stub)
- IntegraÃ§Ãµes stub: CATMAT / SERPRO
- OrganizaÃ§Ã£o Git com branch dev

### Changed
- RemoÃ§Ã£o de dados locais do repositÃ³rio
- PadronizaÃ§Ã£o de ambiente com .env.example

### Security
- RemoÃ§Ã£o de credenciais hardcoded
- JWT server-side

# ðŸ“‹ CHANGELOG - SINGEM

## [1.6.9] - 2026-02-11

### ðŸŽ¨ CSS/UX Moderno - Lista de Itens da NF

**LAYOUT DE ITENS EM LINHAS:**

- Header de colunas fixo (Seq | Subelem. | Item Cpr. | DescriÃ§Ã£o | Un | Qtd | V.Unit | V.Total)
- Wrapper com borda e sombra moderna
- Zebra striping sutil nas linhas
- Hover azul nos itens
- SequÃªncia em badge azul estilizado

**INPUTS APRIMORADOS:**

- Border-radius 8px com foco azul
- Valores numÃ©ricos alinhados Ã  direita
- Campo readonly (V.Total) com gradiente verde
- Fonte monospace em campos de valor

**RESPONSIVO MOBILE (< 900px):**

- Header de colunas escondido
- Itens transformados em cards
- Grid adaptativo (2 colunas â†’ 1 coluna)
- Badge de sequÃªncia posicionado no canto

**CSS ESCOPADO:**

- Todas as regras prefixadas com `.nf-screen`
- NÃ£o afeta tema global nem tela de Empenhos
- Modular e manutenÃ­vel

---

## [1.6.8] - 2026-02-11

### ðŸ”’ CorreÃ§Ã£o MÃ³dulo NF - Bloqueio Definitivo "Item Manual"

**REMOÃ‡ÃƒO DO BOTÃƒO "ADICIONAR ITEM MANUAL":**

- BotÃ£o removido do HTML (index.html)
- Listener JS neutralizado (app.js)
- Itens da NF sÃ³ podem ser criados via "Adicionar do Empenho"
- Atributo `data-origem="EMPENHO"` adicionado aos itens para validaÃ§Ã£o

**MODAL "ADICIONAR ITENS DO EMPENHO" - CORREÃ‡Ã•ES:**

- âœ… Todos os checkboxes DESMARCADOS por padrÃ£o
- âœ… BotÃµes "Marcar todos" e "Desmarcar todos" no topo
- âœ… Modal CENTRALIZADO (nÃ£o mais no canto inferior esquerdo)
- âœ… CSS moderno escopado (nÃ£o afeta tema global)
- âœ… Overlay com blur e click para fechar
- âœ… AnimaÃ§Ã£o de entrada suave
- âœ… Itens jÃ¡ adicionados marcados visualmente (verde)
- âœ… NÃ£o permite duplicaÃ§Ã£o de itens

**ESTRUTURA DO MODAL:**

- Header com tÃ­tulo e botÃ£o fechar
- Barra de controles (Marcar/Desmarcar + contador)
- Lista de itens com checkbox, badge do item e descriÃ§Ã£o
- Footer com botÃµes Cancelar e Adicionar

---

## [1.6.7] - 2026-02-11

### ðŸ“Š MÃ³dulo de RelatÃ³rios NÃ­vel ERP

**NOVA ARQUITETURA DE RELATÃ“RIOS:**

ImplementaÃ§Ã£o completa de mÃ³dulo de relatÃ³rios gerenciais com arquitetura enterprise:

- **reportRepository.js** - Camada de acesso a dados com normalizaÃ§Ã£o
- **reportEngine.js** - Motor de relatÃ³rios com definiÃ§Ãµes declarativas
- **reportUI.js** - Interface dinÃ¢mica com filtros, tabelas e exportaÃ§Ã£o
- **reports.css** - Estilos modernos e responsivos

**7 RELATÃ“RIOS DISPONÃVEIS:**

1. **Resumo por Fornecedor** - Consolidado de NFs e valores por fornecedor
2. **Resumo por Item** - Itens mais comprados com valores e quantidades
3. **Saldos de Empenhos** - Empenhado Ã— Executado Ã— Saldo disponÃ­vel
4. **ExecuÃ§Ã£o por Subelemento** - AnÃ¡lise por natureza de despesa
5. **Auditoria NFÃ—Empenho** - VerificaÃ§Ã£o de conformidade com severidades
6. **Top 10 Itens por Valor** - Ranking de maiores gastos
7. **Top 10 Fornecedores** - Principais parceiros por volume

**FUNCIONALIDADES:**

- Filtros dinÃ¢micos: perÃ­odo, ano, fornecedor, subelemento
- ExportaÃ§Ã£o CSV com encoding UTF-8 BOM
- ImpressÃ£o otimizada com popup
- Tabela com headers sticky e zebra striping
- Totalizadores automÃ¡ticos
- Badges de severidade coloridos
- 100% client-side, usa IndexedDB

---

## [1.6.6] - 2026-02-11

### ðŸŽ¨ Modal "Adicionar Itens do Empenho" - CSS Moderno

**MELHORIAS VISUAIS:**

- Modal centralizado com `position: fixed; inset: 0;`
- Overlay com `backdrop-filter: blur(4px)` para efeito moderno
- AnimaÃ§Ã£o de entrada suave (`@keyframes modalSlideIn`)
- Sombra refinada: `box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35)`
- Border-radius aumentado para 16px
- Header com gradiente sutil

**CHECKLIST APRIMORADO:**

- Itens desmarcados por padrÃ£o (`setAllChecks(false)`)
- BotÃµes "Marcar todos" / "Desmarcar todos" funcionais
- Itens jÃ¡ adicionados com estilo diferenciado (verde)
- CÃ³digo do item com badge azul estilizado
- Hover states suaves em todos elementos
- Checkbox com `accent-color` customizado

**CSS ESCOPADO:**

- Todos estilos prefixados com `.modal-itens-empenho`
- NÃ£o afeta tema global do app
- BotÃµes primÃ¡rio/secundÃ¡rio com gradientes

---

## [1.6.5] - 2026-02-11

### ðŸ”„ Build DinÃ¢mico AutomÃ¡tico + Regras Globais Permanentes

**SISTEMA DE BUILD AUTOMÃTICO:**

- Build agora Ã© gerado dinamicamente a cada reload (`generateBuild()`)
- NÃƒO requer mais ediÃ§Ã£o manual do build timestamp
- Formato: `YYYY-MM-DD-HHMM` (ex: 2026-02-11-1920)

**NOVA ESTRUTURA DE VERSÃƒO:**

- `VERSION` objeto simplificado com getter dinÃ¢mico para build
- `renderVersionUI()` atualiza elemento `#appVersion` se existir
- `window.APP_VERSION` exposto globalmente

**REGRAS GLOBAIS PERMANENTES DO PROJETO:**

1. âœ” Rodar servidor local antes e depois de alteraÃ§Ãµes
2. âœ” Versionamento fÃ­sico visÃ­vel atualizado automaticamente
3. âœ” Build timestamp automÃ¡tico (nÃ£o manual)
4. âœ” Bootstrap funcional garantido
5. âœ” Funcionalidades existentes preservadas
6. âœ” Arquivos desnecessÃ¡rios evitados
7. âœ” PadrÃ£o enterprise mantido

**PADRÃƒO DE INCREMENTO:**

- Bug fix â†’ PATCH: v1.6.5 â†’ v1.6.6
- Nova feature â†’ MINOR: v1.6.5 â†’ v1.7.0
- MudanÃ§a estrutural â†’ MAJOR: v1.6.5 â†’ v2.0.0

**Arquivos atualizados:**

- `js/core/version.js` - fonte canÃ´nica com build dinÃ¢mico
- `js/infrastructureInfo.js` - usa `VERSION` e `renderVersionUI()`

---

## [1.6.4] - 2026-02-11

### ðŸ”§ Versionamento FÃ­sico Local + Fix Bootstrap

**VERSIONAMENTO FÃSICO LOCAL OBRIGATÃ“RIO:**

- Criado `js/core/version.js` como arquivo central de versÃ£o
- Exporta: `APP_VERSION`, `APP_BUILD`, `VERSION_INFO`, `logVersion()`
- VersÃ£o exibida no console no formato padrÃ£o:
  ```
  SINGEM
  v1.6.4
  â€¢
  build 2026-02-11-1840
  ```
- ExpÃµe globalmente: `window.SINGEM_VERSION`, `window.SINGEM_BUILD`

**FIX BOOTSTRAP - Timeout em 5 segundos:**

- `window.__SINGEM_BOOTSTRAP_DONE__` flag setada apÃ³s bootstrap
- Evento `singem:bootstrap:done` disparado apÃ³s inicializaÃ§Ã£o
- `waitForBootstrap()` agora usa evento em vez de polling
- Timeout aumentado para 20 segundos (era 5s)
- Removidos logs repetitivos de tentativas
- Arquivos corrigidos:
  - `js/settings/unidade.js`
  - `js/settings/usuarios.js`

**AtualizaÃ§Ãµes:**

- `js/infrastructureInfo.js` importa e exibe versÃ£o
- `js/app.js` importa de `./core/version.js`

---

## [1.6.3] - 2026-02-11

### ðŸ“‹ MÃ³dulo NF: Itens do Empenho via Modal com Checklist

**RemoÃ§Ã£o da Entrada Manual de Itens:**

- BotÃ£o "Adicionar Item" manual removido
- Itens da NF devem ser idÃªnticos aos itens do Empenho

**Novo Modal "Adicionar do Empenho":**

- Checklist com todos os itens do empenho selecionado
- Todos os itens **desmarcados por padrÃ£o**
- BotÃµes "Marcar todos" e "Desmarcar todos" no topo
- Itens jÃ¡ adicionados aparecem marcados como "âœ“ JÃ¡ adicionado" e desabilitados
- Modal **centralizado** na tela (corrigido posicionamento)

**ValidaÃ§Ã£o NF Ã— Empenho:**

- IntegraÃ§Ã£o com `nfValidator.js`
- Erros bloqueantes: item inexistente, qtd > saldo, CNPJ diferente, diferenÃ§a total
- Alertas: preÃ§o divergente (pode salvar)
- Modal de divergÃªncias com relatÃ³rio detalhado

**DocumentaÃ§Ã£o:**

- Criado `docs/nf-tests.md` com 10 testes manuais obrigatÃ³rios

---

## [1.6.2] - 2026-02-10

### âœ¨ Total NF Manual + Soma AutomÃ¡tica dos Itens

**Ajuste no mÃ³dulo de Notas Fiscais** para padrÃ£o ERP:

**Valor Total da NF (Manual):**

- Campo `#valorTotalNF` agora Ã© **editÃ¡vel e obrigatÃ³rio**
- UsuÃ¡rio deve informar o valor total conforme a nota fiscal
- FormataÃ§Ã£o automÃ¡tica ao sair do campo (blur)

**Soma Total dos Itens (AutomÃ¡tico):**

- Campo `#somaItensNF` calcula automaticamente em tempo real
- Atualiza ao adicionar/editar/remover itens
- Atualiza ao alterar quantidade ou valor unitÃ¡rio

**Campo DiferenÃ§a:**

- Novo campo `#nfDiferenca` mostra (Soma - Total)
- Visual: verde se OK, vermelho se divergente

**ValidaÃ§Ã£o ao Salvar:**

- Total NF > 0 obrigatÃ³rio (bloqueante)
- TolerÃ¢ncia de R$ 0,05 para divergÃªncia TotalÃ—Itens
- ConfirmaÃ§Ã£o se divergÃªncia ultrapassar tolerÃ¢ncia

**Helpers de Moeda PT-BR:**

- `parseMoneyInputBR()` â€” aceita entrada com vÃ­rgula e ponto
- `money2()` â€” arredonda para 2 casas
- `fmtMoneyBR()` â€” formata com vÃ­rgula decimal

**VerificaÃ§Ã£o:**

- Testes: 185/185 âœ…
- Lint: 15 warnings âœ…

---

## [1.6.1] - 2026-02-10

### ðŸ› Bugfix: Select de Empenhos Vazio

**Problema:** Na tela de Notas Fiscais, o dropdown "Empenho associado" mostrava "âš ï¸ Nenhum empenho cadastrado" mesmo quando existiam empenhos no banco.

**Causa Raiz:** O mÃ©todo `buscarEmpenhos()` em [js/db.js](js/db.js) tem parÃ¢metro `incluirSemArquivo = false` por padrÃ£o, retornando apenas empenhos COM arquivo PDF vinculado. Empenhos novos ou sem anexo eram excluÃ­dos.

**CorreÃ§Ã£o em [js/app.js](js/app.js#L3823):**

- Alterada chamada para `buscarEmpenhos(true)` â€” inclui TODOS os empenhos
- Adicionada flag `DEBUG_NF_EMPENHO = true` com logging detalhado
- Logs no console mostram quantidade de empenhos e estado do select

**VerificaÃ§Ã£o:**

- Testes: 185/185 âœ…
- Lint: 15 warnings âœ…

---

## [1.6.0] - 2026-02-10

### âœ¨ SimplificaÃ§Ã£o do MÃ³dulo de Notas Fiscais

**Redesign completo** para entrada 100% manual estilo ERP:

- **Fluxo Empenho-First:** Select de empenho movido para o topo
- **Campos manuais:** NÃºmero NF, valor, data de emissÃ£o
- **AssociaÃ§Ã£o automÃ¡tica:** Ao selecionar empenho, dados do fornecedor sÃ£o carregados
- **Interface simplificada:** Removida complexidade de parsers automÃ¡ticos

---

## [1.5.1] - 2026-02-09

### ðŸ§¹ Limpeza Profunda do Projeto

- Removida pasta `_legacy/` (cÃ³digo obsoleto)
- Removida pasta `testes/` (testes manuais HTML)
- Removidos arquivos Ã³rfÃ£os nÃ£o referenciados
- ReduÃ§Ã£o significativa no tamanho do projeto

---

## [1.3.2] - 2025-11-05

### âœ¨ IntegraÃ§Ã£o Completa de AutenticaÃ§Ã£o

**Sistema de Login 100% Funcional** ðŸŽ‰

- **AutenticaÃ§Ã£o Integrada ao HTML Principal**
  - Login com credenciais mestras (`singem` / `admin@2025`)
  - Login com usuÃ¡rios cadastrados (IndexedDB)
  - ValidaÃ§Ã£o de senha com PBKDF2 (100k iteraÃ§Ãµes, SHA-256)
  - DetecÃ§Ã£o automÃ¡tica de primeiro acesso

- **Melhorias Visuais**
  - BotÃ£o de login com feedback: "ðŸ”„ Autenticando..." â†’ "âœ… Logado!"
  - Mensagem de boas-vindas com animaÃ§Ã£o slideIn/slideOut
  - AnimaÃ§Ã£o shake para erros de login
  - BotÃ£o desabilitado durante processamento
  - Credenciais mestras auto-exibidas se nÃ£o hÃ¡ usuÃ¡rios

- **Logs Informativos**
  - Console mostra passo-a-passo da autenticaÃ§Ã£o
  - Logs coloridos: ðŸš€ ðŸ” âœ… âŒ âš ï¸
  - Facilita debug e troubleshooting
  - Exemplo: `âœ… Autenticado: JoÃ£o Silva (perfil: admin)`

- **VerificaÃ§Ãµes AutomÃ¡ticas**
  - Detecta se hÃ¡ usuÃ¡rios cadastrados
  - Mostra/esconde dica de primeiro acesso
  - Valida campos antes de enviar
  - Trata erros com mensagens claras

### ðŸŽ¨ AnimaÃ§Ãµes CSS

- `@keyframes slideInRight` - Mensagem de boas-vindas
- `@keyframes slideOutRight` - SaÃ­da da mensagem
- `@keyframes shake` - Erro de login
- TransiÃ§Ãµes suaves no botÃ£o de login
- Feedback visual instantÃ¢neo

### ðŸ“š DocumentaÃ§Ã£o

- **INTEGRACAO_AUTENTICACAO.md** (NOVO)
  - Fluxo completo de autenticaÃ§Ã£o
  - Casos de uso detalhados
  - Diagramas de processo
  - Checklist de funcionalidades
  - EstatÃ­sticas e mÃ©tricas

### ðŸ”§ Melhorias TÃ©cnicas

- MÃ©todo `verificarUsuariosCadastrados()` em app.js
- Logs estruturados em todas as etapas
- Tratamento de erros robusto
- Feedback visual em tempo real
- IntegraÃ§Ã£o perfeita com IndexedDB

---

## [1.3.1] - 2025-11-05

### ðŸ› Corrigido (CRÃTICO)

**TODOS OS 4 BUGS CRÃTICOS CORRIGIDOS** âœ…

**Bug #1: InicializaÃ§Ã£o do IndexedDB**

- **Sintoma:** `TypeError: Cannot read properties of null (reading 'transaction')`
- **Causa:** MÃ³dulos tentavam acessar banco antes da inicializaÃ§Ã£o
- **SoluÃ§Ã£o:** Criado `ensureDBReady()` + wrappers seguros (`dbSafe.js`)
- **Impacto:** `unidade.js`, `usuarios.js`
- **Retry:** AutomÃ¡tico com backoff exponencial via `initSafe()`

**Bug #2: ID da Unidade OrÃ§amentÃ¡ria Sobrescrito**

- **Sintoma:** "Unidade orÃ§amentÃ¡ria nÃ£o cadastrada" ao cadastrar usuÃ¡rios
- **Causa:** Spread operator `...unidade` sobrescrevia `id: "unidadeOrcamentaria"`
- **SoluÃ§Ã£o:** Invertida ordem do spread (ID fixo sempre sobrescreve)
- **Impacto:** `unidade.js` (linha ~650)

**Bug #3: UsuÃ¡rio NÃ£o Salva no Banco**

- **Sintoma:** UsuÃ¡rio cadastrado mas nÃ£o aparece na lista
- **Causa:** MÃ©todo `saveUsuario()` nÃ£o existia, tentava salvar item individual
- **SoluÃ§Ã£o:** Usar `saveUsuarios(this.usuarios)` para salvar lista completa
- **Impacto:** `usuarios.js` (linhas 224, 301)
- **Extras:** Corrigido `deleteUsuario()` que estava fora da classe

**Bug #4: AutenticaÃ§Ã£o NÃ£o Encontra UsuÃ¡rio**

- **Sintoma:** Login falha mesmo com usuÃ¡rio cadastrado
- **Causa:** `autenticar()` usava `this.usuarios` vazio, nÃ£o carregava do banco
- **SoluÃ§Ã£o:** Adicionar `await this.getUsuarios()` antes de autenticar
- **Impacto:** `usuarios.js` (mÃ©todo `autenticar`)
- **Logs:** Adicionados logs informativos para debug

**Bug #4.1: Vincular Unidade Falha**

- **Sintoma:** Erro ao vincular usuÃ¡rio Ã  unidade gestora
- **Causa:** `this.unidades` vazio, nÃ£o carregava do banco
- **SoluÃ§Ã£o:** Adicionar `await this.load()` antes de vincular
- **Impacto:** `unidade.js` (mÃ©todo `vincularUnidadeAoUsuario`)

### ðŸ› ï¸ Melhorias

- **Cache-Busting AutomÃ¡tico**
  - `ABRIR_APLICACAO.bat` com timestamp em URL
  - `ABRIR_APLICACAO.ps1` com mÃºltiplos fallbacks
  - URLs Ãºnicas: `?nocache=timestamp&_=random`
  - Garante que navegador sempre carrega arquivos novos

- **DiagnÃ³stico de IndexedDB**
  - Nova pÃ¡gina `verificar-db.html` para debug
  - Mostra estado do banco, unidade e usuÃ¡rios
  - Identifica problemas automaticamente
  - AÃ§Ãµes rÃ¡pidas (limpar cache, resetar banco)

### ðŸ“š DocumentaÃ§Ã£o

- `BUGFIX_COMPLETO.md` - AnÃ¡lise completa dos 4 bugs
- `BUGFIX_UNIDADE_DB.md` - Bug #1 detalhado
- `BUGFIX_ID_UNIDADE.md` - Bug #2 detalhado
- `SOLUCAO_CACHE.md` - Guia de cache
- `COMO_ABRIR.md` - Guia do usuÃ¡rio
- Atualizados READMEs com instruÃ§Ãµes de cache

### âš ï¸ AÃ§Ã£o NecessÃ¡ria

Para aplicar os bugfixes:

1. **Limpar cache:** Ctrl+Shift+R ou `.\REINICIAR_SEM_CACHE.ps1`
2. **Recadastrar unidade orÃ§amentÃ¡ria**
3. **Cadastrar usuÃ¡rios novamente**
4. **Testar login e vinculaÃ§Ã£o**

---

## [1.3.0] - 2025-11-05

### ðŸ› Corrigido (CRÃTICO)

**Erro 1: InicializaÃ§Ã£o do IndexedDB**

- **Sintoma:** `TypeError: Cannot read properties of null (reading 'transaction')`
- **Causa:** MÃ³dulos tentavam acessar banco antes da inicializaÃ§Ã£o
- **SoluÃ§Ã£o:** Criado `ensureDBReady()` + wrappers seguros (`dbSafe.js`)
- **Impacto:** `unidade.js`, `usuarios.js`, `rede.js`, `preferencias.js`
- **Retry:** AutomÃ¡tico com backoff exponencial via `initSafe()`
- **Doc:** Ver `BUGFIX_UNIDADE_DB.md`

**Erro 2: ID da Unidade OrÃ§amentÃ¡ria Sobrescrito**

- **Sintoma:** "Unidade orÃ§amentÃ¡ria nÃ£o cadastrada" ao cadastrar usuÃ¡rios
- **Causa:** Spread operator `...unidade` sobrescrevia `id: "unidadeOrcamentaria"`
- **SoluÃ§Ã£o:** Invertida ordem do spread (ID fixo sempre sobrescreve)
- **Impacto:** `unidade.js` (linha ~650)
- **Doc:** Ver `BUGFIX_ID_UNIDADE.md`

---

## [1.2.7] - 2025-11-04

### âœ¨ Adicionado

- **InicializaÃ§Ã£o AutomÃ¡tica no VS Code** ðŸš€
  - Task automÃ¡tica ao abrir workspace (`.vscode/tasks.json`)
  - Script inteligente `iniciar-sistema.ps1`
  - Detecta se servidor jÃ¡ estÃ¡ rodando
  - Inicia servidor HTTP automaticamente
  - Abre navegador em `http://localhost:8000`
  - ConfiguraÃ§Ãµes do workspace (`.vscode/settings.json`)
  - DocumentaÃ§Ã£o completa (`.vscode/README.md`)

### ðŸ”§ Modificado

- **ExperiÃªncia do Desenvolvedor**
  - Basta abrir a pasta no VS Code
  - Sistema inicia automaticamente (apÃ³s permitir)
  - NÃ£o precisa mais executar scripts manualmente

---

## [1.2.6] - 2025-11-04

### âœ¨ Adicionado

- **ExportaÃ§Ã£o CSV**
  - Novo mÃ³dulo `js/exportCSV.js` para exportar dados
  - BotÃ£o "ðŸ“¥ Exportar" no header principal
  - Exporta Notas Fiscais, Empenhos e Itens
  - Formato compatÃ­vel com Excel (UTF-8 com BOM)
  - Separador ponto-e-vÃ­rgula (;)

- **Toggle Modo API Demo/ProduÃ§Ã£o**
  - Controle manual de modo API no mÃ³dulo Consultas
  - BotÃ£o visÃ­vel para alternar entre dados reais e mock
  - PreferÃªncia salva em localStorage
  - Indicador visual de modo ativo

### ðŸ”§ Modificado

- **Estilos CSS Refatorados**
  - Removidos 34 estilos inline de `index.html`
  - Removidos 10 estilos inline de `config/configuracoes.html`
  - Criadas 20+ classes CSS reutilizÃ¡veis
  - Melhor manutenibilidade e performance

- **Scripts PowerShell Otimizados**
  - Corrigidos warnings de variÃ¡veis nÃ£o utilizadas
  - `$null =` antes de `Invoke-WebRequest` nÃ£o usados
  - CÃ³digo mais limpo e sem alertas

### ðŸ› Corrigido

- Todos os erros de lint relacionados a estilos inline
- Warnings PowerShell em `abrir-aplicacao.ps1` e `iniciar-proxy.ps1`
- Melhor separaÃ§Ã£o de responsabilidades CSS/HTML

---

## [1.2.5] - 2025-11-04

### âœ¨ Adicionado

- **MÃ³dulo "Consultas Diversas"** completo
  - 7 tipos de consultas (Material, ServiÃ§o, UASG, ARP, PNCP, LicitaÃ§Ãµes, Itens)
  - Interface com cards clicÃ¡veis
  - FormulÃ¡rios de filtros avanÃ§ados
  - Tabelas de resultados com paginaÃ§Ã£o
  - Sistema de cache inteligente

- **Servidor Proxy CORS** (`server/proxy-server.py`)
  - Resolve bloqueio CORS de APIs pÃºblicas
  - Serve arquivos estÃ¡ticos
  - Intercepta requisiÃ§Ãµes `/api/*`
  - Redireciona para `dadosabertos.compras.gov.br`

- **Modo DemonstraÃ§Ã£o AutomÃ¡tico**
  - Fallback inteligente quando API falha
  - Dados realistas de exemplo
  - Ativa automaticamente sem intervenÃ§Ã£o
  - Materiais (5), ServiÃ§os (3), UASG (3), ARP (2)

- **Sistema de Dados Mock** (`js/consultas/dadosMock.js`)
  - Estrutura idÃªntica Ã  API real
  - Dados brasileiros realistas
  - FÃ¡cil expansÃ£o

### ðŸ”§ Modificado

- **Estrutura de pastas reorganizada**
  - Movido scripts de servidor para `server/`
  - Movido arquivos de teste para `testes/`
  - Limpeza da raiz do projeto

- **Script de inicializaÃ§Ã£o** (`abrir.ps1`)
  - Agora inicia servidor proxy automaticamente
  - Detecta Python instalado
  - Abre navegador automaticamente

- **Arquitetura de API** (`js/consultas/apiCompras.js`)
  - Mudou de chamada direta para proxy local
  - `API_BASE` alterado de URL externa para `/api`
  - Try/catch com fallback para modo demo

### ðŸ› Corrigido

- Erro de CORS ao acessar APIs pÃºblicas
- Cache do navegador impedindo atualizaÃ§Ãµes
- MÃ³dulos ES6 nÃ£o carregando em file://
- Timeout de requisiÃ§Ãµes muito curto

### ðŸ“š DocumentaÃ§Ã£o

- README.md atualizado com nova estrutura
- CHANGELOG.md criado
- InstruÃ§Ãµes de uso do servidor proxy
- Guia de resoluÃ§Ã£o de problemas (cache)

### ðŸ—‚ï¸ Estrutura de Arquivos

**Antes:**

```
SINGEM/
â”œâ”€â”€ proxy-server.py âŒ (raiz desorganizada)
â”œâ”€â”€ teste-*.html âŒ
â””â”€â”€ iniciar-proxy.ps1 âŒ
```

**Depois:**

```
SINGEM/
â”œâ”€â”€ server/
â”‚   â”œâ”€â”€ proxy-server.py âœ…
â”‚   â””â”€â”€ iniciar-proxy.ps1 âœ…
â”œâ”€â”€ testes/
â”‚   â””â”€â”€ teste-*.html âœ…
â””â”€â”€ abrir.ps1 âœ…
```

### âš¡ Performance

- Sistema funciona 100% offline apÃ³s carregar dados
- Cache de consultas reduz requisiÃ§Ãµes
- Modo demo elimina dependÃªncia de internet

### ðŸ” SeguranÃ§a

- Servidor proxy apenas em localhost
- Sem armazenamento de credenciais
- IndexedDB local (sem servidor externo)

---

## [1.2.4] - Anterior

### Funcionalidades Existentes

- Controle de materiais
- Parser de Notas de Empenho
- IntegraÃ§Ã£o NFe
- Sistema de validaÃ§Ã£o

---

## ðŸ“ Formato do Changelog

Este changelog segue o formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)

### Tipos de MudanÃ§as

- `Adicionado` - novos recursos
- `Modificado` - alteraÃ§Ãµes em recursos existentes
- `Depreciado` - recursos que serÃ£o removidos
- `Removido` - recursos removidos
- `Corrigido` - correÃ§Ãµes de bugs
- `SeguranÃ§a` - vulnerabilidades corrigidas

