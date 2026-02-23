# MÃ³dulo de ConfiguraÃ§Ãµes - SINGEM

## ðŸ“‹ VisÃ£o Geral

O MÃ³dulo de ConfiguraÃ§Ãµes permite gerenciar todas as configuraÃ§Ãµes do sistema SINGEM, incluindo cadastro da unidade orÃ§amentÃ¡ria, usuÃ¡rios, rede e preferÃªncias.

## ðŸ—ï¸ Estrutura de Arquivos

```
js/settings/
â”œâ”€â”€ index.js          # Controller principal
â”œâ”€â”€ unidade.js        # Gerencia Unidade OrÃ§amentÃ¡ria
â”œâ”€â”€ usuarios.js       # Gerencia UsuÃ¡rios e autenticaÃ§Ã£o
â”œâ”€â”€ rede.js          # Gerencia configuraÃ§Ãµes de rede/LAN
â””â”€â”€ preferencias.js   # Gerencia preferÃªncias gerais

configuracoes.html    # Interface de configuraÃ§Ãµes

server/
â”œâ”€â”€ index.js         # Servidor Node.js (opcional)
â”œâ”€â”€ package.json     # DependÃªncias Node.js
â””â”€â”€ README.md        # DocumentaÃ§Ã£o do servidor
```

## ðŸ¢ SeÃ§Ã£o 1: Unidade OrÃ§amentÃ¡ria

### Funcionalidades

- âœ… Cadastro de dados da instituiÃ§Ã£o
- âœ… ValidaÃ§Ã£o de CNPJ com algoritmo oficial da Receita Federal
- âœ… FormataÃ§Ã£o automÃ¡tica de CNPJ
- âœ… Armazenamento no IndexedDB (store: `config`, id: `unidadeOrcamentaria`)
- âœ… FunÃ§Ã£o global `getUnidadeOrcamentaria()` para outros mÃ³dulos

### Campos

- **RazÃ£o Social** (obrigatÃ³rio)
- **CNPJ** (obrigatÃ³rio, com validaÃ§Ã£o de DV)
- **UG** - Unidade Gestora (opcional)
- **EndereÃ§o** (opcional)
- **MunicÃ­pio** (opcional)
- **UF** (opcional)

### ValidaÃ§Ã£o de CNPJ

O sistema implementa o **algoritmo oficial da Receita Federal** para validaÃ§Ã£o de CNPJ:

1. Elimina CNPJs conhecidos como invÃ¡lidos (11111111111111, etc.)
2. Calcula primeiro dÃ­gito verificador
3. Calcula segundo dÃ­gito verificador
4. Compara com os dÃ­gitos informados

### Uso ProgramÃ¡tico

```javascript
// Obter unidade configurada
const unidade = await window.getUnidadeOrcamentaria();

if (unidade) {
  console.log(unidade.razaoSocial); // "Instituto Federal Baiano"
  console.log(unidade.cnpj); // "00.000.000/0000-00"
  console.log(unidade.cnpjNumeros); // "00000000000000"
}
```

## ðŸ‘¥ SeÃ§Ã£o 2: UsuÃ¡rios

### Funcionalidades

- âœ… CRUD completo de usuÃ¡rios
- âœ… Hash de senha com **PBKDF2** (Web Crypto API)
- âœ… 100.000 iteraÃ§Ãµes + salt aleatÃ³rio
- âœ… Indicador de forÃ§a de senha
- âœ… Perfis: UsuÃ¡rio e Administrador
- âœ… AtivaÃ§Ã£o/desativaÃ§Ã£o de usuÃ¡rios
- âœ… AutenticaÃ§Ã£o segura

### Estrutura de UsuÃ¡rio

```javascript
{
  id: "user_1234567890_abc123",
  nome: "JoÃ£o da Silva",
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

- **Salt aleatÃ³rio** de 16 bytes
- **100.000 iteraÃ§Ãµes**
- **Hash de 256 bits**
- Formato armazenado: `salt_hex:hash_hex`

### AutenticaÃ§Ã£o

```javascript
const resultado = await window.settingsUsuarios.autenticar('joao.silva', 'senha123');

