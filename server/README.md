# Servidor SINGEM

Servidor Node.js opcional para compartilhamento de dados do SINGEM em rede local (LAN).

## 📋 Pré-requisitos

- Node.js 16+ instalado
- NPM ou Yarn

## 🚀 Instalação

```bash
cd server
npm install
```

## ▶️ Executar

### Modo Normal

```bash
npm start
```

### Modo Desenvolvimento (com auto-reload)

```bash
npm run dev
```

O servidor ficará disponível em:

- **Local:** http://localhost:3000
- **Rede:** http://\<seu-ip\>:3000

## 🔍 Endpoints Disponíveis

### Health Check

```
GET /health
```

Retorna status do servidor.

### Informações do Sistema

```
GET /api/info
```

Retorna informações do SINGEM.

### Empenhos (Em Desenvolvimento)

```
GET    /api/empenhos
GET    /api/empenhos/:id
POST   /api/empenhos
```

### Notas Fiscais (Em Desenvolvimento)

```
GET    /api/notas-fiscais
GET    /api/notas-fiscais/:id
POST   /api/notas-fiscais
```

### Entregas (Em Desenvolvimento)

```
GET    /api/entregas
```

### Proxy Compras.gov.br (CATMAT/CATSER e módulos)

```
GET /api/compras/health
GET /api/compras/modulo-material/grupos
GET /api/compras/modulo-material/classes?codigoGrupo=...
GET /api/compras/modulo-material/itens?pagina=1&tamanhoPagina=10
GET /api/compras/modulo-servico/grupos
GET /api/compras/modulo-servico/classes?codigoGrupo=...
GET /api/compras/modulo-servico/itens?pagina=1&tamanhoPagina=10
```

Observações:

- O frontend deve chamar somente o backend (`/api/compras/*`), evitando CORS no navegador.
- O servidor usa `accept: */*` e **não envia Authorization por padrão**.
- Se necessário em ambiente específico, defina `COMPRAS_API_TOKEN`.

### Sincronização (Em Desenvolvimento)

```
POST   /api/sync
```

## ⚙️ Configuração

### Alterar Porta

Edite `package.json`:

```json
{
  "scripts": {
    "start": "PORT=8080 node index.js"
  }
}
```

Ou use variável de ambiente:

```bash
PORT=8080 npm start
```

### Variáveis para integração Compras

Use o arquivo `.env.example` como base:

```bash
COMPRAS_API_BASE_URL=https://dadosabertos.compras.gov.br
COMPRAS_API_TIMEOUT_MS=15000
COMPRAS_API_MAX_RETRIES=2
COMPRAS_API_RETRY_BASE_DELAY_MS=400
COMPRAS_API_TOKEN=
```

## 🔒 Segurança

⚠️ **IMPORTANTE:**

- Este servidor é para uso em **rede local privada** apenas
- **NÃO** exponha à internet sem configurar autenticação e SSL
- Configure firewall para bloquear acesso externo

## 📝 Status de Desenvolvimento

- ✅ Health check
- ✅ Servir arquivos estáticos
- ✅ CORS habilitado
- 🔄 Endpoints de sincronização (placeholder)
- 🔄 Autenticação (planejado)
- 🔄 Upload de arquivos (planejado)

## 📞 Suporte

Para dúvidas ou problemas, consulte a documentação principal do SINGEM.
