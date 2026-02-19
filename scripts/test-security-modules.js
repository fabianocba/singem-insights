/**
 * Script de Teste Manual - Módulos de Segurança
 * Execute este arquivo no console do navegador para testar os módulos
 */

console.log('🧪 Iniciando testes dos módulos de segurança...\n');

// Teste 1: InputValidator - CNPJ
console.group('1️⃣ Teste InputValidator.isValidCNPJ()');
const testCNPJs = [
  { value: '12.345.678/0001-95', expected: true, label: 'CNPJ válido com formatação' },
  { value: '12345678000195', expected: true, label: 'CNPJ válido sem formatação' },
  { value: '12.345.678/0001-99', expected: false, label: 'CNPJ inválido' },
  { value: '11.111.111/1111-11', expected: false, label: 'CNPJ com dígitos iguais' },
  { value: '', expected: false, label: 'CNPJ vazio' }
];

testCNPJs.forEach((test) => {
  const result = window.InputValidator?.isValidCNPJ(test.value);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`${status} ${test.label}: ${result} (esperado: ${test.expected})`);
});
console.groupEnd();

// Teste 2: InputValidator - Empenho
console.group('2️⃣ Teste InputValidator.validateEmpenho()');
const empenhoValido = {
  numero: '123456',
  data: '2025-11-07',
  fornecedor: 'Fornecedor Teste LTDA',
  cnpjFornecedor: '12.345.678/0001-95',
  valorTotal: 1000.0,
  itens: [
    {
      descricao: 'Item 1',
      quantidade: 10,
      valorUnitario: 50,
      valorTotal: 500
    },
    {
      descricao: 'Item 2',
      quantidade: 5,
      valorUnitario: 100,
      valorTotal: 500
    }
  ]
};

