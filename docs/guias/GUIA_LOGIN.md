# 🚀 GUIA RÁPIDO - LOGIN NO SINGEM

**Versão:** 1.3.2  
**Atualizado em:** 05/11/2025

---

## 🎯 COMO FAZER LOGIN

### **PRIMEIRO ACESSO** (Administrador)

1. **Abra a aplicação:**
   - Duplo-clique em `ABRIR_APLICACAO.bat`
   - Ou execute: `.\ABRIR_APLICACAO.ps1`

2. **Use as credenciais mestras:**

   ```
   👤 Usuário: singem
   🔑 Senha: admin@2025
   ```

3. **Sistema irá redirecionar você automaticamente** para cadastro de usuário

4. **Cadastre seu usuário pessoal:**
   - Nome: Seu nome completo
   - Login: Escolha um nome de usuário (ex: `joao.silva`)
   - Senha: Mínimo 6 caracteres (use letras e números)
   - Perfil: Selecione **Administrador**
   - Clique em **Adicionar Usuário**

5. **Faça LOGOUT** (botão 🚪 Sair no canto superior direito)

6. **Faça LOGIN com seu novo usuário**

---

### **ACESSO NORMAL** (Após cadastro)

1. **Abra a aplicação**

2. **Digite suas credenciais:**
   - Usuário: O login que você cadastrou
   - Senha: A senha que você definiu

3. **Clique em 🔐 Entrar**

4. **Pronto!** Você será redirecionado para a tela principal

---

## ✅ INDICADORES VISUAIS

### **Durante o Login:**

```
🔐 Entrar  →  🔄 Autenticando...  →  ✅ Logado!
```

### **Após Login Bem-Sucedido:**

Aparece uma mensagem no canto superior direito:

```
┌──────────────────────────────────┐
│ ✅ Bem-vindo(a), Seu Nome!       │
│ Login realizado com sucesso      │
└──────────────────────────────────┘
```

### **Se Houver Erro:**

- Campo de erro aparece em vermelho
- Mensagem: "Usuário ou senha inválidos"
- Botão volta ao estado normal
- Você pode tentar novamente

---

## ❌ PROBLEMAS COMUNS

### **1. "Usuário ou senha inválidos"**

**Causas:**

- Login digitado errado
- Senha digitada errada
- Usuário não existe
- Usuário está inativo

**Solução:**

- Verifique se digitou corretamente
- Caps Lock está desligado?
- Use credenciais mestras se esqueceu a senha

---

### **2. Esqueci minha senha**

**Solução:**

1. Faça login com credenciais mestras:
   - Usuário: `singem`
   - Senha: `admin@2025`

2. Vá em: **Configurações** → **Usuários**

3. Clique em **✏️ Editar** no seu usuário

4. Digite uma **nova senha**

5. Clique em **Salvar**

6. Faça **logout** e login com a nova senha

---

### **3. Não consigo fazer login de jeito nenhum**

**Diagnóstico:**

1. Abra o navegador e pressione **F12** (abre console)

2. Tente fazer login novamente

3. Veja os logs no console:

   ```
   🔐 Tentando autenticar: seu_usuario
   👥 Usuários no banco: 0  ← PROBLEMA AQUI!
   ```

4. Se aparecer `Usuários no banco: 0`, significa que não há usuários cadastrados

**Solução:**

- Use credenciais mestras
- Cadastre um novo usuário
- Tente novamente

---

### **4. Tela de login não carrega**

**Solução:**

1. **Limpe o cache:**
   - Pressione: **Ctrl + Shift + R**
   - Ou execute: `.\REINICIAR_SEM_CACHE.ps1`

2. **Verifique o servidor:**
   - Deve estar rodando na porta 8000
   - Execute: `pwsh -File .\scripts\start.ps1 -ProjectRoot .`

3. **Abra o console (F12)** e veja se há erros

---

## 🔐 SEGURANÇA

### **Sua senha é segura!**

- ✅ Armazenada com hash PBKDF2
- ✅ 100.000 iterações SHA-256
- ✅ Salt aleatório único
- ✅ Impossível recuperar senha original
- ✅ Mesmo administradores não veem sua senha

### **Dicas de Senha Forte:**

```
❌ FRACA:    123456
❌ FRACA:    senha
❌ FRACA:    ifbaiano

✅ MÉDIA:    senha123
✅ FORTE:    Senh@123
✅ MUITO FORTE: MinhaSenha@2025!
```

**Recomendações:**

- Mínimo 8 caracteres
- Use letras maiúsculas e minúsculas
- Adicione números
- Use caracteres especiais (@, !, #, $)

---

## 📱 ATALHOS ÚTEIS

| Ação            | Atalho                                 |
| --------------- | -------------------------------------- |
| Login           | `Enter` no campo de senha              |
| Logout          | Botão 🚪 Sair (canto superior direito) |
| Limpar cache    | `Ctrl + Shift + R`                     |
| Console         | `F12`                                  |
| Voltar ao login | Faça logout                            |

---

## 🆘 PRECISA DE AJUDA?

### **Opção 1: Diagnóstico Automático**

Abra no navegador:

```
http://localhost:8000/verificar-db.html
```

Esta página mostra:

- ✅ Status do banco de dados
- ✅ Unidade orçamentária cadastrada
- ✅ Usuários cadastrados
- ✅ Informações de debug

### **Opção 2: Console do Navegador**

1. Pressione `F12`
2. Vá na aba "Console"
3. Veja os logs coloridos
4. Identifique o problema

### **Opção 3: Contate o Suporte**

Tire um print do console (F12) e envie para o suporte técnico.

---

## 🎓 VÍDEO TUTORIAL

_[EM BREVE]_

Enquanto isso, siga este guia passo a passo!

---

## ✅ CHECKLIST DE PRIMEIRO ACESSO

- [ ] Abri a aplicação com `ABRIR_APLICACAO.bat`
- [ ] Fiz login com `singem` / `admin@2025`
- [ ] Cadastrei meu usuário pessoal
- [ ] Defini uma senha forte
- [ ] Anotei minhas credenciais em local seguro
- [ ] Fiz logout
- [ ] Fiz login com meu novo usuário
- [ ] Sistema funcionando! ✅

---

**Desenvolvido para IF Baiano - Campus**  
**Sistema SINGEM - Controle de Material**  
**Versão 1.3.2 - Novembro 2025**
