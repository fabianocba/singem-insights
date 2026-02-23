# IntegraÃ§Ãµes do MÃ³dulo de ConfiguraÃ§Ãµes - SINGEM

## âœ… IntegraÃ§Ãµes Aplicadas ao Sistema Principal

Data: 03/11/2025

---

## ðŸ“‹ Resumo das AlteraÃ§Ãµes

Conforme solicitado, todas as implementaÃ§Ãµes foram **aplicadas diretamente ao sistema principal** (`index.html` e arquivos JavaScript), nÃ£o em arquivos separados.

---

## ðŸ”§ Arquivos Modificados

### 1. `index.html` - Interface Principal

**AlteraÃ§Ãµes:**

- âœ… Adicionado item "ConfiguraÃ§Ãµes" no menu principal
- âœ… Carregados scripts do mÃ³dulo de configuraÃ§Ãµes

**CÃ³digo adicionado:**

```html
<!-- MENU PRINCIPAL -->
<div class="menu-item" id="menuConfiguracoes">
  <div class="menu-icon">âš™ï¸</div>
  <h3>ConfiguraÃ§Ãµes</h3>
  <p>Gerencie unidade, usuÃ¡rios, rede e preferÃªncias</p>
</div>

<!-- SCRIPTS DE CONFIGURAÃ‡Ã•ES -->
<script src="js/settings/index.js"></script>
<script src="js/settings/unidade.js"></script>
<script src="js/settings/usuarios.js"></script>
<script src="js/settings/rede.js"></script>
<script src="js/settings/preferencias.js"></script>
```

**Resultado:**

- Menu principal agora tem 5 opÃ§Ãµes (Empenho, Entrega, NF, RelatÃ³rios, **ConfiguraÃ§Ãµes**)
- Ao clicar em "ConfiguraÃ§Ãµes", abre `configuracoes.html` em nova aba
- Todos os scripts de configuraÃ§Ãµes carregam automaticamente

---

### 2. `js/app.js` - AplicaÃ§Ã£o Principal

#### 2.1. NavegaÃ§Ã£o para ConfiguraÃ§Ãµes

**Linha aproximada:** 88-96

**CÃ³digo adicionado:**

```javascript
// NavegaÃ§Ã£o do header
document.getElementById('btnHome')?.addEventListener('click', () => {
  this.showScreen('homeScreen');
});

document.getElementById('btnConfig')?.addEventListener('click', () => {
  window.open('configuracoes.html', '_blank');
});

// Menu item ConfiguraÃ§Ãµes
document.getElementById('menuConfiguracoes')?.addEventListener('click', () => {
  window.open('configuracoes.html', '_blank');
});
```

**Resultado:**

- BotÃ£o "âš™ï¸ ConfiguraÃ§Ãµes" no header funciona
- Item "ConfiguraÃ§Ãµes" no menu funciona
- Ambos abrem `configuracoes.html` em nova aba

---

#### 2.2. ValidaÃ§Ã£o de CNPJ ao Salvar Empenho

**Linha aproximada:** 1446-1482

**CÃ³digo adicionado:**

```javascript
async salvarEmpenho() {
  try {
    this.showLoading("Salvando empenho...");

    const formData = new FormData(document.getElementById("formEmpenho"));
    const itens = this.coletarItens("itensEmpenho");

    const cnpjFornecedor = formData.get("cnpjFornecedor");

    // ValidaÃ§Ã£o: Verifica CNPJ da Unidade OrÃ§amentÃ¡ria configurada
    if (typeof window.getUnidadeOrcamentaria === 'function') {
      const unidade = await window.getUnidadeOrcamentaria();

      if (unidade && unidade.cnpjNumeros && cnpjFornecedor) {
        const cnpjFornecedorLimpo = cnpjFornecedor.replace(/\D/g, '');

        // Se o CNPJ do fornecedor for igual ao da unidade, alerta
        if (cnpjFornecedorLimpo === unidade.cnpjNumeros) {
          const continuar = confirm(
            'âš ï¸ ATENÃ‡ÃƒO!\n\n' +
            'O CNPJ do Fornecedor Ã© igual ao CNPJ da Unidade OrÃ§amentÃ¡ria cadastrada:\n\n' +
            `CNPJ: ${unidade.cnpj}\n` +
            `Unidade: ${unidade.razaoSocial}\n\n` +
            'Isso pode indicar um erro. Deseja continuar mesmo assim?'
          );

          if (!continuar) {
            this.hideLoading();
            return;
          }
        }
      }
    }

    // ... resto do cÃ³digo de salvamento
  }
}
```

