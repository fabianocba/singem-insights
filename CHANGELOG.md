# 📋 CHANGELOG - IFDESK

## [1.6.9] - 2026-02-11

### 🎨 CSS/UX Moderno - Lista de Itens da NF

**LAYOUT DE ITENS EM LINHAS:**

- Header de colunas fixo (Seq | Subelem. | Item Cpr. | Descrição | Un | Qtd | V.Unit | V.Total)
- Wrapper com borda e sombra moderna
- Zebra striping sutil nas linhas
- Hover azul nos itens
- Sequência em badge azul estilizado

**INPUTS APRIMORADOS:**

- Border-radius 8px com foco azul
- Valores numéricos alinhados à direita
- Campo readonly (V.Total) com gradiente verde
- Fonte monospace em campos de valor

**RESPONSIVO MOBILE (< 900px):**

- Header de colunas escondido
- Itens transformados em cards
- Grid adaptativo (2 colunas → 1 coluna)
- Badge de sequência posicionado no canto

**CSS ESCOPADO:**

- Todas as regras prefixadas com `.nf-screen`
- Não afeta tema global nem tela de Empenhos
- Modular e manutenível

---

## [1.6.8] - 2026-02-11

### 🔒 Correção Módulo NF - Bloqueio Definitivo "Item Manual"

**REMOÇÃO DO BOTÃO "ADICIONAR ITEM MANUAL":**

- Botão removido do HTML (index.html)
- Listener JS neutralizado (app.js)
- Itens da NF só podem ser criados via "Adicionar do Empenho"
- Atributo `data-origem="EMPENHO"` adicionado aos itens para validação

**MODAL "ADICIONAR ITENS DO EMPENHO" - CORREÇÕES:**

- ✅ Todos os checkboxes DESMARCADOS por padrão
- ✅ Botões "Marcar todos" e "Desmarcar todos" no topo
- ✅ Modal CENTRALIZADO (não mais no canto inferior esquerdo)
- ✅ CSS moderno escopado (não afeta tema global)
- ✅ Overlay com blur e click para fechar
- ✅ Animação de entrada suave
- ✅ Itens já adicionados marcados visualmente (verde)
- ✅ Não permite duplicação de itens

**ESTRUTURA DO MODAL:**

- Header com título e botão fechar
- Barra de controles (Marcar/Desmarcar + contador)
- Lista de itens com checkbox, badge do item e descrição
- Footer com botões Cancelar e Adicionar

---

## [1.6.7] - 2026-02-11

### 📊 Módulo de Relatórios Nível ERP

**NOVA ARQUITETURA DE RELATÓRIOS:**

Implementação completa de módulo de relatórios gerenciais com arquitetura enterprise:

- **reportRepository.js** - Camada de acesso a dados com normalização
- **reportEngine.js** - Motor de relatórios com definições declarativas
- **reportUI.js** - Interface dinâmica com filtros, tabelas e exportação
- **reports.css** - Estilos modernos e responsivos

**7 RELATÓRIOS DISPONÍVEIS:**

1. **Resumo por Fornecedor** - Consolidado de NFs e valores por fornecedor
2. **Resumo por Item** - Itens mais comprados com valores e quantidades
3. **Saldos de Empenhos** - Empenhado × Executado × Saldo disponível
4. **Execução por Subelemento** - Análise por natureza de despesa
5. **Auditoria NF×Empenho** - Verificação de conformidade com severidades
6. **Top 10 Itens por Valor** - Ranking de maiores gastos
7. **Top 10 Fornecedores** - Principais parceiros por volume

**FUNCIONALIDADES:**

- Filtros dinâmicos: período, ano, fornecedor, subelemento
- Exportação CSV com encoding UTF-8 BOM
- Impressão otimizada com popup
- Tabela com headers sticky e zebra striping
- Totalizadores automáticos
- Badges de severidade coloridos
- 100% client-side, usa IndexedDB

---

## [1.6.6] - 2026-02-11

### 🎨 Modal "Adicionar Itens do Empenho" - CSS Moderno

