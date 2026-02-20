# ðŸ—ºï¸ Guia de NavegaÃ§Ã£o - SINGEM

**VersÃ£o:** 1.2.1  
**Ãšltima atualizaÃ§Ã£o:** 03/11/2025

---

## ðŸš€ InÃ­cio RÃ¡pido

### ðŸŽ¯ Abrir o Sistema

```powershell
# OpÃ§Ã£o 1: Script automÃ¡tico
.\abrir-aplicacao.ps1

# OpÃ§Ã£o 2: Manualmente
# Abra index.html no navegador
```

### ðŸŒ Iniciar Servidor Local (Opcional)

```powershell
.\iniciar-servidor.ps1
# Acesse: http://localhost:3000
```

---

## ðŸ“ Onde Encontrar...

### ðŸŽ¨ Interface e Uso

| O que procuro         | Onde estÃ¡               |
| --------------------- | ----------------------- |
| **Sistema principal** | `index.html`            |
| **ConfiguraÃ§Ãµes**     | `configuracoes.html`    |
| **Estilos**           | `css/style.css`         |
| **Guia de uso**       | `GUIA_USO_APLICACAO.md` |
| **Tutorial rÃ¡pido**   | `GUIA_INICIO_RAPIDO.md` |

### ðŸ’» CÃ³digo JavaScript

| MÃ³dulo                  | Arquivo                | DescriÃ§Ã£o                        |
| ----------------------- | ---------------------- | -------------------------------- |
| **AplicaÃ§Ã£o principal** | `js/app.js`            | LÃ³gica completa do sistema       |
| **Banco de dados**      | `js/db.js`             | IndexedDB e operaÃ§Ãµes            |
| **Parser de PDF**       | `js/pdfReader.js`      | Leitor genÃ©rico de PDFs          |
| **Parser de NE**        | `js/neParser.js`       | Especializado em Nota de Empenho |
| **IntegraÃ§Ã£o NF-e**     | `js/nfeIntegration.js` | Consulta de NF eletrÃ´nica        |
| **Sistema de arquivos** | `js/fsManager.js`      | Gerenciamento local de PDFs      |
| **ConfiguraÃ§Ãµes**       | `js/config.js`         | ParÃ¢metros do sistema            |

### âš™ï¸ MÃ³dulo de ConfiguraÃ§Ãµes

| Funcionalidade           | Arquivo                       | DescriÃ§Ã£o                   |
| ------------------------ | ----------------------------- | --------------------------- |
| **Controller**           | `js/settings/index.js`        | Gerenciador principal       |
| **Unidade OrÃ§amentÃ¡ria** | `js/settings/unidade.js`      | CNPJ e dados institucionais |
| **UsuÃ¡rios**             | `js/settings/usuarios.js`     | AutenticaÃ§Ã£o e CRUD         |
| **Rede/LAN**             | `js/settings/rede.js`         | Compartilhamento em rede    |
| **PreferÃªncias**         | `js/settings/preferencias.js` | Tema, tolerÃ¢ncias, backup   |

### ðŸ“š DocumentaÃ§Ã£o

#### ðŸ“– Manuais do UsuÃ¡rio

| Documento               | DescriÃ§Ã£o                               |
| ----------------------- | --------------------------------------- |
| `README.md`             | **Leia primeiro!** VisÃ£o geral completa |
| `GUIA_INICIO_RAPIDO.md` | Tutorial em 5 minutos                   |
| `GUIA_USO_APLICACAO.md` | Manual detalhado passo a passo          |
| `CHANGELOG.md`          | HistÃ³rico de versÃµes e mudanÃ§as         |

#### ðŸ”§ DocumentaÃ§Ã£o TÃ©cnica

Pasta: `docs/`

| Arquivo                     | ConteÃºdo                         |
| --------------------------- | -------------------------------- |
| `NE_PARSER.md`              | API e funcionamento do parser NE |
| `GUIA_RAPIDO_NE.md`         | Como usar o parser NE            |
| `LEIA-ME_NE_PARSER.md`      | IntroduÃ§Ã£o ao parser             |
| `CONFIGURACOES.md`          | MÃ³dulo de configuraÃ§Ãµes          |
| `PADRONIZACAO_NF.md`        | PadrÃµes de Nota Fiscal           |
| `TESTE_VALIDACAO_PARSER.md` | ValidaÃ§Ã£o de parsers             |

#### ðŸ“ DocumentaÃ§Ã£o de ImplementaÃ§Ã£o

Pasta: `docs/implementacao/`

