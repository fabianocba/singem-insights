# 🖼️ Sistema de Logomarcas por Unidade - SINGEM

## 📋 Resumo da Implementação

Sistema completo de upload e exibição de logomarcas personalizadas para cada Unidade Orçamentária cadastrada.

---

## ✨ Funcionalidades Implementadas

### 1. **Upload de Logomarca**

#### Tela de Cadastro (Configurações → Unidade Orçamentária)

**Novo Campo:**

```html
🖼️ Logomarca da Unidade [Escolher arquivo...] Formatos aceitos: PNG, JPG, SVG. Tamanho máximo: 2MB. Recomendado:
200x200px [Preview da imagem] [🗑️ Remover Logomarca]
```

**Validações:**

- ✅ Formatos permitidos: `.png`, `.jpg`, `.jpeg`, `.svg`
- ✅ Tamanho máximo: 2MB
- ✅ Preview em tempo real ao selecionar arquivo
- ✅ Possibilidade de remover antes de salvar

### 2. **Armazenamento**

**Formato:** Base64 (armazenado no IndexedDB)

- Imagem convertida para string base64
- Salva junto com dados da unidade
- Sem necessidade de servidor de arquivos

**Estrutura no IndexedDB:**

```javascript
{
  id: "unidade_1730634567890_abc123",
  razaoSocial: "IF Baiano - Campus Senhor do Bonfim",
  cnpj: "10.123.456/0001-78",
  cnpjNumeros: "10123456000178",
  ug: "158123",
  logomarca: "data:image/png;base64,iVBORw0KGgoAAAANS...", // ← Base64
  // ... demais campos
}
```

### 3. **Exibição da Logomarca**

#### Local 1: **Lista de Unidades Cadastradas**

**Tabela com coluna "Logo":**

```
┌──────┬────────────────────┬────────────┬────┬──────────┬──────────┐
│ Logo │ Razão Social       │ CNPJ       │ UG │ Mun./UF  │ Ações    │
├──────┼────────────────────┼────────────┼────┼──────────┼──────────┤
│ [🖼] │ IF Baiano - SB     │ 10.123...  │158 │ SB/BA    │ ✏️ 🔗 🗑️ │
│ 🏛️   │ IF Baiano - Feira  │ 10.987...  │159 │ Feira/BA │ ✏️ 🔗 🗑️ │
└──────┴────────────────────┴────────────┴────┴──────────┴──────────┘
```

- Se tem logomarca: exibe imagem (40x40px)
- Se não tem: exibe emoji 🏛️

#### Local 2: **Tela de Login**

**Antes (sem logomarca):**

```
┌────────────────────────────────┐
│            🏛️                  │  ← Emoji fixo
│   Bem-vindo(a) ao IF Baiano    │
│   CNPJ: 10.123.456/0001-78     │
└────────────────────────────────┘
```

**Depois (com logomarca):**

```
┌────────────────────────────────┐
│          [🖼️ LOGO]            │  ← Logo da unidade vinculada
│   Bem-vindo(a) ao IF Baiano    │
│   CNPJ: 10.123.456/0001-78     │
└────────────────────────────────┘
```

- Tamanho máximo: 120x120px
- Centralizado
- Substitui o emoji padrão

#### Local 3: **Header da Aplicação**

**Antes:**

```
📋 Controle de Material
IF Baiano - Campus
```

**Depois (com logomarca):**

```
[🖼️] Controle de Material  ← Logo 40px de altura + texto
IF Baiano - Campus Senhor do Bonfim
```

- Logo ao lado do título
- Altura fixa: 40px
- Alinhamento vertical

---

## 🔄 Fluxo de Uso

### Cadastrar Unidade com Logomarca

1. **Configurações → Unidade Orçamentária**
2. Preencher dados da unidade (Razão Social, CNPJ, etc.)
3. Clicar em **"Escolher arquivo"** no campo Logomarca
4. Selecionar imagem (PNG, JPG ou SVG)
5. ✅ **Preview aparece automaticamente**
6. (Opcional) Clicar em "🗑️ Remover Logomarca" para trocar
7. Clicar em **"💾 Salvar Unidade"**
8. ✅ **Unidade aparece na lista COM a logo!**

