# ðŸ’¡ Exemplos PrÃ¡ticos - Consultas Diversas

## ðŸ“š Casos de Uso Reais

### Caso 1: Pesquisar Material para LicitaÃ§Ã£o

**CenÃ¡rio:** VocÃª precisa verificar se um material especÃ­fico estÃ¡ cadastrado no CATMAT antes de iniciar uma licitaÃ§Ã£o.

**Passo a Passo:**

1. Acesse Consultas Diversas
2. Selecione: `CatÃ¡logo â€“ Material`
3. Deixe filtros em branco (busca geral)
4. PÃ¡gina 1 mostrarÃ¡ primeiros materiais
5. Use paginaÃ§Ã£o para navegar
6. Quando encontrar material similar, clique em `ðŸ“„ JSON` para ver detalhes completos
7. Anote o cÃ³digo PDM para usar na sua licitaÃ§Ã£o

**Dica:** Se souber o grupo/classe, use os filtros para refinar a busca.

---

### Caso 2: Localizar UASG do IF Baiano

**CenÃ¡rio:** VocÃª precisa confirmar o cÃ³digo UASG do IF Baiano para cadastrar em sistema externo.

**Passo a Passo:**

1. Selecione: `UASG (Unidades)`
2. Filtros:
   - UF: `BA`
   - Deixe outros em branco
3. Buscar
4. Procure por "Instituto Federal" na descriÃ§Ã£o
5. Anote o cÃ³digo UASG quando encontrar

**Exemplo de Resultado:**

```
CÃ³digo: 158155
DescriÃ§Ã£o: IF BAIANO CAMPUS GUANAMBI
UF: BA
Ã“rgÃ£o: MINISTERIO DA EDUCACAO
Status: Ativo
```

---

### Caso 3: Verificar PreÃ§os em Atas Vigentes

**CenÃ¡rio:** VocÃª precisa verificar preÃ§os praticados em ARPs para comparar com orÃ§amento.

**Passo a Passo:**

1. Selecione: `ARP â€“ Itens`
2. Filtros:
   - Ano da Ata: `2025`
   - Deixe outros em branco (mostra todas atas de 2025)
3. Buscar
4. Observe a coluna "Valor" - preÃ§os unitÃ¡rios praticados
5. Clique `ðŸ“„ JSON` para ver:
   - Fornecedor
   - CNPJ
   - VigÃªncia da ata
   - Quantidade
   - Valor total
6. Exporte CSV para anÃ¡lise no Excel

**Uso dos Dados:**

- Compare com seu orÃ§amento
- Identifique fornecedores jÃ¡ cadastrados
- Verifique valores de referÃªncia

---

### Caso 4: Acompanhar ContrataÃ§Ãµes PNCP

**CenÃ¡rio:** VocÃª quer ver contrataÃ§Ãµes recentes de um Ã³rgÃ£o especÃ­fico no novo portal PNCP.

**Passo a Passo:**

1. Selecione: `ContrataÃ§Ãµes â€“ PNCP/Lei 14.133`
2. Filtros:
   - Ano: `2025`
   - SituaÃ§Ã£o: `em_andamento` (opcional)
3. Buscar
4. Veja objetos das contrataÃ§Ãµes
5. Clique `ðŸ“„ JSON` para acessar:
   - Link do sistema origem
   - Modalidade
   - NÃºmero do processo
   - Valor estimado
   - Data de abertura

**Dica:** Use exportaÃ§Ã£o CSV para gerar relatÃ³rio de contrataÃ§Ãµes do perÃ­odo.

---

### Caso 5: Pesquisar LicitaÃ§Ãµes Antigas (Sistema Legado)

**CenÃ¡rio:** VocÃª precisa consultar informaÃ§Ãµes de uma licitaÃ§Ã£o de anos anteriores.

**Passo a Passo:**

1. Selecione: `Legado â€“ LicitaÃ§Ãµes`
2. Filtros:
   - UASG: `158155` (exemplo: IF Baiano Guanambi)
   - Ano: `2024`
   - Modalidade: `1` (PregÃ£o)
3. Buscar
4. Lista mostrarÃ¡ todas licitaÃ§Ãµes daquela UASG/ano/modalidade
5. Anote nÃºmero da licitaÃ§Ã£o de interesse
6. Depois, selecione `Legado â€“ Itens de LicitaÃ§Ã£o`
7. Filtros:
   - UASG: `158155`
   - Modalidade: `1`
   - NÃºmero da LicitaÃ§Ã£o: `00012` (exemplo)
8. Buscar
9. Veja todos os itens daquela licitaÃ§Ã£o

---

### Caso 6: Buscar ServiÃ§os para ContrataÃ§Ã£o

**CenÃ¡rio:** VocÃª precisa cadastrar um serviÃ§o e quer ver exemplos no CATSER.

**Passo a Passo:**

1. Selecione: `CatÃ¡logo â€“ ServiÃ§o`
2. Deixe filtros em branco para busca ampla
3. Buscar
4. Navegue pelas pÃ¡ginas
5. Quando encontrar serviÃ§o similar ao que precisa:
   - Clique `ðŸ“„ JSON`
   - Veja cÃ³digo do grupo/classe
   - Anote descriÃ§Ã£o exata
   - Verifique unidade de medida
6. Use essas informaÃ§Ãµes como referÃªncia

---

### Caso 7: Exportar Dados para AnÃ¡lise

**CenÃ¡rio:** VocÃª precisa analisar diversos materiais no Excel.

**Passo a Passo:**

