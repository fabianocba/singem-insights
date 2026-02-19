# 🔄 Sistema de Controle de Cache - IFDESK

## 📋 Visão Geral

O IFDESK implementa um **sistema robusto de controle de cache** que garante que os usuários sempre tenham a versão mais recente da aplicação, sem precisar limpar cache manualmente.

---

## 🎯 Componentes do Sistema

### 1. **Meta Tags HTTP** (Todos os HTMLs)

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

**O que faz:** Instrui o navegador a **não armazenar cache** das páginas HTML.

**Arquivos afetados:**

- `index.html`
- `config/configuracoes.html`
- `consultas/index.html`

---

### 2. **Service Worker** (`sw.js`)

**Estratégia:** Network First (Cache como fallback)

**Como funciona:**

1. Sempre tenta buscar da **rede primeiro**
2. Se conseguir, atualiza o cache com a versão mais recente
3. Se a rede falhar (offline), usa a versão em cache
4. Limpa caches antigos automaticamente quando há atualização

**Vantagens:**

- ✅ Usuário sempre tem a versão mais recente quando online
- ✅ Aplicação funciona offline se já foi carregada antes
- ✅ Caches antigos são removidos automaticamente

**Registro:**

```javascript
// Registrado automaticamente pelo versionManager.js
navigator.serviceWorker.register('/sw.js', {
  scope: '/',
  updateViaCache: 'none'
});
```

---

### 3. **Version Manager** (`js/versionManager.js`)

**Responsabilidades:**

- Gerencia versão atual da aplicação
- Registra e monitora Service Worker
- Detecta quando há uma nova versão
- Notifica usuário sobre atualizações disponíveis
- Limpa cache quando necessário

**Versão Atual:**

```javascript
this.currentVersion = '1.2.7-20251105';
this.buildTimestamp = '2025-11-05T17:00:00Z';
```

**Detecção de Atualização:**

- Compara versão armazenada no `localStorage` com a versão atual
- Se diferente, limpa cache e notifica usuário
- Verifica a cada 5 minutos

**Notificação ao Usuário:**

```
╔═══════════════════════════════════════╗
║  🎉 Nova versão disponível!           ║
║  Atualizado de 1.2.6 para 1.2.7       ║
║  [🔄 Recarregar Agora] [Depois]       ║
╚═══════════════════════════════════════╝
```

---

### 4. **Cache Buster** (`js/cacheBuster.js`)

**O que faz:** Adiciona query strings com versão e timestamp a URLs de assets.

**Exemplo:**

```javascript
// Antes
<script src="js/app.js"></script>

// Depois (automático)
<script src="js/app.js?v=1.2.7-20251105&t=1730826000000"></script>
```

**Métodos:**

```javascript
// Carregar script com cache-busting
window.cacheBuster.loadScript('js/meu-script.js');

// Carregar CSS com cache-busting
window.cacheBuster.loadCSS('css/meu-estilo.css');

// Adicionar cache-busting a qualquer URL
const url = window.cacheBuster.addCacheBusting('/api/data');
```

---

## 🔧 Como Funciona na Prática

### Cenário 1: Primeira Visita

1. Usuário acessa pela primeira vez
2. Service Worker é registrado
3. Assets são baixados da rede
4. Cache é populado para uso offline
5. Versão é armazenada no localStorage

### Cenário 2: Visita Subsequente (Mesma Versão)

1. Service Worker intercepta requisições
2. Busca da rede primeiro
3. Se conseguir, atualiza cache
4. Se falhar (offline), usa cache
5. Usuário vê conteúdo mais recente

### Cenário 3: Nova Versão Disponível

1. Usuário acessa a aplicação
2. VersionManager detecta versão diferente
3. Cache do Service Worker é limpo
4. Notificação aparece na tela
5. Usuário clica "Recarregar Agora"
6. Página é recarregada com nova versão

### Cenário 4: Atualização do Service Worker

1. Nova versão do SW é detectada
2. Service Worker entra em estado "waiting"
3. Notificação aparece: "Nova versão disponível"
4. Usuário clica "Atualizar Agora"
5. Novo SW é ativado
6. Página recarrega automaticamente

---

## 📦 Como Atualizar a Versão

### Passo 1: Atualizar Número de Versão

Edite `js/versionManager.js`:

```javascript
class VersionManager {
  constructor() {
    this.currentVersion = '1.2.8-20251106'; // ← ATUALIZE AQUI
    this.buildTimestamp = '2025-11-06T10:00:00Z'; // ← ATUALIZE AQUI
    // ...
  }
}
```

### Passo 2: Atualizar Service Worker

Edite `sw.js`:

