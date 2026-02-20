# ðŸ” Consultas Diversas - Dados Abertos Compras.gov.br

## ðŸ“‹ VisÃ£o Geral

MÃ³dulo de consulta a dados pÃºblicos do Compras.gov.br, permitindo acesso a informaÃ§Ãµes sobre materiais, serviÃ§os, UASG, atas de registro de preÃ§os, contrataÃ§Ãµes PNCP e licitaÃ§Ãµes do sistema legado.

## ðŸŽ¯ Funcionalidades

### Datasets Suportados

1. **CatÃ¡logo â€“ Material**
   - Itens de material do catÃ¡logo CATMAT
   - Filtros: Grupo, Classe, PDM, Status

2. **CatÃ¡logo â€“ ServiÃ§o**
   - Itens de serviÃ§o do catÃ¡logo CATSER
   - Filtros: Grupo, Classe, Status

3. **UASG (Unidades)**
   - Unidades Administrativas de ServiÃ§os Gerais
   - Filtros: CÃ³digo UASG, UF, Status

4. **ARP â€“ Itens**
   - Itens de Atas de Registro de PreÃ§os
   - Filtros: NÃºmero da Ata, Ano, Ã“rgÃ£o, CÃ³digo do Item

5. **ContrataÃ§Ãµes â€“ PNCP/Lei 14.133**
   - ContrataÃ§Ãµes no novo portal PNCP
   - Filtros: CNPJ do Ã“rgÃ£o, Ano, Modalidade, SituaÃ§Ã£o

6. **Legado â€“ LicitaÃ§Ãµes**
   - LicitaÃ§Ãµes do sistema antigo (ComprasNet)
   - Filtros: UASG, Modalidade, Ano

7. **Legado â€“ Itens de LicitaÃ§Ã£o**
   - Itens de licitaÃ§Ãµes legado
   - Filtros: UASG, Modalidade, NÃºmero da LicitaÃ§Ã£o

## ðŸš€ Como Usar

### Acesso RÃ¡pido

1. Na tela inicial do SINGEM, clique em **"Consultas Diversas"**
2. Uma nova aba serÃ¡ aberta com a interface de consultas

### Passo a Passo

1. **Selecione o Dataset**
   - Escolha o conjunto de dados desejado no seletor superior

2. **Configure os Filtros**
   - Preencha os filtros disponÃ­veis para refinar a busca
   - Nem todos os filtros sÃ£o obrigatÃ³rios

3. **Execute a Busca**
   - Clique em **"ðŸ” Buscar"**
   - Aguarde o carregamento dos resultados

4. **Navegue pelos Resultados**
   - Use os controles de paginaÃ§Ã£o (Anterior/PrÃ³xima)
   - Veja o total de registros e pÃ¡ginas

5. **Visualize Detalhes**
   - Clique em **"ðŸ“„ JSON"** para ver dados completos de um item

6. **Exporte os Dados**
   - Clique em **"ðŸ“¥ Exportar CSV"** para baixar os resultados

## ðŸ“Š Exemplos de Consulta

### Exemplo 1: Buscar Material por Grupo

```
Dataset: CatÃ¡logo â€“ Material
Filtros:
  - CÃ³digo do Grupo: 1
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
Dataset: ARP â€“ Itens
Filtros:
  - Ano da Ata: 2025
Resultado: Itens de atas de 2025
```

### Exemplo 4: Buscar ContrataÃ§Ãµes PNCP

```
Dataset: ContrataÃ§Ãµes â€“ PNCP/Lei 14.133
Filtros:
  - Ano: 2025
  - SituaÃ§Ã£o: em_andamento
Resultado: ContrataÃ§Ãµes em andamento de 2025
```

## ðŸ”§ Recursos TÃ©cnicos

### Cache Inteligente

- **DuraÃ§Ã£o:** 5 minutos
- **Armazenamento:** MemÃ³ria RAM (Map)
- **Limpeza:** AutomÃ¡tica a cada 2 minutos
- **Vantagens:** Reduz requisiÃ§Ãµes repetidas, melhora performance

