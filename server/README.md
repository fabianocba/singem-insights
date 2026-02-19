# Servidor IFDESK

Servidor Node.js opcional para compartilhamento de dados do IFDESK em rede local (LAN).

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

Retorna informações do IFDESK.

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

Para dúvidas ou problemas, consulte a documentação principal do IFDESK.
