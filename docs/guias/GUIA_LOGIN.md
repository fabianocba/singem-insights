# ðŸš€ GUIA RÃPIDO - LOGIN NO SINGEM

**VersÃ£o:** 1.3.2  
**Atualizado em:** 05/11/2025

---

## ðŸŽ¯ COMO FAZER LOGIN

### **PRIMEIRO ACESSO** (Administrador)

1. **Abra a aplicaÃ§Ã£o:**
   - Duplo-clique em `ABRIR_APLICACAO.bat`
   - Ou execute: `.\ABRIR_APLICACAO.ps1`

2. **Use as credenciais mestras:**

   ```
   ðŸ‘¤ UsuÃ¡rio: singem
   ðŸ”‘ Senha: admin@2025
   ```

3. **Sistema irÃ¡ redirecionar vocÃª automaticamente** para cadastro de usuÃ¡rio

4. **Cadastre seu usuÃ¡rio pessoal:**
   - Nome: Seu nome completo
   - Login: Escolha um nome de usuÃ¡rio (ex: `joao.silva`)
   - Senha: MÃ­nimo 6 caracteres (use letras e nÃºmeros)
   - Perfil: Selecione **Administrador**
   - Clique em **Adicionar UsuÃ¡rio**

5. **FaÃ§a LOGOUT** (botÃ£o ðŸšª Sair no canto superior direito)

6. **FaÃ§a LOGIN com seu novo usuÃ¡rio**

---

### **ACESSO NORMAL** (ApÃ³s cadastro)

1. **Abra a aplicaÃ§Ã£o**

2. **Digite suas credenciais:**
   - UsuÃ¡rio: O login que vocÃª cadastrou
   - Senha: A senha que vocÃª definiu

3. **Clique em ðŸ” Entrar**

4. **Pronto!** VocÃª serÃ¡ redirecionado para a tela principal

---

## âœ… INDICADORES VISUAIS

### **Durante o Login:**

```
ðŸ” Entrar  â†’  ðŸ”„ Autenticando...  â†’  âœ… Logado!
```

### **ApÃ³s Login Bem-Sucedido:**

Aparece uma mensagem no canto superior direito:

```
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
â”‚ âœ… Bem-vindo(a), Seu Nome!       â”‚
â”‚ Login realizado com sucesso      â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### **Se Houver Erro:**

- Campo de erro aparece em vermelho
- Mensagem: "UsuÃ¡rio ou senha invÃ¡lidos"
- BotÃ£o volta ao estado normal
- VocÃª pode tentar novamente

---

## âŒ PROBLEMAS COMUNS

### **1. "UsuÃ¡rio ou senha invÃ¡lidos"**

**Causas:**

- Login digitado errado
- Senha digitada errada
- UsuÃ¡rio nÃ£o existe
- UsuÃ¡rio estÃ¡ inativo

**SoluÃ§Ã£o:**

- Verifique se digitou corretamente
- Caps Lock estÃ¡ desligado?
- Use credenciais mestras se esqueceu a senha

---

### **2. Esqueci minha senha**

**SoluÃ§Ã£o:**

1. FaÃ§a login com credenciais mestras:
   - UsuÃ¡rio: `singem`
   - Senha: `admin@2025`

2. VÃ¡ em: **ConfiguraÃ§Ãµes** â†’ **UsuÃ¡rios**

3. Clique em **âœï¸ Editar** no seu usuÃ¡rio

4. Digite uma **nova senha**

5. Clique em **Salvar**

6. FaÃ§a **logout** e login com a nova senha

---

### **3. NÃ£o consigo fazer login de jeito nenhum**

**DiagnÃ³stico:**

1. Abra o navegador e pressione **F12** (abre console)

2. Tente fazer login novamente

3. Veja os logs no console:

   ```
   ðŸ” Tentando autenticar: seu_usuario
   ðŸ‘¥ UsuÃ¡rios no banco: 0  â† PROBLEMA AQUI!
   ```

4. Se aparecer `UsuÃ¡rios no banco: 0`, significa que nÃ£o hÃ¡ usuÃ¡rios cadastrados

**SoluÃ§Ã£o:**

- Use credenciais mestras
- Cadastre um novo usuÃ¡rio
- Tente novamente

---

### **4. Tela de login nÃ£o carrega**

**SoluÃ§Ã£o:**

1. **Limpe o cache:**
   - Pressione: **Ctrl + Shift + R**
   - Ou execute: `.\REINICIAR_SEM_CACHE.ps1`

2. **Verifique o servidor:**
   - Deve estar rodando na porta 8000
   - Execute: `python -m http.server 8000`

3. **Abra o console (F12)** e veja se hÃ¡ erros

---

## ðŸ” SEGURANÃ‡A

### **Sua senha Ã© segura!**

- âœ… Armazenada com hash PBKDF2
- âœ… 100.000 iteraÃ§Ãµes SHA-256
- âœ… Salt aleatÃ³rio Ãºnico
- âœ… ImpossÃ­vel recuperar senha original
- âœ… Mesmo administradores nÃ£o veem sua senha

### **Dicas de Senha Forte:**

```
âŒ FRACA:    123456
âŒ FRACA:    senha
âŒ FRACA:    ifbaiano

