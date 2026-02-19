# Sistema de Controle de Material - IF Baiano

**Versão:** 1.4.0-20250117 🆕  
**Status:** ✅ Estável | 🛡️ Hardened | ⚡ Otimizado | 🚀 Enterprise

## 📋 Descrição

Sistema local (offline) para controle de recebimento de materiais com base em notas de empenho, notas fiscais e recebimentos semanais. Desenvolvido em JavaScript puro (HTML, CSS e JS) com banco de dados local (IndexedDB).

**🆕 Novidades da versão 1.4.0:**

- 🚀 **Infraestrutura Enterprise**: Event Bus, Web Workers, Async Queue, Repository Pattern
- 📡 **Event-Driven Architecture**: Sistema de mensageria interna para desacoplar módulos
- ⚡ **Processamento Assíncrono**: PDFs processados em background sem travar UI
- 💾 **Fila Persistente**: Queue system com IndexedDB para confiabilidade
- 🛡️ **Validation Layer**: Validação de integridade antes da persistência
- 🎨 **Feedback Visual Aprimorado**: Loading overlays e toast notifications
- 📊 **Sistema de Abas**: Controle de Saldos e Relatórios integrados em Cadastro de Empenhos

📖 **Leia o [INFRAESTRUTURA_ENTERPRISE.md](docs/INFRAESTRUTURA_ENTERPRISE.md) para detalhes da nova arquitetura.**

**Versões Anteriores:**

- v1.3.0: Padrões de código, utilitários de robustez, otimizações de performance
- Veja [HARDENING_REPORT.md](HARDENING_REPORT.md) para detalhes completos

## 🚀 Funcionalidades

### ✅ Implementadas

- **Menu Principal**: Interface intuitiva com navegação por ícones
- **Cadastro de Empenho**:
  - 🎯 **Parser Especializado**: Extração automática e precisa de dados de NE (padrão IF Baiano)
  - 📎 **Upload de PDF**: Leitura automática de PDFs de Notas de Empenho
  - 🔍 **Extração Completa**: Cabeçalho (ano, número, natureza, processo, fornecedor, CNPJ, valor) e todos os itens
  - ✨ **Cálculos Automáticos**: Valores totais calculados automaticamente
  - 🔄 **Processamento Assíncrono**: PDFs processados em Web Worker sem travar interface
  - 📊 **Sistema de Abas**: Navegação integrada entre Cadastro, Controle de Saldos e Relatórios
- **Entrada de Entrega**: Registro de recebimentos semanais de materiais
- **Entrada de Nota Fiscal**: **3 formas de entrada**:
  - 📎 **Upload de PDF**: Leitura automática de PDFs de Notas Fiscais
  - 🔑 **Chave de Acesso**: Consulta automática via chave de 44 dígitos
  - 📱 **Código de Barras**: Leitura via câmera com detecção automática
- **Comparação Automática**: Identifica divergências entre NF e NE (CNPJ, itens, valores)
- **Integração NF-e**: Módulo completo para consulta e validação de notas fiscais
- **Sistema de Arquivos Local**: Organização automática de PDFs em pastas por ano
- **Banco de Dados Local**: Armazenamento via IndexedDB
- **Design Responsivo**: Interface adaptável para diferentes dispositivos

### ⚙️ Módulo de Configurações (NOVO!)

- **Unidade Orçamentária**: Cadastro com validação de CNPJ
- **Usuários**: Gestão completa com hash PBKDF2 e autenticação
- **Rede/LAN**: Compartilhamento em rede local com servidor Node.js
- **Preferências**: Tema, tolerâncias, exportar/importar configs

### � Consultas Diversas (NOVO!)

- **Dados Abertos Compras.gov.br**: Acesso a dados públicos de compras governamentais
- **7 Datasets Disponíveis**: Materiais, Serviços, UASG, ARP, PNCP, Licitações Legado
- **Filtros Dinâmicos**: Busca personalizada por dataset
- **Cache Inteligente**: 5 minutos para melhor performance
- **Exportação CSV**: Download de resultados
- **Visualização JSON**: Dados completos de cada item
- **Paginação Automática**: Navegação entre páginas de resultados
- **Retry Automático**: Tratamento robusto de erros

### �🔄 Em Desenvolvimento

- **Relatórios Avançados**: Exportação em PDF e CSV
- **Relatório de Conferência**: Para envio ao fornecedor
- **Filtros Avançados**: Busca por período, fornecedor, etc.
- **Sincronização em Rede**: Endpoints completos no servidor Node.js

## 📁 Estrutura do Projeto

