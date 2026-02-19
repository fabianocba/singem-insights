# IFDESK - Testes Manuais do Módulo de Nota Fiscal

## Visão Geral

Este documento descreve os testes manuais obrigatórios para validar o módulo de Nota Fiscal do IFDESK.
O módulo só é considerado **FECHADO** quando todos os testes abaixo passarem.

---

## Pré-requisitos

1. Servidor de desenvolvimento rodando (`npm run serve:dev`)
2. IndexedDB com pelo menos 1 empenho cadastrado e **validado**
3. Acesso à tela: `/config/importar-nfe.html`

---

## Teste 1 — Fluxo Feliz (Happy Path)

### Objetivo

Verificar que uma NF válida pode ser cadastrada sem erros.

### Pré-condições

- Empenho validado com 2+ itens cadastrados
- Exemplo: Empenho 2025 NE 000123 com:
  - Item 001: "CANETA AZUL", UN, Qtd: 100, R$ 2,50
  - Item 002: "LÁPIS PRETO", UN, Qtd: 50, R$ 1,00

### Passos

1. Abrir tela de Cadastro de Nota Fiscal
2. Preencher chave de acesso (44 dígitos válidos)
3. Preencher número da NF, série, data de emissão
4. Preencher CNPJ e Razão Social do fornecedor (**mesmo CNPJ do empenho**)
5. Preencher **Valor Total da NF** (manual): R$ 300,00
6. Adicionar Item 1:
   - ItemCompra: 001
   - Descrição: CANETA AZUL
   - Unidade: UN
   - Quantidade: 50
   - Valor Unit: R$ 2,50
7. Adicionar Item 2:
   - ItemCompra: 002
   - Descrição: LÁPIS PRETO
   - Unidade: UN
   - Quantidade: 50
   - Valor Unit: R$ 1,00
8. Verificar que soma dos itens = R$ 175,00
9. **Ajustar Total NF manual para R$ 175,00** (igual à soma)
10. Selecionar empenho correspondente (NE 000123)
11. Clicar em **"Validar NF"**
12. Modal deve mostrar ✅ "Validação OK"
13. Fechar modal
14. Clicar em **"Salvar Nota Fiscal"**
15. Verificar mensagem de sucesso
16. Verificar que formulário foi limpo

### Resultado Esperado

- [x] Soma dos itens atualiza em tempo real
- [x] Diferença mostra R$ 0,00 (verde)
- [x] Validação retorna OK
- [x] NF salva no IndexedDB
- [x] Mensagem de sucesso exibida

---

## Teste 2 — Item Inexistente no Empenho

### Objetivo

Verificar que itens não cadastrados no empenho geram erro bloqueante.

### Pré-condições

- Mesmo empenho do Teste 1 (só tem itens 001 e 002)

### Passos

1. Preencher dados básicos da NF (chave, número, CNPJ, etc.)
2. Preencher Total NF: R$ 500,00
3. Adicionar Item:
   - ItemCompra: **999** (não existe no empenho)
   - Descrição: ITEM INEXISTENTE
   - Unidade: UN
   - Quantidade: 10
   - Valor Unit: R$ 50,00
4. Selecionar empenho
5. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] Modal mostra ❌ "Erros Encontrados"
- [x] Erro: `ITEM_NOT_FOUND: Item "ITEM INEXISTENTE" não encontrado no empenho`
- [x] Botão "Salvar" permanece desabilitado
- [x] Não tem opção "Salvar mesmo assim"

---

## Teste 3 — Divergência de Total (Soma ≠ Total Manual)

### Objetivo

Verificar que diferença entre soma dos itens e total manual gera erro.

### Pré-condições

- Empenho com itens válidos

### Passos

1. Preencher dados básicos da NF
2. Preencher **Valor Total da NF** (manual): R$ 1.000,00
3. Adicionar itens que somam R$ 250,00:
   - Item: 100 un × R$ 2,50 = R$ 250,00
4. Verificar que diferença mostra **R$ 750,00 (abaixo)** em vermelho
5. Selecionar empenho
6. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] Diferença visual mostra valor em vermelho
- [x] Modal mostra ❌ "Erros Encontrados"
- [x] Erro: `TOTAL_DIFF: Diferença entre Total NF (R$ 1.000,00) e Soma dos itens (R$ 250,00): R$ 750,00`
- [x] Botão "Salvar" permanece desabilitado

---

## Teste 4 — Quantidade Maior que Saldo do Empenho

### Objetivo

Verificar que quantidade acima do saldo/empenhado gera erro bloqueante.

### Pré-condições

- Empenho com item: CANETA AZUL, Qtd empenhada: 100

