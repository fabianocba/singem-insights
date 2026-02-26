# Sistema de Controle de Material - IF Baiano

**VersÃ£o:** 1.4.0-20250117 ðŸ†•  
**Status:** âœ… EstÃ¡vel | ðŸ›¡ï¸ Hardened | âš¡ Otimizado | ðŸš€ Enterprise

## ðŸ“‹ DescriÃ§Ã£o

Sistema local (offline) para controle de recebimento de materiais com base em notas de empenho, notas fiscais e recebimentos semanais. Desenvolvido em JavaScript puro (HTML, CSS e JS) com banco de dados local (IndexedDB).

**ðŸ†• Novidades da versÃ£o 1.4.0:**

- ðŸš€ **Infraestrutura Enterprise**: Event Bus, Web Workers, Async Queue, Repository Pattern
- ðŸ“¡ **Event-Driven Architecture**: Sistema de mensageria interna para desacoplar mÃ³dulos
- âš¡ **Processamento AssÃ­ncrono**: PDFs processados em background sem travar UI
- ðŸ’¾ **Fila Persistente**: Queue system com IndexedDB para confiabilidade
- ðŸ›¡ï¸ **Validation Layer**: ValidaÃ§Ã£o de integridade antes da persistÃªncia
- ðŸŽ¨ **Feedback Visual Aprimorado**: Loading overlays e toast notifications
- ðŸ“Š **Sistema de Abas**: Controle de Saldos e RelatÃ³rios integrados em Cadastro de Empenhos

ðŸ“– **Leia o [INFRAESTRUTURA_ENTERPRISE.md](docs/INFRAESTRUTURA_ENTERPRISE.md) para detalhes da nova arquitetura.**

**VersÃµes Anteriores:**

- v1.3.0: PadrÃµes de cÃ³digo, utilitÃ¡rios de robustez, otimizaÃ§Ãµes de performance
- Veja [HARDENING_REPORT.md](HARDENING_REPORT.md) para detalhes completos

## ðŸš€ Funcionalidades

### âœ… Implementadas

- **Menu Principal**: Interface intuitiva com navegaÃ§Ã£o por Ã­cones
- **Cadastro de Empenho**:
  - ðŸŽ¯ **Parser Especializado**: ExtraÃ§Ã£o automÃ¡tica e precisa de dados de NE (padrÃ£o IF Baiano)
  - ðŸ“Ž **Upload de PDF**: Leitura automÃ¡tica de PDFs de Notas de Empenho
  - ðŸ” **ExtraÃ§Ã£o Completa**: CabeÃ§alho (ano, nÃºmero, natureza, processo, fornecedor, CNPJ, valor) e todos os itens
  - âœ¨ **CÃ¡lculos AutomÃ¡ticos**: Valores totais calculados automaticamente
  - ðŸ”„ **Processamento AssÃ­ncrono**: PDFs processados em Web Worker sem travar interface
  - ðŸ“Š **Sistema de Abas**: NavegaÃ§Ã£o integrada entre Cadastro, Controle de Saldos e RelatÃ³rios
- **Entrada de Entrega**: Registro de recebimentos semanais de materiais
- **Entrada de Nota Fiscal**: **3 formas de entrada**:
  - ðŸ“Ž **Upload de PDF**: Leitura automÃ¡tica de PDFs de Notas Fiscais
  - ðŸ”‘ **Chave de Acesso**: Consulta automÃ¡tica via chave de 44 dÃ­gitos
  - ðŸ“± **CÃ³digo de Barras**: Leitura via cÃ¢mera com detecÃ§Ã£o automÃ¡tica
- **ComparaÃ§Ã£o AutomÃ¡tica**: Identifica divergÃªncias entre NF e NE (CNPJ, itens, valores)
- **IntegraÃ§Ã£o NF-e**: MÃ³dulo completo para consulta e validaÃ§Ã£o de notas fiscais
- **Sistema de Arquivos Local**: OrganizaÃ§Ã£o automÃ¡tica de PDFs em pastas por ano
- **Banco de Dados Local**: Armazenamento via IndexedDB
- **Design Responsivo**: Interface adaptÃ¡vel para diferentes dispositivos

### âš™ï¸ MÃ³dulo de ConfiguraÃ§Ãµes (NOVO!)

