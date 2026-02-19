# 🔍 Consultas Diversas

Módulo de consulta aos Dados Abertos do Compras.gov.br

## 🚀 Acesso Rápido

Abra `index.html` em um navegador ou clique no card "Consultas Diversas" na tela inicial do IFDESK.

## 📚 Datasets Disponíveis

1. **Catálogo – Material** - Itens CATMAT
2. **Catálogo – Serviço** - Itens CATSER
3. **UASG** - Unidades administrativas
4. **ARP – Itens** - Atas de Registro de Preços
5. **Contratações PNCP** - Lei 14.133/2021
6. **Legado – Licitações** - Sistema antigo
7. **Legado – Itens** - Itens de licitações legado

## 🎯 Recursos

- ✅ Filtros dinâmicos por dataset
- ✅ Paginação automática
- ✅ Cache de 5 minutos
- ✅ Exportação CSV
- ✅ Visualização JSON completa
- ✅ Retry automático em erros
- ✅ Interface responsiva

## 📖 Documentação Completa

Veja `/docs/CONSULTAS_DIVERSAS.md` para documentação detalhada com exemplos e troubleshooting.

## 🌐 API

Base URL: `https://dadosabertos.compras.gov.br`

Documentação oficial: https://dadosabertos.compras.gov.br/swagger-ui/index.html

## 💡 Exemplos

### Buscar materiais por grupo

1. Selecione "Catálogo – Material"
2. Código do Grupo: `1`
3. Clique em "Buscar"

### Buscar UASG na Bahia

1. Selecione "UASG (Unidades)"
2. UF: `BA`
3. Status: `Ativo`
4. Clique em "Buscar"

---

**IFDESK v1.2.4** | IF Baiano
