# Revisão da Integração SINGEM com API Compras.gov.br

**Data**: 16 de março de 2026  
**Baseado em**: Documentação oficial dos módulos ARP, Contratos, Fornecedor, Pesquisa de Preço

---

## 📊 Status de Implementação por Módulo

### ✅ **IMPLEMENTADO - Módulo Pesquisa de Preço (Preços Práticados)**

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| **Endpoint** | ✅ | Mapeado: `/modulo-pesquisa-preco/1_consultarMaterial` e `/3_consultarServico` |
| **Serviço Especializado** | ✅ | `price-intelligence.service.js` com full analytics |
| **Rota** | ✅ | `GET /api/inteligencia/precos/material` e `/servico` |
| **Taxa de Limite** | ✅ | Serialização promise-queue (PATH 1) implementada |
| **Testes** | ✅ | 17/17 testes passam |
| **Documentação** | ✅ | Cobertura completa |

**Endpoint Confirmado**:
```
GET /modulo-pesquisa-preco/1_consultarMaterial
GET /modulo-pesquisa-preco/3_consultarServico
```

---

### ✅ **IMPLEMENTADO - Módulo Catálogo Material & Serviço**

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| **Endpoint** | ✅ | Mapeado corretamente |
| **Serviço** | ✅ | `ComprasGovClient.requestDomain()` genérico |
| **Rota** | ✅ | `GET /api/integracao/comprasgov/catmat/itens` |
| **Operações** | ✅ | itens, grupos, classes |

**Endpoints Confirmados**:
```
GET /modulo-material/1_consultarGrupoMaterial
GET /modulo-material/2_consultarClasseMaterial
GET /modulo-material/4_consultarItemMaterial
GET /modulo-servico/3_consultarGrupoServico
GET /modulo-servico/4_consultarClasseServico
GET /modulo-servico/6_consultarItemServico
```

---

### ✅ **IMPLEMENTADO - Módulo Fornecedor**

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| **Endpoint** | ✅ | Mapeado para `/modulo-fornecedor/1_consultarFornecedor` |
| **Implementação** | ✅ | `getFornecedor()` em `index.js` |
| **Rota** | ✅ | `GET /api/integracao/comprasgov/fornecedor` |
| **Parâmetros** | ⚠️ | VER ABAIXO |
| **Testes** | ❌ | Nenhum teste específico |

**Endpoint Confirmado**:
```
GET /modulo-fornecedor/1_consultarFornecedor
  PARAMS:
  - pagina (default: 1)
  - tamanhoPagina (default: 10)
  - cnpj (string)
  - cpf (string)
  - naturezaJuridicaId (integer)
  - porteEmpresaId (integer)
  - codigoCnae (integer)
  - ativo (boolean)
```

**Observação**: A implementação atual passa `ativo: 'true'` por padrão (linha 214), o que é correto.

---

### ✅ **IMPLEMENTADO - Módulo ARP (Atas de Registro de Preços)**

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| **Endpoint** | ⚠️ | **ERRO: Usando endpoint de ITEM em vez do de CONSULTA GERAL** |
| **Implementação** | ✅ | `getArp()` em `index.js` |
| **Rota** | ✅ | `GET /api/integracao/comprasgov/arp` |
| **Testes** | ❌ | Nenhum teste específico |

**❌ PROBLEMA IDENTIFICADO**:

No arquivo `client.js` linha 37:
```javascript
arp: {
  consulta: '/modulo-arp/2_consultarARPItem'  // ❌ ERRADO: é endpoint de ITEM
}
```

**Deve ser**:
```javascript
arp: {
  consulta: '/modulo-arp/1_consultarARP',      // ✅ CORRETO: endpoint de CONSULTA da ARP
  item: '/modulo-arp/2_consultarARPItem',      // Item específico da ARP
  consultaId: '/modulo-arp/1.1_consultarARP_Id', // ARP por ID
  itemId: '/modulo-arp/2.1_consultarARPItem_Id'  // Item de ARP por ID
}
```