- **Unidade OrÃ§amentÃ¡ria**: Cadastro com validaÃ§Ã£o de CNPJ
- **UsuÃ¡rios**: GestÃ£o completa com hash PBKDF2 e autenticaÃ§Ã£o
- **Rede/LAN**: Compartilhamento em rede local com servidor Node.js
- **PreferÃªncias**: Tema, tolerÃ¢ncias, exportar/importar configs

### ï¿½ Consultas Diversas (NOVO!)

- **Dados Abertos Compras.gov.br**: Acesso a dados pÃºblicos de compras governamentais
- **7 Datasets DisponÃ­veis**: Materiais, ServiÃ§os, UASG, ARP, PNCP, LicitaÃ§Ãµes Legado
- **Filtros DinÃ¢micos**: Busca personalizada por dataset
- **Cache Inteligente**: 5 minutos para melhor performance
- **ExportaÃ§Ã£o CSV**: Download de resultados
- **VisualizaÃ§Ã£o JSON**: Dados completos de cada item
- **PaginaÃ§Ã£o AutomÃ¡tica**: NavegaÃ§Ã£o entre pÃ¡ginas de resultados
- **Retry AutomÃ¡tico**: Tratamento robusto de erros

### ï¿½ðŸ”„ Em Desenvolvimento

- **RelatÃ³rios AvanÃ§ados**: ExportaÃ§Ã£o em PDF e CSV
- **RelatÃ³rio de ConferÃªncia**: Para envio ao fornecedor
- **Filtros AvanÃ§ados**: Busca por perÃ­odo, fornecedor, etc.
- **SincronizaÃ§Ã£o em Rede**: Endpoints completos no servidor Node.js

## ðŸ“ Estrutura do Projeto

