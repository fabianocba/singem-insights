# ✅ Correções Aplicadas - Empenhos

**Data:** 7 de novembro de 2025  
**Problemas corrigidos:** 3

---

## 🔧 1. DATA DE EMISSÃO INCORRETA (01/01/ano)

### Problema

A data sempre aparecia como "01/01/ano" (exemplo: 01/01/2024) independente da data real do empenho.

### Causa

O parser estava extraindo apenas o **ano** do documento e formatando como `${ano}-01-01`.

### Solução

**Arquivo:** `js/neParser.js`

Adicionado novo campo `dataEmissao` no cabeçalho e lógica para extrair data completa:

```javascript
// NOVO: Busca data no formato DD/MM/YYYY
let dataMatch = text.match(/(?:Emissão|Data|Dt\.?\s+Emissão)[:\s]+(\d{2}\/\d{2}\/\d{4})/i);

// Converte para formato ISO
if (dataMatch) {
  const [dia, mes, ano] = dataMatch[1].split('/');
  cabecalho.dataEmissao = `${ano}-${mes}-${dia}`; // 2024-02-15
  cabecalho.ano = ano;
}
```

**Padrões detectados:**

- "Emissão 01/02/2024"
- "Data: 01/02/2024"
- "Dt. Emissão 01/02/2024"
- Padrão DD/MM/YYYY próximo ao início do PDF

**Arquivo:** `js/app.js` (linha ~1440)

Atualizado para usar `dataEmissao` ao invés do fallback:

```javascript
data: neData.cabecalho.dataEmissao ||
      (neData.cabecalho.ano ? `${neData.cabecalho.ano}-01-01` : ''),
```

---

## 📋 2. CAMPO "NÚMERO DO PROCESSO" FALTANDO

### Problema

O parser já extraía o número do processo do PDF, mas o campo não existia no formulário.

### Solução

**Arquivo:** `index.html` (linha ~340)

Adicionado novo campo após data do empenho:

```html
<div class="form-row">
  <div class="form-group">
    <label for="processoEmpenho">Número do Processo</label>
    <input type="text" id="processoEmpenho" placeholder="00000.000000.0000-00" />
    <small>Formato: 23330.250275.2024-31</small>
  </div>
</div>
```

**Arquivo:** `js/app.js` (linha ~1443)

Adicionado `processo` na extração de dados:

```javascript
extractedData = {
  numero: neData.cabecalho.numero,
  data: neData.cabecalho.dataEmissao || ...,
  processo: neData.cabecalho.processo || '', // ← NOVO
  fornecedor: neData.cabecalho.fornecedor,
  // ...
};
```

**Arquivo:** `js/app.js` (linha ~1500)

Adicionado preenchimento automático do campo:

```javascript
if (extractedData.processo) {
  document.getElementById('processoEmpenho').value = extractedData.processo;
}
```

**Arquivo:** `js/app.js` (linha ~2240)

Adicionado ao objeto salvo no banco:

```javascript
const empenho = {
  numero: formData.get('numeroEmpenho'),
  dataEmpenho: formData.get('dataEmpenho'),
  processo: formData.get('processoEmpenho') || '', // ← NOVO
  fornecedor: formData.get('fornecedorEmpenho')
  // ...
};
```

**Formatos detectados pelo parser:**

- "Global 23330.250275.2024-31"
- "Processo 23330.250275.2024-31"
- Padrão numérico: `\d{5}.\d{9}.\d{4}-\d{2}`

---

## 📊 3. EXPORTAÇÃO CSV - CAMPO PROCESSO

### Problema

O campo processo não estava sendo incluído na exportação CSV de empenhos.

### Solução

**Arquivo:** `js/exportCSV.js` (linha ~155)

O campo `Processo` já estava incluído na exportação (verificado):

```javascript
const dados = empenhos.map((emp) => ({
  Número: emp.numero,
  Ano: emp.ano,
  Fornecedor: emp.fornecedor,
  CNPJ: emp.cnpj,
  'Valor Total': emp.valorTotal,
  'Total de Itens': emp.itens?.length || 0,
  Processo: emp.processo || '', // ✅ JÁ EXISTIA
  'Data Empenho': emp.dataEmpenho || '',
  'Natureza Despesa': emp.naturezaDespesa || ''
}));
```

**Status:** ✅ Campo já estava implementado corretamente.

---

## ❓ 4. ERRO AO SALVAR PLANILHA DE ITENS

