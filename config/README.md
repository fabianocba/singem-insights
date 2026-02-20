# âš™ï¸ ConfiguraÃ§Ãµes - SINGEM

Esta pasta contÃ©m arquivos de configuraÃ§Ã£o do sistema.

---

## ðŸ“„ Arquivos

### `configuracoes.html`

**DescriÃ§Ã£o:** Interface de configuraÃ§Ãµes do sistema  
**Acesso:**

- Pelo sistema: Clique no Ã­cone de engrenagem (âš™ï¸) no canto superior direito
- Direto: Abra este arquivo no navegador
- Via cÃ³digo: `window.open("config/configuracoes.html", "_blank")`

**Funcionalidades:**

- ðŸ¢ Unidade OrÃ§amentÃ¡ria (CNPJ, RazÃ£o Social)
- ðŸ‘¥ UsuÃ¡rios e AutenticaÃ§Ã£o
- ðŸŒ Rede/LAN (Compartilhamento)
- ðŸŽ¨ PreferÃªncias (Tema, TolerÃ¢ncias, Backup)

### `SINGEM.code-workspace`

**DescriÃ§Ã£o:** ConfiguraÃ§Ã£o do workspace do VS Code  
**Uso:** Abra este arquivo no VS Code para carregar o projeto com as configuraÃ§Ãµes ideais

**Funcionalidades:**

- ConfiguraÃ§Ãµes especÃ­ficas do projeto
- ExtensÃµes recomendadas
- FormataÃ§Ã£o automÃ¡tica
- Linting

---

## ðŸ” SeguranÃ§a

### Sistema de PermissÃµes

O mÃ³dulo de configuraÃ§Ãµes implementa controle de acesso:

- **Administrador:** Acesso total
- **UsuÃ¡rio comum:** Acesso restrito (apenas visualizaÃ§Ã£o de alguns mÃ³dulos)

### AutenticaÃ§Ã£o

- Senhas armazenadas com hash PBKDF2-SHA256
- ValidaÃ§Ã£o de CNPJ integrada
- UsuÃ¡rios vinculados Ã  unidade orÃ§amentÃ¡ria

---

## ðŸ“š DocumentaÃ§Ã£o

Para mais detalhes, consulte:

- `docs/CONFIGURACOES.md` - DocumentaÃ§Ã£o completa
- `docs/implementacao/RESTRICOES_SEGURANCA.md` - Sistema de permissÃµes
- `docs/implementacao/IMPLEMENTACAO_CONFIGURACOES.md` - Detalhes tÃ©cnicos

---

**Ãšltima atualizaÃ§Ã£o:** 03/11/2025  
**VersÃ£o:** 1.2.1