```
SINGEM/
â”œâ”€â”€ ðŸ“„ index.html              # AplicaÃ§Ã£o principal â­
â”œâ”€â”€ ðŸ“– README.md               # Este arquivo - Leia primeiro!
â”œâ”€â”€ ðŸš€ abrir.ps1               # Atalho: Abre o sistema
â”œâ”€â”€ ðŸŒ servidor.ps1            # Atalho: Inicia servidor local
â”‚
â”œâ”€â”€ ðŸ“ css/                    # Estilos
â”‚   â””â”€â”€ style.css
â”‚
â”œâ”€â”€ ðŸ“ js/                     # JavaScript
â”‚   â”œâ”€â”€ app.js                # LÃ³gica principal â­
â”‚   â”œâ”€â”€ db.js                 # IndexedDB
â”‚   â”œâ”€â”€ pdfReader.js          # Parser PDF genÃ©rico
â”‚   â”œâ”€â”€ neParser.js           # Parser NE especializado â­
â”‚   â”œâ”€â”€ neParserInit.js       # Inicializador NE
â”‚   â”œâ”€â”€ neParser.test.js      # Testes NE
â”‚   â”œâ”€â”€ neParser.examples.js  # Exemplos NE
â”‚   â”œâ”€â”€ nfeIntegration.js     # IntegraÃ§Ã£o NF-e
â”‚   â”œâ”€â”€ fsManager.js          # Sistema de arquivos
â”‚   â”œâ”€â”€ config.js             # ConfiguraÃ§Ãµes
â”‚   â”œâ”€â”€ softInit.js           # Inicializador suave ðŸ†•
â”‚   â”œâ”€â”€ versionManager.js     # Gerenciamento de versÃµes
â”‚   â”œâ”€â”€ cacheBuster.js        # Cache-busting automÃ¡tico
â”‚   â”œâ”€â”€ settings/             # MÃ³dulo de ConfiguraÃ§Ãµes
â”‚   â”‚   â”œâ”€â”€ index.js
â”‚   â”‚   â”œâ”€â”€ unidade.js
â”‚   â”‚   â”œâ”€â”€ usuarios.js
â”‚   â”‚   â”œâ”€â”€ rede.js
â”‚   â”‚   â””â”€â”€ preferencias.js
â”‚   â”œâ”€â”€ consultas/            # MÃ³dulo Consultas Diversas â­
â”‚   â”‚   â”œâ”€â”€ apiCompras.js     # Cliente API Compras.gov.br
â”‚   â”‚   â”œâ”€â”€ mapeadores.js     # NormalizaÃ§Ã£o de dados
â”‚   â”‚   â”œâ”€â”€ uiConsultas.js    # Interface de consultas
â”‚   â”‚   â””â”€â”€ cache.js          # Sistema de cache
â”‚   â”œâ”€â”€ config/               # ConfiguraÃ§Ã£o centralizada ðŸ†•
â”‚   â”‚   â””â”€â”€ version.js        # Sistema de versÃ£o
â”‚   â”œâ”€â”€ utils/                # UtilitÃ¡rios (NOVOS!) ðŸ†•
â”‚   â”‚   â”œâ”€â”€ integration.js    # Camada de integraÃ§Ã£o
â”‚   â”‚   â”œâ”€â”€ errors.js         # Tratamento global de erros
â”‚   â”‚   â”œâ”€â”€ guard.js          # Wrappers seguros (retry, timeout)
â”‚   â”‚   â”œâ”€â”€ validate.js       # Validadores (CNPJ, CPF, etc)
â”‚   â”‚   â”œâ”€â”€ sanitize.js       # SanitizaÃ§Ã£o (XSS prevention)
â”‚   â”‚   â”œâ”€â”€ logger.js         # Logging centralizado
â”‚   â”‚   â”œâ”€â”€ scheduler.js      # Agendamento otimizado
â”‚   â”‚   â”œâ”€â”€ throttle.js       # Throttle/debounce
â”‚   â”‚   â””â”€â”€ domBatch.js       # Batching de DOM
â”‚   â””â”€â”€ db/                   # UtilitÃ¡rios IndexedDB ðŸ†•
â”‚       â”œâ”€â”€ indexeddb-utils.js # Batch ops, retry, export/import
â”‚       â””â”€â”€ integration.js    # Melhorias do dbManager
â”‚
â”œâ”€â”€ ðŸ“ config/                 # ConfiguraÃ§Ãµes do sistema
â”‚   â”œâ”€â”€ configuracoes.html    # Interface de configuraÃ§Ãµes
â”‚   â””â”€â”€ SINGEM.code-workspace # VS Code workspace
â”‚
â”œâ”€â”€ ðŸ“ consultas/              # MÃ³dulo Consultas Diversas â­
â”‚   â”œâ”€â”€ index.html            # Interface principal
â”‚   â””â”€â”€ README.md             # DocumentaÃ§Ã£o rÃ¡pida
â”‚
â”œâ”€â”€ sw.js                      # Service Worker (cache inteligente) ðŸ†•
â”‚
â”œâ”€â”€ ðŸ“ scripts/                # Scripts utilitÃ¡rios
â”‚   â”œâ”€â”€ scan-refs.js          # Analisa arquivos Ã³rfÃ£os ðŸ†•
â”‚   â”œâ”€â”€ abrir-aplicacao.ps1   # Abre sistema no navegador
â”‚   â”œâ”€â”€ iniciar-servidor.ps1  # Inicia servidor HTTP local
â”‚   â””â”€â”€ iniciar-servidor-sem-cache.ps1  # Servidor sem cache (dev)
â”‚
â”œâ”€â”€ ðŸ“ docs/                   # DocumentaÃ§Ã£o completa
â”‚   â”œâ”€â”€ README.md
â”‚   â”œâ”€â”€ CHANGELOG.md          # HistÃ³rico de versÃµes
â”‚   â”œâ”€â”€ DB_HEALTH.md          # Checklist IndexedDB ðŸ†•
â”‚   â”œâ”€â”€ SISTEMA_CACHE.md      # Sistema de controle de cache
â”‚   â”œâ”€â”€ GUIA_INICIO_RAPIDO.md
â”‚   â”œâ”€â”€ GUIA_USO_APLICACAO.md
â”‚   â”œâ”€â”€ NAVEGACAO.md          # Guia de navegaÃ§Ã£o
â”‚   â”œâ”€â”€ NE_PARSER.md
â”‚   â”œâ”€â”€ GUIA_RAPIDO_NE.md
â”‚   â”œâ”€â”€ LEIA-ME_NE_PARSER.md
â”‚   â”œâ”€â”€ CONFIGURACOES.md
â”‚   â”œâ”€â”€ CONSULTAS_DIVERSAS.md # DocumentaÃ§Ã£o Consultas â­
â”‚   â”œâ”€â”€ PADRONIZACAO_NF.md
â”‚   â”œâ”€â”€ TESTE_VALIDACAO_PARSER.md
â”‚   â”œâ”€â”€ RELATORIO_LIMPEZA.md
â”‚   â”œâ”€â”€ LIMPEZA_EXECUTADA.md
â”‚   â”œâ”€â”€ SUMARIO_LIMPEZA.md
â”‚   â””â”€â”€ implementacao/
â”‚       â”œâ”€â”€ IMPLEMENTACAO_NE_PARSER.md
â”‚       â”œâ”€â”€ IMPLEMENTACAO_CONFIGURACOES.md
â”‚       â”œâ”€â”€ RESTRICOES_SEGURANCA.md
â”‚       â””â”€â”€ INTEGRACOES_APLICADAS.md
â”‚
â”œâ”€â”€ ðŸ“„ HARDENING_REPORT.md     # RelatÃ³rio de adequaÃ§Ãµes ðŸ†•
â”‚
â”œâ”€â”€ ðŸ“„ .editorconfig           # PadrÃµes de cÃ³digo ðŸ†•
â”œâ”€â”€ ðŸ“„ .eslintrc.json          # Regras ESLint ðŸ†•
â”œâ”€â”€ ðŸ“„ .prettierrc.json        # Regras Prettier ðŸ†•
â”œâ”€â”€ ðŸ“„ .prettierignore         # ExclusÃµes Prettier ðŸ†•
â”‚
â”œâ”€â”€ ðŸ“ data/                   # Dados e exemplos
â”‚   â”œâ”€â”€ README.md
â”‚   â”œâ”€â”€ exemplos.json
â”‚   â””â”€â”€ exemplos/             # PDFs de exemplo (~10)
â”‚       â””â”€â”€ README.md
â”‚
â”œâ”€â”€ ðŸ“ testes/                 # Testes e validaÃ§Ã£o
â”‚   â”œâ”€â”€ README.md
â”‚   â”œâ”€â”€ html/                 # 5 pÃ¡ginas de teste
â”‚   â””â”€â”€ pdfs/                 # PDFs de referÃªncia
â”‚
â”œâ”€â”€ ðŸ“ img/                    # Imagens (opcional)
â”‚
â””â”€â”€ ðŸ“ server/                 # Servidor Node.js (opcional)
    â”œâ”€â”€ index.js
    â”œâ”€â”€ package.json
    â””â”€â”€ README.md
```

