# Refatoração Frontend SINGEM - Etapas 0 a 5

## Etapa 0 - Inventário (resumo objetivo)

| Arquivo                    | Categoria            | Problema observado                                          | Ação aplicada                                       |
| -------------------------- | -------------------- | ----------------------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| `index.html`               | Shell da aplicação   | Orquestração central com script único e acoplamento alto    | Mantido intacto para compatibilidade                |
| `js/app.js`                | App principal        | Concentra regras de empenho, NF, feedback e renderização    | Iniciado split por feature (empenho/NF) + shared UI |
| `js/services/apiClient.js` | HTTP                 | Cliente HTTP já existente, mas sem retorno padrão `{ok,data | error}`                                             | Criado `js/shared/lib/http.js` com contrato unificado |
| `js/nfValidator.js`        | Validação NF         | Fluxo crítico acoplado à tela                               | Reuso via feature `notaFiscal`                      |
| `js/relatoriosEmpenhos.js` | Relatórios           | Slice separado já existente                                 | Mantido como referência de modularização            |
| `js/catalogacaoTela.js`    | Feature CATMAT       | Feature isolada, bom candidato a padrão                     | Mantido sem alteração                               |
| `js/ui/feedback.js`        | Feedback UI          | Toast/loading já prontos, subutilizados no app principal    | App passou a usar via `js/shared/ui/*`              |
| `js/core/repository.js`    | Persistência central | Uso parcial em fluxos de tela                               | NF migrada para salvar via repository               |
| `config/importar-nfe.html` | Página auxiliar      | Fluxos paralelos de importação                              | Sem alteração nesta etapa                           |
| `consultas/index.html`     | Página de consultas  | Arquitetura própria, fora do escopo mínimo                  | Sem alteração nesta etapa                           |

### Top 5 duplicações identificadas

1. Mensageria de usuário com `alert/confirm` em vez de padrão único de UX.
2. Filtros/listagens de empenho misturados ao controller de tela.
3. Validação de NF extensa dentro de método monolítico da tela.
4. Loading distribuído sem camada compartilhada explícita.
5. Construção de HTML de listas/tabelas diretamente no app principal.

## Etapa 1 - Estrutura compartilhada criada

### Shared lib

- `js/shared/lib/dom.js`
- `js/shared/lib/http.js`
- `js/shared/lib/format.js`
- `js/shared/lib/storage.js`
- `js/shared/lib/validation.js`

### Shared UI

- `js/shared/ui/button.js`
- `js/shared/ui/input.js`
- `js/shared/ui/select.js`
- `js/shared/ui/textarea.js`
- `js/shared/ui/modal.js`
- `js/shared/ui/table.js`
- `js/shared/ui/toast.js`
- `js/shared/ui/loader.js`
- `js/shared/ui/formField.js`
- `js/shared/ui/pageHeader.js`

## Etapa 2 - Padrões base aplicados

- HTTP compartilhado com retorno padronizado em `shared/lib/http.js`.
- UX de erro/aviso/sucesso centralizada por `shared/ui/toast.js`.
- Loading centralizado por `shared/ui/loader.js`.
- Render de listas reaproveitável por `shared/ui/table.js`.
- Validação simples reutilizável por `shared/lib/validation.js`.

## Etapa 3 - Migração mínima de features (executada)

### Empenho

- Criado slice:
  - `js/features/empenho/api/empenhoApi.js`
  - `js/features/empenho/validators/empenhoValidators.js`
  - `js/features/empenho/ui/empenhoCadastroList.js`
  - `js/features/empenho/pages/empenhoPage.js`
- `js/app.js` passou a delegar:
  - carregamento da lista cadastro de empenhos
  - preenchimento de filtro de ano
  - filtro da lista
  - exclusão de empenho

### Nota Fiscal

- Criado slice:
  - `js/features/notaFiscal/api/notaFiscalApi.js`
  - `js/features/notaFiscal/validators/notaFiscalValidators.js`
  - `js/features/notaFiscal/pages/notaFiscalPage.js`
- `js/app.js` passou a delegar:
  - validação de entrada
  - validação contra empenho via `NFValidator`
  - montagem do objeto NF
  - persistência da NF via repository

## Etapa 4 - Limpeza controlada

- Sem remoção de arquivos legados nesta onda para evitar quebra de páginas auxiliares.
- Fluxo antigo permanece como fallback implícito (comportamento preservado).
- Próxima onda recomendada: migrar `entrega`, `relatórios` e `consultas` para `js/features/*`.

## Etapa 5 - Checklist final

- [x] Shared lib/ui criada em `js/shared/*`
- [x] Módulos de feature criados em `js/features/empenho/*`
- [x] Módulos de feature criados em `js/features/notaFiscal/*`
- [x] `js/app.js` integrado com slices de empenho e nota fiscal
- [x] Diagnóstico de erros sem problemas nos arquivos alterados
- [ ] Migrar restante das features com retirada gradual de código legado do `app.js`

## Sugestão de commits (opcional)

1. `refactor(frontend): criar camada shared (lib/ui) para http, loader e toast`
2. `refactor(frontend): modularizar fluxo de empenho em js/features/empenho`
3. `refactor(frontend): modularizar fluxo de nota fiscal em js/features/notaFiscal`
4. `refactor(frontend): integrar app.js às features e feedback compartilhado`
