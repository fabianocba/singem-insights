# ðŸ§ª Guia de Testes - Consultas Diversas

## âœ… Checklist de Testes Manuais

### 1. Teste de Abertura

- [ ] Abrir SINGEM (index.html)
- [ ] Localizar card "ðŸ” Consultas Diversas"
- [ ] Clicar no card
- [ ] Nova aba deve abrir com a interface de consultas

### 2. Teste de SeleÃ§Ã£o de Dataset

- [ ] Verificar se seletor mostra "Selecione um conjunto de dados..."
- [ ] Clicar no seletor
- [ ] Verificar se aparecem os 7 datasets:
  - CatÃ¡logo â€“ Material
  - CatÃ¡logo â€“ ServiÃ§o
  - UASG (Unidades)
  - ARP â€“ Itens
  - ContrataÃ§Ãµes â€“ PNCP/Lei 14.133
  - Legado â€“ LicitaÃ§Ãµes
  - Legado â€“ Itens de LicitaÃ§Ã£o

### 3. Teste: CatÃ¡logo Material

```
Dataset: CatÃ¡logo â€“ Material
Filtros:
  - CÃ³digo do Grupo: 1
  - Status: Ativo
AÃ§Ã£o: Clicar "Buscar"
Resultado Esperado:
  âœ… Loading spinner aparece
  âœ… Tabela carrega com materiais do grupo 1
  âœ… PaginaÃ§Ã£o mostra "PÃ¡gina X de Y"
  âœ… Total de registros exibido
```

### 4. Teste: UASG por UF

```
Dataset: UASG (Unidades)
Filtros:
  - UF: BA
  - Status: Ativo
AÃ§Ã£o: Clicar "Buscar"
Resultado Esperado:
  âœ… Carrega UASG da Bahia
  âœ… Coluna Unidade/UF mostra "BA"
  âœ… Status mostra "Ativo"
```

### 5. Teste: ARP por Ano

```
Dataset: ARP â€“ Itens
Filtros:
  - Ano da Ata: 2025
AÃ§Ã£o: Clicar "Buscar"
Resultado Esperado:
  âœ… Carrega itens de atas de 2025
  âœ… Coluna Valor preenchida
  âœ… Ã“rgÃ£o/UASG com formato "Ata: XXX/2025"
```

### 6. Teste: PNCP

```
Dataset: ContrataÃ§Ãµes â€“ PNCP/Lei 14.133
Filtros:
  - Ano: 2025
AÃ§Ã£o: Clicar "Buscar"
Resultado Esperado:
  âœ… Carrega contrataÃ§Ãµes de 2025
  âœ… DescriÃ§Ã£o com objeto da contrataÃ§Ã£o
  âœ… Valor Total Estimado preenchido
```

### 7. Teste de PaginaÃ§Ã£o

- [ ] Fazer uma busca que retorne mÃºltiplas pÃ¡ginas
- [ ] Verificar botÃ£o "PrÃ³xima" habilitado
- [ ] Clicar em "PrÃ³xima"
- [ ] Verificar se pÃ¡gina muda (PÃ¡gina 2 de X)
- [ ] Verificar botÃ£o "Anterior" habilitado
- [ ] Clicar em "Anterior"
- [ ] Voltar para pÃ¡gina 1

### 8. Teste de ExportaÃ§Ã£o CSV

- [ ] Fazer uma busca com resultados
- [ ] Clicar em "ðŸ“¥ Exportar CSV"
- [ ] Verificar se arquivo CSV foi baixado
- [ ] Abrir CSV e verificar:
  - CabeÃ§alhos corretos
  - Dados formatados
  - Encoding UTF-8 (acentos corretos)

### 9. Teste de VisualizaÃ§Ã£o JSON

- [ ] Fazer uma busca com resultados
- [ ] Clicar em botÃ£o "ðŸ“„ JSON" de qualquer item
- [ ] Modal deve abrir com JSON formatado
- [ ] Verificar estrutura do objeto "extras"
- [ ] Fechar modal

### 10. Teste de Cache

```
1. Fazer busca: Material, Grupo 1
2. Aguardar carregamento (anota tempo)
3. Limpar filtros
4. Refazer MESMA busca: Material, Grupo 1
5. Verificar:
   âœ… Carregamento instantÃ¢neo (cache)
   âœ… Console mostra "Usando resultado do cache"
6. Clicar "âš¡ Limpar Cache"
7. Refazer busca novamente
8. Verificar:
   âœ… Carregamento normal (busca API)
```

