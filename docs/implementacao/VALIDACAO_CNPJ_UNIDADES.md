# ðŸ¢ ValidaÃ§Ã£o de CNPJ e MÃºltiplas Unidades OrÃ§amentÃ¡rias

## ðŸ“‹ Resumo das ImplementaÃ§Ãµes

Este documento descreve as melhorias implementadas no sistema de gerenciamento de Unidades OrÃ§amentÃ¡rias e validaÃ§Ã£o de CNPJ em Notas de Empenho e Notas Fiscais.

---

## âœ¨ Funcionalidades Implementadas

### 1. Sistema de MÃºltiplas Unidades

#### **Antes:**

- Sistema permitia cadastrar apenas uma unidade orÃ§amentÃ¡ria
- NÃ£o havia lista de unidades cadastradas
- NÃ£o era possÃ­vel vincular unidades especÃ­ficas aos usuÃ¡rios

#### **Depois:**

- âœ… Sistema suporta **mÃºltiplas unidades orÃ§amentÃ¡rias**
- âœ… Lista todas as unidades cadastradas em tabela
- âœ… Permite **vincular unidade especÃ­fica ao usuÃ¡rio logado**
- âœ… Cada usuÃ¡rio pode ter sua prÃ³pria unidade vinculada

### 2. ValidaÃ§Ã£o AutomÃ¡tica de CNPJ

#### **Removido:**

- âŒ BotÃ£o "Validar CNPJ" manual removido da interface

#### **Implementado:**

- âœ… ValidaÃ§Ã£o automÃ¡tica ao cadastrar **Nota de Empenho (NE)**
- âœ… ValidaÃ§Ã£o automÃ¡tica ao cadastrar **Nota Fiscal (NF)**
- âœ… **Bloqueio total** de NF com CNPJ de destinatÃ¡rio diferente da unidade

---

## ðŸ”’ Regras de ValidaÃ§Ã£o

### Nota de Empenho (NE)

**ValidaÃ§Ã£o do CNPJ do Fornecedor:**

1. âš ï¸ **Alerta** se CNPJ do Fornecedor = CNPJ da Unidade
   - Indica possÃ­vel erro
   - Permite continuar apÃ³s confirmaÃ§Ã£o
   - Mensagem clara com dados da divergÃªncia

2. âš ï¸ **Alerta** se nÃ£o hÃ¡ unidade configurada
   - Recomenda cadastrar unidade
   - Permite continuar apÃ³s confirmaÃ§Ã£o

### Nota Fiscal (NF)

**ValidaÃ§Ã£o do CNPJ do DestinatÃ¡rio/BeneficiÃ¡rio:**

1. âŒ **BLOQUEIO TOTAL** se CNPJ DestinatÃ¡rio â‰  CNPJ da Unidade
   - NÃƒO permite cadastrar a NF
   - Mensagem detalhada explicando o motivo
   - Orienta sobre prÃ³ximos passos

2. âŒ **BLOQUEIO TOTAL** se nÃ£o hÃ¡ unidade vinculada
   - Exige configuraÃ§Ã£o de unidade antes
   - Orienta passo a passo para configurar

**Mensagens de Bloqueio:**

```
âŒ CNPJ DO DESTINATÃRIO INVÃLIDO!

O CNPJ do DestinatÃ¡rio/BeneficiÃ¡rio da Nota Fiscal Ã© diferente
do CNPJ da Unidade OrÃ§amentÃ¡ria vinculada ao seu usuÃ¡rio.

CNPJ da Unidade: 10.123.456/0001-78
Unidade: Instituto Federal Baiano - Campus Senhor do Bonfim

CNPJ DestinatÃ¡rio NF: 10.987.654/0001-32

âš ï¸ Notas Fiscais com CNPJ de destinatÃ¡rio diferente da unidade
logada NÃƒO podem ser cadastradas.

Verifique:
1. Se a NF Ã© realmente para esta unidade
2. Se hÃ¡ outra unidade cadastrada com este CNPJ
3. Se vocÃª precisa vincular outra unidade ao seu usuÃ¡rio
```

