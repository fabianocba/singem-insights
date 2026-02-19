# 🔐 Credenciais de Acesso - IFDESK

## Sistema de Autenticação

O IFDESK possui um sistema de autenticação em duas camadas para garantir segurança e permitir o primeiro acesso.

---

## 🔑 Credenciais Mestras (Primeiro Acesso)

### Quando usar?

- **Primeiro acesso ao sistema** (quando ainda não há usuários cadastrados)
- Instalação inicial
- Recuperação de acesso administrativo

### Credenciais Padrão:

```
👤 Usuário: ifdesk
🔑 Senha: admin@2025
```

### O que acontece ao usar as credenciais mestras?

1. ✅ Login é realizado com sucesso
2. 🔄 Sistema redireciona **automaticamente** para a tela de **Configurações**
3. 📋 Aba **"Usuários"** é aberta automaticamente
4. ⚠️ Alerta é exibido solicitando cadastro de usuário permanente
5. ✍️ Administrador deve cadastrar seu próprio usuário e senha

---

## 👥 Credenciais de Usuário (Uso Normal)

### Após o primeiro acesso:

1. Na tela de **Configurações** → Aba **Usuários**
2. Cadastre um novo usuário com:
   - Nome de usuário
   - Senha segura
   - Perfil (Administrador ou Usuário)
3. Faça logout
4. Entre com suas novas credenciais

### Perfis de Usuário:

- **👨‍💼 Administrador**: Acesso total ao sistema, incluindo configurações
- **👤 Usuário**: Acesso às funcionalidades operacionais (sem acesso a configurações)

---

## ⚠️ Recomendações de Segurança

### ❌ NÃO FAZER:

- Usar credenciais mestras para uso diário
- Compartilhar credenciais entre usuários
- Manter senhas fracas ou óbvias

### ✅ FAZER:

- Cadastrar usuário próprio imediatamente após primeiro acesso
- Usar senhas fortes (mínimo 6 caracteres, incluindo letras e números)
- Trocar senhas periodicamente
- Cada pessoa deve ter seu próprio usuário

---

## 🔄 Fluxo de Primeiro Acesso

```
1. Abrir IFDESK
   ↓
2. Tela de Login aparece
   ↓
3. Clicar em "💡 Primeiro acesso do administrador?"
   ↓
4. Ver credenciais mestras
   ↓
5. Login com: ifdesk / admin@2025
   ↓
6. Sistema abre Configurações → Usuários
   ↓
7. Cadastrar novo usuário administrativo
   ↓
8. Fazer logout
   ↓
9. Login com novas credenciais
   ↓
10. ✅ Sistema pronto para uso!
```

---

## 🆘 Problemas Comuns

### "Credenciais mestras não funcionam"

- Verifique se digitou corretamente: `ifdesk` e `admin@2025`
- Credenciais são **case-sensitive** (maiúsculas/minúsculas importam)

### "Esqueci minha senha de usuário"

- Use as credenciais mestras para acessar
- Vá em Configurações → Usuários
- Edite seu usuário e defina nova senha

### "Não consigo cadastrar usuário"

- Verifique se entrou com credenciais mestras (tem perfil admin)
- Verifique se preencheu todos os campos obrigatórios
- Senha deve ter no mínimo 6 caracteres

---

## 📝 Notas Técnicas

- Credenciais mestras são **hard-coded** no sistema (`app.js`)
- Usuários são armazenados no **IndexedDB** local
- Senhas são criptografadas antes do armazenamento
- Sistema é **100% offline** - dados permanecem no navegador

---

## 🔒 Política de Senha

Requisitos mínimos:

- ✅ Mínimo de 6 caracteres
- ✅ Recomendado: letras, números e caracteres especiais
- ✅ Não usar dados pessoais óbvios
- ✅ Trocar periodicamente (recomendado a cada 90 dias)

---

**Desenvolvido para IF Baiano - Campus**  
_Sistema de Controle de Material - IFDESK v1.2.2_
