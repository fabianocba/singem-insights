# 🧪 Guia de Testes - Validação do Parser NE

## 📋 Objetivo

Validar a **confiabilidade** do parser testando com **múltiplos PDFs** de diferentes formatos e layouts.

---

## 🎯 Casos de Teste

### ✅ Teste 1: NE 039 - CGSM COMERCIO (Formato Original)

**Arquivo:** `NE 039 CGSM COMERCIO.pdf`

**Características:**

- Formato padrão antigo
- 24 itens
- Descrições completas
- Valores com separador brasileiro

**Resultado Esperado:**

```json
{
  "cabecalho": {
    "ano": "2024",
    "numero": "39",
    "naturezaDespesa": "33903000",
    "processo": "23327000254202480",
    "valorTotal": [valor total],
    "cnpj": "XX.XXX.XXX/XXXX-XX",
    "fornecedor": "CGSM COMERCIO..."
  },
  "itens": [24 itens]
}
```

---

### ✅ Teste 2: NE 048 - GGV COMERCIO (Formato Novo)

**Arquivo:** `NE 048 GGV COMERCIO.pdf`

**Características:**

- Formato com "Item compra:"
- 20 itens (frutas, legumes, verduras)
- Layout: "Seq. Valor Item compra: XXXXX - DESCRIÇÃO"
- Dados de quantidade e valores em linhas separadas

**Resultado Esperado:**

```json
{
  "cabecalho": {
    "ano": "2024",
    "numero": "48",
    "naturezaDespesa": "339030",
    "processo": "23330.250275.2024-31",
    "valorTotal": 238294.4,
    "cnpj": "10.724.903/0004-11",
    "fornecedor": "GGV COMERCIO DE FRUTAS E VERDURAS LTDA"
  },
  "itens": [
    {
      "seq": "001",
      "descricao": "FRUTA, TIPO ABACAXI PÉROLA, APRESENTAÇÃO NATURAL",
      "descricao_resumida": "FRUTA",
      "quantidade": 2880,
      "valorUnitario": 2.2,
      "valorTotal": 6336.0,
      "unidade": "KG",
      "subElemento": "07"
    }
    // ... 19 itens adicionais
  ]
}
```

**Itens para Validar:**

1. ✅ **001** - FRUTA ABACAXI - 2.880 KG × R$ 2,20 = R$ 6.336,00
2. ✅ **002** - FRUTA BANANA - 2.400 KG × R$ 3,00 = R$ 7.200,00
3. ✅ **003** - FRUTA LARANJA - 4.000 KG × R$ 5,20 = R$ 20.800,00
4. ✅ **004** - FRUTA MAÇÃ - 2.880 KG × R$ 7,20 = R$ 20.736,00
5. ✅ **005** - FRUTA MAMÃO - 1.440 KG × R$ 5,00 = R$ 7.200,00
6. ✅ **006** - FRUTA MELANCIA - 8.000 KG × R$ 1,50 = R$ 12.000,00
7. ✅ **007** - FRUTA MELÃO - 2.304 KG × R$ 2,90 = R$ 6.681,60
8. ✅ **008** - FRUTA TANGERINA - 6.000 KG × R$ 4,70 = R$ 28.200,00
9. ✅ **009** - LEGUME ABÓBORA - 2.880 KG × R$ 4,90 = R$ 14.112,00
10. ✅ **010** - LEGUME BATATA DOCE - 1.728 KG × R$ 3,70 = R$ 6.393,60
11. ✅ **011** - LEGUME BATATA INGLESA - 4.500 KG × R$ 3,89 = R$ 17.505,00
12. ✅ **012** - LEGUME BETERRABA - 2.000 KG × R$ 3,89 = R$ 7.780,00
13. ✅ **013** - LEGUME CEBOLA BRANCA - 3.500 KG × R$ 3,90 = R$ 13.650,00
14. ✅ **014** - LEGUME CEBOLA ROXA - 3.500 KG × R$ 4,40 = R$ 15.400,00
15. ✅ **015** - LEGUME CENOURA - 1.000 KG × R$ 4,80 = R$ 4.800,00
16. ✅ **016** - LEGUME MANDIOCA - 1.500 KG × R$ 4,69 = R$ 7.035,00
17. ✅ **017** - LEGUME PIMENTÃO - 576 KG × R$ 4,20 = R$ 2.419,20
18. ✅ **018** - VERDURA REPOLHO - 1.500 KG × R$ 3,30 = R$ 4.950,00
19. ✅ **019** - LEGUME QUIABO - 1.440 KG × R$ 5,90 = R$ 8.496,00
20. ✅ **020** - LEGUME TOMATE - 7.000 KG × R$ 3,80 = R$ 26.600,00

