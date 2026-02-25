# Estrutura do Projeto SINGEM# ðŸ“ ESTRUTURA E ORGANIZAÃ‡ÃƒO DO PROJETO SINGEM

## ðŸ“ Estrutura da Raiz**Ãšltima atualizaÃ§Ã£o:** 04/11/2025

**VersÃ£o:** 1.2.5

### Arquivos Mantidos na Raiz (Arquivos PadrÃ£o)

---

`````

SINGEM/## ðŸ“ Hierarquia de Pastas

â”œâ”€â”€ .editorconfig            âœ… ConfiguraÃ§Ã£o de editor

â”œâ”€â”€ .eslintrc.json           âœ… ConfiguraÃ§Ã£o de linting```

â”œâ”€â”€ .gitignore               âœ… Arquivos ignorados pelo GitD:\SINGEM/

â”œâ”€â”€ .htaccess                âœ… ConfiguraÃ§Ã£o de servidor Apacheâ”‚

â”œâ”€â”€ .prettierignore          âœ… Arquivos ignorados pelo Prettierâ”œâ”€â”€ ðŸ“„ index.html                    # PÃ¡gina principal do sistema

â”œâ”€â”€ .prettierrc.json         âœ… ConfiguraÃ§Ã£o de formataÃ§Ã£oâ”œâ”€â”€ ðŸ“„ abrir.ps1                     # Script de inicializaÃ§Ã£o rÃ¡pida

â”œâ”€â”€ CHANGELOG.md             âœ… HistÃ³rico de mudanÃ§asâ”œâ”€â”€ ðŸ“„ README.md                     # DocumentaÃ§Ã£o principal

â”œâ”€â”€ index.html               âœ… Ponto de entrada da aplicaÃ§Ã£oâ”œâ”€â”€ ðŸ“„ CHANGELOG.md                  # HistÃ³rico de mudanÃ§as

â”œâ”€â”€ package.json             âœ… DependÃªncias e scripts NPMâ”œâ”€â”€ ðŸ“„ reset-singem.js               # Reset do sistema

â”œâ”€â”€ package-lock.json        âœ… Lock de dependÃªnciasâ”‚

â”œâ”€â”€ README.md                âœ… DocumentaÃ§Ã£o principalâ”œâ”€â”€ ðŸ“‚ .vscode/                      # ConfiguraÃ§Ãµes do VS Code

â”œâ”€â”€ sw.js                    âœ… Service Workerâ”‚   â””â”€â”€ tasks.json                   # Tasks automatizadas

â””â”€â”€ package-lock.json        âœ… Lock de dependÃªnciasâ”‚

```â”œâ”€â”€ ðŸ“‚ css/                          # Estilos CSS

â”‚   â”œâ”€â”€ style.css                    # Estilos principais

### Pastas PadrÃ£oâ”‚   â””â”€â”€ consultas.css                # Estilos mÃ³dulo Consultas

â”‚

```â”œâ”€â”€ ðŸ“‚ js/                           # JavaScript

SINGEM/â”‚   â”œâ”€â”€ app.js                       # AplicaÃ§Ã£o principal

â”œâ”€â”€ .vscode/                 âœ… ConfiguraÃ§Ãµes do VS Codeâ”‚   â”œâ”€â”€ db.js                        # IndexedDB

â”œâ”€â”€ audit/                   âœ… RelatÃ³rios de auditoriaâ”‚   â”œâ”€â”€ config.js                    # ConfiguraÃ§Ãµes

â”œâ”€â”€ config/                  âœ… Arquivos de configuraÃ§Ã£oâ”‚   â”œâ”€â”€ fsManager.js                 # Gerenciador de arquivos

â”œâ”€â”€ consultas/               âœ… Queries e consultasâ”‚   â”œâ”€â”€ neParser.js                  # Parser Nota de Empenho

â”œâ”€â”€ css/                     âœ… Estilos da aplicaÃ§Ã£oâ”‚   â”œâ”€â”€ neParser.test.js             # Testes do parser

