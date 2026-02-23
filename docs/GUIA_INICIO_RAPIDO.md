# ðŸš€ Guia de InÃ­cio RÃ¡pido - Sistema de Controle de Material

## ðŸ“‹ PrÃ©-requisitos

Antes de usar o sistema, certifique-se de que:

1. âœ… VocÃª tem um navegador moderno (Chrome, Firefox, Safari, Edge)
2. âœ… JavaScript estÃ¡ habilitado no navegador
3. âœ… Todos os arquivos estÃ£o na estrutura correta de pastas
4. âœ… VocÃª tem PDFs de Notas de Empenho e/ou Notas Fiscais para testar

## ðŸŽ¯ Primeiros Passos

### 1. Primeiro Acesso (Login)

ðŸ” **Para administradores na primeira vez:**

1. Abra o arquivo `index.html` no navegador
2. VocÃª verÃ¡ a **Tela de Login**
3. Clique em **"ðŸ’¡ Primeiro acesso do administrador?"**
4. Use as **credenciais mestras**:
   ```
   ðŸ‘¤ UsuÃ¡rio: singem
   ðŸ”‘ Senha: admin@2025
   ```
5. O sistema abrirÃ¡ automaticamente as **ConfiguraÃ§Ãµes â†’ UsuÃ¡rios**
6. **Cadastre seu prÃ³prio usuÃ¡rio e senha** (obrigatÃ³rio!)
7. FaÃ§a **logout** (botÃ£o ðŸšª Sair no header)
8. Entre novamente com **suas credenciais cadastradas**

âš ï¸ **IMPORTANTE**:

- As credenciais mestras sÃ£o **APENAS para primeiro acesso**
- ApÃ³s cadastrar seu usuÃ¡rio, use sempre suas prÃ³prias credenciais
- Veja mais detalhes em: [docs/CREDENCIAIS_ACESSO.md](CREDENCIAIS_ACESSO.md)

### 2. Verifique a InstalaÃ§Ã£o

1. Abra o arquivo `teste.html` no navegador
2. Execute todos os testes clicando em "â–¶ï¸ Executar Todos os Testes"
3. Verifique se todos os componentes estÃ£o com âœ… (verde)
4. Se houver erros âŒ, corrija-os antes de continuar

### 2. Acesse o Sistema

1. Abra o arquivo `index.html` no navegador
2. VocÃª verÃ¡ a tela inicial com 4 opÃ§Ãµes principais
3. Navegue pelas telas usando os botÃµes "â† Voltar" ou "ðŸ  InÃ­cio"

### 3. Configure o Sistema de Arquivos (Recomendado)