const resultEmpenho = window.InputValidator?.validateEmpenho(empenhoValido);
console.log(`Empenho válido: ${resultEmpenho?.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!resultEmpenho?.valid) {
  console.log('Erros:', resultEmpenho?.errors);
}

// Teste com empenho inválido
const empenhoInvalido = { ...empenhoValido, cnpjFornecedor: '12.345.678/0001-99' };
const resultInvalido = window.InputValidator?.validateEmpenho(empenhoInvalido);
console.log(`Empenho inválido detectado: ${!resultInvalido?.valid ? '✅ PASS' : '❌ FAIL'}`);
if (!resultInvalido?.valid) {
  console.log('Erros esperados:', resultInvalido?.errors);
}
console.groupEnd();

// Teste 3: InputValidator - Arquivo PDF
console.group('3️⃣ Teste InputValidator.validatePDFFile()');
const arquivoValido = {
  type: 'application/pdf',
  size: 1024 * 100 // 100KB
};
const arquivoGrande = {
  type: 'application/pdf',
  size: 1024 * 1024 * 51 // 51MB
};
const arquivoInvalido = {
  type: 'image/png',
  size: 1024 * 100
};

const testArquivoValido = window.InputValidator?.validatePDFFile(arquivoValido);
console.log(`Arquivo válido: ${testArquivoValido?.valid ? '✅ PASS' : '❌ FAIL'}`);

const testArquivoGrande = window.InputValidator?.validatePDFFile(arquivoGrande);
console.log(`Arquivo grande rejeitado: ${!testArquivoGrande?.valid ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  → ${testArquivoGrande?.error}`);

const testArquivoInvalido = window.InputValidator?.validatePDFFile(arquivoInvalido);
console.log(`Arquivo não-PDF rejeitado: ${!testArquivoInvalido?.valid ? '✅ PASS' : '❌ FAIL'}`);
console.log(`  → ${testArquivoInvalido?.error}`);
console.groupEnd();

// Teste 4: HTMLSanitizer
console.group('4️⃣ Teste HTMLSanitizer');
const htmlPerigoso = '<script>alert("XSS")</script><p>Texto limpo</p><img src=x onerror=alert(1)>';
const htmlLimpo = window.HTMLSanitizer?.sanitize(htmlPerigoso);
console.log('HTML original:', htmlPerigoso);
console.log('HTML sanitizado:', htmlLimpo);
console.log(`Scripts removidos: ${!htmlLimpo?.includes('<script>') ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Event handlers removidos: ${!htmlLimpo?.includes('onerror') ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Conteúdo seguro mantido: ${htmlLimpo?.includes('<p>Texto limpo</p>') ? '✅ PASS' : '❌ FAIL'}`);

const textoEscapado = window.HTMLSanitizer?.escape('<div>Teste & "aspas"</div>');
console.log('\nTexto original: <div>Teste & "aspas"</div>');
console.log('Texto escapado:', textoEscapado);
console.log(
  `Caracteres escapados: ${textoEscapado?.includes('&lt;') && textoEscapado?.includes('&quot;') ? '✅ PASS' : '❌ FAIL'}`
);
console.groupEnd();

// Teste 5: Sanitização de String
console.group('5️⃣ Teste InputValidator.sanitizeString()');
const stringPerigosa = '<script>alert("XSS")</script>  Texto limpo  \x00\x1F';
const stringSanitizada = window.InputValidator?.sanitizeString(stringPerigosa);
console.log('String original:', stringPerigosa);
console.log('String sanitizada:', stringSanitizada);
console.log(`Tags HTML removidas: ${!stringSanitizada?.includes('<script>') ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Trim aplicado: ${stringSanitizada === 'alert("XSS")Texto limpo' ? '✅ PASS' : '❌ FAIL'}`);
console.groupEnd();

// Teste 6: Validação de Credenciais
console.group('6️⃣ Teste InputValidator.validateCredentials()');
const credenciaisValidas = window.InputValidator?.validateCredentials('usuario.teste_123', 'senha1234');
console.log(`Credenciais válidas aceitas: ${credenciaisValidas?.valid ? '✅ PASS' : '❌ FAIL'}`);

const credenciaisInvalidas = window.InputValidator?.validateCredentials('ab', '123');
console.log(`Credenciais inválidas rejeitadas: ${!credenciaisInvalidas?.valid ? '✅ PASS' : '❌ FAIL'}`);
console.log('Erros:', credenciaisInvalidas?.errors);
console.groupEnd();

// Teste 7: Criar Elemento Seguro
console.group('7️⃣ Teste HTMLSanitizer.createElement()');
const linkSeguro = window.HTMLSanitizer?.createElement('a', 'Clique aqui', {
  href: 'https://example.com',
  target: '_blank',
  className: 'link-teste'
});
console.log('Link criado:', linkSeguro?.outerHTML);
console.log(`Elemento criado: ${linkSeguro?.tagName === 'A' ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Atributos aplicados: ${linkSeguro?.href && linkSeguro?.target ? '✅ PASS' : '❌ FAIL'}`);
console.log(`Texto definido: ${linkSeguro?.textContent === 'Clique aqui' ? '✅ PASS' : '❌ FAIL'}`);

// Teste com URL perigosa
const linkPerigoso = window.HTMLSanitizer?.createElement('a', 'Link', {
  href: 'javascript:alert(1)'
});
console.log(`\nURL javascript: bloqueada: ${!linkPerigoso?.href?.includes('javascript:') ? '✅ PASS' : '❌ FAIL'}`);
console.groupEnd();

// Resumo
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES');
console.log('='.repeat(60));
console.log('✅ InputValidator.isValidCNPJ - 5 testes');
console.log('✅ InputValidator.validateEmpenho - 2 testes');
console.log('✅ InputValidator.validatePDFFile - 3 testes');
console.log('✅ HTMLSanitizer.sanitize - 3 testes');
console.log('✅ HTMLSanitizer.escape - 1 teste');
console.log('✅ InputValidator.sanitizeString - 2 testes');
console.log('✅ InputValidator.validateCredentials - 2 testes');
console.log('✅ HTMLSanitizer.createElement - 3 testes');
console.log('\n📝 Total: 21 testes executados');
console.log('🎯 Para testar no formulário, tente:');
console.log('   1. Fazer login com usuário/senha curtos');
console.log('   2. Salvar empenho com CNPJ inválido');
console.log('   3. Upload de arquivo não-PDF');
console.log('   4. Salvar NF com dados incompletos');
console.log('='.repeat(60));
