# 💡 Exemplos Práticos - Consultas Diversas

## 📚 Casos de Uso Reais

### Caso 1: Pesquisar Material para Licitação

**Cenário:** Você precisa verificar se um material específico está cadastrado no CATMAT antes de iniciar uma licitação.

**Passo a Passo:**

1. Acesse Consultas Diversas
2. Selecione: `Catálogo – Material`
3. Deixe filtros em branco (busca geral)
4. Página 1 mostrará primeiros materiais
5. Use paginação para navegar
6. Quando encontrar material similar, clique em `📄 JSON` para ver detalhes completos
7. Anote o código PDM para usar na sua licitação

**Dica:** Se souber o grupo/classe, use os filtros para refinar a busca.

---

### Caso 2: Localizar UASG do IF Baiano

**Cenário:** Você precisa confirmar o código UASG do IF Baiano para cadastrar em sistema externo.

**Passo a Passo:**

1. Selecione: `UASG (Unidades)`
2. Filtros:
   - UF: `BA`
   - Deixe outros em branco
3. Buscar
4. Procure por "Instituto Federal" na descrição
5. Anote o código UASG quando encontrar

**Exemplo de Resultado:**

```
Código: 158155
Descrição: IF BAIANO CAMPUS GUANAMBI
UF: BA
Órgão: MINISTERIO DA EDUCACAO
Status: Ativo
```

---

### Caso 3: Verificar Preços em Atas Vigentes

**Cenário:** Você precisa verificar preços praticados em ARPs para comparar com orçamento.

**Passo a Passo:**

1. Selecione: `ARP – Itens`
2. Filtros:
   - Ano da Ata: `2025`
   - Deixe outros em branco (mostra todas atas de 2025)
3. Buscar
4. Observe a coluna "Valor" - preços unitários praticados
5. Clique `📄 JSON` para ver:
   - Fornecedor
   - CNPJ
   - Vigência da ata
   - Quantidade
   - Valor total
6. Exporte CSV para análise no Excel

**Uso dos Dados:**

- Compare com seu orçamento
- Identifique fornecedores já cadastrados
- Verifique valores de referência

---

### Caso 4: Acompanhar Contratações PNCP

**Cenário:** Você quer ver contratações recentes de um órgão específico no novo portal PNCP.

**Passo a Passo:**

1. Selecione: `Contratações – PNCP/Lei 14.133`
2. Filtros:
   - Ano: `2025`
   - Situação: `em_andamento` (opcional)
3. Buscar
4. Veja objetos das contratações
5. Clique `📄 JSON` para acessar:
   - Link do sistema origem
   - Modalidade
   - Número do processo
   - Valor estimado
   - Data de abertura

**Dica:** Use exportação CSV para gerar relatório de contratações do período.

---

### Caso 5: Pesquisar Licitações Antigas (Sistema Legado)

**Cenário:** Você precisa consultar informações de uma licitação de anos anteriores.

**Passo a Passo:**

1. Selecione: `Legado – Licitações`
2. Filtros:
   - UASG: `158155` (exemplo: IF Baiano Guanambi)
   - Ano: `2024`
   - Modalidade: `1` (Pregão)
3. Buscar
4. Lista mostrará todas licitações daquela UASG/ano/modalidade
5. Anote número da licitação de interesse
6. Depois, selecione `Legado – Itens de Licitação`
7. Filtros:
   - UASG: `158155`
   - Modalidade: `1`
   - Número da Licitação: `00012` (exemplo)
8. Buscar
9. Veja todos os itens daquela licitação

---

### Caso 6: Buscar Serviços para Contratação

**Cenário:** Você precisa cadastrar um serviço e quer ver exemplos no CATSER.

**Passo a Passo:**

1. Selecione: `Catálogo – Serviço`
2. Deixe filtros em branco para busca ampla
3. Buscar
4. Navegue pelas páginas
5. Quando encontrar serviço similar ao que precisa:
   - Clique `📄 JSON`
   - Veja código do grupo/classe
   - Anote descrição exata
   - Verifique unidade de medida
6. Use essas informações como referência

---

### Caso 7: Exportar Dados para Análise

**Cenário:** Você precisa analisar diversos materiais no Excel.

**Passo a Passo:**

1. Faça qualquer consulta (ex: Material, Grupo 1)
2. Clique `📥 Exportar CSV`
3. Arquivo será baixado: `consulta_materiais_2025-11-03.csv`
4. Abra no Excel/LibreOffice
5. Dados virão organizados em colunas:
   - Código
   - Descrição
   - Unidade
   - Órgão/UASG
   - Status
   - Atualização
   - Valor

