const express = require('express');
const { createAuthLimiter } = require('../../../middleware/rateLimit');
const auth = require('../../../middleware/auth');
const validate = require('../../../middlewares/validate');
const authController = require('./auth.controller');
const {
  loginSchema,
  refreshSchema,
  registerSchema,
  activateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
} = require('./auth.validation');

const router = express.Router();

const loginLimiter = createAuthLimiter(20, 'Muitas tentativas de login. Tente novamente em alguns minutos.');
const registerLimiter = createAuthLimiter(10, 'Muitas tentativas de cadastro. Tente novamente em alguns minutos.');
const forgotPasswordLimiter = createAuthLimiter(10, 'Muitas tentativas. Tente novamente em alguns minutos.');
const resetPasswordLimiter = createAuthLimiter(
  10,
  'Muitas tentativas de redefinição. Tente novamente em alguns minutos.'
);

router.post('/login', loginLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', auth.authenticate, authController.logout);
router.get('/me', auth.authenticate, authController.me);
router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.get('/activate', validate(activateSchema), authController.activate);
router.post('/forgot-password', forgotPasswordLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', resetPasswordLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.put('/password', auth.authenticate, validate(changePasswordSchema), authController.changePassword);

module.exports = router;