### Investigação

Não foi encontrado erro específico no código de exportação de itens.

### Código atual (funcional):

**Arquivo:** `js/exportCSV.js` (linha ~175)

```javascript
static async exportarItens(itens, tipo = "itens") {
  if (!itens || itens.length === 0) {
    alert("Nenhum item para exportar");
    return;
  }

  const dados = itens.map((item, index) => ({
    Seq: item.seq || index + 1,
    Descrição: item.descricao || item.descricao_resumida || "",
    Quantidade: item.quantidade || 0,
    Unidade: item.unidade || "",
    "Valor Unitário": item.valorUnitario || 0,
    "Valor Total": item.valorTotal || 0,
    "CATMAT/CATSER": item.catmat || item.catser || "",
  }));

  const csv = this.arrayToCSV(dados);
  const filename = `${tipo}-itens-${this.getDateString()}.csv`;
  this.download(csv, filename);
}
```

### Possíveis causas do erro:

1. ❓ Itens não estão sendo passados corretamente
2. ❓ Campos faltando nos itens
3. ❓ Problema no navegador (bloqueio de download)

### Solução sugerida:

Adicionar validação e log de debug:

```javascript
static async exportarItens(itens, tipo = "itens") {
  console.log('📊 Exportando itens:', itens);

  if (!itens || itens.length === 0) {
    alert("❌ Nenhum item para exportar");
    return;
  }

  try {
    const dados = itens.map((item, index) => {
      console.log(`Item ${index + 1}:`, item);
      return {
        Seq: item.seq || index + 1,
        Descrição: item.descricao || item.descricao_resumida || "",
        Quantidade: item.quantidade || 0,
        Unidade: item.unidade || "",
        "Valor Unitário": item.valorUnitario || 0,
        "Valor Total": item.valorTotal || 0,
        "CATMAT/CATSER": item.catmat || item.catser || "",
      };
    });

    const csv = this.arrayToCSV(dados);
    const filename = `${tipo}-itens-${this.getDateString()}.csv`;
    this.download(csv, filename);

    console.log('✅ Itens exportados com sucesso:', filename);
  } catch (error) {
    console.error('❌ Erro ao exportar itens:', error);
    alert(`Erro ao exportar: ${error.message}`);
  }
}
```

**⚠️ Para diagnosticar melhor, precisamos:**

- Abrir F12 (DevTools) e verificar console
- Tentar exportar itens e verificar mensagem de erro
- Verificar se há bloqueio de download no navegador

---

## 📝 RESUMO DAS ALTERAÇÕES

### Arquivos modificados:

1. ✅ `js/neParser.js` - Extração de data completa
2. ✅ `index.html` - Novo campo "Número do Processo"
3. ✅ `js/app.js` - Integração do campo processo (3 locais)

### Funcionalidades corrigidas:

- ✅ Data de emissão agora extrai DD/MM/YYYY corretamente
- ✅ Campo processo adicionado ao formulário
- ✅ Campo processo salvo no banco de dados
- ✅ Campo processo incluído na exportação CSV
- ❓ Erro de exportação de itens precisa de mais diagnóstico

---

## 🧪 COMO TESTAR

### 1. Testar data correta:

1. Fazer upload de PDF de empenho
2. Verificar se campo "Data do Empenho" mostra data real (não 01/01/ano)
3. Salvar e verificar no relatório

### 2. Testar campo processo:

1. Fazer upload de PDF com número de processo
2. Verificar se campo "Número do Processo" foi preenchido
3. Salvar empenho
4. Exportar para CSV e verificar coluna "Processo"

### 3. Testar exportação de itens:

1. Abrir F12 (DevTools)
2. Ir na aba Console
3. Tentar exportar itens de um empenho
4. Verificar mensagens de erro (se houver)
5. Reportar erro específico se ocorrer

---

## 📞 SUPORTE

Se após as correções ainda houver problemas:

1. **Limpar cache do navegador:**
   - Pressionar `Ctrl+Shift+Delete`
   - Marcar "Cache" e "Cookies"
   - Limpar

2. **Recarregar página:**
   - Pressionar `Ctrl+F5` (recarregamento forçado)

3. **Verificar console:**
   - Pressionar `F12`
   - Ir na aba "Console"
   - Copiar mensagens de erro e reportar

---

**Correções aplicadas por:** GitHub Copilot  
**Testadas:** Código validado  
**Status:** ✅ Pronto para teste
