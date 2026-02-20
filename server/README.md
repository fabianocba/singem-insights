# Servidor SINGEM

Servidor Node.js opcional para compartilhamento de dados do SINGEM em rede local (LAN).

## ðŸ“‹ PrÃ©-requisitos

- Node.js 16+ instalado
- NPM ou Yarn

## ðŸš€ InstalaÃ§Ã£o

```bash
cd server
npm install
```

## â–¶ï¸ Executar

### Modo Normal

```bash
npm start
```

### Modo Desenvolvimento (com auto-reload)

```bash
npm run dev
```

O servidor ficarÃ¡ disponÃ­vel em:

- **Local:** http://localhost:3000
- **Rede:** http://\<seu-ip\>:3000

## ðŸ” Endpoints DisponÃ­veis

### Health Check

```
GET /health
```

Retorna status do servidor.

### InformaÃ§Ãµes do Sistema

```
GET /api/info
```

Retorna informaÃ§Ãµes do SINGEM.

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

### SincronizaÃ§Ã£o (Em Desenvolvimento)

```
POST   /api/sync
```

## âš™ï¸ ConfiguraÃ§Ã£o

### Alterar Porta

Edite `package.json`:

```json
{
  "scripts": {
    "start": "PORT=8080 node index.js"
  }
}
```

Ou use variÃ¡vel de ambiente:

```bash
PORT=8080 npm start
```

## ðŸ”’ SeguranÃ§a

âš ï¸ **IMPORTANTE:**

- Este servidor Ã© para uso em **rede local privada** apenas
- **NÃƒO** exponha Ã  internet sem configurar autenticaÃ§Ã£o e SSL
- Configure firewall para bloquear acesso externo

## ðŸ“ Status de Desenvolvimento

- âœ… Health check
- âœ… Servir arquivos estÃ¡ticos
- âœ… CORS habilitado
- ðŸ”„ Endpoints de sincronizaÃ§Ã£o (placeholder)
- ðŸ”„ AutenticaÃ§Ã£o (planejado)
- ðŸ”„ Upload de arquivos (planejado)

## ðŸ“ž Suporte

Para dÃºvidas ou problemas, consulte a documentaÃ§Ã£o principal do SINGEM.

