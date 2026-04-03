# Simulacao Operacional Realista - SINGEM

## Objetivo

Preparar ambiente com massa de dados simulada, persistente e segura para demonstracoes e testes operacionais, sem sobrescrever dados reais.

## Principios aplicados

- Separacao explicita entre dado real e simulado.
- Carga idempotente: pode executar mais de uma vez sem duplicar registros-chave.
- Protecao de producao: carga bloqueada em producao sem confirmacao explicita.
- Persistencia completa: banco PostgreSQL + filesystem de storage.

## Estrutura de identificacao dos dados

A identificacao entre real e simulado usa:

- `origem_dados`: `real` ou `simulado`
- `modo_registro`: `real` ou `simulado` (onde ja existe no modelo)

Tabelas contempladas para separacao:

- `usuarios`
- `unidades_organizacionais`
- `setores_organizacionais`
- `fornecedores_almoxarifado`
- `materials`
- `empenhos`
- `notas_fiscais`
- `arquivos`

## Massa simulada gerada

O seed de simulacao cria dados com padrao institucional IF Baiano:

- Unidades organizacionais simuladas (reitoria/campi)
- Usuarios com perfis operacionais (`admin_superior`, `almoxarife`, `conferente`)
- Fornecedores com CNPJ em formato valido para testes
- Materiais com codigos `SIM-MAT-*`, natureza/subelemento e descricao operacional
- Empenhos com processo SUAP simulado, status funcional e itens
- Notas fiscais vinculadas a empenhos e itens de NF
- Arquivos/anexos vinculados a empenhos, notas, fornecedores e materiais

## Scripts disponiveis

Na raiz do projeto:

- Dry-run (sem escrita):
  - `npm run seed:simulacao:dry`
- Aplicacao efetiva:
  - `npm run seed:simulacao`

No backend:

- Dry-run:
  - `npm --prefix server run db:seed:simulacao:dry`
- Aplicacao:
  - `npm --prefix server run db:seed:simulacao`

Wrapper PowerShell:

- `scripts/seed-simulacao-realista.ps1`
- O wrapper define fallback local de conexao (`127.0.0.1:5432`) quando variaveis de banco nao estao presentes.
- Parametros opcionais para override rapido:
  - `-DbHost`, `-DbPort`, `-DbName`, `-DbUser`, `-DbPassword`

## Seguranca operacional

- Em producao (`NODE_ENV=production`), a carga e bloqueada por padrao.
- Para liberar conscientemente em producao:
  - `ALLOW_SIMULATED_SEED=true`

## Passo a passo recomendado

1. Subir stack:
   - `npm run start`
2. Rodar dry-run:
   - `npm run seed:simulacao:dry`
3. Aplicar carga:
   - `npm run seed:simulacao`
4. Validar contagens simuladas:
   - `SELECT origem_dados, COUNT(*) FROM empenhos GROUP BY origem_dados;`
   - `SELECT origem_dados, COUNT(*) FROM notas_fiscais GROUP BY origem_dados;`
   - `SELECT origem_dados, COUNT(*) FROM arquivos GROUP BY origem_dados;`

## Garantia de nao sobrescrita de dados reais

A carga usa chaves simuladas dedicadas (prefixos e codigos `SIM-*`) e operacoes seguras (`ON CONFLICT DO NOTHING` em chaves de negocio), evitando alteracao de registros reais existentes.

## Observacoes

- O seed depende das migrations oficiais e executa `runMigrations` antes da carga.
- Arquivos simulados sao gravados no storage persistente e registrados em `arquivos`.
- Pode ser executado repetidamente para manter ambiente de demonstracao atualizado.
