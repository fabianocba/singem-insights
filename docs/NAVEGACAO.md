# 🗺️ Guia de Navegação - IFDESK

**Versão:** 1.2.1  
**Última atualização:** 03/11/2025

---

## 🚀 Início Rápido

### 🎯 Abrir o Sistema

```powershell
# Opção 1: Script automático
.\abrir-aplicacao.ps1

# Opção 2: Manualmente
# Abra index.html no navegador
```

### 🌐 Iniciar Servidor Local (Opcional)

```powershell
.\iniciar-servidor.ps1
# Acesse: http://localhost:3000
```

---

## 📁 Onde Encontrar...

### 🎨 Interface e Uso

| O que procuro         | Onde está               |
| --------------------- | ----------------------- |
| **Sistema principal** | `index.html`            |
| **Configurações**     | `configuracoes.html`    |
| **Estilos**           | `css/style.css`         |
| **Guia de uso**       | `GUIA_USO_APLICACAO.md` |
| **Tutorial rápido**   | `GUIA_INICIO_RAPIDO.md` |

### 💻 Código JavaScript

| Módulo                  | Arquivo                | Descrição                        |
| ----------------------- | ---------------------- | -------------------------------- |
| **Aplicação principal** | `js/app.js`            | Lógica completa do sistema       |
| **Banco de dados**      | `js/db.js`             | IndexedDB e operações            |
| **Parser de PDF**       | `js/pdfReader.js`      | Leitor genérico de PDFs          |
| **Parser de NE**        | `js/neParser.js`       | Especializado em Nota de Empenho |
| **Integração NF-e**     | `js/nfeIntegration.js` | Consulta de NF eletrônica        |
| **Sistema de arquivos** | `js/fsManager.js`      | Gerenciamento local de PDFs      |
| **Configurações**       | `js/config.js`         | Parâmetros do sistema            |

### ⚙️ Módulo de Configurações

| Funcionalidade           | Arquivo                       | Descrição                   |
| ------------------------ | ----------------------------- | --------------------------- |
| **Controller**           | `js/settings/index.js`        | Gerenciador principal       |
| **Unidade Orçamentária** | `js/settings/unidade.js`      | CNPJ e dados institucionais |
| **Usuários**             | `js/settings/usuarios.js`     | Autenticação e CRUD         |
| **Rede/LAN**             | `js/settings/rede.js`         | Compartilhamento em rede    |
| **Preferências**         | `js/settings/preferencias.js` | Tema, tolerâncias, backup   |

### 📚 Documentação

#### 📖 Manuais do Usuário

| Documento               | Descrição                               |
| ----------------------- | --------------------------------------- |
| `README.md`             | **Leia primeiro!** Visão geral completa |
| `GUIA_INICIO_RAPIDO.md` | Tutorial em 5 minutos                   |
| `GUIA_USO_APLICACAO.md` | Manual detalhado passo a passo          |
| `CHANGELOG.md`          | Histórico de versões e mudanças         |

#### 🔧 Documentação Técnica

Pasta: `docs/`

| Arquivo                     | Conteúdo                         |
| --------------------------- | -------------------------------- |
| `NE_PARSER.md`              | API e funcionamento do parser NE |
| `GUIA_RAPIDO_NE.md`         | Como usar o parser NE            |
| `LEIA-ME_NE_PARSER.md`      | Introdução ao parser             |
| `CONFIGURACOES.md`          | Módulo de configurações          |
| `PADRONIZACAO_NF.md`        | Padrões de Nota Fiscal           |
| `TESTE_VALIDACAO_PARSER.md` | Validação de parsers             |

#### 📝 Documentação de Implementação

Pasta: `docs/implementacao/`

| Arquivo                          | Conteúdo                               |
| -------------------------------- | -------------------------------------- |
| `IMPLEMENTACAO_NE_PARSER.md`     | Como o parser NE foi implementado      |
| `IMPLEMENTACAO_CONFIGURACOES.md` | Como configurações foram implementadas |
| `RESTRICOES_SEGURANCA.md`        | Sistema de permissões e segurança      |
| `INTEGRACOES_APLICADAS.md`       | Integrações entre módulos              |

#### 🧹 Relatórios de Manutenção

| Arquivo                | Conteúdo                       |
| ---------------------- | ------------------------------ |
| `RELATORIO_LIMPEZA.md` | Análise e plano de organização |
| `LIMPEZA_EXECUTADA.md` | Relatório final da limpeza     |

### 🧪 Testes

Pasta: `testes/`

#### HTML de Teste

Pasta: `testes/html/`

| Arquivo                    | Testa                     |
| -------------------------- | ------------------------- |
| `teste.html`               | Todos os módulos básicos  |
| `teste-ne-parser.html`     | Parser de Nota de Empenho |
| `teste-nf-parser.html`     | Parser de Nota Fiscal     |
| `teste-nf-validacao.html`  | Validação de NF           |
| `teste-comparacao-nf.html` | Comparação NE vs NF       |

#### PDFs de Teste

Pasta: `testes/pdfs/`

- `NE 039 CGSM COMERCIO.pdf` - Exemplo de Nota de Empenho
- `NF 382 CGSM.pdf` - Exemplo de Nota Fiscal

**Ver:** `testes/README.md` para detalhes

### 📄 Dados e Exemplos

Pasta: `data/`

| Item                         | Localização                |
| ---------------------------- | -------------------------- |
| **Configuração de exemplos** | `exemplos.json`            |
| **PDFs de exemplo**          | `exemplos/` (~10 arquivos) |
| **Info sobre exemplos**      | `README.md`                |

