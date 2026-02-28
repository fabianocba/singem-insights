const { loginSchema } = require('../../src/validators/auth.validators');
const { z } = require('../../src/validators/common');

const refreshSchema = {
  body: z.object({
    refreshToken: z.string().min(1, 'Refresh token é obrigatório')
  })
};

const registerSchema = {
  body: z
    .object({
      name: z.string().optional(),
      nome: z.string().optional(),
      email: z.string().trim().optional(),
      password: z.string().optional(),
      senha: z.string().optional()
    })
    .superRefine((data, ctx) => {
      const userName = String(data.name || data.nome || '').trim();
      const userEmail = String(data.email || '').trim();
      const userPassword = String(data.password || data.senha || '');

      if (!userName) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['name'], message: 'Nome é obrigatório' });
      }

      if (!userEmail) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['email'], message: 'E-mail é obrigatório' });
      }

      if (!userPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['password'], message: 'Senha é obrigatória' });
      }
    })
};

const activateSchema = {
  query: z.object({
    token: z.string().min(1, 'Token de ativação é obrigatório')
  })
};

const forgotPasswordSchema = {
  body: z.object({
    email: z.string().optional().default('')
  })
};

const resetPasswordSchema = {
  body: z
    .object({
      token: z.string().min(1, 'Token é obrigatório'),
      new_password: z.string().optional(),
      novaSenha: z.string().optional()
    })
    .superRefine((data, ctx) => {
      const nextPassword = String(data.new_password || data.novaSenha || '');
      if (!nextPassword) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['new_password'], message: 'Nova senha é obrigatória' });
      }
    })
};

const changePasswordSchema = {
  body: z.object({
    senhaAtual: z.string().min(1, 'Senha atual é obrigatória'),
    novaSenha: z.string().min(1, 'Nova senha é obrigatória')
  })
};

module.exports = {
  loginSchema,
  refreshSchema,
  registerSchema,
  activateSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema
};
