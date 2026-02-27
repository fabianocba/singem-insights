const authService = require('../services/auth.service');
const { sendSuccess } = require('../utils/successResponse');

async function login(req, res) {
  const result = await authService.login(req.body);
  return sendSuccess(res, result);
}

module.exports = {
  login
};
