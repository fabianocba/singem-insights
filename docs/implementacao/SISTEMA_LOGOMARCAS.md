# ðŸ–¼ï¸ Sistema de Logomarcas por Unidade - SINGEM

## ðŸ“‹ Resumo da ImplementaÃ§Ã£o

Sistema completo de upload e exibiÃ§Ã£o de logomarcas personalizadas para cada Unidade OrÃ§amentÃ¡ria cadastrada.

---

## âœ¨ Funcionalidades Implementadas

### 1. **Upload de Logomarca**

#### Tela de Cadastro (ConfiguraÃ§Ãµes â†’ Unidade OrÃ§amentÃ¡ria)

**Novo Campo:**

```html
ðŸ–¼ï¸ Logomarca da Unidade [Escolher arquivo...] Formatos aceitos: PNG, JPG, SVG. Tamanho mÃ¡ximo: 2MB. Recomendado:
200x200px [Preview da imagem] [ðŸ—‘ï¸ Remover Logomarca]
```

**ValidaÃ§Ãµes:**

- âœ… Formatos permitidos: `.png`, `.jpg`, `.jpeg`, `.svg`
- âœ… Tamanho mÃ¡ximo: 2MB
- âœ… Preview em tempo real ao selecionar arquivo
- âœ… Possibilidade de remover antes de salvar

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
  logomarca: "data:image/png;base64,iVBORw0KGgoAAAANS...", // â† Base64
  // ... demais campos
}
```

### 3. **ExibiÃ§Ã£o da Logomarca**

#### Local 1: **Lista de Unidades Cadastradas**

**Tabela com coluna "Logo":**

```
â”Œâ”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ Logo â”‚ RazÃ£o Social       â”‚ CNPJ       â”‚ UG â”‚ Mun./UF  â”‚ AÃ§Ãµes    â”‚
â”œâ”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¤
â”‚ [ðŸ–¼] â”‚ IF Baiano - SB     â”‚ 10.123...  â”‚158 â”‚ SB/BA    â”‚ âœï¸ ðŸ”— ðŸ—‘ï¸ â”‚
â”‚ ðŸ›ï¸   â”‚ IF Baiano - Feira  â”‚ 10.987...  â”‚159 â”‚ Feira/BA â”‚ âœï¸ ðŸ”— ðŸ—‘ï¸ â”‚
â””â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

- Se tem logomarca: exibe imagem (40x40px)
- Se nÃ£o tem: exibe emoji ðŸ›ï¸

#### Local 2: **Tela de Login**

**Antes (sem logomarca):**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚            ðŸ›ï¸                  â”‚  â† Emoji fixo
â”‚   Bem-vindo(a) ao IF Baiano    â”‚
â”‚   CNPJ: 10.123.456/0001-78     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

**Depois (com logomarca):**

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚          [ðŸ–¼ï¸ LOGO]            â”‚  â† Logo da unidade vinculada
â”‚   Bem-vindo(a) ao IF Baiano    â”‚
â”‚   CNPJ: 10.123.456/0001-78     â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

- Tamanho mÃ¡ximo: 120x120px
- Centralizado
- Substitui o emoji padrÃ£o

#### Local 3: **Header da AplicaÃ§Ã£o**

**Antes:**

```
ðŸ“‹ Controle de Material
IF Baiano - Campus
```

**Depois (com logomarca):**

```
[ðŸ–¼ï¸] Controle de Material  â† Logo 40px de altura + texto
IF Baiano - Campus Senhor do Bonfim
```

- Logo ao lado do tÃ­tulo
- Altura fixa: 40px
- Alinhamento vertical

---

## ðŸ”„ Fluxo de Uso

### Cadastrar Unidade com Logomarca

1. **ConfiguraÃ§Ãµes â†’ Unidade OrÃ§amentÃ¡ria**
2. Preencher dados da unidade (RazÃ£o Social, CNPJ, etc.)
3. Clicar em **"Escolher arquivo"** no campo Logomarca
4. Selecionar imagem (PNG, JPG ou SVG)
5. âœ… **Preview aparece automaticamente**
6. (Opcional) Clicar em "ðŸ—‘ï¸ Remover Logomarca" para trocar
7. Clicar em **"ðŸ’¾ Salvar Unidade"**
8. âœ… **Unidade aparece na lista COM a logo!**

### Vincular Unidade ao UsuÃ¡rio

