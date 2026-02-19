# 🔗 Vinculação Bidirecional: Usuário ↔ Unidade

## 📋 Visão Geral

Sistema completo de vinculação bidirecional entre usuários e unidades orçamentárias, permitindo gerenciamento em ambas as direções.

## ✨ Funcionalidades Implementadas

### 1️⃣ **Tela de Usuários** (`Configurações → Usuários`)

#### Visualização de Vínculos

- Nova coluna: **"Unidade Vinculada"**
- Exibe status do vínculo de cada usuário:
  - ✅ **Vinculado**: Mostra nome da unidade + botão "🔓 Desvincular"
  - ⚠️ **Não vinculado**: Mostra alerta + botão "🔗 Vincular Unidade"

#### Ações Disponíveis

**Vincular Usuário a Unidade:**

```javascript
settingsUsuarios.vincularUnidade(userId);
```

- Carrega unidades disponíveis
- Se 1 unidade: Vincula diretamente (com confirmação)
- Se múltiplas: Mostra menu de seleção numerado
- Atualiza dados do usuário no IndexedDB
- Atualiza lista automaticamente

**Desvincular Usuário:**

```javascript
settingsUsuarios.desvincularUnidade(userId);
```

- Confirma ação com usuário
- Remove vínculo da unidade
- Mantém usuário no sistema
- Atualiza IndexedDB
- Refresh automático da lista

---

### 2️⃣ **Tela de Unidades** (`Configurações → Unidade Orçamentária`)

#### Visualização de Vínculos

- Nova coluna: **"Usuários Vinculados"** (substituiu "Município/UF")
- Exibe usuários vinculados a cada unidade:
  - **Nenhum vínculo**: ⚠️ Nenhum usuário vinculado + botão "🔗 Vincular Usuário"
  - **Com vínculos**: ✅ Lista de usuários (👑 Admin / 👤 User) + botão "➕ Adicionar"

#### Ações Disponíveis

**Vincular Usuário a Unidade:**

```javascript
settingsUnidade.vincularUsuarioAUnidade(unidadeId);
```

- Carrega usuários disponíveis (não vinculados a esta unidade)
- Se 1 usuário: Vincula diretamente
- Se múltiplos: Menu de seleção com ícones (👑/👤)
- Atualiza dados no IndexedDB
- Refresh automático da lista

**Vincular Unidade ao Usuário Logado:**

```javascript
settingsUnidade.vincularUnidadeAoUsuario(unidadeId);
```

- Vincula unidade ao usuário atualmente logado
- Define como unidade padrão para validações
- Exibe confirmação com detalhes
- Atualiza app.js se necessário

---

## 🗂️ Estrutura de Dados

### Usuário com Unidade Vinculada

```json
{
  "id": "user_1730841234567_abc123",
  "nome": "João Silva",
  "login": "joao.silva",
  "senhaHash": "...",
  "perfil": "admin",
  "ativo": true,
  "unidadeOrcamentaria": {
    "id": "unidade_1730841234567_xyz789",
    "cnpj": "12.345.678/0001-90",
    "razaoSocial": "Instituto Federal Baiano - Campus Guanambi",
    "ug": "158123"
  }
}
```

### Unidade (sem alteração na estrutura)

```json
{
  "id": "unidade_1730841234567_xyz789",
  "razaoSocial": "Instituto Federal Baiano - Campus Guanambi",
  "cnpj": "12.345.678/0001-90",
  "ug": "158123",
  "endereco": "Rua das Flores, 123",
  "municipio": "Guanambi",
  "uf": "BA",
  "logomarca": "data:image/png;base64,..."
}
```

**Observação**: A unidade não armazena lista de usuários. O vínculo é unidirecional na estrutura (usuário → unidade), mas a interface apresenta visão bidirecional ao buscar usuários vinculados dinamicamente.

---

## 🎨 Interface Visual

### Estilos Aplicados

**Novos tamanhos de botões:**

```css
.btn-xs {
  padding: 4px 8px;
  font-size: 11px;
  min-height: 24px;
}

.btn-sm {
  padding: 6px 12px;
  font-size: 13px;
  min-height: 32px;
}
```

**Classe de perigo:**

```css
.btn-danger {
  background: var(--error);
  color: var(--white);
}
```

### Ícones de Status

- ✅ Verde: Vínculo ativo
- ⚠️ Laranja: Sem vínculo
- 👑 Coroa: Usuário administrador
- 👤 Pessoa: Usuário normal
- 🔗 Link: Vincular
- 🔓 Cadeado aberto: Desvincular
- ➕ Mais: Adicionar usuário

---

## 🔄 Fluxos de Uso

### Cenário 1: Vincular Usuário sem Unidade