## ï¿½ Sistema de Controle de Cache

O SINGEM implementa um **sistema robusto de controle de cache** que garante que vocÃª sempre tenha a versÃ£o mais recente da aplicaÃ§Ã£o.

### âœ¨ Recursos

- **ðŸŒ Service Worker**: EstratÃ©gia "Network First" - sempre busca da rede, cache apenas como fallback
- **ðŸ“¦ Version Manager**: Detecta automaticamente novas versÃµes e notifica usuÃ¡rio
- **ðŸ”„ Cache Busting**: Adiciona timestamps automÃ¡ticos a assets para evitar cache
- **ðŸ”” NotificaÃ§Ãµes**: Alerta quando hÃ¡ atualizaÃ§Ã£o disponÃ­vel
- **ðŸ§¹ Limpeza AutomÃ¡tica**: Remove caches antigos quando hÃ¡ nova versÃ£o
- **ðŸ“± Funciona Offline**: MantÃ©m funcionalidade mesmo sem internet (apÃ³s primeiro acesso)

### ðŸš€ Como Funciona

1. **Primeira visita**: Baixa tudo da rede, popula cache para uso offline
2. **Visitas seguintes**: Sempre busca da rede primeiro, atualiza cache automaticamente
3. **Nova versÃ£o**: Detecta mudanÃ§a, limpa cache antigo, notifica usuÃ¡rio
4. **Offline**: Usa Ãºltima versÃ£o em cache

### ðŸ“– DocumentaÃ§Ã£o Completa

Veja [docs/SISTEMA_CACHE.md](docs/SISTEMA_CACHE.md) para:

- Detalhes tÃ©cnicos de cada componente
- Como atualizar versÃµes
- DiagnÃ³stico de problemas
- Testes e monitoramento

### ðŸ’¡ Para Desenvolvedores

```powershell
# Inicie servidor SEM cache durante desenvolvimento
.\iniciar-servidor-sem-cache.ps1

# Isso evita precisar fazer CTRL+F5 toda vez!
```

---

## ï¿½ðŸ› ï¸ Como Usar