if (resultado.sucesso) {
  console.log('UsuÃ¡rio logado:', resultado.usuario);
  // { id, nome, login, perfil }
} else {
  console.log('Erro:', resultado.mensagem);
}
```

### ForÃ§a da Senha

CritÃ©rios avaliados:

- âœ… Comprimento â‰¥ 8 caracteres
- âœ… MaiÃºsculas e minÃºsculas
- âœ… NÃºmeros
- âœ… Caracteres especiais (@$!%\*?&#)

ClassificaÃ§Ã£o:

- **Fraca:** 0-1 critÃ©rio
- **MÃ©dia:** 2 critÃ©rios
- **Forte:** 3 critÃ©rios
- **Muito Forte:** 4 critÃ©rios

## ðŸŒ SeÃ§Ã£o 3: Rede/LAN

### Funcionalidades

- âœ… ConfiguraÃ§Ã£o de servidor em rede local
- âœ… DetecÃ§Ã£o automÃ¡tica de IP via WebRTC
- âœ… ValidaÃ§Ã£o de formato de IP
- âœ… Health check periÃ³dico (30s)
- âœ… Teste de conexÃ£o manual
- âœ… Servidor Node.js opcional (Express)

### ConfiguraÃ§Ã£o

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

#### InstalaÃ§Ã£o

```bash
cd server
npm install
```

#### Executar

```bash
npm start
```

#### Endpoints DisponÃ­veis

- `GET /health` - Health check
- `GET /api/info` - InformaÃ§Ãµes do sistema
- `GET /api/empenhos` - Lista empenhos (placeholder)
- `POST /api/empenhos` - Envia empenho (placeholder)
- `GET /api/notas-fiscais` - Lista NFs (placeholder)
- `POST /api/sync` - SincronizaÃ§Ã£o (placeholder)

### Health Check AutomÃ¡tico

O sistema verifica automaticamente a cada 30 segundos se o servidor estÃ¡ online:

```javascript
// Ativo: âœ… Servidor Online
// Inativo: âŒ Servidor Offline
```

### DetecÃ§Ã£o de IP

Usa **WebRTC** para detectar IP local:

1. Cria conexÃ£o RTCPeerConnection
2. Captura candidatos ICE
3. Extrai IP do tipo 192.168.x.x
4. Fallback para IP padrÃ£o sugerido

## ðŸŽ¨ SeÃ§Ã£o 4: PreferÃªncias

### Funcionalidades

- âœ… Tema claro/escuro
- âœ… SeleÃ§Ã£o de idioma
- âœ… TolerÃ¢ncias de validaÃ§Ã£o
- âœ… NotificaÃ§Ãµes
- âœ… Auto-salvar
- âœ… ValidaÃ§Ã£o rÃ­gida
- âœ… Exportar/importar configuraÃ§Ãµes
- âœ… Limpar banco de dados

### ConfiguraÃ§Ã£o

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

### TolerÃ¢ncias

#### TolerÃ¢ncia de Valor

DiferenÃ§a aceitÃ¡vel em centavos entre NE e NF:

- **0.01** = 1 centavo (padrÃ£o)
- **0.00** = validaÃ§Ã£o exata
- **0.10** = 10 centavos

#### TolerÃ¢ncia de Quantidade

DiferenÃ§a aceitÃ¡vel em unidades:

- **0** = quantidade exata (padrÃ£o)
- **1** = aceita Â±1 unidade

### Uso ProgramÃ¡tico

```javascript
// Obter tolerÃ¢ncia de valor
const tolerancia = await window.getToleranciaValor();
console.log(tolerancia); // 0.01

// Obter tolerÃ¢ncia de quantidade
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

### Exportar ConfiguraÃ§Ãµes

Gera arquivo JSON com todas as configuraÃ§Ãµes:

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

### Importar ConfiguraÃ§Ãµes

1. Valida arquivo (sistema: "SINGEM")
2. Confirma sobrescrita
3. Importa cada seÃ§Ã£o
4. Recarrega pÃ¡gina

### Limpar Banco de Dados

âš ï¸ **OPERAÃ‡ÃƒO DESTRUTIVA**

Exclui permanentemente:

- âœ… Todas as Notas de Empenho
- âœ… Todas as Notas Fiscais
- âœ… Todos os registros de Entrega
- âœ… Todos os arquivos

**MantÃ©m:**

- âœ… ConfiguraÃ§Ãµes (unidade, usuÃ¡rios, rede, preferÃªncias)

Requer **dupla confirmaÃ§Ã£o**.

## ðŸ’¾ Armazenamento IndexedDB

### Store: `config`

Todas as configuraÃ§Ãµes sÃ£o armazenadas no store `config`:

| ID                    | ConteÃºdo               |
| --------------------- | ----------------------- |
| `unidadeOrcamentaria` | Dados da instituiÃ§Ã£o  |
| `usuarios`            | Lista de usuÃ¡rios      |
| `rede`                | ConfiguraÃ§Ãµes de rede |
| `preferencias`        | PreferÃªncias gerais    |

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

## ðŸ”Œ IntegraÃ§Ã£o com Sistema Principal

### 1. Adicionar Link no Menu

Edite `index.html`, adicione no menu:

```html
<div class="menu-item" onclick="window.open('configuracoes.html', '_blank')">
  <h2>âš™ï¸</h2>
  <p>ConfiguraÃ§Ãµes</p>
</div>
```

### 2. Validar CNPJ em NE/NF

Edite `app.js`, mÃ©todo `salvarEmpenho()`:

