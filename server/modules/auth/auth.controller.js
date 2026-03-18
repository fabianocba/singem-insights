const authService = require('./auth.service');
const { ok, created } = require('../../utils/httpResponse');

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return ok(req, res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      usuario: result.usuario
    });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body);
    return ok(req, res, {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken
    });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    await authService.logout(req.user);
    return ok(req, res, { ok: true });
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await authService.me(req.user);
    return ok(req, res, { usuario: result.usuario || req.user });
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return created(req, res, {
      message: result.message || result.mensagem || 'Cadastro realizado'
    });
  } catch (error) {
    return next(error);
  }
}

async function activate(req, res, next) {
  try {
    const result = await authService.activateAccount(req.query.token);
    return ok(req, res, {
      message: result.message || 'Conta ativada com sucesso'
    });
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body);
    return ok(req, res, {
      message: result.message
    });
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);
    return ok(req, res, {
      message: result.message || 'Senha redefinida com sucesso'
    });
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.body, req.user);
    return ok(req, res, {
      message: result.mensagem || 'Senha alterada com sucesso'
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  register,
  activate,
  forgotPassword,
  resetPassword,
  changePassword
};
