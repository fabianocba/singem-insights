# 🧪 GUIA DE TESTE RÁPIDO - IFDESK

## 🚀 Iniciar Aplicação

```powershell
# No terminal PowerShell, dentro de D:\IFDESK
.\abrir-aplicacao.ps1
```

Ou acesse diretamente: `http://localhost:3000`

---

## ✅ CHECKLIST DE TESTES

### 1. Verificação Inicial (Console do Navegador)

Após abrir a aplicação, pressione **F12** e execute:

```javascript
// Carrega script de verificação
const script = document.createElement('script');
script.src = 'js/quick-check.js';
document.head.appendChild(script);
```

**Resultado esperado:**

```
🎉 PLATAFORMA OK! (90%+ dos checks passaram)
```

---

### 2. Teste de Login

1. ✅ Acesse `http://localhost:3000`
2. ✅ Use credenciais: `ifdesk` / `admin@2025`
3. ✅ Verifique se não há erros no console
4. ✅ Dashboard deve carregar normalmente

---

### 3. Teste do Parser Refinado

#### 3.1 Preparação

1. ✅ Faça login
2. ✅ Vá para seção de **Cadastro de NE** ou **Cadastro de NF**
3. ✅ Procure pelo input de upload de PDF

#### 3.2 Verificar Checkbox

✅ **Deve aparecer abaixo do input de arquivo:**

```
☐ 🔬 Usar Parser Refinado (extração avançada com IA)
```

Se não aparecer:

- Pressione **Ctrl+Shift+R** para recarregar
- Verifique console por erros

#### 3.3 Teste com PDF de Teste

1. ✅ Marque o checkbox "Usar Parser Refinado"
2. ✅ Selecione um PDF de NE ou NF
3. ✅ Aguarde processamento

**Resultado esperado:**

- Modal abre automaticamente
- Exibe estatísticas (Tipo, Confiança, Itens, Tempo)
- Tabs funcionam (Dados/Avisos/JSON)

#### 3.4 Verificar Dados Extraídos

No modal, tab **"Dados Extraídos"**:

✅ **Cabeçalho deve mostrar:**

- Número da nota
- Data de emissão
- CNPJ/CPF (se disponível)
- Processo (para NE)

✅ **Itens deve mostrar:**

- Tabela com colunas: Seq, Descrição, Qtd, V.Unit, V.Total
- Valores numéricos corretos

✅ **Totais deve mostrar:**

- Valor total formatado (R$ XX.XX)
- Outros totais se disponíveis

---

### 4. Teste do Error Boundary

Execute no console:

```javascript
// Simula erro não tratado
setTimeout(() => {
  throw new Error('Teste de error boundary');
}, 100);

// Verifica se foi capturado
setTimeout(() => {
  const erros = window.PlatformCore.errorBoundary.getErrors();
  console.log('Erros capturados:', erros.length);
  console.table(erros);
}, 500);
```

**Resultado esperado:**

- Erro é capturado
- Aparece em `PlatformCore.errorBoundary.getErrors()`
- Aplicação **não** trava

---

### 5. Teste de Performance

```javascript
// Simula operação pesada
const resultado = await window.measurePerformance('teste-pesado', () => {
  let sum = 0;
  for (let i = 0; i < 10000000; i++) sum += i;
  return sum;
});

// Ver métricas
const metricas = window.PlatformCore.performance.getMeasures();
console.table(metricas);
```

**Resultado esperado:**

- Console mostra: `[Performance] teste-pesado: XXXms`
- Métrica aparece na lista

---

### 6. Teste de Health Check

```javascript
// Executar health check
const status = await window.PlatformCore.health.runAllChecks();
console.log('Health Status:', status);

// Ver detalhes
const detalhes = window.PlatformCore.health.getStatus();
console.log('Detalhes:', detalhes);
```

**Resultado esperado:**

```javascript
{
  healthy: true,
  checks: {
    db: { status: 'healthy', ... },
    fs: { status: 'healthy', ... },
    parser: { status: 'healthy', ... }
  }
}
```

---

### 7. Teste do Modal de Parsing (Manual)

```javascript
// Criar resultado sintético
const resultadoTeste = {
  tipo: 'NE',
  confidence: 0.92,
  header: {
    numero: '12345',
    dataEmissao: '10/11/2025',
    cnpj: { masked: '12.345.678/0001-90', digits: '12345678000190' }
  },
  itens: [
    { seq: '001', descricao: 'Produto A', quantidade: 10, valorUnitario: 5.5, valorTotal: 55.0 },
    { seq: '002', descricao: 'Produto B', quantidade: 5, valorUnitario: 12.0, valorTotal: 60.0 }
  ],
  totais: { vProd: 115.0, vNF: 115.0 },
  warnings: [{ msg: 'Teste de aviso' }],
  errors: [],
  timing: { ms: 234 }
};

// Mostrar modal
window.showRefinedParsingResult(resultadoTeste);
```

