# Changelog - Sistema de Controle de Material IF Baiano

## [Limpeza e Organização 1.2.1] - 03/11/2025

### 🧹 Reorganização Completa do Projeto

#### Estrutura de Pastas

- ✅ **Criada pasta `testes/`**: Organização de arquivos de teste
  - `testes/html/` - 5 páginas de teste movidas
  - `testes/pdfs/` - PDFs de referência para testes
  - `testes/README.md` - Documentação completa dos testes
- ✅ **Criada pasta `data/exemplos/`**: PDFs de exemplo organizados
  - ~10 arquivos de Nota Fiscal de exemplo
  - `README.md` explicativo
- ✅ **Criada pasta `docs/implementacao/`**: Documentação técnica
  - `IMPLEMENTACAO_NE_PARSER.md`
  - `IMPLEMENTACAO_CONFIGURACOES.md`
  - `RESTRICOES_SEGURANCA.md`
  - `INTEGRACOES_APLICADAS.md`

#### Arquivos Movidos (14 total)

- ✅ `teste*.html` (5 arquivos) → `testes/html/`
- ✅ `NE 039 CGSM COMERCIO.pdf` → `testes/pdfs/`
- ✅ `NF*.pdf` (10 arquivos) → `data/exemplos/`
- ✅ Documentações técnicas (4 arquivos) → `docs/implementacao/`
- ✅ `LEIA-ME_NE_PARSER.md` → `docs/`

#### Arquivos Removidos (1 total)

- ✅ `NF 1263 GDA DISTRIBUIÇÃO - Copia.pdf` - Duplicado deletado

#### Código Otimizado

- ✅ **16 linhas de console.log removidas** em `js/app.js`
  - Removidos logs de debug não essenciais
  - Mantidos logs críticos de inicialização
  - Código mais limpo e profissional

#### Documentação Criada

- ✅ `testes/README.md` - Guia completo de testes
- ✅ `data/exemplos/README.md` - Explicação dos PDFs
- ✅ `LIMPEZA_EXECUTADA.md` - Relatório detalhado
- ✅ `README.md` atualizado com nova estrutura

#### Impacto

- 📊 **Raiz do projeto:** -61% de arquivos (26 → 10)
- 📊 **PDFs na raiz:** -100% (12 → 0)
- 📊 **Código:** -27% console.log (~60 → ~44)
- ✅ **Funcionalidades afetadas:** 0 (ZERO)

### 🔒 Código Preservado

- ✅ Toda lógica do `app.js` intacta
- ✅ Todos os parsers funcionando
- ✅ IndexedDB não afetado
- ✅ Módulo de Configurações preservado
- ✅ Interface HTML/CSS sem alterações
- ✅ Servidor Node.js funcionando

---

## [Atualização 2.0] - 31/10/2025 - 09:50

### 🔥 Correções Críticas no Parser NE

#### Novo Formato de PDF Suportado

- ✅ **NE 048 GGV COMERCIO**: Formato com "Item compra:" agora reconhecido
- ✅ **Múltiplos layouts**: Parser agora detecta automaticamente o formato do PDF

#### Cabeçalho - Extração Aprimorada

- ✅ **Ano**: Detecta padrão "Ano Tipo Número 2024 NE 48" e formatos antigos
- ✅ **Número da NE**: Reconhece "NE 48", "N.E. 48", após "Tipo", etc
- ✅ **Natureza da Despesa**: Busca "339030" em múltiplas posições
- ✅ **Processo**: Formato "23330.250275.2024-31" agora detectado
- ✅ **Valor Total**: Busca valores grandes no formato 238.294,40
- ✅ **Fornecedor**: **CORRIGIDO** - agora busca ANTES do CNPJ (estava buscando depois)
- ✅ **CNPJ**: Padrão 10.724.903/0004-11 com validação

#### Itens - Extração Completamente Reescrita

- ✅ **Padrão "Item compra:"**: Novo regex reconhece formato:
  ```
  001 6.336,00
  Item compra: 00001 - FRUTA, TIPO ABACAXI PÉROLA...
  Data Operação Quantidade Valor Unitário Valor Total
  24/04/2024 Inclusão 2.880,00000 2,2000 6.336,00
  ```
- ✅ **Quantidade**: Extrai de "Quantidade Valor Unitário Valor Total"
- ✅ **Valor Unitário**: Captura valor com 4 decimais (2,2000 → 2.20)
- ✅ **Valor Total por Item**: Validado contra linha "Seq. Valor"
- ✅ **Unidade**: Detecta automaticamente (KG, LT, UN, CX, etc) da descrição
- ✅ **Subelemento**: Captura "07 - GENEROS DE ALIMENTACAO"
- ✅ **Fallback inteligente**: 2 métodos alternativos se padrão falhar

#### Logs e Debug

- ✅ Console detalhado mostra cada etapa
- ✅ Primeiros 500 chars do texto extraído
- ✅ Confirmação de cada campo encontrado
- ✅ Contagem de itens extraídos