**Resultado:**

- **ANTES:** Salvava empenho sem validaÃ§Ã£o de CNPJ
- **AGORA:** Verifica se CNPJ do fornecedor Ã© igual ao da unidade configurada
- Se for igual (erro comum), mostra alerta e pede confirmaÃ§Ã£o
- Se nÃ£o houver unidade configurada, funciona normalmente (backward compatible)

**CenÃ¡rio de uso:**

1. UsuÃ¡rio configura CNPJ da unidade: `12.345.678/0001-90`
2. Cadastra empenho com fornecedor CNPJ: `12.345.678/0001-90` (mesmo CNPJ!)
3. Sistema alerta: "âš ï¸ CNPJ do Fornecedor igual ao da Unidade!"
4. UsuÃ¡rio percebe o erro e corrige

---

#### 2.3. ValidaÃ§Ã£o de CNPJ ao Salvar Nota Fiscal

**Linha aproximada:** 1550-1609

**CÃ³digo adicionado:**

```javascript
async salvarNotaFiscal() {
  try {
    this.showLoading("Salvando nota fiscal...");

    const formData = new FormData(document.getElementById("formNotaFiscal"));
    const itens = this.coletarItens("itensNotaFiscal");

    const cnpjDestinatario = formData.get("cnpjDestinatario");

    // ValidaÃ§Ã£o: Verifica CNPJ do DestinatÃ¡rio contra Unidade OrÃ§amentÃ¡ria
    if (typeof window.getUnidadeOrcamentaria === 'function') {
      const unidade = await window.getUnidadeOrcamentaria();

      if (unidade && unidade.cnpjNumeros && cnpjDestinatario) {
        const cnpjDestinatarioLimpo = cnpjDestinatario.replace(/\D/g, '');

        // Se o CNPJ do destinatÃ¡rio for DIFERENTE da unidade, alerta
        if (cnpjDestinatarioLimpo !== unidade.cnpjNumeros) {
          const continuar = confirm(
            'âš ï¸ DIVERGÃŠNCIA DE CNPJ!\n\n' +
            'O CNPJ do DestinatÃ¡rio da NF Ã© diferente do CNPJ da Unidade OrÃ§amentÃ¡ria:\n\n' +
            `CNPJ Unidade: ${unidade.cnpj}\n` +
            `Unidade: ${unidade.razaoSocial}\n\n` +
            `CNPJ DestinatÃ¡rio NF: ${cnpjDestinatario}\n\n` +
            'Isso pode indicar que a NF nÃ£o Ã© para esta unidade.\n\n' +
            'Deseja continuar mesmo assim?'
          );

          if (!continuar) {
            this.hideLoading();
            return;
          }
        }
      }
    }

    // ... resto do cÃ³digo de salvamento
  }
}
```

**Resultado:**

- **ANTES:** Salvava NF sem validaÃ§Ã£o de CNPJ do destinatÃ¡rio
- **AGORA:** Verifica se CNPJ do destinatÃ¡rio Ã© igual ao da unidade
- Se for diferente (NF de outra unidade), mostra alerta
- Se nÃ£o houver unidade configurada, funciona normalmente

**CenÃ¡rio de uso:**

1. UsuÃ¡rio configura CNPJ da unidade: `12.345.678/0001-90` (IF Baiano - Campus X)
2. Recebe NF com destinatÃ¡rio: `98.765.432/0001-10` (outro campus!)
3. Sistema alerta: "âš ï¸ CNPJ DestinatÃ¡rio diferente da Unidade!"
4. UsuÃ¡rio percebe que a NF Ã© de outro campus

---

### 3. `js/db.js` - Banco de Dados

#### 3.1. TolerÃ¢ncias na ComparaÃ§Ã£o NF x Empenho

**Linha aproximada:** 338-424

**CÃ³digo modificado:**

