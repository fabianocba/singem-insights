# ðŸ” Consultas Diversas

MÃ³dulo de consulta aos Dados Abertos do Compras.gov.br

## ðŸš€ Acesso RÃ¡pido

Abra `index.html` em um navegador ou clique no card "Consultas Diversas" na tela inicial do SINGEM.

## ðŸ“š Datasets DisponÃ­veis

1. **CatÃ¡logo â€“ Material** - Itens CATMAT
2. **CatÃ¡logo â€“ ServiÃ§o** - Itens CATSER
3. **UASG** - Unidades administrativas
4. **ARP â€“ Itens** - Atas de Registro de PreÃ§os
5. **ContrataÃ§Ãµes PNCP** - Lei 14.133/2021
6. **Legado â€“ LicitaÃ§Ãµes** - Sistema antigo
7. **Legado â€“ Itens** - Itens de licitaÃ§Ãµes legado

## ðŸŽ¯ Recursos

- âœ… Filtros dinÃ¢micos por dataset
- âœ… PaginaÃ§Ã£o automÃ¡tica
- âœ… Cache de 5 minutos
- âœ… ExportaÃ§Ã£o CSV
- âœ… VisualizaÃ§Ã£o JSON completa
- âœ… Retry automÃ¡tico em erros
- âœ… Interface responsiva

## ðŸ“– DocumentaÃ§Ã£o Completa

Veja `/docs/CONSULTAS_DIVERSAS.md` para documentaÃ§Ã£o detalhada com exemplos e troubleshooting.

## ðŸŒ API

Base URL: `https://dadosabertos.compras.gov.br`

DocumentaÃ§Ã£o oficial: https://dadosabertos.compras.gov.br/swagger-ui/index.html

## ðŸ’¡ Exemplos

### Buscar materiais por grupo

1. Selecione "CatÃ¡logo â€“ Material"
2. CÃ³digo do Grupo: `1`
3. Clique em "Buscar"

### Buscar UASG na Bahia

1. Selecione "UASG (Unidades)"
2. UF: `BA`
3. Status: `Ativo`
4. Clique em "Buscar"

---

**SINGEM v1.2.4** | IF Baiano
