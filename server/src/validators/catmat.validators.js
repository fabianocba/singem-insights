const { z, toInt } = require('./common');

const catmatSearchSchema = {
  query: z.object({
    q: z.string().min(3),
    limite: toInt(20),
    offset: toInt(0),
    ativos: z.enum(['true', 'false']).optional().default('true')
  })
};

const catmatCodigoSchema = {
  params: z.object({
    codigo: z.string().min(1)
  })
};

module.exports = {
  catmatSearchSchema,
  catmatCodigoSchema
};