â”œâ”€â”€ data/                    âœ… Dados e exemplosâ”‚   â”œâ”€â”€ neParser.examples.js         # Exemplos de NE

â”œâ”€â”€ docs/                    âœ… DocumentaÃ§Ã£o tÃ©cnicaâ”‚   â”œâ”€â”€ neParserInit.js              # InicializaÃ§Ã£o parser

â”‚   â”œâ”€â”€ implementacao/       âœ… Documentos de implementaÃ§Ã£oâ”‚   â”œâ”€â”€ nfeIntegration.js            # IntegraÃ§Ã£o NFe

â”‚   â”œâ”€â”€ bugfixes/            âœ… CorreÃ§Ãµes documentadasâ”‚   â”œâ”€â”€ pdfReader.js                 # Leitor de PDF

â”‚   â””â”€â”€ guias/               âœ… Guias de usoâ”‚   â”‚

â”œâ”€â”€ img/                     âœ… Imagens e recursos visuaisâ”‚   â”œâ”€â”€ ðŸ“‚ consultas/                # MÃ³dulo Consultas Diversas

â”œâ”€â”€ js/                      âœ… CÃ³digo JavaScriptâ”‚   â”‚   â”œâ”€â”€ index.js                 # Entry point

â”‚   â”œâ”€â”€ core/                âœ… MÃ³dulos principaisâ”‚   â”‚   â”œâ”€â”€ apiCompras.js            # Cliente API + fallback

â”‚   â”‚   â”œâ”€â”€ inputValidator.jsâ”‚   â”‚   â”œâ”€â”€ dadosMock.js             # Dados demonstraÃ§Ã£o

â”‚   â”‚   â””â”€â”€ htmlSanitizer.jsâ”‚   â”‚   â”œâ”€â”€ cache.js                 # Sistema de cache

â”‚   â”œâ”€â”€ modules/             âœ… MÃ³dulos de domÃ­nioâ”‚   â”‚   â”œâ”€â”€ mapeadores.js            # NormalizaÃ§Ã£o de dados

â”‚   â””â”€â”€ utils/               âœ… UtilitÃ¡riosâ”‚   â”‚   â”œâ”€â”€ uiConsultas.js           # Interface do usuÃ¡rio

â”œâ”€â”€ node_modules/            âœ… DependÃªncias (ignorado pelo Git)â”‚   â”‚   â””â”€â”€ loader.js                # Carregador de mÃ³dulos

â”œâ”€â”€ scripts/                 âœ… Scripts de automaÃ§Ã£oâ”‚   â”‚

â”‚   â””â”€â”€ util/                âœ… Scripts utilitÃ¡rios (.ps1, etc)â”‚   â””â”€â”€ ðŸ“‚ settings/                 # ConfiguraÃ§Ãµes do sistema

â”œâ”€â”€ server/                  âœ… CÃ³digo do servidorâ”‚

â”œâ”€â”€ tests/                   âœ… Testes automatizadosâ”œâ”€â”€ ðŸ“‚ server/                       # Servidor e scripts

â”‚   â”œâ”€â”€ setup.jsâ”‚   â”œâ”€â”€ proxy-server.py              # Servidor Proxy CORS

â”‚   â””â”€â”€ inputValidator.test.jsâ”‚   â”œâ”€â”€ iniciar-proxy.ps1            # InicializaÃ§Ã£o proxy

â””â”€â”€ testes/                  âœ… Testes manuais (HTML)â”‚   â””â”€â”€ servidor.ps1                 # Servidor HTTP simples