### Vincular Unidade ao Usuário

1. Na lista de unidades, localizar a unidade desejada
2. Clicar em **"🔗 Vincular ao Usuário"**
3. Confirmar vinculação
4. ✅ **Logo aparece na tela de login e no header!**

### Editar Logomarca de Unidade Existente

1. Na lista, clicar em **"✏️ Editar"** na unidade
2. Formulário é preenchido com dados atuais
3. Se houver logo, aparece no preview
4. Para trocar:
   - Clicar em "🗑️ Remover Logomarca"
   - Escolher novo arquivo
5. Salvar

---

## 🎨 Recomendações de Design

### Tamanho e Formato

**Dimensões Recomendadas:**

- Ideal: 200x200px (quadrado)
- Mínimo: 100x100px
- Máximo arquivo: 2MB

**Formatos:**

1. **PNG** (recomendado)
   - Suporta transparência
   - Melhor para logos com fundo transparente
2. **SVG** (vetorial)
   - Escala perfeitamente
   - Tamanho de arquivo pequeno
   - Ideal para logos simples
3. **JPG**
   - Sem transparência
   - Bom para fotos/imagens complexas

### Estilo Visual

**Boas Práticas:**

- ✅ Fundo transparente (PNG/SVG)
- ✅ Logo centralizado
- ✅ Cores institucionais
- ✅ Boa legibilidade
- ✅ Proporção quadrada ou próxima

**Evitar:**

- ❌ Logos muito alongadas (horizontal ou vertical)
- ❌ Texto muito pequeno
- ❌ Muitos detalhes (simplificar)
- ❌ Fundos coloridos (preferir transparente)

---

## 💾 Armazenamento e Performance

### IndexedDB

**Vantagens:**

- ✅ Totalmente offline
- ✅ Não precisa de servidor
- ✅ Rápido acesso
- ✅ Sincronizado com dados da unidade

**Limitações:**

- ⚠️ Base64 aumenta ~33% o tamanho
- ⚠️ Limite de 2MB por imagem
- ⚠️ Quota total do IndexedDB (~50MB típico)

### Performance

**Otimizações Implementadas:**

- Carregamento lazy da logo
- Cache no objeto unidade em memória
- Preview antes de salvar (evita salvar/carregar desnecessário)

**Recomendações:**

- Usar logos otimizadas (ferramentas como TinyPNG)
- Preferir SVG quando possível (menor tamanho)
- Evitar logos muito grandes (max 200x200px)

---

## 🔧 Detalhes Técnicos

### Funções Implementadas (unidade.js)

```javascript
// Upload e preview
handleLogomarcaUpload(event); // Processa arquivo selecionado
fileToBase64(file); // Converte para base64
mostrarPreviewLogomarca(base64); // Exibe preview
removerLogomarca(); // Remove preview e limpa campo

// Armazenamento
salvar(); // Inclui logomarca ao salvar
renderizarLista(); // Exibe logo na tabela
editarUnidade(id); // Carrega logo ao editar
```

### Funções Atualizadas (app.js)

```javascript
carregarDadosUnidade()
  ↓
  1. Carrega unidade vinculada
  2. Atualiza tela de login COM logo
  3. Atualiza header COM logo
  4. Substitui emoji padrão por imagem
```

### Estrutura HTML

```html
<!-- Formulário de Cadastro -->
<input type="file" id="logomarcaUnidade" accept="image/png,image/jpeg,image/jpg,image/svg+xml" />

<!-- Preview -->
<div id="previewLogomarca">
  <img id="imgPreviewLogomarca" src="" />
  <button id="btnRemoverLogomarca">🗑️ Remover</button>
</div>

<!-- Tabela -->
<td>
  <img src="data:image/png;base64,..." style="width:40px;height:40px;" />
</td>

<!-- Login -->
<div class="login-logo">
  <img src="data:image/png;base64,..." style="max-width:120px;" />
</div>
```