```
IFDESK/
├── 📄 index.html              # Aplicação principal ⭐
├── 📖 README.md               # Este arquivo - Leia primeiro!
├── 🚀 abrir.ps1               # Atalho: Abre o sistema
├── 🌐 servidor.ps1            # Atalho: Inicia servidor local
│
├── 📁 css/                    # Estilos
│   └── style.css
│
├── 📁 js/                     # JavaScript
│   ├── app.js                # Lógica principal ⭐
│   ├── db.js                 # IndexedDB
│   ├── pdfReader.js          # Parser PDF genérico
│   ├── neParser.js           # Parser NE especializado ⭐
│   ├── neParserInit.js       # Inicializador NE
│   ├── neParser.test.js      # Testes NE
│   ├── neParser.examples.js  # Exemplos NE
│   ├── nfeIntegration.js     # Integração NF-e
│   ├── fsManager.js          # Sistema de arquivos
│   ├── config.js             # Configurações
│   ├── softInit.js           # Inicializador suave 🆕
│   ├── versionManager.js     # Gerenciamento de versões
│   ├── cacheBuster.js        # Cache-busting automático
│   ├── settings/             # Módulo de Configurações
│   │   ├── index.js
│   │   ├── unidade.js
│   │   ├── usuarios.js
│   │   ├── rede.js
│   │   └── preferencias.js
│   ├── consultas/            # Módulo Consultas Diversas ⭐
│   │   ├── apiCompras.js     # Cliente API Compras.gov.br
│   │   ├── mapeadores.js     # Normalização de dados
│   │   ├── uiConsultas.js    # Interface de consultas
│   │   └── cache.js          # Sistema de cache
│   ├── config/               # Configuração centralizada 🆕
│   │   └── version.js        # Sistema de versão
│   ├── utils/                # Utilitários (NOVOS!) 🆕
│   │   ├── integration.js    # Camada de integração
│   │   ├── errors.js         # Tratamento global de erros
│   │   ├── guard.js          # Wrappers seguros (retry, timeout)
│   │   ├── validate.js       # Validadores (CNPJ, CPF, etc)
│   │   ├── sanitize.js       # Sanitização (XSS prevention)
│   │   ├── logger.js         # Logging centralizado
│   │   ├── scheduler.js      # Agendamento otimizado
│   │   ├── throttle.js       # Throttle/debounce
│   │   └── domBatch.js       # Batching de DOM
│   └── db/                   # Utilitários IndexedDB 🆕
│       ├── indexeddb-utils.js # Batch ops, retry, export/import
│       └── integration.js    # Melhorias do dbManager
│
├── 📁 config/                 # Configurações do sistema
│   ├── configuracoes.html    # Interface de configurações
│   └── IFDESK.code-workspace # VS Code workspace
│
├── 📁 consultas/              # Módulo Consultas Diversas ⭐
│   ├── index.html            # Interface principal
│   └── README.md             # Documentação rápida
│
├── sw.js                      # Service Worker (cache inteligente) 🆕
│
├── 📁 scripts/                # Scripts utilitários
│   ├── scan-refs.js          # Analisa arquivos órfãos 🆕
│   ├── abrir-aplicacao.ps1   # Abre sistema no navegador
│   ├── iniciar-servidor.ps1  # Inicia servidor HTTP local
│   └── iniciar-servidor-sem-cache.ps1  # Servidor sem cache (dev)
│
├── 📁 docs/                   # Documentação completa
│   ├── README.md
│   ├── CHANGELOG.md          # Histórico de versões
│   ├── DB_HEALTH.md          # Checklist IndexedDB 🆕
│   ├── SISTEMA_CACHE.md      # Sistema de controle de cache
│   ├── GUIA_INICIO_RAPIDO.md
│   ├── GUIA_USO_APLICACAO.md
│   ├── NAVEGACAO.md          # Guia de navegação
│   ├── NE_PARSER.md
│   ├── GUIA_RAPIDO_NE.md
│   ├── LEIA-ME_NE_PARSER.md
│   ├── CONFIGURACOES.md
│   ├── CONSULTAS_DIVERSAS.md # Documentação Consultas ⭐
│   ├── PADRONIZACAO_NF.md
│   ├── TESTE_VALIDACAO_PARSER.md
│   ├── RELATORIO_LIMPEZA.md
│   ├── LIMPEZA_EXECUTADA.md
│   ├── SUMARIO_LIMPEZA.md
│   └── implementacao/
│       ├── IMPLEMENTACAO_NE_PARSER.md
│       ├── IMPLEMENTACAO_CONFIGURACOES.md
│       ├── RESTRICOES_SEGURANCA.md
│       └── INTEGRACOES_APLICADAS.md
│
├── 📄 HARDENING_REPORT.md     # Relatório de adequações 🆕
│
├── 📄 .editorconfig           # Padrões de código 🆕
├── 📄 .eslintrc.json          # Regras ESLint 🆕
├── 📄 .prettierrc.json        # Regras Prettier 🆕
├── 📄 .prettierignore         # Exclusões Prettier 🆕
│
├── 📁 data/                   # Dados e exemplos
│   ├── README.md
│   ├── exemplos.json
│   └── exemplos/             # PDFs de exemplo (~10)
│       └── README.md
│
├── 📁 testes/                 # Testes e validação
│   ├── README.md
│   ├── html/                 # 5 páginas de teste
│   └── pdfs/                 # PDFs de referência
│
├── 📁 img/                    # Imagens (opcional)
│
└── 📁 server/                 # Servidor Node.js (opcional)
    ├── index.js
    ├── package.json
    └── README.md
```

