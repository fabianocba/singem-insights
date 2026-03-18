const bcrypt = require('bcrypt');
const crypto = require('crypto');
const auth = require('../../middleware/auth');
const identityService = require('../../domain/identity/identityService');
const accessContextService = require('../../domain/identity/accessContextService');
const { sendMail, buildActivationEmail, buildResetPasswordEmail } = require('../../src/services/emailService');
const AppError = require('../../utils/appError');
const authRepository = require('./auth.repository');

const SALT_ROUNDS = 10;
const ACTIVATION_HOURS = 24;
const RESET_HOURS = 1;

function isEmailValid(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || ''));
}

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

async function saveToken(userId, type, rawToken, expiresAt, client) {
  return authRepository.saveAuthToken(userId, type, hashToken(rawToken), expiresAt, client);
}

async function consumeToken(rawToken, type, client) {
  return authRepository.findConsumableAuthToken(hashToken(rawToken), type, client);
}

async function login(input) {
  const userLogin = input.email || input.login;
  const userPassword = input.password || input.senha;

  if (!userLogin || !userPassword) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Dados inválidos', [
      {
        path: !userLogin ? 'login' : 'senha',
        message: !userLogin ? 'Login é obrigatório' : 'Senha é obrigatória',
        code: 'custom'
      }
    ]);
  }

  let profile;
  try {
    profile = await identityService.authenticate('local', {
      email: userLogin,
      password: userPassword
    });
  } catch (error) {
    if (error?.statusCode === 401) {
      throw new AppError(401, 'UNAUTHORIZED', 'Credenciais inválidas');
    }

    if (error?.code === 'ECONNREFUSED' || String(error?.message || '').includes('ECONNREFUSED')) {
      throw new AppError(
        503,
        'SERVICE_UNAVAILABLE',
        'Serviço de autenticação indisponível no momento (falha de conexão com o banco).'
      );
    }

    throw error;
  }

  const userForToken = {
    id: profile._internal.id,
    login: profile._internal.login,
    nome: profile.name,
    email: profile.email,
    perfil: profile._internal.perfil
  };

  const accessToken = auth.generateAccessToken(userForToken);
  const refreshToken = auth.generateRefreshToken(userForToken);
  await auth.saveRefreshToken(userForToken.id, refreshToken);

  const hydratedUser =
    (await accessContextService.hydrateAuthenticatedUser({
      ...userForToken,
      authProvider: profile.provider || 'local'
    })) || userForToken;

  return {
    sucesso: true,
    usuario: hydratedUser,
    accessToken,
    refreshToken
  };
}

async function refresh(input) {
  const { refreshToken } = input;

  if (!refreshToken) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Refresh token é obrigatório');
  }

  const user = await auth.consumeRefreshToken(refreshToken);
  if (!user) {
    throw new AppError(401, 'UNAUTHORIZED', 'Refresh token inválido ou expirado');
  }

  const newAccessToken = auth.generateAccessToken(user);
  const newRefreshToken = auth.generateRefreshToken(user);
  await auth.saveRefreshToken(user.id, newRefreshToken);

  return {
    sucesso: true,
    accessToken: newAccessToken,
    refreshToken: newRefreshToken
  };
}

async function logout(user) {
  await auth.revokeAllTokens(user.id);
  return {
    sucesso: true,
    mensagem: 'Logout realizado com sucesso'
  };
}

async function me(user) {
  const hydratedUser = user?.accessContext ? user : await accessContextService.hydrateAuthenticatedUser(user);

  return {
    sucesso: true,
    usuario: hydratedUser || user
  };
}

async function register(input) {
  const userName = String(input.name || input.nome || '').trim();
  const userEmail = String(input.email || '')
    .trim()
    .toLowerCase();
  const userPassword = input.password || input.senha;

  if (!userName || !userEmail || !userPassword) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nome, e-mail e senha são obrigatórios.');
  }

  if (!isEmailValid(userEmail)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'E-mail inválido.');
  }

  if (String(userPassword).length < 8) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A senha deve ter no mínimo 8 caracteres.');
  }

  const existing = await authRepository.findUserByEmailOrLogin(userEmail);
  if (existing) {
    throw new AppError(409, 'CONFLICT', 'Não foi possível concluir o cadastro com este e-mail.');
  }

  const senhaHash = await bcrypt.hash(userPassword, SALT_ROUNDS);

  const user = await authRepository.createUser({
    login: userEmail,
    email: userEmail,
    senha_hash: senhaHash,
    nome: userName,
    perfil: 'operador',
    ativo: false,
    is_active: false
  });

  const token = generateRawToken();
  const expiresAt = new Date(Date.now() + ACTIVATION_HOURS * 60 * 60 * 1000);
  await saveToken(user.id, 'ACTIVATION', token, expiresAt);

  const emailContent = buildActivationEmail({ name: user.nome, token });
  const mailResult = await sendMail({
    to: user.email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text
  });

  if (!mailResult.ok) {
    throw new AppError(
      503,
      'SERVICE_UNAVAILABLE',
      'Cadastro realizado, mas não foi possível enviar o e-mail de ativação no momento.'
    );
  }

  return {
    ok: true,
    message: 'Cadastro realizado. Verifique seu e-mail para ativar a conta.'
  };
}