### Tratamento de Erros

- **Timeout:** 30 segundos por requisiÃ§Ã£o
- **Retry:** AtÃ© 3 tentativas com backoff exponencial
- **Rate Limit (429):** Retry automÃ¡tico com delay
- **Erros 5xx:** Retry automÃ¡tico
- **CORS:** Detecta e informa quando ocorrer

### PaginaÃ§Ã£o

- **Formato:** Conforme padrÃ£o da API Compras.gov.br
- **NavegaÃ§Ã£o:** Anterior/PrÃ³xima
- **InformaÃ§Ãµes:** PÃ¡gina atual, total de pÃ¡ginas, total de registros

### ExportaÃ§Ã£o CSV

- **Formato:** CSV com separador `;` (ponto e vÃ­rgula)
- **Encoding:** UTF-8 com BOM
- **Colunas:** CÃ³digo, DescriÃ§Ã£o, Unidade/UF, Ã“rgÃ£o/UASG, Status, AtualizaÃ§Ã£o, Valor
- **Nome do arquivo:** `consulta_{dataset}_{data}.csv`

## ðŸ“ Arquitetura do MÃ³dulo

```
consultas/
  â””â”€â”€ index.html           # Interface principal

js/consultas/
  â”œâ”€â”€ apiCompras.js        # Cliente HTTP para APIs do Compras.gov.br
  â”œâ”€â”€ mapeadores.js        # NormalizaÃ§Ã£o de dados de diferentes endpoints
  â”œâ”€â”€ uiConsultas.js       # LÃ³gica de interface (filtros, paginaÃ§Ã£o, tabela)
  â””â”€â”€ cache.js             # Sistema de cache em memÃ³ria

css/
  â””â”€â”€ consultas.css        # Estilos especÃ­ficos do mÃ³dulo
```

## ðŸŒ Endpoints da API

### Base URL

```
https://dadosabertos.compras.gov.br
```

### DocumentaÃ§Ã£o Oficial

- **Swagger UI:** https://dadosabertos.compras.gov.br/swagger-ui/index.html
- **Manual da API:** DisponÃ­vel no portal de Dados Abertos

### Principais Endpoints

#### Materiais

```
GET /modulo-material/material/{pagina}?codigoGrupo={grupo}&codigoClasse={classe}
```

#### ServiÃ§os

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

#### Legado - LicitaÃ§Ãµes

```
GET /licitacoes/v1/licitacoes/{pagina}?uasg={uasg}&modalidade={mod}&ano={ano}
```

## âš™ï¸ ConfiguraÃ§Ãµes AvanÃ§adas

### Cache Manual

```javascript
// Limpar todo o cache
Cache.clear();

// Obter estatÃ­sticas
const stats = Cache.getStats();
console.log(`Cache size: ${stats.size} entries`);
```

### LocalStorage

O mÃ³dulo salva automaticamente:

- Dataset selecionado
- Filtros aplicados
- PÃ¡gina atual

Ao reabrir, restaura o Ãºltimo estado.

### PersonalizaÃ§Ã£o de Timeout

```javascript
// No arquivo apiCompras.js
const REQUEST_TIMEOUT = 30000; // 30 segundos (padrÃ£o)
```

### PersonalizaÃ§Ã£o de TTL do Cache

```javascript
// No arquivo cache.js
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos (padrÃ£o)
```

## ðŸ”’ SeguranÃ§a

- âœ… Sem armazenamento de dados sensÃ­veis
- âœ… RequisiÃ§Ãµes diretas Ã  API oficial (HTTPS)
- âœ… ValidaÃ§Ã£o de entrada de usuÃ¡rio
- âœ… Escape de caracteres em CSV
- âœ… ProteÃ§Ã£o contra XSS em exibiÃ§Ã£o de JSON

## ðŸ“± Responsividade

O mÃ³dulo Ã© totalmente responsivo:

- **Desktop:** Grid multi-coluna para filtros
- **Tablet:** AdaptaÃ§Ã£o automÃ¡tica de colunas
- **Mobile:** Layout single-column, controles empilhados

## â™¿ Acessibilidade

- âœ… Labels ARIA em todos os controles
- âœ… NavegaÃ§Ã£o por teclado
- âœ… Contraste adequado (WCAG 2.1 AA)
- âœ… Suporte a `prefers-reduced-motion`
- âœ… Modo escuro automÃ¡tico (`prefers-color-scheme`)

## ðŸ› Troubleshooting

### "Erro de CORS"

**Problema:** API nÃ£o permite requisiÃ§Ãµes diretas do navegador  
**SoluÃ§Ã£o:** Use um servidor proxy ou extensÃ£o de browser para desenvolvimento

### "RequisiÃ§Ã£o excedeu o tempo limite"

**Problema:** API demorou mais de 30s para responder  
**SoluÃ§Ã£o:** Tente novamente ou ajuste filtros para consulta mais especÃ­fica

### "Sem resultados"

**Problema:** Nenhum dado encontrado com os filtros aplicados  
**SoluÃ§Ã£o:** Ajuste os filtros ou deixe alguns em branco para ampliar a busca

### "HTTP 404"

**Problema:** Endpoint nÃ£o encontrado  
**SoluÃ§Ã£o:** Verifique se o dataset estÃ¡ correto e se a API estÃ¡ disponÃ­vel

### "HTTP 429"

**Problema:** Rate limit da API excedido  
**SoluÃ§Ã£o:** O sistema farÃ¡ retry automÃ¡tico. Aguarde alguns segundos.

## ðŸ“ˆ Limites e RestriÃ§Ãµes

### Limites da API Compras.gov.br

- **Rate Limit:** VariÃ¡vel por endpoint (geralmente generoso)
- **Timeout:** 30 segundos por requisiÃ§Ã£o
- **PaginaÃ§Ã£o:** MÃ¡ximo de registros por pÃ¡gina definido pela API

### Limites do MÃ³dulo

- **Cache:** Limitado pela memÃ³ria RAM disponÃ­vel
- **CSV:** Exporta apenas resultados da pÃ¡gina atual
- **NavegaÃ§Ã£o:** Uma consulta por vez (nÃ£o paralelo)

## ðŸ”„ AtualizaÃ§Ãµes Futuras

Melhorias planejadas:

- [ ] ExportaÃ§Ã£o de todas as pÃ¡ginas em CSV
- [ ] GrÃ¡ficos e visualizaÃ§Ãµes
- [ ] ComparaÃ§Ã£o entre datasets
- [ ] Favoritos e consultas salvas
- [ ] NotificaÃ§Ãµes de novos dados
- [ ] IntegraÃ§Ã£o com mÃ³dulo de Empenhos (validaÃ§Ã£o automÃ¡tica)
- [ ] Cache persistente em IndexedDB

## ðŸ“ž Suporte

### DocumentaÃ§Ã£o Oficial

- Portal Compras.gov.br: https://www.gov.br/compras
- Dados Abertos: https://dadosabertos.compras.gov.br

### Desenvolvimento

- Sistema: SINGEM v1.2.4
- InstituiÃ§Ã£o: IF Baiano
- MÃ³dulo: Consultas Diversas

## ðŸ“ Changelog

### v1.0.0 (2025-11-03)

- âœ¨ LanÃ§amento inicial do mÃ³dulo
- âœ… 7 datasets suportados
- âœ… Cache em memÃ³ria (5 min)
- âœ… ExportaÃ§Ã£o CSV
- âœ… PaginaÃ§Ã£o completa
- âœ… VisualizaÃ§Ã£o JSON
- âœ… Interface responsiva
- âœ… Retry automÃ¡tico
- âœ… LocalStorage para persistÃªncia de estado

---

**Desenvolvido para o SINGEM - Instituto Federal de EducaÃ§Ã£o, CiÃªncia e Tecnologia Baiano**