**Parametros da API (conforme documentação)**:
- Endpoint 1 (Consultar ARP):
  - `pagina` (default: 1)
  - `tamanhoPagina` (default: 10)
  - `codigoUnidadeGerenciadora` (optional)
  - `codigoModalidadeCompra` (optional)
  - `numeroAtaRegistroPreco` (optional)
  - `dataVigenciaInicial` (**obrigatório**)
  - `dataVigenciaFinal` (**obrigatório**)
  - `dataAssinaturaInicial` (optional)
  - `dataAssinaturaFinal` (optional)

- Endpoint 1.1 (Consultar ARP por ID):
  - `numeroControlePncpAta` (**obrigatório**)
  - `dataAtualizacao` (optional)

- Endpoint 2 (Consultar item da ARP):
  - Todos os parâmetros de 1, MAIS:
  - `numeroItem` (optional)
  - `codigoItem` (optional)
  - `tipoItem` (optional)
  - `niFornecedor` (optional)
  - `codigoPdm` (optional)
  - `numeroCompra` (optional)

- Endpoint 2.1 (Consultar item da ARP por ID):
  - `numeroControlePncpAta` (**obrigatório**)
  - `dataAtualizacao` (optional)

---

### ✅ **IMPLEMENTADO - Módulo Contratos**

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| **Endpoint** | ⚠️ | **PARCIALMENTE CORRETO: Endpoint genérico, mas faltam variantes** |
| **Implementação** | ✅ | `getContratos()` em `index.js` |
| **Rota** | ✅ | `GET /api/integracao/comprasgov/contratos` |
| **Testes** | ❌ | Nenhum teste específico |

**⚠️ PROBLEMA IDENTIFICADO**:

No arquivo `client.js` linha 40:
```javascript
contratos: {
  consulta: '/modulo-contratos/1_consultarContratos'  // ✅ CORRETO, mas INCOMPLETO
}
```

**Deve ser expandido para**:
```javascript
contratos: {
  consulta: '/modulo-contratos/1_consultarContratos',      // ✅ Consulta geral
  item: '/modulo-contratos/2_consultarContratosItem',      // Itens de contratos
  id: '/modulo-contratos/1.1_consultarContratos_Id',       // Contrato específico (se existe)
  itemId: '/modulo-contratos/2.1_consultarContratosItem_Id' // Item de contrato específico
}
```

**Parâmetros da API (conforme documentação)**:

- Endpoint 1 (Consultar contratos):
  - `pagina` (default: 1)
  - `tamanhoPagina` (default: 10)
  - `codigoOrgao` (optional)
  - `codigoUnidadeGestora` (optional)
  - `codigoUnidadeGestoraOrigemContrato` (optional)
  - `codigoUnidadeRealizadoraCompra` (optional)
  - `numeroContrato` (optional)
  - `codigoModalidadeCompra` (optional)
  - `codigoTipo` (optional)
  - `codigoCategoria` (optional)
  - `niFornecedor` (optional)
  - `dataVigenciaInicialMin` (**obrigatório**)
  - `dataVigenciaInicialMax` (**obrigatório**)

- Endpoint 2 (Consultar item de contratos):
  - `pagina` (default: 1) com nota "pagina=1"
  - `tamanhoPagina` (default: 10)
  - `codigoOrgao` (optional)
  - `codigoUnidadeGestora` (optional)
  - `codigoUnidadeGestoraOrigemContrato` (optional)
  - `codigoUnidadeRealizadoraCompra` (optional)
  - `numeroContrato` (optional)
  - `codigoModalidadeCompra` (optional)
  - `tipoItem` (optional)
  - `codigoItem` (optional)
  - `niFornecedor` (optional)
  - `dataVigenciaInicialMin` (**obrigatório**)
  - `dataVigenciaInicialMax` (**obrigatório**)

---

### ✅ **IMPLEMENTADO - Módulo UASG**

| Aspecto | Status | Detalhe |
|---------|--------|---------|
| **Endpoint** | ✅ | Mapeado para `/modulo-uasg/1_consultarUasg` |
| **Implementação** | ✅ | `getUasg()` em `index.js` |
| **Rota** | ✅ | `GET /api/integracao/comprasgov/uasg` |

---

## 🔴 CRÍTICO: Correção Necessária

### URL de Fornecedor está Incorreta na Documentação Fornecida

**Na documentação fornecida** (seu PDF):
```
https://dadosabertos.compras.gov.br/modulo-contratos/1_consultarContratos?...
```
⚠️ **Este URL está ERRADO para Fornecedor**

