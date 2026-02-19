# Parser de Nota de Empenho (NE) - Documentação

## Visão Geral

O módulo `neParser.js` é um parser especializado para extrair dados estruturados de PDFs de Nota de Empenho no padrão IF Baiano. Ele usa PDF.js para leitura do arquivo e regex robustas para extração de dados.

## Arquivo Modelo

O parser foi desenvolvido e testado com base no arquivo:

- **Arquivo**: `NE 039 CGSM COMERCIO.pdf`
- **Fornecedor**: CGSM COMERCIO DE ALIMENTOS E SERVICOS LTDA
- **Total de Itens**: 24
- **Valor Total**: R$ 691.324,56

## Estrutura de Retorno

```javascript
{
  cabecalho: {
    ano: "2024",                                  // Ano do empenho
    numero: "39",                                 // Número da NE
    naturezaDespesa: "339030",                    // Código da natureza
    processo: "3330.250275.2024-31",              // Número do processo
    valorTotal: 691324.56,                        // Valor total (número)
    cnpj: "51.561.070/0001-50",                   // CNPJ formatado
    cnpj_num: "51561070000150",                   // CNPJ sem formatação
    fornecedor: "CGSM COMERCIO DE ALIMENTOS..."   // Nome do fornecedor
  },
  itens: [
    {
      subElemento: "07 - Gêneros de alimentação", // Sub-elemento da despesa
      seq: "001",                                  // Sequência (001-024)
      descricao: "Arroz beneficiado tipo 1...",    // Descrição completa
      descricao_resumida: "ARROZ",                 // Primeira palavra significativa
      unidade: "kg",                               // Unidade de medida
      quantidade: 27648.00,                        // Quantidade (número)
      valorUnitario: 5.00,                         // Valor unitário
      valorTotal: 138240.00                        // Valor total do item
    },
    // ... mais 23 itens
  ],
  rawText: "texto completo extraído do PDF..."
}
```

## Uso Básico

### 1. Na Interface (Automático)

O parser é chamado automaticamente quando você faz upload de um PDF de Nota de Empenho:

1. Abra a tela "Entrada de Empenho"
2. Clique ou arraste o PDF
3. O sistema detecta que é uma NE e usa o parser especializado
4. Os dados são extraídos e preenchidos automaticamente

### 2. Programático

```javascript
// Obter arquivo do input
const file = document.getElementById('fileInput').files[0];

// Fazer parse
const resultado = await window.neParser.parseEmpenhoPdf(file);

// Acessar dados
console.log('Número da NE:', resultado.cabecalho.numero);
console.log('Total de itens:', resultado.itens.length);
console.log('Valor total:', resultado.cabecalho.valorTotal);
```

## Campos Extraídos

### Cabeçalho

| Campo           | Regex Utilizada                                       | Exemplo             |
| --------------- | ----------------------------------------------------- | ------------------- |
| **Ano**         | `/\bAno\b\s*[:\-]?\s*(\d{4})/i`                       | 2024                |
| **Número**      | `/\bN\.?\s*E\.?\s*[:\-]?\s*(\d{1,6})/i`               | 39                  |
| **Natureza**    | `/\bnatureza\s+da\s+despesa\b\s*[:\-]?\s*(\d{3,6})/i` | 339030              |
| **Processo**    | `/\bprocesso\b\s*[:\-]?\s*([0-9.\-]{10,})/i`          | 3330.250275.2024-31 |
| **Valor Total** | `/\bvalor\s+total\b[^0-9]*?R?\$?\s*([0-9.,]+)/i`      | 691324.56           |
| **CNPJ**        | `/\bCNPJ\b[^0-9]*([0-9.\/-]{14,18})/i`                | 51.561.070/0001-50  |
| **Fornecedor**  | Captura texto após CNPJ                               | CGSM COMERCIO...    |

### Itens

Cada item contém:

- **subElemento**: Código e descrição do sub-elemento de despesa
- **seq**: Número sequencial (001-024)
- **descricao**: Descrição completa do item
- **descricao_resumida**: Primeira palavra significativa (sem acentos)
- **unidade**: Inferida da descrição (kg, un, cx, etc.)
- **quantidade**: Quantidade solicitada
- **valorUnitario**: Valor unitário do item
- **valorTotal**: Quantidade × Valor Unitário

## Normalização de Dados

### Números Brasileiros

A função `toNumberBR()` converte formatos brasileiros para números JavaScript:

```javascript
"1.234,56"  → 1234.56
"691.324,56" → 691324.56
"27.648,00"  → 27648.00
"5,00"       → 5.00
```

### Descrição Resumida

A função `normalizeDescResumida()` cria uma versão curta da descrição:

```javascript
"Arroz beneficiado tipo 1, longo, branco" → "ARROZ"
"Feijão preto tipo 1" → "FEIJAO"
"Óleo de soja refinado" → "OLEO"
```

Regras:

1. Pega texto antes da primeira vírgula, hífen ou parênteses
2. Extrai primeira palavra significativa (> 2 caracteres)
3. Remove acentos
4. Converte para maiúsculas

## Testes

### Executar Teste Automatizado

1. Abra a aplicação no navegador
2. Abra o console (F12)
3. Execute:

```javascript
testarNeParser();
```

4. Selecione o arquivo "NE 039 CGSM COMERCIO.pdf"
5. Aguarde os resultados

### Validações Esperadas

O teste valida automaticamente:

✅ **Cabeçalho**

- Ano = 2024
- Número = 39
- Natureza = 339030
- Processo = 3330.250275.2024-31
- Valor Total = 691324.56
- CNPJ = 51.561.070/0001-50
- CNPJ_NUM = 51561070000150
- Fornecedor contém "CGSM"

✅ **Itens**

- Total de 24 itens
- Item 001: Arroz
- Quantidade = 27648.00
- Valor Unitário = 5.00
- Valor Total = 138240.00

### Ver Resultado do Teste

```javascript
// No console
const resultado = JSON.parse(localStorage.getItem('ultimoTesteNE'));
console.log(resultado);
```

## Integração com IndexedDB

Os dados parseados são salvos automaticamente no banco IndexedDB quando o usuário clica em "Salvar Empenho":

```javascript
// Estrutura salva no DB
{
  id: 1,
  numero: "39",
  dataEmpenho: "2024-01-01",
  fornecedor: "CGSM COMERCIO...",
  cnpjFornecedor: "51.561.070/0001-50",
  valorTotal: 691324.56,
  itens: [...],
  // Dados extras do parser
  _neData: {
    cabecalho: {...},
    itens: [...],
    rawText: "..."
  }
}
```

## Integração com File System API

Se o usuário configurar uma pasta, o PDF original é salvo:

```
📁 Pasta Principal
  └─ 📁 empenhos
      └─ 📄 NE_039_2024_CGSM_20251031.pdf
```

## Tratamento de Erros

### Fallback para Parser Genérico

Se o parser especializado falhar, o sistema automaticamente usa o parser genérico do `pdfReader.js`:

```javascript
try {
  // Tenta parser especializado
  const neData = await window.neParser.parseEmpenhoPdf(file);
  // Sucesso!
} catch (error) {
  // Fallback para parser genérico
  extractedData = window.pdfReader.extrairDadosEmpenho(textContent);
}
```

### Logs Detalhados

O parser gera logs completos no console:

```
Iniciando parse de Nota de Empenho: NE 039 CGSM COMERCIO.pdf
Texto extraído do PDF (primeiros 500 chars): ...
Ano encontrado: 2024
Número da NE encontrado: 39
CNPJ encontrado: 51.561.070/0001-50
Fornecedor encontrado: CGSM COMERCIO...
Sub-elemento detectado: 07 - Gêneros de alimentação
Item 001 extraído: ARROZ
...
24 itens extraídos
```

## Limitações Conhecidas

1. **Formato Específico**: O parser foi otimizado para o formato padrão IF Baiano
2. **PDFs Escaneados**: Não funciona com PDFs de imagem (necessita OCR)
3. **Variações de Layout**: Pode falhar se o layout mudar significativamente
4. **Itens Complexos**: Descrições muito longas podem ser truncadas

## Melhorias Futuras

- [ ] Suporte para múltiplos formatos de NE
- [ ] OCR para PDFs escaneados
- [ ] Detecção automática de colunas em tabelas
- [ ] Validação de soma de valores
- [ ] Extração de mais campos (dotação, programa, etc.)
- [ ] Export para formatos padrão (JSON, CSV, XML)

## Arquivos do Módulo

```
js/
├── neParser.js          # Parser principal (ES6 module)
├── neParserInit.js      # Inicializador (carrega module globalmente)
└── neParser.test.js     # Suite de testes
```

## Dependências

- **PDF.js**: Para leitura de PDFs
- **ES6 Modules**: Suporte nativo do navegador
- **RegExp**: Expressões regulares para extração

## Suporte de Navegadores

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ❌ IE11 (não suporta ES6 modules)

## Contribuindo

Para adicionar suporte a novos formatos de NE:

1. Adicione exemplo em `data/`
2. Crie regexes específicas em `neParser.js`
3. Adicione testes em `neParser.test.js`
4. Documente o formato

## Licença

Mesmo da aplicação principal.

## Contato e Suporte

Para dúvidas ou problemas:

1. Verifique os logs do console
2. Execute o teste automatizado
3. Consulte o `rawText` no resultado
