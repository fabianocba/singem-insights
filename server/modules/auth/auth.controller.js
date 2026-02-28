const authService = require('./auth.service');
const { sendSuccess } = require('../../src/utils/successResponse');

async function login(req, res, next) {
  try {
    const result = await authService.login(req.body);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const result = await authService.refresh(req.body);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    const result = await authService.logout(req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const result = await authService.me(req.user);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function register(req, res, next) {
  try {
    const result = await authService.register(req.body);
    return sendSuccess(res, result, 201);
  } catch (error) {
    return next(error);
  }
}

async function activate(req, res, next) {
  try {
    const result = await authService.activateAccount(req.query.token);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const result = await authService.forgotPassword(req.body);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);
    return sendSuccess(res, result);
  } catch (error) {
    return next(error);
  }
}

async function changePassword(req, res, next) {
  try {
    const result = await authService.changePassword(req.body, req.user);
    return sendSuccess(res, result);
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