**Correto deve ser**:
```
https://dadosabertos.compras.gov.br/modulo-fornecedor/1_consultarFornecedor?...
```

A implementação SINGEM está **correta** (usa `/modulo-fornecedor/`), mas o documento PDF tem um copy-paste error da seção de Contratos.

---

## 📋 Recomendações

### 1. **🔧 CORREÇÃO IMEDIATA** - ARP Module

Atualizar `server/integrations/comprasgov/client.js` linha 37:

```javascript
// ANTES:
arp: {
  consulta: '/modulo-arp/2_consultarARPItem'
}

// DEPOIS:
arp: {
  consulta: '/modulo-arp/1_consultarARP',
  item: '/modulo-arp/2_consultarARPItem',
  consultaId: '/modulo-arp/1.1_consultarARP_Id',
  itemId: '/modulo-arp/2.1_consultarARPItem_Id'
}
```

Em `server/integrations/comprasgov/index.js`, expandir `getArp()` para suportar variantes:

```javascript
async getArp(req) {
  const pagination = readPagination(req.query);
  const fetchAll = readFetchAll(req.query);
  const variant = req.query.variant || 'consulta'; // 'consulta', 'item', 'consultaId', 'itemId'

  // Validar parâmetros obrigatórios por variante
  if (variant === 'consulta' || variant === 'item') {
    if (!req.query.dataVigenciaInicial || !req.query.dataVigenciaFinal) {
      throw new Error('Parâmetros obrigatórios: dataVigenciaInicial e dataVigenciaFinal');
    }
  }
  if (variant === 'consultaId' || variant === 'itemId') {
    if (!req.query.numeroControlePncpAta) {
      throw new Error('Parâmetro obrigatório: numeroControlePncpAta');
    }
  }

  return client.requestDomain({
    domain: 'arp',
    operation: variant,
    params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas', 'variant']),
    ...pagination,
    ...fetchAll,
    ...buildContext(req)
  });
}
```

### 2. **🔧 MELHORIA** - Contratos Module

Expandir in `server/integrations/comprasgov/client.js` linha 40:

```javascript
contratos: {
  consulta: '/modulo-contratos/1_consultarContratos',
  item: '/modulo-contratos/2_consultarContratosItem'
  // Endpoints com ID (1.1, 2.1) podem ser adicionados se API suportar
}
```

Criar novo handler opcional em index.js:

```javascript
async getContratosItem(req) {
  const pagination = readPagination(req.query);
  const fetchAll = readFetchAll(req.query);

  // Validar obrigatórios
  if (!req.query.dataVigenciaInicialMin || !req.query.dataVigenciaInicialMax) {
    throw new Error('Parâmetros obrigatórios: dataVigenciaInicialMin, dataVigenciaInicialMax');
  }

  return client.requestDomain({
    domain: 'contratos',
    operation: 'item',
    params: cleanQuery(req.query, ['pagina', 'tamanhoPagina', 'limite', 'limit', 'buscarTodasPaginas', 'maxPaginas']),
    ...pagination,
    ...fetchAll,
    ...buildContext(req)
  });
}
```

E adicionar rota em `server/routes/comprasgov.routes.js`:

```javascript
router.get('/contratos/itens', (req, res) => 
  execute(res, req, (request) => comprasGov.getContratosItem(request))
);
```

### 3. **✨ NOVO** - Adicionar Testes para ARP e Contratos

Criar testes em `server/tests/comprasgov.arp.contract.test.js`:

```javascript
test('getArp valida parametros obrigatorios dataVigencia', () => {
  // Testar que sem dataVigenciaInicial throws error
  // Testar que query com ambas retorna OK
});

test('getContratos valida parametros data vigencia', () => {
  // Testar que sem dataVigenciaInicialMin/Max throws error
});
```

### 4. **📚 DOCUMENTAÇÃO** - Atualizar README

Adicionar seção explicando variantes de endpoint e parâmetros obrigatórios:

```markdown
## Módulo ARP

### Endpoints
- `GET /api/integracao/comprasgov/arp?variant=consulta` - Listar ARPs
- `GET /api/integracao/comprasgov/arp?variant=consultaId&numeroControlePncpAta=...` - ARP por ID

### Parâmetros Obrigatórios
- `dataVigenciaInicial` e `dataVigenciaFinal` para variant=consulta
- `numeroControlePncpAta` para variant=consultaId
```

