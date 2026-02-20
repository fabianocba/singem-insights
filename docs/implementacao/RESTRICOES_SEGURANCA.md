# RestriÃ§Ãµes de SeguranÃ§a - MÃ³dulo de ConfiguraÃ§Ãµes

## ðŸ”’ ImplementaÃ§Ãµes de SeguranÃ§a

Data: 03/11/2025

---

## ðŸ“‹ Resumo das RestriÃ§Ãµes

### 1ï¸âƒ£ Limpar Banco de Dados - APENAS ADMINISTRADOR

**Arquivo:** `js/settings/preferencias.js`

**RestriÃ§Ã£o:** Apenas usuÃ¡rios com perfil `admin` podem limpar o banco de dados.

**CÃ³digo:**

```javascript
async limparBancoDados() {
  // Verifica se usuÃ¡rio Ã© administrador
  const usuarioLogado = window.settingsUsuarios?.usuarioLogado;

  if (!usuarioLogado) {
    alert("âŒ ACESSO NEGADO!\n\nVocÃª precisa estar autenticado...");
    return;
  }

  if (usuarioLogado.perfil !== 'admin') {
    alert("âŒ ACESSO NEGADO!\n\nApenas ADMINISTRADORES podem limpar...");
    return;
  }

  // ... continua apenas se for admin
}
```

**Mensagens:**

- Sem autenticaÃ§Ã£o: "âŒ ACESSO NEGADO! VocÃª precisa estar autenticado para limpar o banco de dados."
- UsuÃ¡rio comum: "âŒ ACESSO NEGADO! Apenas ADMINISTRADORES podem limpar o banco de dados. Seu perfil: UsuÃ¡rio"

---

### 2ï¸âƒ£ Cadastro de UsuÃ¡rio - VÃNCULO OBRIGATÃ“RIO COM UNIDADE

**Arquivo:** `js/settings/usuarios.js`

**RestriÃ§Ã£o:** NÃ£o Ã© possÃ­vel cadastrar usuÃ¡rios sem antes cadastrar a Unidade OrÃ§amentÃ¡ria.

**CÃ³digo:**

```javascript
async salvarNovoUsuario() {
  // VALIDAÃ‡ÃƒO: Verifica se hÃ¡ unidade orÃ§amentÃ¡ria cadastrada
  const unidade = await window.getUnidadeOrcamentaria();

  if (!unidade || !unidade.cnpj) {
    alert(
      "âŒ UNIDADE ORÃ‡AMENTÃRIA NÃƒO CADASTRADA!\n\n" +
      "Antes de cadastrar usuÃ¡rios, vocÃª deve:\n\n" +
      "1. Ir para a aba 'Unidade OrÃ§amentÃ¡ria'\n" +
      "2. Cadastrar os dados da instituiÃ§Ã£o\n" +
      "3. Salvar\n\n" +
      "Todos os usuÃ¡rios devem estar vinculados a uma unidade orÃ§amentÃ¡ria."
    );
    return;
  }

  // ... continua cadastro e vincula usuÃ¡rio Ã  unidade

  const usuario = {
    // ... outros campos
    unidadeOrcamentaria: {
      id: unidade.id || 'unidadeOrcamentaria',
      cnpj: unidade.cnpj,
      razaoSocial: unidade.razaoSocial
    }
  };
}
```

**Estrutura do UsuÃ¡rio:**

```javascript
{
  id: "user_1234567890_abc",
  nome: "JoÃ£o da Silva",
  login: "joao.silva",
  senhaHash: "salt:hash",
  perfil: "admin", // ou "usuario"
  ativo: true,
  unidadeOrcamentaria: {
    id: "unidadeOrcamentaria",
    cnpj: "12.345.678/0001-90",
    razaoSocial: "Instituto Federal Baiano"
  },
  dataCriacao: "2025-11-03T10:30:00.000Z"
}
```

**Mensagem de Sucesso:**

```
âœ… UsuÃ¡rio cadastrado com sucesso!

UsuÃ¡rio: JoÃ£o da Silva
Login: joao.silva
Perfil: Administrador
Unidade: Instituto Federal Baiano
```

---

