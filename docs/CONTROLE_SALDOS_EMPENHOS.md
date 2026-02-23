# ðŸ“Š Sistema de Controle de Saldos de Empenhos

## ðŸ“– VisÃ£o Geral

O Sistema de Controle de Saldos foi desenvolvido para acompanhar em tempo real o recebimento de mercadorias vinculadas aos empenhos, funcionando como uma **planilha de controle automatizada**.

---

## ðŸŽ¯ Funcionalidades

### âœ… O que o sistema faz automaticamente:

1. **Ao cadastrar um Empenho:**
   - Cria registros de saldo para cada item
   - Inicializa quantidades empenhadas
   - Define status inicial como "Pendente"

2. **Ao cadastrar uma Nota Fiscal vinculada:**
   - Localiza os itens correspondentes no empenho
   - Registra a entrada no histÃ³rico
   - Atualiza quantidades recebidas
   - Recalcula saldos restantes
   - Atualiza status (Pendente â†’ Parcial â†’ Completo)

3. **No RelatÃ³rio de Saldos:**
   - Exibe planilha detalhada por empenho
   - Mostra todas as entradas de cada item
   - Calcula saldos em quantidade e valor
   - Apresenta resumo visual com percentual de recebimento

---

## ðŸ“‹ Estrutura da Planilha de Saldos

### Colunas Principais:

| Coluna                  | DescriÃ§Ã£o                                      |
| ----------------------- | ------------------------------------------------ |
| **Seq**                 | SequÃªncia do item no empenho (1, 2, 3...)       |
| **Produto**             | DescriÃ§Ã£o completa do item + cÃ³digo           |
| **UN**                  | Unidade de medida (UN, CX, KG, etc.)             |
| **Qtd Emp.**            | Quantidade total empenhada                       |
| **Vlr. Unit.**          | Valor unitÃ¡rio do item                          |
| **Vlr. Total**          | Valor total do item (Qtd Ã— Vlr. Unit.)          |
| **Entradas (NF / Qtd)** | Lista de notas fiscais recebidas com quantidades |
| **Saldo Qtd**           | Quantidade ainda nÃ£o recebida                   |
| **Saldo Valor**         | Valor ainda nÃ£o recebido (em R$)                |

### RodapÃ© (Totais):

- **Valor Total Empenhado**
- **Valor Recebido** (soma de todas as entradas)
- **Saldo Total a Receber** (valor pendente)

---

## ðŸŽ¨ Elementos Visuais

### Status do Empenho:

- ðŸŸ  **Pendente** - Nenhum item recebido ainda
- ðŸ”µ **Parcial** - Alguns itens recebidos
- ðŸŸ¢ **Completo** - Todos os itens recebidos

### Cores dos Saldos:

- ðŸ”´ **Vermelho** - Saldo pendente (valor > 0)
- ðŸŸ¢ **Verde** - Saldo zerado (item completo)

### Resumo Visual:

- Card Roxo: **Valor Empenhado**
- Card Verde: **Valor Recebido** (com percentual)
- Card Vermelho: **Saldo a Receber**
- Barra de Progresso: **Percentual de recebimento**

---

## ðŸ”„ Fluxo de Uso

### 1. Cadastrar Empenho

```
Menu Empenhos â†’ Upload PDF ou Entrada Manual
â†’ Preencher dados â†’ Adicionar itens â†’ Salvar
â†’ âœ… Saldos criados automaticamente
```

### 2. Registrar Nota Fiscal

```
Menu Notas Fiscais â†’ Upload PDF ou Entrada Manual
â†’ Selecionar Empenho Associado â†’ Adicionar itens â†’ Salvar
â†’ âœ… Saldos atualizados automaticamente
```

### 3. Consultar Saldos

```
Menu RelatÃ³rios â†’ Controle de Saldos de Empenhos
â†’ Selecionar Empenho â†’ Visualizar planilha completa
```

---