**MELHORIAS VISUAIS:**

- Modal centralizado com `position: fixed; inset: 0;`
- Overlay com `backdrop-filter: blur(4px)` para efeito moderno
- Animação de entrada suave (`@keyframes modalSlideIn`)
- Sombra refinada: `box-shadow: 0 25px 60px rgba(0, 0, 0, 0.35)`
- Border-radius aumentado para 16px
- Header com gradiente sutil

**CHECKLIST APRIMORADO:**

- Itens desmarcados por padrão (`setAllChecks(false)`)
- Botões "Marcar todos" / "Desmarcar todos" funcionais
- Itens já adicionados com estilo diferenciado (verde)
- Código do item com badge azul estilizado
- Hover states suaves em todos elementos
- Checkbox com `accent-color` customizado

**CSS ESCOPADO:**

- Todos estilos prefixados com `.modal-itens-empenho`
- Não afeta tema global do app
- Botões primário/secundário com gradientes

---

## [1.6.5] - 2026-02-11

### 🔄 Build Dinâmico Automático + Regras Globais Permanentes

**SISTEMA DE BUILD AUTOMÁTICO:**

- Build agora é gerado dinamicamente a cada reload (`generateBuild()`)
- NÃO requer mais edição manual do build timestamp
- Formato: `YYYY-MM-DD-HHMM` (ex: 2026-02-11-1920)

**NOVA ESTRUTURA DE VERSÃO:**

- `VERSION` objeto simplificado com getter dinâmico para build
- `renderVersionUI()` atualiza elemento `#appVersion` se existir
- `window.APP_VERSION` exposto globalmente

**REGRAS GLOBAIS PERMANENTES DO PROJETO:**

1. ✔ Rodar servidor local antes e depois de alterações
2. ✔ Versionamento físico visível atualizado automaticamente
3. ✔ Build timestamp automático (não manual)
4. ✔ Bootstrap funcional garantido
5. ✔ Funcionalidades existentes preservadas
6. ✔ Arquivos desnecessários evitados
7. ✔ Padrão enterprise mantido

**PADRÃO DE INCREMENTO:**

- Bug fix → PATCH: v1.6.5 → v1.6.6
- Nova feature → MINOR: v1.6.5 → v1.7.0
- Mudança estrutural → MAJOR: v1.6.5 → v2.0.0

**Arquivos atualizados:**

- `js/core/version.js` - fonte canônica com build dinâmico
- `js/infrastructureInfo.js` - usa `VERSION` e `renderVersionUI()`

---

## [1.6.4] - 2026-02-11

### 🔧 Versionamento Físico Local + Fix Bootstrap

**VERSIONAMENTO FÍSICO LOCAL OBRIGATÓRIO:**

- Criado `js/core/version.js` como arquivo central de versão
- Exporta: `APP_VERSION`, `APP_BUILD`, `VERSION_INFO`, `logVersion()`
- Versão exibida no console no formato padrão:
  ```
  IFDESK
  v1.6.4
  •
  build 2026-02-11-1840
  ```
- Expõe globalmente: `window.IFDESK_VERSION`, `window.IFDESK_BUILD`

**FIX BOOTSTRAP - Timeout em 5 segundos:**

- `window.__IFDESK_BOOTSTRAP_DONE__` flag setada após bootstrap
- Evento `ifdesk:bootstrap:done` disparado após inicialização
- `waitForBootstrap()` agora usa evento em vez de polling
- Timeout aumentado para 20 segundos (era 5s)
- Removidos logs repetitivos de tentativas
- Arquivos corrigidos:
  - `js/settings/unidade.js`
  - `js/settings/usuarios.js`

**Atualizações:**

- `js/infrastructureInfo.js` importa e exibe versão
- `js/app.js` importa de `./core/version.js`

---

## [1.6.3] - 2026-02-11

### 📋 Módulo NF: Itens do Empenho via Modal com Checklist

**Remoção da Entrada Manual de Itens:**

- Botão "Adicionar Item" manual removido
- Itens da NF devem ser idênticos aos itens do Empenho