**Dica:** Se precisa de mais dados, navegue para próxima página e exporte novamente. Depois consolide os arquivos.

---

### Caso 8: Verificar Status de Itens

**Cenário:** Você quer ver quais materiais de um grupo estão ativos/inativos.

**Passo a Passo:**

1. Selecione: `Catálogo – Material`
2. Filtros:
   - Código do Grupo: `5`
   - Status: `Ativo`
3. Buscar → veja materiais ativos
4. Altere Status para `Inativo`
5. Buscar → veja materiais inativos
6. Compare para entender quais foram descontinuados

---

## 🎯 Dicas Avançadas

### Otimização de Buscas

**1. Use Cache a Seu Favor**

- Primeira busca: ~2-5 segundos
- Mesma busca em 5 min: instantânea (cache)
- Se dados mudaram, clique "Limpar Cache"

**2. Filtre Progressivamente**

- Comece com filtro amplo (ex: só UF)
- Se muitos resultados, adicione mais filtros
- Evite deixar TODOS os filtros em branco (pode retornar muito dado)

**3. Pagine Estrategicamente**

- Se sabe que item está no início, fique nas primeiras páginas
- Use `Ctrl+F` no navegador para buscar na página atual
- Exporte CSV e use busca do Excel para grandes volumes

### Interpretação de Dados

**Coluna "Órgão/UASG":**

- Material: `Grupo: X | Classe: Y`
- Serviço: `Grupo: X | Classe: Y`
- UASG: Nome do órgão vinculado
- ARP: `Ata: XXXXX/YYYY - UASG: ZZZZZZ`
- PNCP: Nome do órgão contratante
- Legado: `UASG: XXXXX - Nome`

**Coluna "Status":**

- `Ativo`: Item disponível para uso
- `Inativo`: Item descontinuado/obsoleto
- Outras: Depende do dataset

**Coluna "Valor":**

- Material/Serviço: Geralmente `-` (não tem preço fixo)
- ARP: Valor unitário praticado na ata
- PNCP: Valor total estimado da contratação
- Legado: Valor estimado

### Troubleshooting Rápido

**"Nenhum resultado encontrado"**
→ Tente afrouxar os filtros (deixe alguns em branco)

**"Erro ao buscar dados"**
→ Verifique sua conexão com internet
→ API pode estar temporariamente indisponível

**"Requisição excedeu tempo limite"**
→ API demorou muito
→ Tente novamente em alguns segundos

**Carregamento muito lento**
→ Primeira vez é normal (não está em cache)
→ Verifique sua conexão
→ API pode estar sob carga

**Dados "estranhos" ou incompletos**
→ Clique `📄 JSON` para ver dados brutos
→ Algumas APIs retornam campos vazios mesmo
→ Nem todo item tem todos os campos preenchidos

---

## 📊 Casos de Uso por Perfil

### Comprador/Licitante

- ✅ Pesquisar códigos CATMAT/CATSER para TR
- ✅ Verificar preços em ARPs vigentes
- ✅ Comparar valores de referência
- ✅ Buscar fornecedores em atas ativas

### Gestor de Contratos

- ✅ Acompanhar contratações PNCP
- ✅ Verificar vigência de atas
- ✅ Consultar histórico de licitações
- ✅ Exportar relatórios para análise

### Almoxarife

- ✅ Validar códigos de materiais
- ✅ Verificar unidades de medida padrão
- ✅ Consultar descrições oficiais
- ✅ Conferir status de itens

### Contador/Controladoria

- ✅ Auditar valores praticados
- ✅ Verificar conformidade CNPJ
- ✅ Exportar dados para planilhas
- ✅ Consultar histórico de contratações

---

## 🔗 Links Úteis

**Documentação Oficial:**

- Swagger: https://dadosabertos.compras.gov.br/swagger-ui/index.html
- Portal Compras: https://www.gov.br/compras

**Documentação IFDESK:**

- Guia Completo: `/docs/CONSULTAS_DIVERSAS.md`
- Testes: `/docs/TESTES_CONSULTAS.md`
- README: `/consultas/README.md`

---

**Última atualização:** 03/11/2025  
**Versão IFDESK:** 1.2.4  
**Módulo:** Consultas Diversas v1.0.0