## � Sistema de Controle de Cache

O IFDESK implementa um **sistema robusto de controle de cache** que garante que você sempre tenha a versão mais recente da aplicação.

### ✨ Recursos

- **🌐 Service Worker**: Estratégia "Network First" - sempre busca da rede, cache apenas como fallback
- **📦 Version Manager**: Detecta automaticamente novas versões e notifica usuário
- **🔄 Cache Busting**: Adiciona timestamps automáticos a assets para evitar cache
- **🔔 Notificações**: Alerta quando há atualização disponível
- **🧹 Limpeza Automática**: Remove caches antigos quando há nova versão
- **📱 Funciona Offline**: Mantém funcionalidade mesmo sem internet (após primeiro acesso)

### 🚀 Como Funciona

1. **Primeira visita**: Baixa tudo da rede, popula cache para uso offline
2. **Visitas seguintes**: Sempre busca da rede primeiro, atualiza cache automaticamente
3. **Nova versão**: Detecta mudança, limpa cache antigo, notifica usuário
4. **Offline**: Usa última versão em cache

### 📖 Documentação Completa

Veja [docs/SISTEMA_CACHE.md](docs/SISTEMA_CACHE.md) para:

- Detalhes técnicos de cada componente
- Como atualizar versões
- Diagnóstico de problemas
- Testes e monitoramento

### 💡 Para Desenvolvedores

```powershell
# Inicie servidor SEM cache durante desenvolvimento
.\iniciar-servidor-sem-cache.ps1

# Isso evita precisar fazer CTRL+F5 toda vez!
```

---

## �🛠️ Como Usar

### 🚀 Início Rápido

```powershell
# Opção 1: Use os atalhos na raiz
.\abrir.ps1          # Abre o sistema
.\servidor.ps1       # Inicia servidor local

# Opção 2: Scripts completos
.\scripts\abrir-aplicacao.ps1
.\scripts\iniciar-servidor.ps1

# Opção 3: Manualmente
# Abra index.html no navegador
```

### 🔐 Primeiro Acesso

**Para administradores (primeira vez):**

1. Abra o sistema
2. Na tela de login, clique em "💡 Primeiro acesso do administrador?"
3. Use as **credenciais mestras**:
   - 👤 Usuário: `ifdesk`
   - 🔑 Senha: `admin@2025`
4. O sistema abrirá automaticamente a tela de **Configurações → Usuários**
5. **Cadastre seu próprio usuário e senha**
6. Faça logout e entre com suas novas credenciais

⚠️ **IMPORTANTE**: As credenciais mestras devem ser usadas apenas para o primeiro acesso!

📖 **Documentação completa**: [docs/CREDENCIAIS_ACESSO.md](docs/CREDENCIAIS_ACESSO.md)

### 1. Instalação

1. Baixe todos os arquivos do projeto
2. Mantenha a estrutura de pastas conforme especificado
3. Abra o arquivo `index.html` em um navegador moderno

### 2. Navegação

- **Início**: Menu principal com acesso às funcionalidades
- **Cadastro de Empenho**: Registre novas notas de empenho
- **Entrada de Entrega**: Registre recebimentos semanais
- **Entrada de Nota Fiscal**: Cadastre notas fiscais e compare com empenhos
- **Relatórios**: Gere relatórios diversos

### 3. Cadastro de Empenho

1. Clique em "📝 Cadastro de Empenho"
2. Faça upload do PDF da Nota de Empenho (arraste ou clique)
3. Verifique os dados extraídos automaticamente
4. Complete informações faltantes
5. Adicione/edite itens conforme necessário
6. Clique em "Salvar Empenho"

