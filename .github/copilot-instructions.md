# SINGEM - InstruÃ§Ãµes para Agentes de CodificaÃ§Ã£o

## VisÃ£o Geral do Sistema

SINGEM Ã© um sistema **offline-first** para controle de materiais do IF Baiano. AplicaÃ§Ã£o 100% client-side que roda em browser com **IndexedDB** como banco de dados. Sem backend tradicional - todo processamento ocorre no navegador.

## Arquitetura Core

### PadrÃµes Enterprise Implementados

- **Event-Driven Architecture** via [js/core/eventBus.js](js/core/eventBus.js) - use `emit()`, `on()`, `off()` para comunicaÃ§Ã£o entre mÃ³dulos
- **Repository Pattern** em [js/core/repository.js](js/core/repository.js) - camada Ãºnica de acesso a dados com validaÃ§Ã£o
- **Web Workers** para processamento pesado (PDFs) em [js/workers/](js/workers/) - nunca trave a UI
- **Async Queue** persistente em [js/core/asyncQueue.js](js/core/asyncQueue.js) - tarefas sobrevivem a reloads

### Fluxo de Dados

```
User Input â†’ InputValidator â†’ Repository (validaÃ§Ã£o) â†’ dbManager (IndexedDB) â†’ eventBus (notifica)
```

### Arquivos CrÃ­ticos

| Arquivo                                        | Responsabilidade                                                  |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| [js/app.js](js/app.js)                         | AplicaÃ§Ã£o principal (~7000 linhas) - classe `ControleMaterialApp` |
| [js/db.js](js/db.js)                           | `window.dbManager` - operaÃ§Ãµes IndexedDB                          |
| [js/neParser.js](js/neParser.js)               | Parser de PDFs de Notas de Empenho (padrÃ£o IF Baiano)             |
| [js/core/repository.js](js/core/repository.js) | ValidaÃ§Ã£o + persistÃªncia centralizada                             |

## ConvenÃ§Ãµes do Projeto

### Imports - Sempre ES Modules

```javascript
// âœ… Correto - named imports
import { emit, on } from './core/eventBus.js';
import repository from './core/repository.js';

// âŒ Evitar CommonJS
const x = require('./module');
```

### ValidaÃ§Ã£o - Use os validadores existentes

```javascript
// âœ… Preferir
import InputValidator from './core/inputValidator.js';
import { validateCNPJ } from './utils/validate.js';

// Para sanitizaÃ§Ã£o XSS
import { escapeHTML, safeHTML } from './utils/sanitize.js';
```

### Eventos - Nomenclatura

```javascript
// PadrÃ£o: entidade.acao ou entidade.acao:estado
emit('ne.salva', { id, numero });
emit('pdf.parse:done', { dados });
emit('pdf.parse:error', { error });
```

### PersistÃªncia - Sempre via Repository

```javascript
// âœ… Correto
await repository.saveEmpenho(empenho);
await repository.saveNotaFiscal(nf);

// âŒ Evitar acesso direto
await window.dbManager.salvarEmpenho(empenho);
```

### Feedback Visual

```javascript
import { showLoading, hideLoading, notifySuccess, notifyError } from './ui/feedback.js';

showLoading('Processando PDF...');
// ... operaÃ§Ã£o
hideLoading();
notifySuccess('âœ… OperaÃ§Ã£o concluÃ­da!');
```

## Comandos de Desenvolvimento

```powershell
# Servidor de desenvolvimento
npm run serve:dev          # http://localhost:8000

# Qualidade de cÃ³digo (EXECUTAR ANTES DE COMMITS)
npm run lint:fix           # Corrige problemas de lint
npm run format             # Formata cÃ³digo com Prettier

# Testes
npm test                   # Vitest - testes unitÃ¡rios
npm run test:coverage      # Cobertura mÃ­nima: 70%
npm run test:security      # Testes de seguranÃ§a (inputValidator)

# DiagnÃ³stico
npm run scan:orphans       # Encontra arquivos nÃ£o referenciados
npm run audit:node         # Auditoria de cÃ³digo
```

## Estrutura de Pastas Relevante

```
js/
â”œâ”€â”€ core/           # Infraestrutura (eventBus, repository, validators)
â”œâ”€â”€ utils/          # UtilitÃ¡rios (sanitize, validate, guard, throttle)
â”œâ”€â”€ ui/             # Componentes UI (feedback.js)
â”œâ”€â”€ workers/        # Web Workers para processamento assÃ­ncrono
â”œâ”€â”€ data/           # Dados estÃ¡ticos (naturezaSubelementos.js)
â””â”€â”€ settings/       # MÃ³dulo de configuraÃ§Ãµes

docs/               # DocumentaÃ§Ã£o tÃ©cnica detalhada
tests/              # Testes Vitest (setup.js configura mocks)
testes/             # Testes manuais HTML
```

## Peculiaridades Importantes

1. **IndexedDB Ã© a Ãºnica fonte de dados** - versÃ£o 6, stores: `empenhos`, `notasFiscais`, `entregas`, `configuracoes`, `arquivos`

2. **Estado do empenho em `empenhoDraft`** - objeto canÃ´nico em [js/app.js](js/app.js#L44-L69) - nunca crie estados paralelos

3. **Status de validaÃ§Ã£o** - empenhos usam `statusValidacao`: `'rascunho'` | `'validado'`. Notas fiscais sÃ³ vinculam a empenhos validados

4. **CNPJ sempre como dÃ­gitos puros** - armazene apenas nÃºmeros (14 dÃ­gitos), formate na exibiÃ§Ã£o

5. **TolerÃ¢ncia a erros de linting** - mÃ¡ximo 60 warnings permitidos (`--max-warnings 60`)

## DocumentaÃ§Ã£o Adicional

- Arquitetura Enterprise: [docs/INFRAESTRUTURA_ENTERPRISE.md](docs/INFRAESTRUTURA_ENTERPRISE.md)
- PadrÃµes de cÃ³digo: [docs/BOAS_PRATICAS.md](docs/BOAS_PRATICAS.md)
- Parser de NE: [docs/NE_PARSER.md](docs/NE_PARSER.md)
- Sistema de cache: [docs/SISTEMA_CACHE.md](docs/SISTEMA_CACHE.md)

