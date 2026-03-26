const { z } = require('./common');

const loginBodySchema = z
  .object({
    login: z.string().trim().optional(),
    username: z.string().trim().optional(),
    senha: z.string().optional(),
    email: z.string().trim().optional(),
    password: z.string().optional()
  })
  .superRefine((data, ctx) => {
    const hasLegacy = Boolean(data.login || data.username || data.senha);
    const hasModern = Boolean(data.email || data.password);

    if (!hasLegacy && !hasModern) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['login'],
        message: 'Login é obrigatório'
      });
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['senha'],
        message: 'Senha é obrigatória'
      });
      return;
    }

    if (hasLegacy) {
      if (!String(data.login || data.username || '').trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['login'],
          message: 'Login é obrigatório'
        });
      }

      if (!String(data.senha || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['senha'],
          message: 'Senha é obrigatória'
        });
      }
    }

    if (hasModern) {
      const email = String(data.email || '').trim();
      if (!email) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['email'],
          message: 'E-mail é obrigatório'
        });
      } else {
        const parsed = z.string().email('E-mail inválido').safeParse(email);
        if (!parsed.success) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['email'],
            message: 'E-mail inválido'
          });
        }
      }

      if (!String(data.password || '')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Password é obrigatório'
        });
      }
    }
  });

const loginSchema = {
  body: loginBodySchema.transform((data) => {
    if (data.login || data.username || data.senha) {
      const normalizedLogin = String(data.login || data.username || '').trim();
      const normalizedSenha = String(data.senha || data.password || '');

      return {
        login: normalizedLogin,
        senha: normalizedSenha,
        email: normalizedLogin,
        password: normalizedSenha
      };
    }

    return {
      login: String(data.email || '').trim(),
      senha: String(data.password || ''),
      email: String(data.email || '').trim(),
      password: String(data.password || '')
    };
  })
};

module.exports = {
  loginSchema
};