### 4. Registro de Entrega

1. Clique em "📦 Entrada de Entrega"
2. Selecione o empenho correspondente
3. Informe a data da entrega
4. Marque as quantidades recebidas para cada item
5. Adicione observações se necessário
6. Clique em "Registrar Entrega"

### 5. Entrada de Nota Fiscal (3 Formas)

**Opção 1 - Upload de PDF:**

1. Clique em "📄 Entrada de Nota Fiscal"
2. Selecione "📎 Upload do PDF"
3. Faça upload do PDF da Nota Fiscal
4. Verifique os dados extraídos automaticamente

**Opção 2 - Chave de Acesso:**

1. Selecione "🔑 Chave de Acesso"
2. Digite ou cole a chave de 44 dígitos
3. Clique em "Buscar Nota Fiscal"
4. Os dados serão carregados automaticamente

**Opção 3 - Código de Barras:**

1. Selecione "📱 Código de Barras"
2. Clique em "Iniciar Câmera"
3. Aponte para o código de barras da NF-e
4. Aguarde a detecção automática

**Em todas as opções:**

- Selecione o empenho associado (se disponível)
- O sistema verificará automaticamente divergências
- Complete informações se necessário
- Clique em "Salvar Nota Fiscal"

### 6. Relatórios

1. Clique em "📊 Relatórios"
2. Escolha o tipo de relatório desejado
3. Aplique filtros se necessário
4. Visualize os dados na tela
5. Exporte em PDF ou CSV (em desenvolvimento)

## � Sistema de Arquivos Local

O sistema inclui funcionalidade avançada de gerenciamento de arquivos que organiza automaticamente os PDFs de empenhos e notas fiscais em pastas estruturadas no computador do usuário.

### 🎯 Funcionalidades

- **Seleção de Pasta Principal**: O usuário escolhe onde os arquivos serão salvos
- **Organização Automática**: Criação de pastas por tipo e ano fiscal:
  - `Empenhos/2024/`
  - `Empenhos/2025/`
  - `NotasFiscais/2024/`
  - `NotasFiscais/2025/`
- **Extração Automática de Ano**: Identifica o ano fiscal a partir do conteúdo do PDF ou nome do arquivo
- **Acesso Offline**: Todos os arquivos ficam disponíveis localmente
- **Integração com Banco**: Referências dos arquivos são registradas no IndexedDB

### 🔧 Como Usar

