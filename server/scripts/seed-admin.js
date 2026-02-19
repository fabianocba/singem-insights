/**
 * Seed Admin - SINGEM
 * Cria o primeiro usuário administrador
 *
 * Uso: node scripts/seed-admin.js
 */

require('dotenv').config();

const bcrypt = require('bcrypt');
const db = require('../config/database');

const SALT_ROUNDS = 10;

async function seedAdmin() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║       SINGEM - Seed do Administrador       ║');
  console.log('╚═══════════════════════════════════════════╝');
  console.log('');

  try {
    // Testa conexão
    const connected = await db.testConnection();
    if (!connected) {
      console.error('❌ Não foi possível conectar ao banco de dados');
      console.error('   Verifique as variáveis de ambiente no .env');
      process.exit(1);
    }

    // Roda migrations se necessário
    await db.runMigrations();

    // Verifica se já existem usuários
    const count = await db.query('SELECT COUNT(*) as total FROM usuarios');
    const totalUsuarios = parseInt(count.rows[0].total);

    if (totalUsuarios > 0) {
      console.log('');
      console.log('⚠️  Já existem usuários cadastrados no sistema.');
      console.log('   Este script só funciona em banco vazio.');
      console.log('');
      console.log('   Usuários existentes:');

      const usuarios = await db.query('SELECT login, nome, perfil FROM usuarios LIMIT 5');
      usuarios.rows.forEach((u) => {
        console.log(`   - ${u.login} (${u.nome}) [${u.perfil}]`);
      });

      process.exit(0);
    }

    // Lê credenciais do ambiente ou usa padrão
    const adminLogin = process.env.ADMIN_LOGIN || 'admin';
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@ifbaiano.edu.br';
    const adminNome = process.env.ADMIN_NOME || 'Administrador SINGEM';
    const adminSenha = process.env.ADMIN_PASSWORD;

    if (!adminSenha) {
      console.error('❌ Variável ADMIN_PASSWORD não definida no .env');
      console.error('');
      console.error('   Adicione ao seu arquivo .env:');
      console.error('   ADMIN_PASSWORD=sua_senha_segura_aqui');
      console.error('');
      process.exit(1);
    }

    // Valida senha
    if (adminSenha.length < 8) {
      console.error('❌ A senha deve ter no mínimo 8 caracteres');
      process.exit(1);
    }

    console.log('📝 Criando usuário administrador...');
    console.log(`   Login: ${adminLogin}`);
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Nome:  ${adminNome}`);
    console.log('');

    // Hash da senha
    const senhaHash = await bcrypt.hash(adminSenha, SALT_ROUNDS);

    // Insere usuário
    const result = await db.insert('usuarios', {
      login: adminLogin.toLowerCase(),
      email: adminEmail.toLowerCase(),
      senha_hash: senhaHash,
      nome: adminNome,
      perfil: 'admin',
      ativo: true
    });

    console.log('✅ Administrador criado com sucesso!');
    console.log('');
    console.log('   ID:     ' + result.id);
    console.log('   Login:  ' + result.login);
    console.log('   Perfil: ' + result.perfil);
    console.log('');
    console.log('🔐 Use essas credenciais para fazer o primeiro login.');
    console.log('   Depois, altere a senha pelo sistema.');
    console.log('');

    // Log de auditoria
    await db.insert('audit_log', {
      usuario_id: result.id,
      usuario_nome: result.nome,
      acao: 'criar',
      entidade: 'usuarios',
      entidade_id: result.id,
      dados_depois: JSON.stringify({ login: result.login, perfil: result.perfil })
    });

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao criar administrador:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

seedAdmin();