### 📊 Resultado Esperado - NE 048

**Antes:**

```json
{
  "cabecalho": {
    "ano": "",
    "numero": "48",
    "valorTotal": 24, // ❌ ERRADO
    "fornecedor": "" // ❌ VAZIO
  },
  "itens": [] // ❌ NENHUM ITEM
}
```

**Agora:**

```json
{
  "cabecalho": {
    "ano": "2024",
    "numero": "48",
    "naturezaDespesa": "339030",
    "processo": "23330.250275.2024-31",
    "valorTotal": 238294.40,
    "cnpj": "10.724.903/0004-11",
    "fornecedor": "GGV COMERCIO DE FRUTAS E VERDURAS LTDA"
  },
  "itens": [20 itens com quantidade, valor unitário e total]
}
```

---

## [Atualização] - 31/10/2025

### Melhorias na Leitura de Empenhos

#### Extração de Dados Aprimorada

- ✅ **Número do Empenho**: Implementados múltiplos padrões de busca para localizar o número mesmo em diferentes formatos de PDF
- ✅ **Data**: Busca melhorada com padrões alternativos
- ✅ **Fornecedor**: Extração aprimorada com busca em múltiplas posições do documento, incluindo proximidade com CNPJ
- ✅ **CNPJ**: Formatação automática para o padrão XX.XXX.XXX/XXXX-XX
- ✅ **Valor Total**: Múltiplos padrões de busca para diferentes formatos de documento

#### Extração de Itens Completamente Reformulada

- ✅ **Identificação de Cabeçalho**: Sistema inteligente que detecta o início da tabela de itens
- ✅ **Processamento de Linhas**: Algoritmo aprimorado que trata:
  - Separação por múltiplos espaços ou tabulações
  - Identificação automática de código, descrição, unidade, quantidade e valores
  - Suporte para descrições longas
  - Detecção automática de unidades de medida (UN, KG, PCT, CX, etc.)
- ✅ **Método Alternativo**: Sistema de fallback quando o padrão principal falha
- ✅ **Extração por Padrões**: Múltiplos padrões regex para diferentes formatos de PDF
- ✅ **Validação**: Verificação de dados mínimos antes de adicionar itens

#### Interface do Usuário

- ✅ **Campo Valor Total por Item**: Adicionado campo somente leitura que mostra o valor total de cada item
- ✅ **Cálculo Automático**:
  - Valor total do item é calculado automaticamente (quantidade × valor unitário)
  - Valor total do empenho é atualizado automaticamente conforme itens são adicionados/modificados
- ✅ **Layout Responsivo**: Campos de itens agora têm tamanhos otimizados:
  - Código: 100px
  - Descrição: flexível (ocupa espaço disponível)
  - Unidade: 60px
  - Quantidade: 80px
  - Valor Unitário: 100px
  - Valor Total: 100px (somente leitura)
- ✅ **Mensagem de Resumo**: Ao processar PDF, exibe resumo completo dos dados extraídos:
  - Lista o que foi encontrado (✓) e o que não foi (✗)
  - Mostra quantidade de itens
  - Indica se o arquivo foi salvo e onde

#### Logging e Debugging

- ✅ **Console Detalhado**: Mensagens de log em cada etapa da extração
- ✅ **Rastreamento de Erros**: Melhor identificação de problemas na extração
- ✅ **Feedback Visual**: Usuário recebe feedback claro sobre o processo

### Arquivos Modificados

1. **js/pdfReader.js**
   - `extrairDadosEmpenho()`: Melhorado com múltiplos padrões regex
   - `extrairItensEmpenho()`: Completamente reescrito
   - `processarLinhaItemEmpenho()`: Nova função para processar cada linha
   - `identificarColunasTabela()`: Nova função para mapear colunas
   - `extrairItemPorPadrao()`: Método alternativo de extração
   - `extrairItensAlternativo()`: Fallback quando método principal falha

2. **js/app.js**
   - `criarItemRow()`: Adicionado campo de valor total e cálculo automático
   - `calcularValorTotalEmpenho()`: Nova função para somar total dos itens
   - `adicionarItensExtraidos()`: Melhorado com logs e preenchimento do valor total
   - `processarEmpenhoUpload()`: Mensagem de resumo detalhada

3. **css/style.css**
   - `.item-row`: Alterado de grid para flex para melhor controle
   - Adicionado estilo para campos readonly
   - Melhor responsividade

### Como Usar

1. Acesse a tela "Entrada de Empenho"
2. Clique ou arraste um PDF de Nota de Empenho
3. O sistema irá:
   - Extrair automaticamente todos os dados
   - Preencher os campos do formulário
   - Listar todos os itens com suas informações completas
   - Calcular valores totais automaticamente
4. Revise os dados extraídos
5. Corrija manualmente se necessário
6. Salve o empenho

### Próximas Melhorias Previstas

- Melhorar extração de Notas Fiscais
- Implementar OCR para PDFs escaneados
- Adicionar suporte para mais formatos de empenho
- Melhorar detecção de tabelas complexas