**Soma Total:** R$ 238.294,40 ✅

---

## 🔍 Checklist de Validação

Para cada PDF testado, verificar:

### Cabeçalho

- [ ] **Ano** extraído corretamente
- [ ] **Número da NE** correto
- [ ] **Natureza da Despesa** presente
- [ ] **Processo** completo
- [ ] **Valor Total** confere com soma dos itens
- [ ] **CNPJ** formatado (XX.XXX.XXX/XXXX-XX)
- [ ] **Fornecedor** nome completo

### Itens

- [ ] **Quantidade de itens** correta
- [ ] **Sequências** em ordem (001, 002, 003...)
- [ ] **Descrições** completas e legíveis
- [ ] **Quantidades** numéricas corretas
- [ ] **Valores Unitários** com 2 decimais
- [ ] **Valores Totais** calculados corretamente
- [ ] **Unidades** detectadas (KG, UN, LT, etc)
- [ ] **SubElemento** identificado

### Cálculos

- [ ] Soma de todos os itens = Valor Total do Empenho
- [ ] Quantidade × Valor Unitário = Valor Total (por item)
- [ ] Números brasileiros convertidos (1.234,56 → 1234.56)

---

## 📊 Matriz de Testes

| PDF         | Formato | Itens | Status        | Obs                    |
| ----------- | ------- | ----- | ------------- | ---------------------- |
| NE 039 CGSM | Antigo  | 24    | ⏳ Pendente   | Formato original       |
| NE 048 GGV  | Novo    | 20    | 🧪 Testando   | Formato "Item compra:" |
| NE XXX      | Outro   | ?     | ⏳ Aguardando | -                      |

---

## 🐛 Problemas Conhecidos e Soluções

### ❌ Problema: "Nenhum item foi extraído"

**Possíveis Causas:**

1. Formato do PDF não reconhecido pelo regex
2. Texto do PDF não contém padrões esperados
3. Encoding diferente do esperado

**Solução:**

- Verificar `rawText` no console
- Conferir se há padrão "Item compra:" ou "Seq. Descrição"
- Adicionar novo padrão no `extractItensAlternativo()`

### ❌ Problema: "Fornecedor vazio"

**Causa:** Posição do nome em relação ao CNPJ varia

**Solução:**

- Parser busca ANTES do CNPJ
- Valida se tem palavras em maiúsculas
- Procura sufixos (LTDA, ME, EIRELI)

### ❌ Problema: "Valor total incorreto"

**Causa:** Parser pegou valor parcial ou data

**Solução:**

- Busca valores grandes no formato XXX.XXX,XX
- Ignora valores pequenos
- Valida contra soma dos itens

---

## 📝 Como Reportar Problemas

Ao encontrar um erro, documente:

1. **Nome do arquivo PDF**
2. **Valor esperado vs valor obtido**
3. **Screenshot do console** (logs completos)
4. **Trecho do rawText** onde deveria encontrar o dado
5. **Formato específico** do dado no PDF

### Exemplo de Report:

```
❌ ERRO: Fornecedor não extraído

PDF: NE 048 GGV COMERCIO.pdf
Esperado: "GGV COMERCIO DE FRUTAS E VERDURAS LTDA"
Obtido: ""

Console log:
  CNPJ encontrado: 10.724.903/0004-11
  Fornecedor encontrado (alternativa): [vazio]

RawText (trecho):
  "Código Nome ... 35.513.111/0001-86 GGV COMERCIO DE..."

Padrão atual não reconhece porque [explicação]
```

---

## ✅ Critérios de Aprovação

O parser é considerado **confiável** quando:

1. ✅ **95%+ de precisão** nos dados do cabeçalho
2. ✅ **100% dos itens** são extraídos
3. ✅ **Valores conferem** com o PDF original
4. ✅ **Funciona com 3+ formatos** diferentes de PDF
5. ✅ **Não quebra** com PDFs mal formatados

---

## 🚀 Próximos Testes Sugeridos

1. **NE com poucos itens** (1-5 itens)
2. **NE com muitos itens** (50+ itens)
3. **NE com valores altos** (milhões)
4. **NE com valores baixos** (centavos)
5. **NE de diferentes UASG**
6. **NE de anos anteriores** (2023, 2022)
7. **NE com caracteres especiais** na descrição
8. **NE escaneado** (OCR)

---

## 📞 Suporte

Se encontrar PDFs que não funcionam, salve-os para análise e ajuste dos regex patterns.

**Lembre-se:** O objetivo é ter um parser **robusto e adaptável** que funcione com a **maior variedade possível** de formatos!
