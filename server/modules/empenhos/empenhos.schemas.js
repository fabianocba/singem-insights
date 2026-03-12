const {
  idEmpenhoSchema,
  slugEmpenhoSchema,
  createEmpenhoSchema,
  updateEmpenhoSchema
} = require('../../src/validators/empenhos.validators');
const { z } = require('../../src/validators/common');

const listEmpenhosSchema = {
  query: z.object({
    page: z.coerce.number().int().min(1).optional().default(1),
    limit: z.coerce.number().int().min(1).max(100).optional().default(20),
    limite: z.coerce.number().int().min(1).max(100).optional(),
    offset: z.coerce.number().int().min(0).optional(),
    sort: z.string().trim().optional(),
    q: z.string().trim().optional(),
    status: z.string().trim().optional(),
    unidadeId: z.coerce.number().int().positive().optional(),
    dataInicio: z.string().trim().optional(),
    dataFim: z.string().trim().optional(),
    ano: z.coerce.number().int().optional(),
    cnpj: z.string().trim().optional(),
    busca: z.string().trim().optional()
  })
};

const syncEmpenhosSchema = {
  body: z.object({
    operacoes: z.array(
      z.object({
        tipo: z.string(),
        id: z.union([z.string(), z.number()]).optional(),
        dados: z.record(z.string(), z.any()).optional()
      })
    )
  })
};

module.exports = {
  listEmpenhosSchema,
  idEmpenhoSchema,
  slugEmpenhoSchema,
  createEmpenhoSchema,
  updateEmpenhoSchema,
  syncEmpenhosSchema
};
