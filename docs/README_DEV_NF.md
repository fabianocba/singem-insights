# 📄 Módulo de Nota Fiscal — Documentação para Desenvolvedores

> Versão: 1.0 | Data: 2026-02-09

## Visão Geral

O módulo de **Entrada de Nota Fiscal** é **dependente do cadastro de Empenhos**. NFs só podem ser vinculadas a empenhos existentes e validados.

---

## 📂 Arquivos Envolvidos

| Arquivo                     | Responsabilidade                                        |
| --------------------------- | ------------------------------------------------------- |
| `js/app.js`                 | Classe `ControleMaterialApp` — funções principais de NF |
| `js/db.js`                  | `DatabaseManager` — persistência e queries NF/Empenho   |
| `js/nfeIntegration.js`      | Integração com APIs externas (consulta por chave)       |
| `js/core/inputValidator.js` | Validação de dados de entrada da NF                     |
| `js/nfValidator.js`         | **NOVO** — Validação cruzada NF ↔ Empenho              |
| `index.html`                | Tela `#notaFiscalScreen` e `#formNotaFiscal`            |

---

## 🔄 Fluxo de Entrada de Nota Fiscal

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ENTRADA DE NOTA FISCAL                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────────┐    ┌──────────────────────────┐   │
│  │ Upload PDF   │ OR │ Chave de Acesso  │ → │ Extração automática      │   │
│  │ (DANFE)      │    │ (44 dígitos)     │    │ de dados                │   │
│  └──────┬───────┘    └────────┬─────────┘    └──────────┬───────────────┘   │
│         │                     │                         │                    │
│         └─────────────────────┴─────────────────────────┘                    │
│                               │                                              │
│                               ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Preview dos Dados Extraídos (cabeçalho + itens + valor total)          ││
│  │ → Botão "Transferir Dados para Formulário"                             ││
│  └──────────────────────────────┬──────────────────────────────────────────┘│
│                                 ▼                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Formulário #formNotaFiscal                                             ││
│  │ - número, data, CNPJs, chave de acesso, valor total                    ││
│  │ - select #empenhoAssociado (lista empenhos ativos)                     ││
│  │ - grid de itens #itensNotaFiscal                                       ││
│  └──────────────────────────────┬──────────────────────────────────────────┘│
│                                 │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Ao selecionar Empenho (#empenhoAssociado.change):                      ││
│  │ → verificarDivergencias(empenhoId)                                     ││
│  │ → dbManager.compararNotaFiscalComEmpenho(nf, empenhoId)                ││
│  │ → Exibe divergências em #divergenciasContainer                         ││
│  └──────────────────────────────┬──────────────────────────────────────────┘│
│                                 │                                            │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │ Botão [Salvar Nota Fiscal] (submit)                                    ││
│  │ → salvarNotaFiscal()                                                   ││
│  │   1. InputValidator.validateNotaFiscal(nf)                             ││
│  │   2. _validarCNPJDestinatarioContraUnidade(cnpj)                       ││
│  │   3. dbManager.compararNotaFiscalComEmpenho() (divergências)           ││
│  │   4. dbManager.salvarNotaFiscal(nf) → store 'notasFiscais'             ││
│  │   5. _salvarArquivoNotaFiscal() → fsManager                            ││
│  │   6. _atualizarSaldosEmpenhoComNF() → atualiza saldos                  ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📊 Estrutura de Dados

### A) Empenho (IndexedDB: `empenhos`)

```javascript
{
  id: number,                    // auto-increment
  ano: string,                   // "2025"
  numero: string,                // "2025NE000123"
  fornecedor: string,            // "EMPRESA X LTDA"
  cnpjFornecedor: string,        // "12345678000199" (somente dígitos)
  valorTotalEmpenho: number,     // 12500.00
  statusValidacao: string,       // 'rascunho' | 'validado'
  itens: [
    {
      seq: number,               // 1, 2, 3...
      itemCompra: string,        // "001" (3 dígitos)
      descricao: string,         // "CANETA ESFEROGRÁFICA AZUL"
      unidade: string,           // "UN", "CX", "KG"
      quantidade: number,        // 100
      valorUnitario: number,     // 2.50
      valorTotal: number,        // 250.00
      subelementoCodigo: string, // "339030"
      subelementoNome: string,   // "Material de Consumo"
      catmatCodigo: string,      // "123456"
      saldoQuantidade?: number,  // 50 (opcional - controle de saldo)
      saldoValor?: number        // 125.00 (opcional)
    }
  ],
  dataCriacao: string,           // ISO
  dataAtualizacao: string        // ISO
}
```

### B) Nota Fiscal (IndexedDB: `notasFiscais`)

```javascript
{
  id: number,                    // auto-increment
  numero: string,                // "12345"
  dataNotaFiscal: string,        // "2025-11-06" (ISO)
  cnpjFornecedor: string,        // "12345678000199"
  cnpjEmitente: string,          // alias de cnpjFornecedor
  cnpjDestinatario: string,      // CNPJ da unidade (validado)
  chaveAcesso: string,           // 44 dígitos (opcional)
  empenhoId: number | null,      // FK para empenhos.id
  valorTotal: number,            // 1500.00
  itens: [
    {
      seq: number,               // 1, 2, 3...
      codigo: string,            // código do produto na NF
      descricao: string,         // descrição do item
      unidade: string,           // "UN", "CX"
      quantidade: number,        // 10
      valorUnitario: number,     // 15.00
      valorTotal: number         // 150.00
    }
  ],
  divergencias: [],              // lista de divergências detectadas
  pdfData: string | null,        // base64 do PDF (opcional)
  status: string,                // 'ativa' | 'pendente' | 'cancelada'
  dataCriacao: string,
  dataAtualizacao: string
}
```

---

## 🔑 Chaves de Match (NF ↔ Empenho)

Para vincular itens da NF aos itens do Empenho:

| Prioridade         | Chave                 | Descrição                      |
| ------------------ | --------------------- | ------------------------------ |
| 1 (ideal)          | `itemCompra`          | 3 dígitos fixos ("001", "002") |
| 2 (fallback)       | `descricao + unidade` | Normalizado para uppercase     |
| 3 (último recurso) | `seq`                 | Sequencial do item             |

---

## 🔧 Funções Principais (app.js)

| Função                                    | Localização | Descrição                          |
| ----------------------------------------- | ----------- | ---------------------------------- |
| `processarNotaFiscalUpload()`             | ~L2885      | Processa PDF e extrai dados        |
| `exibirPreviewNotaFiscal()`               | ~L2895      | Exibe preview dos dados extraídos  |
| `buscarEmpenhoCorrespondente()`           | ~L2978      | Popula select de empenhos por CNPJ |
| `verificarDivergencias()`                 | ~L3016      | Chama comparação NF ↔ Empenho     |
| `salvarNotaFiscal()`                      | ~L4369      | Salva NF no banco                  |
| `_validarCNPJDestinatarioContraUnidade()` | ~L4238      | Valida CNPJ destino                |
| `_salvarArquivoNotaFiscal()`              | ~L4290      | Salva arquivo físico               |
| `_atualizarSaldosEmpenhoComNF()`          | ~L4326      | Atualiza saldos                    |

---

## 🔧 Funções de Banco (db.js)

| Função                                                           | Descrição                         |
| ---------------------------------------------------------------- | --------------------------------- |
| `salvarNotaFiscal(nf)`                                           | Insere NF na store `notasFiscais` |
| `buscarNotasFiscais()`                                           | Lista todas NFs                   |
| `buscarNotaFiscalPorNumero(numero)`                              | Busca NF por número               |
| `buscarNotasFiscaisPorEmpenho(empenhoId)`                        | Lista NFs de um empenho           |
| `compararNotaFiscalComEmpenho(nf, empenhoId)`                    | Detecta divergências              |
| `atualizarSaldosComNotaFiscal(empenhoId, nfNumero, itens, data)` | Atualiza saldos                   |

---

## ⚠️ Validações Existentes

### 1. InputValidator.validateNotaFiscal() (inputValidator.js)

Valida campos obrigatórios:

- `numero` (obrigatório)
- `dataNotaFiscal` (formato ISO)
- `cnpjEmitente` (14 dígitos)
- `cnpjDestinatario` (14 dígitos)
- `valorTotal` > 0
- `itens` (array não vazio)

### 2. compararNotaFiscalComEmpenho() (db.js)

Verifica:

- CNPJ fornecedor NF == CNPJ fornecedor Empenho
- Cada item da NF existe no Empenho (por `codigo`)
- Valor unitário (tolerância configurável)
- Quantidade (tolerância configurável)
- Descrição (case-insensitive)

### 3. \_validarCNPJDestinatarioContraUnidade() (app.js)

Verifica:

- CNPJ do destinatário da NF == CNPJ da Unidade Orçamentária do usuário

---

## 🚧 Gaps Identificados (A CORRIGIR)

1. **Validação de Match por `itemCompra`**: Atualmente usa `codigo` que nem sempre existe
2. **Bloqueio de salvamento**: Divergências são exibidas mas NÃO bloqueiam o salvar
3. **Saldo por item**: Não valida se quantidade NF > saldo disponível do item
4. **Fornecedor da NF**: Não valida fornecedor se empenho não tem CNPJ
5. **Status da NF**: Não usa status `PENDENTE` → `CONFIRMADA`

---

## 📝 Próximos Passos

1. **Criar `js/nfValidator.js`** — validação isolada e estruturada
2. **Adicionar botão "Validar NF"** — antes do "Salvar"
3. **Bloquear salvamento** se `ok=false`
4. **Implementar two-phase save** (pendente → confirmada)

---

## 🧪 Testes Manuais Recomendados

| Cenário                     | Esperado                               |
| --------------------------- | -------------------------------------- |
| NF correta, itens = empenho | Salva OK, atualiza saldos              |
| NF com item inexistente     | Bloqueia, lista "notFound"             |
| NF com qtd > saldo          | Bloqueia, lista "overQty"              |
| NF com preço divergente     | Warning conforme tolerância            |
| NF com fornecedor diferente | Bloqueia ou warning                    |
| NF sem empenho associado    | Permite salvar (sem validação cruzada) |

---

## 🔐 Tolerâncias Configuráveis

Obtidas via funções globais (se existirem):

- `window.getToleranciaValor()` — padrão: R$ 0.01
- `window.getToleranciaQuantidade()` — padrão: 0

---

_Documento gerado em 2026-02-09_