**Novo Modal "Adicionar do Empenho":**

- Checklist com todos os itens do empenho selecionado
- Todos os itens **desmarcados por padrão**
- Botões "Marcar todos" e "Desmarcar todos" no topo
- Itens já adicionados aparecem marcados como "✓ Já adicionado" e desabilitados
- Modal **centralizado** na tela (corrigido posicionamento)

**Validação NF × Empenho:**

- Integração com `nfValidator.js`
- Erros bloqueantes: item inexistente, qtd > saldo, CNPJ diferente, diferença total
- Alertas: preço divergente (pode salvar)
- Modal de divergências com relatório detalhado

**Documentação:**

- Criado `docs/nf-tests.md` com 10 testes manuais obrigatórios

---

## [1.6.2] - 2026-02-10

### ✨ Total NF Manual + Soma Automática dos Itens

**Ajuste no módulo de Notas Fiscais** para padrão ERP:

**Valor Total da NF (Manual):**

- Campo `#valorTotalNF` agora é **editável e obrigatório**
- Usuário deve informar o valor total conforme a nota fiscal
- Formatação automática ao sair do campo (blur)

**Soma Total dos Itens (Automático):**

- Campo `#somaItensNF` calcula automaticamente em tempo real
- Atualiza ao adicionar/editar/remover itens
- Atualiza ao alterar quantidade ou valor unitário

**Campo Diferença:**

- Novo campo `#nfDiferenca` mostra (Soma - Total)
- Visual: verde se OK, vermelho se divergente

**Validação ao Salvar:**

- Total NF > 0 obrigatório (bloqueante)
- Tolerância de R$ 0,05 para divergência Total×Itens
- Confirmação se divergência ultrapassar tolerância

**Helpers de Moeda PT-BR:**

- `parseMoneyInputBR()` — aceita entrada com vírgula e ponto
- `money2()` — arredonda para 2 casas
- `fmtMoneyBR()` — formata com vírgula decimal

**Verificação:**

- Testes: 185/185 ✅
- Lint: 15 warnings ✅

---

## [1.6.1] - 2026-02-10

### 🐛 Bugfix: Select de Empenhos Vazio

**Problema:** Na tela de Notas Fiscais, o dropdown "Empenho associado" mostrava "⚠️ Nenhum empenho cadastrado" mesmo quando existiam empenhos no banco.

**Causa Raiz:** O método `buscarEmpenhos()` em [js/db.js](js/db.js) tem parâmetro `incluirSemArquivo = false` por padrão, retornando apenas empenhos COM arquivo PDF vinculado. Empenhos novos ou sem anexo eram excluídos.