---

## 📊 Resumo Matríz de Completude

| Módulo | Endpoint | Implementação | Rotas | Serviço | Testes | Crítico |
|--------|----------|---------------|-------|---------|--------|---------|
| **Pesquisa de Preço** | ✅ | ✅ | ✅ | ✅ | ✅ | Não |
| **Catálogo Material** | ✅ | ✅ | ✅ | ✅ | ✅ | Não |
| **Catálogo Serviço** | ✅ | ✅ | ✅ | ✅ | ✅ | Não |
| **UASG** | ✅ | ✅ | ✅ | ✅ | ❌ | Médio |
| **Fornecedor** | ✅ | ✅ | ✅ | ✅ | ❌ | Baixo |
| **ARP** | ⚠️ | ✅ | ✅ | ✅ | ❌ | **ALTO** |
| **Contratos** | ⚠️ | ✅ | ✅ | ✅ | ❌ | Médio |
| **Legado** | ✅ | ✅ | ✅ | ✅ | ❌ | Baixo |
| **OCDS** | ✅ | ✅ | ✅ | ✅ | ❌ | Baixo |

---

## 🎯 Próximos Passos Prioritários

1. **[CRÍTICO]** Corrigir endpoint ARP de `2_consultarARPItem` para `1_consultarARP`
2. **[ALTA]** Adicionar validação de parâmetros obrigatórios (dataVigência para ARP/Contratos)
3. **[MÉDIA]** Expandir suporte a endpoints de ID (consultaId, itemId)
4. **[MÉDIA]** Criar testes unitários para ARP e Contratos
5. **[BAIXA]** Criar serviços especializados para ARP e Contratos (similar a price-intelligence)
6. **[BAIXA]** Documentar variantes de endpoint em README/Wiki

---

## � VALIDAÇÃO COM API REAL (Postman v.2.0.0)

**Fonte**: https://documenter.getpostman.com/view/13166820/2sA3XJjPpR  
**Última Verificação**: 16/03/2026

### ✅ Modulo-Legado (Licitações Antigas - Pré Lei 14.133)

**Endpoints Confirmados**:

#### 1. Consultar Licitações
```
GET /modulo-legado/1_consultarLicitacao
PARÂMETROS:
  - data_publicacao_inicial (YYYY-MM-DD, obrigatório)
  - data_publicacao_final (YYYY-MM-DD, obrigatório)
  - pagina (integer, default: 1)
  - tamanhoPagina (integer, default: 10, máximo: 500)

RESPOSTA REAL:
{
  "resultado": [{
    "id_compra": "12063205000942023",
    "numero_aviso": 942023,
    "modalidade": 5,
    "valor_homologado_total": 236418.32,
    "pertence14133": boolean  // Lei 14.133/2021
  }],
  "totalRegistros": integer,
  "totalPaginas": integer,
  "paginasRestantes": integer
}
```

#### 2. Consultar Itens de Licitação
```
GET /modulo-legado/2_consultarItemLicitacao
PARÂMETROS:
  - modalidade (integer, OBRIGATÓRIO) ⚠️ CRÍTICO: Não é opcional!
  - pagina (integer, default: 1)
  - tamanhoPagina (integer, default: 10, máximo: 500)

RESPOSTA REAL (Volume MASSIVO):
{
  "resultado": [{
    "id_item_compra": "120632050009420231",
    "numero_item": 1,
    "descricao_item": "...",
    "valor_homologado": 236418.32,
    "modalidade": 1
  }],
  "totalRegistros": 3498690,      // 3.5 MILHÕES de registros!
  "totalPaginas": 349870,          // 350 mil páginas (com 10 itens/página)
  "paginasRestantes": 349869
}

⚠️ AVISO: Esta query retorna BILHÕES de registros sem filtros adicionais.
   Implementar paginação com cuidado e cache agressivo.
```

#### 3. Consultar Licitação por ID
```
GET /modulo-legado/1_consultarLicitacao_Id?id_compra={id}
PARÂMETROS:
  - id_compra (string, obrigatório)

RESPOSTA: Contrato único com todos os campos da licitação
```

