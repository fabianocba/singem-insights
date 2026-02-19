# ⚙️ Configurações - IFDESK

Esta pasta contém arquivos de configuração do sistema.

---

## 📄 Arquivos

### `configuracoes.html`

**Descrição:** Interface de configurações do sistema  
**Acesso:**

- Pelo sistema: Clique no ícone de engrenagem (⚙️) no canto superior direito
- Direto: Abra este arquivo no navegador
- Via código: `window.open("config/configuracoes.html", "_blank")`

**Funcionalidades:**

- 🏢 Unidade Orçamentária (CNPJ, Razão Social)
- 👥 Usuários e Autenticação
- 🌐 Rede/LAN (Compartilhamento)
- 🎨 Preferências (Tema, Tolerâncias, Backup)

### `IFDESK.code-workspace`

**Descrição:** Configuração do workspace do VS Code  
**Uso:** Abra este arquivo no VS Code para carregar o projeto com as configurações ideais

**Funcionalidades:**

- Configurações específicas do projeto
- Extensões recomendadas
- Formatação automática
- Linting

---

## 🔐 Segurança

### Sistema de Permissões

O módulo de configurações implementa controle de acesso:

- **Administrador:** Acesso total
- **Usuário comum:** Acesso restrito (apenas visualização de alguns módulos)

### Autenticação

- Senhas armazenadas com hash PBKDF2-SHA256
- Validação de CNPJ integrada
- Usuários vinculados à unidade orçamentária

---

## 📚 Documentação

Para mais detalhes, consulte:

- `docs/CONFIGURACOES.md` - Documentação completa
- `docs/implementacao/RESTRICOES_SEGURANCA.md` - Sistema de permissões
- `docs/implementacao/IMPLEMENTACAO_CONFIGURACOES.md` - Detalhes técnicos

---

**Última atualização:** 03/11/2025  
**Versão:** 1.2.1