1. Na lista de unidades, localizar a unidade desejada
2. Clicar em **"ðŸ”— Vincular ao UsuÃ¡rio"**
3. Confirmar vinculaÃ§Ã£o
4. âœ… **Logo aparece na tela de login e no header!**

### Editar Logomarca de Unidade Existente

1. Na lista, clicar em **"âœï¸ Editar"** na unidade
2. FormulÃ¡rio Ã© preenchido com dados atuais
3. Se houver logo, aparece no preview
4. Para trocar:
   - Clicar em "ðŸ—‘ï¸ Remover Logomarca"
   - Escolher novo arquivo
5. Salvar

---

## ðŸŽ¨ RecomendaÃ§Ãµes de Design

### Tamanho e Formato

**DimensÃµes Recomendadas:**

- Ideal: 200x200px (quadrado)
- MÃ­nimo: 100x100px
- MÃ¡ximo arquivo: 2MB

**Formatos:**

1. **PNG** (recomendado)
   - Suporta transparÃªncia
   - Melhor para logos com fundo transparente
2. **SVG** (vetorial)
   - Escala perfeitamente
   - Tamanho de arquivo pequeno
   - Ideal para logos simples
3. **JPG**
   - Sem transparÃªncia
   - Bom para fotos/imagens complexas

### Estilo Visual

**Boas PrÃ¡ticas:**

- âœ… Fundo transparente (PNG/SVG)
- âœ… Logo centralizado
- âœ… Cores institucionais
- âœ… Boa legibilidade
- âœ… ProporÃ§Ã£o quadrada ou prÃ³xima

**Evitar:**

- âŒ Logos muito alongadas (horizontal ou vertical)
- âŒ Texto muito pequeno
- âŒ Muitos detalhes (simplificar)
- âŒ Fundos coloridos (preferir transparente)

---

## ðŸ’¾ Armazenamento e Performance

### IndexedDB

**Vantagens:**

- âœ… Totalmente offline
- âœ… NÃ£o precisa de servidor
- âœ… RÃ¡pido acesso
- âœ… Sincronizado com dados da unidade

**LimitaÃ§Ãµes:**

- âš ï¸ Base64 aumenta ~33% o tamanho
- âš ï¸ Limite de 2MB por imagem
- âš ï¸ Quota total do IndexedDB (~50MB tÃ­pico)

### Performance

**OtimizaÃ§Ãµes Implementadas:**

- Carregamento lazy da logo
- Cache no objeto unidade em memÃ³ria
- Preview antes de salvar (evita salvar/carregar desnecessÃ¡rio)

**RecomendaÃ§Ãµes:**

- Usar logos otimizadas (ferramentas como TinyPNG)
- Preferir SVG quando possÃ­vel (menor tamanho)
- Evitar logos muito grandes (max 200x200px)

---

## ðŸ”§ Detalhes TÃ©cnicos

### FunÃ§Ãµes Implementadas (unidade.js)

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

### FunÃ§Ãµes Atualizadas (app.js)

```javascript
carregarDadosUnidade()
  â†“
  1. Carrega unidade vinculada
  2. Atualiza tela de login COM logo
  3. Atualiza header COM logo
  4. Substitui emoji padrÃ£o por imagem
```

### Estrutura HTML

