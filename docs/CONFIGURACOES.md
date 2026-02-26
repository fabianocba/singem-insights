# Módulo de Configurações - SINGEM

## 📋 Visão Geral

O Módulo de Configurações permite gerenciar todas as configurações do sistema SINGEM, incluindo cadastro da unidade orçamentária, usuários, rede e preferências.

## 🏗️ Estrutura de Arquivos

```
js/settings/
├── index.js          # Controller principal
├── unidade.js        # Gerencia Unidade Orçamentária
├── usuarios.js       # Gerencia Usuários e autenticação
├── rede.js          # Gerencia configurações de rede/LAN
└── preferencias.js   # Gerencia preferências gerais

configuracoes.html    # Interface de configurações

server/
├── index.js         # Servidor Node.js (opcional)
├── package.json     # Dependências Node.js
└── README.md        # Documentação do servidor
```

## 🏢 Seção 1: Unidade Orçamentária

### Funcionalidades

- ✅ Cadastro de dados da instituição
- ✅ Validação de CNPJ com algoritmo oficial da Receita Federal
- ✅ Formatação automática de CNPJ
- ✅ Armazenamento no IndexedDB (store: `config`, id: `unidadeOrcamentaria`)
- ✅ Função global `getUnidadeOrcamentaria()` para outros módulos

### Campos

- **Razão Social** (obrigatório)
- **CNPJ** (obrigatório, com validação de DV)
- **UG** - Unidade Gestora (opcional)
- **Endereço** (opcional)
- **Município** (opcional)
- **UF** (opcional)

### Validação de CNPJ

O sistema implementa o **algoritmo oficial da Receita Federal** para validação de CNPJ:

1. Elimina CNPJs conhecidos como inválidos (11111111111111, etc.)
2. Calcula primeiro dígito verificador
3. Calcula segundo dígito verificador
4. Compara com os dígitos informados

### Uso Programático

```javascript
// Obter unidade configurada
const unidade = await window.getUnidadeOrcamentaria();

if (unidade) {
  console.log(unidade.razaoSocial); // "Instituto Federal Baiano"
  console.log(unidade.cnpj); // "00.000.000/0000-00"
  console.log(unidade.cnpjNumeros); // "00000000000000"
}
```

## 👥 Seção 2: Usuários

### Funcionalidades

- ✅ CRUD completo de usuários
- ✅ Hash de senha com **PBKDF2** (Web Crypto API)
- ✅ 100.000 iterações + salt aleatório
- ✅ Indicador de força de senha
- ✅ Perfis: Usuário e Administrador
- ✅ Ativação/desativação de usuários
- ✅ Autenticação segura

### Estrutura de Usuário

```javascript
{
  id: "user_1234567890_abc123",
  nome: "João da Silva",
  login: "joao.silva",
  senhaHash: "salt_hex:hash_hex",
  perfil: "admin", // ou "usuario"
  ativo: true,
  dataCriacao: "2025-01-15T10:30:00.000Z",
  dataAtualizacao: "2025-01-15T15:45:00.000Z"
}
```

### Hash de Senha

O sistema usa **PBKDF2-SHA256** com:

- **Salt aleatório** de 16 bytes
- **100.000 iterações**
- **Hash de 256 bits**
- Formato armazenado: `salt_hex:hash_hex`

### Autenticação

```javascript
const resultado = await window.settingsUsuarios.autenticar('joao.silva', 'senha123');

if (resultado.sucesso) {
  console.log('Usuário logado:', resultado.usuario);
  // { id, nome, login, perfil }
} else {
  console.log('Erro:', resultado.mensagem);
}
```

### Força da Senha

Critérios avaliados:

- ✅ Comprimento ≥ 8 caracteres
- ✅ Maiúsculas e minúsculas
- ✅ Números
- ✅ Caracteres especiais (@$!%\*?&#)

Classificação:

- **Fraca:** 0-1 critério
- **Média:** 2 critérios
- **Forte:** 3 critérios
- **Muito Forte:** 4 critérios

## 🌐 Seção 3: Rede/LAN

### Funcionalidades

- ✅ Configuração de servidor em rede local
- ✅ Detecção automática de IP via WebRTC
- ✅ Validação de formato de IP
- ✅ Health check periódico (30s)
- ✅ Teste de conexão manual
- ✅ Servidor Node.js opcional (Express)

### Configuração

```javascript
{
  id: "rede",
  habilitado: true,
  ip: "192.168.1.100",
  porta: "3000",
  intervaloSync: 60, // segundos
  urlBase: "http://192.168.1.100:3000",
  dataAtualizacao: "2025-01-15T10:30:00.000Z"
}
```

### Servidor Node.js

#### Instalação

```bash
cd server
npm install
```

#### Executar

```bash
npm start
```

#### Endpoints Disponíveis

- `GET /health` - Health check
- `GET /api/info` - Informações do sistema
- `GET /api/empenhos` - Lista empenhos (placeholder)
- `POST /api/empenhos` - Envia empenho (placeholder)
- `GET /api/notas-fiscais` - Lista NFs (placeholder)
- `POST /api/sync` - Sincronização (placeholder)

### Health Check Automático

O sistema verifica automaticamente a cada 30 segundos se o servidor está online:

```javascript
// Ativo: ✅ Servidor Online
// Inativo: ❌ Servidor Offline
```

### Detecção de IP

Usa **WebRTC** para detectar IP local:

1. Cria conexão RTCPeerConnection
2. Captura candidatos ICE
3. Extrai IP do tipo 192.168.x.x
4. Fallback para IP padrão sugerido

## 🎨 Seção 4: Preferências

### Funcionalidades

- ✅ Tema claro/escuro
- ✅ Seleção de idioma
- ✅ Tolerâncias de validação
- ✅ Notificações
- ✅ Auto-salvar
- ✅ Validação rígida
- ✅ Exportar/importar configurações
- ✅ Limpar banco de dados

### Configuração

```javascript
{
  id: "preferencias",
  tema: "light", // ou "dark"
  idioma: "pt-BR",
  toleranciaValor: 0.01, // R$ 0,01
  toleranciaQuantidade: 0,
  notificacoes: true,
  autoSalvar: true,
  validacaoRigida: false,
  dataAtualizacao: "2025-01-15T10:30:00.000Z"
}
```

### Tolerâncias

#### Tolerância de Valor

Diferença aceitável em centavos entre NE e NF:

- **0.01** = 1 centavo (padrão)
- **0.00** = validação exata
- **0.10** = 10 centavos

#### Tolerância de Quantidade

Diferença aceitável em unidades:

- **0** = quantidade exata (padrão)
- **1** = aceita ±1 unidade

### Uso Programático

```javascript
// Obter tolerância de valor
const tolerancia = await window.getToleranciaValor();
console.log(tolerancia); // 0.01

// Obter tolerância de quantidade
const toleranciaQtd = await window.getToleranciaQuantidade();
console.log(toleranciaQtd); // 0
```

### Tema

O sistema aplica CSS custom properties:

**Tema Claro:**

```css
--cor-fundo: #f5f5f5 --cor-texto: #333 --cor-card: #fff --cor-borda: #ddd;
```

**Tema Escuro:**

```css
--cor-fundo: #1a1a1a --cor-texto: #f0f0f0 --cor-card: #2d2d2d --cor-borda: #404040;
```

### Exportar Configurações

Gera arquivo JSON com todas as configurações:

```json
{
  "versao": "1.0",
  "dataExportacao": "2025-01-15T10:30:00.000Z",
  "sistema": "SINGEM",
  "configuracoes": {
    "unidadeOrcamentaria": { ... },
    "usuarios": { ... },
    "rede": { ... },
    "preferencias": { ... }
  }
}
```

Nome do arquivo: `singem-config-2025-01-15.json`

### Importar Configurações

1. Valida arquivo (sistema: "SINGEM")
2. Confirma sobrescrita
3. Importa cada seção
4. Recarrega página

### Limpar Banco de Dados

⚠️ **OPERAÇÃO DESTRUTIVA**

Exclui permanentemente:

- ✅ Todas as Notas de Empenho
- ✅ Todas as Notas Fiscais
- ✅ Todos os registros de Entrega
- ✅ Todos os arquivos

**Mantém:**

- ✅ Configurações (unidade, usuários, rede, preferências)

Requer **dupla confirmação**.

## 💾 Armazenamento IndexedDB

### Store: `config`

Todas as configurações são armazenadas no store `config`:

| ID                    | Conteúdo               |
| --------------------- | ----------------------- |
| `unidadeOrcamentaria` | Dados da instituição  |
| `usuarios`            | Lista de usuários      |
| `rede`                | Configurações de rede |
| `preferencias`        | Preferências gerais    |

### Estrutura

```javascript
// config store
{
  id: 'unidadeOrcamentaria',
  razaoSocial: '...',
  cnpj: '...',
  // ...
}

{
  id: 'usuarios',
  lista: [
    { id, nome, login, senhaHash, perfil, ativo, ... },
    // ...
  ]
}

{
  id: 'rede',
  habilitado: true,
  ip: '...',
  // ...
}

{
  id: 'preferencias',
  tema: 'light',
  // ...
}
```

## 🔌 Integração com Sistema Principal

### 1. Adicionar Link no Menu

Edite `index.html`, adicione no menu:

```html
<div class="menu-item" onclick="window.open('configuracoes.html', '_blank')">
  <h2>⚙️</h2>
  <p>Configurações</p>
</div>
```

### 2. Validar CNPJ em NE/NF

Edite `app.js`, método `salvarEmpenho()`:

```javascript
async salvarEmpenho() {
  // ... código existente ...

  // Valida CNPJ da unidade
  const unidade = await window.getUnidadeOrcamentaria();
  if (unidade && dados.cnpjUnidade) {
    if (dados.cnpjUnidade !== unidade.cnpjNumeros) {
      const continuar = confirm(
        `⚠️ ATENÇÃO - Divergência de CNPJ!\n\n` +
        `CNPJ Configurado: ${unidade.cnpj}\n` +
        `CNPJ no Empenho: ${dados.cnpjUnidade}\n\n` +
        `Deseja continuar mesmo assim?`
      );
      if (!continuar) return;
    }
  }

  // ... continua salvamento ...
}
```

### 3. Aplicar Tolerâncias na Comparação

Edite `db.js`, método `compararNotaFiscalComEmpenho()`:

```javascript
async compararNotaFiscalComEmpenho(notaFiscal, empenho) {
  // Obtém tolerâncias configuradas
  const toleranciaValor = await window.getToleranciaValor();
  const toleranciaQtd = await window.getToleranciaQuantidade();

  // ... código de comparação ...

  // Compara valores com tolerância
  const diferencaValor = Math.abs(valorNF - valorNE);
  if (diferencaValor > toleranciaValor) {
    divergencias.push({
      tipo: 'valor',
      mensagem: `Diferença de R$ ${diferencaValor.toFixed(2)}`
    });
  }

  // Compara quantidades com tolerância
  const diferencaQtd = Math.abs(qtdNF - qtdNE);
  if (diferencaQtd > toleranciaQtd) {
    divergencias.push({
      tipo: 'quantidade',
      mensagem: `Diferença de ${diferencaQtd} unidades`
    });
  }

  // ...
}
```

## 🔒 Segurança

### Senhas

- ✅ **PBKDF2-SHA256** com 100.000 iterações
- ✅ Salt aleatório de 16 bytes
- ✅ Hash de 256 bits
- ✅ Nunca armazenar senha em texto plano
- ✅ Web Crypto API (nativa do navegador)

### CNPJ

- ✅ Validação com algoritmo oficial da Receita Federal
- ✅ Verificação de dígitos verificadores
- ✅ Eliminação de CNPJs conhecidos como inválidos

### Rede

- ⚠️ Servidor Node.js para **uso em LAN privada apenas**
- ⚠️ **NÃO expor à internet sem SSL e autenticação**
- ⚠️ Configurar firewall para bloquear acesso externo

### IndexedDB

- ✅ Armazenamento local isolado por origem
- ✅ Não acessível por outros sites
- ✅ Sincronização opcional via servidor LAN

## 📱 Responsividade

O módulo é totalmente responsivo:

- **Desktop:** Grade de 2 colunas
- **Tablet:** Grade de 2 colunas
- **Mobile:** Grade de 1 coluna, tabs em coluna

## ♿ Acessibilidade

- ✅ Labels em todos os inputs
- ✅ Placeholders descritivos
- ✅ Mensagens de validação claras
- ✅ Cores com contraste adequado
- ✅ Foco visível em elementos interativos

## 🧪 Testando

### 1. Unidade Orçamentária

1. Acesse `configuracoes.html`
2. Preencha Razão Social e CNPJ
3. Clique "Validar CNPJ" (deve mostrar ✅ ou ❌)
4. Salve
5. Verifique no console: `await getUnidadeOrcamentaria()`

### 2. Usuários

1. Acesse aba "Usuários"
2. Cadastre um usuário de teste
3. Veja força da senha ao digitar
4. Salve e verifique na tabela
5. Edite o usuário
6. Teste autenticação no console:
   ```javascript
   await settingsUsuarios.autenticar('login', 'senha');
   ```

### 3. Rede

1. Acesse aba "Rede/LAN"
2. Clique "Detectar IP" (deve preencher automaticamente)
3. Habilite LAN
4. Salve
5. Abra terminal: `cd server && npm install && npm start`
6. Clique "Testar Conexão" (deve mostrar ✅)

### 4. Preferências

1. Acesse aba "Preferências"
2. Mude tema para "Escuro" (deve aplicar imediatamente)
3. Ajuste tolerâncias
4. Salve
5. Exporte configurações (baixa JSON)
6. Importe o mesmo arquivo (deve recarregar)

## 🚀 Próximas Implementações

- [ ] Autenticação completa no sistema principal
- [ ] Sincronização real entre máquinas
- [ ] Upload de arquivos via servidor
- [ ] Auditoria de ações (log)
- [ ] Multi-idioma completo
- [ ] Backup automático
- [ ] Relatórios de configurações

## 📞 Suporte

Para dúvidas ou problemas:

1. Verifique este documento
2. Consulte a documentação principal do SINGEM
3. Entre em contato com o suporte técnico

---

**Versão:** 1.0  
**Data:** Janeiro 2025  
**Sistema:** SINGEM - IF Baiano
