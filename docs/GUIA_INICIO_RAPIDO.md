# 🚀 Guia de Início Rápido - Sistema de Controle de Material

## 📋 Pré-requisitos

Antes de usar o sistema, certifique-se de que:

1. ✅ Você tem um navegador moderno (Chrome, Firefox, Safari, Edge)
2. ✅ JavaScript está habilitado no navegador
3. ✅ Todos os arquivos estão na estrutura correta de pastas
4. ✅ Você tem PDFs de Notas de Empenho e/ou Notas Fiscais para testar

## 🎯 Primeiros Passos

### 1. Primeiro Acesso (Login)

🔐 **Para administradores na primeira vez:**

1. Abra o arquivo `index.html` no navegador
2. Você verá a **Tela de Login**
3. Clique em **"💡 Primeiro acesso do administrador?"**
4. Use as **credenciais mestras**:
   ```
   👤 Usuário: singem
   🔑 Senha: admin@2025
   ```
5. O sistema abrirá automaticamente as **Configurações → Usuários**
6. **Cadastre seu próprio usuário e senha** (obrigatório!)
7. Faça **logout** (botão 🚪 Sair no header)
8. Entre novamente com **suas credenciais cadastradas**

⚠️ **IMPORTANTE**:

- As credenciais mestras são **APENAS para primeiro acesso**
- Após cadastrar seu usuário, use sempre suas próprias credenciais
- Veja mais detalhes em: [docs/CREDENCIAIS_ACESSO.md](CREDENCIAIS_ACESSO.md)

### 2. Verifique a Instalação

1. Abra o arquivo `teste.html` no navegador
2. Execute todos os testes clicando em "▶️ Executar Todos os Testes"
3. Verifique se todos os componentes estão com ✅ (verde)
4. Se houver erros ❌, corrija-os antes de continuar

### 2. Acesse o Sistema

1. Abra o arquivo `index.html` no navegador
2. Você verá a tela inicial com 4 opções principais
3. Navegue pelas telas usando os botões "← Voltar" ou "🏠 Início"

### 3. Configure o Sistema de Arquivos (Recomendado)