```â”‚

â”œâ”€â”€ ðŸ“‚ scripts/                      # Scripts auxiliares

## ðŸ“‹ ConvenÃ§Ãµes de OrganizaÃ§Ã£oâ”‚   â””â”€â”€ abrir-aplicacao.ps1          # Abertura da aplicaÃ§Ã£o

â”‚

### âœ… O que deve ficar na Raizâ”œâ”€â”€ ðŸ“‚ testes/                       # Arquivos de teste

â”‚   â”œâ”€â”€ teste-api-compras.html       # DiagnÃ³stico API

1. **Arquivos de ConfiguraÃ§Ã£o PadrÃ£o**:â”‚   â”œâ”€â”€ teste-clique.html            # Teste de eventos

   - `.editorconfig`, `.eslintrc.json`, `.prettierrc.json`â”‚   â”œâ”€â”€ teste-consultas.js           # Teste consultas

   - `.gitignore`, `.htaccess`â”‚   â””â”€â”€ teste-simples.html           # Teste bÃ¡sico

   - `package.json`, `package-lock.json`â”‚

â”œâ”€â”€ ðŸ“‚ data/                         # Dados do sistema

2. **Arquivos de DocumentaÃ§Ã£o Principal**:â”‚   â”œâ”€â”€ exemplos.json                # Exemplos de dados

   - `README.md` - DocumentaÃ§Ã£o principal do projetoâ”‚   â””â”€â”€ README.md                    # DocumentaÃ§Ã£o de dados

   - `CHANGELOG.md` - HistÃ³rico de versÃµes e mudanÃ§asâ”‚

â”œâ”€â”€ ðŸ“‚ docs/                         # DocumentaÃ§Ã£o

3. **Arquivos de Entrada**:â”‚   â”œâ”€â”€ NE_PARSER.md                 # Doc parser NE

   - `index.html` - Ponto de entrada da aplicaÃ§Ã£oâ”‚   â”œâ”€â”€ PADRONIZACAO_NF.md           # PadrÃµes NF

   - `sw.js` - Service Worker para PWAâ”‚   â”œâ”€â”€ GUIA_RAPIDO_NE.md            # Guia rÃ¡pido NE

â”‚   â””â”€â”€ NE_PARSER.md                # Parser de NE

### âŒ O que deve ser movido para Subpastasâ”‚

â”œâ”€â”€ ðŸ“‚ img/                          # Imagens e Ã­cones

1. **DocumentaÃ§Ã£o TÃ©cnica** â†’ `docs/`:â”‚

   - ImplementaÃ§Ãµes: `ADEQUACAO_*.md`, `IMPLEMENTACAO_*.md` â†’ `docs/implementacao/`â”œâ”€â”€ ðŸ“‚ config/                       # Arquivos de configuraÃ§Ã£o

   - CorreÃ§Ãµes: `BUGFIX_*.md` â†’ `docs/bugfixes/`â”‚

   - Guias: `GUIA_*.md` â†’ `docs/guias/`â””â”€â”€ ðŸ“‚ consultas/                    # Dados de consultas (cache)

   - RelatÃ³rios: `*_REPORT.md`, `DIAGNOSTICO_*.md` â†’ `docs/````



2. **Scripts Auxiliares** â†’ `scripts/util/`:---

   - Scripts PowerShell: `*.ps1`

   - Scripts de reset/manutenÃ§Ã£o: `reset-singem.js`## ðŸŽ¯ PropÃ³sito de Cada Pasta



3. **RelatÃ³rios Gerados** â†’ `docs/`:### ðŸ“‚ Raiz (`/`)

   - RelatÃ³rios de manutenÃ§Ã£o ativos em `docs/`

   - Outputs de anÃ¡lise automÃ¡tica**Arquivos essenciais de inicializaÃ§Ã£o e documentaÃ§Ã£o**



4. **DocumentaÃ§Ã£o Duplicada**:- `index.html` - PÃ¡gina Ãºnica do sistema (SPA)

   - `README_V2.md` â†’ `docs/`- `abrir.ps1` - Atalho para iniciar servidor + navegador

- `README.md` - DocumentaÃ§Ã£o completa

## ðŸ§ª Scripts NPM DisponÃ­veis- `CHANGELOG.md` - HistÃ³rico de versÃµes