âœ… MÃ‰DIA:    senha123
âœ… FORTE:    Senh@123
âœ… MUITO FORTE: MinhaSenha@2025!
```

**RecomendaÃ§Ãµes:**

- MÃ­nimo 8 caracteres
- Use letras maiÃºsculas e minÃºsculas
- Adicione nÃºmeros
- Use caracteres especiais (@, !, #, $)

---

## ðŸ“± ATALHOS ÃšTEIS

| AÃ§Ã£o          | Atalho                                    |
| --------------- | ----------------------------------------- |
| Login           | `Enter` no campo de senha                 |
| Logout          | BotÃ£o ðŸšª Sair (canto superior direito) |
| Limpar cache    | `Ctrl + Shift + R`                        |
| Console         | `F12`                                     |
| Voltar ao login | FaÃ§a logout                              |

---

## ðŸ†˜ PRECISA DE AJUDA?

### **OpÃ§Ã£o 1: DiagnÃ³stico AutomÃ¡tico**

Abra no navegador:

```
http://localhost:8000/verificar-db.html
```

Esta pÃ¡gina mostra:

- âœ… Status do banco de dados
- âœ… Unidade orÃ§amentÃ¡ria cadastrada
- âœ… UsuÃ¡rios cadastrados
- âœ… InformaÃ§Ãµes de debug

### **OpÃ§Ã£o 2: Console do Navegador**

1. Pressione `F12`
2. VÃ¡ na aba "Console"
3. Veja os logs coloridos
4. Identifique o problema

### **OpÃ§Ã£o 3: Contate o Suporte**

Tire um print do console (F12) e envie para o suporte tÃ©cnico.

---

## ðŸŽ“ VÃDEO TUTORIAL

_[EM BREVE]_

Enquanto isso, siga este guia passo a passo!

---

## âœ… CHECKLIST DE PRIMEIRO ACESSO

- [ ] Abri a aplicaÃ§Ã£o com `ABRIR_APLICACAO.bat`
- [ ] Fiz login com `singem` / `admin@2025`
- [ ] Cadastrei meu usuÃ¡rio pessoal
- [ ] Defini uma senha forte
- [ ] Anotei minhas credenciais em local seguro
- [ ] Fiz logout
- [ ] Fiz login com meu novo usuÃ¡rio
- [ ] Sistema funcionando! âœ…

---

**Desenvolvido para IF Baiano - Campus**  
**Sistema SINGEM - Controle de Material**  
**VersÃ£o 1.3.2 - Novembro 2025**