---

## 📱 Casos de Uso

### Caso 1: Campus com Múltiplos Campi

**Cenário:**

```
IF Baiano possui 10 campi, cada um com:
- Logo própria do campus
- CNPJ próprio
- Identidade visual única
```

**Solução:**

1. Cadastrar cada campus como unidade
2. Fazer upload da logo de cada campus
3. Cada usuário vincula seu campus
4. Sistema exibe logo do campus do usuário logado

**Resultado:**

- ✅ Identidade visual preservada
- ✅ Usuários identificam facilmente seu campus
- ✅ Documentos/relatórios com logo correta

### Caso 2: Reitoria + Campi

**Cenário:**

```
- Reitoria: Logo institucional geral
- Campus A: Logo do campus A
- Campus B: Logo do campus B
```

**Configuração:**

- Usuários da Reitoria → Logo IF Baiano geral
- Usuários do Campus A → Logo Campus A
- Usuários do Campus B → Logo Campus B

### Caso 3: Projeto Especial

**Cenário:**

```
Projeto financiado com logo específica do projeto
CNPJ próprio do projeto
```

**Solução:**

- Cadastrar unidade "Projeto X"
- Logo personalizada do projeto
- Validação de NF específica para CNPJ do projeto

---

## 🐛 Resolução de Problemas

### Logo não aparece após salvar

**Verificar:**

1. ✅ Arquivo selecionado antes de salvar?
2. ✅ Preview apareceu antes de salvar?
3. ✅ Formato permitido (PNG/JPG/SVG)?
4. ✅ Tamanho menor que 2MB?

**Solução:**

- Recarregar página (F5)
- Verificar console do navegador (F12)
- Editar unidade e fazer novo upload

### Logo muito grande ou distorcida

**Causa:** Imagem com proporção inadequada

**Solução:**

1. Editar imagem externamente (Photoshop, GIMP, etc.)
2. Redimensionar para 200x200px
3. Salvar como PNG com fundo transparente
4. Fazer novo upload

### Logo não muda na tela de login

**Causa:** Unidade não está vinculada ao usuário

**Solução:**

1. Ir em Configurações → Unidade Orçamentária
2. Na lista, clicar "🔗 Vincular ao Usuário"
3. Fazer logout e login novamente

### Arquivo muito grande

**Reduzir tamanho:**

1. Usar ferramenta online: TinyPNG, Compressor.io
2. Reduzir dimensões (max 200x200px)
3. Se PNG, converter para JPG (perde transparência)
4. Se possível, usar SVG (vetorial, menor)

---

## 📊 Benefícios da Implementação

### 🎨 **Identidade Visual**

- Cada unidade mantém sua identidade
- Sistema personalizado por campus/projeto
- Profissionalismo nas telas

### 👥 **Experiência do Usuário**

- Identificação imediata da unidade
- Interface mais amigável
- Senso de pertencimento

### 📄 **Documentação**

- Preparação para relatórios com logo
- Futuras exportações em PDF com brasão
- Notas/comprovantes personalizados

### 🔒 **Organização**

- Separação visual clara entre unidades
- Menos confusão em ambientes multi-campus
- Auditoria facilitada

---

## 🚀 Próximos Passos (Futuro)

### Possíveis Melhorias

1. **Editor de Imagem Integrado**
   - Recortar/redimensionar dentro do sistema
   - Ajustar contraste/brilho
   - Filtros

2. **Múltiplas Logos**
   - Logo principal (tela de login)
   - Logo secundária (relatórios)
   - Favicon personalizado

3. **Galeria de Templates**
   - Logos pré-definidas do IF
   - Templates por campus
   - Download de pacote oficial

4. **Relatórios com Logo**
   - PDF de empenhos com logo
   - Relatórios de conferência com brasão
   - Cabeçalho personalizado

---

**Versão:** 1.2.4  
**Data:** 03/11/2025  
**Implementado por:** Sistema SINGEM  
**Status:** ✅ Concluído e Testado