1. FaÃ§a qualquer consulta (ex: Material, Grupo 1)
2. Clique `ðŸ“¥ Exportar CSV`
3. Arquivo serÃ¡ baixado: `consulta_materiais_2025-11-03.csv`
4. Abra no Excel/LibreOffice
5. Dados virÃ£o organizados em colunas:
   - CÃ³digo
   - DescriÃ§Ã£o
   - Unidade
   - Ã“rgÃ£o/UASG
   - Status
   - AtualizaÃ§Ã£o
   - Valor

**Dica:** Se precisa de mais dados, navegue para prÃ³xima pÃ¡gina e exporte novamente. Depois consolide os arquivos.

---

### Caso 8: Verificar Status de Itens

**CenÃ¡rio:** VocÃª quer ver quais materiais de um grupo estÃ£o ativos/inativos.

**Passo a Passo:**

1. Selecione: `CatÃ¡logo â€“ Material`
2. Filtros:
   - CÃ³digo do Grupo: `5`
   - Status: `Ativo`
3. Buscar â†’ veja materiais ativos
4. Altere Status para `Inativo`
5. Buscar â†’ veja materiais inativos
6. Compare para entender quais foram descontinuados

---

## ðŸŽ¯ Dicas AvanÃ§adas

### OtimizaÃ§Ã£o de Buscas

**1. Use Cache a Seu Favor**

- Primeira busca: ~2-5 segundos
- Mesma busca em 5 min: instantÃ¢nea (cache)
- Se dados mudaram, clique "Limpar Cache"

**2. Filtre Progressivamente**

- Comece com filtro amplo (ex: sÃ³ UF)
- Se muitos resultados, adicione mais filtros
- Evite deixar TODOS os filtros em branco (pode retornar muito dado)

**3. Pagine Estrategicamente**

- Se sabe que item estÃ¡ no inÃ­cio, fique nas primeiras pÃ¡ginas
- Use `Ctrl+F` no navegador para buscar na pÃ¡gina atual
- Exporte CSV e use busca do Excel para grandes volumes

### InterpretaÃ§Ã£o de Dados

**Coluna "Ã“rgÃ£o/UASG":**

- Material: `Grupo: X | Classe: Y`
- ServiÃ§o: `Grupo: X | Classe: Y`
- UASG: Nome do Ã³rgÃ£o vinculado
- ARP: `Ata: XXXXX/YYYY - UASG: ZZZZZZ`
- PNCP: Nome do Ã³rgÃ£o contratante
- Legado: `UASG: XXXXX - Nome`

**Coluna "Status":**

- `Ativo`: Item disponÃ­vel para uso
- `Inativo`: Item descontinuado/obsoleto
- Outras: Depende do dataset

**Coluna "Valor":**

- Material/ServiÃ§o: Geralmente `-` (nÃ£o tem preÃ§o fixo)
- ARP: Valor unitÃ¡rio praticado na ata
- PNCP: Valor total estimado da contrataÃ§Ã£o
- Legado: Valor estimado

### Troubleshooting RÃ¡pido

**"Nenhum resultado encontrado"**
â†’ Tente afrouxar os filtros (deixe alguns em branco)

**"Erro ao buscar dados"**
â†’ Verifique sua conexÃ£o com internet
â†’ API pode estar temporariamente indisponÃ­vel

**"RequisiÃ§Ã£o excedeu tempo limite"**
â†’ API demorou muito
â†’ Tente novamente em alguns segundos

**Carregamento muito lento**
â†’ Primeira vez Ã© normal (nÃ£o estÃ¡ em cache)
â†’ Verifique sua conexÃ£o
â†’ API pode estar sob carga

**Dados "estranhos" ou incompletos**
â†’ Clique `ðŸ“„ JSON` para ver dados brutos
â†’ Algumas APIs retornam campos vazios mesmo
â†’ Nem todo item tem todos os campos preenchidos

---

## ðŸ“Š Casos de Uso por Perfil

### Comprador/Licitante

- âœ… Pesquisar cÃ³digos CATMAT/CATSER para TR
- âœ… Verificar preÃ§os em ARPs vigentes
- âœ… Comparar valores de referÃªncia
- âœ… Buscar fornecedores em atas ativas

### Gestor de Contratos

- âœ… Acompanhar contrataÃ§Ãµes PNCP
- âœ… Verificar vigÃªncia de atas
- âœ… Consultar histÃ³rico de licitaÃ§Ãµes
- âœ… Exportar relatÃ³rios para anÃ¡lise

### Almoxarife

- âœ… Validar cÃ³digos de materiais
- âœ… Verificar unidades de medida padrÃ£o
- âœ… Consultar descriÃ§Ãµes oficiais
- âœ… Conferir status de itens

### Contador/Controladoria

- âœ… Auditar valores praticados
- âœ… Verificar conformidade CNPJ
- âœ… Exportar dados para planilhas
- âœ… Consultar histÃ³rico de contrataÃ§Ãµes

---

## ðŸ”— Links Ãšteis

**DocumentaÃ§Ã£o Oficial:**

- Swagger: https://dadosabertos.compras.gov.br/swagger-ui/index.html
- Portal Compras: https://www.gov.br/compras

**DocumentaÃ§Ã£o SINGEM:**

- Guia Completo: `/docs/CONSULTAS_DIVERSAS.md`
- Testes: `/docs/TESTES_CONSULTAS.md`
- README: `/consultas/README.md`

---

**Ãšltima atualizaÃ§Ã£o:** 03/11/2025  
**VersÃ£o SINGEM:** 1.2.4  
**MÃ³dulo:** Consultas Diversas v1.0.0
