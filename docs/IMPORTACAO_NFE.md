# Sistema de ImportaÃ§Ã£o de NF-e - SINGEM

## VisÃ£o Geral

O mÃ³dulo de importaÃ§Ã£o de NF-e permite importar Notas Fiscais EletrÃ´nicas para o sistema SINGEM de duas formas:

1. **Upload Manual de XML** - ImportaÃ§Ã£o de arquivos XML da NF-e
2. **Consulta SEFAZ (DF-e)** - ImportaÃ§Ã£o automÃ¡tica via WebService SEFAZ (requer certificado digital)

---

## Arquitetura

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                           FRONTEND                                   â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”       â”‚
â”‚   â”‚  importar-nfe.html  â”‚â”€â”€â”€â”€â”‚    nfeImportClient.js        â”‚       â”‚
â”‚   â”‚    (Interface)      â”‚    â”‚  (Cliente HTTP/ComunicaÃ§Ã£o)  â”‚       â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜       â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                        â”‚
                                        â”‚ HTTP REST API
                                        â–¼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚                           BACKEND                                    â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                           â”‚
â”‚   â”‚  server/index.js    â”‚ â”€â”€â”€â”€ Express Server (porta 3000)          â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                           â”‚
â”‚            â”‚                                                         â”‚
â”‚            â–¼                                                         â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                   â”‚
â”‚   â”‚  routes/nfe.routes.js       â”‚ â”€â”€â”€â”€ Endpoints da API             â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                   â”‚
â”‚            â”‚                                                         â”‚
â”‚            â–¼                                                         â”‚
â”‚   â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                                   â”‚
â”‚   â”‚  services/NfeImportService  â”‚ â”€â”€â”€â”€ OrquestraÃ§Ã£o                 â”‚
â”‚   â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                                   â”‚
â”‚            â”‚                                                         â”‚
â”‚     â”Œâ”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                              â”‚
â”‚     â–¼             â–¼                  â–¼                               â”‚
â”‚  â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”                  â”‚
â”‚  â”‚ DfeClient  â”‚ â”‚ xmlParser.js â”‚ â”‚ danfeGeneratorâ”‚                  â”‚
â”‚  â”‚ (SEFAZ)    â”‚ â”‚ (XMLâ†’JSON)   â”‚ â”‚ (PDF)         â”‚                  â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜                  â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                        â”‚
                                        â–¼
                              â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                              â”‚  storage/nfe/   â”‚
                              â”‚  â”œâ”€â”€ xml/       â”‚
                              â”‚  â””â”€â”€ pdf/       â”‚
                              â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Estrutura de Arquivos

```
server/
â”œâ”€â”€ index.js                         # Express server (porta 3000)
â”œâ”€â”€ package.json                     # DependÃªncias backend
â”œâ”€â”€ routes/
â”‚   â””â”€â”€ nfe.routes.js               # Endpoints REST da API
â”œâ”€â”€ services/
â”‚   â””â”€â”€ NfeImportService.js         # ServiÃ§o de orquestraÃ§Ã£o
â”œâ”€â”€ integrations/
â”‚   â””â”€â”€ sefaz/
â”‚       â””â”€â”€ DfeClient.js            # Cliente SOAP SEFAZ DF-e
â””â”€â”€ utils/
    â”œâ”€â”€ xmlParser.js                # Parser de XML NF-e
    â””â”€â”€ danfeGenerator.js           # Gerador de PDF DANFE

js/
â””â”€â”€ nfeImportClient.js              # Cliente frontend (ES Module)

config/
â””â”€â”€ importar-nfe.html               # Interface de importaÃ§Ã£o

storage/nfe/
â”œâ”€â”€ xml/                            # XMLs importados ({chave}.xml)
â””â”€â”€ pdf/                            # DANFEs gerados ({chave}.pdf)
```

---

## API REST

### Endpoints DisponÃ­veis

| MÃ©todo | Endpoint                | DescriÃ§Ã£o               |
| ------ | ----------------------- | ----------------------- |
| `POST` | `/api/nfe/importar`     | Importar NF-e via SEFAZ |
| `POST` | `/api/nfe/upload`       | Upload de arquivo XML   |
| `POST` | `/api/nfe/upload-text`  | Enviar XML como texto   |
| `GET`  | `/api/nfe/danfe/:chave` | Obter PDF do DANFE      |
| `GET`  | `/api/nfe/xml/:chave`   | Obter XML da NF-e       |
| `GET`  | `/api/nfe/listar`       | Listar NF-e importadas  |
| `GET`  | `/api/nfe/status`       | Status do serviÃ§o       |

### Exemplos de Uso

#### Importar via SEFAZ

