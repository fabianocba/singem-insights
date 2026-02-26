# Estrutura do Projeto SINGEM# 📐 ESTRUTURA E ORGANIZAÇÃO DO PROJETO SINGEM

## 📁 Estrutura da Raiz**Última atualização:** 04/11/2025

**Versão:** 1.2.5

### Arquivos Mantidos na Raiz (Arquivos Padrão)

---

`````

SINGEM/## 📁 Hierarquia de Pastas

├── .editorconfig            ✅ Configuração de editor

├── .eslintrc.json           ✅ Configuração de linting```

├── .gitignore               ✅ Arquivos ignorados pelo GitD:\SINGEM/

├── .htaccess                ✅ Configuração de servidor Apache│

├── .prettierignore          ✅ Arquivos ignorados pelo Prettier├── 📄 index.html                    # Página principal do sistema

├── .prettierrc.json         ✅ Configuração de formatação├── 📄 abrir.ps1                     # Script de inicialização rápida

├── CHANGELOG.md             ✅ Histórico de mudanças├── 📄 README.md                     # Documentação principal

├── index.html               ✅ Ponto de entrada da aplicação├── 📄 CHANGELOG.md                  # Histórico de mudanças

├── package.json             ✅ Dependências e scripts NPM├── 📄 reset-singem.js               # Reset do sistema

├── package-lock.json        ✅ Lock de dependências│

├── README.md                ✅ Documentação principal├── 📂 .vscode/                      # Configurações do VS Code

├── sw.js                    ✅ Service Worker│   └── tasks.json                   # Tasks automatizadas

└── package-lock.json        ✅ Lock de dependências│

```├── 📂 css/                          # Estilos CSS

│   ├── style.css                    # Estilos principais

### Pastas Padrão│   └── consultas.css                # Estilos módulo Consultas

│

```├── 📂 js/                           # JavaScript

SINGEM/│   ├── app.js                       # Aplicação principal

├── .vscode/                 ✅ Configurações do VS Code│   ├── db.js                        # IndexedDB

├── audit/                   ✅ Relatórios de auditoria│   ├── config.js                    # Configurações

├── config/                  ✅ Arquivos de configuração│   ├── fsManager.js                 # Gerenciador de arquivos

├── consultas/               ✅ Queries e consultas│   ├── neParser.js                  # Parser Nota de Empenho

├── css/                     ✅ Estilos da aplicação│   ├── neParser.test.js             # Testes do parser

├── data/                    ✅ Dados e exemplos│   ├── neParser.examples.js         # Exemplos de NE

├── docs/                    ✅ Documentação técnica│   ├── neParserInit.js              # Inicialização parser

│   ├── implementacao/       ✅ Documentos de implementação│   ├── nfeIntegration.js            # Integração NFe

│   ├── bugfixes/            ✅ Correções documentadas│   ├── pdfReader.js                 # Leitor de PDF

│   └── guias/               ✅ Guias de uso│   │

├── img/                     ✅ Imagens e recursos visuais│   ├── 📂 consultas/                # Módulo Consultas Diversas

├── js/                      ✅ Código JavaScript│   │   ├── index.js                 # Entry point

│   ├── core/                ✅ Módulos principais│   │   ├── apiCompras.js            # Cliente API + fallback

│   │   ├── inputValidator.js│   │   ├── dadosMock.js             # Dados demonstração

│   │   └── htmlSanitizer.js│   │   ├── cache.js                 # Sistema de cache

│   ├── modules/             ✅ Módulos de domínio│   │   ├── mapeadores.js            # Normalização de dados

│   └── utils/               ✅ Utilitários│   │   ├── uiConsultas.js           # Interface do usuário

├── node_modules/            ✅ Dependências (ignorado pelo Git)│   │   └── loader.js                # Carregador de módulos

├── scripts/                 ✅ Scripts de automação│   │

│   └── util/                ✅ Scripts utilitários (.ps1, etc)│   └── 📂 settings/                 # Configurações do sistema