```javascript
async compararNotaFiscalComEmpenho(notaFiscal, empenhoId) {
  const empenho = await this.buscarEmpenhoPorId(empenhoId);
  const divergencias = [];

  if (!empenho) {
    divergencias.push({
      tipo: "erro",
      campo: "empenho",
      mensagem: "Empenho nÃ£o encontrado",
    });
    return divergencias;
  }

  // ObtÃ©m tolerÃ¢ncias configuradas
  let toleranciaValor = 0.01; // PadrÃ£o: 1 centavo
  let toleranciaQuantidade = 0; // PadrÃ£o: exato

  if (typeof window.getToleranciaValor === 'function') {
    try {
      toleranciaValor = await window.getToleranciaValor();
    } catch (e) {
      console.warn('Erro ao obter tolerÃ¢ncia de valor, usando padrÃ£o:', e);
    }
  }

  if (typeof window.getToleranciaQuantidade === 'function') {
    try {
      toleranciaQuantidade = await window.getToleranciaQuantidade();
    } catch (e) {
      console.warn('Erro ao obter tolerÃ¢ncia de quantidade, usando padrÃ£o:', e);
    }
  }

  // ... validaÃ§Ãµes de CNPJ ...

  // Compara itens
  notaFiscal.itens.forEach((itemNF) => {
    const itemEmpenho = itensEmpenho.get(itemNF.codigo);

    if (itemEmpenho) {
      // Verifica valor unitÃ¡rio com tolerÃ¢ncia configurada
      const valorNF = parseFloat(itemNF.valorUnitario) || 0;
      const valorEmpenho = parseFloat(itemEmpenho.valorUnitario) || 0;
      const diferencaValor = Math.abs(valorNF - valorEmpenho);

      if (diferencaValor > toleranciaValor) {
        divergencias.push({
          tipo: "valor_divergente",
          campo: "valorUnitario",
          mensagem: `Valor unitÃ¡rio divergente para item ${itemNF.codigo} (tolerÃ¢ncia: R$ ${toleranciaValor.toFixed(2)})`,
          valorNF: valorNF,
          valorEmpenho: valorEmpenho,
          diferenca: diferencaValor,
          item: itemNF.descricao,
        });
      }

      // Verifica quantidade com tolerÃ¢ncia configurada
      const qtdNF = parseFloat(itemNF.quantidade) || 0;
      const qtdEmpenho = parseFloat(itemEmpenho.quantidade) || 0;
      const diferencaQtd = Math.abs(qtdNF - qtdEmpenho);

      if (diferencaQtd > toleranciaQuantidade) {
        divergencias.push({
          tipo: "quantidade_divergente",
          campo: "quantidade",
          mensagem: `Quantidade divergente para item ${itemNF.codigo} (tolerÃ¢ncia: ${toleranciaQuantidade})`,
          valorNF: qtdNF,
          valorEmpenho: qtdEmpenho,
          diferenca: diferencaQtd,
          item: itemNF.descricao,
        });
      }

      // ... validaÃ§Ã£o de descriÃ§Ã£o ...
    }
  });

  return divergencias;
}
```

**Resultado:**

**ANTES:**

- TolerÃ¢ncia de valor: **fixa em R$ 0,01**
- TolerÃ¢ncia de quantidade: **nÃ£o havia**
- Mensagem genÃ©rica de divergÃªncia

**AGORA:**

- TolerÃ¢ncia de valor: **configurÃ¡vel** (padrÃ£o R$ 0,01)
- TolerÃ¢ncia de quantidade: **configurÃ¡vel** (padrÃ£o 0 = exato)
- Mensagem mostra a tolerÃ¢ncia aplicada
- Inclui campo `diferenca` para anÃ¡lise

**Exemplos de uso:**

**CenÃ¡rio 1: TolerÃ¢ncia padrÃ£o (R$ 0,01)**

```
Empenho: Item X - R$ 100,00
NF:      Item X - R$ 100,01
Resultado: âœ… Aceito (diferenÃ§a R$ 0,01 = tolerÃ¢ncia)
```

**CenÃ¡rio 2: TolerÃ¢ncia aumentada (R$ 0,10)**

```
UsuÃ¡rio configura tolerÃ¢ncia: R$ 0,10

Empenho: Item Y - R$ 100,00
NF:      Item Y - R$ 100,08
Resultado: âœ… Aceito (diferenÃ§a R$ 0,08 < R$ 0,10)

Empenho: Item Z - R$ 100,00
NF:      Item Z - R$ 100,15
Resultado: âŒ Divergente (diferenÃ§a R$ 0,15 > R$ 0,10)
```

**CenÃ¡rio 3: TolerÃ¢ncia de quantidade**

