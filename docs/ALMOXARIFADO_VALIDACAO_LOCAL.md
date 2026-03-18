# Validação Local do Almoxarifado

Este roteiro evita dependência de VPS, túnel SSH ou banco remoto. A ideia é validar o módulo de almoxarifado usando apenas backend e frontend locais.

## 1. Subir frontend e backend locais

Use as tasks já existentes do workspace:

- SINGEM: BACKEND
- SINGEM: FRONTEND

Ou execute manualmente os comandos equivalentes do projeto.

## 2. Confirmar saúde do backend local

O contrato do almoxarifado espera um backend disponível em `http://localhost:3000` por padrão.

Teste rápido:

```powershell
Invoke-RestMethod http://localhost:3000/health
```

## 3. Executar validação automatizada do contrato

Sem token de autenticação:

```powershell
npm run validate:almox
```

Com token JWT de teste:

```powershell
$env:TEST_AUTH_TOKEN = 'SEU_TOKEN_AQUI'
npm run validate:almox
```

Com base URL diferente:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-almoxarifado-local.ps1 -BaseUrl http://localhost:3001
```

Com abertura automática do frontend após a suíte:

```powershell
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\validate-almoxarifado-local.ps1 -OpenFrontend
```

### O que o script valida

- `GET /api/almoxarifado/meta` sem token deve retornar `401`
- com `TEST_AUTH_TOKEN`, o script valida:
  - meta
  - criação de conta contábil
  - criação de item
  - nota de entrada
  - criação de solicitação
  - avanço de status da solicitação
  - listagens de itens, movimentações, dashboard, resumo e auditoria

## 4. Checklist manual da UI

Após login no frontend local:

1. Abrir a entrada `Almoxarifado` no sidebar ou no painel inicial.
2. Confirmar carregamento da tela com:
   - hero do módulo
   - abas `Visao geral`, `Itens`, `Entradas e movimentos`, `Solicitacoes`, `Auditoria`
3. Na aba `Visao geral`, testar:
   - criação de conta contábil
   - criação de item
   - registro de NF de entrada
   - movimentação manual de ajuste ou transferência
   - abertura de solicitação
4. Na aba `Itens`, aplicar filtros e conferir a tabela.
5. Na aba `Entradas e movimentos`, validar atualização das tabelas após registrar NF e movimentação.
6. Na aba `Solicitacoes`, usar os botões de avanço rápido para mover o fluxo.
7. Na aba `Auditoria`, confirmar visibilidade apenas com perfil admin.

## 5. Observações práticas

- A tela usa o backend do almoxarifado; sem API local disponível ela não consegue consolidar os painéis.
- O cliente HTTP agora suporta `PUT`, `PATCH`, `DELETE` e leitura do envelope completo para listagens paginadas.
- O contrato automatizado usa o arquivo `server/tests/almoxarifado.contract.test.js`.
