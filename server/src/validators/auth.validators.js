const { z } = require('./common');

const loginSenhaSchema = z.object({
  login: z.string().trim().min(1, 'Login é obrigatório'),
  senha: z.string().min(1, 'Senha é obrigatória')
});

const emailPasswordSchema = z.object({
  email: z.string().trim().email('E-mail inválido'),
  password: z.string().min(1, 'Password é obrigatório')
});

const loginSchema = {
  body: z.union([loginSenhaSchema, emailPasswordSchema]).transform((data) => {
    if ('login' in data && 'senha' in data) {
      return {
        login: data.login,
        senha: data.senha,
        email: data.login,
        password: data.senha
      };
    }

    return {
      login: data.email,
      senha: data.password,
      email: data.email,
      password: data.password
    };
  })
};

module.exports = {
  loginSchema
};
