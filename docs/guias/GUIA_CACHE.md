# ðŸ”§ GUIA: Resolver Problema de Cache no SINGEM

## ðŸŽ¯ Problema

O navegador estÃ¡ usando **versÃµes antigas dos arquivos JavaScript em cache**, causando erro:

```
Cannot read properties of null (reading 'transaction')
```

## âœ… SoluÃ§Ã£o Definitiva

### Passo 1: Parar o Servidor Atual

1. VÃ¡ no terminal onde o servidor estÃ¡ rodando
2. Pressione **CTRL + C** para parar

### Passo 2: Iniciar Servidor SEM Cache

Execute o novo script:

```powershell
.\iniciar-servidor-sem-cache.ps1
```

Este script inicia o servidor com a opÃ§Ã£o `-c-1` que **desabilita completamente o cache**.

### Passo 3: Limpar Cache do Navegador

#### OpÃ§Ã£o A - Hard Refresh (RÃ¡pido)

- Pressione **CTRL + SHIFT + R** (ou **CTRL + F5**)

#### OpÃ§Ã£o B - Limpar Cache Completo (Recomendado)

1. Pressione **CTRL + SHIFT + DELETE**
2. Selecione "Imagens e arquivos em cache"
3. Clique em "Limpar dados"

### Passo 4: Testar

1. Abra: http://localhost:8000/config/diagnostico-cache.html
2. Verifique se todos os testes passam âœ…
3. Se sim, vÃ¡ para: http://localhost:8000/config/configuracoes.html
4. Tente salvar a unidade gestora

---

## ðŸ” DiagnÃ³stico

Para verificar se o cache estÃ¡ desabilitado:

```
http://localhost:8000/config/diagnostico-cache.html
```

Deve mostrar:

- âœ… Cache desabilitado corretamente
- âœ… window.dbManager estÃ¡ disponÃ­vel
- âœ… VersÃ£o: 20251105-002

---

## ðŸ“‹ OpÃ§Ãµes do Servidor

### Servidor COM Cache (nÃ£o use para desenvolvimento)

```powershell
.\iniciar-servidor.ps1
```

### Servidor SEM Cache (use para desenvolvimento)

```powershell
.\iniciar-servidor-sem-cache.ps1
```

A diferenÃ§a Ã© a flag `-c-1`:

- `-c-1` = Cache desabilitado (force revalidation)
- `-c 3600` = Cache de 1 hora (padrÃ£o)

---

## ðŸš¨ Se o Problema Persistir

1. **Feche TODAS as abas do navegador** relacionadas ao localhost:8000
2. **Feche o navegador completamente**
3. **Reinicie o servidor** com `.\iniciar-servidor-sem-cache.ps1`
4. **Abra em modo privado** primeiro para testar
5. Se funcionar em modo privado, Ã© definitivamente cache

---

## ðŸ’¡ Dica

Sempre use o servidor **sem cache** durante desenvolvimento:

```powershell
.\iniciar-servidor-sem-cache.ps1
```

Isso evita precisar fazer CTRL+F5 toda vez que mudar o cÃ³digo!

---

## ðŸ“¦ VersÃ£o Atual

- **Sistema**: SINGEM v1.2.7
- **Cache Version**: 20251105-002
- **Data**: 05/11/2025