├── server/                  ✅ Código do servidor│

├── tests/                   ✅ Testes automatizados├── 📂 server/                       # Servidor e scripts

│   ├── setup.js│   ├── proxy-server.py              # Servidor Proxy CORS

│   └── inputValidator.test.js│   ├── iniciar-proxy.ps1            # Inicialização proxy

└── testes/                  ✅ Testes manuais (HTML)│   └── servidor.ps1                 # Servidor HTTP simples

```│

├── 📂 scripts/                      # Scripts auxiliares

## 📋 Convenções de Organização│   └── abrir-aplicacao.ps1          # Abertura da aplicação

│

### ✅ O que deve ficar na Raiz├── 📂 testes/                       # Arquivos de teste

│   ├── teste-api-compras.html       # Diagnóstico API

1. **Arquivos de Configuração Padrão**:│   ├── teste-clique.html            # Teste de eventos

   - `.editorconfig`, `.eslintrc.json`, `.prettierrc.json`│   ├── teste-consultas.js           # Teste consultas

   - `.gitignore`, `.htaccess`│   └── teste-simples.html           # Teste básico

   - `package.json`, `package-lock.json`│

├── 📂 data/                         # Dados do sistema

2. **Arquivos de Documentação Principal**:│   ├── exemplos.json                # Exemplos de dados

   - `README.md` - Documentação principal do projeto│   └── README.md                    # Documentação de dados

   - `CHANGELOG.md` - Histórico de versões e mudanças│

├── 📂 docs/                         # Documentação

3. **Arquivos de Entrada**:│   ├── NE_PARSER.md                 # Doc parser NE

   - `index.html` - Ponto de entrada da aplicação│   ├── PADRONIZACAO_NF.md           # Padrões NF

   - `sw.js` - Service Worker para PWA│   ├── GUIA_RAPIDO_NE.md            # Guia rápido NE

│   └── NE_PARSER.md                # Parser de NE

### ❌ O que deve ser movido para Subpastas│

├── 📂 img/                          # Imagens e ícones

1. **Documentação Técnica** → `docs/`:│

   - Implementações: `ADEQUACAO_*.md`, `IMPLEMENTACAO_*.md` → `docs/implementacao/`├── 📂 config/                       # Arquivos de configuração

   - Correções: `BUGFIX_*.md` → `docs/bugfixes/`│

   - Guias: `GUIA_*.md` → `docs/guias/`└── 📂 consultas/                    # Dados de consultas (cache)

   - Relatórios: `*_REPORT.md`, `DIAGNOSTICO_*.md` → `docs/````



2. **Scripts Auxiliares** → `scripts/util/`:---

   - Scripts PowerShell: `*.ps1`

   - Scripts de reset/manutenção: `reset-singem.js`## 🎯 Propósito de Cada Pasta



3. **Relatórios Gerados** → `docs/`:### 📂 Raiz (`/`)

   - Relatórios de manutenção ativos em `docs/`

   - Outputs de análise automática**Arquivos essenciais de inicialização e documentação**



4. **Documentação Duplicada**:- `index.html` - Página única do sistema (SPA)

   - `README_V2.md` → `docs/`- `abrir.ps1` - Atalho para iniciar servidor + navegador

- `README.md` - Documentação completa

## 🧪 Scripts NPM Disponíveis- `CHANGELOG.md` - Histórico de versões

- `reset-singem.js` - Utilitário de reset

### Scripts de Qualidade

```bash
# Ver scripts disponíveis
npm run

# Lint
npm run lint

# Formatação
npm run format

# Scan de arquivos potencialmente órfãos
npm run scan:orphans
`````

### 📂 `/css`

- `style.css` - Estilos base do sistema
- `consultas.css` - Estilos do módulo Consultas Diversas

### 📂 `/js`

**Lógica JavaScript principal**

- `app.js` - Inicialização e coordenação geral
- `db.js` - Camada de acesso ao IndexedDB
- `config.js` - Constantes e configurações

