# Restrições de Segurança - Módulo de Configurações

## 🔒 Implementações de Segurança

Data: 03/11/2025

---

## 📋 Resumo das Restrições

### 1️⃣ Limpar Banco de Dados - APENAS ADMINISTRADOR

**Arquivo:** `js/settings/preferencias.js`

**Restrição:** Apenas usuários com perfil `admin` podem limpar o banco de dados.

**Código:**

```javascript
async limparBancoDados() {
  // Verifica se usuário é administrador
  const usuarioLogado = window.settingsUsuarios?.usuarioLogado;

  if (!usuarioLogado) {
    alert("❌ ACESSO NEGADO!\n\nVocê precisa estar autenticado...");
    return;
  }

  if (usuarioLogado.perfil !== 'admin') {
    alert("❌ ACESSO NEGADO!\n\nApenas ADMINISTRADORES podem limpar...");
    return;
  }

  // ... continua apenas se for admin
}
```

**Mensagens:**

- Sem autenticação: "❌ ACESSO NEGADO! Você precisa estar autenticado para limpar o banco de dados."
- Usuário comum: "❌ ACESSO NEGADO! Apenas ADMINISTRADORES podem limpar o banco de dados. Seu perfil: Usuário"

---

### 2️⃣ Cadastro de Usuário - VÍNCULO OBRIGATÓRIO COM UNIDADE

**Arquivo:** `js/settings/usuarios.js`

**Restrição:** Não é possível cadastrar usuários sem antes cadastrar a Unidade Orçamentária.

**Código:**

