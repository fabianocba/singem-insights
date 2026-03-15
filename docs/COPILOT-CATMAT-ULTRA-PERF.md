COPILOT: SINGEM ULTRA PERFORMANCE (FOCO CATMAT) + ROTAS PUBLICAS (SEM TOKEN)

IMPORTANTE:

- SENHAS SAO DO BANCO (DB). NAO COLOCAR SENHA EM CODIGO, LOGS, PRINTS OU PROMPTS.
- Guardar DB password somente em .env (server/.env) e manter no .gitignore.
- O usuario NAO quer token. As rotas /api/integracoes/\*\* devem funcionar SEM Authorization.

PROVA DO GARGALO:

- Bench local: UASG/Fornecedor ~240ms; /health ~388ms.
- CATMAT /catmat/itens ~33s e retorna COMPRAS_TIMEOUT (10000ms).
- Alguns endpoints retornam "Token não fornecido" (texto quebrado "n├úo") -> auth indevida + encoding.

OBJETIVO:

- 50x mais rapido no modulo consulta CATMAT (principalmente em chamadas repetidas).
- Remover exigencia de token nas rotas /api/integracoes/\*\*.
- Implementar cache + persistencia + resiliencia para quando Compras.gov estiver lento.
- Corrigir UTF-8 nas respostas e logs.

FAZER NO CODIGO (SEM POLUIR PROJETO):

1. AUTH BYPASS PARA INTEGRACOES (SEM TOKEN)
   - Identificar middleware de auth e onde ele protege /api/integracoes/\*\*
   - Criar ENV: INTEGRACOES_PUBLICAS=true (default true em dev; permitir true em main)
   - Se INTEGRACOES_PUBLICAS=true, liberar todas rotas /api/integracoes/\*\* sem autenticação.
   - Ajustar mensagens de erro para UTF-8 correto.

2. CATMAT: CACHE AGRESSIVO + STALE-WHILE-REVALIDATE + COALESCING
   - Criar cache em memoria (Map com TTL) por chave:
     catmat:itens:{termo}:{pagina}:{tamanhoPagina}:{filtros}
   - Implementar:
     - HIT: responde imediato
     - STALE: responde imediato + refresh em background
     - MISS: consulta externo + salva
   - Request coalescing: 1 upstream por chave (Promise compartilhada).

3. DB CACHE (para 50x real)
   - Criar tabela simples no PostgreSQL para cache por chave:
     catmat_cache(key text primary key, payload jsonb, fetched_at timestamptz, expires_at timestamptz, hits int)
   - Fluxo:
     - tenta DB -> memoria -> upstream
     - no sucesso upstream, grava DB e memoria
     - no timeout upstream, devolve stale do DB/memoria se existir
   - Garantir que a senha do banco continue somente em .env.

4. TIMEOUT/RETRY/CIRCUIT BREAKER (nao deixar 33s)
   - COMPRAS_TIMEOUT_MS (default 10000) mas garantir que total nao vire 30s+.
   - Retry no max 1 com backoff curto + jitter.
   - Circuit breaker: se muitos timeouts, abrir por 60s e servir cache.
   - Usar AbortController no fetch.

5. PAGINACAO / LIMITES
   - tamanhoPagina max 100/200 (nunca 9999)
   - termo minimo 3 caracteres (retornar 400 amigavel)

6. FRONTEND MODULO CONSULTA
   - debounce 300-500ms
   - cancelamento de request anterior (AbortController)
   - cache em memoria no client
   - exibir "cache" + "atualizando..." se stale

7. HEADERS / METRICAS
   - Habilitar compression no express (se nao tiver)
   - Adicionar headers:
     X-Cache: HIT|MISS|STALE
     X-Upstream-Ms: n
     Content-Type sempre com charset=utf-8

8. TESTES
   - Ajustar tests/integracoes.contract.test.js:
     - parar de esperar 401 nas rotas integracoes (agora publicas)
     - testar cache (segunda chamada deve ser muito mais rapida e X-Cache=HIT)

ENTREGA:

- Mostrar lista de arquivos editados.
- Aplicar mudancas com minimo de novos arquivos.
- Commit: perf(integracoes): catmat cache+db + public endpoints + resiliencia
