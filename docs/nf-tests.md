# SINGEM - Testes Manuais do MÃ³dulo de Nota Fiscal

## VisÃ£o Geral

Este documento descreve os testes manuais obrigatÃ³rios para validar o mÃ³dulo de Nota Fiscal do SINGEM.
O mÃ³dulo sÃ³ Ã© considerado **FECHADO** quando todos os testes abaixo passarem.

---

## PrÃ©-requisitos

1. Servidor de desenvolvimento rodando (`npm run serve:dev`)
2. IndexedDB com pelo menos 1 empenho cadastrado e **validado**
3. Acesso Ã  tela: `/config/importar-nfe.html`

---

## Teste 1 â€” Fluxo Feliz (Happy Path)

### Objetivo

Verificar que uma NF vÃ¡lida pode ser cadastrada sem erros.

### PrÃ©-condiÃ§Ãµes

- Empenho validado com 2+ itens cadastrados
- Exemplo: Empenho 2025 NE 000123 com:
  - Item 001: "CANETA AZUL", UN, Qtd: 100, R$ 2,50
  - Item 002: "LÃPIS PRETO", UN, Qtd: 50, R$ 1,00

### Passos

1. Abrir tela de Cadastro de Nota Fiscal
2. Preencher chave de acesso (44 dÃ­gitos vÃ¡lidos)
3. Preencher nÃºmero da NF, sÃ©rie, data de emissÃ£o
4. Preencher CNPJ e RazÃ£o Social do fornecedor (**mesmo CNPJ do empenho**)
5. Preencher **Valor Total da NF** (manual): R$ 300,00
6. Adicionar Item 1:
   - ItemCompra: 001
   - DescriÃ§Ã£o: CANETA AZUL
   - Unidade: UN
   - Quantidade: 50
   - Valor Unit: R$ 2,50
7. Adicionar Item 2:
   - ItemCompra: 002
   - DescriÃ§Ã£o: LÃPIS PRETO
   - Unidade: UN
   - Quantidade: 50
   - Valor Unit: R$ 1,00
8. Verificar que soma dos itens = R$ 175,00
9. **Ajustar Total NF manual para R$ 175,00** (igual Ã  soma)
10. Selecionar empenho correspondente (NE 000123)
11. Clicar em **"Validar NF"**
12. Modal deve mostrar âœ… "ValidaÃ§Ã£o OK"
13. Fechar modal
14. Clicar em **"Salvar Nota Fiscal"**
15. Verificar mensagem de sucesso
16. Verificar que formulÃ¡rio foi limpo

### Resultado Esperado

- [x] Soma dos itens atualiza em tempo real
- [x] DiferenÃ§a mostra R$ 0,00 (verde)
- [x] ValidaÃ§Ã£o retorna OK
- [x] NF salva no IndexedDB
- [x] Mensagem de sucesso exibida

---

## Teste 2 â€” Item Inexistente no Empenho

### Objetivo

Verificar que itens nÃ£o cadastrados no empenho geram erro bloqueante.

### PrÃ©-condiÃ§Ãµes

- Mesmo empenho do Teste 1 (sÃ³ tem itens 001 e 002)

### Passos

1. Preencher dados bÃ¡sicos da NF (chave, nÃºmero, CNPJ, etc.)
2. Preencher Total NF: R$ 500,00
3. Adicionar Item:
   - ItemCompra: **999** (nÃ£o existe no empenho)
   - DescriÃ§Ã£o: ITEM INEXISTENTE
   - Unidade: UN
   - Quantidade: 10
   - Valor Unit: R$ 50,00
4. Selecionar empenho
5. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] Modal mostra âŒ "Erros Encontrados"
- [x] Erro: `ITEM_NOT_FOUND: Item "ITEM INEXISTENTE" nÃ£o encontrado no empenho`
- [x] BotÃ£o "Salvar" permanece desabilitado
- [x] NÃ£o tem opÃ§Ã£o "Salvar mesmo assim"