**Parser de NE:**

### Qualidade de Código

- `neParser.js` - Lógica de parsing

```bash- `neParser.test.js` - Testes unitários

# Executar linting- `neParser.examples.js` - Casos de teste

npm run lint- `neParserInit.js` - Inicialização

# Corrigir problemas de linting automaticamente**Integrações:**

npm run lint:fix

- `nfeIntegration.js` - API NFe

# Formatar código com Prettier- `pdfReader.js` - Leitura de PDFs

npm run format

### 📂 `/js/consultas`

# Verificar formatação sem modificar

npm run format:check**Módulo de Consultas Diversas (API Compras.gov.br)**

# Análise de qualidade completa**Arquitetura:**

npm run quality

````

index.js ──┐

### Desenvolvimento           ├─→ apiCompras.js ──→ dadosMock.js (fallback)

           ├─→ cache.js

```bash           ├─→ mapeadores.js

# Iniciar servidor de desenvolvimento           └─→ uiConsultas.js

npm run dev```



# Build para produção**Responsabilidades:**

npm run build

- `index.js` - Ponto de entrada, exporta API pública

# Preview da build de produção- `apiCompras.js` - Cliente HTTP com retry e fallback

npm run preview- `dadosMock.js` - Dados de demonstração (modo offline)

```- `cache.js` - Armazenamento temporário de resultados

- `mapeadores.js` - Normalização de formatos da API

### Segurança- `uiConsultas.js` - Renderização de interface

- `loader.js` - Carregamento dinâmico de módulos

```bash

# Auditoria de segurança de dependências### 📂 `/server`

npm audit

**Servidor e infraestrutura**

# Corrigir vulnerabilidades automaticamente

npm audit fix- `proxy-server.py` - Servidor Python com proxy CORS

- `iniciar-proxy.ps1` - Script de inicialização automatizada

# Análise de segurança do código- `servidor.ps1` - Servidor HTTP básico (fallback)

npm run security-audit

```**Função do Proxy:**



## 🔒 Módulos de Segurança1. Serve arquivos estáticos (HTML, CSS, JS)

2. Intercepta `/api/*` → redireciona para API externa

### InputValidator (`js/core/inputValidator.js`)3. Adiciona headers CORS

4. Retorna dados ao navegador

Validação de dados de entrada com proteção contra injeção e manipulação.

### 📂 `/scripts`

**Métodos Principais**:

- `validateCNPJ(cnpj)` - Validação completa de CNPJ**Scripts PowerShell auxiliares**

- `validateEmpenho(data)` - Validação de dados de empenho

- `validateNotaFiscal(data)` - Validação de nota fiscal- `abrir-aplicacao.ps1` - Abertura completa do sistema

- `validatePDFFile(file)` - Validação de arquivos PDF

- `sanitizeString(str)` - Sanitização de strings### 📂 `/testes`

- `validateCredentials(username, password)` - Validação de credenciais

**Arquivos de teste e diagnóstico**

**Testes**: 32 testes implementados (100% passing)

- HTML de testes isolados

### HTMLSanitizer (`js/core/htmlSanitizer.js`)- Scripts de validação

- Páginas de diagnóstico

Prevenção de XSS e sanitização de conteúdo HTML.

### 📂 `/data`

**Métodos Principais**:

- `sanitize(html, options)` - Sanitização completa de HTML**Dados do sistema**

- `createElement(tagName, options)` - Criação segura de elementos

- `_sanitizeURL(url)` - Validação e sanitização de URLs- Exemplos de NE, NFe

- `_isHTMLString(str)` - Detecção de strings HTML- Schemas JSON

- Dados de seed

**Proteções**:

- XSS via atributos HTML### 📂 `/docs`

- JavaScript injection em URLs

- Data URIs maliciosos**Documentação técnica**

- Event handlers perigosos

- Guias de uso

