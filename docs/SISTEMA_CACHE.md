# ðŸ”„ Sistema de Controle de Cache - SINGEM

## ðŸ“‹ VisÃ£o Geral

O SINGEM implementa um **sistema robusto de controle de cache** que garante que os usuÃ¡rios sempre tenham a versÃ£o mais recente da aplicaÃ§Ã£o, sem precisar limpar cache manualmente.

---

## ðŸŽ¯ Componentes do Sistema

### 1. **Meta Tags HTTP** (Todos os HTMLs)

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
<meta http-equiv="Pragma" content="no-cache" />
<meta http-equiv="Expires" content="0" />
```

**O que faz:** Instrui o navegador a **nÃ£o armazenar cache** das pÃ¡ginas HTML.

**Arquivos afetados:**

- `index.html`
- `config/configuracoes.html`
- `consultas/index.html`

---

### 2. **Service Worker** (`sw.js`)

**EstratÃ©gia:** Network First (Cache como fallback)

**Como funciona:**

1. Sempre tenta buscar da **rede primeiro**
2. Se conseguir, atualiza o cache com a versÃ£o mais recente
3. Se a rede falhar (offline), usa a versÃ£o em cache
4. Limpa caches antigos automaticamente quando hÃ¡ atualizaÃ§Ã£o

**Vantagens:**

- âœ… UsuÃ¡rio sempre tem a versÃ£o mais recente quando online
- âœ… AplicaÃ§Ã£o funciona offline se jÃ¡ foi carregada antes
- âœ… Caches antigos sÃ£o removidos automaticamente

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

- Gerencia versÃ£o atual da aplicaÃ§Ã£o
- Registra e monitora Service Worker
- Detecta quando hÃ¡ uma nova versÃ£o
- Notifica usuÃ¡rio sobre atualizaÃ§Ãµes disponÃ­veis
- Limpa cache quando necessÃ¡rio

**VersÃ£o Atual:**

```javascript
this.currentVersion = '1.2.7-20251105';
this.buildTimestamp = '2025-11-05T17:00:00Z';
```

**DetecÃ§Ã£o de AtualizaÃ§Ã£o:**

- Compara versÃ£o armazenada no `localStorage` com a versÃ£o atual
- Se diferente, limpa cache e notifica usuÃ¡rio
- Verifica a cada 5 minutos

**NotificaÃ§Ã£o ao UsuÃ¡rio:**

```
â•”â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•—
â•‘  ðŸŽ‰ Nova versÃ£o disponÃ­vel!           â•‘
â•‘  Atualizado de 1.2.6 para 1.2.7       â•‘
â•‘  [ðŸ”„ Recarregar Agora] [Depois]       â•‘
â•šâ•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
```

---

### 4. **Cache Buster** (`js/cacheBuster.js`)

**O que faz:** Adiciona query strings com versÃ£o e timestamp a URLs de assets.

**Exemplo:**

```javascript
// Antes
<script src="js/app.js"></script>

// Depois (automÃ¡tico)
<script src="js/app.js?v=1.2.7-20251105&t=1730826000000"></script>
```

**MÃ©todos:**

```javascript
// Carregar script com cache-busting
window.cacheBuster.loadScript('js/meu-script.js');

// Carregar CSS com cache-busting
window.cacheBuster.loadCSS('css/meu-estilo.css');

// Adicionar cache-busting a qualquer URL
const url = window.cacheBuster.addCacheBusting('/api/data');
```

---

## ðŸ”§ Como Funciona na PrÃ¡tica

### CenÃ¡rio 1: Primeira Visita

1. UsuÃ¡rio acessa pela primeira vez
2. Service Worker Ã© registrado
3. Assets sÃ£o baixados da rede
4. Cache Ã© populado para uso offline
5. VersÃ£o Ã© armazenada no localStorage

### CenÃ¡rio 2: Visita Subsequente (Mesma VersÃ£o)

1. Service Worker intercepta requisiÃ§Ãµes
2. Busca da rede primeiro
3. Se conseguir, atualiza cache
4. Se falhar (offline), usa cache
5. UsuÃ¡rio vÃª conteÃºdo mais recente

### CenÃ¡rio 3: Nova VersÃ£o DisponÃ­vel

1. UsuÃ¡rio acessa a aplicaÃ§Ã£o
2. VersionManager detecta versÃ£o diferente
3. Cache do Service Worker Ã© limpo
4. NotificaÃ§Ã£o aparece na tela
5. UsuÃ¡rio clica "Recarregar Agora"
6. PÃ¡gina Ã© recarregada com nova versÃ£o

### CenÃ¡rio 4: AtualizaÃ§Ã£o do Service Worker

1. Nova versÃ£o do SW Ã© detectada
2. Service Worker entra em estado "waiting"
3. NotificaÃ§Ã£o aparece: "Nova versÃ£o disponÃ­vel"
4. UsuÃ¡rio clica "Atualizar Agora"
5. Novo SW Ã© ativado
6. PÃ¡gina recarrega automaticamente

---

## ðŸ“¦ Como Atualizar a VersÃ£o

### Passo 1: Atualizar NÃºmero de VersÃ£o

Edite `js/versionManager.js`:

```javascript
class VersionManager {
  constructor() {
    this.currentVersion = '1.2.8-20251106'; // â† ATUALIZE AQUI
    this.buildTimestamp = '2025-11-06T10:00:00Z'; // â† ATUALIZE AQUI
    // ...
  }
}
```

### Passo 2: Atualizar Service Worker

Edite `sw.js`:

```javascript
const CACHE_VERSION = 'singem-v1.2.8-20251106'; // â† ATUALIZE AQUI
```

### Passo 3: Atualizar Cache Buster (opcional)

Edite `js/cacheBuster.js`:

```javascript
class CacheBuster {
  constructor() {
    this.version = '1.2.8-20251106'; // â† ATUALIZE AQUI
    // ...
  }
}
```

### Passo 4: Testar

1. Limpe cache do navegador (CTRL+SHIFT+DELETE)
2. Acesse a aplicaÃ§Ã£o
3. Verifique no console:
   ```
   ðŸ“¦ SINGEM v1.2.8-20251106 (2025-11-06T10:00:00Z)
   ```

---

## ðŸ§ª Testes

### Teste 1: Verificar VersÃ£o

```javascript
console.log(window.versionManager.getVersionInfo());
```

**SaÃ­da esperada:**

```json
{
  "version": "1.2.7-20251105",
  "build": "2025-11-05T17:00:00Z",
  "userAgent": "Mozilla/5.0...",
  "serviceWorker": true,
  "indexedDB": true
}
```

### Teste 2: ForÃ§ar Limpeza de Cache

```javascript
// Limpar cache do Service Worker
window.versionManager.clearServiceWorkerCache();