**Resultado esperado:**

- Modal abre
- Estatísticas mostram: NE, 92%, 2 itens, 1 aviso
- Tabs funcionam
- Botão "Copiar JSON" funciona

---

### 8. Teste de Compatibilidade (Parser Antigo)

1. ✅ **Desmarque** o checkbox "Usar Parser Refinado"
2. ✅ Selecione um PDF
3. ✅ Processamento deve usar parser antigo
4. ✅ **Nenhum** modal aparece
5. ✅ Sistema funciona normalmente

**Confirma:** Parser refinado é opcional e não quebra nada!

---

## 🐛 TROUBLESHOOTING

### Modal não aparece

**Solução:**

```javascript
// Verificar se UI integration carregou
console.log('UI Integration:', window.refinedParserUI);

// Forçar criação do modal
if (window.refinedParserUI) {
  window.refinedParserUI.init();
}
```

### Checkbox não aparece

**Solução:**

1. Pressione **Ctrl+Shift+R**
2. Verifique console por erros de carregamento
3. Execute:

```javascript
// Ver se script carregou
console.log('Parser refinado:', typeof window.parsePdfRefined);
```

### Erros de CORS (Tesseract.js)

**Normal!** OCR só funciona se:

- PDF for imagem pura (sem texto)
- Você fornecer canvases via `options.pdfPagesCanvases`

Para PDFs com texto, OCR não é necessário.

### Health check falha

**Verifique:**

```javascript
// Status detalhado
const status = window.PlatformCore.health.getStatus();
console.log(status);

// Checks individuais
await window.PlatformCore.health.runCheck('db', async () => {
  return !!window.db;
});
```

---

## 📊 MÉTRICAS DE SUCESSO

### ✅ Tudo OK se:

- [ ] Login funciona
- [ ] Checkbox aparece nos uploads
- [ ] Modal abre após parsing
- [ ] Dados são extraídos corretamente
- [ ] Parser antigo continua funcionando
- [ ] Nenhum erro crítico no console
- [ ] Health checks retornam `healthy: true`
- [ ] Performance é monitorada

### ⚠️ Revisar se:

- Mais de 3 erros no console
- Modal não abre
- Dados extraídos incorretos
- Health check falha em algum sistema

### ❌ Problema crítico se:

- Aplicação não carrega
- Login falha
- Tela branca/erro de sintaxe
- Impossível fazer upload

**Ação:** Pressione Ctrl+Shift+R e tente novamente. Se persistir, veja console.

---

## 🎯 TESTE FINAL - FLUXO COMPLETO

### Cenário: Cadastro de NE com Parser Refinado

1. ✅ Login (`ifdesk` / `admin@2025`)
2. ✅ Ir para "Cadastro de NE"
3. ✅ Marcar "🔬 Usar Parser Refinado"
4. ✅ Selecionar PDF de NE real
5. ✅ Aguardar modal abrir
6. ✅ Verificar confiança ≥ 85%
7. ✅ Revisar itens extraídos
8. ✅ Clicar "Fechar"
9. ✅ Continuar cadastro normalmente

**Se tudo funcionar:** 🎉 **SUCESSO TOTAL!**

---

## 💡 DICAS

### Console úteis

```javascript
// Estado completo
console.log('Platform:', window.PlatformCore);
console.log('Parser UI:', window.refinedParserUI);
console.log('Last result:', window.refinedParserUI?.getLastResult());

// Ativar/desativar parser refinado programaticamente
window.refinedParserUI.enable();
window.refinedParserUI.disable();
console.log('Ativo?', window.refinedParserUI.isEnabled());

// Limpar erros
window.PlatformCore.errorBoundary.clearErrors();

// Ver todas as métricas
console.table(window.PlatformCore.performance.getMeasures());
```

### Debugging

```javascript
// Ativar logs verbose (se implementado)
localStorage.setItem('debug', 'true');

// Ver último parsing
const last = window.refinedParserUI.getLastResult();
console.log(JSON.stringify(last, null, 2));
```

---

## 📞 SUPORTE

Se encontrar problemas:

1. **Console:** Pressione F12 e copie erros
2. **Health:** Execute `window.PlatformCore.health.getStatus()`
3. **Métricas:** Execute `window.PlatformCore.performance.getMeasures()`
4. **Último resultado:** `window.refinedParserUI?.getLastResult()`

Documente e reporte com prints/logs.

---

**Última atualização:** 06/11/2025  
**Versão da plataforma:** 2.0.0
