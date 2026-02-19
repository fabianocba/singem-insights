# 🏢 Validação de CNPJ e Múltiplas Unidades Orçamentárias

## 📋 Resumo das Implementações

Este documento descreve as melhorias implementadas no sistema de gerenciamento de Unidades Orçamentárias e validação de CNPJ em Notas de Empenho e Notas Fiscais.

---

## ✨ Funcionalidades Implementadas

### 1. Sistema de Múltiplas Unidades

#### **Antes:**

- Sistema permitia cadastrar apenas uma unidade orçamentária
- Não havia lista de unidades cadastradas
- Não era possível vincular unidades específicas aos usuários

#### **Depois:**

- ✅ Sistema suporta **múltiplas unidades orçamentárias**
- ✅ Lista todas as unidades cadastradas em tabela
- ✅ Permite **vincular unidade específica ao usuário logado**
- ✅ Cada usuário pode ter sua própria unidade vinculada

### 2. Validação Automática de CNPJ

#### **Removido:**

- ❌ Botão "Validar CNPJ" manual removido da interface

#### **Implementado:**

- ✅ Validação automática ao cadastrar **Nota de Empenho (NE)**
- ✅ Validação automática ao cadastrar **Nota Fiscal (NF)**
- ✅ **Bloqueio total** de NF com CNPJ de destinatário diferente da unidade

---

## 🔒 Regras de Validação

### Nota de Empenho (NE)

**Validação do CNPJ do Fornecedor:**

1. ⚠️ **Alerta** se CNPJ do Fornecedor = CNPJ da Unidade
   - Indica possível erro
   - Permite continuar após confirmação
   - Mensagem clara com dados da divergência

2. ⚠️ **Alerta** se não há unidade configurada
   - Recomenda cadastrar unidade
   - Permite continuar após confirmação

### Nota Fiscal (NF)

**Validação do CNPJ do Destinatário/Beneficiário:**

1. ❌ **BLOQUEIO TOTAL** se CNPJ Destinatário ≠ CNPJ da Unidade
   - NÃO permite cadastrar a NF
   - Mensagem detalhada explicando o motivo
   - Orienta sobre próximos passos

2. ❌ **BLOQUEIO TOTAL** se não há unidade vinculada
   - Exige configuração de unidade antes
   - Orienta passo a passo para configurar

**Mensagens de Bloqueio:**

```
❌ CNPJ DO DESTINATÁRIO INVÁLIDO!

O CNPJ do Destinatário/Beneficiário da Nota Fiscal é diferente
do CNPJ da Unidade Orçamentária vinculada ao seu usuário.

CNPJ da Unidade: 10.123.456/0001-78
Unidade: Instituto Federal Baiano - Campus Senhor do Bonfim

CNPJ Destinatário NF: 10.987.654/0001-32

⚠️ Notas Fiscais com CNPJ de destinatário diferente da unidade
logada NÃO podem ser cadastradas.

Verifique:
1. Se a NF é realmente para esta unidade
2. Se há outra unidade cadastrada com este CNPJ
3. Se você precisa vincular outra unidade ao seu usuário
```

---

## 📊 Nova Interface - Lista de Unidades

### Tela: Configurações → Unidade Orçamentária

**Seção: "📋 Unidades Cadastradas"**

Tabela com colunas:

- **Razão Social**: Nome completo da unidade
- **CNPJ**: CNPJ formatado
- **UG**: Unidade Gestora
- **Município/UF**: Localização
- **Ações**: Botões de ação

**Botões de Ação:**

1. **✏️ Editar**: Carrega dados no formulário para edição
2. **🔗 Vincular ao Usuário**: Vincula unidade ao usuário logado
3. **🗑️ Excluir**: Remove unidade (com confirmação)

---

## 🔗 Fluxo de Vinculação de Unidade

```
1. Usuário acessa: Configurações → Unidade Orçamentária
        ↓
2. Visualiza lista de unidades cadastradas
        ↓
3. Clica em "🔗 Vincular ao Usuário" na unidade desejada
        ↓
4. Sistema mostra confirmação:
   - Nome da unidade
   - CNPJ
   - Nome do usuário logado
        ↓
5. Usuário confirma
        ↓
6. Sistema vincula unidade ao usuário
        ↓
7. Atualiza tela de login com dados da unidade
        ↓
8. ✅ Todas as NE e NF serão validadas com este CNPJ!
```

---

## 🎯 Caso de Uso: Campus com Múltiplas UGs

### Cenário:

**IF Baiano - Campus Senhor do Bonfim** possui 3 Unidades Gestoras diferentes:

1. **UG Principal**: 158123 - CNPJ: 10.123.456/0001-78
2. **UG Fazenda Experimental**: 158124 - CNPJ: 10.123.456/0002-59
3. **UG Projeto Especial**: 158125 - CNPJ: 10.123.456/0003-30

### Solução:

1. **Cadastrar todas as 3 unidades** na tela de Unidades Orçamentárias
2. Cada usuário vincula a UG que gerencia:
   - Diretor de Patrimônio → UG Principal
   - Coordenador da Fazenda → UG Fazenda
   - Gestor do Projeto → UG Projeto

3. **Resultado:**
   - Cada usuário só consegue cadastrar NFs para sua UG vinculada
   - Impossível cadastrar NF de outra unidade por engano
   - Relatórios separados por unidade

---

## 🛠️ Alterações Técnicas

### Arquivos Modificados

#### 1. `config/configuracoes.html`

**Mudanças:**