// Recarregar aplicaÃ§Ã£o
window.versionManager.reloadApp();
```

### Teste 3: Simular Nova VersÃ£o

1. Abra DevTools â†’ Application â†’ Storage â†’ Local Storage
2. Altere o valor de `singem_version` para `1.2.6`
3. Recarregue a pÃ¡gina
4. Deve aparecer notificaÃ§Ã£o de atualizaÃ§Ã£o

---

## ðŸ” DiagnÃ³stico de Problemas

### Problema: Cache nÃ£o estÃ¡ sendo limpo

**SoluÃ§Ã£o:**

1. Verifique se Service Worker estÃ¡ registrado:

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

### Problema: VersÃ£o nÃ£o estÃ¡ atualizando

**SoluÃ§Ã£o:**

1. Verifique localStorage:

   ```javascript
   console.log(localStorage.getItem('singem_version'));
   ```

2. Force atualizaÃ§Ã£o:
   ```javascript
   localStorage.setItem('singem_version', '0.0.0');
   location.reload();
   ```

### Problema: Service Worker nÃ£o estÃ¡ carregando

**Verificar:**

1. HTTPS ou localhost (Service Worker sÃ³ funciona nesses contextos)
2. Arquivo `sw.js` existe na raiz do projeto
3. Sem erros de sintaxe no `sw.js`

**Console:**

```javascript
navigator.serviceWorker.ready
  .then((reg) => console.log('SW pronto:', reg))
  .catch((err) => console.error('SW erro:', err));
```

---

## ðŸ“Š Monitoramento

### DevTools â†’ Application â†’ Service Workers

- Status: âœ… Activated and running
- Source: `/sw.js`
- Scope: `/`

### DevTools â†’ Application â†’ Cache Storage

- Deve ter: `singem-v1.2.7-20251105-cache`
- ConteÃºdo: Arquivos HTML, JS, CSS

### DevTools â†’ Console

```
ðŸ“¦ SINGEM v1.2.7-20251105 (2025-11-05T17:00:00Z)
âœ… Service Worker registrado
âœ… VersionManager carregado
âœ… CacheBuster carregado
```

---

## ðŸš€ Melhores PrÃ¡ticas

1. **Sempre atualize a versÃ£o** ao fazer mudanÃ§as importantes
2. **Use semver** para versionamento (MAJOR.MINOR.PATCH)
3. **Teste em modo privado** antes de publicar
4. **Monitore Service Worker** no DevTools
5. **Mantenha changelog** das versÃµes

---

## ðŸ“ Changelog

### v1.2.7-20251105

- âœ… Implementado sistema de controle de cache
- âœ… Service Worker com estratÃ©gia network-first
- âœ… Version Manager com detecÃ§Ã£o automÃ¡tica de atualizaÃ§Ãµes
- âœ… Meta tags HTTP para desabilitar cache de HTML
- âœ… NotificaÃ§Ãµes de atualizaÃ§Ã£o para usuÃ¡rio

---

## ðŸ”— ReferÃªncias

- [MDN - Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [MDN - Cache API](https://developer.mozilla.org/en-US/docs/Web/API/Cache)
- [Web.dev - Service Worker Lifecycle](https://web.dev/service-worker-lifecycle/)
- [HTTP Caching - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)

---

## âœ… Checklist de Deploy

Antes de fazer deploy de uma nova versÃ£o:

- [ ] Atualizar `versionManager.js` (currentVersion e buildTimestamp)
- [ ] Atualizar `sw.js` (CACHE_VERSION)
- [ ] Atualizar `cacheBuster.js` (version)
- [ ] Testar em modo privado
- [ ] Verificar console sem erros
- [ ] Verificar Service Worker registrado
- [ ] Testar detecÃ§Ã£o de atualizaÃ§Ã£o
- [ ] Atualizar documentaÃ§Ã£o (este arquivo)
- [ ] Commit com mensagem descritiva
- [ ] Tag da versÃ£o no git

---

**Ãšltima atualizaÃ§Ã£o:** 05/11/2025  
**VersÃ£o do documento:** 1.0

