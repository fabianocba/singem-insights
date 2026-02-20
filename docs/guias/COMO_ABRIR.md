# ðŸš€ Como Abrir a AplicaÃ§Ã£o SINGEM

## MÃ©todo 1: Atalho RÃ¡pido (RECOMENDADO) âœ…

### Windows - Arquivo BAT

**Duplo-clique em:** `ABRIR_APLICACAO.bat`

Isso irÃ¡:

1. âœ… Verificar se o servidor estÃ¡ rodando
2. âœ… Abrir o navegador automaticamente
3. âœ… Mostrar a URL para copiar se necessÃ¡rio

### Windows - PowerShell

**Clique-direito em:** `ABRIR_APLICACAO.ps1` â†’ "Executar com PowerShell"

---

## MÃ©todo 2: Via VS Code (AutomÃ¡tico)

1. Abra a pasta `D:\SINGEM` no VS Code
2. Permita a execuÃ§Ã£o da task automÃ¡tica quando solicitado
3. O servidor inicia automaticamente
4. O navegador abre sozinho em http://localhost:8000/index.html

**Se o navegador NÃƒO abrir automaticamente:**

- Veja a URL no terminal do VS Code
- Pressione `Ctrl + Clique` na URL
- Ou execute `ABRIR_APLICACAO.bat`

---

## MÃ©todo 3: Manual

### 1. Iniciar Servidor (se ainda nÃ£o estÃ¡ rodando)

```powershell
python -m http.server 8000
```

### 2. Abrir Navegador

Acesse: http://localhost:8000/index.html

Ou execute no terminal:

```powershell
start http://localhost:8000/index.html
```

---

## MÃ©todo 4: URL Direta no Navegador

Se o servidor JÃ estÃ¡ rodando, simplesmente abra seu navegador e acesse:

```
http://localhost:8000/index.html
```

---

## ðŸ› SoluÃ§Ã£o de Problemas

### Problema: "Servidor NAO esta rodando"

**SoluÃ§Ã£o:**

```powershell
# Verifique se Python estÃ¡ instalado
python --version

# Inicie o servidor manualmente
cd D:\SINGEM
python -m http.server 8000
```

### Problema: "Porta 8000 jÃ¡ estÃ¡ em uso"

**SoluÃ§Ã£o:**

```powershell
# Use outra porta
python -m http.server 8080

# Depois acesse: http://localhost:8080/index.html
```

### Problema: Navegador nÃ£o abre automaticamente

**SoluÃ§Ã£o 1:** Use o atalho `ABRIR_APLICACAO.bat`

**SoluÃ§Ã£o 2:** Abra manualmente:

1. Abra seu navegador (Chrome, Edge, Firefox)
2. Digite na barra de endereÃ§os: `http://localhost:8000/index.html`
3. Pressione Enter

**SoluÃ§Ã£o 3:** Terminal do VS Code

- Veja o terminal do VS Code
- Pressione `Ctrl + Clique` na URL mostrada

---

## ðŸ“‹ Checklist RÃ¡pido

- [ ] Servidor estÃ¡ rodando? (execute `ABRIR_APLICACAO.bat` para verificar)
- [ ] Python estÃ¡ instalado? (execute `python --version`)
- [ ] Porta 8000 estÃ¡ livre? (tente acessar http://localhost:8000)
- [ ] Navegador padrÃ£o configurado? (tente abrir qualquer link)

---

## ðŸŽ¯ RecomendaÃ§Ã£o Final

**Forma mais fÃ¡cil de usar:**

1. **Sempre que for usar o SINGEM:**
   - Duplo-clique em `ABRIR_APLICACAO.bat`
2. **Se o servidor nÃ£o estiver rodando:**
   - Abra a pasta no VS Code (inicia automaticamente)
   - Ou execute: `python -m http.server 8000` em um terminal

3. **Crie um atalho na Ã¡rea de trabalho:**
   - Clique-direito em `ABRIR_APLICACAO.bat`
   - "Enviar para" â†’ "Ãrea de trabalho (criar atalho)"
   - Renomeie para "ðŸš€ Abrir SINGEM"

---

## ðŸ’¡ Dicas Extras

### Adicionar aos Favoritos do Navegador

Depois de abrir pela primeira vez, adicione aos favoritos:

- `Ctrl + D` (Chrome/Edge)
- Nomeie como "SINGEM - Sistema de Material"

### Fixar Aba no Navegador

- Clique-direito na aba
- "Fixar aba"
- A aba fica sempre aberta

### Criar Task no Agendador do Windows

Para abrir automaticamente ao ligar o PC:

1. Pesquise "Agendador de Tarefas"
2. Criar Tarefa BÃ¡sica
3. Ao fazer logon
4. Executar programa: `D:\SINGEM\ABRIR_APLICACAO.bat`

---

**Precisa de ajuda?** Veja os logs no terminal ou console do navegador (F12).

