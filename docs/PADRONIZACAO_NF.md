# Padronização da Extração de Notas Fiscais

## 📋 Resumo das Alterações

Este documento descreve as mudanças implementadas para **padronizar a extração de dados de Notas Fiscais** nos dois fluxos: **Upload de PDF** e **Consulta por Chave de Acesso**.

---

## 🎯 Objetivo

Garantir que ambos os métodos de obtenção de dados (PDF e API) extraiam e preencham **os mesmos campos** no formulário, usando o **mesmo formato de dados**.

---

## 🔄 Formato de Dados Unificado

Todos os métodos de extração agora retornam um objeto com a seguinte estrutura:

```javascript
{
  // Campos principais
  numero: "000382",              // Número da NF-e
  data: "2025-10-15",           // Data de emissão (YYYY-MM-DD)
  cnpjEmitente: "12.345.678/0001-90",  // CNPJ do emitente
  cnpjDestinatario: "98.765.432/0001-10",  // CNPJ do destinatário
  chaveAcesso: "12345678901234567890123456789012345678901234",  // 44 dígitos
  valorTotal: 1250.50,          // Valor total da nota
  itens: [                      // Lista de itens/produtos
    {
      sequencia: 1,
      codigo: "PROD001",
      descricao: "Material de Escritório",
      ncm: "48201000",
      unidade: "UN",
      quantidade: 10,
      valorUnitario: 50.00,
      valorTotal: 500.00
    }
  ],

  // Campos adicionais (opcional)
  razaoSocial: "Empresa Fornecedora LTDA",
  situacao: "Autorizada",
  dadosAdicionais: { ... }
}
```

---

## 📝 Alterações nos Arquivos

### 1. **pdfReader.js** - Extração do PDF

#### Melhorias no `extrairDadosNotaFiscal()`:

**Número da NF-e:**

- ✅ Adicionado **6 padrões diferentes** de detecção:
  1. `Número/Nº/NF-e: 123456`
  2. `Nota Fiscal Eletrônica Nº 123456`
  3. `Nº 123456` (isolado)
  4. `NF-e nº 123456`
  5. `Número da NF: 123456`
  6. `Série X Nº 123456`
- ✅ **Fallback**: Se não encontrar, extrai da chave de acesso (posições 25-34)

**Valor Total:**

- ✅ Adicionado **8 padrões diferentes** de detecção:
  1. "Valor total da nota"
  2. "Total da nota" / "Valor da NF-e"
  3. "Produtos" / "Mercadorias"
  4. "VALOR TOTAL NF-e"
  5. "Total da mercadoria"
  6. "Valor líquido"
  7. "Total produtos/serviços"
  8. "Total: R$ valor" (genérico)
- ✅ **Fallback inteligente**: Usa o maior valor monetário do documento

**Itens:**

- ✅ Melhorado detecção de início/fim da tabela
- ✅ 5 padrões para detectar cabeçalho
- ✅ 6 padrões para detectar fim da tabela
- ✅ Logs detalhados linha por linha

### 2. **nfeIntegration.js** - Consulta por Chave

#### Alterado `converterParaFormatoInterno()`:

**ANTES:**

```javascript
{
  numero: "123",
  dataNotaFiscal: "2025-10-15",  // ❌ Nome diferente
  cnpjFornecedor: "12.345.678/0001-90",  // ❌ Nome diferente
  // cnpjDestinatario não existia  // ❌ Campo faltando
  ...
}
```

**DEPOIS:**

```javascript
{
  numero: "123",
  data: "2025-10-15",  // ✅ Padronizado
  cnpjEmitente: "12.345.678/0001-90",  // ✅ Padronizado
  cnpjDestinatario: "98.765.432/0001-10",  // ✅ Adicionado
  ...
}
```

### 3. **app.js** - Preenchimento do Formulário

#### Atualizado `preencherDadosNF()`:

**ANTES:**

```javascript
if (dados.dataNotaFiscal) {
  // ❌ Nome antigo
  document.getElementById('dataNotaFiscal').value = dados.dataNotaFiscal;
}
if (dados.cnpjFornecedor) {
  // ❌ Nome antigo
  document.getElementById('cnpjEmitente').value = dados.cnpjFornecedor;
}
// cnpjDestinatario não era preenchido  // ❌ Faltando
// calcularSomaItensNF não era chamado  // ❌ Faltando
```

**DEPOIS:**