## 📊 Estado Atual do Projeto- Especificações de parser

- Padrões de validação

### Fase 1: Estrutura Base ✅ COMPLETA

- Sistema de gestão de empenhos---

- Parser de Notas de Empenho (NE)

- Integração com SIASG## 🔄 Fluxo de Inicialização



### Fase 2: Segurança e Validação ✅ 100% COMPLETA```

- ✅ InputValidator integrado em 3 formuláriosUsuário executa: .\abrir.ps1

- ✅ HTMLSanitizer implementado        ↓

- ✅ Proteção XSS e injectionRedireciona para: .\server\iniciar-proxy.ps1

- ✅ Validação de CNPJ, valores, arquivos        ↓

1. Detecta Python instalado

### Fase 3: Testes Automatizados ✅ 100% COMPLETA2. Verifica porta 8000 livre

- ✅ Vitest configurado3. Inicia proxy-server.py em background

- ✅ 32 testes implementados (100% passing)4. Aguarda 3 segundos

- ✅ Cobertura de código habilitada5. Abre navegador em http://localhost:8000/index.html

- ✅ Scripts NPM de teste        ↓

Navegador carrega: index.html

### Fase 4: Refatoração de Complexidade ✅ 67% COMPLETA        ↓

- ✅ processarEmpenhoUpload(): 34 → <15 (RESOLVIDO)1. Carrega CSS (style.css + consultas.css)

- ✅ salvarEmpenho(): 18 → <15 (RESOLVIDO)2. Carrega app.js (inicialização)

- ⚠️ salvarNotaFiscal(): 22 → 16 (MELHORADO -27%)3. Carrega módulos ES6

- ✅ 10 métodos auxiliares extraídos        ↓

Sistema pronto! ✅

### Fase 5: Observabilidade 🔄 EM PLANEJAMENTO```

- ⏳ Logger estruturado (Pino)

- ⏳ Trace-ID para operações assíncronas---

- ⏳ Health checks

## 🌐 Fluxo de Dados - Consultas Diversas

### Fase 6: Performance 🔄 EM PLANEJAMENTO

- ⏳ Code-splitting de app.js (2945 linhas)```

- ⏳ Lazy loading de módulos pesadosUsuário clica "Buscar"

- ⏳ Otimização de Service Worker        ↓

- ⏳ Compressão de assetsuiConsultas.js → captura evento

        ↓

## 📈 Métricas de QualidadeapiCompras.js → getMateriais()

        ↓

### Testes┌─── Verifica modo demo? ───┐

- **Total de Testes**: 32│                           │

- **Taxa de Aprovação**: 100% (32/32 passing)SIM                        NÃO

- **Cobertura de Código**: ~40% (meta: 70%)│                           │

- **Tempo de Execução**: <2sdadosMock.js              fetch('/api/materiais/1')

↓                           ↓

### LintingRetorna dados mock     proxy-server.py intercepta

- **Problemas Totais**: 131 (redução de 8%)                            ↓

- **Erros**: 0                       Redireciona para:

- **Warnings**: 131                       dadosabertos.compras.gov.br

- **Meta**: <100 problemas                            ↓

                       ┌─── API responde? ───┐

### Complexidade                       │                     │

- **Métodos com Complexity >15**: 3 (redução de 50%)                      SIM                   NÃO

- **processarEmpenhoUpload**: <15 ✅                       │                     │

- **salvarEmpenho**: <15 ✅                  Retorna dados         Erro 503

- **salvarNotaFiscal**: 16 ⚠️ (falta 1 ponto)                       │                     ↓

                       │              ATIVA MODO DEMO

### Segurança                       │                     ↓

- **Score de Segurança**: 60%                       └─────────┬───────────┘

- **Validações Implementadas**: 6 tipos                                 ↓

- **Proteções XSS**: Completas                         mapeadores.js → normaliza

- **Vulnerabilidades Conhecidas**: 0                                 ↓

                         cache.js → armazena

## 🚀 Próximos Passos                                 ↓

                         uiConsultas.js → renderiza

### Curto Prazo (1 semana)                                 ↓

1. ✅ Finalizar organização da raiz                         Usuário vê tabela ✅

2. ⏳ Aumentar cobertura de testes para 50%```