- ❌ Removido: Botão "✓ Validar CNPJ"
- ✅ Adicionado: Seção "📋 Unidades Cadastradas"
- ✅ Adicionado: Tabela com lista de unidades
- ✅ Adicionado: Botões de ação (Editar, Vincular, Excluir)
- ✅ Atualizado: Texto de ajuda do campo CNPJ

#### 2. `js/settings/unidade.js`

**Mudanças:**

- ❌ Removido: Método `validarCNPJ()` (validação manual)
- ✅ Alterado: Suporte a múltiplas unidades (array)
- ✅ Adicionado: `renderizarLista()` - Renderiza tabela
- ✅ Adicionado: `editarUnidade(id)` - Edita unidade
- ✅ Adicionado: `vincularUnidadeAoUsuario(id)` - Vincula ao usuário
- ✅ Adicionado: `excluirUnidade(id)` - Remove unidade
- ✅ Adicionado: `getTodasUnidades()` - Busca todas as unidades
- ✅ Adicionado: `adicionarUnidade()` - Adiciona nova unidade
- ✅ Adicionado: `atualizarUnidade()` - Atualiza unidade
- ✅ Adicionado: `removerUnidade()` - Remove do array
- ✅ Adicionado: `salvarTodasUnidades()` - Salva no IndexedDB
- ✅ Adicionado: Validação de CNPJ duplicado

#### 3. `js/app.js`

**Mudanças em `salvarEmpenho()`:**

- ✅ Mantido: Alerta se CNPJ Fornecedor = CNPJ Unidade
- ✅ Adicionado: Alerta se não há unidade configurada
- ✅ Melhorado: Mensagens mais claras

**Mudanças em `salvarNotaFiscal()`:**

- ❌ Removido: Opção de continuar com CNPJ diferente
- ✅ Adicionado: **BLOQUEIO TOTAL** se CNPJ Destinatário ≠ CNPJ Unidade
- ✅ Adicionado: **BLOQUEIO TOTAL** se não há unidade vinculada
- ✅ Adicionado: Mensagens detalhadas com orientações

---

## 📦 Estrutura de Dados - IndexedDB

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

## ⚠️ Pontos de Atenção

### 1. Compatibilidade

- Sistema mantém estrutura antiga (`unidadeOrcamentaria`)
- Novo sistema de múltiplas unidades (`todasUnidades`)
- Ambos coexistem para garantir compatibilidade

### 2. Primeiro Cadastro

- Se não há unidades, a primeira unidade cadastrada é automaticamente vinculada
- Usuário pode alterar vinculação a qualquer momento

### 3. Exclusão de Unidade

- Se excluir a unidade vinculada, limpa o vínculo
- Usuário precisará vincular outra unidade antes de cadastrar NF

### 4. Validação de CNPJ

- CNPJ é validado no momento do cadastro (NE/NF)
- Não há mais validação manual prévia
- Algoritmo oficial da Receita Federal é utilizado

---

## 🎓 Orientações para Usuários

### Como Cadastrar Múltiplas Unidades?

1. Acesse: **Configurações** → **Unidade Orçamentária**
2. Preencha o formulário com dados da primeira unidade
3. Clique em **"💾 Salvar Unidade"**
4. Formulário será limpo automaticamente
5. Preencha com dados da segunda unidade
6. Salve novamente
7. Repita para todas as unidades

### Como Vincular Unidade ao Meu Usuário?

1. Na lista de **"📋 Unidades Cadastradas"**
2. Localize a unidade que você gerencia
3. Clique no botão **"🔗 Vincular ao Usuário"**
4. Confirme a vinculação
5. ✅ Pronto! Todas as NE e NF serão validadas com este CNPJ

### O que fazer se NF for Rejeitada?

**Cenário:** NF não está sendo aceita por CNPJ diferente

**Soluções:**

1. **Verifique se a NF é realmente para sua unidade**
   - Confira o CNPJ do destinatário no PDF
   - Compare com o CNPJ da sua unidade

2. **Se a NF for de outra unidade do campus:**
   - Cadastre a outra unidade em: Configurações → Unidade Orçamentária
   - Vincule a nova unidade ao seu usuário
   - Tente cadastrar a NF novamente

3. **Se a NF estiver errada:**
   - Entre em contato com o fornecedor
   - Solicite NF com CNPJ correto

---

## 📈 Benefícios das Mudanças

### 🎯 Precisão

- ✅ Elimina erros de cadastro de NF errada
- ✅ Garante que NF seja para a unidade correta
- ✅ Validação automática e transparente

### 🔒 Segurança

- ✅ Impossível cadastrar NF de outra unidade
- ✅ Rastreamento claro de qual unidade cada documento pertence
- ✅ Controle por usuário

### 📊 Organização

- ✅ Visão clara de todas as unidades cadastradas
- ✅ Fácil identificação da unidade vinculada
- ✅ Gestão centralizada

### ⚡ Eficiência

- ✅ Não precisa validar CNPJ manualmente
- ✅ Validação acontece automaticamente
- ✅ Menos cliques, mais produtividade

---

## 🔄 Migração de Dados

**Para instalações existentes:**

1. Unidade orçamentária antiga será preservada
2. Na primeira edição, será migrada para o novo sistema
3. Usuários existentes manterão sua unidade vinculada
4. Compatibilidade total garantida

---

**Versão:** 1.2.3  
**Data:** 03/11/2025  
**Autor:** Sistema IFDESK  
**Status:** ✅ Implementado e Testado