| Arquivo                          | ConteÃºdo                               |
| -------------------------------- | -------------------------------------- |
| `IMPLEMENTACAO_NE_PARSER.md`     | Como o parser NE foi implementado      |
| `IMPLEMENTACAO_CONFIGURACOES.md` | Como configuraÃ§Ãµes foram implementadas |
| `RESTRICOES_SEGURANCA.md`        | Sistema de permissÃµes e seguranÃ§a      |
| `INTEGRACOES_APLICADAS.md`       | IntegraÃ§Ãµes entre mÃ³dulos              |

#### ðŸ§¹ RelatÃ³rios de ManutenÃ§Ã£o

| Arquivo                | ConteÃºdo                       |
| ---------------------- | ------------------------------ |
| `RELATORIO_LIMPEZA.md` | AnÃ¡lise e plano de organizaÃ§Ã£o |
| `LIMPEZA_EXECUTADA.md` | RelatÃ³rio final da limpeza     |

### ðŸ§ª Testes

Pasta: `testes/`

#### HTML de Teste

Pasta: `testes/html/`

| Arquivo                    | Testa                     |
| -------------------------- | ------------------------- |
| `teste.html`               | Todos os mÃ³dulos bÃ¡sicos  |
| `teste-ne-parser.html`     | Parser de Nota de Empenho |
| `teste-nf-parser.html`     | Parser de Nota Fiscal     |
| `teste-nf-validacao.html`  | ValidaÃ§Ã£o de NF           |
| `teste-comparacao-nf.html` | ComparaÃ§Ã£o NE vs NF       |

#### PDFs de Teste

Pasta: `testes/pdfs/`

- `NE 039 CGSM COMERCIO.pdf` - Exemplo de Nota de Empenho
- `NF 382 CGSM.pdf` - Exemplo de Nota Fiscal

**Ver:** `testes/README.md` para detalhes

### ðŸ“„ Dados e Exemplos

Pasta: `data/`

| Item                         | LocalizaÃ§Ã£o                |
| ---------------------------- | -------------------------- |
| **ConfiguraÃ§Ã£o de exemplos** | `exemplos.json`            |
| **PDFs de exemplo**          | `exemplos/` (~10 arquivos) |
| **Info sobre exemplos**      | `README.md`                |

### ðŸŒ Servidor (Opcional)

Pasta: `server/`

| Arquivo        | DescriÃ§Ã£o                |
| -------------- | ------------------------ |
| `index.js`     | Servidor Express Node.js |
| `package.json` | DependÃªncias npm         |
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

## ðŸŽ¯ Fluxos Comuns

### ðŸ“ Quero fazer um cadastro

1. Abra `index.html`
2. Clique no card correspondente:
   - "Cadastro de Empenho" â†’ Upload PDF de NE
   - "Entrada de NF" â†’ Upload PDF / Chave / Barcode
   - "Entrada de Entrega" â†’ Registro manual

### âš™ï¸ Quero configurar o sistema

1. Abra `index.html`
2. Clique no Ã­cone de engrenagem (canto superior direito)
3. Ou abra diretamente `configuracoes.html`

### ðŸ§ª Quero testar funcionalidades

1. Inicie o servidor: `.\iniciar-servidor.ps1`
2. Acesse: `http://localhost:3000/testes/html/`
3. Escolha o teste desejado

### ðŸ“š Quero entender como funciona

1. **VisÃ£o geral:** `README.md`
2. **Tutorial:** `GUIA_INICIO_RAPIDO.md`
3. **Detalhes tÃ©cnicos:** `docs/NE_PARSER.md`
4. **ImplementaÃ§Ã£o:** `docs/implementacao/`

### ðŸ”§ Quero contribuir/modificar

1. Leia as **Regras de Desenvolvimento** (na Ãºltima conversa)
2. Veja `CHANGELOG.md` para histÃ³rico
3. Consulte documentaÃ§Ã£o em `docs/implementacao/`
4. **NÃƒO altere** cÃ³digo funcional sem necessidade
5. **Documente** todas as mudanÃ§as

---

## ðŸ—‚ï¸ Estrutura Visual

