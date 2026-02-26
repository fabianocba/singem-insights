# SINGEM - Instruções para Agentes de Codificação

## Visão Geral do Sistema

SINGEM é um sistema **offline-first** para controle de materiais do IF Baiano. Aplicação 100% client-side que roda em browser com **IndexedDB** como banco de dados. Sem backend tradicional - todo processamento ocorre no navegador.

## Arquitetura Core

### Padrões Enterprise Implementados

- **Event-Driven Architecture** via [js/core/eventBus.js](js/core/eventBus.js) - use `emit()`, `on()`, `off()` para comunicação entre módulos
- **Repository Pattern** em [js/core/repository.js](js/core/repository.js) - camada única de acesso a dados com validação
- **Web Workers** para processamento pesado (PDFs) em [js/workers/](js/workers/) - nunca trave a UI
- **Async Queue** persistente em [js/core/asyncQueue.js](js/core/asyncQueue.js) - tarefas sobrevivem a reloads

### Fluxo de Dados

```
User Input → InputValidator → Repository (validação) → dbManager (IndexedDB) → eventBus (notifica)
```

### Arquivos Críticos

| Arquivo                                        | Responsabilidade                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| [js/app.js](js/app.js)                         | Aplicação principal (~7000 linhas) - classe `ControleMaterialApp` |
| [js/db.js](js/db.js)                           | `window.dbManager` - operações IndexedDB                          |
| [js/neParser.js](js/neParser.js)               | Parser de PDFs de Notas de Empenho (padrão IF Baiano)              |
| [js/core/repository.js](js/core/repository.js) | Validação + persistência centralizada                            |

## Convenções do Projeto

### Imports - Sempre ES Modules

```javascript
// ✅ Correto - named imports
import { emit, on } from './core/eventBus.js';
import repository from './core/repository.js';

// ❌ Evitar CommonJS
const x = require('./module');
```

### Validação - Use os validadores existentes

```javascript
// ✅ Preferir
import InputValidator from './core/inputValidator.js';
import { validateCNPJ } from './utils/validate.js';

// Para sanitização XSS
import { escapeHTML, safeHTML } from './utils/sanitize.js';
```

### Eventos - Nomenclatura

```javascript
// Padrão: entidade.acao ou entidade.acao:estado
emit('ne.salva', { id, numero });
emit('pdf.parse:done', { dados });
emit('pdf.parse:error', { error });
```

### Persistência - Sempre via Repository

```javascript
// ✅ Correto
await repository.saveEmpenho(empenho);
await repository.saveNotaFiscal(nf);

// ❌ Evitar acesso direto
await window.dbManager.salvarEmpenho(empenho);
```

### Feedback Visual

```javascript
import { showLoading, hideLoading, notifySuccess, notifyError } from './ui/feedback.js';

showLoading('Processando PDF...');
// ... operação
hideLoading();
notifySuccess('✅ Operação concluída!');
```

## Comandos de Desenvolvimento

```powershell
# Servidor de desenvolvimento
npm run serve:dev          # http://localhost:8000

# Qualidade de código (EXECUTAR ANTES DE COMMITS)
npm run lint:fix           # Corrige problemas de lint
npm run format             # Formata código com Prettier

# Testes
npm test                   # Vitest - testes unitários
npm run test:coverage      # Cobertura mínima: 70%
npm run test:security      # Testes de segurança (inputValidator)

# Diagnóstico
npm run scan:orphans       # Encontra arquivos não referenciados
npm run audit:node         # Auditoria de código
```

## Estrutura de Pastas Relevante

```
js/
├── core/           # Infraestrutura (eventBus, repository, validators)
├── utils/          # Utilitários (sanitize, validate, guard, throttle)
├── ui/             # Componentes UI (feedback.js)
├── workers/        # Web Workers para processamento assíncrono
├── data/           # Dados estáticos (naturezaSubelementos.js)
└── settings/       # Módulo de configurações

docs/               # Documentação técnica detalhada
tests/              # Testes Vitest (setup.js configura mocks)
testes/             # Testes manuais HTML
```

## Peculiaridades Importantes

1. **IndexedDB é a única fonte de dados** - versão 6, stores: `empenhos`, `notasFiscais`, `entregas`, `configuracoes`, `arquivos`

2. **Estado do empenho em `empenhoDraft`** - objeto canônico em [js/app.js](js/app.js#L44-L69) - nunca crie estados paralelos

3. **Status de validação** - empenhos usam `statusValidacao`: `'rascunho'` | `'validado'`. Notas fiscais só vinculam a empenhos validados

4. **CNPJ sempre como dígitos puros** - armazene apenas números (14 dígitos), formate na exibição

5. **Tolerância a erros de linting** - máximo 60 warnings permitidos (`--max-warnings 60`)

## Documentação Adicional

- Arquitetura Enterprise: [docs/INFRAESTRUTURA_ENTERPRISE.md](docs/INFRAESTRUTURA_ENTERPRISE.md)
- Padrões de código: [docs/BOAS_PRATICAS.md](docs/BOAS_PRATICAS.md)
- Parser de NE: [docs/NE_PARSER.md](docs/NE_PARSER.md)
- Sistema de cache: [docs/SISTEMA_CACHE.md](docs/SISTEMA_CACHE.md)