---

## Teste 3 â€” DivergÃªncia de Total (Soma â‰  Total Manual)

### Objetivo

Verificar que diferenÃ§a entre soma dos itens e total manual gera erro.

### PrÃ©-condiÃ§Ãµes

- Empenho com itens vÃ¡lidos

### Passos

1. Preencher dados bÃ¡sicos da NF
2. Preencher **Valor Total da NF** (manual): R$ 1.000,00
3. Adicionar itens que somam R$ 250,00:
   - Item: 100 un Ã— R$ 2,50 = R$ 250,00
4. Verificar que diferenÃ§a mostra **R$ 750,00 (abaixo)** em vermelho
5. Selecionar empenho
6. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] DiferenÃ§a visual mostra valor em vermelho
- [x] Modal mostra âŒ "Erros Encontrados"
- [x] Erro: `TOTAL_DIFF: DiferenÃ§a entre Total NF (R$ 1.000,00) e Soma dos itens (R$ 250,00): R$ 750,00`
- [x] BotÃ£o "Salvar" permanece desabilitado

---

## Teste 4 â€” Quantidade Maior que Saldo do Empenho

### Objetivo

Verificar que quantidade acima do saldo/empenhado gera erro bloqueante.

### PrÃ©-condiÃ§Ãµes

- Empenho com item: CANETA AZUL, Qtd empenhada: 100

### Passos

1. Preencher dados bÃ¡sicos da NF
2. Preencher Total NF: R$ 500,00
3. Adicionar Item:
   - ItemCompra: 001
   - DescriÃ§Ã£o: CANETA AZUL
   - Unidade: UN
   - Quantidade: **200** (acima das 100 empenhadas)
   - Valor Unit: R$ 2,50
4. Selecionar empenho
5. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] Modal mostra âŒ "Erros Encontrados"
- [x] Erro: `OVER_QTY: Item "CANETA AZUL": quantidade (200) excede saldo disponÃ­vel (100)`
- [x] BotÃ£o "Salvar" permanece desabilitado

---

## Teste 5 â€” PreÃ§o Divergente (Alerta)

### Objetivo

Verificar que preÃ§o diferente do empenho gera alerta (nÃ£o erro).

### PrÃ©-condiÃ§Ãµes

- Empenho com item: CANETA AZUL, PreÃ§o: R$ 2,50

### Passos

1. Preencher dados bÃ¡sicos da NF
2. Adicionar Item:
   - ItemCompra: 001
   - DescriÃ§Ã£o: CANETA AZUL
   - Unidade: UN
   - Quantidade: 50 (vÃ¡lido)
   - Valor Unit: **R$ 3,00** (diferente dos R$ 2,50 do empenho)
3. Ajustar Total NF para bater com soma
4. Selecionar empenho
5. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] Modal mostra âš ï¸ "Avisos"
- [x] Alerta: `PRICE_DIFF: Item "CANETA AZUL": preÃ§o NF (R$ 3,00) difere do empenho (R$ 2,50)`
- [x] BotÃ£o "Salvar mesmo assim" disponÃ­vel
- [x] BotÃ£o "Salvar" principal habilitado (com indicador de alerta)

---

## Teste 6 â€” CNPJ do Fornecedor Diferente

### Objetivo

Verificar que CNPJ diferente do empenho gera erro.

### Passos

1. Criar empenho com CNPJ: 12.345.678/0001-99
2. Na NF, usar CNPJ: **99.999.999/0001-99** (diferente)
3. Preencher demais dados validamente
4. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] Erro: `CNPJ_MISMATCH: CNPJ do fornecedor da NF difere do empenho`

---

## Teste 7 â€” Unidade Apenas NumÃ©rica

### Objetivo

Verificar que campo unidade nÃ£o aceita apenas nÃºmeros.

### Passos

1. Adicionar item
2. No campo Unidade, digitar apenas: **123**
3. Observar feedback visual

### Resultado Esperado