3. ⏳ Reduzir problemas de lint para <100

4. ⏳ Resolver último ponto de complexity (salvarNotaFiscal)---



### Médio Prazo (2-3 semanas)## 📦 Dependências

1. Adicionar testes para HTMLSanitizer (10 testes)

2. Adicionar testes para neParser (10 testes)### Externas (CDN)

3. Implementar logger estruturado (Pino)

4. Criar health checks- **jsPDF** - Geração de PDFs

- **html2canvas** - Captura de tela

### Longo Prazo (1-2 meses)- Carregadas via `<script>` tags em `index.html`

1. Dividir app.js em módulos (<800 linhas cada)

2. Implementar code-splitting### Internas (Módulos ES6)

3. Otimizar performance (lazy loading)

4. Adicionar CI/CD pipeline- Todos em `/js` e `/js/consultas`

- Importados via `import/export`

## 📚 Documentação Relacionada- Requerem servidor HTTP (não funcionam em `file://`)



- **Guias de Início**: `docs/guias/GUIA_*.md`### Python

- **Implementações**: `docs/implementacao/IMPLEMENTACAO_*.md`

- **Correções**: `docs/bugfixes/BUGFIX_*.md`- **Python 3.x** - Servidor proxy

- **Relatórios**: `docs/*_REPORT.md`- **Bibliotecas padrão** (http.server, urllib)

- **Changelog**: `CHANGELOG.md`- Sem dependências externas

- **README Principal**: `README.md`

---

## 🛠️ Manutenção

## 🔐 Segurança

### Atualizar Dependências

```bash### Dados Locais

npm outdated              # Verificar dependências desatualizadas

npm update                # Atualizar dependências menores- ✅ IndexedDB (navegador)

npm install <pkg>@latest  # Atualizar dependência específica- ✅ Sem servidor externo

```- ✅ Sem banco de dados remoto



### Limpeza### Servidor Proxy

```bash

npm run clean             # Limpar arquivos de build- ✅ Apenas localhost

npm run clean:deps        # Remover node_modules- ✅ Porta 8000 (não exposta)

npm run clean:all         # Limpeza completa- ✅ Sem autenticação (uso interno)

```

### APIs Externas

### Verificação de Saúde

```bash- ✅ API pública do Compras.gov.br

npm run health            # Executar checklist de saúde- ✅ Sem credenciais necessárias

npm run doctor            # Diagnóstico completo- ✅ Fallback para modo demo

```

---

---

## 🛠️ Manutenção

**Última Atualização**: 2025-01-XX

**Versão**: 1.0.0  ### Adicionar Dados Mock

**Mantido por**: Equipe SINGEM

1. Edite `/js/consultas/dadosMock.js`
2. Adicione objeto seguindo padrão API
3. Exporte constante
4. Importe em `apiCompras.js`

### Adicionar Nova Consulta

1. Adicione função em `apiCompras.js`
2. Adicione mapeador em `mapeadores.js`
3. Adicione UI em `uiConsultas.js`
4. Adicione card no menu

### Atualizar Estilos

1. Edite `/css/consultas.css`
2. Faça hard refresh (Ctrl+Shift+R)
3. Ou use modo anônimo

---

## 📊 Estatísticas do Projeto

```
Linhas de código:
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

## 🚀 Próximas Melhorias

- [ ] Adicionar mais dados mock
- [ ] Implementar exportação de resultados
- [ ] Melhorar sistema de cache
- [ ] Adicionar filtros avançados
- [ ] Implementar gráficos de dados
- [ ] Documentar API interna

---

**Documento mantido por:** GitHub Copilot
**Formato:** Markdown
**Encoding:** UTF-8
````