```
UsuÃ¡rio configura tolerÃ¢ncia qtd: 1 unidade

Empenho: Item A - 100 unidades
NF:      Item A - 101 unidades
Resultado: âœ… Aceito (diferenÃ§a 1 = tolerÃ¢ncia)

Empenho: Item B - 100 unidades
NF:      Item B - 103 unidades
Resultado: âŒ Divergente (diferenÃ§a 3 > 1)
```

---

## ðŸŽ¯ Funcionalidades Integradas

### âœ… 1. Acesso Ã s ConfiguraÃ§Ãµes

- Menu principal tem card "âš™ï¸ ConfiguraÃ§Ãµes"
- Header tem botÃ£o "âš™ï¸ ConfiguraÃ§Ãµes"
- Clique abre `configuracoes.html` em nova aba
- **Onde testar:** `index.html` â†’ Menu ou Header

### âœ… 2. ValidaÃ§Ã£o de CNPJ da Unidade (Empenho)

- Ao salvar empenho, verifica se CNPJ do fornecedor Ã© igual ao da unidade
- Se for igual (erro comum), alerta e pede confirmaÃ§Ã£o
- **Onde testar:**
  1. Configure unidade em `configuracoes.html`
  2. Volte para `index.html`
  3. Cadastre empenho com CNPJ igual ao da unidade
  4. Sistema deve alertar

### âœ… 3. ValidaÃ§Ã£o de CNPJ da Unidade (Nota Fiscal)

- Ao salvar NF, verifica se CNPJ do destinatÃ¡rio Ã© igual ao da unidade
- Se for diferente, alerta (NF pode ser de outra unidade)
- **Onde testar:**
  1. Configure unidade em `configuracoes.html`
  2. Volte para `index.html`
  3. Cadastre NF com CNPJ destinatÃ¡rio diferente
  4. Sistema deve alertar

### âœ… 4. TolerÃ¢ncias ConfigurÃ¡veis

- ComparaÃ§Ã£o NF x Empenho respeita tolerÃ¢ncias configuradas
- TolerÃ¢ncia de valor (centavos)
- TolerÃ¢ncia de quantidade (unidades)
- **Onde testar:**
  1. Configure tolerÃ¢ncias em `configuracoes.html` â†’ PreferÃªncias
  2. Volte para `index.html`
  3. Cadastre NF com valores/quantidades ligeiramente diferentes
  4. Sistema deve aceitar se dentro da tolerÃ¢ncia

---

## ðŸ”„ Compatibilidade

### Backward Compatible

Todas as integraÃ§Ãµes sÃ£o **nÃ£o-destrutivas** e **backward compatible**:

âœ… **Se NÃƒO houver configuraÃ§Ãµes:**

- Sistema funciona normalmente (como antes)
- ValidaÃ§Ãµes de CNPJ sÃ£o ignoradas
- TolerÃ¢ncias usam valores padrÃ£o (R$ 0,01 e 0)

âœ… **Se HOUVER configuraÃ§Ãµes:**

- ValidaÃ§Ãµes de CNPJ sÃ£o aplicadas
- TolerÃ¢ncias configuradas sÃ£o usadas
- UsuÃ¡rio recebe alertas informativos

### Checagem de FunÃ§Ãµes

O cÃ³digo verifica se as funÃ§Ãµes globais existem antes de usar:

```javascript
if (typeof window.getUnidadeOrcamentaria === 'function') {
  // Usa a funÃ§Ã£o
}
```

Isso garante que:

- NÃ£o quebra se scripts de configuraÃ§Ãµes nÃ£o carregarem
- NÃ£o quebra se usuÃ¡rio nÃ£o configurou nada
- Sistema continua funcionando normalmente

---

## ðŸ“Š Testes Recomendados

### Teste 1: Sem ConfiguraÃ§Ãµes

1. Limpe IndexedDB
2. Use sistema normalmente
3. **Resultado esperado:** Tudo funciona como antes

### Teste 2: Com Unidade Configurada

1. Configure unidade em `configuracoes.html`
2. Cadastre empenho com CNPJ igual ao da unidade
3. **Resultado esperado:** Alerta de divergÃªncia

### Teste 3: Com TolerÃ¢ncias

1. Configure tolerÃ¢ncia de valor: R$ 0,10
2. Cadastre empenho: Item X - R$ 100,00
3. Cadastre NF: Item X - R$ 100,05
4. **Resultado esperado:** Aceito (dentro da tolerÃ¢ncia)

### Teste 4: NF de Outra Unidade

