# 📊 Sistema de Controle de Saldos de Empenhos

## 📖 Visão Geral

O Sistema de Controle de Saldos foi desenvolvido para acompanhar em tempo real o recebimento de mercadorias vinculadas aos empenhos, funcionando como uma **planilha de controle automatizada**.

---

## 🎯 Funcionalidades

### ✅ O que o sistema faz automaticamente:

1. **Ao cadastrar um Empenho:**
   - Cria registros de saldo para cada item
   - Inicializa quantidades empenhadas
   - Define status inicial como "Pendente"

2. **Ao cadastrar uma Nota Fiscal vinculada:**
   - Localiza os itens correspondentes no empenho
   - Registra a entrada no histórico
   - Atualiza quantidades recebidas
   - Recalcula saldos restantes
   - Atualiza status (Pendente → Parcial → Completo)

3. **No Relatório de Saldos:**
   - Exibe planilha detalhada por empenho
   - Mostra todas as entradas de cada item
   - Calcula saldos em quantidade e valor
   - Apresenta resumo visual com percentual de recebimento

---

## 📋 Estrutura da Planilha de Saldos

### Colunas Principais:

| Coluna                  | Descrição                                      |
| ----------------------- | ------------------------------------------------ |
| **Seq**                 | Sequência do item no empenho (1, 2, 3...)       |
| **Produto**             | Descrição completa do item + código           |
| **UN**                  | Unidade de medida (UN, CX, KG, etc.)             |
| **Qtd Emp.**            | Quantidade total empenhada                       |
| **Vlr. Unit.**          | Valor unitário do item                          |
| **Vlr. Total**          | Valor total do item (Qtd × Vlr. Unit.)          |
| **Entradas (NF / Qtd)** | Lista de notas fiscais recebidas com quantidades |
| **Saldo Qtd**           | Quantidade ainda não recebida                   |
| **Saldo Valor**         | Valor ainda não recebido (em R$)                |

### Rodapé (Totais):

- **Valor Total Empenhado**
- **Valor Recebido** (soma de todas as entradas)
- **Saldo Total a Receber** (valor pendente)

---

## 🎨 Elementos Visuais

### Status do Empenho:

- 🟠 **Pendente** - Nenhum item recebido ainda
- 🔵 **Parcial** - Alguns itens recebidos
- 🟢 **Completo** - Todos os itens recebidos

### Cores dos Saldos:

- 🔴 **Vermelho** - Saldo pendente (valor > 0)
- 🟢 **Verde** - Saldo zerado (item completo)

### Resumo Visual:

- Card Roxo: **Valor Empenhado**
- Card Verde: **Valor Recebido** (com percentual)
- Card Vermelho: **Saldo a Receber**
- Barra de Progresso: **Percentual de recebimento**

---

## 🔄 Fluxo de Uso

### 1. Cadastrar Empenho

```
Menu Empenhos → Upload PDF ou Entrada Manual
→ Preencher dados → Adicionar itens → Salvar
→ ✅ Saldos criados automaticamente
```

### 2. Registrar Nota Fiscal

```
Menu Notas Fiscais → Upload PDF ou Entrada Manual
→ Selecionar Empenho Associado → Adicionar itens → Salvar
→ ✅ Saldos atualizados automaticamente
```

### 3. Consultar Saldos

```
Menu Relatórios → Controle de Saldos de Empenhos
→ Selecionar Empenho → Visualizar planilha completa
```

---

## 🗄️ Estrutura de Dados (IndexedDB)

### Tabela: `saldosEmpenhos`

```javascript
{
  id: number (auto-increment),
  empenhoId: number,                    // FK para empenhos
  numeroEmpenho: string,                // NE 2024/123
  fornecedor: string,
  cnpjFornecedor: string,
  dataEmpenho: date,
  itemSequencia: number,                // 1, 2, 3...
  codigoItem: string,
  descricaoItem: string,
  unidade: string,                      // UN, CX, KG...
  quantidadeEmpenhada: float,           // Qtd original
  valorUnitario: float,
  valorTotalItem: float,                // Qtd × Vlr. Unit.
  quantidadeRecebida: float,            // Soma das entradas
  saldoQuantidade: float,               // Emp. - Receb.
  saldoValor: float,                    // Saldo × Vlr. Unit.
  entradas: [                           // Histórico de NFs
    {
      notaFiscal: string,               // NF 123456
      quantidade: float,
      data: date
    }
  ],
  status: string,                       // pendente | parcial | completo
  dataCriacao: ISO date,
  dataAtualizacao: ISO date
}
```

---

## 🛠️ Métodos da API (db.js)

### `criarSaldosEmpenho(empenhoId, empenho)`

Cria registros de saldo para todos os itens de um empenho.

**Quando é chamado:** Automaticamente após salvar um empenho.

```javascript
await window.dbManager.criarSaldosEmpenho(123, empenhoData);
```

---

### `atualizarSaldosComNotaFiscal(empenhoId, numeroNF, itensNF, dataNF)`

