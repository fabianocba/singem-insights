# ðŸ§ª GUIA DE TESTE RÃPIDO - SINGEM

## ðŸš€ Iniciar AplicaÃ§Ã£o

```powershell
# No terminal PowerShell, dentro de D:\SINGEM
.\abrir-aplicacao.ps1
```

Ou acesse diretamente: `http://localhost:3000`

---

## âœ… CHECKLIST DE TESTES

### 1. VerificaÃ§Ã£o Inicial (Console do Navegador)

ApÃ³s abrir a aplicaÃ§Ã£o, pressione **F12** e execute:

```javascript
// Carrega script de verificaÃ§Ã£o
const script = document.createElement('script');
script.src = 'js/quick-check.js';
document.head.appendChild(script);
```

**Resultado esperado:**

```
ðŸŽ‰ PLATAFORMA OK! (90%+ dos checks passaram)
```

---

### 2. Teste de Login

1. âœ… Acesse `http://localhost:3000`
2. âœ… Use credenciais: `singem` / `admin@2025`
3. âœ… Verifique se nÃ£o hÃ¡ erros no console
4. âœ… Dashboard deve carregar normalmente

---

### 3. Teste do Parser Refinado

#### 3.1 PreparaÃ§Ã£o

1. âœ… FaÃ§a login
2. âœ… VÃ¡ para seÃ§Ã£o de **Cadastro de NE** ou **Cadastro de NF**
3. âœ… Procure pelo input de upload de PDF

#### 3.2 Verificar Checkbox

âœ… **Deve aparecer abaixo do input de arquivo:**

```
â˜ ðŸ”¬ Usar Parser Refinado (extraÃ§Ã£o avanÃ§ada com IA)
```

Se nÃ£o aparecer:

- Pressione **Ctrl+Shift+R** para recarregar
- Verifique console por erros

#### 3.3 Teste com PDF de Teste

1. âœ… Marque o checkbox "Usar Parser Refinado"
2. âœ… Selecione um PDF de NE ou NF
3. âœ… Aguarde processamento

**Resultado esperado:**

- Modal abre automaticamente
- Exibe estatÃ­sticas (Tipo, ConfianÃ§a, Itens, Tempo)
- Tabs funcionam (Dados/Avisos/JSON)

#### 3.4 Verificar Dados ExtraÃ­dos

No modal, tab **"Dados ExtraÃ­dos"**:

âœ… **CabeÃ§alho deve mostrar:**

- NÃºmero da nota
- Data de emissÃ£o
- CNPJ/CPF (se disponÃ­vel)
- Processo (para NE)

âœ… **Itens deve mostrar:**

- Tabela com colunas: Seq, DescriÃ§Ã£o, Qtd, V.Unit, V.Total
- Valores numÃ©ricos corretos

âœ… **Totais deve mostrar:**

- Valor total formatado (R$ XX.XX)
- Outros totais se disponÃ­veis

---

### 4. Teste do Error Boundary

Execute no console:

```javascript
// Simula erro nÃ£o tratado
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

- Erro Ã© capturado
- Aparece em `PlatformCore.errorBoundary.getErrors()`
- AplicaÃ§Ã£o **nÃ£o** trava

---

### 5. Teste de Performance

```javascript
// Simula operaÃ§Ã£o pesada
const resultado = await window.measurePerformance('teste-pesado', () => {
  let sum = 0;
  for (let i = 0; i < 10000000; i++) sum += i;
  return sum;
});

// Ver mÃ©tricas
const metricas = window.PlatformCore.performance.getMeasures();
console.table(metricas);
```

**Resultado esperado:**

- Console mostra: `[Performance] teste-pesado: XXXms`
- MÃ©trica aparece na lista

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
// Criar resultado sintÃ©tico
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
- EstatÃ­sticas mostram: NE, 92%, 2 itens, 1 aviso
- Tabs funcionam
- BotÃ£o "Copiar JSON" funciona

---

### 8. Teste de Compatibilidade (Parser Antigo)

1. âœ… **Desmarque** o checkbox "Usar Parser Refinado"
2. âœ… Selecione um PDF
3. âœ… Processamento deve usar parser antigo
4. âœ… **Nenhum** modal aparece
5. âœ… Sistema funciona normalmente

**Confirma:** Parser refinado Ã© opcional e nÃ£o quebra nada!

---

## ðŸ› TROUBLESHOOTING

### Modal nÃ£o aparece

**SoluÃ§Ã£o:**

```javascript
// Verificar se UI integration carregou
console.log('UI Integration:', window.refinedParserUI);