---

## ðŸ“Š Nova Interface - Lista de Unidades

### Tela: ConfiguraÃ§Ãµes â†’ Unidade OrÃ§amentÃ¡ria

**SeÃ§Ã£o: "ðŸ“‹ Unidades Cadastradas"**

Tabela com colunas:

- **RazÃ£o Social**: Nome completo da unidade
- **CNPJ**: CNPJ formatado
- **UG**: Unidade Gestora
- **MunicÃ­pio/UF**: LocalizaÃ§Ã£o
- **AÃ§Ãµes**: BotÃµes de aÃ§Ã£o

**BotÃµes de AÃ§Ã£o:**

1. **âœï¸ Editar**: Carrega dados no formulÃ¡rio para ediÃ§Ã£o
2. **ðŸ”— Vincular ao UsuÃ¡rio**: Vincula unidade ao usuÃ¡rio logado
3. **ðŸ—‘ï¸ Excluir**: Remove unidade (com confirmaÃ§Ã£o)

---

## ðŸ”— Fluxo de VinculaÃ§Ã£o de Unidade

```
1. UsuÃ¡rio acessa: ConfiguraÃ§Ãµes â†’ Unidade OrÃ§amentÃ¡ria
        â†“
2. Visualiza lista de unidades cadastradas
        â†“
3. Clica em "ðŸ”— Vincular ao UsuÃ¡rio" na unidade desejada
        â†“
4. Sistema mostra confirmaÃ§Ã£o:
   - Nome da unidade
   - CNPJ
   - Nome do usuÃ¡rio logado
        â†“
5. UsuÃ¡rio confirma
        â†“
6. Sistema vincula unidade ao usuÃ¡rio
        â†“
7. Atualiza tela de login com dados da unidade
        â†“
8. âœ… Todas as NE e NF serÃ£o validadas com este CNPJ!
```

---

## ðŸŽ¯ Caso de Uso: Campus com MÃºltiplas UGs

### CenÃ¡rio:

**IF Baiano - Campus Senhor do Bonfim** possui 3 Unidades Gestoras diferentes:

1. **UG Principal**: 158123 - CNPJ: 10.123.456/0001-78
2. **UG Fazenda Experimental**: 158124 - CNPJ: 10.123.456/0002-59
3. **UG Projeto Especial**: 158125 - CNPJ: 10.123.456/0003-30

### SoluÃ§Ã£o:

1. **Cadastrar todas as 3 unidades** na tela de Unidades OrÃ§amentÃ¡rias
2. Cada usuÃ¡rio vincula a UG que gerencia:
   - Diretor de PatrimÃ´nio â†’ UG Principal
   - Coordenador da Fazenda â†’ UG Fazenda
   - Gestor do Projeto â†’ UG Projeto

3. **Resultado:**
   - Cada usuÃ¡rio sÃ³ consegue cadastrar NFs para sua UG vinculada
   - ImpossÃ­vel cadastrar NF de outra unidade por engano
   - RelatÃ³rios separados por unidade

---

## ðŸ› ï¸ AlteraÃ§Ãµes TÃ©cnicas

### Arquivos Modificados

#### 1. `config/configuracoes.html`

**MudanÃ§as:**

- âŒ Removido: BotÃ£o "âœ“ Validar CNPJ"
- âœ… Adicionado: SeÃ§Ã£o "ðŸ“‹ Unidades Cadastradas"
- âœ… Adicionado: Tabela com lista de unidades
- âœ… Adicionado: BotÃµes de aÃ§Ã£o (Editar, Vincular, Excluir)
- âœ… Atualizado: Texto de ajuda do campo CNPJ

#### 2. `js/settings/unidade.js`

