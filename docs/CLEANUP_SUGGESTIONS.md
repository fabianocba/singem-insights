# CLEANUP SUGGESTIONS

Relatório gerado automaticamente: arquivos e diretórios com nomes que podem indicar demos, testes, exemplos, mocks ou fixtures.

| Caminho                                        | Motivo (padrão encontrado)                        |                Última modificação | Suspeita de uso (Sim/Não/Incerto) | Observações               |
| ---------------------------------------------- | ------------------------------------------------- | --------------------------------: | --------------------------------- | ------------------------- |
| D:/IFDESK/teste-api-siasg.html                 | , t, e, s, t,                                     | 2025-11-04T17:20:32.3376178-03:00 | Não                               |                           |
| D:/IFDESK/teste-refined.html                   | , t, e, s, t,                                     | 2025-11-06T10:14:56.7703049-03:00 | Não                               |                           |
| D:/IFDESK/audit/selftest.html                  | , t, e, s, t,                                     | 2025-11-05T14:51:57.4149062-03:00 | Incerto                           |                           |
| D:/IFDESK/audit/selftest.js                    | , t, e, s, t,                                     | 2025-11-05T14:51:57.8732853-03:00 | Incerto                           |                           |
| D:/IFDESK/docs/TESTES_CONSULTAS.md             | , t, e, s, t,                                     | 2025-11-03T17:13:56.7602722-03:00 | Incerto                           |                           |
| D:/IFDESK/docs/TESTE_VALIDACAO_PARSER.md       | , t, e, s, t,                                     | 2025-10-31T09:56:18.3715498-03:00 | Incerto                           |                           |
| D:/IFDESK/js/neParser.examples.js              | , e, x, a, m, p, l, e, ,, e, x, a, m, p, l, e, s, | 2025-10-31T09:38:10.4855827-03:00 | Incerto                           |                           |
| D:/IFDESK/js/neParser.test.js                  | , t, e, s, t, ,, , ., t, e, s, t, , .,            | 2025-10-31T09:33:46.7239954-03:00 | Incerto                           |                           |
| D:/IFDESK/js/consultas/dadosMock.js            | , m, o, c, k,                                     | 2025-11-04T15:59:20.3885662-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/README.md                     | , t, e, s, t,                                     | 2025-11-03T15:21:16.4477361-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/teste-api-compras.html        | , t, e, s, t,                                     | 2025-11-04T15:49:03.1244241-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/teste-clique.html             | , t, e, s, t,                                     | 2025-11-04T14:38:10.0977954-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/teste-consultas.js            | , t, e, s, t,                                     | 2025-11-04T14:28:02.7278734-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/teste-simples.html            | , t, e, s, t,                                     | 2025-11-04T14:48:51.4159649-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/TESTE_EMPENHOS.md             | , t, e, s, t,                                     | 2025-10-31T09:48:08.9344061-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/html/teste-comparacao-nf.html | , t, e, s, t,                                     | 2025-10-31T13:18:15.4766829-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/html/teste-ne-parser.html     | , t, e, s, t,                                     | 2025-10-31T09:56:55.9193714-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/html/teste-nf-parser.html     | , t, e, s, t,                                     | 2025-10-31T11:01:22.9880296-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/html/teste-nf-validacao.html  | , t, e, s, t,                                     | 2025-10-31T13:47:31.4785635-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/html/teste.html               | , t, e, s, t,                                     | 2025-10-30T16:59:20.1264645-03:00 | Incerto                           |                           |
| D:/IFDESK/testes/pdfs/NE 039 CGSM COMERCIO.pdf | , t, e, s, t,                                     | 2024-05-15T16:19:19.1610000-03:00 | Incerto                           |                           |
| D:/IFDESK/tests/automated-tests.html           | , t, e, s, t, ,, t, e, s, t, s,                   | 2025-11-06T10:23:20.6831824-03:00 | Não                               |                           |
| D:/IFDESK/testes/                              | , d, i, r, e, c, t, o, r, y,                      | 2025-11-04T16:11:18.1305905-03:00 | Incerto                           | Directory matched by name |
| D:/IFDESK/tests/                               | , d, i, r, e, c, t, o, r, y,                      | 2025-11-06T10:22:20.0446022-03:00 | Incerto                           | Directory matched by name |
| D:/IFDESK/testes/html/                         | , d, i, r, e, c, t, o, r, y,                      | 2025-11-03T15:19:29.8813344-03:00 | Incerto                           | Directory matched by name |
| D:/IFDESK/testes/pdfs/                         | , d, i, r, e, c, t, o, r, y,                      | 2025-11-03T15:19:51.5284497-03:00 | Incerto                           | Directory matched by name |

## Critérios usados

- Busca case-insensitive por tokens em nomes/pastas: demo, sample, example, playground, sandbox, mock, fixture, test, spec, etc.
- Extensões filtradas: .js, .ts, .html, .css, .json, .md, .pdf, .png, .jpg, .svg, .gif

## Riscos e como validar antes de remover

- Verificar referências listadas: se `Suspeita de uso` = Sim ou Incerto, procurar manualmente no código e executar a aplicação.
- Para arquivos JS/HTML, verificar importações/links em `index.html`, `js/` e `config` antes de remover.
- Recomenda-se mover para `backup/_legacy` ou etiquetar como `@legacy` em vez de apagar direto.

## Sugestão de próximos passos

- Revisar cada item marcado como `Não` para confirmar que é seguro remover.
- Para `Incerto`, pesquisar por referência e executar testes manuais de navegação nas telas que podem usar o arquivo.
- Para `Sim`, investigar e atualizar rotas/imports antes de remover.
