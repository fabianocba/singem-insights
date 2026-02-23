# ðŸ” Credenciais de Acesso - SINGEM

## Sistema de AutenticaÃ§Ã£o

O SINGEM possui um sistema de autenticaÃ§Ã£o em duas camadas para garantir seguranÃ§a e permitir o primeiro acesso.

---

## ðŸ”‘ Credenciais Mestras (Primeiro Acesso)

### Quando usar?

- **Primeiro acesso ao sistema** (quando ainda nÃ£o hÃ¡ usuÃ¡rios cadastrados)
- InstalaÃ§Ã£o inicial
- RecuperaÃ§Ã£o de acesso administrativo

### Credenciais PadrÃ£o:

```
ðŸ‘¤ UsuÃ¡rio: singem
ðŸ”‘ Senha: admin@2025
```

### O que acontece ao usar as credenciais mestras?

1. âœ… Login Ã© realizado com sucesso
2. ðŸ”„ Sistema redireciona **automaticamente** para a tela de **ConfiguraÃ§Ãµes**
3. ðŸ“‹ Aba **"UsuÃ¡rios"** Ã© aberta automaticamente
4. âš ï¸ Alerta Ã© exibido solicitando cadastro de usuÃ¡rio permanente
5. âœï¸ Administrador deve cadastrar seu prÃ³prio usuÃ¡rio e senha

---

## ðŸ‘¥ Credenciais de UsuÃ¡rio (Uso Normal)

### ApÃ³s o primeiro acesso:

1. Na tela de **ConfiguraÃ§Ãµes** â†’ Aba **UsuÃ¡rios**
2. Cadastre um novo usuÃ¡rio com:
   - Nome de usuÃ¡rio
   - Senha segura
   - Perfil (Administrador ou UsuÃ¡rio)
3. FaÃ§a logout
4. Entre com suas novas credenciais

### Perfis de UsuÃ¡rio:

- **ðŸ‘¨â€ðŸ’¼ Administrador**: Acesso total ao sistema, incluindo configuraÃ§Ãµes
- **ðŸ‘¤ UsuÃ¡rio**: Acesso Ã s funcionalidades operacionais (sem acesso a configuraÃ§Ãµes)

---

## âš ï¸ RecomendaÃ§Ãµes de SeguranÃ§a

### âŒ NÃƒO FAZER:

- Usar credenciais mestras para uso diÃ¡rio
- Compartilhar credenciais entre usuÃ¡rios
- Manter senhas fracas ou Ã³bvias

### âœ… FAZER:

- Cadastrar usuÃ¡rio prÃ³prio imediatamente apÃ³s primeiro acesso
- Usar senhas fortes (mÃ­nimo 6 caracteres, incluindo letras e nÃºmeros)
- Trocar senhas periodicamente
- Cada pessoa deve ter seu prÃ³prio usuÃ¡rio

---

## ðŸ”„ Fluxo de Primeiro Acesso

```
1. Abrir SINGEM
   â†“
2. Tela de Login aparece
   â†“
3. Clicar em "ðŸ’¡ Primeiro acesso do administrador?"
   â†“
4. Ver credenciais mestras
   â†“
5. Login com: singem / admin@2025
   â†“
6. Sistema abre ConfiguraÃ§Ãµes â†’ UsuÃ¡rios
   â†“
7. Cadastrar novo usuÃ¡rio administrativo
   â†“
8. Fazer logout
   â†“
9. Login com novas credenciais
   â†“
10. âœ… Sistema pronto para uso!
```

---

## ðŸ†˜ Problemas Comuns

### "Credenciais mestras nÃ£o funcionam"

- Verifique se digitou corretamente: `singem` e `admin@2025`
- Credenciais sÃ£o **case-sensitive** (maiÃºsculas/minÃºsculas importam)

### "Esqueci minha senha de usuÃ¡rio"

- Use as credenciais mestras para acessar
- VÃ¡ em ConfiguraÃ§Ãµes â†’ UsuÃ¡rios
- Edite seu usuÃ¡rio e defina nova senha

### "NÃ£o consigo cadastrar usuÃ¡rio"

- Verifique se entrou com credenciais mestras (tem perfil admin)
- Verifique se preencheu todos os campos obrigatÃ³rios
- Senha deve ter no mÃ­nimo 6 caracteres

---

## ðŸ“ Notas TÃ©cnicas

- Credenciais mestras sÃ£o **hard-coded** no sistema (`app.js`)
- UsuÃ¡rios sÃ£o armazenados no **IndexedDB** local
- Senhas sÃ£o criptografadas antes do armazenamento
- Sistema Ã© **100% offline** - dados permanecem no navegador

---

## ðŸ”’ PolÃ­tica de Senha

Requisitos mÃ­nimos:

- âœ… MÃ­nimo de 6 caracteres
- âœ… Recomendado: letras, nÃºmeros e caracteres especiais
- âœ… NÃ£o usar dados pessoais Ã³bvios
- âœ… Trocar periodicamente (recomendado a cada 90 dias)

---

**Desenvolvido para IF Baiano - Campus**  
_Sistema de Controle de Material - SINGEM v1.2.2_
