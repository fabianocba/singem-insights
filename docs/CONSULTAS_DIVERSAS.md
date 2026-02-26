# 🔍 Consultas Diversas - Dados Abertos Compras.gov.br

## 📋 Visão Geral

Módulo de consulta a dados públicos do Compras.gov.br, permitindo acesso a informações sobre materiais, serviços, UASG, atas de registro de preços, contratações PNCP e licitações do sistema legado.

## 🎯 Funcionalidades

### Datasets Suportados

1. **Catálogo – Material**
   - Itens de material do catálogo CATMAT
   - Filtros: Grupo, Classe, PDM, Status

2. **Catálogo – Serviço**
   - Itens de serviço do catálogo CATSER
   - Filtros: Grupo, Classe, Status

3. **UASG (Unidades)**
   - Unidades Administrativas de Serviços Gerais
   - Filtros: Código UASG, UF, Status

4. **ARP – Itens**
   - Itens de Atas de Registro de Preços
   - Filtros: Número da Ata, Ano, Órgão, Código do Item

5. **Contratações – PNCP/Lei 14.133**
   - Contratações no novo portal PNCP
   - Filtros: CNPJ do Órgão, Ano, Modalidade, Situação

6. **Legado – Licitações**
   - Licitações do sistema antigo (ComprasNet)
   - Filtros: UASG, Modalidade, Ano

7. **Legado – Itens de Licitação**
   - Itens de licitações legado
   - Filtros: UASG, Modalidade, Número da Licitação

## 🚀 Como Usar

### Acesso Rápido

1. Na tela inicial do SINGEM, clique em **"Consultas Diversas"**
2. Uma nova aba será aberta com a interface de consultas

### Passo a Passo

1. **Selecione o Dataset**
   - Escolha o conjunto de dados desejado no seletor superior

2. **Configure os Filtros**
   - Preencha os filtros disponíveis para refinar a busca
   - Nem todos os filtros são obrigatórios

3. **Execute a Busca**
   - Clique em **"🔍 Buscar"**
   - Aguarde o carregamento dos resultados

4. **Navegue pelos Resultados**
   - Use os controles de paginação (Anterior/Próxima)
   - Veja o total de registros e páginas

5. **Visualize Detalhes**
   - Clique em **"📄 JSON"** para ver dados completos de um item

6. **Exporte os Dados**
   - Clique em **"📥 Exportar CSV"** para baixar os resultados

## 📊 Exemplos de Consulta

### Exemplo 1: Buscar Material por Grupo

```
Dataset: Catálogo – Material
Filtros:
  - Código do Grupo: 1
  - Status: Ativo
Resultado: Materiais ativos do grupo 1
```

### Exemplo 2: Buscar UASG na Bahia

```
Dataset: UASG (Unidades)
Filtros:
  - UF: BA
  - Status: Ativo
Resultado: Todas UASG ativas do estado da Bahia
```

### Exemplo 3: Buscar ARP por Ano

```
Dataset: ARP – Itens
Filtros:
  - Ano da Ata: 2025
Resultado: Itens de atas de 2025
```

### Exemplo 4: Buscar Contratações PNCP

```
Dataset: Contratações – PNCP/Lei 14.133
Filtros:
  - Ano: 2025
  - Situação: em_andamento
Resultado: Contratações em andamento de 2025
```

## 🔧 Recursos Técnicos

### Cache Inteligente

- **Duração:** 5 minutos
- **Armazenamento:** Memória RAM (Map)
- **Limpeza:** Automática a cada 2 minutos
- **Vantagens:** Reduz requisições repetidas, melhora performance

### Tratamento de Erros

- **Timeout:** 30 segundos por requisição
- **Retry:** Até 3 tentativas com backoff exponencial
- **Rate Limit (429):** Retry automático com delay
- **Erros 5xx:** Retry automático
- **CORS:** Detecta e informa quando ocorrer

### Paginação

- **Formato:** Conforme padrão da API Compras.gov.br
- **Navegação:** Anterior/Próxima
- **Informações:** Página atual, total de páginas, total de registros

### Exportação CSV

- **Formato:** CSV com separador `;` (ponto e vírgula)
- **Encoding:** UTF-8 com BOM
- **Colunas:** Código, Descrição, Unidade/UF, Órgão/UASG, Status, Atualização, Valor
- **Nome do arquivo:** `consulta_{dataset}_{data}.csv`

## 📁 Arquitetura do Módulo

```
consultas/
  └── index.html           # Interface principal

js/consultas/
  ├── apiCompras.js        # Cliente HTTP para APIs do Compras.gov.br
  ├── mapeadores.js        # Normalização de dados de diferentes endpoints
  ├── uiConsultas.js       # Lógica de interface (filtros, paginação, tabela)
  └── cache.js             # Sistema de cache em memória

css/
  └── consultas.css        # Estilos específicos do módulo
```

## 🌐 Endpoints da API

### Base URL

```
https://dadosabertos.compras.gov.br
```

### Documentação Oficial