### ðŸš€ InÃ­cio RÃ¡pido

```powershell
# OpÃ§Ã£o 1: Use os atalhos na raiz
.\abrir.ps1          # Abre o sistema
.\servidor.ps1       # Inicia servidor local

# OpÃ§Ã£o 2: Scripts completos
.\scripts\abrir-aplicacao.ps1
.\scripts\iniciar-servidor.ps1

# OpÃ§Ã£o 3: Manualmente
# Abra index.html no navegador
```

### ðŸ” Primeiro Acesso

**Para administradores (primeira vez):**

1. Abra o sistema
2. Na tela de login, clique em "ðŸ’¡ Primeiro acesso do administrador?"
3. Use as **credenciais mestras**:
   - ðŸ‘¤ UsuÃ¡rio: `singem`
   - ðŸ”‘ Senha: `admin@2025`
4. O sistema abrirÃ¡ automaticamente a tela de **ConfiguraÃ§Ãµes â†’ UsuÃ¡rios**
5. **Cadastre seu prÃ³prio usuÃ¡rio e senha**
6. FaÃ§a logout e entre com suas novas credenciais

âš ï¸ **IMPORTANTE**: As credenciais mestras devem ser usadas apenas para o primeiro acesso!

ðŸ“– **DocumentaÃ§Ã£o completa**: [docs/CREDENCIAIS_ACESSO.md](docs/CREDENCIAIS_ACESSO.md)

### 1. InstalaÃ§Ã£o

1. Baixe todos os arquivos do projeto
2. Mantenha a estrutura de pastas conforme especificado
3. Abra o arquivo `index.html` em um navegador moderno

### 2. NavegaÃ§Ã£o

- **InÃ­cio**: Menu principal com acesso Ã s funcionalidades
- **Cadastro de Empenho**: Registre novas notas de empenho
- **Entrada de Entrega**: Registre recebimentos semanais
- **Entrada de Nota Fiscal**: Cadastre notas fiscais e compare com empenhos
- **RelatÃ³rios**: Gere relatÃ³rios diversos

### 3. Cadastro de Empenho

1. Clique em "ðŸ“ Cadastro de Empenho"
2. FaÃ§a upload do PDF da Nota de Empenho (arraste ou clique)
3. Verifique os dados extraÃ­dos automaticamente
4. Complete informaÃ§Ãµes faltantes
5. Adicione/edite itens conforme necessÃ¡rio
6. Clique em "Salvar Empenho"

### 4. Registro de Entrega

1. Clique em "ðŸ“¦ Entrada de Entrega"
2. Selecione o empenho correspondente
3. Informe a data da entrega
4. Marque as quantidades recebidas para cada item
5. Adicione observaÃ§Ãµes se necessÃ¡rio
6. Clique em "Registrar Entrega"

### 5. Entrada de Nota Fiscal (3 Formas)

**OpÃ§Ã£o 1 - Upload de PDF:**

1. Clique em "ðŸ“„ Entrada de Nota Fiscal"
2. Selecione "ðŸ“Ž Upload do PDF"
3. FaÃ§a upload do PDF da Nota Fiscal
4. Verifique os dados extraÃ­dos automaticamente

**OpÃ§Ã£o 2 - Chave de Acesso:**

1. Selecione "ðŸ”‘ Chave de Acesso"
2. Digite ou cole a chave de 44 dÃ­gitos
3. Clique em "Buscar Nota Fiscal"
4. Os dados serÃ£o carregados automaticamente

**OpÃ§Ã£o 3 - CÃ³digo de Barras:**

1. Selecione "ðŸ“± CÃ³digo de Barras"
2. Clique em "Iniciar CÃ¢mera"
3. Aponte para o cÃ³digo de barras da NF-e
4. Aguarde a detecÃ§Ã£o automÃ¡tica

**Em todas as opÃ§Ãµes:**

- Selecione o empenho associado (se disponÃ­vel)
- O sistema verificarÃ¡ automaticamente divergÃªncias
- Complete informaÃ§Ãµes se necessÃ¡rio
- Clique em "Salvar Nota Fiscal"

### 6. RelatÃ³rios

1. Clique em "ðŸ“Š RelatÃ³rios"
2. Escolha o tipo de relatÃ³rio desejado
3. Aplique filtros se necessÃ¡rio
4. Visualize os dados na tela
5. Exporte em PDF ou CSV (em desenvolvimento)