**MudanÃ§as:**

- âŒ Removido: MÃ©todo `validarCNPJ()` (validaÃ§Ã£o manual)
- âœ… Alterado: Suporte a mÃºltiplas unidades (array)
- âœ… Adicionado: `renderizarLista()` - Renderiza tabela
- âœ… Adicionado: `editarUnidade(id)` - Edita unidade
- âœ… Adicionado: `vincularUnidadeAoUsuario(id)` - Vincula ao usuÃ¡rio
- âœ… Adicionado: `excluirUnidade(id)` - Remove unidade
- âœ… Adicionado: `getTodasUnidades()` - Busca todas as unidades
- âœ… Adicionado: `adicionarUnidade()` - Adiciona nova unidade
- âœ… Adicionado: `atualizarUnidade()` - Atualiza unidade
- âœ… Adicionado: `removerUnidade()` - Remove do array
- âœ… Adicionado: `salvarTodasUnidades()` - Salva no IndexedDB
- âœ… Adicionado: ValidaÃ§Ã£o de CNPJ duplicado

#### 3. `js/app.js`

**MudanÃ§as em `salvarEmpenho()`:**

- âœ… Mantido: Alerta se CNPJ Fornecedor = CNPJ Unidade
- âœ… Adicionado: Alerta se nÃ£o hÃ¡ unidade configurada
- âœ… Melhorado: Mensagens mais claras

**MudanÃ§as em `salvarNotaFiscal()`:**

- âŒ Removido: OpÃ§Ã£o de continuar com CNPJ diferente
- âœ… Adicionado: **BLOQUEIO TOTAL** se CNPJ DestinatÃ¡rio â‰  CNPJ Unidade
- âœ… Adicionado: **BLOQUEIO TOTAL** se nÃ£o hÃ¡ unidade vinculada
- âœ… Adicionado: Mensagens detalhadas com orientaÃ§Ãµes

---

## ðŸ“¦ Estrutura de Dados - IndexedDB

### Store: `config`

**Registro 1: Unidade Principal (compatibilidade)**

```javascript
{
  id: "unidadeOrcamentaria",
  razaoSocial: "Instituto Federal Baiano - Campus SB",
  cnpj: "10.123.456/0001-78",
  cnpjNumeros: "10123456000178",
  ug: "158123",
  endereco: "Rua...",
  municipio: "Senhor do Bonfim",
  uf: "BA",
  dataAtualizacao: "2025-11-03T..."
}
```

**Registro 2: Todas as Unidades (novo)**

```javascript
{
  id: "todasUnidades",
  unidades: [
    {
      id: "unidade_1730634567890_abc123",
      razaoSocial: "IF Baiano - Campus SB - UG Principal",
      cnpj: "10.123.456/0001-78",
      cnpjNumeros: "10123456000178",
      ug: "158123",
      // ... demais campos
      ativa: true
    },
    {
      id: "unidade_1730634567891_def456",
      razaoSocial: "IF Baiano - Campus SB - Fazenda",
      cnpj: "10.123.456/0002-59",
      cnpjNumeros: "10123456000259",
      ug: "158124",
      // ... demais campos
      ativa: true
    }
  ],
  dataAtualizacao: "2025-11-03T..."
}
```

---

## âš ï¸ Pontos de AtenÃ§Ã£o

### 1. Compatibilidade

- Sistema mantÃ©m estrutura antiga (`unidadeOrcamentaria`)
- Novo sistema de mÃºltiplas unidades (`todasUnidades`)
- Ambos coexistem para garantir compatibilidade

### 2. Primeiro Cadastro

- Se nÃ£o hÃ¡ unidades, a primeira unidade cadastrada Ã© automaticamente vinculada
- UsuÃ¡rio pode alterar vinculaÃ§Ã£o a qualquer momento

### 3. ExclusÃ£o de Unidade