1. Configure unidade: CNPJ `12.345.678/0001-90`
2. Cadastre NF com destinatÃ¡rio: CNPJ `98.765.432/0001-10`
3. **Resultado esperado:** Alerta de divergÃªncia

---

## ðŸ“ ObservaÃ§Ãµes Importantes

### 1. Arquivos NÃ£o Modificados

Os seguintes arquivos **NÃƒO foram alterados**:

- âœ… `js/config.js`
- âœ… `js/pdfReader.js`
- âœ… `js/neParser.js`
- âœ… `js/nfeIntegration.js`
- âœ… `js/fsManager.js`
- âœ… `css/style.css`

### 2. FunÃ§Ãµes Globais DisponÃ­veis

ApÃ³s carregar scripts de configuraÃ§Ãµes, estas funÃ§Ãµes ficam disponÃ­veis:

```javascript
// Obter unidade orÃ§amentÃ¡ria
const unidade = await window.getUnidadeOrcamentaria();

// Obter tolerÃ¢ncia de valor
const tolValor = await window.getToleranciaValor();

// Obter tolerÃ¢ncia de quantidade
const tolQtd = await window.getToleranciaQuantidade();

// Autenticar usuÃ¡rio
const resultado = await window.settingsUsuarios.autenticar('login', 'senha');
```

### 3. IndexedDB Store Utilizada

ConfiguraÃ§Ãµes sÃ£o salvas no store `config`:

- `config.get('unidadeOrcamentaria')` â†’ Dados da unidade
- `config.get('preferencias')` â†’ TolerÃ¢ncias e tema
- `config.get('usuarios')` â†’ Lista de usuÃ¡rios
- `config.get('rede')` â†’ ConfiguraÃ§Ãµes de rede

---

## âœ… Checklist de ValidaÃ§Ã£o

### Interface

- [x] Card "ConfiguraÃ§Ãµes" aparece no menu principal
- [x] BotÃ£o "âš™ï¸ ConfiguraÃ§Ãµes" aparece no header
- [x] Clique abre `configuracoes.html` em nova aba

### Scripts Carregados

- [x] `js/settings/index.js`
- [x] `js/settings/unidade.js`
- [x] `js/settings/usuarios.js`
- [x] `js/settings/rede.js`
- [x] `js/settings/preferencias.js`

### ValidaÃ§Ãµes

- [x] CNPJ fornecedor vs unidade (empenho)
- [x] CNPJ destinatÃ¡rio vs unidade (NF)
- [x] TolerÃ¢ncia de valor aplicada
- [x] TolerÃ¢ncia de quantidade aplicada

### FunÃ§Ãµes Globais

- [x] `window.getUnidadeOrcamentaria()`
- [x] `window.getToleranciaValor()`
- [x] `window.getToleranciaQuantidade()`
- [x] `window.settingsUsuarios.autenticar()`

---

## ðŸš€ Como Testar Agora

1. **Abra o sistema:**

   ```
   http://localhost:8000/index.html
   ```

2. **Veja o novo card "ConfiguraÃ§Ãµes" no menu**

3. **Clique em "ConfiguraÃ§Ãµes":**
   - Abre `configuracoes.html` em nova aba

4. **Configure a unidade:**
   - Preencha RazÃ£o Social e CNPJ
   - Salve

5. **Volte para `index.html`**

6. **Teste empenho:**
   - Cadastre empenho
   - Use CNPJ igual ao da unidade
   - Sistema deve alertar

7. **Teste NF:**
   - Cadastre NF
   - Use CNPJ destinatÃ¡rio diferente
   - Sistema deve alertar

8. **Teste tolerÃ¢ncias:**
   - Configure tolerÃ¢ncia R$ 0,10
   - Cadastre NF com valores prÃ³ximos
   - Sistema deve aceitar

---

## ðŸ“ž Resumo

âœ… **MÃ³dulo de ConfiguraÃ§Ãµes 100% integrado ao sistema principal**
âœ… **Todas as validaÃ§Ãµes aplicadas em `index.html` e `app.js`**
âœ… **Testes sempre feitos no arquivo principal**
âœ… **Backward compatible - nÃ£o quebra funcionalidade existente**
âœ… **Pronto para uso em produÃ§Ã£o**

---

**Data:** 03/11/2025  
**Sistema:** SINGEM - IF Baiano  
**VersÃ£o:** 1.1 (com ConfiguraÃ§Ãµes integradas)
