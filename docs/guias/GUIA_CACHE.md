# 🔧 GUIA: Resolver Problema de Cache no IFDESK

## 🎯 Problema

O navegador está usando **versões antigas dos arquivos JavaScript em cache**, causando erro:

```
Cannot read properties of null (reading 'transaction')
```

## ✅ Solução Definitiva

### Passo 1: Parar o Servidor Atual

1. Vá no terminal onde o servidor está rodando
2. Pressione **CTRL + C** para parar

### Passo 2: Iniciar Servidor SEM Cache

Execute o novo script:

```powershell
.\iniciar-servidor-sem-cache.ps1
```

Este script inicia o servidor com a opção `-c-1` que **desabilita completamente o cache**.

### Passo 3: Limpar Cache do Navegador

#### Opção A - Hard Refresh (Rápido)

- Pressione **CTRL + SHIFT + R** (ou **CTRL + F5**)

#### Opção B - Limpar Cache Completo (Recomendado)

1. Pressione **CTRL + SHIFT + DELETE**
2. Selecione "Imagens e arquivos em cache"
3. Clique em "Limpar dados"

### Passo 4: Testar

1. Abra: http://localhost:8000/config/diagnostico-cache.html
2. Verifique se todos os testes passam ✅
3. Se sim, vá para: http://localhost:8000/config/configuracoes.html
4. Tente salvar a unidade gestora

---

## 🔍 Diagnóstico

Para verificar se o cache está desabilitado:

```
http://localhost:8000/config/diagnostico-cache.html
```

Deve mostrar:

- ✅ Cache desabilitado corretamente
- ✅ window.dbManager está disponível
- ✅ Versão: 20251105-002

---

## 📋 Opções do Servidor

### Servidor COM Cache (não use para desenvolvimento)

```powershell
.\iniciar-servidor.ps1
```

### Servidor SEM Cache (use para desenvolvimento)

```powershell
.\iniciar-servidor-sem-cache.ps1
```

A diferença é a flag `-c-1`:

- `-c-1` = Cache desabilitado (force revalidation)
- `-c 3600` = Cache de 1 hora (padrão)

---

## 🚨 Se o Problema Persistir

1. **Feche TODAS as abas do navegador** relacionadas ao localhost:8000
2. **Feche o navegador completamente**
3. **Reinicie o servidor** com `.\iniciar-servidor-sem-cache.ps1`
4. **Abra em modo privado** primeiro para testar
5. Se funcionar em modo privado, é definitivamente cache

---

## 💡 Dica

Sempre use o servidor **sem cache** durante desenvolvimento:

```powershell
.\iniciar-servidor-sem-cache.ps1
```

Isso evita precisar fazer CTRL+F5 toda vez que mudar o código!

---

## 📦 Versão Atual

- **Sistema**: IFDESK v1.2.7
- **Cache Version**: 20251105-002
- **Data**: 05/11/2025