```javascript
const CACHE_VERSION = 'ifdesk-v1.2.8-20251106'; // ← ATUALIZE AQUI
```

### Passo 3: Atualizar Cache Buster (opcional)

Edite `js/cacheBuster.js`:

```javascript
class CacheBuster {
  constructor() {
    this.version = '1.2.8-20251106'; // ← ATUALIZE AQUI
    // ...
  }
}
```

### Passo 4: Testar

1. Limpe cache do navegador (CTRL+SHIFT+DELETE)
2. Acesse a aplicação
3. Verifique no console:
   ```
   📦 IFDESK v1.2.8-20251106 (2025-11-06T10:00:00Z)
   ```

---

## 🧪 Testes

### Teste 1: Verificar Versão

```javascript
console.log(window.versionManager.getVersionInfo());
```

**Saída esperada:**

```json
{
  "version": "1.2.7-20251105",
  "build": "2025-11-05T17:00:00Z",
  "userAgent": "Mozilla/5.0...",
  "serviceWorker": true,
  "indexedDB": true
}
```

### Teste 2: Forçar Limpeza de Cache

```javascript
// Limpar cache do Service Worker
window.versionManager.clearServiceWorkerCache();

// Recarregar aplicação
window.versionManager.reloadApp();
```

### Teste 3: Simular Nova Versão

1. Abra DevTools → Application → Storage → Local Storage
2. Altere o valor de `ifdesk_version` para `1.2.6`
3. Recarregue a página
4. Deve aparecer notificação de atualização

---

## 🔍 Diagnóstico de Problemas

### Problema: Cache não está sendo limpo

**Solução:**

1. Verifique se Service Worker está registrado:

   ```javascript
   navigator.serviceWorker.getRegistrations().then((regs) => console.log('SW registrados:', regs));
   ```

2. Force limpeza manual:

   ```javascript
   caches.keys().then((names) => {
     names.forEach((name) => caches.delete(name));
   });
   ```

3. Desregistre Service Worker:
   ```javascript
   navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
   ```

### Problema: Versão não está atualizando

**Solução:**

1. Verifique localStorage:

   ```javascript
   console.log(localStorage.getItem('ifdesk_version'));
   ```

2. Force atualização:
   ```javascript
   localStorage.setItem('ifdesk_version', '0.0.0');
   location.reload();
   ```

### Problema: Service Worker não está carregando

**Verificar:**

1. HTTPS ou localhost (Service Worker só funciona nesses contextos)
2. Arquivo `sw.js` existe na raiz do projeto
3. Sem erros de sintaxe no `sw.js`

**Console:**

```javascript
navigator.serviceWorker.ready
  .then((reg) => console.log('SW pronto:', reg))
  .catch((err) => console.error('SW erro:', err));
```

---

## 📊 Monitoramento

### DevTools → Application → Service Workers

- Status: ✅ Activated and running
- Source: `/sw.js`
- Scope: `/`

### DevTools → Application → Cache Storage

- Deve ter: `ifdesk-v1.2.7-20251105-cache`
- Conteúdo: Arquivos HTML, JS, CSS

### DevTools → Console

```
📦 IFDESK v1.2.7-20251105 (2025-11-05T17:00:00Z)
✅ Service Worker registrado
✅ VersionManager carregado
✅ CacheBuster carregado
```

---

## 🚀 Melhores Práticas

1. **Sempre atualize a versão** ao fazer mudanças importantes
2. **Use semver** para versionamento (MAJOR.MINOR.PATCH)
3. **Teste em modo privado** antes de publicar
4. **Monitore Service Worker** no DevTools
5. **Mantenha changelog** das versões

---

## 📝 Changelog

### v1.2.7-20251105

- ✅ Implementado sistema de controle de cache
- ✅ Service Worker com estratégia network-first
- ✅ Version Manager com detecção automática de atualizações
- ✅ Meta tags HTTP para desabilitar cache de HTML
- ✅ Notificações de atualização para usuário

---

## 🔗 Referências

- [MDN - Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN - Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Web.dev - Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
- [HTTP Caching - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

---

## ✅ Checklist de Deploy

Antes de fazer deploy de uma nova versão:

- [ ] Atualizar `versionManager.js` (currentVersion e buildTimestamp)
- [ ] Atualizar `sw.js` (CACHE_VERSION)
- [ ] Atualizar `cacheBuster.js` (version)
- [ ] Testar em modo privado
- [ ] Verificar console sem erros
- [ ] Verificar Service Worker registrado
- [ ] Testar detecção de atualização
- [ ] Atualizar documentação (este arquivo)
- [ ] Commit com mensagem descritiva
- [ ] Tag da versão no git

---

**Última atualização:** 05/11/2025  
**Versão do documento:** 1.0