### 3ï¸âƒ£ Importar ConfiguraÃ§Ãµes - APENAS ADMINISTRADOR

**Arquivo:** `js/settings/preferencias.js`

**RestriÃ§Ã£o:** Apenas usuÃ¡rios com perfil `admin` podem importar configuraÃ§Ãµes.

**CÃ³digo:**

```javascript
async importarConfiguracoes(file) {
  // Verifica se usuÃ¡rio Ã© administrador
  const usuarioLogado = window.settingsUsuarios?.usuarioLogado;

  if (usuarioLogado && usuarioLogado.perfil !== 'admin') {
    alert(
      "âŒ ACESSO NEGADO!\n\n" +
      "Apenas ADMINISTRADORES podem importar configuraÃ§Ãµes.\n\n" +
      "Importar configuraÃ§Ãµes pode modificar o sistema completamente.\n\n" +
      "Seu perfil: UsuÃ¡rio"
    );
    return;
  }

  // ... continua importaÃ§Ã£o
}
```

**Motivo:** Importar configuraÃ§Ãµes pode sobrescrever todos os dados do sistema, incluindo usuÃ¡rios e permissÃµes.

---

### 4ï¸âƒ£ RestriÃ§Ãµes Gerais para UsuÃ¡rio Comum

**Arquivo:** `js/settings/index.js`

**RestriÃ§Ãµes aplicadas automaticamente:**

#### A) OcultaÃ§Ã£o de Abas

```javascript
aplicarRestricoesUsuarioComum() {
  // 1. Oculta aba de UsuÃ¡rios
  const tabUsuarios = document.querySelector('[data-tab="usuarios"]');
  if (tabUsuarios) {
    tabUsuarios.style.display = 'none';
  }

  // 2. Oculta aba de Rede
  const tabRede = document.querySelector('[data-tab="rede"]');
  if (tabRede) {
    tabRede.style.display = 'none';
  }
}
```

#### B) Unidade OrÃ§amentÃ¡ria - Apenas VisualizaÃ§Ã£o

```javascript
// Desabilita ediÃ§Ã£o da Unidade OrÃ§amentÃ¡ria
const formUnidade = document.getElementById('formUnidade');
if (formUnidade) {
  const inputs = formUnidade.querySelectorAll('input, select, button[type="submit"]');
  inputs.forEach((input) => {
    input.disabled = true;
    input.style.cursor = 'not-allowed';
    input.style.opacity = '0.6';
  });

  // Adiciona mensagem informativa
  statusUnidade.innerHTML =
    '<div class="status-message warning">' +
    '<strong>ðŸ”’ VisualizaÃ§Ã£o apenas</strong><br>' +
    'Somente ADMINISTRADORES podem editar a Unidade OrÃ§amentÃ¡ria.' +
    '</div>';
}
```

#### C) Zona de Perigo - Oculta Completamente

```javascript
// Oculta botÃ£o "Limpar Banco de Dados"
const btnLimparBanco = document.getElementById('btnLimparBanco');
if (btnLimparBanco) {
  btnLimparBanco.style.display = 'none';
}

// Oculta painel "Zona de Perigo"
const painelPerigo = btnLimparBanco?.closest('.panel');
if (painelPerigo) {
  painelPerigo.style.display = 'none';
}
```

#### D) Importar ConfiguraÃ§Ãµes - Desabilitado

```javascript
// Desabilita importar configuraÃ§Ãµes
const btnImportarConfig = document.getElementById('btnImportarConfig');

if (btnImportarConfig) {
  btnImportarConfig.disabled = true;
  btnImportarConfig.style.opacity = '0.5';
  btnImportarConfig.title = 'Apenas administradores podem importar configuraÃ§Ãµes';
}
```

---

## ðŸ“Š Matriz de PermissÃµes