1. Clique em "ðŸ“Š RelatÃ³rios"
2. Na seÃ§Ã£o "ðŸ“ Gerenciamento de Arquivos", clique em "âš™ï¸ Configurar Pasta Principal"
3. Escolha uma pasta no seu computador onde os PDFs serÃ£o salvos (ex: `C:\DocumentosIF\`)
4. O sistema criarÃ¡ automaticamente as subpastas:
   - `Empenhos/2024/`, `Empenhos/2025/`, etc.
   - `NotasFiscais/2024/`, `NotasFiscais/2025/`, etc.
5. âœ… **Vantagem**: Todos os PDFs ficarÃ£o organizados e acessÃ­veis offline no seu computador!

## ðŸ“ Fluxo Recomendado de Uso

### Passo 1: Cadastre um Empenho

1. Clique em "ðŸ“ Cadastro de Empenho"
2. FaÃ§a upload do PDF da Nota de Empenho:
   - Clique na Ã¡rea de upload OU
   - Arraste o arquivo PDF para a Ã¡rea
3. Verifique os dados extraÃ­dos automaticamente
4. Complete informaÃ§Ãµes que nÃ£o foram extraÃ­das
5. Ajuste os itens se necessÃ¡rio
6. Clique em "Salvar Empenho"

### Passo 2: Registre Entregas (Recebimentos)

1. Clique em "ðŸ“¦ Entrada de Entrega"
2. Selecione o empenho cadastrado anteriormente
3. Informe a data da entrega
4. Para cada item, informe a quantidade recebida
5. Adicione observaÃ§Ãµes se necessÃ¡rio
6. Clique em "Registrar Entrega"

### Passo 3: Cadastre a Nota Fiscal

1. Clique em "ðŸ“„ Entrada de Nota Fiscal"
2. **Escolha uma das trÃªs formas de entrada:**

   **ðŸ“Ž UPLOAD DE PDF**
   - Arraste o arquivo PDF para a Ã¡rea de upload
   - OU clique para selecionar o arquivo
   - Aguarde a extraÃ§Ã£o automÃ¡tica dos dados

   **ðŸ”‘ CHAVE DE ACESSO**
   - Digite a chave de 44 dÃ­gitos (apenas nÃºmeros)
   - Clique em "Buscar por Chave"
   - Aguarde a consulta automÃ¡tica na API

   **ðŸ“± CÃ“DIGO DE BARRAS**
   - Clique em "Ler CÃ³digo de Barras"
   - Permita acesso Ã  cÃ¢mera quando solicitado
   - Aponte a cÃ¢mera para o cÃ³digo de barras
   - Aguarde a detecÃ§Ã£o automÃ¡tica

3. Aguarde o processamento automÃ¡tico dos dados
4. Selecione o empenho correspondente (se disponÃ­vel)
5. O sistema mostrarÃ¡ divergÃªncias automaticamente
6. Clique em "Salvar Nota Fiscal"

### Passo 4: Gere RelatÃ³rios

1. Clique em "ðŸ“Š RelatÃ³rios"
2. Escolha o tipo de relatÃ³rio desejado
3. Aplique filtros se necessÃ¡rio
4. Visualize os dados na tela
5. Exporte se necessÃ¡rio (funcionalidade em desenvolvimento)

## ðŸ’¡ Dicas de Uso

### Entrada de Nota Fiscal - MÃ©todos DisponÃ­veis

**ðŸ“Ž UPLOAD DE PDF**

- âœ… Use apenas arquivos PDF (mÃ¡ximo 10MB)
- âœ… PDFs com texto sÃ£o melhor processados que escaneados
- âœ… Aceita mÃºltiplos formatos de NF-e
- âŒ NÃ£o aceita imagens ou documentos protegidos

**ðŸ”‘ CHAVE DE ACESSO**

- âœ… Digite exatamente 44 dÃ­gitos numÃ©ricos
- âœ… Sistema consulta automaticamente na SEFAZ
- âœ… Dados sÃ£o extraÃ­dos diretamente da fonte oficial
- âš ï¸ Requer conexÃ£o com internet

**ðŸ“± CÃ“DIGO DE BARRAS**

- âœ… Permita acesso Ã  cÃ¢mera quando solicitado
- âœ… Aponte para cÃ³digos de barras ou QR codes
- âœ… DetecÃ§Ã£o automÃ¡tica em tempo real
- âš ï¸ Necessita boa iluminaÃ§Ã£o e cÃ¢mera funcional

### Dicas Gerais

- âœ… Verifique sempre os dados extraÃ­dos automaticamente
- âœ… Complete manualmente informaÃ§Ãµes nÃ£o extraÃ­das
- âœ… Teste os trÃªs mÃ©todos para escolher o mais conveniente

### Dados de Qualidade

- ðŸ“Œ Preencha todos os campos obrigatÃ³rios
- ðŸ“Œ Use CNPJ no formato correto (00.000.000/0000-00)
- ðŸ“Œ Datas no formato DD/MM/AAAA serÃ£o convertidas automaticamente
- ðŸ“Œ Valores podem usar vÃ­rgula ou ponto decimal

### NavegaÃ§Ã£o

- ðŸ”„ Use "â† Voltar" para retornar ao menu principal
- ðŸ”„ Dados sÃ£o salvos automaticamente no navegador local
- ðŸ”„ Sistema funciona offline (sem internet)

## âš ï¸ SoluÃ§Ã£o de Problemas Comuns

### PDF nÃ£o Ã© processado

**Problema**: Arquivo PDF nÃ£o extrai dados corretamente  
**SoluÃ§Ã£o**:

- Verifique se Ã© um PDF real (nÃ£o imagem)
- Complete os dados manualmente
- Use PDFs com texto selecionÃ¡vel
- Teste os outros mÃ©todos (chave ou cÃ³digo de barras)

### Chave de acesso nÃ£o funciona

**Problema**: Sistema nÃ£o encontra dados pela chave  
**SoluÃ§Ã£o**:

- Verifique se a chave tem exatamente 44 dÃ­gitos
- Digite apenas nÃºmeros (sem espaÃ§os ou traÃ§os)
- Verifique sua conexÃ£o com a internet
- Use o mÃ©todo de upload de PDF como alternativa

### CÃ¢mera nÃ£o funciona

**Problema**: Scanner de cÃ³digo de barras nÃ£o abre  
**SoluÃ§Ã£o**:

- Permita acesso Ã  cÃ¢mera no navegador
- Verifique se a cÃ¢mera nÃ£o estÃ¡ sendo usada por outro app
- Use navegador Chrome ou Firefox (melhor suporte)
- Como alternativa, use upload de PDF ou chave de acesso

### Dados nÃ£o sÃ£o salvos

**Problema**: InformaÃ§Ãµes desaparecem ao recarregar  
**SoluÃ§Ã£o**:

- Verifique se o navegador suporta IndexedDB
- NÃ£o use modo privado/incÃ³gnito
- Limpe cache e tente novamente

### Interface nÃ£o carrega

**Problema**: Tela branca ou erro de JavaScript  
**SoluÃ§Ã£o**:

- Abra o console do navegador (F12)
- Verifique erros de JavaScript
- Certifique-se que todos os arquivos estÃ£o presentes

### LentidÃ£o no sistema

**Problema**: Sistema fica lento com muitos dados  
**SoluÃ§Ã£o**:

- Use o arquivo `teste.html` para limpar o banco
- Exporte dados importantes antes de limpar
- Evite uploads de PDFs muito grandes (>10MB)

## ðŸ“ž Suporte TÃ©cnico

### Recursos de Ajuda

1. **README.md**: DocumentaÃ§Ã£o completa
2. **teste.html**: Ferramenta de diagnÃ³stico
3. **Console do navegador**: Mensagens de erro detalhadas
4. **ComentÃ¡rios no cÃ³digo**: ExplicaÃ§Ãµes tÃ©cnicas

### InformaÃ§Ãµes para Suporte

Se precisar de ajuda, anote:

- âœï¸ Navegador e versÃ£o
- âœï¸ Sistema operacional
- âœï¸ Mensagem de erro completa
- âœï¸ Passos para reproduzir o problema
- âœï¸ Arquivos que causam problema

## ðŸ”§ PersonalizaÃ§Ã£o

### ConfiguraÃ§Ãµes

- Edite `js/config.js` para personalizar o sistema
- Altere informaÃ§Ãµes da instituiÃ§Ã£o
- Ajuste padrÃµes de extraÃ§Ã£o de PDF
- Modifique cores e mensagens

### Visual

- Edite `css/style.css` para alterar aparÃªncia
- As cores do IF Baiano estÃ£o nas variÃ¡veis CSS
- Design Ã© responsivo para mobile

## ï¿½ Gerenciamento de Arquivos

### Como Usar o Sistema de Arquivos

1. **Primeira ConfiguraÃ§Ã£o** (apenas uma vez):
   - VÃ¡ em "ðŸ“Š RelatÃ³rios"
   - Clique em "âš™ï¸ Configurar Pasta Principal"
   - Escolha onde salvar os arquivos (ex: `C:\Documentos\ControleMaterial\`)

2. **Upload AutomÃ¡tico**:
   - Cada PDF de empenho/nota fiscal Ã© salvo automaticamente
   - O sistema pergunta o ano fiscal se nÃ£o conseguir detectar
   - Arquivos sÃ£o organizados em `Empenhos/ANO/` e `NotasFiscais/ANO/`

3. **Acessar Arquivos**:
   - Use os botÃµes "ðŸ“ Abrir Pasta Empenhos" ou "ðŸ“„ Abrir Pasta Notas Fiscais"
   - Os arquivos estarÃ£o organizados por ano
   - Acesse os PDFs diretamente pelo explorador de arquivos

4. **EstatÃ­sticas**:
   - Clique em "ðŸ“Š EstatÃ­sticas" para ver resumo
   - Quantidade de arquivos por tipo e ano
   - LocalizaÃ§Ã£o da pasta principal

### ðŸ” Compatibilidade

- **âœ… Chrome 86+**: Suporte completo
- **âœ… Edge 88+**: Suporte completo
- **âš ï¸ Firefox**: Requer flag experimental habilitada
- **âš ï¸ Safari**: Suporte limitado
- **ðŸ”„ Fallback**: Sistema funciona sem File System Access API (arquivos ficam apenas no navegador)

## ï¿½ðŸ“Š RelatÃ³rios DisponÃ­veis

### Implementados

- âœ… **RelatÃ³rio de Empenhos**: Lista todos os empenhos cadastrados
- âœ… **RelatÃ³rio de Entregas**: HistÃ³rico de recebimentos
- âœ… **RelatÃ³rio de Notas Fiscais**: Lista de NFs cadastradas

### Em Desenvolvimento

- ðŸ”„ **RelatÃ³rio de ConferÃªncia**: Para envio ao fornecedor
- ðŸ”„ **RelatÃ³rio de DivergÃªncias**: Problemas encontrados
- ðŸ”„ **ExportaÃ§Ã£o PDF/CSV**: Download dos relatÃ³rios
- ðŸ”„ **Filtros AvanÃ§ados**: Busca por perÃ­odo, fornecedor, etc.

## ðŸš€ PrÃ³ximas AtualizaÃ§Ãµes

### VersÃ£o 1.1 (Planejada)

- ðŸ“ˆ RelatÃ³rios avanÃ§ados com grÃ¡ficos
- ðŸ“¤ ExportaÃ§Ã£o completa em PDF/CSV/Excel
- ðŸ” Busca avanÃ§ada e filtros
- ðŸ“Š Dashboard com indicadores

### VersÃ£o 1.2 (Planejada)

- ðŸ”’ Sistema de backup automÃ¡tico
- ðŸ“± Melhorias na interface mobile
- ðŸ”Œ IntegraÃ§Ã£o com APIs externas (CNPJ, CEP)
- ðŸ“§ GeraÃ§Ã£o de relatÃ³rios por email

---

**ðŸ’» Sistema desenvolvido para o IF Baiano**  
**ðŸŽ¯ Controle de Material v1.0**  
**ðŸ“… Outubro 2025**

### InÃ­cio RÃ¡pido - Checklist âœ…

- [ ] Abrir `teste.html` e executar todos os testes
- [ ] Verificar se todos os componentes estÃ£o âœ… (verde)
- [ ] Abrir `index.html` para acessar o sistema
- [ ] Cadastrar primeiro empenho com PDF
- [ ] Registrar primeira entrega
- [ ] **Testar os 3 mÃ©todos de entrada de nota fiscal:**
  - [ ] ðŸ“Ž Upload de PDF da nota fiscal
  - [ ] ðŸ”‘ Entrada por chave de acesso (44 dÃ­gitos)
  - [ ] ðŸ“± Leitura de cÃ³digo de barras com cÃ¢mera
- [ ] Gerar primeiro relatÃ³rio
- [ ] **ðŸŽ‰ Sistema funcionando perfeitamente!**

### ðŸŽ¯ MÃ©todos de Teste Recomendados

1. **Para PDF**: Use o arquivo de exemplo em `exemplos.json`
2. **Para Chave**: Use uma chave vÃ¡lida de NF-e real
3. **Para CÃ³digo de Barras**: Use a cÃ¢mera com boa iluminaÃ§Ã£o
4. **Verifique**: Se todos os dados sÃ£o extraÃ­dos corretamente
5. **Confirme**: Se divergÃªncias sÃ£o detectadas automaticamente