async function activateAccount(token) {
  if (!token) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Token de ativação é obrigatório.');
  }

  const tokenRow = await consumeToken(token, 'ACTIVATION');
  if (!tokenRow) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Token inválido ou expirado.');
  }

  await authRepository.withTransaction(async (client) => {
    await authRepository.activateUser(tokenRow.user_id, client);
    await authRepository.markAuthTokenUsed(tokenRow.id, client);
    await authRepository.markAuthTokensByUserTypeUsed(tokenRow.user_id, 'ACTIVATION', client);
  });

  return {
    ok: true,
    message: 'Conta ativada com sucesso.'
  };
}

async function forgotPassword(input) {
  const genericMessage = 'Se existir uma conta ativa para este e-mail, enviaremos instruções de recuperação.';
  const userEmail = String(input.email || '')
    .trim()
    .toLowerCase();

  if (!userEmail || !isEmailValid(userEmail)) {
    return { ok: true, message: genericMessage };
  }

  const user = await authRepository.findActiveUserByEmail(userEmail);
  if (user) {
    const token = generateRawToken();
    const expiresAt = new Date(Date.now() + RESET_HOURS * 60 * 60 * 1000);
    await saveToken(user.id, 'RESET', token, expiresAt);

    const emailContent = buildResetPasswordEmail({ name: user.nome, token });
    await sendMail({
      to: user.email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });
  }

  return { ok: true, message: genericMessage };
}

async function resetPassword(input) {
  const token = input.token;
  const nextPassword = input.new_password || input.novaSenha;

  if (!token || !nextPassword) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Token e nova senha são obrigatórios.');
  }

  if (String(nextPassword).length < 8) {
    throw new AppError(400, 'VALIDATION_ERROR', 'A nova senha deve ter no mínimo 8 caracteres.');
  }

  const tokenRow = await consumeToken(token, 'RESET');
  if (!tokenRow) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Token inválido ou expirado.');
  }

  const passwordHash = await bcrypt.hash(nextPassword, SALT_ROUNDS);

  await authRepository.withTransaction(async (client) => {
    await authRepository.updateUserPasswordHash(tokenRow.user_id, passwordHash, client);
    await authRepository.markAuthTokenUsed(tokenRow.id, client);
    await authRepository.markAuthTokensByUserTypeUsed(tokenRow.user_id, 'RESET', client);
    await authRepository.deleteRefreshTokensByUser(tokenRow.user_id, client);
  });

  return {
    ok: true,
    message: 'Senha redefinida com sucesso.'
  };
}

async function changePassword(input, user) {
  const { senhaAtual, novaSenha } = input;

  if (!senhaAtual || !novaSenha) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Senha atual e nova senha são obrigatórias');
  }

  if (String(novaSenha).length < 6) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nova senha deve ter no mínimo 6 caracteres');
  }

  const currentUser = await authRepository.findUserById(user.id);
  if (!currentUser) {
    throw new AppError(404, 'NOT_FOUND', 'Usuário não encontrado');
  }

  const senhaCorreta = await bcrypt.compare(senhaAtual, currentUser.senha_hash);
  if (!senhaCorreta) {
    throw new AppError(401, 'UNAUTHORIZED', 'Senha atual incorreta');
  }

  const novaSenhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
  await authRepository.updateUserPasswordHash(currentUser.id, novaSenhaHash);
  await auth.revokeAllTokens(currentUser.id);

  return {
    sucesso: true,
    mensagem: 'Senha alterada com sucesso. Faça login novamente.'
  };
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  register,
  activateAccount,
  forgotPassword,
  resetPassword,
  changePassword
};
