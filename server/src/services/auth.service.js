const auth = require('../../middleware/auth');
const identityService = require('../../domain/identity/identityService');
const AppError = require('../utils/appError');
const authRepository = require('../repositories/auth.repository');

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
  } catch (_error) {
    throw new AppError(401, 'UNAUTHORIZED', 'Credenciais inválidas');
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
  await authRepository.saveRefreshToken(userForToken.id, refreshToken);

  return {
    sucesso: true,
    usuario: {
      id: userForToken.id,
      login: userForToken.login,
      nome: userForToken.nome,
      email: userForToken.email,
      perfil: userForToken.perfil
    },
    accessToken,
    refreshToken
  };
}

module.exports = {
  login
};