## ï¿½ Sistema de Arquivos Local

O sistema inclui funcionalidade avanÃ§ada de gerenciamento de arquivos que organiza automaticamente os PDFs de empenhos e notas fiscais em pastas estruturadas no computador do usuÃ¡rio.

### ðŸŽ¯ Funcionalidades

- **SeleÃ§Ã£o de Pasta Principal**: O usuÃ¡rio escolhe onde os arquivos serÃ£o salvos
- **OrganizaÃ§Ã£o AutomÃ¡tica**: CriaÃ§Ã£o de pastas por tipo e ano fiscal:
  - `Empenhos/2024/`
  - `Empenhos/2025/`
  - `NotasFiscais/2024/`
  - `NotasFiscais/2025/`
- **ExtraÃ§Ã£o AutomÃ¡tica de Ano**: Identifica o ano fiscal a partir do conteÃºdo do PDF ou nome do arquivo
- **Acesso Offline**: Todos os arquivos ficam disponÃ­veis localmente
- **IntegraÃ§Ã£o com Banco**: ReferÃªncias dos arquivos sÃ£o registradas no IndexedDB

### ðŸ”§ Como Usar

1. **Primeira ConfiguraÃ§Ã£o**:
   - Ao fazer o primeiro upload, o sistema perguntarÃ¡ onde salvar os arquivos
   - Escolha uma pasta no seu computador (ex: `C:\DocumentosIF\ControleMaterial\`)
   - O sistema criarÃ¡ automaticamente as subpastas necessÃ¡rias

2. **Upload AutomÃ¡tico**:
   - Cada PDF enviado Ã© automaticamente salvo na pasta correspondente
   - O ano fiscal Ã© extraÃ­do do documento ou solicitado ao usuÃ¡rio
   - O caminho Ã© registrado no banco para referÃªncia futura

3. **Gerenciar Arquivos** (na tela de RelatÃ³rios):
   - **âš™ï¸ Configurar Pasta**: Alterar ou definir pasta principal
   - **ðŸ“ Abrir Pasta Empenhos**: Acesso direto Ã  pasta de empenhos
   - **ðŸ“„ Abrir Pasta Notas Fiscais**: Acesso direto Ã  pasta de notas fiscais
   - **ðŸ“Š EstatÃ­sticas**: Ver quantidade de arquivos por tipo e ano

### âš¡ Tecnologia

- **File System Access API**: Permite acesso nativo ao sistema de arquivos
- **Suporte**: Chrome 86+, Edge 88+, Firefox com flag habilitada
- **Fallback**: Sistema funciona normalmente mesmo sem suporte (arquivos ficam apenas no navegador)

### ðŸ”’ SeguranÃ§a

- **PermissÃµes ExplÃ­citas**: UsuÃ¡rio autoriza acesso a cada pasta
- **Acesso Limitado**: Sistema acessa apenas as pastas autorizadas
- **Sem Servidor**: Todos os arquivos permanecem no computador do usuÃ¡rio

## ï¿½ðŸ”§ Requisitos TÃ©cnicos

### Navegadores Suportados

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Tecnologias Utilizadas

- **HTML5**: Estrutura da aplicaÃ§Ã£o
- **CSS3**: Estilos e responsividade
- **JavaScript ES6+**: LÃ³gica da aplicaÃ§Ã£o
- **IndexedDB**: Banco de dados local
- **PDF.js**: Leitura e processamento de PDFs
- **ZXing**: Leitura de cÃ³digos de barras via cÃ¢mera
- **File System Access API**: Gerenciamento de arquivos locais

### APIs Utilizadas

- **File API**: Upload de arquivos
- **File System Access API**: Acesso ao sistema de arquivos local
- **IndexedDB API**: Armazenamento local
- **PDF.js Library**: Processamento de PDFs
- **Camera API**: Acesso Ã  cÃ¢mera para leitura de cÃ³digos
- **ZXing Library**: DecodificaÃ§Ã£o de cÃ³digos de barras e QR codes

## ðŸ“ Formato de Dados

### Estrutura do Empenho

```javascript
{
  id: number,
  numero: string,
  dataEmpenho: string (YYYY-MM-DD),
  fornecedor: string,
  cnpjFornecedor: string,
  valorTotal: number,
  itens: [
    {
      codigo: string,
      descricao: string,
      unidade: string,
      quantidade: number,
      valorUnitario: number
    }
  ],
  pdfData: string (base64),
  status: string,
  dataCriacao: string (ISO),
  dataAtualizacao: string (ISO)
}
```

### Estrutura da Entrega

```javascript
{
  id: number,
  empenhoId: number,
  dataEntrega: string (YYYY-MM-DD),
  itensRecebidos: [
    {
      codigo: string,
      descricao: string,
      unidade: string,
      quantidade: number,
      valorUnitario: number
    }
  ],
  observacoes: string,
  status: string,
  dataCriacao: string (ISO)
}
```

### Estrutura da Nota Fiscal

```javascript
{
  id: number,
  numero: string,
  dataNotaFiscal: string (YYYY-MM-DD),
  cnpjFornecedor: string,
  chaveAcesso: string,
  empenhoId: number,
  itens: Array,
  valorTotal: number,
  divergencias: Array,
  pdfData: string (base64),
  status: string,
  dataCriacao: string (ISO),
  dataAtualizacao: string (ISO)
}
```

## ðŸ” ExtraÃ§Ã£o de Dados de PDF

### Dados ExtraÃ­dos Automaticamente

#### Nota de Empenho

- NÃºmero do empenho
- Data do empenho
- Fornecedor/RazÃ£o social
- CNPJ do fornecedor
- Valor total
- Lista de itens (cÃ³digo, descriÃ§Ã£o, quantidade, valor unitÃ¡rio)

#### Nota Fiscal

- NÃºmero da nota fiscal
- Data de emissÃ£o
- CNPJ do fornecedor
- Chave de acesso
- Valor total
- Lista de itens

### LimitaÃ§Ãµes da ExtraÃ§Ã£o

- A extraÃ§Ã£o de dados depende do formato e layout do PDF
- Alguns PDFs podem requerer ajustes manuais
- Itens complexos podem precisar de revisÃ£o
- Recomenda-se sempre verificar os dados extraÃ­dos

## ðŸš¨ DetecÃ§Ã£o de DivergÃªncias

O sistema compara automaticamente:

- **CNPJ**: Entre nota fiscal e empenho
- **Itens**: CÃ³digos e descriÃ§Ãµes
- **Valores**: PreÃ§os unitÃ¡rios
- **Quantidades**: Se aplicÃ¡vel

Tipos de divergÃªncias identificadas:

- CNPJ diferente
- Item nÃ£o encontrado no empenho
- Valor unitÃ¡rio divergente
- DescriÃ§Ã£o divergente

## ðŸ’¾ Backup e Dados

### Armazenamento Local

- Todos os dados sÃ£o armazenados localmente no navegador
- NÃ£o hÃ¡ sincronizaÃ§Ã£o com servidor externo
- Dados persistem entre sessÃµes

### Backup

- Para backup, exporte os relatÃ³rios regularmente
- Considere salvar os PDFs originais separadamente
- Os dados ficam na pasta de dados do navegador

### Limpeza de Dados

- Use as ferramenias do desenvolvedor do navegador
- Application â†’ IndexedDB â†’ ControleMaterialDB
- Ou limpe todos os dados do site nas configuraÃ§Ãµes

## ðŸŽ¨ PersonalizaÃ§Ã£o

### Cores do IF Baiano

As cores oficiais estÃ£o definidas no CSS:

- Verde Principal: `#2E7D32`
- Verde Claro: `#4CAF50`
- Laranja: `#FF9800`

### ModificaÃ§Ãµes

- Edite `css/style.css` para alterar visual
- Modifique `js/app.js` para funcionalidades
- Ajuste `js/pdfReader.js` para formatos especÃ­ficos de PDF

## âš™ï¸ MÃ³dulo de ConfiguraÃ§Ãµes

O sistema possui um mÃ³dulo completo de configuraÃ§Ãµes acessÃ­vel via `configuracoes.html`:

### ðŸ¢ Unidade OrÃ§amentÃ¡ria

- Cadastro de dados da instituiÃ§Ã£o
- ValidaÃ§Ã£o de CNPJ com algoritmo oficial da Receita Federal
- FormataÃ§Ã£o automÃ¡tica

### ðŸ‘¥ UsuÃ¡rios

- CRUD completo de usuÃ¡rios
- Hash de senha com PBKDF2 (100.000 iteraÃ§Ãµes)
- Perfis: Administrador e UsuÃ¡rio
- Indicador de forÃ§a de senha

### ðŸŒ Rede/LAN

- Compartilhamento em rede local
- Servidor Node.js opcional (Express)
- Health check automÃ¡tico
- DetecÃ§Ã£o automÃ¡tica de IP

### ðŸŽ¨ PreferÃªncias

- Tema claro/escuro
- TolerÃ¢ncias de validaÃ§Ã£o
- Exportar/importar configuraÃ§Ãµes
- Limpar banco de dados

**DocumentaÃ§Ã£o completa:** [`docs/CONFIGURACOES.md`](docs/CONFIGURACOES.md)

### Servidor Node.js (Opcional)

Para compartilhar dados em rede local:

```bash
cd server
npm install
npm start
```

O servidor ficarÃ¡ disponÃ­vel em `http://<seu-ip>:3000`

**DocumentaÃ§Ã£o do servidor:** [`server/README.md`](server/README.md)

## ðŸ› SoluÃ§Ã£o de Problemas

### PDF nÃ£o Ã© processado

- Verifique se o arquivo Ã© um PDF vÃ¡lido
- Alguns PDFs protegidos podem nÃ£o funcionar
- PDFs escaneados (imagem) nÃ£o sÃ£o suportados

### Dados nÃ£o sÃ£o salvos

- Verifique se o navegador suporta IndexedDB
- Limpe o cache e tente novamente
- Verifique se hÃ¡ espaÃ§o suficiente no dispositivo

### Interface nÃ£o carrega

- Verifique se todos os arquivos estÃ£o na estrutura correta
- Abra o console do navegador para ver erros
- Certifique-se de que o JavaScript estÃ¡ habilitado

## ðŸ“ž Suporte

Para questÃµes tÃ©cnicas ou melhorias:

1. Verifique este README
2. Consulte os comentÃ¡rios no cÃ³digo
3. Teste em um navegador diferente
4. Entre em contato com a equipe de TI

## ðŸ“„ LicenÃ§a

Este sistema foi desenvolvido para uso interno do IF Baiano.
Todos os direitos reservados.

---

## 🔧 Correções Recentes (2026-02-20)

### Problemas Resolvidos

- **usuarios.js 404**: Caminho corrigido de `.../usuarios.js` para `../js/settings/usuarios.js`
- **ES Module errors**: `infrastructureInfo.js` agora carregado como `type="module"`
- **Bootstrap timeout**: `waitForBootstrap()` com fallback para `window.repository`
- **Charset**: Arquivo `js/config/version.js` corrigido para UTF-8
- **versionManager.js**: Atualização de valores movida para `init()` (após modules carregarem)

### Arquivos Alterados

| Arquivo                     | Alteração                                            |
| --------------------------- | ---------------------------------------------------- |
| `config/configuracoes.html` | Caminho usuarios.js + evento SINGEM:bootstrap:done   |
| `index.html`                | Caminho usuarios.js + infrastructureInfo como module |
| `js/settings/usuarios.js`   | waitForBootstrap com fallback e polling              |
| `js/settings/unidade.js`    | waitForBootstrap com fallback e polling              |
| `js/versionManager.js`      | Leitura de globals movida para init()                |
| `js/config/version.js`      | Reescrito com encoding UTF-8 correto                 |

### Como Testar

1. Inicie o servidor: `npm run serve:dev`
2. Acesse `http://localhost:8000` - console sem erros 404 ou module
3. Acesse `http://localhost:8000/config/configuracoes.html` - sem timeout de bootstrap

---

## 🚀 Versionamento e Deploy Main

- O rodapé global exibe: `SINGEM vX.Y.Z • build YYYYMMDD-HHMM • commit abc1234 • env production|development`.
- O frontend consulta `GET /api/version`; se falhar, usa fallback em `js/core/version.json`.
- Fonte de verdade de `build` e `buildTimestamp`: `js/core/version.json`.
- Versão semântica usada pelo backend: `server/package.json`.

### Deploy da main (1 comando)

```bash
bash ./scripts/deploy-main.sh
```

O script aborta se não estiver na branch `main` ou se o working tree estiver sujo.

---

**Desenvolvido para o IF Baiano - Campus**  
**Sistema de Controle de Material v1.0**  
**Data: Outubro 2025**