```javascript
if (dados.data) {
  // ✅ Nome padronizado
  document.getElementById('dataNotaFiscal').value = dados.data;
}
if (dados.cnpjEmitente) {
  // ✅ Nome padronizado
  document.getElementById('cnpjEmitente').value = dados.cnpjEmitente;
}
if (dados.cnpjDestinatario) {
  // ✅ Adicionado
  document.getElementById('cnpjDestinatario').value = dados.cnpjDestinatario;
}
// ...
this.calcularSomaItensNF(); // ✅ Calcula soma automaticamente
```

---

## ✅ Campos Extraídos (Ambos os Métodos)

| Campo             | Upload PDF | Chave Acesso | Status         |
| ----------------- | ---------- | ------------ | -------------- |
| Número da NF      | ✅         | ✅           | Padronizado    |
| Data de Emissão   | ✅         | ✅           | Padronizado    |
| CNPJ Emitente     | ✅         | ✅           | Padronizado    |
| CNPJ Destinatário | ✅         | ✅           | Padronizado    |
| Chave de Acesso   | ✅         | ✅           | Padronizado    |
| Valor Total       | ✅         | ✅           | Padronizado    |
| Itens/Produtos    | ✅         | ✅           | Padronizado    |
| Soma dos Itens    | ✅         | ✅           | Auto-calculada |

---

## 🔍 Fluxo de Dados

### Fluxo 1: Upload de PDF

```
PDF → pdfReader.lerPDF()
    → pdfReader.extrairDadosNotaFiscal()
    → Retorna objeto padronizado
    → app.processarNotaFiscalUpload()
    → Preenche formulário diretamente
```

### Fluxo 2: Consulta por Chave

```
Chave → nfeIntegration.consultarPorChave()
      → Consulta API (simulada ou real)
      → nfeIntegration.converterParaFormatoInterno()
      → Retorna objeto padronizado (MESMO formato do PDF)
      → app.preencherDadosNF()
      → Preenche formulário (mesma função que PDF)
```

---

## 🧪 Como Testar

### 1. **Teste com Upload de PDF**

1. Abra `http://localhost:8000/teste-nf-validacao.html`
2. Arraste o arquivo `NF 382 CGSM.pdf`
3. Verifique se **todos os campos** são extraídos:
   - ✅ Número da NF
   - ✅ Data
   - ✅ CNPJ Emitente
   - ✅ CNPJ Destinatário
   - ✅ Chave de Acesso
   - ✅ Valor Total
   - ✅ Lista de Itens

### 2. **Teste com Chave de Acesso**

1. Abra `http://localhost:8000/index.html`
2. Vá para aba "Chave de Acesso"
3. Cole uma chave de 44 dígitos
4. Clique em "Buscar"
5. Verifique se **os mesmos campos** são preenchidos

### 3. **Comparação**

Os dois métodos devem preencher **exatamente os mesmos campos** no formulário.

---

## 📊 Logs de Depuração

Ambos os métodos agora produzem logs detalhados no console:

```
=== INICIANDO EXTRAÇÃO DE NOTA FISCAL ===
✅ Número da NF encontrado (padrão 3): 000382
✅ Data encontrada: 2025-10-15
✅ CNPJ Emitente encontrado: 12.345.678/0001-90
✅ CNPJ Destinatário encontrado: 98.765.432/0001-10
✅ Chave de acesso encontrada: 123456...
✅ Valor total encontrado (padrão 2): 1250.50
--- Iniciando extração de itens ---
📄 Tamanho do texto: 15234 caracteres
📋 Total de linhas: 456
📋 Cabeçalho encontrado na linha 45
✓ Item 1: Material de Escritório | Qtd: 10 | Vl Unit: R$ 50.00 | Total: R$ 500.00
...
✅ Total de 15 itens extraídos
```

---

## 🎉 Benefícios

1. ✅ **Código mais limpo** - Uma única função de preenchimento
2. ✅ **Manutenção facilitada** - Mudanças em um lugar afetam ambos os fluxos
3. ✅ **Menos bugs** - Campos sempre sincronizados
4. ✅ **Melhor experiência** - Usuário vê os mesmos dados independente do método
5. ✅ **Mais robusto** - Múltiplos padrões de detecção com fallbacks

---

## 📅 Data de Implementação

31 de outubro de 2025

## ✍️ Autor

Sistema IFDesk - Módulo de Nota Fiscal