| Recurso                  | Administrador | UsuÃ¡rio Comum       |
| ------------------------ | ------------- | ------------------- |
| **Unidade OrÃ§amentÃ¡ria** |
| Visualizar               | âœ… Sim        | âœ… Sim              |
| Editar                   | âœ… Sim        | âŒ NÃ£o              |
| **UsuÃ¡rios**             |
| Visualizar               | âœ… Sim        | âŒ NÃ£o (aba oculta) |
| Cadastrar                | âœ… Sim        | âŒ NÃ£o              |
| Editar                   | âœ… Sim        | âŒ NÃ£o              |
| Excluir                  | âœ… Sim        | âŒ NÃ£o              |
| **Rede/LAN**             |
| Visualizar               | âœ… Sim        | âŒ NÃ£o (aba oculta) |
| Configurar               | âœ… Sim        | âŒ NÃ£o              |
| Testar conexÃ£o           | âœ… Sim        | âŒ NÃ£o              |
| **PreferÃªncias**         |
| Tema                     | âœ… Sim        | âœ… Sim              |
| Idioma                   | âœ… Sim        | âœ… Sim              |
| TolerÃ¢ncias              | âœ… Sim        | âœ… Sim              |
| NotificaÃ§Ãµes             | âœ… Sim        | âœ… Sim              |
| Exportar config          | âœ… Sim        | âœ… Sim              |
| Importar config          | âœ… Sim        | âŒ NÃ£o              |
| Limpar banco             | âœ… Sim        | âŒ NÃ£o (oculto)     |

---

## ðŸŽ¯ Interface para Cada Perfil

### Administrador

**Abas visÃ­veis:**

- ðŸ¢ Unidade OrÃ§amentÃ¡ria (editÃ¡vel)
- ðŸ‘¥ UsuÃ¡rios (completo)
- ðŸŒ Rede/LAN (completo)
- ðŸŽ¨ PreferÃªncias (completo + zona de perigo)

**PermissÃµes:**

- âœ… Editar tudo
- âœ… Cadastrar usuÃ¡rios
- âœ… Configurar rede
- âœ… Importar/exportar configuraÃ§Ãµes
- âœ… Limpar banco de dados

---

### UsuÃ¡rio Comum

**Abas visÃ­veis:**

- ðŸ¢ Unidade OrÃ§amentÃ¡ria (apenas visualizaÃ§Ã£o)
- ðŸŽ¨ PreferÃªncias (sem zona de perigo)

**Abas OCULTAS:**

- âŒ UsuÃ¡rios
- âŒ Rede/LAN

**PermissÃµes:**

- âœ… Visualizar unidade
- âœ… Mudar tema
- âœ… Configurar tolerÃ¢ncias
- âœ… Exportar configuraÃ§Ãµes
- âŒ Editar unidade
- âŒ Gerenciar usuÃ¡rios
- âŒ Configurar rede
- âŒ Importar configuraÃ§Ãµes
- âŒ Limpar banco de dados

---

## ðŸ” Sistema de AutenticaÃ§Ã£o

### Como Funciona

1. **Sem usuÃ¡rio logado:**
   - Modo compatibilidade (acesso total)
   - Console: "âš ï¸ Nenhum usuÃ¡rio logado - acesso completo (modo compatibilidade)"

2. **Com usuÃ¡rio logado:**
   - Verifica perfil: `window.settingsUsuarios.usuarioLogado.perfil`
   - Aplica restriÃ§Ãµes se perfil = `usuario`
   - Console: "ðŸ‘¤ UsuÃ¡rio: JoÃ£o da Silva (Administrador)" ou "(UsuÃ¡rio)"

### VerificaÃ§Ã£o de PermissÃµes

**No carregamento da pÃ¡gina:**

```javascript
// configuracoes.html
setTimeout(() => {
  if (window.settingsManager) {
    window.settingsManager.init();
  }

  // Verifica permissÃµes e aplica restriÃ§Ãµes
  if (window.settingsManager) {
    window.settingsManager.verificarPermissoes();
  }
}, 500);
```

**Nas aÃ§Ãµes crÃ­ticas:**

```javascript
// Exemplo: Limpar banco
const usuarioLogado = window.settingsUsuarios?.usuarioLogado;

if (!usuarioLogado) {
  alert('âŒ ACESSO NEGADO! VocÃª precisa estar autenticado...');
  return;
}

if (usuarioLogado.perfil !== 'admin') {
  alert('âŒ ACESSO NEGADO! Apenas ADMINISTRADORES...');
  return;
}
```

---

## âœ… Checklist de SeguranÃ§a