### Passos

1. Preencher dados básicos da NF
2. Preencher Total NF: R$ 500,00
3. Adicionar Item:
   - ItemCompra: 001
   - Descrição: CANETA AZUL
   - Unidade: UN
   - Quantidade: **200** (acima das 100 empenhadas)
   - Valor Unit: R$ 2,50
4. Selecionar empenho
5. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] Modal mostra ❌ "Erros Encontrados"
- [x] Erro: `OVER_QTY: Item "CANETA AZUL": quantidade (200) excede saldo disponível (100)`
- [x] Botão "Salvar" permanece desabilitado

---

## Teste 5 — Preço Divergente (Alerta)

### Objetivo

Verificar que preço diferente do empenho gera alerta (não erro).

### Pré-condições

- Empenho com item: CANETA AZUL, Preço: R$ 2,50

### Passos

1. Preencher dados básicos da NF
2. Adicionar Item:
   - ItemCompra: 001
   - Descrição: CANETA AZUL
   - Unidade: UN
   - Quantidade: 50 (válido)
   - Valor Unit: **R$ 3,00** (diferente dos R$ 2,50 do empenho)
3. Ajustar Total NF para bater com soma
4. Selecionar empenho
5. Clicar em **"Validar NF"**

### Resultado Esperado

- [x] Modal mostra ⚠️ "Avisos"
- [x] Alerta: `PRICE_DIFF: Item "CANETA AZUL": preço NF (R$ 3,00) difere do empenho (R$ 2,50)`
- [x] Botão "Salvar mesmo assim" disponível
- [x] Botão "Salvar" principal habilitado (com indicador de alerta)

---

## Teste 6 — CNPJ do Fornecedor Diferente

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

## Teste 7 — Unidade Apenas Numérica

### Objetivo

Verificar que campo unidade não aceita apenas números.

### Passos

1. Adicionar item
2. No campo Unidade, digitar apenas: **123**
3. Observar feedback visual

### Resultado Esperado

- [x] Campo Unidade fica com borda vermelha
- [x] Tooltip indica "Unidade não pode ser apenas numérica!"
- [x] Validação do formulário falha

---

## Teste 8 — Select de Empenhos Carregando

### Objetivo

Verificar que empenhos são carregados corretamente na lista.

### Pré-condições

- Pelo menos 2 empenhos validados no banco

### Passos

1. Abrir tela de Cadastro de NF
2. Observar lista de empenhos

### Resultado Esperado

- [x] Lista mostra empenhos disponíveis (não "Nenhum empenho")
- [x] Formato: "NE 2025/000123 - R$ X.XXX,XX"
- [x] Console mostra: `[carregarEmpenhos] X empenhos carregados`

---

## Teste 9 — Filtro por CNPJ

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

## Teste 10 — Salvar com Alertas

### Objetivo

Verificar que pode salvar NF mesmo com alertas (não bloqueantes).

### Passos

1. Criar situação com alertas (ex: preço divergente)
2. Validar NF
3. No modal, clicar **"Salvar Mesmo Assim"**

### Resultado Esperado

- [x] NF é salva normalmente
- [x] Alertas ficam registrados na NF (campo `validacao.alertas`)
- [x] Mensagem de sucesso menciona quantidade de alertas

---

## Checklist Final

Antes de declarar o módulo **FECHADO**, confirme:

- [ ] Teste 1 passou (fluxo feliz)
- [ ] Teste 2 passou (item inexistente → erro)
- [ ] Teste 3 passou (total divergente → erro)
- [ ] Teste 4 passou (qtd maior → erro)
- [ ] Teste 5 passou (preço divergente → alerta)
- [ ] Teste 6 passou (CNPJ diferente → erro)
- [ ] Teste 7 passou (unidade numérica → validação)
- [ ] Teste 8 passou (empenhos carregam)
- [ ] Teste 9 passou (filtro CNPJ)
- [ ] Teste 10 passou (salvar com alertas)

---

## Histórico

| Data       | Testador | Resultado             |
| ---------- | -------- | --------------------- |
| 2026-02-11 | Copilot  | Implementação inicial |

---

## Notas Técnicas

### Arquivos Envolvidos

- `/config/importar-nfe.html` - Tela de cadastro
- `/js/nfValidator.js` - Validador NF × Empenho
- `/js/db.js` - Funções de persistência

### Policy de Validação Padrão

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
  itemCompra: "001",      // 3 dígitos
  descricao: "CANETA AZUL",
  unidade: "UN",
  quantidade: 50,
  valorUnitario: 2.50,
  valorTotal: 125.00
}
```