```javascript
async salvarEmpenho() {
  // ... cÃ³digo existente ...

  // Valida CNPJ da unidade
  const unidade = await window.getUnidadeOrcamentaria();
  if (unidade && dados.cnpjUnidade) {
    if (dados.cnpjUnidade !== unidade.cnpjNumeros) {
      const continuar = confirm(
        `âš ï¸ ATENÃ‡ÃƒO - DivergÃªncia de CNPJ!\n\n` +
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

### 3. Aplicar TolerÃ¢ncias na ComparaÃ§Ã£o

Edite `db.js`, mÃ©todo `compararNotaFiscalComEmpenho()`:

```javascript
async compararNotaFiscalComEmpenho(notaFiscal, empenho) {
  // ObtÃ©m tolerÃ¢ncias configuradas
  const toleranciaValor = await window.getToleranciaValor();
  const toleranciaQtd = await window.getToleranciaQuantidade();

  // ... cÃ³digo de comparaÃ§Ã£o ...

  // Compara valores com tolerÃ¢ncia
  const diferencaValor = Math.abs(valorNF - valorNE);
  if (diferencaValor > toleranciaValor) {
    divergencias.push({
      tipo: 'valor',
      mensagem: `DiferenÃ§a de R$ ${diferencaValor.toFixed(2)}`
    });
  }

  // Compara quantidades com tolerÃ¢ncia
  const diferencaQtd = Math.abs(qtdNF - qtdNE);
  if (diferencaQtd > toleranciaQtd) {
    divergencias.push({
      tipo: 'quantidade',
      mensagem: `DiferenÃ§a de ${diferencaQtd} unidades`
    });
  }

  // ...
}
```

## ðŸ”’ SeguranÃ§a

### Senhas

- âœ… **PBKDF2-SHA256** com 100.000 iteraÃ§Ãµes
- âœ… Salt aleatÃ³rio de 16 bytes
- âœ… Hash de 256 bits
- âœ… Nunca armazenar senha em texto plano
- âœ… Web Crypto API (nativa do navegador)

### CNPJ

- âœ… ValidaÃ§Ã£o com algoritmo oficial da Receita Federal
- âœ… VerificaÃ§Ã£o de dÃ­gitos verificadores
- âœ… EliminaÃ§Ã£o de CNPJs conhecidos como invÃ¡lidos

### Rede

- âš ï¸ Servidor Node.js para **uso em LAN privada apenas**
- âš ï¸ **NÃƒO expor Ã  internet sem SSL e autenticaÃ§Ã£o**
- âš ï¸ Configurar firewall para bloquear acesso externo

### IndexedDB

- âœ… Armazenamento local isolado por origem
- âœ… NÃ£o acessÃ­vel por outros sites
- âœ… SincronizaÃ§Ã£o opcional via servidor LAN

## ðŸ“± Responsividade

O mÃ³dulo Ã© totalmente responsivo:

- **Desktop:** Grade de 2 colunas
- **Tablet:** Grade de 2 colunas
- **Mobile:** Grade de 1 coluna, tabs em coluna

## â™¿ Acessibilidade

- âœ… Labels em todos os inputs
- âœ… Placeholders descritivos
- âœ… Mensagens de validaÃ§Ã£o claras
- âœ… Cores com contraste adequado
- âœ… Foco visÃ­vel em elementos interativos

## ðŸ§ª Testando

### 1. Unidade OrÃ§amentÃ¡ria

1. Acesse `configuracoes.html`
2. Preencha RazÃ£o Social e CNPJ
3. Clique "Validar CNPJ" (deve mostrar âœ… ou âŒ)
4. Salve
5. Verifique no console: `await getUnidadeOrcamentaria()`

### 2. UsuÃ¡rios

1. Acesse aba "UsuÃ¡rios"
2. Cadastre um usuÃ¡rio de teste
3. Veja forÃ§a da senha ao digitar
4. Salve e verifique na tabela
5. Edite o usuÃ¡rio
6. Teste autenticaÃ§Ã£o no console:
   ```javascript
   await settingsUsuarios.autenticar('login', 'senha');
   ```

### 3. Rede

1. Acesse aba "Rede/LAN"
2. Clique "Detectar IP" (deve preencher automaticamente)
3. Habilite LAN
4. Salve
5. Abra terminal: `cd server && npm install && npm start`
6. Clique "Testar ConexÃ£o" (deve mostrar âœ…)

### 4. PreferÃªncias

1. Acesse aba "PreferÃªncias"
2. Mude tema para "Escuro" (deve aplicar imediatamente)
3. Ajuste tolerÃ¢ncias
4. Salve
5. Exporte configuraÃ§Ãµes (baixa JSON)
6. Importe o mesmo arquivo (deve recarregar)

## ðŸš€ PrÃ³ximas ImplementaÃ§Ãµes

- [ ] AutenticaÃ§Ã£o completa no sistema principal
- [ ] SincronizaÃ§Ã£o real entre mÃ¡quinas
- [ ] Upload de arquivos via servidor
- [ ] Auditoria de aÃ§Ãµes (log)
- [ ] Multi-idioma completo
- [ ] Backup automÃ¡tico
- [ ] RelatÃ³rios de configuraÃ§Ãµes

## ðŸ“ž Suporte

Para dÃºvidas ou problemas:

1. Verifique este documento
2. Consulte a documentaÃ§Ã£o principal do SINGEM
3. Entre em contato com o suporte tÃ©cnico

---

**VersÃ£o:** 1.0  
**Data:** Janeiro 2025  
**Sistema:** SINGEM - IF Baiano
