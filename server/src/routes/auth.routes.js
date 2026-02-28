const express = require('express');
const { createAuthLimiter } = require('../../middleware/rateLimit');
const validate = require('../middlewares/validate');
const asyncHandler = require('../middlewares/asyncHandler');
const authController = require('../controllers/auth.controller');
const { loginSchema } = require('../validators/auth.validators');

const legacyAuthRoutes = require('../../routes/auth.routes');

const router = express.Router();

const loginLimiter = createAuthLimiter(20, 'Muitas tentativas de login. Tente novamente em alguns minutos.');

router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(authController.login));

router.use('/', (req, res, next) => {
  if (req.path === '/login' && req.method === 'POST') {
    return next();
  }

  return legacyAuthRoutes(req, res, next);
});

module.exports = router;