### 11. Teste de Limpar Filtros

- [ ] Selecionar dataset
- [ ] Preencher vÃ¡rios filtros
- [ ] Fazer busca
- [ ] Clicar "ðŸ—‘ï¸ Limpar Filtros"
- [ ] Verificar se todos os campos foram limpos
- [ ] Resultados devem sumir

### 12. Teste de LocalStorage

```
1. Selecionar dataset: UASG
2. Preencher filtro: UF = BA
3. Fazer busca
4. Fechar aba do navegador
5. Reabrir consultas (index.html)
6. Verificar:
   âœ… Dataset UASG selecionado
   âœ… Filtro UF = BA preenchido
   âœ… (Busca nÃ£o executada automaticamente)
```

### 13. Teste de Erros

```
CenÃ¡rio 1: Timeout
- Desconectar internet
- Fazer busca
- Verificar mensagem de erro clara

CenÃ¡rio 2: Sem Resultados
- Dataset: Material
- Filtro: CÃ³digo PDM: 999999999999
- Buscar
- Verificar mensagem "Nenhum resultado encontrado"

CenÃ¡rio 3: Dataset Sem Filtros
- Selecionar dataset
- NÃ£o preencher nenhum filtro
- Buscar
- Verificar se faz busca genÃ©rica (pÃ¡g. 1)
```

### 14. Teste Responsivo

- [ ] Abrir em tela desktop (>1200px)
  - Filtros em grid multi-coluna
  - Tabela completa visÃ­vel
- [ ] Reduzir para tablet (768px)
  - Filtros ajustam automaticamente
  - Tabela com scroll horizontal
- [ ] Reduzir para mobile (400px)
  - Filtros single-column
  - Controles empilhados verticalmente
  - Tabela compacta

### 15. Teste de Acessibilidade

- [ ] Navegar com TAB pelo formulÃ¡rio
- [ ] Verificar ordem lÃ³gica de foco
- [ ] Verificar se botÃµes tÃªm aria-label
- [ ] Verificar se inputs tÃªm labels associados
- [ ] Testar com leitor de tela (NVDA/JAWS)

## ðŸ› Problemas Conhecidos

### CORS (esperado)

- **SituaÃ§Ã£o:** Navegador pode bloquear requisiÃ§Ãµes diretas Ã  API
- **SoluÃ§Ã£o:**
  - Usar servidor local (python -m http.server)
  - ExtensÃ£o CORS Unblock no Chrome
  - Servidor proxy (opcional)

### Rate Limit

- **SituaÃ§Ã£o:** Muitas requisiÃ§Ãµes em sequÃªncia
- **Comportamento:** Sistema faz retry automÃ¡tico
- **SoluÃ§Ã£o:** Aguardar alguns segundos

## âœ… CritÃ©rios de AceitaÃ§Ã£o

O mÃ³dulo estÃ¡ funcionando corretamente se:

- âœ… Todos os 7 datasets carregam dados
- âœ… Filtros funcionam corretamente
- âœ… PaginaÃ§Ã£o navega entre pÃ¡ginas
- âœ… Cache reduz tempo de carregamento
- âœ… CSV exporta com dados corretos
- âœ… JSON modal exibe dados completos
- âœ… Erros sÃ£o tratados com mensagens claras
- âœ… Interface responsiva em todos os tamanhos
- âœ… LocalStorage persiste estado
- âœ… Nenhum erro no console (exceto CORS esperado)

## ðŸ“Š RelatÃ³rio de Teste

Preencha apÃ³s realizar os testes:

```
Data do Teste: ___/___/2025
Testador: _________________
Navegador: ________________
VersÃ£o SINGEM: 1.2.4

Testes Aprovados: ___/15
Testes Falhados: ___/15
Problemas Encontrados:
-
-
-

ObservaÃ§Ãµes:



ConclusÃ£o: [ ] APROVADO  [ ] REPROVADO
```

## ðŸš€ Testes Automatizados (Futuro)

SugestÃµes para implementaÃ§Ã£o futura:

- Jest para testes unitÃ¡rios
- Cypress para testes E2E
- Lighthouse para performance
- axe-core para acessibilidade

---

**Documento criado em:** 03/11/2025  
**MÃ³dulo:** Consultas Diversas v1.0.0  
**Sistema:** SINGEM v1.2.4

