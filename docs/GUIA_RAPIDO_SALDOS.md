# 🚀 Guia Rápido - Controle de Saldos de Empenhos

## ⚡ Início Rápido (3 passos)

### 1️⃣ Cadastre um Empenho

```
Menu Empenhos → Preencher dados → Adicionar itens → Salvar
```

✅ **Saldos criados automaticamente!**

### 2️⃣ Registre uma Nota Fiscal

```
Menu Notas Fiscais → Selecione o Empenho → Adicionar itens → Salvar
```

✅ **Saldos atualizados automaticamente!**

### 3️⃣ Consulte o Controle

```
Menu Relatórios → Controle de Saldos de Empenhos → Selecione o Empenho
```

✅ **Visualize a planilha completa com entradas e saldos!**

---

## 📊 O que você verá na planilha:

### Informações do Empenho:

- 📋 Número do empenho
- 🏢 Fornecedor
- 📅 Data
- 🎯 Status geral (Pendente/Parcial/Completo)

### Para cada item:

| O que vê        | Significado                          |
| --------------- | ------------------------------------ |
| **Seq**         | Número do item (1, 2, 3...)          |
| **Qtd Emp.**    | Quanto foi empenhado                 |
| **Vlr. Total**  | Valor total do item                  |
| **Entradas**    | Quais NFs já receberam + quantidades |
| **Saldo Qtd**   | Quanto ainda falta receber           |
| **Saldo Valor** | Quanto R$ ainda falta                |

### Totais no Rodapé:

- 💰 **Valor Total Empenhado**
- ✅ **Valor Recebido** (com %)
- 🔴 **Saldo a Receber**

---

## 🎨 Entendendo as Cores

### Status do Item:

- 🟠 **Laranja** = Nenhuma entrada ainda (Pendente)
- 🔵 **Azul** = Recebido parcialmente (Parcial)
- 🟢 **Verde** = Completo (100% recebido)

### Valores:

- 🔴 **Vermelho** = Saldo pendente (ainda falta receber)
- 🟢 **Verde** = Saldo zero (tudo recebido)

---

## 💡 Dicas Importantes

### ✅ FAÇA:

- Sempre vincule a NF ao empenho correto
- Mantenha códigos e descrições consistentes
- Confira os totais no rodapé
- Use o resumo visual para acompanhar percentuais

### ❌ NÃO FAÇA:

- Cadastrar NF sem vincular ao empenho (não atualiza saldo)
- Mudar drasticamente nomes de produtos entre empenho e NF
- Ignorar avisos de divergências

---

## 🔍 Exemplo Visual

### Empenho: NE 2024/100

**Fornecedor:** Papelaria ABC  
**Status:** 🔵 Parcial (60% recebido)

| Seq | Produto  | Qtd | Entradas     | Saldo     |
| --- | -------- | --- | ------------ | --------- |
| 1   | Papel A4 | 100 | NF 123 (60)  | **40** 🔴 |
| 2   | Canetas  | 200 | NF 123 (200) | **0** ✅  |

**Resumo:**

- 💰 Empenhado: R$ 3.000,00
- ✅ Recebido: R$ 1.800,00 (60%)
- 🔴 Saldo: R$ 1.200,00

---

## ❓ Resolução Rápida de Problemas

### "Não há controle de saldo para este empenho"

➡️ Empenho foi cadastrado antes do sistema de saldos.  
✅ **Solução:** Recadastre o empenho.

### "Item da NF não atualizou o saldo"

➡️ Nome do produto está muito diferente.  
✅ **Solução:** Verifique se código/descrição são similares.

### "Saldo está negativo"

➡️ Foi entregue mais do que o empenhado.  
✅ **Isso é normal:** Sistema aceita entregas excedentes.

---

## 🎯 Próximos Passos

Após dominar o básico:

1. Explore os filtros de relatório
2. Acompanhe percentuais de recebimento
3. Use para controle de prestação de contas
4. Exporte para Excel (em breve)

---

**📚 Documentação Completa:** `docs/CONTROLE_SALDOS_EMPENHOS.md`  
**🆘 Suporte:** Console do navegador (F12) mostra logs detalhados
