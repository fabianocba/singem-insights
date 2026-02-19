/**
 * SCRIPT DE RESET DO IFDESK
 *
 * Use este script se não conseguir fazer login
 *
 * Como usar:
 * 1. Abra o Console (F12)
 * 2. Cole este script completo
 * 3. Pressione Enter
 * 4. Recarregue a página (F5)
 */

console.log('🔧 Iniciando reset do IFDESK...');

// Limpa localStorage
localStorage.clear();
console.log('✅ localStorage limpo');

// Limpa sessionStorage
sessionStorage.clear();
console.log('✅ sessionStorage limpo');

// Limpa cookies
document.cookie.split(';').forEach((c) => {
  document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=' + new Date().toUTCString() + ';path=/');
});
console.log('✅ Cookies limpos');

console.log('✅ Reset completo!');
console.log('📝 Agora recarregue a página (F5) e tente fazer login novamente');
console.log('🔑 Credenciais: ifdesk / admin@2025');