- Se excluir a unidade vinculada, limpa o vÃ­nculo
- UsuÃ¡rio precisarÃ¡ vincular outra unidade antes de cadastrar NF

### 4. ValidaÃ§Ã£o de CNPJ

- CNPJ Ã© validado no momento do cadastro (NE/NF)
- NÃ£o hÃ¡ mais validaÃ§Ã£o manual prÃ©via
- Algoritmo oficial da Receita Federal Ã© utilizado

---

## ðŸŽ“ OrientaÃ§Ãµes para UsuÃ¡rios

### Como Cadastrar MÃºltiplas Unidades?

1. Acesse: **ConfiguraÃ§Ãµes** â†’ **Unidade OrÃ§amentÃ¡ria**
2. Preencha o formulÃ¡rio com dados da primeira unidade
3. Clique em **"ðŸ’¾ Salvar Unidade"**
4. FormulÃ¡rio serÃ¡ limpo automaticamente
5. Preencha com dados da segunda unidade
6. Salve novamente
7. Repita para todas as unidades

### Como Vincular Unidade ao Meu UsuÃ¡rio?

1. Na lista de **"ðŸ“‹ Unidades Cadastradas"**
2. Localize a unidade que vocÃª gerencia
3. Clique no botÃ£o **"ðŸ”— Vincular ao UsuÃ¡rio"**
4. Confirme a vinculaÃ§Ã£o
5. âœ… Pronto! Todas as NE e NF serÃ£o validadas com este CNPJ

### O que fazer se NF for Rejeitada?

**CenÃ¡rio:** NF nÃ£o estÃ¡ sendo aceita por CNPJ diferente

**SoluÃ§Ãµes:**

1. **Verifique se a NF Ã© realmente para sua unidade**
   - Confira o CNPJ do destinatÃ¡rio no PDF
   - Compare com o CNPJ da sua unidade

2. **Se a NF for de outra unidade do campus:**
   - Cadastre a outra unidade em: ConfiguraÃ§Ãµes â†’ Unidade OrÃ§amentÃ¡ria
   - Vincule a nova unidade ao seu usuÃ¡rio
   - Tente cadastrar a NF novamente

3. **Se a NF estiver errada:**
   - Entre em contato com o fornecedor
   - Solicite NF com CNPJ correto

---

## ðŸ“ˆ BenefÃ­cios das MudanÃ§as

### ðŸŽ¯ PrecisÃ£o

- âœ… Elimina erros de cadastro de NF errada
- âœ… Garante que NF seja para a unidade correta
- âœ… ValidaÃ§Ã£o automÃ¡tica e transparente

### ðŸ”’ SeguranÃ§a

- âœ… ImpossÃ­vel cadastrar NF de outra unidade
- âœ… Rastreamento claro de qual unidade cada documento pertence
- âœ… Controle por usuÃ¡rio

### ðŸ“Š OrganizaÃ§Ã£o

- âœ… VisÃ£o clara de todas as unidades cadastradas
- âœ… FÃ¡cil identificaÃ§Ã£o da unidade vinculada
- âœ… GestÃ£o centralizada

### âš¡ EficiÃªncia

- âœ… NÃ£o precisa validar CNPJ manualmente
- âœ… ValidaÃ§Ã£o acontece automaticamente
- âœ… Menos cliques, mais produtividade

---

## ðŸ”„ MigraÃ§Ã£o de Dados

**Para instalaÃ§Ãµes existentes:**

1. Unidade orÃ§amentÃ¡ria antiga serÃ¡ preservada
2. Na primeira ediÃ§Ã£o, serÃ¡ migrada para o novo sistema
3. UsuÃ¡rios existentes manterÃ£o sua unidade vinculada
4. Compatibilidade total garantida

---

**VersÃ£o:** 1.2.3  
**Data:** 03/11/2025  
**Autor:** Sistema SINGEM  
**Status:** âœ… Implementado e Testado
