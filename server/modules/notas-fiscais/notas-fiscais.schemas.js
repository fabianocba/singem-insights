const {
  listNotasSchema,
  idNotaSchema,
  chaveNotaSchema,
  createNotaSchema
} = require('../../src/validators/notasFiscais.validators');
const { z } = require('../../src/validators/common');

const updateNotaSchema = {
  params: idNotaSchema.params,
  body: z
    .object({
      empenho_id: z.union([z.number().int(), z.null()]).optional(),
      numero: z.union([z.string(), z.number()]).optional(),
      serie: z.string().optional(),
      data_emissao: z.string().optional(),
      data_entrada: z.string().optional(),
      fornecedor: z.string().optional(),
      cnpj_fornecedor: z.string().optional(),
      valor_total: z.union([z.string(), z.number()]).optional(),
      valor_icms: z.union([z.string(), z.number()]).optional(),
      valor_ipi: z.union([z.string(), z.number()]).optional(),
      valor_frete: z.union([z.string(), z.number()]).optional(),
      valor_desconto: z.union([z.string(), z.number()]).optional(),
      status: z.string().optional(),
      observacoes: z.string().optional()
    })
    .passthrough()
};

module.exports = {
  listNotasSchema,
  idNotaSchema,
  chaveNotaSchema,
  createNotaSchema,
  updateNotaSchema
};