- **Swagger UI:** https://dadosabertos.compras.gov.br/swagger-ui/index.html
- **Manual da API:** Disponível no portal de Dados Abertos

### Principais Endpoints

#### Materiais

```
GET /modulo-material/material/{pagina}?codigoGrupo={grupo}&codigoClasse={classe}
```

#### Serviços

```
GET /modulo-servico/servico/{pagina}?codigoGrupo={grupo}&codigoClasse={classe}
```

#### UASG

```
GET /modulo-uasg/uasg/{pagina}?uf={uf}&status={status}
```

#### ARP

```
GET /modulo-arp/arp-item/{pagina}?numeroAta={numero}&anoAta={ano}
```

#### PNCP

```
GET /pncp/v1/contratacoes/{pagina}?cnpjOrgao={cnpj}&ano={ano}
```

#### Legado - Licitações

```
GET /licitacoes/v1/licitacoes/{pagina}?uasg={uasg}&modalidade={mod}&ano={ano}
```

## ⚙️ Configurações Avançadas

### Cache Manual

```javascript
// Limpar todo o cache
Cache.clear();

// Obter estatísticas
const stats = Cache.getStats();
console.log(`Cache size: ${stats.size} entries`);
```

### LocalStorage

O módulo salva automaticamente:

- Dataset selecionado
- Filtros aplicados
- Página atual

Ao reabrir, restaura o último estado.

### Personalização de Timeout

```javascript
// No arquivo apiCompras.js
const REQUEST_TIMEOUT = 30000; // 30 segundos (padrão)
```

### Personalização de TTL do Cache

```javascript
// No arquivo cache.js
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos (padrão)
```

## 🔒 Segurança

- ✅ Sem armazenamento de dados sensíveis
- ✅ Requisições diretas à API oficial (HTTPS)
- ✅ Validação de entrada de usuário
- ✅ Escape de caracteres em CSV
- ✅ Proteção contra XSS em exibição de JSON

## 📱 Responsividade

O módulo é totalmente responsivo:

- **Desktop:** Grid multi-coluna para filtros
- **Tablet:** Adaptação automática de colunas
- **Mobile:** Layout single-column, controles empilhados

## ♿ Acessibilidade

- ✅ Labels ARIA em todos os controles
- ✅ Navegação por teclado
- ✅ Contraste adequado (WCAG 2.1 AA)
- ✅ Suporte a `prefers-reduced-motion`
- ✅ Modo escuro automático (`prefers-color-scheme`)

## 🐛 Troubleshooting

### "Erro de CORS"

**Problema:** API não permite requisições diretas do navegador  
**Solução:** Use um servidor proxy ou extensão de browser para desenvolvimento

### "Requisição excedeu o tempo limite"

**Problema:** API demorou mais de 30s para responder  
**Solução:** Tente novamente ou ajuste filtros para consulta mais específica

### "Sem resultados"

**Problema:** Nenhum dado encontrado com os filtros aplicados  
**Solução:** Ajuste os filtros ou deixe alguns em branco para ampliar a busca

### "HTTP 404"

**Problema:** Endpoint não encontrado  
**Solução:** Verifique se o dataset está correto e se a API está disponível

### "HTTP 429"

**Problema:** Rate limit da API excedido  
**Solução:** O sistema fará retry automático. Aguarde alguns segundos.

## 📈 Limites e Restrições

### Limites da API Compras.gov.br

- **Rate Limit:** Variável por endpoint (geralmente generoso)
- **Timeout:** 30 segundos por requisição
- **Paginação:** Máximo de registros por página definido pela API

### Limites do Módulo

- **Cache:** Limitado pela memória RAM disponível
- **CSV:** Exporta apenas resultados da página atual
- **Navegação:** Uma consulta por vez (não paralelo)

## 🔄 Atualizações Futuras

Melhorias planejadas:

- [ ] Exportação de todas as páginas em CSV
- [ ] Gráficos e visualizações
- [ ] Comparação entre datasets
- [ ] Favoritos e consultas salvas
- [ ] Notificações de novos dados
- [ ] Integração com módulo de Empenhos (validação automática)
- [ ] Cache persistente em IndexedDB

## 📞 Suporte

### Documentação Oficial

- Portal Compras.gov.br: https://www.gov.br/compras
- Dados Abertos: https://dadosabertos.compras.gov.br

### Desenvolvimento

- Sistema: SINGEM v1.2.4
- Instituição: IF Baiano
- Módulo: Consultas Diversas

## 📝 Changelog

### v1.0.0 (2025-11-03)

- ✨ Lançamento inicial do módulo
- ✅ 7 datasets suportados
- ✅ Cache em memória (5 min)
- ✅ Exportação CSV
- ✅ Paginação completa
- ✅ Visualização JSON
- ✅ Interface responsiva
- ✅ Retry automático
- ✅ LocalStorage para persistência de estado

---

**Desenvolvido para o SINGEM - Instituto Federal de Educação, Ciência e Tecnologia Baiano**
