const {
  listEmpenhosSchema,
  idEmpenhoSchema,
  slugEmpenhoSchema,
  createEmpenhoSchema,
  updateEmpenhoSchema
} = require('../../src/validators/empenhos.validators');
const { z } = require('../../src/validators/common');

const syncEmpenhosSchema = {
  body: z.object({
    operacoes: z.array(
      z.object({
        tipo: z.string(),
        id: z.union([z.string(), z.number()]).optional(),
        dados: z.record(z.any()).optional()
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
