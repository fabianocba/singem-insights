# Validacao Ponta a Ponta - Persistencia SINGEM (2026-04-02)

## Escopo

Validacao completa da arquitetura de persistencia implementada para:

- storage de arquivos em filesystem persistente
- metadados em banco PostgreSQL
- configuracoes de sistema persistidas em tabela dedicada
- fluxos de upload/list/download por modulo (empenhos e notas fiscais)
- criacao de empenho com itens em `empenho_items` (sem uso da coluna legada `empenhos.itens`)

## Ambiente de validacao

- Workspace: `C:\SINGEM`
- Runtime: Docker Compose dev
- API base: `http://localhost:3000`
- Data: 2026-04-02

## Evidencias de execucao

### 1) Stack e health

- `npm run start` -> PASS
- `GET /health` -> HTTP 200
- `GET /api/health` -> HTTP 200

Resultado: backend ativo e conectado ao banco.

### 2) Banco e migrations

Comandos SQL executados no container Postgres:

- `SELECT id FROM _migrations WHERE id='013_storage_persistencia';` -> retornou registro
- validacao de tabelas existentes -> `arquivos`, `configuracoes_sistema`, `empenho_items`

Resultado: migracao 013 aplicada e estruturas esperadas disponiveis.

### 3) Qualidade de codigo

- `npm run format:check` -> PASS
- `npm run lint` -> PASS
- `npm test` -> PASS (20 total, 16 pass, 0 fail, 4 skipped)

Resultado: qualidade e regressao automatica sem falhas.

### 4) Smoke de arquivos por modulo

Script executado:

- `scripts/smoke-arquivos-modulos-seed.ps1`

Resultados observados:

- LOGIN -> 200
- UPLOAD_EMP -> 201
- UPLOAD_NF -> 201
- LIST_EMP -> 200
- LIST_NF -> 200
- DOWNLOAD_EMP -> 200
- DOWNLOAD_NF -> 200

Resultado: fluxo ponta a ponta de arquivos funcionando nos modulos de empenhos e notas fiscais.

### 5) Smoke de criacao de empenho com itens

Script executado:

- `tmp-quick-empenho-test.ps1`

Resultado observado:

- LOGIN -> OK
- `POST /api/empenhos` -> HTTP 201
- sem erro de coluna `itens` em `empenhos`

Resultado: criacao de empenho validada com persistencia de itens na tabela normalizada `empenho_items`.

## Conclusao

A validacao ponta a ponta foi concluida com sucesso para o escopo de persistencia. Os fluxos criticos estao operacionais e os checks de qualidade automatizados estao verdes.

## Observacoes operacionais

- Credenciais e variaveis de ambiente devem seguir os exemplos em `server/.env.example` e `docker/prod/.env.example`.
- Para producao em VPS, seguir `docs/PERSISTENCIA_PRODUCAO_VPS.md` e preparar diretórios com `scripts/vps-storage-init.sh`.