## ðŸ—„ï¸ Estrutura de Dados (IndexedDB)

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
  valorTotalItem: float,                // Qtd Ã— Vlr. Unit.
  quantidadeRecebida: float,            // Soma das entradas
  saldoQuantidade: float,               // Emp. - Receb.
  saldoValor: float,                    // Saldo Ã— Vlr. Unit.
  entradas: [                           // HistÃ³rico de NFs
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

## ðŸ› ï¸ MÃ©todos da API (db.js)

### `criarSaldosEmpenho(empenhoId, empenho)`

Cria registros de saldo para todos os itens de um empenho.

**Quando Ã© chamado:** Automaticamente apÃ³s salvar um empenho.

```javascript
await window.dbManager.criarSaldosEmpenho(123, empenhoData);
```

---

### `atualizarSaldosComNotaFiscal(empenhoId, numeroNF, itensNF, dataNF)`

Atualiza saldos ao registrar uma nota fiscal vinculada.

**Quando Ã© chamado:** Automaticamente apÃ³s salvar uma NF com empenho associado.

```javascript
await window.dbManager.atualizarSaldosComNotaFiscal(
  123,              // ID do empenho
  'NF 456789',      // NÃºmero da NF
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

Filtra saldos por status especÃ­fico.

```javascript
// Buscar todos os itens pendentes
const pendentes = await window.dbManager.buscarSaldosPorStatus('pendente');
```

---

## ðŸ“Š Exemplos de Uso

### Exemplo 1: Empenho com 2 itens

```
Empenho NE 2024/001 - Fornecedor: ABC Ltda
â”œâ”€ Item 1: Papel A4 - 100 resmas Ã— R$ 20,00 = R$ 2.000,00
â””â”€ Item 2: Canetas - 500 un Ã— R$ 2,00 = R$ 1.000,00

TOTAL EMPENHADO: R$ 3.000,00
```

### ApÃ³s NF 123456 (entrega parcial):

```
â”œâ”€ Item 1: Papel A4
â”‚   â””â”€ Entradas: NF 123456 (50 resmas)
â”‚   â””â”€ Saldo: 50 resmas (R$ 1.000,00)
â””â”€ Item 2: Canetas
    â””â”€ Entradas: NF 123456 (500 un)
    â””â”€ Saldo: 0 un (R$ 0,00) âœ… COMPLETO

SALDO TOTAL: R$ 1.000,00 (66,7% recebido)
```

### ApÃ³s NF 789012 (entrega final):

```
â”œâ”€ Item 1: Papel A4
â”‚   â””â”€ Entradas: NF 123456 (50), NF 789012 (50)
â”‚   â””â”€ Saldo: 0 resmas (R$ 0,00) âœ… COMPLETO
â””â”€ Item 2: Canetas âœ… JÃ COMPLETO

SALDO TOTAL: R$ 0,00 (100% recebido) âœ… EMPENHO COMPLETO
```

---

## ðŸš€ Futuras Melhorias

### Planejado:

- [ ] ExportaÃ§Ã£o da planilha para Excel/CSV
- [ ] Filtros por status (pendente, parcial, completo)
- [ ] Alertas de itens com saldo crÃ­tico
- [ ] Dashboard com resumo geral de todos os empenhos
- [ ] GrÃ¡ficos de percentual de recebimento
- [ ] ImpressÃ£o formatada da planilha
- [ ] Busca e filtro por fornecedor
- [ ] HistÃ³rico de alteraÃ§Ãµes nos saldos

---

## âš ï¸ ObservaÃ§Ãµes Importantes

1. **Empenhos Antigos:** Empenhos cadastrados antes da implementaÃ§Ã£o deste sistema nÃ£o terÃ£o controle de saldo automaticamente. Ã‰ necessÃ¡rio recadastrÃ¡-los ou criar os saldos manualmente.

2. **VinculaÃ§Ã£o de NF:** Para que o saldo seja atualizado, a Nota Fiscal **DEVE** estar vinculada a um empenho no momento do cadastro.

3. **CorrespondÃªncia de Itens:** O sistema tenta fazer a correspondÃªncia entre itens da NF e do empenho pelo **cÃ³digo** ou pela **descriÃ§Ã£o**. Mantenha nomenclaturas consistentes para melhor precisÃ£o.

4. **Saldos Negativos:** Se uma NF registrar quantidade maior que o saldo, o sistema permite (para casos de entregas excedentes), mas o saldo ficarÃ¡ negativo e serÃ¡ destacado.

---

## ðŸ› SoluÃ§Ã£o de Problemas

### "NÃ£o hÃ¡ controle de saldo para este empenho"

**Causa:** Empenho cadastrado antes da implementaÃ§Ã£o do sistema de saldos.
**SoluÃ§Ã£o:** Recadastre o empenho ou use a API para criar saldos manualmente.

### Item da NF nÃ£o atualiza o saldo

**Causa:** Item da NF nÃ£o corresponde a nenhum item do empenho.
**SoluÃ§Ã£o:** Verifique se o cÃ³digo ou descriÃ§Ã£o estÃ£o similares. Ajuste e registre novamente.

### Saldo nÃ£o bate com o esperado

**Causa:** PossÃ­vel erro na entrada de quantidades na NF.
**SoluÃ§Ã£o:** Revise as entradas registradas na coluna "Entradas" da planilha.

---

## ðŸ“ž Suporte

Para dÃºvidas ou problemas com o Sistema de Controle de Saldos:

1. Consulte esta documentaÃ§Ã£o
2. Verifique o console do navegador (F12) para mensagens de erro
3. Entre em contato com o suporte tÃ©cnico

---

**Ãšltima AtualizaÃ§Ã£o:** 06/11/2024  
**VersÃ£o do Sistema:** 3.0  
**Autor:** Sistema SINGEM - IF Baiano