- `reset-singem.js` - UtilitÃ¡rio de reset

### Scripts de Qualidade

```bash
# Ver scripts disponÃ­veis
npm run

# Lint
npm run lint

# FormataÃ§Ã£o
npm run format

# Scan de arquivos potencialmente Ã³rfÃ£os
npm run scan:orphans
`````

### ðŸ“‚ `/css`

- `style.css` - Estilos base do sistema
- `consultas.css` - Estilos do mÃ³dulo Consultas Diversas

### ðŸ“‚ `/js`

**LÃ³gica JavaScript principal**

- `app.js` - InicializaÃ§Ã£o e coordenaÃ§Ã£o geral
- `db.js` - Camada de acesso ao IndexedDB
- `config.js` - Constantes e configuraÃ§Ãµes

**Parser de NE:**

### Qualidade de CÃ³digo

- `neParser.js` - LÃ³gica de parsing

```bash- `neParser.test.js` - Testes unitÃ¡rios

# Executar linting- `neParser.examples.js` - Casos de teste

npm run lint- `neParserInit.js` - InicializaÃ§Ã£o

# Corrigir problemas de linting automaticamente**IntegraÃ§Ãµes:**

npm run lint:fix

- `nfeIntegration.js` - API NFe

# Formatar cÃ³digo com Prettier- `pdfReader.js` - Leitura de PDFs

npm run format

### ðŸ“‚ `/js/consultas`

# Verificar formataÃ§Ã£o sem modificar

npm run format:check**MÃ³dulo de Consultas Diversas (API Compras.gov.br)**

# AnÃ¡lise de qualidade completa**Arquitetura:**

npm run quality

````

index.js â”€â”€â”

### Desenvolvimento           â”œâ”€â†’ apiCompras.js â”€â”€â†’ dadosMock.js (fallback)

           â”œâ”€â†’ cache.js

```bash           â”œâ”€â†’ mapeadores.js

# Iniciar servidor de desenvolvimento           â””â”€â†’ uiConsultas.js

npm run dev```



# Build para produÃ§Ã£o**Responsabilidades:**

npm run build

- `index.js` - Ponto de entrada, exporta API pÃºblica

# Preview da build de produÃ§Ã£o- `apiCompras.js` - Cliente HTTP com retry e fallback

npm run preview- `dadosMock.js` - Dados de demonstraÃ§Ã£o (modo offline)

```- `cache.js` - Armazenamento temporÃ¡rio de resultados

- `mapeadores.js` - NormalizaÃ§Ã£o de formatos da API

### SeguranÃ§a- `uiConsultas.js` - RenderizaÃ§Ã£o de interface

- `loader.js` - Carregamento dinÃ¢mico de mÃ³dulos

```bash

# Auditoria de seguranÃ§a de dependÃªncias### ðŸ“‚ `/server`

npm audit

**Servidor e infraestrutura**

# Corrigir vulnerabilidades automaticamente

npm audit fix- `proxy-server.py` - Servidor Python com proxy CORS

- `iniciar-proxy.ps1` - Script de inicializaÃ§Ã£o automatizada

# AnÃ¡lise de seguranÃ§a do cÃ³digo- `servidor.ps1` - Servidor HTTP bÃ¡sico (fallback)

npm run security-audit

```**FunÃ§Ã£o do Proxy:**



## ðŸ”’ MÃ³dulos de SeguranÃ§a1. Serve arquivos estÃ¡ticos (HTML, CSS, JS)

2. Intercepta `/api/*` â†’ redireciona para API externa

### InputValidator (`js/core/inputValidator.js`)3. Adiciona headers CORS

4. Retorna dados ao navegador

ValidaÃ§Ã£o de dados de entrada com proteÃ§Ã£o contra injeÃ§Ã£o e manipulaÃ§Ã£o.

### ðŸ“‚ `/scripts`

**MÃ©todos Principais**:

- `validateCNPJ(cnpj)` - ValidaÃ§Ã£o completa de CNPJ**Scripts PowerShell auxiliares**

- `validateEmpenho(data)` - ValidaÃ§Ã£o de dados de empenho

- `validateNotaFiscal(data)` - ValidaÃ§Ã£o de nota fiscal- `abrir-aplicacao.ps1` - Abertura completa do sistema

- `validatePDFFile(file)` - ValidaÃ§Ã£o de arquivos PDF

- `sanitizeString(str)` - SanitizaÃ§Ã£o de strings### ðŸ“‚ `/testes`

- `validateCredentials(username, password)` - ValidaÃ§Ã£o de credenciais

**Arquivos de teste e diagnÃ³stico**

**Testes**: 32 testes implementados (100% passing)

- HTML de testes isolados

### HTMLSanitizer (`js/core/htmlSanitizer.js`)- Scripts de validaÃ§Ã£o

- PÃ¡ginas de diagnÃ³stico

PrevenÃ§Ã£o de XSS e sanitizaÃ§Ã£o de conteÃºdo HTML.

### ðŸ“‚ `/data`

**MÃ©todos Principais**:

- `sanitize(html, options)` - SanitizaÃ§Ã£o completa de HTML**Dados do sistema**

- `createElement(tagName, options)` - CriaÃ§Ã£o segura de elementos

- `_sanitizeURL(url)` - ValidaÃ§Ã£o e sanitizaÃ§Ã£o de URLs- Exemplos de NE, NFe

- `_isHTMLString(str)` - DetecÃ§Ã£o de strings HTML- Schemas JSON

- Dados de seed

**ProteÃ§Ãµes**:

- XSS via atributos HTML### ðŸ“‚ `/docs`

- JavaScript injection em URLs

- Data URIs maliciosos**DocumentaÃ§Ã£o tÃ©cnica**

- Event handlers perigosos

- Guias de uso

## ðŸ“Š Estado Atual do Projeto- EspecificaÃ§Ãµes de parser

- PadrÃµes de validaÃ§Ã£o

### Fase 1: Estrutura Base âœ… COMPLETA

- Sistema de gestÃ£o de empenhos---

- Parser de Notas de Empenho (NE)

- IntegraÃ§Ã£o com SIASG## ðŸ”„ Fluxo de InicializaÃ§Ã£o



### Fase 2: SeguranÃ§a e ValidaÃ§Ã£o âœ… 100% COMPLETA```

- âœ… InputValidator integrado em 3 formulÃ¡riosUsuÃ¡rio executa: .\abrir.ps1

- âœ… HTMLSanitizer implementado        â†“

- âœ… ProteÃ§Ã£o XSS e injectionRedireciona para: .\server\iniciar-proxy.ps1

- âœ… ValidaÃ§Ã£o de CNPJ, valores, arquivos        â†“

1. Detecta Python instalado

### Fase 3: Testes Automatizados âœ… 100% COMPLETA2. Verifica porta 8000 livre

- âœ… Vitest configurado3. Inicia proxy-server.py em background

- âœ… 32 testes implementados (100% passing)4. Aguarda 3 segundos

- âœ… Cobertura de cÃ³digo habilitada5. Abre navegador em http://localhost:8000/index.html

- âœ… Scripts NPM de teste        â†“

Navegador carrega: index.html

### Fase 4: RefatoraÃ§Ã£o de Complexidade âœ… 67% COMPLETA        â†“

- âœ… processarEmpenhoUpload(): 34 â†’ <15 (RESOLVIDO)1. Carrega CSS (style.css + consultas.css)

- âœ… salvarEmpenho(): 18 â†’ <15 (RESOLVIDO)2. Carrega app.js (inicializaÃ§Ã£o)

- âš ï¸ salvarNotaFiscal(): 22 â†’ 16 (MELHORADO -27%)3. Carrega mÃ³dulos ES6

- âœ… 10 mÃ©todos auxiliares extraÃ­dos        â†“