```
SINGEM/
â”‚
â”œâ”€â”€ ðŸ  INÃCIO
â”‚   â”œâ”€â”€ index.html â­ (SISTEMA PRINCIPAL)
â”‚   â”œâ”€â”€ configuracoes.html (ConfiguraÃ§Ãµes)
â”‚   â””â”€â”€ *.ps1 (Scripts utilitÃ¡rios)
â”‚
â”œâ”€â”€ ðŸ“š DOCUMENTAÃ‡ÃƒO
â”‚   â”œâ”€â”€ README.md â­ (LEIA PRIMEIRO)
â”‚   â”œâ”€â”€ GUIA_INICIO_RAPIDO.md (Tutorial 5min)
â”‚   â”œâ”€â”€ GUIA_USO_APLICACAO.md (Manual completo)
â”‚   â”œâ”€â”€ CHANGELOG.md (VersÃµes)
â”‚   â””â”€â”€ docs/ (DocumentaÃ§Ã£o tÃ©cnica)
â”‚       â”œâ”€â”€ *.md (Manuais tÃ©cnicos)
â”‚       â””â”€â”€ implementacao/ (Detalhes de cÃ³digo)
â”‚
â”œâ”€â”€ ðŸ’» CÃ“DIGO
â”‚   â”œâ”€â”€ js/ â­ (JAVASCRIPT)
â”‚   â”‚   â”œâ”€â”€ app.js (Principal)
â”‚   â”‚   â”œâ”€â”€ db.js (Banco)
â”‚   â”‚   â”œâ”€â”€ neParser.js (Parser NE)
â”‚   â”‚   â”œâ”€â”€ pdfReader.js (Parser PDF)
â”‚   â”‚   â””â”€â”€ settings/ (ConfiguraÃ§Ãµes)
â”‚   â””â”€â”€ css/
â”‚       â””â”€â”€ style.css (Estilos)
â”‚
â”œâ”€â”€ ðŸ§ª TESTES
â”‚   â””â”€â”€ testes/
â”‚       â”œâ”€â”€ html/ (PÃ¡ginas de teste)
â”‚       â”œâ”€â”€ pdfs/ (PDFs de referÃªncia)
â”‚       â””â”€â”€ README.md (Guia de testes)
â”‚
â”œâ”€â”€ ðŸ“„ DADOS
â”‚   â””â”€â”€ data/
â”‚       â”œâ”€â”€ exemplos.json
â”‚       â””â”€â”€ exemplos/ (PDFs de exemplo)
â”‚
â””â”€â”€ ðŸŒ SERVIDOR (Opcional)
    â””â”€â”€ server/
        â”œâ”€â”€ index.js
        â”œâ”€â”€ package.json
        â””â”€â”€ README.md
```

---

## ðŸ” Busca RÃ¡pida

### Procuro cÃ³digo sobre...

| Assunto           | Onde buscar                                    |
| ----------------- | ---------------------------------------------- |
| Upload de PDF     | `js/app.js` â†’ `processarEmpenhoUpload()`       |
| ExtraÃ§Ã£o de NE    | `js/neParser.js` â†’ `extrairDadosNE()`          |
| ExtraÃ§Ã£o de NF    | `js/pdfReader.js` â†’ `extrairDadosNotaFiscal()` |
| ValidaÃ§Ã£o CNPJ    | `js/app.js` â†’ `validarCNPJ()`                  |
| Salvar empenho    | `js/db.js` â†’ `salvarEmpenho()`                 |
| Comparar NE vs NF | `js/db.js` â†’ `compararNotaFiscalComEmpenho()`  |
| AutenticaÃ§Ã£o      | `js/settings/usuarios.js` â†’ `autenticar()`     |
| Configurar rede   | `js/settings/rede.js`                          |

### Procuro documentaÃ§Ã£o sobre...

| Assunto             | Documento                                    |
| ------------------- | -------------------------------------------- |
| Como usar o sistema | `GUIA_USO_APLICACAO.md`                      |
| Parser de NE        | `docs/NE_PARSER.md`                          |
| ConfiguraÃ§Ãµes       | `docs/CONFIGURACOES.md`                      |
| SeguranÃ§a           | `docs/implementacao/RESTRICOES_SEGURANCA.md` |
| Testes              | `testes/README.md`                           |
| HistÃ³rico           | `CHANGELOG.md`                               |

---

## ðŸ“ž ReferÃªncia RÃ¡pida

### Arquivos Principais

- â­ `index.html` - Sistema principal
- â­ `js/app.js` - LÃ³gica principal
- â­ `README.md` - DocumentaÃ§Ã£o

### ConfiguraÃ§Ã£o

- âš™ï¸ `configuracoes.html` - Interface de config
- âš™ï¸ `js/config.js` - ParÃ¢metros
- âš™ï¸ `js/settings/` - MÃ³dulos de config

### Desenvolvimento

- ðŸ§ª `testes/` - Arquivos de teste
- ðŸ“š `docs/` - DocumentaÃ§Ã£o tÃ©cnica
- ðŸ“ `CHANGELOG.md` - HistÃ³rico

---

**Ãšltima atualizaÃ§Ã£o:** 03/11/2025  
**Projeto:** SINGEM - Sistema de Controle de Material  
**InstituiÃ§Ã£o:** IF Baiano  
**VersÃ£o:** 1.2.1