1. Clique em "📊 Relatórios"
2. Na seção "📁 Gerenciamento de Arquivos", clique em "⚙️ Configurar Pasta Principal"
3. Escolha uma pasta no seu computador onde os PDFs serão salvos (ex: `C:\DocumentosIF\`)
4. O sistema criará automaticamente as subpastas:
   - `Empenhos/2024/`, `Empenhos/2025/`, etc.
   - `NotasFiscais/2024/`, `NotasFiscais/2025/`, etc.
5. ✅ **Vantagem**: Todos os PDFs ficarão organizados e acessíveis offline no seu computador!

## 📝 Fluxo Recomendado de Uso

### Passo 1: Cadastre um Empenho

1. Clique em "📝 Cadastro de Empenho"
2. Faça upload do PDF da Nota de Empenho:
   - Clique na área de upload OU
   - Arraste o arquivo PDF para a área
3. Verifique os dados extraídos automaticamente
4. Complete informações que não foram extraídas
5. Ajuste os itens se necessário
6. Clique em "Salvar Empenho"

### Passo 2: Registre Entregas (Recebimentos)

1. Clique em "📦 Entrada de Entrega"
2. Selecione o empenho cadastrado anteriormente
3. Informe a data da entrega
4. Para cada item, informe a quantidade recebida
5. Adicione observações se necessário
6. Clique em "Registrar Entrega"

### Passo 3: Cadastre a Nota Fiscal

1. Clique em "📄 Entrada de Nota Fiscal"
2. **Escolha uma das três formas de entrada:**

   **📎 UPLOAD DE PDF**
   - Arraste o arquivo PDF para a área de upload
   - OU clique para selecionar o arquivo
   - Aguarde a extração automática dos dados

   **🔑 CHAVE DE ACESSO**
   - Digite a chave de 44 dígitos (apenas números)
   - Clique em "Buscar por Chave"
   - Aguarde a consulta automática na API

   **📱 CÓDIGO DE BARRAS**
   - Clique em "Ler Código de Barras"
   - Permita acesso à câmera quando solicitado
   - Aponte a câmera para o código de barras
   - Aguarde a detecção automática

3. Aguarde o processamento automático dos dados
4. Selecione o empenho correspondente (se disponível)
5. O sistema mostrará divergências automaticamente
6. Clique em "Salvar Nota Fiscal"

### Passo 4: Gere Relatórios

1. Clique em "📊 Relatórios"
2. Escolha o tipo de relatório desejado
3. Aplique filtros se necessário
4. Visualize os dados na tela
5. Exporte se necessário (funcionalidade em desenvolvimento)

## 💡 Dicas de Uso

### Entrada de Nota Fiscal - Métodos Disponíveis

**📎 UPLOAD DE PDF**

- ✅ Use apenas arquivos PDF (máximo 10MB)
- ✅ PDFs com texto são melhor processados que escaneados
- ✅ Aceita múltiplos formatos de NF-e
- ❌ Não aceita imagens ou documentos protegidos

**🔑 CHAVE DE ACESSO**

- ✅ Digite exatamente 44 dígitos numéricos
- ✅ Sistema consulta automaticamente na SEFAZ
- ✅ Dados são extraídos diretamente da fonte oficial
- ⚠️ Requer conexão com internet

**📱 CÓDIGO DE BARRAS**

- ✅ Permita acesso à câmera quando solicitado
- ✅ Aponte para códigos de barras ou QR codes
- ✅ Detecção automática em tempo real
- ⚠️ Necessita boa iluminação e câmera funcional

### Dicas Gerais

- ✅ Verifique sempre os dados extraídos automaticamente
- ✅ Complete manualmente informações não extraídas
- ✅ Teste os três métodos para escolher o mais conveniente

### Dados de Qualidade

- 📌 Preencha todos os campos obrigatórios
- 📌 Use CNPJ no formato correto (00.000.000/0000-00)
- 📌 Datas no formato DD/MM/AAAA serão convertidas automaticamente
- 📌 Valores podem usar vírgula ou ponto decimal

### Navegação

- 🔄 Use "← Voltar" para retornar ao menu principal
- 🔄 Dados são salvos automaticamente no navegador local
- 🔄 Sistema funciona offline (sem internet)

## ⚠️ Solução de Problemas Comuns

### PDF não é processado

**Problema**: Arquivo PDF não extrai dados corretamente  
**Solução**:

- Verifique se é um PDF real (não imagem)
- Complete os dados manualmente
- Use PDFs com texto selecionável
- Teste os outros métodos (chave ou código de barras)

### Chave de acesso não funciona

**Problema**: Sistema não encontra dados pela chave  
**Solução**:

- Verifique se a chave tem exatamente 44 dígitos
- Digite apenas números (sem espaços ou traços)
- Verifique sua conexão com a internet
- Use o método de upload de PDF como alternativa

### Câmera não funciona

**Problema**: Scanner de código de barras não abre  
**Solução**:

- Permita acesso à câmera no navegador
- Verifique se a câmera não está sendo usada por outro app
- Use navegador Chrome ou Firefox (melhor suporte)
- Como alternativa, use upload de PDF ou chave de acesso

### Dados não são salvos

**Problema**: Informações desaparecem ao recarregar  
**Solução**:

- Verifique se o navegador suporta IndexedDB
- Não use modo privado/incógnito
- Limpe cache e tente novamente

### Interface não carrega

**Problema**: Tela branca ou erro de JavaScript  
**Solução**:

- Abra o console do navegador (F12)
- Verifique erros de JavaScript
- Certifique-se que todos os arquivos estão presentes

### Lentidão no sistema

**Problema**: Sistema fica lento com muitos dados  
**Solução**:

- Use o arquivo `teste.html` para limpar o banco
- Exporte dados importantes antes de limpar
- Evite uploads de PDFs muito grandes (>10MB)

## 📞 Suporte Técnico

### Recursos de Ajuda

1. **README.md**: Documentação completa
2. **teste.html**: Ferramenta de diagnóstico
3. **Console do navegador**: Mensagens de erro detalhadas
4. **Comentários no código**: Explicações técnicas

### Informações para Suporte

Se precisar de ajuda, anote:

- ✏️ Navegador e versão
- ✏️ Sistema operacional
- ✏️ Mensagem de erro completa
- ✏️ Passos para reproduzir o problema
- ✏️ Arquivos que causam problema

## 🔧 Personalização

### Configurações

- Edite `js/config.js` para personalizar o sistema
- Altere informações da instituição
- Ajuste padrões de extração de PDF
- Modifique cores e mensagens

### Visual

- Edite `css/style.css` para alterar aparência
- As cores do IF Baiano estão nas variáveis CSS
- Design é responsivo para mobile

## � Gerenciamento de Arquivos

### Como Usar o Sistema de Arquivos

1. **Primeira Configuração** (apenas uma vez):
   - Vá em "📊 Relatórios"
   - Clique em "⚙️ Configurar Pasta Principal"
   - Escolha onde salvar os arquivos (ex: `C:\Documentos\ControleMaterial\`)

2. **Upload Automático**:
   - Cada PDF de empenho/nota fiscal é salvo automaticamente
   - O sistema pergunta o ano fiscal se não conseguir detectar
   - Arquivos são organizados em `Empenhos/ANO/` e `NotasFiscais/ANO/`

3. **Acessar Arquivos**:
   - Use os botões "📝 Abrir Pasta Empenhos" ou "📄 Abrir Pasta Notas Fiscais"
   - Os arquivos estarão organizados por ano
   - Acesse os PDFs diretamente pelo explorador de arquivos

4. **Estatísticas**:
   - Clique em "📊 Estatísticas" para ver resumo
   - Quantidade de arquivos por tipo e ano
   - Localização da pasta principal

### 🔍 Compatibilidade

- **✅ Chrome 86+**: Suporte completo
- **✅ Edge 88+**: Suporte completo
- **⚠️ Firefox**: Requer flag experimental habilitada
- **⚠️ Safari**: Suporte limitado
- **🔄 Fallback**: Sistema funciona sem File System Access API (arquivos ficam apenas no navegador)

## �📊 Relatórios Disponíveis

### Implementados

- ✅ **Relatório de Empenhos**: Lista todos os empenhos cadastrados
- ✅ **Relatório de Entregas**: Histórico de recebimentos
- ✅ **Relatório de Notas Fiscais**: Lista de NFs cadastradas

### Em Desenvolvimento

- 🔄 **Relatório de Conferência**: Para envio ao fornecedor
- 🔄 **Relatório de Divergências**: Problemas encontrados
- 🔄 **Exportação PDF/CSV**: Download dos relatórios
- 🔄 **Filtros Avançados**: Busca por período, fornecedor, etc.

## 🚀 Próximas Atualizações

### Versão 1.1 (Planejada)

- 📈 Relatórios avançados com gráficos
- 📤 Exportação completa em PDF/CSV/Excel
- 🔍 Busca avançada e filtros
- 📊 Dashboard com indicadores

### Versão 1.2 (Planejada)

- 🔒 Sistema de backup automático
- 📱 Melhorias na interface mobile
- 🔌 Integração com APIs externas (CNPJ, CEP)
- 📧 Geração de relatórios por email

---

**💻 Sistema desenvolvido para o IF Baiano**  
**🎯 Controle de Material v1.0**  
**📅 Outubro 2025**

### Início Rápido - Checklist ✅

- [ ] Abrir `teste.html` e executar todos os testes
- [ ] Verificar se todos os componentes estão ✅ (verde)
- [ ] Abrir `index.html` para acessar o sistema
- [ ] Cadastrar primeiro empenho com PDF
- [ ] Registrar primeira entrega
- [ ] **Testar os 3 métodos de entrada de nota fiscal:**
  - [ ] 📎 Upload de PDF da nota fiscal
  - [ ] 🔑 Entrada por chave de acesso (44 dígitos)
  - [ ] 📱 Leitura de código de barras com câmera
- [ ] Gerar primeiro relatório
- [ ] **🎉 Sistema funcionando perfeitamente!**

### 🎯 Métodos de Teste Recomendados

1. **Para PDF**: Use o arquivo de exemplo em `exemplos.json`
2. **Para Chave**: Use uma chave válida de NF-e real
3. **Para Código de Barras**: Use a câmera com boa iluminação
4. **Verifique**: Se todos os dados são extraídos corretamente
5. **Confirme**: Se divergências são detectadas automaticamente