```bash
curl -X POST http://localhost:3000/api/nfe/importar \
  -H "Content-Type: application/json" \
  -d '{"chaveAcesso": "35230912345678901234550010000001231123456789"}'
```

#### Upload de XML

```bash
curl -X POST http://localhost:3000/api/nfe/upload \
  -F "file=@/caminho/para/nfe.xml"
```

#### Obter DANFE

```bash
curl http://localhost:3000/api/nfe/danfe/35230912345678901234550010000001231123456789 \
  --output danfe.pdf
```

---

## ConfiguraÃ§Ã£o

### 1. Instalar DependÃªncias

```bash
cd server
npm install
```

### 2. VariÃ¡veis de Ambiente

Para habilitar consulta via SEFAZ, configure:

```bash
# Windows (PowerShell)
$env:CERTIFICADO_PATH = "C:\caminho\certificado.pfx"
$env:CERTIFICADO_SENHA = "senha_do_certificado"
$env:SEFAZ_AMBIENTE = "producao"  # ou "homologacao"

# Linux/Mac
export CERTIFICADO_PATH="/caminho/certificado.pfx"
export CERTIFICADO_SENHA="senha_do_certificado"
export SEFAZ_AMBIENTE="producao"
```

### 3. Iniciar o Servidor

```bash
cd server
npm start
```

O servidor estarÃ¡ disponÃ­vel em `http://localhost:3000`.

---

## Uso no Frontend

### Usando o Cliente JavaScript

```javascript
import nfeImportClient from './js/nfeImportClient.js';

// Verificar status do servidor
const status = await nfeImportClient.verificarServico();
console.log(status);

// Importar por chave (SEFAZ)
const resultado = await nfeImportClient.importarPorChave('35230912345678901234550010000001231123456789');

// Upload de arquivo
const resultado = await nfeImportClient.importarXmlUpload(arquivoXml);

// Upload de texto XML
const resultado = await nfeImportClient.importarXmlTexto(xmlContent);

// Listar importadas
const lista = await nfeImportClient.listarImportadas();

// Abrir DANFE
nfeImportClient.abrirDanfe('35230912345678901234550010000001231123456789');
```

### Eventos Emitidos

O cliente emite eventos via `eventBus` quando uma NF-e Ã© importada:

```javascript
import { on } from './core/eventBus.js';

on('nfe.importada', ({ chaveAcesso, origem }) => {
  console.log(`NF-e ${chaveAcesso} importada via ${origem}`);
});
```

---

## Requisitos para SEFAZ

### Certificado Digital A1

- Formato: `.pfx` ou `.p12`
- Tipo: A1 (armazenado em arquivo)
- Validade: Dentro do prazo
- EmissÃ£o: ICP-Brasil (CA vÃ¡lida)

### ConexÃ£o de Rede

- Acesso aos WebServices da SEFAZ
- Porta 443 (HTTPS) liberada
- Sem bloqueio de firewall para:
  - `*.sefaz.gov.br`
  - `*.fazenda.gov.br`

---

## LimitaÃ§Ãµes

1. **SEFAZ via Browser**: NÃ£o Ã© possÃ­vel consultar SEFAZ diretamente do navegador devido a:
   - RestriÃ§Ãµes de CORS
   - Impossibilidade de usar certificados digitais
   - Protocolo SOAP nÃ£o suportado nativamente

2. **Backend ObrigatÃ³rio**: Para consulta SEFAZ, o servidor Node.js deve estar rodando.

3. **Upload Manual**: Sempre funciona, independente do certificado.

---

## Troubleshooting

### Servidor nÃ£o inicia

```bash
cd server
npm install  # Reinstala dependÃªncias
npm start
```

### Erro de certificado

- Verifique se o caminho do certificado estÃ¡ correto
- Verifique se a senha estÃ¡ correta
- Certifique-se que o certificado Ã© do tipo A1

### DANFE nÃ£o gera

- Verifique se a dependÃªncia `pdfkit` estÃ¡ instalada
- Verifique permissÃµes de escrita em `storage/nfe/pdf/`

### XML nÃ£o Ã© reconhecido

- O XML deve ser de NF-e autorizada (com `nfeProc`)
- Deve conter a tag `<infNFe>` com todos os dados

---

## DependÃªncias do Backend

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "body-parser": "^1.20.2",
  "multer": "^1.4.5-lts.1",
  "@xmldom/xmldom": "^0.8.10",
  "pdfkit": "^0.14.0",
  "soap": "^1.0.4",
  "https-proxy-agent": "^7.0.2"
}
```

---

## Changelog

### v1.0.0 (2024)

- ImplementaÃ§Ã£o inicial
- Upload de XML manual
- IntegraÃ§Ã£o SEFAZ DF-e
- GeraÃ§Ã£o de DANFE em PDF
- Interface de importaÃ§Ã£o