```html
<!-- FormulÃ¡rio de Cadastro -->
<input type="file" id="logomarcaUnidade" accept="image/png,image/jpeg,image/jpg,image/svg+xml" />

<!-- Preview -->
<div id="previewLogomarca">
  <img id="imgPreviewLogomarca" src="" />
  <button id="btnRemoverLogomarca">ðŸ—‘ï¸ Remover</button>
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

## ðŸ“± Casos de Uso

### Caso 1: Campus com MÃºltiplos Campi

**CenÃ¡rio:**

```
IF Baiano possui 10 campi, cada um com:
- Logo prÃ³pria do campus
- CNPJ prÃ³prio
- Identidade visual Ãºnica
```

**SoluÃ§Ã£o:**

1. Cadastrar cada campus como unidade
2. Fazer upload da logo de cada campus
3. Cada usuÃ¡rio vincula seu campus
4. Sistema exibe logo do campus do usuÃ¡rio logado

**Resultado:**

- âœ… Identidade visual preservada
- âœ… UsuÃ¡rios identificam facilmente seu campus
- âœ… Documentos/relatÃ³rios com logo correta

### Caso 2: Reitoria + Campi

**CenÃ¡rio:**

```
- Reitoria: Logo institucional geral
- Campus A: Logo do campus A
- Campus B: Logo do campus B
```

**ConfiguraÃ§Ã£o:**

- UsuÃ¡rios da Reitoria â†’ Logo IF Baiano geral
- UsuÃ¡rios do Campus A â†’ Logo Campus A
- UsuÃ¡rios do Campus B â†’ Logo Campus B

### Caso 3: Projeto Especial

**CenÃ¡rio:**

```
Projeto financiado com logo especÃ­fica do projeto
CNPJ prÃ³prio do projeto
```

**SoluÃ§Ã£o:**

- Cadastrar unidade "Projeto X"
- Logo personalizada do projeto
- ValidaÃ§Ã£o de NF especÃ­fica para CNPJ do projeto

---

## ðŸ› ResoluÃ§Ã£o de Problemas

### Logo nÃ£o aparece apÃ³s salvar

**Verificar:**

1. âœ… Arquivo selecionado antes de salvar?
2. âœ… Preview apareceu antes de salvar?
3. âœ… Formato permitido (PNG/JPG/SVG)?
4. âœ… Tamanho menor que 2MB?

**SoluÃ§Ã£o:**

- Recarregar pÃ¡gina (F5)
- Verificar console do navegador (F12)
- Editar unidade e fazer novo upload

### Logo muito grande ou distorcida

**Causa:** Imagem com proporÃ§Ã£o inadequada

**SoluÃ§Ã£o:**

1. Editar imagem externamente (Photoshop, GIMP, etc.)
2. Redimensionar para 200x200px
3. Salvar como PNG com fundo transparente
4. Fazer novo upload

### Logo nÃ£o muda na tela de login

**Causa:** Unidade nÃ£o estÃ¡ vinculada ao usuÃ¡rio

**SoluÃ§Ã£o:**

1. Ir em ConfiguraÃ§Ãµes â†’ Unidade OrÃ§amentÃ¡ria
2. Na lista, clicar "ðŸ”— Vincular ao UsuÃ¡rio"
3. Fazer logout e login novamente

### Arquivo muito grande

**Reduzir tamanho:**

1. Usar ferramenta online: TinyPNG, Compressor.io
2. Reduzir dimensÃµes (max 200x200px)
3. Se PNG, converter para JPG (perde transparÃªncia)
4. Se possÃ­vel, usar SVG (vetorial, menor)

---

## ðŸ“Š BenefÃ­cios da ImplementaÃ§Ã£o

### ðŸŽ¨ **Identidade Visual**

- Cada unidade mantÃ©m sua identidade
- Sistema personalizado por campus/projeto
- Profissionalismo nas telas

### ðŸ‘¥ **ExperiÃªncia do UsuÃ¡rio**

- IdentificaÃ§Ã£o imediata da unidade
- Interface mais amigÃ¡vel
- Senso de pertencimento

### ðŸ“„ **DocumentaÃ§Ã£o**

- PreparaÃ§Ã£o para relatÃ³rios com logo
- Futuras exportaÃ§Ãµes em PDF com brasÃ£o
- Notas/comprovantes personalizados

### ðŸ”’ **OrganizaÃ§Ã£o**

- SeparaÃ§Ã£o visual clara entre unidades
- Menos confusÃ£o em ambientes multi-campus
- Auditoria facilitada

---

## ðŸš€ PrÃ³ximos Passos (Futuro)

### PossÃ­veis Melhorias

1. **Editor de Imagem Integrado**
   - Recortar/redimensionar dentro do sistema
   - Ajustar contraste/brilho
   - Filtros

2. **MÃºltiplas Logos**
   - Logo principal (tela de login)
   - Logo secundÃ¡ria (relatÃ³rios)
   - Favicon personalizado

3. **Galeria de Templates**
   - Logos prÃ©-definidas do IF
   - Templates por campus
   - Download de pacote oficial

4. **RelatÃ³rios com Logo**
   - PDF de empenhos com logo
   - RelatÃ³rios de conferÃªncia com brasÃ£o
   - CabeÃ§alho personalizado

---

**VersÃ£o:** 1.2.4  
**Data:** 03/11/2025  
**Implementado por:** Sistema SINGEM  
**Status:** âœ… ConcluÃ­do e Testado
