# Guia Rápido - Parser de Nota de Empenho

## 🚀 Início Rápido

### Passo 1: Abrir a Aplicação

Abra o arquivo `index.html` no navegador (Chrome, Firefox ou Edge recomendados).

### Passo 2: Acessar Entrada de Empenho

Clique no card "📝 Entrada de Empenho" na tela inicial.

### Passo 3: Fazer Upload do PDF

- Clique na área de upload OU
- Arraste o arquivo PDF da Nota de Empenho

### Passo 4: Aguardar Processamento

O sistema irá:

1. Ler o PDF usando PDF.js
2. Detectar que é uma Nota de Empenho
3. Usar o parser especializado
4. Extrair todos os dados
5. Preencher o formulário automaticamente

### Passo 5: Verificar Dados

Uma mensagem aparecerá mostrando:

- ✅ Dados encontrados
- ❌ Dados não encontrados
- Quantidade de itens extraídos

### Passo 6: Revisar e Corrigir

Revise os dados extraídos e corrija manualmente se necessário.

### Passo 7: Salvar

Clique em "Salvar Empenho" para gravar no banco de dados.

## 🧪 Testando com o PDF Exemplo

### Usando o Arquivo Modelo

1. Use o arquivo: `NE 039 CGSM COMERCIO.pdf`
2. Faça upload conforme passos acima
3. Dados esperados:
   - **Número**: 39
   - **Ano**: 2024
   - **Fornecedor**: CGSM COMERCIO DE ALIMENTOS E SERVICOS LTDA
   - **CNPJ**: 51.561.070/0001-50
   - **Valor Total**: R$ 691.324,56
   - **Itens**: 24

### Teste Automatizado (Desenvolvedor)

1. Abra o console (F12)
2. Execute:

```javascript
testarNeParser();
```

3. Selecione o PDF quando solicitado
4. Veja os resultados da validação

## ✨ Recursos Principais

### 🎯 Extração Automática

- Número da NE
- Ano
- Fornecedor e CNPJ
- Natureza da Despesa
- Processo
- Valor Total
- Lista completa de itens

### 📊 Itens Extraídos

Cada item inclui:

- Sequência (001, 002, etc.)
- Descrição completa e resumida
- Unidade de medida
- Quantidade
- Valor unitário
- Valor total

### 🔄 Cálculos Automáticos

- Valor total por item (qtd × valor unit.)
- Valor total do empenho (soma dos itens)
- Atualização em tempo real ao editar

### 💾 Salvamento

- Banco de dados local (IndexedDB)
- Arquivo PDF no sistema de arquivos (opcional)
- Dados estruturados em JSON

## 📋 Campos do Formulário

### Cabeçalho

- **Número do Empenho**: Auto-preenchido
- **Data**: Auto-preenchida (baseada no ano)
- **Fornecedor**: Auto-preenchido
- **CNPJ**: Auto-preenchido e formatado
- **Valor Total**: Calculado automaticamente

### Itens

Cada linha de item mostra:

- **Código**: Sequência do item (001-024)
- **Descrição**: Descrição completa do item
- **Unidade**: UN, KG, PCT, CX, etc.
- **Quantidade**: Quantidade solicitada
- **Valor Unit.**: Valor unitário
- **Valor Total**: Qtd × Valor Unit. (somente leitura)

## 🔍 Verificando Resultados

### No Console (F12)

```javascript
// Ver último empenho processado
console.log(window.app.currentEmpenho);

// Ver dados do parser NE
console.log(window.app.currentEmpenho.extractedData._neData);

// Ver resultado do último teste
const teste = JSON.parse(localStorage.getItem('ultimoTesteNE'));
console.log(teste);
```

### Na Interface

A mensagem de sucesso mostra um resumo:

```
🎯 Parser Especializado de NE utilizado!

Dados do Cabeçalho:
✓ Ano: 2024
✓ NE Nº: 39
✓ Processo: 3330.250275.2024-31
✓ Natureza: 339030
✓ Fornecedor: CGSM COMERCIO DE ALIMENTOS E SERVICOS LTDA
✓ CNPJ: 51.561.070/0001-50
✓ Valor Total: R$ 691.324,56

✓ 24 itens extraídos

Primeiros itens:
  • 001 - ARROZ
  • 002 - FEIJAO
  • 003 - ACUCAR
  ... e mais 21 itens
```

## ⚠️ Solução de Problemas

### Problema: "Nenhum dado extraído"

**Solução**:

1. Verifique se o PDF é uma Nota de Empenho válida
2. Veja os logs no console (F12)
3. Verifique se há erros de leitura do PDF

### Problema: "Alguns itens não foram extraídos"

**Solução**:

1. Verifique o formato da tabela no PDF
2. Adicione itens manualmente clicando "+ Adicionar Item"
3. Verifique os logs para ver quais itens foram detectados

### Problema: "CNPJ ou Fornecedor não encontrado"

**Solução**:

1. Preencha manualmente
2. Verifique se o PDF tem esses dados visíveis
3. Veja o `rawText` no console para debug

### Problema: "Valores incorretos"

**Solução**:

1. Verifique se valores no PDF estão no formato brasileiro (1.234,56)
2. Corrija manualmente os valores
3. O sistema calculará automaticamente os totais

## 💡 Dicas

### ✅ Melhores Práticas

- Use PDFs gerados digitalmente (não escaneados)
- Verifique sempre os dados extraídos
- Teste com o PDF exemplo primeiro
- Mantenha backup dos PDFs originais

### 🚀 Atalhos

- **F12**: Abrir console para debug
- **Ctrl+Shift+I**: Abrir DevTools
- **Arrastar PDF**: Upload direto

### 🔧 Desenvolvimento

- Console logs mostram todo o processo
- `rawText` disponível para debug
- Resultado salvo em localStorage
- Fallback automático para parser genérico

## 📚 Mais Informações

- **Documentação Completa**: `docs/NE_PARSER.md`
- **Testes**: `js/neParser.test.js`
- **Código Fonte**: `js/neParser.js`

## 🆘 Precisa de Ajuda?

1. Verifique logs no console
2. Execute teste automatizado
3. Consulte documentação completa
4. Veja exemplos de código
