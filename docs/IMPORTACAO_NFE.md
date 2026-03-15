# Sistema de Importação de NF-e - SINGEM

## Visão Geral

O módulo de importação de NF-e permite importar Notas Fiscais Eletrônicas para o sistema SINGEM de duas formas:

1. **Upload Manual de XML** - Importação de arquivos XML da NF-e
2. **Consulta SEFAZ (DF-e)** - Importação automática via WebService SEFAZ (requer certificado digital)

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│   ┌─────────────────────┐    ┌──────────────────────────────┐       │
│   │  importar-nfe.html  │────│    nfeImportClient.js        │       │
│   │    (Interface)      │    │  (Cliente HTTP/Comunicação)  │       │
│   └─────────────────────┘    └──────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                                        │ HTTP REST API
                                        ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│   ┌─────────────────────┐                                           │
│   │  server/index.js    │ ──── Express Server (porta 3000)          │
│   └─────────────────────┘                                           │
│            │                                                         │
│            ▼                                                         │
│   ┌─────────────────────────────┐                                   │
│   │  routes/nfe.routes.js       │ ──── Endpoints da API             │
│   └─────────────────────────────┘                                   │
│            │                                                         │
│            ▼                                                         │
│   ┌─────────────────────────────┐                                   │
│   │  services/NfeImportService  │ ──── Orquestração                 │
│   └─────────────────────────────┘                                   │
│            │                                                         │
│     ┌──────┴──────┬──────────────────┐                              │
│     ▼             ▼                  ▼                               │
│  ┌────────────┐ ┌──────────────┐ ┌───────────────┐                  │
│  │ DfeClient  │ │ xmlParser.js │ │ danfeGenerator│                  │
│  │ (SEFAZ)    │ │ (XML→JSON)   │ │ (PDF)         │                  │
│  └────────────┘ └──────────────┘ └───────────────┘                  │
└─────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
                              ┌─────────────────┐
                              │  storage/nfe/   │
                              │  ├── xml/       │
                              │  └── pdf/       │
                              └─────────────────┘
```

---

## Estrutura de Arquivos

```
server/
├── index.js                         # Express server (porta 3000)
├── package.json                     # Dependências backend
├── routes/
│   └── nfe.routes.js               # Endpoints REST da API
├── services/
│   └── NfeImportService.js         # Serviço de orquestração
├── integrations/
│   └── sefaz/
│       └── DfeClient.js            # Cliente SOAP SEFAZ DF-e
└── utils/
    ├── xmlParser.js                # Parser de XML NF-e
    └── danfeGenerator.js           # Gerador de PDF DANFE

js/
└── nfeImportClient.js              # Cliente frontend (ES Module)

config/
└── importar-nfe.html               # Interface de importação

storage/nfe/
├── xml/                            # XMLs importados ({chave}.xml)
└── pdf/                            # DANFEs gerados ({chave}.pdf)
```

---

## API REST

### Endpoints Disponíveis

| Método | Endpoint                | Descrição               |
| ------ | ----------------------- | ----------------------- |
| `POST` | `/api/nfe/importar`     | Importar NF-e via SEFAZ |
| `POST` | `/api/nfe/upload`       | Upload de arquivo XML   |
| `POST` | `/api/nfe/upload-text`  | Enviar XML como texto   |
| `GET`  | `/api/nfe/danfe/:chave` | Obter PDF do DANFE      |
| `GET`  | `/api/nfe/xml/:chave`   | Obter XML da NF-e       |
| `GET`  | `/api/nfe/listar`       | Listar NF-e importadas  |
| `GET`  | `/api/nfe/status`       | Status do serviço       |

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

## Configuração

### 1. Instalar Dependências

```bash
cd server
npm install
```

### 2. Variáveis de Ambiente

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

O servidor estará disponível em `http://localhost:3000`.

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

O cliente emite eventos via `eventBus` quando uma NF-e é importada:

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
- Emissão: ICP-Brasil (CA válida)

### Conexão de Rede

- Acesso aos WebServices da SEFAZ
- Porta 443 (HTTPS) liberada
- Sem bloqueio de firewall para:
  - `*.sefaz.gov.br`
  - `*.fazenda.gov.br`

---

## Limitações

1. **SEFAZ via Browser**: Não é possível consultar SEFAZ diretamente do navegador devido a:
   - Restrições de CORS
   - Impossibilidade de usar certificados digitais
   - Protocolo SOAP não suportado nativamente

2. **Backend Obrigatório**: Para consulta SEFAZ, o servidor Node.js deve estar rodando.

3. **Upload Manual**: Sempre funciona, independente do certificado.

---

## Troubleshooting

### Servidor não inicia

```bash
cd server
npm install  # Reinstala dependências
npm start
```

### Erro de certificado

- Verifique se o caminho do certificado está correto
- Verifique se a senha está correta
- Certifique-se que o certificado é do tipo A1

### DANFE não gera

- Verifique se a dependência `pdfkit` está instalada
- Verifique permissões de escrita em `storage/nfe/pdf/`

### XML não é reconhecido

- O XML deve ser de NF-e autorizada (com `nfeProc`)
- Deve conter a tag `<infNFe>` com todos os dados

---

## Dependências do Backend

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

- Implementação inicial
- Upload de XML manual
- Integração SEFAZ DF-e
- Geração de DANFE em PDF
- Interface de importação