// ForÃ§ar criaÃ§Ã£o do modal
if (window.refinedParserUI) {
  window.refinedParserUI.init();
}
```

### Checkbox nÃ£o aparece

**SoluÃ§Ã£o:**

1. Pressione **Ctrl+Shift+R**
2. Verifique console por erros de carregamento
3. Execute:

```javascript
// Ver se script carregou
console.log('Parser refinado:', typeof window.parsePdfRefined);
```

### Erros de CORS (Tesseract.js)

**Normal!** OCR sÃ³ funciona se:

- PDF for imagem pura (sem texto)
- VocÃª fornecer canvases via `options.pdfPagesCanvases`

Para PDFs com texto, OCR nÃ£o Ã© necessÃ¡rio.

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

## ðŸ“Š MÃ‰TRICAS DE SUCESSO

### âœ… Tudo OK se:

- [ ] Login funciona
- [ ] Checkbox aparece nos uploads
- [ ] Modal abre apÃ³s parsing
- [ ] Dados sÃ£o extraÃ­dos corretamente
- [ ] Parser antigo continua funcionando
- [ ] Nenhum erro crÃ­tico no console
- [ ] Health checks retornam `healthy: true`
- [ ] Performance Ã© monitorada

### âš ï¸ Revisar se:

- Mais de 3 erros no console
- Modal nÃ£o abre
- Dados extraÃ­dos incorretos
- Health check falha em algum sistema

### âŒ Problema crÃ­tico se:

- AplicaÃ§Ã£o nÃ£o carrega
- Login falha
- Tela branca/erro de sintaxe
- ImpossÃ­vel fazer upload

**AÃ§Ã£o:** Pressione Ctrl+Shift+R e tente novamente. Se persistir, veja console.

---

## ðŸŽ¯ TESTE FINAL - FLUXO COMPLETO

### CenÃ¡rio: Cadastro de NE com Parser Refinado

1. âœ… Login (`singem` / `admin@2025`)
2. âœ… Ir para "Cadastro de NE"
3. âœ… Marcar "ðŸ”¬ Usar Parser Refinado"
4. âœ… Selecionar PDF de NE real
5. âœ… Aguardar modal abrir
6. âœ… Verificar confianÃ§a â‰¥ 85%
7. âœ… Revisar itens extraÃ­dos
8. âœ… Clicar "Fechar"
9. âœ… Continuar cadastro normalmente

**Se tudo funcionar:** ðŸŽ‰ **SUCESSO TOTAL!**

---

## ðŸ’¡ DICAS

### Console Ãºteis

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

// Ver todas as mÃ©tricas
console.table(window.PlatformCore.performance.getMeasures());
```

### Debugging

```javascript
// Ativar logs verbose (se implementado)
localStorage.setItem('debug', 'true');

// Ver Ãºltimo parsing
const last = window.refinedParserUI.getLastResult();
console.log(JSON.stringify(last, null, 2));
```

---

## ðŸ“ž SUPORTE

Se encontrar problemas:

1. **Console:** Pressione F12 e copie erros
2. **Health:** Execute `window.PlatformCore.health.getStatus()`
3. **MÃ©tricas:** Execute `window.PlatformCore.performance.getMeasures()`
4. **Ãšltimo resultado:** `window.refinedParserUI?.getLastResult()`

Documente e reporte com prints/logs.

---

**Ãšltima atualizaÃ§Ã£o:** 06/11/2025  
**VersÃ£o da plataforma:** 2.0.0