- [x] Campo Unidade fica com borda vermelha
- [x] Tooltip indica "Unidade nÃ£o pode ser apenas numÃ©rica!"
- [x] ValidaÃ§Ã£o do formulÃ¡rio falha

---

## Teste 8 â€” Select de Empenhos Carregando

### Objetivo

Verificar que empenhos sÃ£o carregados corretamente na lista.

### PrÃ©-condiÃ§Ãµes

- Pelo menos 2 empenhos validados no banco

### Passos

1. Abrir tela de Cadastro de NF
2. Observar lista de empenhos

### Resultado Esperado

- [x] Lista mostra empenhos disponÃ­veis (nÃ£o "Nenhum empenho")
- [x] Formato: "NE 2025/000123 - R$ X.XXX,XX"
- [x] Console mostra: `[carregarEmpenhos] X empenhos carregados`

---

## Teste 9 â€” Filtro por CNPJ

### Objetivo

Verificar que filtro de CNPJ funciona corretamente.

### Passos

1. Ter empenhos de fornecedores diferentes
2. Digitar CNPJ parcial no campo "Filtrar por CNPJ"
3. Observar lista filtrada

### Resultado Esperado

- [x] Lista mostra apenas empenhos do fornecedor correspondente
- [x] Ao limpar filtro, todos empenhos voltam

---

## Teste 10 â€” Salvar com Alertas

### Objetivo

Verificar que pode salvar NF mesmo com alertas (nÃ£o bloqueantes).

### Passos

1. Criar situaÃ§Ã£o com alertas (ex: preÃ§o divergente)
2. Validar NF
3. No modal, clicar **"Salvar Mesmo Assim"**

### Resultado Esperado

- [x] NF Ã© salva normalmente
- [x] Alertas ficam registrados na NF (campo `validacao.alertas`)
- [x] Mensagem de sucesso menciona quantidade de alertas

---

## Checklist Final

Antes de declarar o mÃ³dulo **FECHADO**, confirme:

- [ ] Teste 1 passou (fluxo feliz)
- [ ] Teste 2 passou (item inexistente â†’ erro)
- [ ] Teste 3 passou (total divergente â†’ erro)
- [ ] Teste 4 passou (qtd maior â†’ erro)
- [ ] Teste 5 passou (preÃ§o divergente â†’ alerta)
- [ ] Teste 6 passou (CNPJ diferente â†’ erro)
- [ ] Teste 7 passou (unidade numÃ©rica â†’ validaÃ§Ã£o)
- [ ] Teste 8 passou (empenhos carregam)
- [ ] Teste 9 passou (filtro CNPJ)
- [ ] Teste 10 passou (salvar com alertas)

---

## HistÃ³rico

| Data       | Testador | Resultado               |
| ---------- | -------- | ----------------------- |
| 2026-02-11 | Copilot  | ImplementaÃ§Ã£o inicial |

---

## Notas TÃ©cnicas

### Arquivos Envolvidos

- `/config/importar-nfe.html` - Tela de cadastro
- `/js/nfValidator.js` - Validador NF Ã— Empenho
- `/js/db.js` - FunÃ§Ãµes de persistÃªncia

### Policy de ValidaÃ§Ã£o PadrÃ£o

```javascript
const NF_POLICY = {
  toleranciaTotal: 0.05, // 5 centavos
  bloquearDivergenciaTotal: true,
  bloquearItemInexistente: true,
  bloquearQtdMaiorQueSaldo: true,
  precoDivergenteEhBloqueante: false,
  toleranciaPrecoPct: 1.0, // 1%
  toleranciaPrecoAbs: 0.01 // R$ 0,01
};
```

### Estrutura do Item NF

```javascript
{
  sequencia: 1,
  itemCompra: "001",      // 3 dÃ­gitos
  descricao: "CANETA AZUL",
  unidade: "UN",
  quantidade: 50,
  valorUnitario: 2.50,
  valorTotal: 125.00
}
```