Sistema pronto! âœ…

### Fase 5: Observabilidade ðŸ”„ EM PLANEJAMENTO```

- â³ Logger estruturado (Pino)

- â³ Trace-ID para operaÃ§Ãµes assÃ­ncronas---

- â³ Health checks

## ðŸŒ Fluxo de Dados - Consultas Diversas

### Fase 6: Performance ðŸ”„ EM PLANEJAMENTO

- â³ Code-splitting de app.js (2945 linhas)```

- â³ Lazy loading de mÃ³dulos pesadosUsuÃ¡rio clica "Buscar"

- â³ OtimizaÃ§Ã£o de Service Worker        â†“

- â³ CompressÃ£o de assetsuiConsultas.js â†’ captura evento

        â†“

## ðŸ“ˆ MÃ©tricas de QualidadeapiCompras.js â†’ getMateriais()

        â†“

### Testesâ”Œâ”€â”€â”€ Verifica modo demo? â”€â”€â”€â”

- **Total de Testes**: 32â”‚                           â”‚

- **Taxa de AprovaÃ§Ã£o**: 100% (32/32 passing)SIM                        NÃƒO

- **Cobertura de CÃ³digo**: ~40% (meta: 70%)â”‚                           â”‚

- **Tempo de ExecuÃ§Ã£o**: <2sdadosMock.js              fetch('/api/materiais/1')

â†“                           â†“

### LintingRetorna dados mock     proxy-server.py intercepta

- **Problemas Totais**: 131 (reduÃ§Ã£o de 8%)                            â†“

- **Erros**: 0                       Redireciona para:

- **Warnings**: 131                       dadosabertos.compras.gov.br

- **Meta**: <100 problemas                            â†“

                       â”Œâ”€â”€â”€ API responde? â”€â”€â”€â”

### Complexidade                       â”‚                     â”‚

- **MÃ©todos com Complexity >15**: 3 (reduÃ§Ã£o de 50%)                      SIM                   NÃƒO

- **processarEmpenhoUpload**: <15 âœ…                       â”‚                     â”‚

- **salvarEmpenho**: <15 âœ…                  Retorna dados         Erro 503

- **salvarNotaFiscal**: 16 âš ï¸ (falta 1 ponto)                       â”‚                     â†“

                       â”‚              ATIVA MODO DEMO

### SeguranÃ§a                       â”‚                     â†“

- **Score de SeguranÃ§a**: 60%                       â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜

- **ValidaÃ§Ãµes Implementadas**: 6 tipos                                 â†“

- **ProteÃ§Ãµes XSS**: Completas                         mapeadores.js â†’ normaliza

- **Vulnerabilidades Conhecidas**: 0                                 â†“

                         cache.js â†’ armazena

## ðŸš€ PrÃ³ximos Passos                                 â†“

                         uiConsultas.js â†’ renderiza

### Curto Prazo (1 semana)                                 â†“

1. âœ… Finalizar organizaÃ§Ã£o da raiz                         UsuÃ¡rio vÃª tabela âœ…

2. â³ Aumentar cobertura de testes para 50%```

3. â³ Reduzir problemas de lint para <100

4. â³ Resolver Ãºltimo ponto de complexity (salvarNotaFiscal)---



### MÃ©dio Prazo (2-3 semanas)## ðŸ“¦ DependÃªncias

1. Adicionar testes para HTMLSanitizer (10 testes)

2. Adicionar testes para neParser (10 testes)### Externas (CDN)

3. Implementar logger estruturado (Pino)

4. Criar health checks- **jsPDF** - GeraÃ§Ã£o de PDFs

- **html2canvas** - Captura de tela

### Longo Prazo (1-2 meses)- Carregadas via `<script>` tags em `index.html`

1. Dividir app.js em mÃ³dulos (<800 linhas cada)

2. Implementar code-splitting### Internas (MÃ³dulos ES6)

3. Otimizar performance (lazy loading)