### 🌐 Servidor (Opcional)

Pasta: `server/`

| Arquivo        | Descrição                |
| -------------- | ------------------------ |
| `index.js`     | Servidor Express Node.js |
| `package.json` | Dependências npm         |
| `README.md`    | Como usar o servidor     |

**Iniciar:**

```powershell
.\iniciar-servidor.ps1
# ou
cd server
npm install
npm start
```

---

## 🎯 Fluxos Comuns

### 📝 Quero fazer um cadastro

1. Abra `index.html`
2. Clique no card correspondente:
   - "Cadastro de Empenho" → Upload PDF de NE
   - "Entrada de NF" → Upload PDF / Chave / Barcode
   - "Entrada de Entrega" → Registro manual

### ⚙️ Quero configurar o sistema

1. Abra `index.html`
2. Clique no ícone de engrenagem (canto superior direito)
3. Ou abra diretamente `configuracoes.html`

### 🧪 Quero testar funcionalidades

1. Inicie o servidor: `.\iniciar-servidor.ps1`
2. Acesse: `http://localhost:3000/testes/html/`
3. Escolha o teste desejado

### 📚 Quero entender como funciona

1. **Visão geral:** `README.md`
2. **Tutorial:** `GUIA_INICIO_RAPIDO.md`
3. **Detalhes técnicos:** `docs/NE_PARSER.md`
4. **Implementação:** `docs/implementacao/`

### 🔧 Quero contribuir/modificar

1. Leia as **Regras de Desenvolvimento** (na última conversa)
2. Veja `CHANGELOG.md` para histórico
3. Consulte documentação em `docs/implementacao/`
4. **NÃO altere** código funcional sem necessidade
5. **Documente** todas as mudanças

---

## 🗂️ Estrutura Visual

```
IFDESK/
│
├── 🏠 INÍCIO
│   ├── index.html ⭐ (SISTEMA PRINCIPAL)
│   ├── configuracoes.html (Configurações)
│   └── *.ps1 (Scripts utilitários)
│
├── 📚 DOCUMENTAÇÃO
│   ├── README.md ⭐ (LEIA PRIMEIRO)
│   ├── GUIA_INICIO_RAPIDO.md (Tutorial 5min)
│   ├── GUIA_USO_APLICACAO.md (Manual completo)
│   ├── CHANGELOG.md (Versões)
│   └── docs/ (Documentação técnica)
│       ├── *.md (Manuais técnicos)
│       └── implementacao/ (Detalhes de código)
│
├── 💻 CÓDIGO
│   ├── js/ ⭐ (JAVASCRIPT)
│   │   ├── app.js (Principal)
│   │   ├── db.js (Banco)
│   │   ├── neParser.js (Parser NE)
│   │   ├── pdfReader.js (Parser PDF)
│   │   └── settings/ (Configurações)
│   └── css/
│       └── style.css (Estilos)
│
├── 🧪 TESTES
│   └── testes/
│       ├── html/ (Páginas de teste)
│       ├── pdfs/ (PDFs de referência)
│       └── README.md (Guia de testes)
│
├── 📄 DADOS
│   └── data/
│       ├── exemplos.json
│       └── exemplos/ (PDFs de exemplo)
│
└── 🌐 SERVIDOR (Opcional)
    └── server/
        ├── index.js
        ├── package.json
        └── README.md
```

---

## 🔍 Busca Rápida

### Procuro código sobre...

| Assunto           | Onde buscar                                    |
| ----------------- | ---------------------------------------------- |
| Upload de PDF     | `js/app.js` → `processarEmpenhoUpload()`       |
| Extração de NE    | `js/neParser.js` → `extrairDadosNE()`          |
| Extração de NF    | `js/pdfReader.js` → `extrairDadosNotaFiscal()` |
| Validação CNPJ    | `js/app.js` → `validarCNPJ()`                  |
| Salvar empenho    | `js/db.js` → `salvarEmpenho()`                 |
| Comparar NE vs NF | `js/db.js` → `compararNotaFiscalComEmpenho()`  |
| Autenticação      | `js/settings/usuarios.js` → `autenticar()`     |
| Configurar rede   | `js/settings/rede.js`                          |

### Procuro documentação sobre...

| Assunto             | Documento                                    |
| ------------------- | -------------------------------------------- |
| Como usar o sistema | `GUIA_USO_APLICACAO.md`                      |
| Parser de NE        | `docs/NE_PARSER.md`                          |
| Configurações       | `docs/CONFIGURACOES.md`                      |
| Segurança           | `docs/implementacao/RESTRICOES_SEGURANCA.md` |
| Testes              | `testes/README.md`                           |
| Histórico           | `CHANGELOG.md`                               |

---

## 📞 Referência Rápida

### Arquivos Principais

- ⭐ `index.html` - Sistema principal
- ⭐ `js/app.js` - Lógica principal
- ⭐ `README.md` - Documentação

### Configuração

- ⚙️ `configuracoes.html` - Interface de config
- ⚙️ `js/config.js` - Parâmetros
- ⚙️ `js/settings/` - Módulos de config

### Desenvolvimento

- 🧪 `testes/` - Arquivos de teste
- 📚 `docs/` - Documentação técnica
- 📝 `CHANGELOG.md` - Histórico

---

**Última atualização:** 03/11/2025  
**Projeto:** IFDESK - Sistema de Controle de Material  
**Instituição:** IF Baiano  
**Versão:** 1.2.1