**Correção em [js/app.js](js/app.js#L3823):**

- Alterada chamada para `buscarEmpenhos(true)` — inclui TODOS os empenhos
- Adicionada flag `DEBUG_NF_EMPENHO = true` com logging detalhado
- Logs no console mostram quantidade de empenhos e estado do select

**Verificação:**

- Testes: 185/185 ✅
- Lint: 15 warnings ✅

---

## [1.6.0] - 2026-02-10

### ✨ Simplificação do Módulo de Notas Fiscais

**Redesign completo** para entrada 100% manual estilo ERP:

- **Fluxo Empenho-First:** Select de empenho movido para o topo
- **Campos manuais:** Número NF, valor, data de emissão
- **Associação automática:** Ao selecionar empenho, dados do fornecedor são carregados
- **Interface simplificada:** Removida complexidade de parsers automáticos

---

## [1.5.1] - 2026-02-09

### 🧹 Limpeza Profunda do Projeto

- Removida pasta `_legacy/` (código obsoleto)
- Removida pasta `testes/` (testes manuais HTML)
- Removidos arquivos órfãos não referenciados
- Redução significativa no tamanho do projeto

---

## [1.3.2] - 2025-11-05

### ✨ Integração Completa de Autenticação

**Sistema de Login 100% Funcional** 🎉

- **Autenticação Integrada ao HTML Principal**
  - Login com credenciais mestras (`ifdesk` / `admin@2025`)
  - Login com usuários cadastrados (IndexedDB)
  - Validação de senha com PBKDF2 (100k iterações, SHA-256)
  - Detecção automática de primeiro acesso

- **Melhorias Visuais**
  - Botão de login com feedback: "🔄 Autenticando..." → "✅ Logado!"
  - Mensagem de boas-vindas com animação slideIn/slideOut
  - Animação shake para erros de login
  - Botão desabilitado durante processamento
  - Credenciais mestras auto-exibidas se não há usuários

- **Logs Informativos**
  - Console mostra passo-a-passo da autenticação
  - Logs coloridos: 🚀 🔐 ✅ ❌ ⚠️
  - Facilita debug e troubleshooting
  - Exemplo: `✅ Autenticado: João Silva (perfil: admin)`

- **Verificações Automáticas**
  - Detecta se há usuários cadastrados
  - Mostra/esconde dica de primeiro acesso
  - Valida campos antes de enviar
  - Trata erros com mensagens claras

### 🎨 Animações CSS

- `@keyframes slideInRight` - Mensagem de boas-vindas
- `@keyframes slideOutRight` - Saída da mensagem
- `@keyframes shake` - Erro de login
- Transições suaves no botão de login
- Feedback visual instantâneo

### 📚 Documentação

- **INTEGRACAO_AUTENTICACAO.md** (NOVO)
  - Fluxo completo de autenticação
  - Casos de uso detalhados
  - Diagramas de processo
  - Checklist de funcionalidades
  - Estatísticas e métricas

### 🔧 Melhorias Técnicas

- Método `verificarUsuariosCadastrados()` em app.js
- Logs estruturados em todas as etapas
- Tratamento de erros robusto
- Feedback visual em tempo real
- Integração perfeita com IndexedDB

---

## [1.3.1] - 2025-11-05

### 🐛 Corrigido (CRÍTICO)

**TODOS OS 4 BUGS CRÍTICOS CORRIGIDOS** ✅

**Bug #1: Inicialização do IndexedDB**

- **Sintoma:** `TypeError: Cannot read properties of null (reading 'transaction')`
- **Causa:** Módulos tentavam acessar banco antes da inicialização
- **Solução:** Criado `ensureDBReady()` + wrappers seguros (`dbSafe.js`)
- **Impacto:** `unidade.js`, `usuarios.js`
- **Retry:** Automático com backoff exponencial via `initSafe()`

**Bug #2: ID da Unidade Orçamentária Sobrescrito**

- **Sintoma:** "Unidade orçamentária não cadastrada" ao cadastrar usuários
- **Causa:** Spread operator `...unidade` sobrescrevia `id: "unidadeOrcamentaria"`
- **Solução:** Invertida ordem do spread (ID fixo sempre sobrescreve)
- **Impacto:** `unidade.js` (linha ~650)

**Bug #3: Usuário Não Salva no Banco**

- **Sintoma:** Usuário cadastrado mas não aparece na lista
- **Causa:** Método `saveUsuario()` não existia, tentava salvar item individual
- **Solução:** Usar `saveUsuarios(this.usuarios)` para salvar lista completa
- **Impacto:** `usuarios.js` (linhas 224, 301)
- **Extras:** Corrigido `deleteUsuario()` que estava fora da classe

**Bug #4: Autenticação Não Encontra Usuário**

- **Sintoma:** Login falha mesmo com usuário cadastrado
- **Causa:** `autenticar()` usava `this.usuarios` vazio, não carregava do banco
- **Solução:** Adicionar `await this.getUsuarios()` antes de autenticar
- **Impacto:** `usuarios.js` (método `autenticar`)
- **Logs:** Adicionados logs informativos para debug

**Bug #4.1: Vincular Unidade Falha**

- **Sintoma:** Erro ao vincular usuário à unidade gestora
- **Causa:** `this.unidades` vazio, não carregava do banco
- **Solução:** Adicionar `await this.load()` antes de vincular
- **Impacto:** `unidade.js` (método `vincularUnidadeAoUsuario`)

### 🛠️ Melhorias

- **Cache-Busting Automático**
  - `ABRIR_APLICACAO.bat` com timestamp em URL
  - `ABRIR_APLICACAO.ps1` com múltiplos fallbacks
  - URLs únicas: `?nocache=timestamp&_=random`
  - Garante que navegador sempre carrega arquivos novos

- **Diagnóstico de IndexedDB**
  - Nova página `verificar-db.html` para debug
  - Mostra estado do banco, unidade e usuários
  - Identifica problemas automaticamente
  - Ações rápidas (limpar cache, resetar banco)

### 📚 Documentação

- `BUGFIX_COMPLETO.md` - Análise completa dos 4 bugs
- `BUGFIX_UNIDADE_DB.md` - Bug #1 detalhado
- `BUGFIX_ID_UNIDADE.md` - Bug #2 detalhado
- `SOLUCAO_CACHE.md` - Guia de cache
- `COMO_ABRIR.md` - Guia do usuário
- Atualizados READMEs com instruções de cache

### ⚠️ Ação Necessária

Para aplicar os bugfixes:

1. **Limpar cache:** Ctrl+Shift+R ou `.\REINICIAR_SEM_CACHE.ps1`
2. **Recadastrar unidade orçamentária**
3. **Cadastrar usuários novamente**
4. **Testar login e vinculação**

---

## [1.3.0] - 2025-11-05

### 🐛 Corrigido (CRÍTICO)

**Erro 1: Inicialização do IndexedDB**

- **Sintoma:** `TypeError: Cannot read properties of null (reading 'transaction')`
- **Causa:** Módulos tentavam acessar banco antes da inicialização
- **Solução:** Criado `ensureDBReady()` + wrappers seguros (`dbSafe.js`)
- **Impacto:** `unidade.js`, `usuarios.js`, `rede.js`, `preferencias.js`
- **Retry:** Automático com backoff exponencial via `initSafe()`
- **Doc:** Ver `BUGFIX_UNIDADE_DB.md`

**Erro 2: ID da Unidade Orçamentária Sobrescrito**

- **Sintoma:** "Unidade orçamentária não cadastrada" ao cadastrar usuários
- **Causa:** Spread operator `...unidade` sobrescrevia `id: "unidadeOrcamentaria"`
- **Solução:** Invertida ordem do spread (ID fixo sempre sobrescreve)
- **Impacto:** `unidade.js` (linha ~650)
- **Doc:** Ver `BUGFIX_ID_UNIDADE.md`

---

## [1.2.7] - 2025-11-04

### ✨ Adicionado

- **Inicialização Automática no VS Code** 🚀
  - Task automática ao abrir workspace (`.vscode/tasks.json`)
  - Script inteligente `iniciar-sistema.ps1`
  - Detecta se servidor já está rodando
  - Inicia servidor HTTP automaticamente
  - Abre navegador em `http://localhost:8000`
  - Configurações do workspace (`.vscode/settings.json`)
  - Documentação completa (`.vscode/README.md`)

### 🔧 Modificado

- **Experiência do Desenvolvedor**
  - Basta abrir a pasta no VS Code
  - Sistema inicia automaticamente (após permitir)
  - Não precisa mais executar scripts manualmente

---

## [1.2.6] - 2025-11-04

### ✨ Adicionado

- **Exportação CSV**
  - Novo módulo `js/exportCSV.js` para exportar dados
  - Botão "📥 Exportar" no header principal
  - Exporta Notas Fiscais, Empenhos e Itens
  - Formato compatível com Excel (UTF-8 com BOM)
  - Separador ponto-e-vírgula (;)

- **Toggle Modo API Demo/Produção**
  - Controle manual de modo API no módulo Consultas
  - Botão visível para alternar entre dados reais e mock
  - Preferência salva em localStorage
  - Indicador visual de modo ativo

### 🔧 Modificado

- **Estilos CSS Refatorados**
  - Removidos 34 estilos inline de `index.html`
  - Removidos 10 estilos inline de `config/configuracoes.html`
  - Criadas 20+ classes CSS reutilizáveis
  - Melhor manutenibilidade e performance

- **Scripts PowerShell Otimizados**
  - Corrigidos warnings de variáveis não utilizadas
  - `$null =` antes de `Invoke-WebRequest` não usados
  - Código mais limpo e sem alertas

### 🐛 Corrigido

- Todos os erros de lint relacionados a estilos inline
- Warnings PowerShell em `abrir-aplicacao.ps1` e `iniciar-proxy.ps1`
- Melhor separação de responsabilidades CSS/HTML

---

## [1.2.5] - 2025-11-04

### ✨ Adicionado

- **Módulo "Consultas Diversas"** completo
  - 7 tipos de consultas (Material, Serviço, UASG, ARP, PNCP, Licitações, Itens)
  - Interface com cards clicáveis
  - Formulários de filtros avançados
  - Tabelas de resultados com paginação
  - Sistema de cache inteligente

- **Servidor Proxy CORS** (`server/proxy-server.py`)
  - Resolve bloqueio CORS de APIs públicas
  - Serve arquivos estáticos
  - Intercepta requisições `/api/*`
  - Redireciona para `dadosabertos.compras.gov.br`

- **Modo Demonstração Automático**
  - Fallback inteligente quando API falha
  - Dados realistas de exemplo
  - Ativa automaticamente sem intervenção
  - Materiais (5), Serviços (3), UASG (3), ARP (2)

- **Sistema de Dados Mock** (`js/consultas/dadosMock.js`)
  - Estrutura idêntica à API real
  - Dados brasileiros realistas
  - Fácil expansão

### 🔧 Modificado

- **Estrutura de pastas reorganizada**
  - Movido scripts de servidor para `server/`
  - Movido arquivos de teste para `testes/`
  - Limpeza da raiz do projeto

- **Script de inicialização** (`abrir.ps1`)
  - Agora inicia servidor proxy automaticamente
  - Detecta Python instalado
  - Abre navegador automaticamente

- **Arquitetura de API** (`js/consultas/apiCompras.js`)
  - Mudou de chamada direta para proxy local
  - `API_BASE` alterado de URL externa para `/api`
  - Try/catch com fallback para modo demo

### 🐛 Corrigido

- Erro de CORS ao acessar APIs públicas
- Cache do navegador impedindo atualizações
- Módulos ES6 não carregando em file://
- Timeout de requisições muito curto

### 📚 Documentação

- README.md atualizado com nova estrutura
- CHANGELOG.md criado
- Instruções de uso do servidor proxy
- Guia de resolução de problemas (cache)

### 🗂️ Estrutura de Arquivos

**Antes:**

```
IFDESK/
├── proxy-server.py ❌ (raiz desorganizada)
├── teste-*.html ❌
└── iniciar-proxy.ps1 ❌
```

**Depois:**

```
IFDESK/
├── server/
│   ├── proxy-server.py ✅
│   └── iniciar-proxy.ps1 ✅
├── testes/
│   └── teste-*.html ✅
└── abrir.ps1 ✅
```

### ⚡ Performance

- Sistema funciona 100% offline após carregar dados
- Cache de consultas reduz requisições
- Modo demo elimina dependência de internet

### 🔐 Segurança

- Servidor proxy apenas em localhost
- Sem armazenamento de credenciais
- IndexedDB local (sem servidor externo)

---

## [1.2.4] - Anterior

### Funcionalidades Existentes

- Controle de materiais
- Parser de Notas de Empenho
- Integração NFe
- Sistema de validação

---

## 📝 Formato do Changelog

Este changelog segue o formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/)

### Tipos de Mudanças

- `Adicionado` - novos recursos
- `Modificado` - alterações em recursos existentes
- `Depreciado` - recursos que serão removidos
- `Removido` - recursos removidos
- `Corrigido` - correções de bugs
- `Segurança` - vulnerabilidades corrigidas