4. Adicionar CI/CD pipeline- Todos em `/js` e `/js/consultas`

- Importados via `import/export`

## ðŸ“š DocumentaÃ§Ã£o Relacionada- Requerem servidor HTTP (nÃ£o funcionam em `file://`)



- **Guias de InÃ­cio**: `docs/guias/GUIA_*.md`### Python

- **ImplementaÃ§Ãµes**: `docs/implementacao/IMPLEMENTACAO_*.md`

- **CorreÃ§Ãµes**: `docs/bugfixes/BUGFIX_*.md`- **Python 3.x** - Servidor proxy

- **RelatÃ³rios**: `docs/*_REPORT.md`- **Bibliotecas padrÃ£o** (http.server, urllib)

- **Changelog**: `CHANGELOG.md`- Sem dependÃªncias externas

- **README Principal**: `README.md`

---

## ðŸ› ï¸ ManutenÃ§Ã£o

## ðŸ” SeguranÃ§a

### Atualizar DependÃªncias

```bash### Dados Locais

npm outdated              # Verificar dependÃªncias desatualizadas

npm update                # Atualizar dependÃªncias menores- âœ… IndexedDB (navegador)

npm install <pkg>@latest  # Atualizar dependÃªncia especÃ­fica- âœ… Sem servidor externo

```- âœ… Sem banco de dados remoto



### Limpeza### Servidor Proxy

```bash

npm run clean             # Limpar arquivos de build- âœ… Apenas localhost

npm run clean:deps        # Remover node_modules- âœ… Porta 8000 (nÃ£o exposta)

npm run clean:all         # Limpeza completa- âœ… Sem autenticaÃ§Ã£o (uso interno)

```

### APIs Externas

### VerificaÃ§Ã£o de SaÃºde

```bash- âœ… API pÃºblica do Compras.gov.br

npm run health            # Executar checklist de saÃºde- âœ… Sem credenciais necessÃ¡rias

npm run doctor            # DiagnÃ³stico completo- âœ… Fallback para modo demo

```

---

---

## ðŸ› ï¸ ManutenÃ§Ã£o

**Ãšltima AtualizaÃ§Ã£o**: 2025-01-XX

**VersÃ£o**: 1.0.0  ### Adicionar Dados Mock

**Mantido por**: Equipe SINGEM

1. Edite `/js/consultas/dadosMock.js`
2. Adicione objeto seguindo padrÃ£o API
3. Exporte constante
4. Importe em `apiCompras.js`

### Adicionar Nova Consulta

1. Adicione funÃ§Ã£o em `apiCompras.js`
2. Adicione mapeador em `mapeadores.js`
3. Adicione UI em `uiConsultas.js`
4. Adicione card no menu

### Atualizar Estilos

1. Edite `/css/consultas.css`
2. FaÃ§a hard refresh (Ctrl+Shift+R)
3. Ou use modo anÃ´nimo

---

## ðŸ“Š EstatÃ­sticas do Projeto

```
Linhas de cÃ³digo:
- js/consultas/        ~2.300 linhas
- js/ (principal)      ~8.000 linhas
- Total JavaScript     ~10.300 linhas
- Total CSS            ~1.500 linhas
- Total HTML           ~1.200 linhas

Arquivos:
- JavaScript           25 arquivos
- CSS                  2 arquivos
- HTML                 5+ arquivos (incluindo testes)
- Python               1 arquivo
- PowerShell           4 arquivos
- Markdown             8+ arquivos
```

---

## ðŸš€ PrÃ³ximas Melhorias

- [ ] Adicionar mais dados mock
- [ ] Implementar exportaÃ§Ã£o de resultados
- [ ] Melhorar sistema de cache
- [ ] Adicionar filtros avanÃ§ados
- [ ] Implementar grÃ¡ficos de dados
- [ ] Documentar API interna

---

**Documento mantido por:** GitHub Copilot
**Formato:** Markdown
**Encoding:** UTF-8
````