```
1. Acessar: Configurações → Usuários
2. Localizar usuário com "⚠️ Não vinculado"
3. Clicar: "🔗 Vincular Unidade"
4. Selecionar unidade (se houver múltiplas)
5. Confirmar
6. ✅ Vínculo criado
```

### Cenário 2: Adicionar Usuário a Unidade

```
1. Acessar: Configurações → Unidade Orçamentária
2. Localizar unidade desejada
3. Clicar: "🔗 Vincular Usuário" ou "➕ Adicionar"
4. Selecionar usuário da lista
5. Confirmar
6. ✅ Usuário adicionado à unidade
```

### Cenário 3: Desvincular Usuário

```
1. Acessar: Configurações → Usuários
2. Localizar usuário vinculado
3. Clicar: "🔓 Desvincular"
4. Confirmar ação
5. ✅ Vínculo removido (usuário mantido)
```

---

## 🔧 Arquivos Modificados

### 1. **js/settings/usuarios.js**

- ✅ Adicionado: `renderizarVinculoUnidade(user)`
- ✅ Adicionado: `vincularUnidade(userId)`
- ✅ Adicionado: `executarVinculacao(userId, unidade)`
- ✅ Adicionado: `desvincularUnidade(userId)`
- ✅ Modificado: `renderizarLista()` - Nova coluna

### 2. **js/settings/unidade.js**

- ✅ Adicionado: `renderizarUsuariosVinculados(unidadeId, usuarios)`
- ✅ Adicionado: `getUsuariosVinculados()`
- ✅ Adicionado: `vincularUsuarioAUnidade(unidadeId)`
- ✅ Adicionado: `executarVinculacaoUsuario(usuario, unidade, todosUsuarios)`
- ✅ Modificado: `renderizarLista()` - Async + nova coluna

### 3. **config/configuracoes.html**

- ✅ Tabela Usuários: Adicionada coluna "Unidade Vinculada"
- ✅ Tabela Unidades: Substituída coluna "Município/UF" por "Usuários Vinculados"
- ✅ Ajustado colspan para loading messages

### 4. **css/style.css**

- ✅ Adicionado: `.btn-xs` (botões extra pequenos)
- ✅ Adicionado: `.btn-sm` (botões pequenos)
- ✅ Adicionado: `.btn-danger` (botões de exclusão)

---

## ✅ Validações Implementadas

### Ao Vincular Usuário:

- ✅ Verifica se há unidades cadastradas
- ✅ Valida existência do usuário
- ✅ Confirmação antes de vincular
- ✅ Feedback visual após sucesso

### Ao Vincular Unidade:

- ✅ Verifica se há usuários cadastrados
- ✅ Filtra usuários já vinculados
- ✅ Valida existência da unidade
- ✅ Confirmação antes de vincular

### Ao Desvincular:

- ✅ Confirmação obrigatória
- ✅ Validação de existência do vínculo
- ✅ Mantém integridade dos dados

---

## 🎯 Benefícios

1. **Visibilidade Total**: Ambas as telas mostram o estado dos vínculos
2. **Gestão Flexível**: Vincular/desvincular de qualquer tela
3. **UX Intuitiva**: Botões contextuais baseados no estado
4. **Segurança**: Confirmações em todas as ações destrutivas
5. **Consistência**: Dados sincronizados no IndexedDB
6. **Feedback Visual**: Ícones e cores indicam status claramente

---

## 📝 Logs de Console

```javascript
// Ao vincular
✅ Vínculo criado: {usuario: "João Silva", unidade: "IF Baiano"}

// Ao desvincular
✅ Vínculo removido: João Silva

// Carregamento automático
📥 Carregando unidades do banco...
📥 Carregando usuários para verificar vínculos...
```

---

## 🔮 Possíveis Melhorias Futuras

- [ ] Histórico de vínculos (audit trail)
- [ ] Vínculo de usuário a múltiplas unidades
- [ ] Perfis específicos por unidade
- [ ] Permissões granulares baseadas em unidade
- [ ] Relatório de usuários sem vínculo
- [ ] Exportação de mapa de vínculos
- [ ] Validação de CNPJ ativo na Receita antes de vincular

---

## 📌 Notas Importantes

1. **IndexedDB**: Todos os dados persistem localmente no navegador
2. **Sincronização**: Não há sincronização entre dispositivos
3. **Backup**: Recomendado exportar configurações periodicamente
4. **Performance**: Consultas otimizadas com async/await
5. **Compatibilidade**: Funciona em todos os navegadores modernos

---

**Última Atualização**: 05/11/2025  
**Versão**: 1.0.0  
**Status**: ✅ Implementado e Testado
