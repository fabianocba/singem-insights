# 🔍 DIAGNÓSTICO COMPLETO - CONSULTAS DIVERSAS

## ✅ TESTE 1 - Confirmado que funciona

- [x] teste-clique.html funcionou
- [x] onclick está funcionando no navegador

## 🧪 TESTE 2 - Verificar se onclick está sendo chamado no IFDESK

### PASSO A PASSO:

1. **Abra o IFDESK no navegador**

2. **Limpe tudo (Console - F12)**:

   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

3. **Faça login**: `ifdesk` / `admin@2025`

4. **Abra o Console (F12)** e mantenha aberto

5. **Clique em "Consultas Diversas"**
   - Deve aparecer no console:
     ```
     🔍 Abrindo Consultas Diversas...
     🔍 Iniciando módulo de Consultas Diversas...
     📦 Menu encontrado: true
     🔎 Tela de consulta encontrada: true
     ...
     ✅ Módulo de Consultas Diversas inicializado!
     🌐 window.abrirConsulta criada: function
     ```

6. **TESTE MANUAL NO CONSOLE**:
   - Digite no console:
     ```javascript
     teste();
     ```
   - Isso deve abrir a consulta de "materiais"
   - Se FUNCIONAR = o módulo está OK, problema é no onclick
   - Se NÃO FUNCIONAR = problema no módulo

7. **Clique no card "📦 Catálogo de Material"**
   - Deve aparecer:
     ```
     CLIQUE DETECTADO em materiais
     🌐 Chamada global para abrir: materiais
     🔍 UIConsultas disponível: function
     📦 UIConsultas objeto completo: {...}
     🚀 Chamando UIConsultas.showConsulta...
     🔍 Abrindo consulta: materiais
     ...
     ✅ Consulta aberta com sucesso!
     ```

## 📋 RESULTADOS POSSÍVEIS:

### ✅ CENÁRIO 1: Console mostra "CLIQUE DETECTADO"

- **Diagnóstico**: onclick está funcionando
- **Problema**: Pode ser erro dentro da função showConsulta
- **Solução**: Verificar mensagens de erro após "Abrindo consulta"

### ❌ CENÁRIO 2: Console NÃO mostra "CLIQUE DETECTADO"

- **Diagnóstico**: onclick não está sendo executado
- **Possíveis causas**:
  1. CSS sobrepondo os cards (z-index, pointer-events)
  2. Outro elemento capturando o clique
  3. JavaScript bloqueando eventos
- **Teste**: Digite no console `teste()` e veja se funciona

### ❌ CENÁRIO 3: Mostra "UIConsultas.showConsulta não é uma função"

- **Diagnóstico**: Módulo não carregou corretamente
- **Solução**: Verificar erros de importação de módulos

### ❌ CENÁRIO 4: Erro após "Chamando UIConsultas.showConsulta"

- **Diagnóstico**: Erro dentro da função showConsulta
- **Solução**: Analisar stack trace do erro

## 🎯 TESTES ADICIONAIS NO CONSOLE:

### Teste 1: Verificar se função existe

```javascript
typeof window.abrirConsulta;
// Deve retornar: "function"
```

### Teste 2: Chamar função manualmente

```javascript
window.abrirConsulta('materiais');
// Deve abrir a consulta
```

### Teste 3: Verificar se card existe

```javascript
document.querySelector('.menu-item-consulta[data-consulta="materiais"]');
// Deve retornar: elemento HTML
```

### Teste 4: Simular clique programático

```javascript
document.querySelector('.menu-item-consulta[data-consulta="materiais"]').click();
// Deve executar o onclick
```

### Teste 5: Verificar se há erros de módulo

```javascript
console.log(window.initConsultas);
console.log(window.abrirConsulta);
console.log(window.teste);
// Todos devem ser: function
```

## 📝 CHECKLIST DE VERIFICAÇÃO:

- [ ] Console mostra "🔍 Iniciando módulo de Consultas Diversas..."?
- [ ] Console mostra "✅ Módulo de Consultas Diversas inicializado!"?
- [ ] Console mostra "🌐 window.abrirConsulta criada: function"?
- [ ] Comando `teste()` no console funciona?
- [ ] Ao clicar no card, ele muda para azul claro?
- [ ] Console mostra "CLIQUE DETECTADO"?
- [ ] Console mostra "🌐 Chamada global para abrir"?
- [ ] Console mostra "✅ Consulta aberta com sucesso!"?
- [ ] Aparecem os filtros de busca na tela?

## 🆘 PRÓXIMOS PASSOS:

**Me envie:**

1. ✅ ou ❌ para cada item do CHECKLIST acima
2. TODA a saída do console (copie e cole aqui)
3. O resultado do teste `teste()` no console
4. Screenshot da tela se possível

**Com essas informações vou identificar exatamente onde está o problema!**