1. **Primeira Configuração**:
   - Ao fazer o primeiro upload, o sistema perguntará onde salvar os arquivos
   - Escolha uma pasta no seu computador (ex: `C:\DocumentosIF\ControleMaterial\`)
   - O sistema criará automaticamente as subpastas necessárias

2. **Upload Automático**:
   - Cada PDF enviado é automaticamente salvo na pasta correspondente
   - O ano fiscal é extraído do documento ou solicitado ao usuário
   - O caminho é registrado no banco para referência futura

3. **Gerenciar Arquivos** (na tela de Relatórios):
   - **⚙️ Configurar Pasta**: Alterar ou definir pasta principal
   - **📝 Abrir Pasta Empenhos**: Acesso direto à pasta de empenhos
   - **📄 Abrir Pasta Notas Fiscais**: Acesso direto à pasta de notas fiscais
   - **📊 Estatísticas**: Ver quantidade de arquivos por tipo e ano

### ⚡ Tecnologia

- **File System Access API**: Permite acesso nativo ao sistema de arquivos
- **Suporte**: Chrome 86+, Edge 88+, Firefox com flag habilitada
- **Fallback**: Sistema funciona normalmente mesmo sem suporte (arquivos ficam apenas no navegador)

### 🔒 Segurança

- **Permissões Explícitas**: Usuário autoriza acesso a cada pasta
- **Acesso Limitado**: Sistema acessa apenas as pastas autorizadas
- **Sem Servidor**: Todos os arquivos permanecem no computador do usuário

## �🔧 Requisitos Técnicos

### Navegadores Suportados

- Chrome/Chromium 80+
- Firefox 75+
- Safari 13+
- Edge 80+

### Tecnologias Utilizadas

- **HTML5**: Estrutura da aplicação
- **CSS3**: Estilos e responsividade
- **JavaScript ES6+**: Lógica da aplicação
- **IndexedDB**: Banco de dados local
- **PDF.js**: Leitura e processamento de PDFs
- **ZXing**: Leitura de códigos de barras via câmera
- **File System Access API**: Gerenciamento de arquivos locais

### APIs Utilizadas

- **File API**: Upload de arquivos
- **File System Access API**: Acesso ao sistema de arquivos local
- **IndexedDB API**: Armazenamento local
- **PDF.js Library**: Processamento de PDFs
- **Camera API**: Acesso à câmera para leitura de códigos
- **ZXing Library**: Decodificação de códigos de barras e QR codes

## 📝 Formato de Dados

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

## 🔍 Extração de Dados de PDF

### Dados Extraídos Automaticamente

#### Nota de Empenho

- Número do empenho
- Data do empenho
- Fornecedor/Razão social
- CNPJ do fornecedor
- Valor total
- Lista de itens (código, descrição, quantidade, valor unitário)

#### Nota Fiscal

- Número da nota fiscal
- Data de emissão
- CNPJ do fornecedor
- Chave de acesso
- Valor total
- Lista de itens

### Limitações da Extração

- A extração de dados depende do formato e layout do PDF
- Alguns PDFs podem requerer ajustes manuais
- Itens complexos podem precisar de revisão
- Recomenda-se sempre verificar os dados extraídos

## 🚨 Detecção de Divergências

O sistema compara automaticamente:

- **CNPJ**: Entre nota fiscal e empenho
- **Itens**: Códigos e descrições
- **Valores**: Preços unitários
- **Quantidades**: Se aplicável

Tipos de divergências identificadas:

- CNPJ diferente
- Item não encontrado no empenho
- Valor unitário divergente
- Descrição divergente

## 💾 Backup e Dados

### Armazenamento Local

- Todos os dados são armazenados localmente no navegador
- Não há sincronização com servidor externo
- Dados persistem entre sessões

### Backup

- Para backup, exporte os relatórios regularmente
- Considere salvar os PDFs originais separadamente
- Os dados ficam na pasta de dados do navegador

### Limpeza de Dados

- Use as ferramenias do desenvolvedor do navegador
- Application → IndexedDB → ControleMaterialDB
- Ou limpe todos os dados do site nas configurações

## 🎨 Personalização

### Cores do IF Baiano

As cores oficiais estão definidas no CSS:

- Verde Principal: `#2E7D32`
- Verde Claro: `#4CAF50`
- Laranja: `#FF9800`

### Modificações

- Edite `css/style.css` para alterar visual
- Modifique `js/app.js` para funcionalidades
- Ajuste `js/pdfReader.js` para formatos específicos de PDF

## ⚙️ Módulo de Configurações

O sistema possui um módulo completo de configurações acessível via `configuracoes.html`:

### 🏢 Unidade Orçamentária

- Cadastro de dados da instituição
- Validação de CNPJ com algoritmo oficial da Receita Federal
- Formatação automática

### 👥 Usuários

- CRUD completo de usuários
- Hash de senha com PBKDF2 (100.000 iterações)
- Perfis: Administrador e Usuário
- Indicador de força de senha

### 🌐 Rede/LAN

- Compartilhamento em rede local
- Servidor Node.js opcional (Express)
- Health check automático
- Detecção automática de IP

### 🎨 Preferências

- Tema claro/escuro
- Tolerâncias de validação
- Exportar/importar configurações
- Limpar banco de dados

**Documentação completa:** [`docs/CONFIGURACOES.md`](docs/CONFIGURACOES.md)

### Servidor Node.js (Opcional)

Para compartilhar dados em rede local:

```bash
cd server
npm install
npm start
```

O servidor ficará disponível em `http://<seu-ip>:3000`

**Documentação do servidor:** [`server/README.md`](server/README.md)

## 🐛 Solução de Problemas

### PDF não é processado

- Verifique se o arquivo é um PDF válido
- Alguns PDFs protegidos podem não funcionar
- PDFs escaneados (imagem) não são suportados

### Dados não são salvos

- Verifique se o navegador suporta IndexedDB
- Limpe o cache e tente novamente
- Verifique se há espaço suficiente no dispositivo

### Interface não carrega

- Verifique se todos os arquivos estão na estrutura correta
- Abra o console do navegador para ver erros
- Certifique-se de que o JavaScript está habilitado

## 📞 Suporte

Para questões técnicas ou melhorias:

1. Verifique este README
2. Consulte os comentários no código
3. Teste em um navegador diferente
4. Entre em contato com a equipe de TI

## 📄 Licença

Este sistema foi desenvolvido para uso interno do IF Baiano.
Todos os direitos reservados.

---

**Desenvolvido para o IF Baiano - Campus**  
**Sistema de Controle de Material v1.0**  
**Data: Outubro 2025**