### Implementado

- [x] Limpar banco de dados - apenas admin
- [x] Cadastro de usuÃ¡rio requer unidade orÃ§amentÃ¡ria
- [x] UsuÃ¡rios vinculados Ã  unidade (estrutura de dados)
- [x] Importar configuraÃ§Ãµes - apenas admin
- [x] Aba "UsuÃ¡rios" oculta para usuÃ¡rio comum
- [x] Aba "Rede/LAN" oculta para usuÃ¡rio comum
- [x] Unidade OrÃ§amentÃ¡ria - apenas visualizaÃ§Ã£o para usuÃ¡rio comum
- [x] BotÃ£o "Importar" desabilitado para usuÃ¡rio comum
- [x] Painel "Zona de Perigo" oculto para usuÃ¡rio comum
- [x] Mensagens de erro claras e informativas
- [x] VerificaÃ§Ã£o de permissÃµes no carregamento
- [x] Console logs para debug de permissÃµes

### Futuras Melhorias Sugeridas

- [ ] Tela de login obrigatÃ³ria
- [ ] SessÃ£o com timeout automÃ¡tico
- [ ] Log de auditoria (quem fez o quÃª)
- [ ] PermissÃµes granulares (mais nÃ­veis)
- [ ] 2FA (autenticaÃ§Ã£o de dois fatores)
- [ ] RecuperaÃ§Ã£o de senha

---

## ðŸ§ª Como Testar

### Teste 1: Cadastro de UsuÃ¡rio sem Unidade

1. Limpe IndexedDB
2. Abra `configuracoes.html`
3. VÃ¡ para aba "UsuÃ¡rios"
4. Tente cadastrar usuÃ¡rio
5. **Resultado esperado:** Mensagem de erro solicitando cadastro da unidade

### Teste 2: Cadastro de UsuÃ¡rio com Unidade

1. Cadastre unidade orÃ§amentÃ¡ria
2. VÃ¡ para aba "UsuÃ¡rios"
3. Cadastre usuÃ¡rio
4. **Resultado esperado:** Sucesso + mensagem mostrando vÃ­nculo com unidade

### Teste 3: Limpar Banco como UsuÃ¡rio Comum

1. Crie usuÃ¡rio com perfil "UsuÃ¡rio"
2. FaÃ§a login (autentique)
3. VÃ¡ para "PreferÃªncias"
4. **Resultado esperado:** Zona de Perigo nÃ£o aparece

### Teste 4: Limpar Banco como Admin

1. FaÃ§a login como administrador
2. VÃ¡ para "PreferÃªncias"
3. Clique "Limpar Banco de Dados"
4. **Resultado esperado:** Dupla confirmaÃ§Ã£o e execuÃ§Ã£o

### Teste 5: Interface para UsuÃ¡rio Comum

1. FaÃ§a login como usuÃ¡rio comum
2. Abra configuraÃ§Ãµes
3. **Resultado esperado:**
   - Apenas 2 abas visÃ­veis
   - Unidade em modo leitura
   - Sem zona de perigo

---

## ðŸ“ž Resumo

âœ… **SeguranÃ§a implementada em 4 nÃ­veis:**

1. **OperaÃ§Ãµes destrutivas** - apenas admin (limpar banco)
2. **Cadastros crÃ­ticos** - apenas admin (usuÃ¡rios)
3. **ConfiguraÃ§Ãµes de sistema** - apenas admin (rede, importar)
4. **VÃ­nculo obrigatÃ³rio** - usuÃ¡rio deve ter unidade orÃ§amentÃ¡ria

âœ… **Backward compatible:**

- Sistema continua funcionando sem autenticaÃ§Ã£o (modo compatibilidade)
- RestriÃ§Ãµes aplicam-se apenas com usuÃ¡rio logado

âœ… **Interface adaptativa:**

- Administrador vÃª tudo
- UsuÃ¡rio comum vÃª apenas o necessÃ¡rio

---

**Data:** 03/11/2025  
**Sistema:** SINGEM - IF Baiano  
**MÃ³dulo:** ConfiguraÃ§Ãµes com RestriÃ§Ãµes de SeguranÃ§a v1.2

