# 🧪 Guia de Testes - Consultas Diversas

## ✅ Checklist de Testes Manuais

### 1. Teste de Abertura

- [ ] Abrir IFDESK (index.html)
- [ ] Localizar card "🔍 Consultas Diversas"
- [ ] Clicar no card
- [ ] Nova aba deve abrir com a interface de consultas

### 2. Teste de Seleção de Dataset

- [ ] Verificar se seletor mostra "Selecione um conjunto de dados..."
- [ ] Clicar no seletor
- [ ] Verificar se aparecem os 7 datasets:
  - Catálogo – Material
  - Catálogo – Serviço
  - UASG (Unidades)
  - ARP – Itens
  - Contratações – PNCP/Lei 14.133
  - Legado – Licitações
  - Legado – Itens de Licitação

### 3. Teste: Catálogo Material

```
Dataset: Catálogo – Material
Filtros:
  - Código do Grupo: 1
  - Status: Ativo
Ação: Clicar "Buscar"
Resultado Esperado:
  ✅ Loading spinner aparece
  ✅ Tabela carrega com materiais do grupo 1
  ✅ Paginação mostra "Página X de Y"
  ✅ Total de registros exibido
```

### 4. Teste: UASG por UF

```
Dataset: UASG (Unidades)
Filtros:
  - UF: BA
  - Status: Ativo
Ação: Clicar "Buscar"
Resultado Esperado:
  ✅ Carrega UASG da Bahia
  ✅ Coluna Unidade/UF mostra "BA"
  ✅ Status mostra "Ativo"
```

### 5. Teste: ARP por Ano

```
Dataset: ARP – Itens
Filtros:
  - Ano da Ata: 2025
Ação: Clicar "Buscar"
Resultado Esperado:
  ✅ Carrega itens de atas de 2025
  ✅ Coluna Valor preenchida
  ✅ Órgão/UASG com formato "Ata: XXX/2025"
```

### 6. Teste: PNCP

```
Dataset: Contratações – PNCP/Lei 14.133
Filtros:
  - Ano: 2025
Ação: Clicar "Buscar"
Resultado Esperado:
  ✅ Carrega contratações de 2025
  ✅ Descrição com objeto da contratação
  ✅ Valor Total Estimado preenchido
```

### 7. Teste de Paginação

- [ ] Fazer uma busca que retorne múltiplas páginas
- [ ] Verificar botão "Próxima" habilitado
- [ ] Clicar em "Próxima"
- [ ] Verificar se página muda (Página 2 de X)
- [ ] Verificar botão "Anterior" habilitado
- [ ] Clicar em "Anterior"
- [ ] Voltar para página 1

### 8. Teste de Exportação CSV

- [ ] Fazer uma busca com resultados
- [ ] Clicar em "📥 Exportar CSV"
- [ ] Verificar se arquivo CSV foi baixado
- [ ] Abrir CSV e verificar:
  - Cabeçalhos corretos
  - Dados formatados
  - Encoding UTF-8 (acentos corretos)

### 9. Teste de Visualização JSON

- [ ] Fazer uma busca com resultados
- [ ] Clicar em botão "📄 JSON" de qualquer item
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
   ✅ Carregamento instantâneo (cache)
   ✅ Console mostra "Usando resultado do cache"
6. Clicar "⚡ Limpar Cache"
7. Refazer busca novamente
8. Verificar:
   ✅ Carregamento normal (busca API)
```

### 11. Teste de Limpar Filtros

- [ ] Selecionar dataset
- [ ] Preencher vários filtros
- [ ] Fazer busca
- [ ] Clicar "🗑️ Limpar Filtros"
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
   ✅ Dataset UASG selecionado
   ✅ Filtro UF = BA preenchido
   ✅ (Busca não executada automaticamente)
```

### 13. Teste de Erros

```
Cenário 1: Timeout
- Desconectar internet
- Fazer busca
- Verificar mensagem de erro clara

Cenário 2: Sem Resultados
- Dataset: Material
- Filtro: Código PDM: 999999999999
- Buscar
- Verificar mensagem "Nenhum resultado encontrado"

Cenário 3: Dataset Sem Filtros
- Selecionar dataset
- Não preencher nenhum filtro
- Buscar
- Verificar se faz busca genérica (pág. 1)
```

### 14. Teste Responsivo

- [ ] Abrir em tela desktop (>1200px)
  - Filtros em grid multi-coluna
  - Tabela completa visível
- [ ] Reduzir para tablet (768px)
  - Filtros ajustam automaticamente
  - Tabela com scroll horizontal
- [ ] Reduzir para mobile (400px)
  - Filtros single-column
  - Controles empilhados verticalmente
  - Tabela compacta

### 15. Teste de Acessibilidade

- [ ] Navegar com TAB pelo formulário
- [ ] Verificar ordem lógica de foco
- [ ] Verificar se botões têm aria-label
- [ ] Verificar se inputs têm labels associados
- [ ] Testar com leitor de tela (NVDA/JAWS)

## 🐛 Problemas Conhecidos

### CORS (esperado)

- **Situação:** Navegador pode bloquear requisições diretas à API
- **Solução:**
  - Usar servidor local (python -m http.server)
  - Extensão CORS Unblock no Chrome
  - Servidor proxy (opcional)

### Rate Limit

- **Situação:** Muitas requisições em sequência
- **Comportamento:** Sistema faz retry automático
- **Solução:** Aguardar alguns segundos

## ✅ Critérios de Aceitação

O módulo está funcionando corretamente se:

- ✅ Todos os 7 datasets carregam dados
- ✅ Filtros funcionam corretamente
- ✅ Paginação navega entre páginas
- ✅ Cache reduz tempo de carregamento
- ✅ CSV exporta com dados corretos
- ✅ JSON modal exibe dados completos
- ✅ Erros são tratados com mensagens claras
- ✅ Interface responsiva em todos os tamanhos
- ✅ LocalStorage persiste estado
- ✅ Nenhum erro no console (exceto CORS esperado)

## 📊 Relatório de Teste

Preencha após realizar os testes:

```
Data do Teste: ___/___/2025
Testador: _________________
Navegador: ________________
Versão IFDESK: 1.2.4

Testes Aprovados: ___/15
Testes Falhados: ___/15
Problemas Encontrados:
-
-
-

Observações:



Conclusão: [ ] APROVADO  [ ] REPROVADO
```

## 🚀 Testes Automatizados (Futuro)

Sugestões para implementação futura:

- Jest para testes unitários
- Cypress para testes E2E
- Lighthouse para performance
- axe-core para acessibilidade

---

**Documento criado em:** 03/11/2025  
**Módulo:** Consultas Diversas v1.0.0  
**Sistema:** IFDESK v1.2.4