Atualiza saldos ao registrar uma nota fiscal vinculada.

**Quando é chamado:** Automaticamente após salvar uma NF com empenho associado.

```javascript
await window.dbManager.atualizarSaldosComNotaFiscal(
  123,              // ID do empenho
  'NF 456789',      // Número da NF
  [itens...],       // Itens da NF
  '2024-01-15'      // Data da NF
);
```

---

### `buscarSaldoEmpenho(empenhoId)`

Busca saldo consolidado de um empenho com todos os itens e totais.

**Retorna:**

```javascript
{
  empenhoId: 123,
  numeroEmpenho: "NE 2024/123",
  fornecedor: "Empresa XYZ",
  dataEmpenho: "2024-01-10",
  itens: [...],           // Array de saldos dos itens
  resumo: {
    valorTotalEmpenhado: 10000.00,
    valorRecebido: 6000.00,
    saldoValorTotal: 4000.00
  },
  statusGeral: "parcial"  // pendente | parcial | completo
}
```

---

### `buscarTodosSaldos()`

Retorna todos os saldos de todos os empenhos.

---

### `buscarSaldosPorStatus(status)`

Filtra saldos por status específico.

```javascript
// Buscar todos os itens pendentes
const pendentes = await window.dbManager.buscarSaldosPorStatus('pendente');
```

---

## 📊 Exemplos de Uso

### Exemplo 1: Empenho com 2 itens

```
Empenho NE 2024/001 - Fornecedor: ABC Ltda
├─ Item 1: Papel A4 - 100 resmas × R$ 20,00 = R$ 2.000,00
└─ Item 2: Canetas - 500 un × R$ 2,00 = R$ 1.000,00

TOTAL EMPENHADO: R$ 3.000,00
```

### Após NF 123456 (entrega parcial):

```
├─ Item 1: Papel A4
│   └─ Entradas: NF 123456 (50 resmas)
│   └─ Saldo: 50 resmas (R$ 1.000,00)
└─ Item 2: Canetas
    └─ Entradas: NF 123456 (500 un)
    └─ Saldo: 0 un (R$ 0,00) ✅ COMPLETO

SALDO TOTAL: R$ 1.000,00 (66,7% recebido)
```

### Após NF 789012 (entrega final):

```
├─ Item 1: Papel A4
│   └─ Entradas: NF 123456 (50), NF 789012 (50)
│   └─ Saldo: 0 resmas (R$ 0,00) ✅ COMPLETO
└─ Item 2: Canetas ✅ JÁ COMPLETO

SALDO TOTAL: R$ 0,00 (100% recebido) ✅ EMPENHO COMPLETO
```

---

## 🚀 Futuras Melhorias

### Planejado:

- [ ] Exportação da planilha para Excel/CSV
- [ ] Filtros por status (pendente, parcial, completo)
- [ ] Alertas de itens com saldo crítico
- [ ] Dashboard com resumo geral de todos os empenhos
- [ ] Gráficos de percentual de recebimento
- [ ] Impressão formatada da planilha
- [ ] Busca e filtro por fornecedor
- [ ] Histórico de alterações nos saldos

---

## ⚠️ Observações Importantes

1. **Empenhos Antigos:** Empenhos cadastrados antes da implementação deste sistema não terão controle de saldo automaticamente. É necessário recadastrá-los ou criar os saldos manualmente.

2. **Vinculação de NF:** Para que o saldo seja atualizado, a Nota Fiscal **DEVE** estar vinculada a um empenho no momento do cadastro.

3. **Correspondência de Itens:** O sistema tenta fazer a correspondência entre itens da NF e do empenho pelo **código** ou pela **descrição**. Mantenha nomenclaturas consistentes para melhor precisão.

4. **Saldos Negativos:** Se uma NF registrar quantidade maior que o saldo, o sistema permite (para casos de entregas excedentes), mas o saldo ficará negativo e será destacado.

---

## 🐛 Solução de Problemas

### "Não há controle de saldo para este empenho"

**Causa:** Empenho cadastrado antes da implementação do sistema de saldos.
**Solução:** Recadastre o empenho ou use a API para criar saldos manualmente.

### Item da NF não atualiza o saldo

**Causa:** Item da NF não corresponde a nenhum item do empenho.
**Solução:** Verifique se o código ou descrição estão similares. Ajuste e registre novamente.

### Saldo não bate com o esperado

**Causa:** Possível erro na entrada de quantidades na NF.
**Solução:** Revise as entradas registradas na coluna "Entradas" da planilha.

---

## 📞 Suporte

Para dúvidas ou problemas com o Sistema de Controle de Saldos:

1. Consulte esta documentação
2. Verifique o console do navegador (F12) para mensagens de erro
3. Entre em contato com o suporte técnico

---

**Última Atualização:** 06/11/2024  
**Versão do Sistema:** 3.0  
**Autor:** Sistema SINGEM - IF Baiano