```javascript
async salvarNovoUsuario() {
  // VALIDAÇÃO: Verifica se há unidade orçamentária cadastrada
  const unidade = await window.getUnidadeOrcamentaria();

  if (!unidade || !unidade.cnpj) {
    alert(
      "❌ UNIDADE ORÇAMENTÁRIA NÃO CADASTRADA!\n\n" +
      "Antes de cadastrar usuários, você deve:\n\n" +
      "1. Ir para a aba 'Unidade Orçamentária'\n" +
      "2. Cadastrar os dados da instituição\n" +
      "3. Salvar\n\n" +
      "Todos os usuários devem estar vinculados a uma unidade orçamentária."
    );
    return;
  }

  // ... continua cadastro e vincula usuário à unidade

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

**Estrutura do Usuário:**

```javascript
{
  id: "user_1234567890_abc",
  nome: "João da Silva",
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
✅ Usuário cadastrado com sucesso!

Usuário: João da Silva
Login: joao.silva
Perfil: Administrador
Unidade: Instituto Federal Baiano
```

---

### 3️⃣ Importar Configurações - APENAS ADMINISTRADOR

**Arquivo:** `js/settings/preferencias.js`

**Restrição:** Apenas usuários com perfil `admin` podem importar configurações.

**Código:**

```javascript
async importarConfiguracoes(file) {
  // Verifica se usuário é administrador
  const usuarioLogado = window.settingsUsuarios?.usuarioLogado;

  if (usuarioLogado && usuarioLogado.perfil !== 'admin') {
    alert(
      "❌ ACESSO NEGADO!\n\n" +
      "Apenas ADMINISTRADORES podem importar configurações.\n\n" +
      "Importar configurações pode modificar o sistema completamente.\n\n" +
      "Seu perfil: Usuário"
    );
    return;
  }

  // ... continua importação
}
```

**Motivo:** Importar configurações pode sobrescrever todos os dados do sistema, incluindo usuários e permissões.

---

### 4️⃣ Restrições Gerais para Usuário Comum

**Arquivo:** `js/settings/index.js`

**Restrições aplicadas automaticamente:**

#### A) Ocultação de Abas

```javascript
aplicarRestricoesUsuarioComum() {
  // 1. Oculta aba de Usuários
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

#### B) Unidade Orçamentária - Apenas Visualização

```javascript
// Desabilita edição da Unidade Orçamentária
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
    '<strong>🔒 Visualização apenas</strong><br>' +
    'Somente ADMINISTRADORES podem editar a Unidade Orçamentária.' +
    '</div>';
}
```

#### C) Zona de Perigo - Oculta Completamente

```javascript
// Oculta botão "Limpar Banco de Dados"
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

#### D) Importar Configurações - Desabilitado

```javascript
// Desabilita importar configurações
const btnImportarConfig = document.getElementById('btnImportarConfig');

if (btnImportarConfig) {
  btnImportarConfig.disabled = true;
  btnImportarConfig.style.opacity = '0.5';
  btnImportarConfig.title = 'Apenas administradores podem importar configurações';
}
```

---

## 📊 Matriz de Permissões

| Recurso                  | Administrador | Usuário Comum       |
| ------------------------ | ------------- | ------------------- |
| **Unidade Orçamentária** |
| Visualizar               | ✅ Sim        | ✅ Sim              |
| Editar                   | ✅ Sim        | ❌ Não              |
| **Usuários**             |
| Visualizar               | ✅ Sim        | ❌ Não (aba oculta) |
| Cadastrar                | ✅ Sim        | ❌ Não              |
| Editar                   | ✅ Sim        | ❌ Não              |
| Excluir                  | ✅ Sim        | ❌ Não              |
| **Rede/LAN**             |
| Visualizar               | ✅ Sim        | ❌ Não (aba oculta) |
| Configurar               | ✅ Sim        | ❌ Não              |
| Testar conexão           | ✅ Sim        | ❌ Não              |
| **Preferências**         |
| Tema                     | ✅ Sim        | ✅ Sim              |
| Idioma                   | ✅ Sim        | ✅ Sim              |
| Tolerâncias              | ✅ Sim        | ✅ Sim              |
| Notificações             | ✅ Sim        | ✅ Sim              |
| Exportar config          | ✅ Sim        | ✅ Sim              |
| Importar config          | ✅ Sim        | ❌ Não              |
| Limpar banco             | ✅ Sim        | ❌ Não (oculto)     |

---

## 🎯 Interface para Cada Perfil

### Administrador

**Abas visíveis:**

- 🏢 Unidade Orçamentária (editável)
- 👥 Usuários (completo)
- 🌐 Rede/LAN (completo)
- 🎨 Preferências (completo + zona de perigo)

**Permissões:**

- ✅ Editar tudo
- ✅ Cadastrar usuários
- ✅ Configurar rede
- ✅ Importar/exportar configurações
- ✅ Limpar banco de dados

---

### Usuário Comum

**Abas visíveis:**

- 🏢 Unidade Orçamentária (apenas visualização)
- 🎨 Preferências (sem zona de perigo)

**Abas OCULTAS:**

- ❌ Usuários
- ❌ Rede/LAN

**Permissões:**

- ✅ Visualizar unidade
- ✅ Mudar tema
- ✅ Configurar tolerâncias
- ✅ Exportar configurações
- ❌ Editar unidade
- ❌ Gerenciar usuários
- ❌ Configurar rede
- ❌ Importar configurações
- ❌ Limpar banco de dados

---

## 🔐 Sistema de Autenticação

### Como Funciona

1. **Sem usuário logado:**
   - Modo compatibilidade (acesso total)
   - Console: "⚠️ Nenhum usuário logado - acesso completo (modo compatibilidade)"

2. **Com usuário logado:**
   - Verifica perfil: `window.settingsUsuarios.usuarioLogado.perfil`
   - Aplica restrições se perfil = `usuario`
   - Console: "👤 Usuário: João da Silva (Administrador)" ou "(Usuário)"

### Verificação de Permissões

**No carregamento da página:**

```javascript
// configuracoes.html
setTimeout(() => {
  if (window.settingsManager) {
    window.settingsManager.init();
  }

  // Verifica permissões e aplica restrições
  if (window.settingsManager) {
    window.settingsManager.verificarPermissoes();
  }
}, 500);
```

**Nas ações críticas:**

```javascript
// Exemplo: Limpar banco
const usuarioLogado = window.settingsUsuarios?.usuarioLogado;

if (!usuarioLogado) {
  alert('❌ ACESSO NEGADO! Você precisa estar autenticado...');
  return;
}

if (usuarioLogado.perfil !== 'admin') {
  alert('❌ ACESSO NEGADO! Apenas ADMINISTRADORES...');
  return;
}
```

---

## ✅ Checklist de Segurança

### Implementado

- [x] Limpar banco de dados - apenas admin
- [x] Cadastro de usuário requer unidade orçamentária
- [x] Usuários vinculados à unidade (estrutura de dados)
- [x] Importar configurações - apenas admin
- [x] Aba "Usuários" oculta para usuário comum
- [x] Aba "Rede/LAN" oculta para usuário comum
- [x] Unidade Orçamentária - apenas visualização para usuário comum
- [x] Botão "Importar" desabilitado para usuário comum
- [x] Painel "Zona de Perigo" oculto para usuário comum
- [x] Mensagens de erro claras e informativas
- [x] Verificação de permissões no carregamento
- [x] Console logs para debug de permissões

### Futuras Melhorias Sugeridas

- [ ] Tela de login obrigatória
- [ ] Sessão com timeout automático
- [ ] Log de auditoria (quem fez o quê)
- [ ] Permissões granulares (mais níveis)
- [ ] 2FA (autenticação de dois fatores)
- [ ] Recuperação de senha

---

## 🧪 Como Testar

### Teste 1: Cadastro de Usuário sem Unidade

1. Limpe IndexedDB
2. Abra `configuracoes.html`
3. Vá para aba "Usuários"
4. Tente cadastrar usuário
5. **Resultado esperado:** Mensagem de erro solicitando cadastro da unidade

### Teste 2: Cadastro de Usuário com Unidade

1. Cadastre unidade orçamentária
2. Vá para aba "Usuários"
3. Cadastre usuário
4. **Resultado esperado:** Sucesso + mensagem mostrando vínculo com unidade

### Teste 3: Limpar Banco como Usuário Comum

1. Crie usuário com perfil "Usuário"
2. Faça login (autentique)
3. Vá para "Preferências"
4. **Resultado esperado:** Zona de Perigo não aparece

### Teste 4: Limpar Banco como Admin

1. Faça login como administrador
2. Vá para "Preferências"
3. Clique "Limpar Banco de Dados"
4. **Resultado esperado:** Dupla confirmação e execução

### Teste 5: Interface para Usuário Comum

1. Faça login como usuário comum
2. Abra configurações
3. **Resultado esperado:**
   - Apenas 2 abas visíveis
   - Unidade em modo leitura
   - Sem zona de perigo

---

## 📞 Resumo

✅ **Segurança implementada em 4 níveis:**

1. **Operações destrutivas** - apenas admin (limpar banco)
2. **Cadastros críticos** - apenas admin (usuários)
3. **Configurações de sistema** - apenas admin (rede, importar)
4. **Vínculo obrigatório** - usuário deve ter unidade orçamentária

✅ **Backward compatible:**

- Sistema continua funcionando sem autenticação (modo compatibilidade)
- Restrições aplicam-se apenas com usuário logado

✅ **Interface adaptativa:**

- Administrador vê tudo
- Usuário comum vê apenas o necessário

---

**Data:** 03/11/2025  
**Sistema:** IFDESK - IF Baiano  
**Módulo:** Configurações com Restrições de Segurança v1.2