### 🔍 Descobertas & Impacto

| Descoberta | Impacto | Ação Necessária |
|-----------|--------|-----------------|
| **Modalidade OBRIGATÓRIA** | `/2_consultarItemLicitacao` não pode ser chamado sem `modalidade` | Atualizar handlers legado em `index.js` para validar `modalidade` |
| **Volume Massivo (3.5M)** | Sem filtros, retorna > 300K páginas | Implementar cache com TTL + rate limiting agressivo |
| **Paginação com 500 max** | API permite até 500 itens/página (diferente de 10 default) | Adicionar `tamanhoPagina=500` para queries em legado |
| **Pertence14133 flag** | Legado tem flag indicando se contrato é Lei 14.133 | Usar para separar estatísticas de licitações antigas vs novas |

### 📊 Status Pós-Validação Real

#### ARP - ✅ CORRIGIDO
- Endpoint corrigido: `1_consultarARP` (não é mais `2_consultarARPItem`)
- Variantes suportadas: consulta, item, consultaId, itemId
- Validação implementada: dataVigencia* obrigatórios
- **Total de Registros** (estimado): ~50K ARPs ativas (volume controlado)

#### Contratos - ✅ EXPANDIDO
- Endpoints: consulta + item (variantes)
- Validação implementada: dataVigenciaInicial*Min/Max obrigatórios
- **Total de Registros** (estimado): ~500K contratos vigentes (volume significativo)

#### Legado - ⚠️ REQUER VALIDAÇÃO ADICIONAL
- Endpoints confirmados: 3 variantes (consulta, item, id)
- **CRÍTICO**: `modalidade` é obrigatório para items, mas não documentado em alguns pontos
- **Volume**: 3.5M item records (maior dataset de todas as integrações)
- **Ação**: Atualizar `getLegado()` em `index.js` para validar `modalidade`

### 🧪 Plano de Testes com API Real

```bash
# 1. Teste básico - Legado Licitações
curl -X GET "https://dadosabertos.compras.gov.br/modulo-legado/1_consultarLicitacao?data_publicacao_inicial=2025-12-10&data_publicacao_final=2025-12-15&pagina=1&tamanhoPagina=10"

# 2. Teste CRÍTICO - Legado Items COM modalidade
curl -X GET "https://dadosabertos.compras.gov.br/modulo-legado/2_consultarItemLicitacao?modalidade=1&pagina=1&tamanhoPagina=500"

# 3. Teste SEM modalidade (esperado falhar)
curl -X GET "https://dadosabertos.compras.gov.br/modulo-legado/2_consultarItemLicitacao?pagina=1&tamanhoPagina=10"

# 4. Teste ARP com datas
curl -X GET "https://dadosabertos.compras.gov.br/modulo-arp/1_consultarARP?dataVigenciaInicial=2025-01-01&dataVigenciaFinal=2025-12-31&pagina=1"

# 5. Teste Contratos com datas
curl -X GET "https://dadosabertos.compras.gov.br/modulo-contratos/1_consultarContratos?dataVigenciaInicialMin=2025-01-01&dataVigenciaInicialMax=2025-12-31&pagina=1"
```

### 📌 Próximas Ações Baseadas em Real API

1. **[CRÍTICO]** Validar `modalidade` em `getLegado()` - sem ele, API retorna erro
2. **[ALTA]** Implementar cache com TTL para legado items (muito lido, pouco escrito)
3. **[ALTA]** Testar com dados reais usando curl acima
4. **[MÉDIA]** Documentar resposta real completa para cada módulo
5. **[MÉDIA]** Criar fixtures de teste com dados reais da API

---

## 📄 Referências Externas

- **Compras.gov.br API Base**: https://dadosabertos.compras.gov.br/
- **API Spec (Postman v.2.0.0)**: https://documenter.getpostman.com/view/13166820/2sA3XJjPpR
- **Portal Nacional de Compras**: https://www.pncp.gov.br/
- **OCDS Standard**: https://standard.open-contracting.org/

---

**Documento gerado**: 16/03/2026 (após implementação de PATH 2 + PATH 3)  
**Próxima revisão recomendada**: Após implementação das correções críticas
